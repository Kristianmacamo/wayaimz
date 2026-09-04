/**
 * Cliente da API oficial do M-Pesa (Vodacom Moçambique — OpenAPI).
 *
 * SERVIDOR APENAS. O sufixo .server.ts impede que este ficheiro entre no
 * bundle do browser. As credenciais são lidas de Secrets em tempo de pedido.
 */
import { publicEncrypt, constants, randomUUID } from "node:crypto";
import process from "node:process";

const LIVE_HOST = "api.vm.co.mz:18352";
const SANDBOX_HOST = "api.sandbox.vm.co.mz:18352";

export type MpesaConfig = {
  apiKey: string;
  publicKey: string;
  serviceProviderCode: string;
  host: string;
};

export function getMpesaConfig(): MpesaConfig {
  const apiKey = process.env["MPESA_API_KEY"];
  const publicKey = process.env["MPESA_PUBLIC_KEY"];
  const serviceProviderCode = process.env["MPESA_SERVICE_PROVIDER_CODE"];
  const env = (process.env["MPESA_ENV"] ?? "live").toLowerCase();

  if (!apiKey || !publicKey || !serviceProviderCode) {
    throw new Error(
      "Credenciais M-Pesa em falta. Configure MPESA_API_KEY, MPESA_PUBLIC_KEY e MPESA_SERVICE_PROVIDER_CODE."
    );
  }

  return {
    apiKey,
    publicKey,
    serviceProviderCode,
    host: process.env["MPESA_API_HOST"] ?? (env === "sandbox" ? SANDBOX_HOST : LIVE_HOST),
  };
}

/** Converte a chave pública crua (base64) para o formato PEM. */
function toPem(publicKey: string) {
  const clean = publicKey
    .replace(/-----BEGIN PUBLIC KEY-----/g, "")
    .replace(/-----END PUBLIC KEY-----/g, "")
    .replace(/\s+/g, "");
  const lines = clean.match(/.{1,64}/g) ?? [];
  return `-----BEGIN PUBLIC KEY-----\n${lines.join("\n")}\n-----END PUBLIC KEY-----\n`;
}

/** Bearer token = API Key encriptada com RSA (PKCS1) usando a Public Key. */
export function generateBearerToken(cfg: MpesaConfig) {
  const encrypted = publicEncrypt(
    { key: toPem(cfg.publicKey), padding: constants.RSA_PKCS1_PADDING },
    Buffer.from(cfg.apiKey, "utf8")
  );
  return encrypted.toString("base64");
}

/** Normaliza um número moçambicano para o formato 258XXXXXXXXX. */
export function normalizeMsisdn(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  const local = digits.startsWith("258") ? digits.slice(3) : digits.replace(/^0+/, "");
  if (!/^8[2-7]\d{7}$/.test(local)) return null;
  return `258${local}`;
}

/** Apenas os prefixos M-Pesa (Vodacom): 84 e 85. */
export function isMpesaMsisdn(msisdn: string) {
  return /^258(84|85)\d{7}$/.test(msisdn);
}

/** true apenas quando estamos ligados ao M-Pesa real (dinheiro verdadeiro). */
export function isMpesaLive() {
  return (process.env["MPESA_ENV"] ?? "live").toLowerCase() !== "sandbox";
}


export function generateReference() {
  return `WAY${randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`;
}

export type MpesaResult = {
  ok: boolean;
  code: string;
  message: string;
  transactionId: string | null;
  conversationId: string | null;
  raw: unknown;
};

