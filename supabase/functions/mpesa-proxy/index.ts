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
  const isService = auth === `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`;

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
    try {
      const r = await fetch(`https://${cfg.host}/ipg/v1x/c2bPayment/singleStage/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: "developer.mpesa.vm.co.mz" },
        body: "{}",
      });
      reachable = true;
      console.log("[mpesa] reachability status", r.status);
    } catch (e) {
      reachError = e instanceof Error ? e.message : String(e);
    }
    return json({
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
  const body = {
    input_TransactionReference: reference,
    input_CustomerMSISDN: msisdn,
    input_Amount: String(amount),
    input_ThirdPartyReference: thirdPartyReference,
    input_ServiceProviderCode: cfg.serviceProviderCode,
  };

  try {
    const upstream = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "developer.mpesa.vm.co.mz",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    const text = await upstream.text();
    console.log("[mpesa] c2b", reference, "status", upstream.status, "body", text.slice(0, 800));
    return json({ status: upstream.status, body: text });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[mpesa] falha de rede para", url, msg);
    return json({ error: `Rede: ${msg}` }, 502);
  }
});
