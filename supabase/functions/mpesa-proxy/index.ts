// Backend do M-Pesa (Vodacom OpenAPI).
// Toda a comunicação com api.vm.co.mz:18352 acontece aqui: o runtime da app
// só permite portas 80/443 e o browser bloquearia por CORS.
// A API Key é encriptada com RSA (PKCS#1 v1.5) usando a Public Key para gerar
// o Bearer token exigido pela Vodacom.

import { constants, publicEncrypt } from "node:crypto";
import { Buffer } from "node:buffer";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const LIVE_HOST = "api.vm.co.mz:18352";
const SANDBOX_HOST = "api.sandbox.vm.co.mz:18352";

function toPem(publicKey: string) {
  const clean = publicKey
    .replace(/-----BEGIN PUBLIC KEY-----/g, "")
    .replace(/-----END PUBLIC KEY-----/g, "")
    .replace(/\\n/g, "")
    .replace(/\s+/g, "");
  const lines = clean.match(/.{1,64}/g) ?? [];
  return `-----BEGIN PUBLIC KEY-----\n${lines.join("\n")}\n-----END PUBLIC KEY-----\n`;
}

function config() {
  const apiKey = Deno.env.get("MPESA_API_KEY") ?? "";
  const publicKey = Deno.env.get("MPESA_PUBLIC_KEY") ?? "";
  const serviceProviderCode = Deno.env.get("MPESA_SERVICE_PROVIDER_CODE") ?? "";
  const env = (Deno.env.get("MPESA_ENV") ?? "live").toLowerCase();
  const host = Deno.env.get("MPESA_API_HOST") ??
    (env === "sandbox" || env === "test" ? SANDBOX_HOST : LIVE_HOST);
  return { apiKey, publicKey, serviceProviderCode, env, host };
}

