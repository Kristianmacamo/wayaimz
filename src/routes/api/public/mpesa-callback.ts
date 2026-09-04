import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

/**
 * Asynchronous Response URL do M-Pesa.
 * O resultado síncrono do C2B continua a ser a fonte principal; este callback
 * apenas reconcilia o estado do pagamento quando o M-Pesa responde mais tarde.
 */
const callbackSchema = z.object({
  input_ThirdPartyReference: z.string().min(3).max(64).optional(),
  input_TransactionID: z.string().max(64).optional(),
  input_ResponseCode: z.string().max(32).optional(),
  input_ResponseDesc: z.string().max(500).optional(),
  output_ThirdPartyReference: z.string().min(3).max(64).optional(),
  output_TransactionID: z.string().max(64).optional(),
  output_ResponseCode: z.string().max(32).optional(),
  output_ResponseDesc: z.string().max(500).optional(),
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export const Route = createFileRoute("/api/public/mpesa-callback")({
  server: {
    handlers: {
      GET: async () => json({ status: "ok", service: "mpesa-callback" }),
      POST: async ({ request }) => {
        let payload: unknown;
        try {
          payload = await request.json();
        } catch {
          return json({ output_ResponseCode: "INS-21" }, 400);
        }

        const parsed = callbackSchema.safeParse(payload);
        if (!parsed.success) return json({ output_ResponseCode: "INS-21" }, 400);

        const d = parsed.data;
        const reference = d.output_ThirdPartyReference ?? d.input_ThirdPartyReference;
        const code = d.output_ResponseCode ?? d.input_ResponseCode ?? "";
        const transactionId = d.output_TransactionID ?? d.input_TransactionID ?? null;
        if (!reference) return json({ output_ResponseCode: "INS-21" }, 400);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: payment } = await supabaseAdmin
          .from("payments")
          .select("id, status, user_id, plan, amount, phone_number")
          .eq("payment_reference", reference)
          .maybeSingle();

        if (!payment) return json({ output_ResponseCode: "INS-0" });

        // Não reabrir pagamentos já concluídos pelo fluxo síncrono.
        if (payment.status !== "concluido") {
          const success = code === "INS-0";
          await supabaseAdmin
            .from("payments")
            .update({
              status: success ? "concluido" : "falhado",
              transaction_id: transactionId,
              error_message: success
                ? null
                : `${code}: ${d.output_ResponseDesc ?? d.input_ResponseDesc ?? ""}`,
              api_response: parsed.data as never,
              updated_at: new Date().toISOString(),
            })
            .eq("id", payment.id);

          if (success) {
            // Activação automática do plano + notificação ao admin.
            const { isPaidPlan } = await import("@/lib/plans");
            const { data: profile } = await supabaseAdmin
              .from("profiles")
              .select("credits, email")
              .eq("id", payment.user_id)
              .maybeSingle();

            if (isPaidPlan(payment.plan)) {
              const { activatePlan } = await import("@/lib/payments.server");
              await activatePlan(
                payment.user_id,
                payment.id,
                reference,
                payment.plan,
                profile?.credits ?? 0
              );
            }

            const { sendAdminPaymentEmail } = await import("@/lib/notify.server");
            await sendAdminPaymentEmail({
              paymentId: payment.id,
              plan: payment.plan,
              amount: Number(payment.amount),
              userEmail: profile?.email ?? "",
              phone: payment.phone_number ?? null,
              transactionId,
              reference,
              status: "concluido",
            });
          }
        }

        return json({ output_ResponseCode: "INS-0", output_ResponseDesc: "Received" });

      },
    },
  },
});
