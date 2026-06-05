import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { PLANS, type PlanId } from "@/lib/plans";

const PAYPAL_BASE = "https://api-m.paypal.com"; // LIVE

async function getAccessToken() {
  const id = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_SECRET;
  if (!id || !secret) throw new Error("Missing PayPal credentials");
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error(`PayPal token error: ${await res.text()}`);
  return (await res.json()).access_token as string;
}

const PlanInput = z.object({ plan: z.enum(["basico", "premium", "completo"]) });

export const getPaypalClientId = createServerFn({ method: "GET" }).handler(async () => {
  return { clientId: process.env.PAYPAL_CLIENT_ID ?? "" };
});

export const createPaypalOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => PlanInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const planDef = PLANS[data.plan as PlanId];
    if (!planDef || planDef.priceUsd <= 0) throw new Error("Plano inválido");

    const { data: payment, error } = await supabase
      .from("payments")
      .insert({
        user_id: userId,
        plan: data.plan,
        amount_mt: planDef.price,
        method: "paypal",
        reference: "pending-paypal",
        status: "pendente",
      })
      .select("id")
      .single();
    if (error || !payment) throw new Error(error?.message ?? "Falha");

    const token = await getAccessToken();
    const res = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            reference_id: payment.id,
            description: `Way Estudantes — ${planDef.name}`,
            amount: { currency_code: "USD", value: planDef.priceUsd.toFixed(2) },
          },
        ],
      }),
    });
    if (!res.ok) throw new Error(`PayPal order error: ${await res.text()}`);
    const order = await res.json();
    await supabase.from("payments").update({ reference: order.id }).eq("id", payment.id);
    return { orderId: order.id as string, paymentId: payment.id as string };
  });

const CaptureInput = z.object({ orderId: z.string(), paymentId: z.string() });

export const capturePaypalOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => CaptureInput.parse(i))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const token = await getAccessToken();
    const res = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${data.orderId}/capture`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });
    if (!res.ok) throw new Error(`PayPal capture error: ${await res.text()}`);
    const cap = await res.json();
    if (cap.status !== "COMPLETED") throw new Error(`PayPal status: ${cap.status}`);

    // Activate plan using admin client (bypass RLS)
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: pay } = await supabaseAdmin.from("payments").select("*").eq("id", data.paymentId).maybeSingle();
    if (!pay || pay.user_id !== userId) throw new Error("Pagamento inválido");
    if (pay.status === "aprovado") return { ok: true };

    const durationDays = pay.plan === "completo" ? 30 : 7;
    await supabaseAdmin
      .from("payments")
      .update({ status: "aprovado", approved_at: new Date().toISOString() })
      .eq("id", pay.id);

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("plan_expires_at, referred_by")
      .eq("id", pay.user_id)
      .single();
    const base = profile?.plan_expires_at && new Date(profile.plan_expires_at) > new Date()
      ? new Date(profile.plan_expires_at)
      : new Date();
    const newExpiry = new Date(base.getTime() + durationDays * 86400000);
    await supabaseAdmin
      .from("profiles")
      .update({ current_plan: pay.plan, plan_expires_at: newExpiry.toISOString() })
      .eq("id", pay.user_id);

    if (profile?.referred_by) {
      await supabaseAdmin.from("affiliate_commissions").insert({
        affiliate_id: profile.referred_by,
        referred_user_id: pay.user_id,
        payment_id: pay.id,
        amount_mt: pay.amount_mt * 0.1,
      });
    }
    return { ok: true };
  });
