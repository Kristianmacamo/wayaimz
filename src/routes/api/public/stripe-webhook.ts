import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/stripe-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.text();
        const { verifyStripeSignature } = await import("@/lib/stripe.server");

        const valid = await verifyStripeSignature(body, request.headers.get("stripe-signature"));
        if (!valid) return new Response("Invalid signature", { status: 401 });

        let event: { type?: string; data?: { object?: Record<string, unknown> } };
        try {
          event = JSON.parse(body);
        } catch {
          return new Response("Invalid payload", { status: 400 });
        }

        const object = event.data?.object ?? {};
        const metadata = (object["metadata"] ?? {}) as Record<string, string>;
        const paymentId = metadata["payment_id"] ?? (object["client_reference_id"] as string | undefined);

        if (!paymentId) return new Response("ok");

        const { completeStripePayment, failStripePayment } = await import("@/lib/stripe-payments.server");

        if (event.type === "checkout.session.completed" && object["payment_status"] === "paid") {
          await completeStripePayment(paymentId, String(object["payment_intent"] ?? object["id"] ?? ""));
        } else if (
          event.type === "checkout.session.expired" ||
          event.type === "checkout.session.async_payment_failed" ||
          event.type === "payment_intent.payment_failed"
        ) {
          await failStripePayment(paymentId, "Pagamento Stripe não concluído.");
        }

        return new Response("ok");
      },
    },
  },
});
