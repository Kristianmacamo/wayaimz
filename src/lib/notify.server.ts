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

async function sendPaymentEmail(templateName: string, recipientEmail: string, notice: AdminPaymentNotice) {
  const origin = process.env["SITE_URL"] ?? "";
  const apiKey = process.env["LOVABLE_API_KEY"] ?? "";
  if (!origin || !apiKey || !recipientEmail) {
    console.info("[notify] email não enviado: configuração ou destinatário em falta", { recipientEmail, paymentId: notice.paymentId });
    return { ok: false, reason: "Configuração de email em falta" };
  }
  const res = await fetch(`${origin}/lovable/email/transactional/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      templateName,
      recipientEmail,
      idempotencyKey: `payment-${notice.paymentId}-${templateName}-${notice.status}`,
      templateData: notice,
    }),
  });
  if (!res.ok) {
    console.warn("[notify] email falhou", templateName, res.status, await res.text());
    return { ok: false, reason: `HTTP ${res.status}` };
  }
  return { ok: true };
}

/** Envia confirmação ao aluno e aviso ao admin após pagamento confirmado. */
export async function sendPaymentConfirmationEmails(notice: AdminPaymentNotice) {
  const results = await Promise.allSettled([
    sendPaymentEmail("payment-confirmation", notice.userEmail, notice),
    sendPaymentEmail("admin-payment-notification", ADMIN_EMAIL, notice),
  ]);
  return { ok: results.every((result) => result.status === "fulfilled" && result.value.ok) };
}

/** Compatibilidade com chamadas antigas. */
export async function sendAdminPaymentEmail(notice: AdminPaymentNotice) {
  return sendPaymentEmail("admin-payment-notification", ADMIN_EMAIL, notice);
}
