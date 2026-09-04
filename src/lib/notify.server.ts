/**
 * Notificações ao administrador — SERVIDOR APENAS.
 */
import process from "node:process";

const ADMIN_EMAIL = "cristianonumerique@gmail.com";

export type AdminPaymentNotice = {
  paymentId: string;
  plan: string;
  amount: number;
  userEmail: string;
  phone: string | null;
  transactionId: string | null;
  reference: string | null;
  status: string;
};

/** Envia um email ao admin sempre que um pagamento M-Pesa é concluído. */
export async function sendAdminPaymentEmail(notice: AdminPaymentNotice) {
  try {
    const origin = process.env["SITE_URL"] ?? "";
    if (!origin) {
      console.info("[notify] admin payment", notice);
      return { ok: false, reason: "SITE_URL em falta" };
    }
    const res = await fetch(`${origin}/lovable/email/transactional/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env["LOVABLE_API_KEY"] ?? ""}`,
      },
      body: JSON.stringify({
        templateName: "admin-payment-notification",
        recipientEmail: ADMIN_EMAIL,
        idempotencyKey: `payment-${notice.paymentId}-${notice.status}`,
        templateData: notice,
      }),
    });
    if (!res.ok) {
      console.warn("[notify] admin email falhou", res.status, await res.text());
      return { ok: false, reason: `HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (e) {
    console.warn("[notify] admin email erro", e);
    return { ok: false, reason: e instanceof Error ? e.message : String(e) };
  }
}
