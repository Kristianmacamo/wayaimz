/**
 * Cliente mínimo da API Stripe via REST (compatível com Workers).
 * SERVIDOR APENAS.
 */
import process from "node:process";

const API = "https://api.stripe.com/v1";

function secretKey() {
  const key = process.env["STRIPE_TEST_API_KEY"] ?? process.env["STRIPE_SECRET_KEY"];
  if (!key) throw new Error("STRIPE_SECRET_KEY não está configurada.");
  return key;
}

/** Converte um objecto aninhado no formato form-encoded do Stripe. */
function toForm(obj: Record<string, unknown>, prefix = "", form = new URLSearchParams()) {
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (typeof v === "object" && !Array.isArray(v)) {
      toForm(v as Record<string, unknown>, key, form);
    } else if (Array.isArray(v)) {
      v.forEach((item, i) => {
        if (typeof item === "object") toForm(item as Record<string, unknown>, `${key}[${i}]`, form);
        else form.append(`${key}[${i}]`, String(item));
      });
    } else {
      form.append(key, String(v));
    }
  }
  return form;
}

async function stripeRequest<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: toForm(body).toString(),
  });
  const json = (await res.json()) as { error?: { message?: string } };
  if (!res.ok) throw new Error(json.error?.message ?? `Stripe HTTP ${res.status}`);
  return json as T;
}

export type CheckoutSession = { id: string; url: string };

export async function createCheckoutSession(params: {
  amount: number; // em MT (unidades)
  currency: string;
  productName: string;
  description: string;
  successUrl: string;
  cancelUrl: string;
  clientReferenceId: string;
  customerEmail?: string;
  metadata: Record<string, string>;
}): Promise<CheckoutSession> {
  return stripeRequest<CheckoutSession>("/checkout/sessions", {
    mode: "payment",
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    client_reference_id: params.clientReferenceId,
    customer_email: params.customerEmail,
    metadata: params.metadata,
    payment_intent_data: { metadata: params.metadata },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: params.currency,
          unit_amount: Math.round(params.amount * 100),
          product_data: { name: params.productName, description: params.description },
        },
      },
    ],
  });
}

/** Verifica a assinatura `Stripe-Signature` (HMAC SHA-256) do webhook. */
export async function verifyStripeSignature(payload: string, header: string | null, tolerance = 300) {
  const secret = process.env["STRIPE_WEBHOOK_SECRET"];
  if (!secret || !header) return false;

  const parts = Object.fromEntries(
    header.split(",").map((p) => {
      const [k, ...rest] = p.split("=");
      return [k?.trim() ?? "", rest.join("=")];
    })
  ) as Record<string, string>;

  const timestamp = parts["t"];
  const signature = parts["v1"];
  if (!timestamp || !signature) return false;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > tolerance) return false;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(`${timestamp}.${payload}`));
  const expected = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  return diff === 0;
}
