/**
 * Lógica de pagamentos M-Pesa — SERVIDOR APENAS.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { PLANS, COMMISSION_RATE, type PaidPlanId } from "./plans";
import { c2bPayment, generateReference, isMpesaMsisdn, normalizeMsisdn } from "./mpesa.server";

export type StartPaymentResult = {
  ok: boolean;
  message: string;
  paymentId: string | null;
  reference: string | null;
  plan: PaidPlanId;
  expiresAt: string | null;
  credits: number | null;
};

export async function startMpesaPaymentForUser(
  userId: string,
  input: { plan: PaidPlanId; phone: string }
): Promise<StartPaymentResult> {
  const plan = PLANS[input.plan];
  const msisdn = normalizeMsisdn(input.phone);

  if (!msisdn) {
    return { ok: false, message: "Número inválido. Use um número moçambicano, ex.: 84 123 4567.", paymentId: null, reference: null, plan: input.plan, expiresAt: null, credits: null };
  }
  if (!isMpesaMsisdn(msisdn)) {
    return { ok: false, message: "O M-Pesa só aceita números Vodacom (84 ou 85).", paymentId: null, reference: null, plan: input.plan, expiresAt: null, credits: null };
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("id, credits, suspended, referred_by")
    .eq("id", userId)
    .maybeSingle();

  if (profileError || !profile) {
    return { ok: false, message: "Perfil não encontrado. Volte a iniciar sessão.", paymentId: null, reference: null, plan: input.plan, expiresAt: null, credits: null };
  }
  if (profile.suspended) {
    return { ok: false, message: "A sua conta está suspensa. Contacte o suporte.", paymentId: null, reference: null, plan: input.plan, expiresAt: null, credits: null };
  }

  // Evitar pedidos duplicados em curso (menos de 2 minutos).
  const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
  const { data: pending } = await supabaseAdmin
    .from("payments")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "a_processar")
    .gte("created_at", twoMinAgo)
    .limit(1);
  if (pending && pending.length > 0) {
    return { ok: false, message: "Já existe um pagamento em curso. Confirme no telemóvel e aguarde.", paymentId: null, reference: null, plan: input.plan, expiresAt: null, credits: null };
  }

  const reference = generateReference();

  const { data: payment, error: insertError } = await supabaseAdmin
    .from("payments")
    .insert({
      user_id: userId,
      plan: input.plan,
      amount: plan.price,
      phone_number: msisdn,
      payment_reference: reference,
      provider: "mpesa",
      status: "a_processar",
    })
    .select("id")
    .single();

  if (insertError || !payment) {
    return { ok: false, message: "Não foi possível registar o pagamento. Tente novamente.", paymentId: null, reference: null, plan: input.plan, expiresAt: null, credits: null };
  }

  const result = await c2bPayment({
    amount: plan.price,
    msisdn,
    reference,
    thirdPartyReference: reference,
  });

  if (!result.ok) {
    // INS-9 = a Vodacom esgotou o tempo de espera, mas o pedido pode ainda
    // estar no telemóvel do cliente. Mantemos como "a_processar".
    const pending = result.code === "INS-9";
    await supabaseAdmin
      .from("payments")
      .update({
        status: pending ? "a_processar" : "falhado",
        error_message: `${result.code}: ${result.message}`,
        transaction_id: result.transactionId,
        conversation_id: result.conversationId,
        api_response: result.raw as never,
        updated_at: new Date().toISOString(),
      })
      .eq("id", payment.id);

    return {
      ok: false,
      message: pending
        ? "Enviámos o pedido para o seu telemóvel. Confirme com o seu PIN M-Pesa; o plano é activado assim que a Vodacom confirmar."
        : result.message,
      paymentId: payment.id,
      reference,
      plan: input.plan,
      expiresAt: null,
      credits: null,
    };
  }


  await supabaseAdmin
    .from("payments")
    .update({
      status: "concluido",
      transaction_id: result.transactionId,
      conversation_id: result.conversationId,
      api_response: result.raw as never,
      updated_at: new Date().toISOString(),
    })
    .eq("id", payment.id);

  const activation = await activatePlan(userId, payment.id, reference, input.plan, profile.credits ?? 0);

  // Notificar o administrador — não bloqueia a activação.
  try {
    const { data: userProfile } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .eq("id", userId)
      .maybeSingle();
    const { sendAdminPaymentEmail } = await import("./notify.server");
    await sendAdminPaymentEmail({
      paymentId: payment.id,
      plan: input.plan,
      amount: plan.price,
      userEmail: userProfile?.email ?? "",
      phone: msisdn,
      transactionId: result.transactionId,
      reference,
      status: "concluido",
    });
  } catch (e) {
    console.warn("admin notify failed", e);
  }

  // Comissão de afiliado (10%) — não bloqueia a activação.
  if (profile.referred_by) {
    try {
      await supabaseAdmin.from("affiliate_commissions").insert({
        affiliate_id: profile.referred_by,
        referred_user_id: userId,
        payment_id: payment.id,
        amount_mt: Number((plan.price * COMMISSION_RATE).toFixed(2)),
      });
    } catch (e) {
      console.warn("commission insert failed", e);
    }
  }


  return {
    ok: true,
    message: `Pagamento confirmado! Plano ${plan.name} activado com ${plan.credits} créditos.`,
    paymentId: payment.id,
    reference,
    plan: input.plan,
    expiresAt: activation.expiresAt,
    credits: activation.credits,
  };
}

export async function activatePlan(
  userId: string,
  paymentId: string,
  reference: string,
  planId: PaidPlanId,
  currentCredits: number
) {
  const plan = PLANS[planId];
  const start = new Date();
  const end = new Date(start.getTime() + plan.days * 24 * 60 * 60 * 1000);
  const credits = currentCredits + plan.credits;

  await supabaseAdmin
    .from("subscriptions")
    .update({ status: "cancelada", updated_at: start.toISOString() })
    .eq("user_id", userId)
    .eq("status", "activa");

  await supabaseAdmin.from("subscriptions").insert({
    user_id: userId,
    plan: planId,
    amount: plan.price,
    payment_id: paymentId,
    payment_reference: reference,
    start_date: start.toISOString(),
    end_date: end.toISOString(),
    status: "activa",
  });

  await supabaseAdmin
    .from("profiles")
    .update({
      current_plan: planId,
      plan_expires_at: end.toISOString(),
      credits,
      updated_at: start.toISOString(),
    })
    .eq("id", userId);

  return { expiresAt: end.toISOString(), credits };
}

/** Actualiza créditos de um utilizador (uso administrativo). */
export async function adminUpdateCredits(userId: string, credits: number) {
  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ credits, updated_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) throw new Error(error.message);
  return { ok: true, credits };
}
