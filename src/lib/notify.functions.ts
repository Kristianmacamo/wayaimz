import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ADMIN_EMAIL = "cristianonumerique@gmail.com";

const schema = z.object({
  paymentId: z.string().uuid(),
  plan: z.string().min(1).max(32),
  amount: z.number().int().min(1).max(1_000_000),
  transactionCode: z.string().max(64).nullable(),
  proofUrl: z.string().url().nullable(),
  userEmail: z.string().email().or(z.literal("")),
});

export const notifyAdminPayment = createServerFn({ method: "POST" })
  .inputValidator((d: z.infer<typeof schema>) => schema.parse(d))
  .handler(async ({ data }) => {
    const subject = `🔔 Novo pagamento M-Pesa: ${data.plan.toUpperCase()} — ${data.amount} MT`;
    const lines = [
      `Plano: ${data.plan}`,
      `Valor: ${data.amount} MT`,
      `Utilizador: ${data.userEmail || "(sem email)"}`,
      `Código M-Pesa: ${data.transactionCode || "(não informado)"}`,
      `Comprovativo: ${data.proofUrl || "(não anexado)"}`,
      `Payment ID: ${data.paymentId}`,
    ];

    // Tentar enviar via rota de email transacional Lovable (se configurada)
    try {
      const origin = process.env.SITE_URL || "";
      const res = await fetch(`${origin}/lovable/email/transactional/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.LOVABLE_API_KEY ?? ""}`,
        },
        body: JSON.stringify({
          templateName: "admin-payment-notification",
          recipientEmail: ADMIN_EMAIL,
          idempotencyKey: `payment-${data.paymentId}`,
          templateData: {
            plan: data.plan,
            amount: data.amount,
            userEmail: data.userEmail,
            transactionCode: data.transactionCode,
            proofUrl: data.proofUrl,
            paymentId: data.paymentId,
          },
        }),
      });
      if (!res.ok) {
        console.warn("admin email send failed", res.status, await res.text());
      }
    } catch (e) {
      console.warn("admin email error", e);
    }

    return { ok: true, subject, body: lines.join("\n") };
  });