const ERROR_MESSAGES: Record<string, string> = {
  "INS-1": "Erro interno do M-Pesa. Tente novamente dentro de instantes.",
  "INS-2": "Chave da API inválida. Contacte o suporte.",
  "INS-4": "Utilizador M-Pesa não existe.",
  "INS-5": "Transação cancelada pelo cliente no telemóvel.",
  "INS-6": "Transação falhou. Tente novamente.",
  "INS-9": "Tempo de resposta esgotado. Confirme o pagamento no telemóvel e tente de novo.",
  "INS-10": "Transação duplicada. Aguarde antes de repetir.",
  "INS-13": "Código do comerciante inválido. Contacte o suporte.",
  "INS-14": "Referência de transação inválida.",
  "INS-15": "Valor inválido.",
  "INS-16": "Serviço M-Pesa temporariamente indisponível. Tente novamente.",
  "INS-17": "Referência de transação inválida.",
  "INS-18": "Data da transação inválida.",
  "INS-19": "Referência de terceiros inválida.",
  "INS-20": "Faltam parâmetros obrigatórios no pedido.",
  "INS-21": "Erro de validação dos parâmetros.",
  "INS-22": "Tipo de operação inválido.",
  "INS-23": "Estado da transação desconhecido.",
  "INS-24": "Falta o identificador da transação.",
  "INS-25": "Falta a segurança do pedido.",
  "INS-26": "Autorização negada pelo M-Pesa.",
  "INS-993": "Sistema M-Pesa em manutenção. Tente mais tarde.",
  "INS-994": "Transação duplicada.",
  "INS-995": "Perfil do cliente com problemas. Contacte a Vodacom.",
  "INS-996": "Conta M-Pesa do cliente não está activa.",
  "INS-997": "Problema com o perfil de ligação. Contacte o suporte.",
  "INS-998": "Cliente sem conta M-Pesa activa.",
  "INS-2001": "Autenticação inicial falhou.",
  "INS-2002": "PIN incorrecto.",
  "INS-2006": "Saldo insuficiente na conta M-Pesa.",
  "INS-2051": "Número de telemóvel inválido.",
  "INS-2057": "Cliente não registado no M-Pesa.",
};

export function describeMpesaCode(code: string, fallback?: string) {
  return ERROR_MESSAGES[code] ?? fallback ?? "Não foi possível concluir o pagamento. Tente novamente.";
}

/**
 * Pedido de pagamento C2B (single stage). O cliente confirma no telemóvel
 * e a API devolve o resultado de forma síncrona.
 */
export async function c2bPayment(params: {
  amount: number;
  msisdn: string;
  reference: string;
  thirdPartyReference: string;
}): Promise<MpesaResult> {
  // Todo o contacto com o M-Pesa (encriptação RSA da API Key + pedido na porta
  // 18352) acontece na função de backend `mpesa-proxy`. Nunca no browser.
  const proxyUrl = `${process.env["SUPABASE_URL"]}/functions/v1/mpesa-proxy`;
  const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? "";
  const proxySecret = process.env["MPESA_PROXY_SECRET"] ?? "";

  let httpStatus = 0;
  let text = "";
  try {
    const proxyRes = await fetch(proxyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
        "x-mpesa-proxy-secret": proxySecret,
      },
      body: JSON.stringify({
        action: "c2b",
        amount: params.amount,
        msisdn: params.msisdn,
        reference: params.reference,
        thirdPartyReference: params.thirdPartyReference,
      }),
    });
    const payload = (await proxyRes.json()) as { status?: number; body?: string; error?: string };
    if (!proxyRes.ok || payload.error) {
      throw new Error(payload.error ?? `backend HTTP ${proxyRes.status}`);
    }
    httpStatus = payload.status ?? 0;
    text = payload.body ?? "";
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    console.error("[mpesa] c2b falhou:", detail);
    return {
      ok: false,
      code: "NETWORK",
      message: `Não foi possível contactar o M-Pesa. ${detail}`,
      transactionId: null,
      conversationId: null,
      raw: { error: detail },
    };
  }

  let body: Record<string, unknown> = {};
  try {
    body = JSON.parse(text) as Record<string, unknown>;
  } catch {
    body = { raw: text.slice(0, 2000) };
  }

  const code = String(body["output_ResponseCode"] ?? `HTTP-${httpStatus}`);
  const desc = typeof body["output_ResponseDesc"] === "string" ? (body["output_ResponseDesc"] as string) : undefined;

  return {
    ok: code === "INS-0",
    code,
    message: code === "INS-0" ? "Pagamento confirmado com sucesso." : describeMpesaCode(code, desc),
    transactionId: (body["output_TransactionID"] as string) ?? null,
    conversationId: (body["output_ConversationID"] as string) ?? null,
    raw: body,
  };
}
