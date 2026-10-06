import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  setCreditsSchema,
  startPaymentSchema,
  startStripeSchema,
  startPaysuiteSchema,
  type SetCreditsInput,
  type StartPaymentInput,
  type StartStripeInput,
  type StartPaysuiteInput,
} from "./payments.schemas";

/** Cria uma sessão de checkout Stripe e devolve o URL seguro. */
export const startStripeCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: StartStripeInput) => startStripeSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { createStripeCheckoutForUser } = await import("./stripe-payments.server");
    return createStripeCheckoutForUser(context.userId, data);
  });

/** PaySuite: cria checkout M-Pesa/e-Mola e devolve o URL. */
export const startPaysuiteCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: StartPaysuiteInput) => startPaysuiteSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { createPaysuiteCheckout } = await import("./paysuite.server");
    return createPaysuiteCheckout(context.userId, data);
  });

/** PaySuite: verifica o estado de um pagamento junto da PaySuite. */
export const checkPaysuitePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { paymentId: string }) => z.object({ paymentId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { syncPaysuitePayment } = await import("./paysuite.server");
    return syncPaysuitePayment(data.paymentId, context.userId);
  });

/** Inicia um pagamento M-Pesa (C2B) e activa o plano quando confirmado. */
export const startMpesaPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: StartPaymentInput) => startPaymentSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { startMpesaPaymentForUser } = await import("./payments.server");
    return startMpesaPaymentForUser(context.userId, data);
  });

/** Administração: definir créditos de um utilizador. */
export const adminSetCredits = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: SetCreditsInput) => setCreditsSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Sem permissão.");
    const { adminUpdateCredits } = await import("./payments.server");
    return adminUpdateCredits(data.userId, data.credits);
  });