function bearerToken(apiKey: string, publicKey: string) {
  const encrypted = publicEncrypt(
    { key: toPem(publicKey), padding: constants.RSA_PKCS1_PADDING },
    Buffer.from(apiKey, "utf8"),
  );
  return encrypted.toString("base64");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let payload: Record<string, unknown> = {};
  try {
    payload = await req.json();
  } catch {
    return json({ error: "JSON inválido" }, 400);
  }

  const cfg = config();
  const auth = req.headers.get("Authorization") ?? "";
  const proxySecret = Deno.env.get("MPESA_PROXY_SECRET") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const internalHeader = req.headers.get("x-mpesa-proxy-secret") ?? "";
  const isService =
    (proxySecret.length > 0 && internalHeader === proxySecret) ||
    (serviceKey.length > 0 && auth === `Bearer ${serviceKey}`);

  // --- Diagnóstico (não devolve segredos, apenas metadados) ---
  if (payload["action"] === "diagnose") {
    let pemOk = false;
    let tokenLength = 0;
    let cryptoError: string | null = null;
    try {
      tokenLength = bearerToken(cfg.apiKey || "x", cfg.publicKey).length;
      pemOk = tokenLength > 0;
    } catch (e) {
      cryptoError = e instanceof Error ? e.message : String(e);
    }
    let reachable = false;
    let reachError: string | null = null;
    let probeStatus: number | null = null;
    let probeBody: string | null = null;
    const probeHost = typeof payload["host"] === "string" ? (payload["host"] as string) : cfg.host;
    try {
      const ref = `DIAG${Date.now().toString().slice(-9)}`;
      const r = await fetch(`https://${probeHost}/ipg/v1x/c2bPayment/singleStage/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "developer.mpesa.vm.co.mz",
          Authorization: `Bearer ${bearerToken(cfg.apiKey, cfg.publicKey)}`,
        },
        body: JSON.stringify({
          input_TransactionReference: ref,
          input_CustomerMSISDN: "258840000000",
          input_Amount: "1",
          input_ThirdPartyReference: ref,
          input_ServiceProviderCode: cfg.serviceProviderCode,
        }),
      });
      reachable = true;
      probeStatus = r.status;
      probeBody = (await r.text()).slice(0, 500);
      console.log("[mpesa] probe", probeStatus, probeBody);
    } catch (e) {
      reachError = e instanceof Error ? e.message : String(e);
    }
    return json({
      probeStatus,
      probeBody,
      probeHost,
      env: cfg.env,
      host: cfg.host,
      apiKeyLength: cfg.apiKey.length,
      publicKeyLength: cfg.publicKey.length,
      serviceProviderCodeSet: cfg.serviceProviderCode.length > 0,
      pemOk,
      tokenLength,
      cryptoError,
      reachable,
      reachError,
    });
  }

  // --- Pagamento C2B (apenas servidor) ---
  if (!isService) return json({ error: "Unauthorized" }, 401);

  const amount = payload["amount"];
  const msisdn = String(payload["msisdn"] ?? "");
  const reference = String(payload["reference"] ?? "");
  const thirdPartyReference = String(payload["thirdPartyReference"] ?? reference);

  if (!cfg.apiKey || !cfg.publicKey || !cfg.serviceProviderCode) {
    console.error("[mpesa] secrets em falta", {
      apiKey: !!cfg.apiKey,
      publicKey: !!cfg.publicKey,
      spc: !!cfg.serviceProviderCode,
    });
    return json({ error: "Credenciais M-Pesa em falta (MPESA_API_KEY / MPESA_PUBLIC_KEY / MPESA_SERVICE_PROVIDER_CODE)." }, 500);
  }
  if (!/^258(84|85)\d{7}$/.test(msisdn) || !reference) {
    return json({ error: "Parâmetros inválidos" }, 400);
  }

  let token: string;
  try {
    token = bearerToken(cfg.apiKey, cfg.publicKey);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[mpesa] falha ao encriptar API key (verifique MPESA_PUBLIC_KEY):", msg);
    return json({ error: `Chave pública M-Pesa inválida: ${msg}` }, 500);
  }

  const url = `https://${cfg.host}/ipg/v1x/c2bPayment/singleStage/`;

  let lastStatus = 0;
  let lastText = "";
  let lastNetErr = "";
  for (let attempt = 1; attempt <= 3; attempt++) {
    // Referência nova por tentativa -> evita INS-10 (Duplicate Transaction).
    const attemptRef = attempt === 1 ? reference : `${reference}${attempt}`.slice(-20);
    const body = {
      input_TransactionReference: attemptRef,
      input_CustomerMSISDN: msisdn,
      input_Amount: String(amount),
      input_ThirdPartyReference: attempt === 1 ? thirdPartyReference : attemptRef,
      input_ServiceProviderCode: cfg.serviceProviderCode,
    };
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 100_000);
      const upstream = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "developer.mpesa.vm.co.mz",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timer);
      const text = await upstream.text();
      lastStatus = upstream.status;
      lastText = text;
      console.log("[mpesa] c2b", attemptRef, "tentativa", attempt, "status", upstream.status, "body", text.slice(0, 800));

      let code = "";
      try {
        code = String((JSON.parse(text) as Record<string, unknown>)["output_ResponseCode"] ?? "");
      } catch { /* corpo não-JSON */ }

      // INS-10 (duplicada) -> repetir com referência nova.
      const retryable = (upstream.status >= 502 && upstream.status <= 504) || code === "INS-10";
      if (!retryable) return json({ status: upstream.status, body: text });
    } catch (e) {
      lastNetErr = e instanceof Error ? e.message : String(e);
      console.error("[mpesa] falha de rede para", url, "tentativa", attempt, lastNetErr);
    }
    if (attempt < 3) await new Promise((r) => setTimeout(r, attempt * 1500));
  }

  if (lastStatus) return json({ status: lastStatus, body: lastText });
  return json({ error: `Rede: ${lastNetErr}` }, 502);


});
