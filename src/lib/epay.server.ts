/** ePay (M-Pesa / e-Mola / IZI) — SERVIDOR APENAS. */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { PLANS, type PaidPlanId } from "./plans";
import { activatePlan } from "./payments.server";

const BASE = process.env["EPAY_API_BASE_URL"] ?? "https://checkout.epay.co.mz/api/v1";

function token() {
  const t = process.env["EPAY_SECRET_KEY"];
  if (!t) throw new Error("ePay não configurada.");
  return t;
}

async function ps(path: string, init?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token()}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, any>;
  return { ok: res.ok, status: res.status, body };
}

export async function createPaysuiteCheckout(
  userId: string,
  input: { plan: PaidPlanId; origin: string }
) {
  const plan = PLANS[input.plan];
  const { data: who } = await supabaseAdmin.from("profiles").select("email, nome").eq("id", userId).maybeSingle();
  const reference = `WAY${crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`;

  const { data: payment, error } = await supabaseAdmin
    .from("payments")
    .insert({
      user_id: userId,
      plan: input.plan,
      amount: plan.price,
      payment_reference: reference,
      phone_number: "ePay",
      provider: "epay",
      status: "a_processar",
    })
    .select("id")
    .single();
  if (error || !payment) return { ok: false as const, message: "Não foi possível registar o pagamento.", url: null };

  const r = await ps("/payments", {
    method: "POST",
    body: JSON.stringify({
      amount: plan.price,
      currency: "MZN",
      external_reference: reference,
      ...(who?.email ? { customer_email: who.email } : {}),
      ...(who?.nome ? { customer_name: who.nome } : {}),
      description: `Plano ${plan.name} - Way Estudantes AI`,
      return_url: `${input.origin}/pagamentos?plan=${input.plan}&ps=${payment.id}`,
      cancel_url: `${input.origin}/pagamentos?plan=${input.plan}`,
      callback_url: `${input.origin}/api/public/epay-webhook`,
    }),
  });

  const d = (r.body?.data ?? r.body) as Record<string, any>;
  if (!r.ok || !d?.payment_url) {
    console.error("[epay] create failed", r.status, r.body);
    await supabaseAdmin
      .from("payments")
      .update({ status: "falhado", error_message: String(r.body?.message ?? `HTTP ${r.status}`), api_response: r.body as never })
      .eq("id", payment.id);
    return { ok: false as const, message: r.body?.message ?? "A ePay recusou o pedido. Tente novamente.", url: null };
  }

  await supabaseAdmin
    .from("payments")
    .update({ conversation_id: d.id, api_response: r.body as never })
    .eq("id", payment.id);

  return { ok: true as const, message: "A abrir pagamento...", url: d.payment_url as string };
}

/** Confirma o estado directamente na ePay (nunca confia no browser). */
export async function syncPaysuitePayment(paymentId: string, userId?: string) {
  let q = supabaseAdmin.from("payments").select("*").eq("id", paymentId);
  if (userId) q = q.eq("user_id", userId);
  const { data: p } = await q.maybeSingle();
  if (!p || !p.conversation_id) return { status: "desconhecido", message: "Pagamento não encontrado." };
  if (p.status === "concluido") return { status: "concluido", message: "Plano já activado." };

  const r = await ps(`/payments/${p.conversation_id}`);
  const d = (r.body?.data ?? r.body) as Record<string, any>;
  const paid = d?.status === "paid";
  const failed = ["failed", "cancelled"].includes(d?.status);

  if (paid) {
    // Marcar concluído de forma atómica para evitar activação dupla.
    const { data: upd } = await supabaseAdmin
      .from("payments")
      .update({ status: "concluido", transaction_id: (d?.id ?? null), api_response: r.body as never, updated_at: new Date().toISOString() })
      .eq("id", p.id)
      .neq("status", "concluido")
      .select("id");
    if (upd && upd.length) {
      const { data: prof } = await supabaseAdmin.from("profiles").select("credits, email").eq("id", p.user_id).maybeSingle();
      await activatePlan(p.user_id, p.id, p.payment_reference, p.plan as PaidPlanId, prof?.credits ?? 0);
      try {
        const { sendPaymentConfirmationEmails } = await import("./notify.server");
        await sendPaymentConfirmationEmails({
          paymentId: p.id, plan: p.plan as PaidPlanId, amount: Number(p.amount), userEmail: prof?.email ?? "",
          phone: p.phone_number ?? "", transactionId: (d?.id ?? null), reference: p.payment_reference, status: "concluido",
        });
      } catch (e) { console.warn("notify failed", e); }
    }
    return { status: "concluido", message: `Pagamento confirmado! Plano ${PLANS[p.plan as PaidPlanId].name} activado.` };
  }
  if (failed) {
    await supabaseAdmin.from("payments").update({ status: "falhado", api_response: r.body as never }).eq("id", p.id);
    return { status: "falhado", message: "O pagamento não foi concluído." };
  }
  return { status: "a_processar", message: "Ainda à espera da confirmação do pagamento." };
}

export async function syncByPaysuiteId(paysuiteId: string) {
  const { data } = await supabaseAdmin.from("payments").select("id").eq("conversation_id", paysuiteId).maybeSingle();
  if (data) await syncPaysuitePayment(data.id);
}
