/**
 * Checkout Stripe — SERVIDOR APENAS.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { PLANS, COMMISSION_RATE, type PaidPlanId } from "./plans";
import { createCheckoutSession } from "./stripe.server";
import { activatePlan } from "./payments.server";
import { generateReference } from "./mpesa.server";

export async function createStripeCheckoutForUser(
  userId: string,
  input: { plan: PaidPlanId; origin: string; email?: string }
): Promise<{ ok: boolean; message: string; url: string | null }> {
  const plan = PLANS[input.plan];

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id, email, suspended")
    .eq("id", userId)
    .maybeSingle();

  if (!profile) return { ok: false, message: "Perfil não encontrado. Volte a iniciar sessão.", url: null };
  if (profile.suspended) return { ok: false, message: "A sua conta está suspensa.", url: null };

  const reference = generateReference();

  const { data: payment, error } = await supabaseAdmin
    .from("payments")
    .insert({
      user_id: userId,
      plan: input.plan,
      amount: plan.price,
      phone_number: "",
      payment_reference: reference,
      provider: "stripe",
      status: "a_processar",
    })
    .select("id")
    .single();

  if (error || !payment) {
    return { ok: false, message: "Não foi possível registar o pagamento.", url: null };
  }

  try {
    const session = await createCheckoutSession({
      amount: plan.price,
      currency: "mzn",
      productName: `Way Estudantes AI — Plano ${plan.name}`,
      description: `${plan.credits} créditos · válido ${plan.days} dias`,
      successUrl: `${input.origin}/pagamentos?stripe=sucesso&ref=${reference}`,
      cancelUrl: `${input.origin}/pagamentos?stripe=cancelado`,
      clientReferenceId: payment.id,
      customerEmail: input.email ?? profile.email ?? undefined,
      metadata: { payment_id: payment.id, user_id: userId, plan: input.plan, reference },
    });

    await supabaseAdmin
      .from("payments")
      .update({ transaction_id: session.id, updated_at: new Date().toISOString() })
      .eq("id", payment.id);

    return { ok: true, message: "A abrir o checkout seguro do Stripe...", url: session.url };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao criar o checkout.";
    await supabaseAdmin
      .from("payments")
      .update({ status: "falhado", error_message: message, updated_at: new Date().toISOString() })
      .eq("id", payment.id);
    return { ok: false, message: `Stripe: ${message}`, url: null };
  }
}

/** Confirma um pagamento Stripe (chamado pelo webhook) e activa o plano. */
export async function completeStripePayment(paymentId: string, transactionId: string) {
  const { data: payment } = await supabaseAdmin
    .from("payments")
    .select("id, user_id, plan, amount, status, payment_reference")
    .eq("id", paymentId)
    .maybeSingle();

  if (!payment) return { ok: false, message: "Pagamento não encontrado." };
  if (payment.status === "concluido") return { ok: true, message: "Já processado." };

  await supabaseAdmin
    .from("payments")
    .update({ status: "concluido", transaction_id: transactionId, updated_at: new Date().toISOString() })
    .eq("id", payment.id);

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("credits, referred_by")
    .eq("id", payment.user_id)
    .maybeSingle();

  await activatePlan(
    payment.user_id,
    payment.id,
    payment.payment_reference,
    payment.plan as PaidPlanId,
    profile?.credits ?? 0
  );

  if (profile?.referred_by) {
    try {
      await supabaseAdmin.from("affiliate_commissions").insert({
        affiliate_id: profile.referred_by,
        referred_user_id: payment.user_id,
        payment_id: payment.id,
        amount_mt: Number((payment.amount * COMMISSION_RATE).toFixed(2)),
      });
    } catch (e) {
      console.warn("commission insert failed", e);
    }
  }

  return { ok: true, message: "Plano activado." };
}

/** Marca um pagamento Stripe como falhado. */
export async function failStripePayment(paymentId: string, reason: string) {
  await supabaseAdmin
    .from("payments")
    .update({ status: "falhado", error_message: reason, updated_at: new Date().toISOString() })
    .eq("id", paymentId);
}
