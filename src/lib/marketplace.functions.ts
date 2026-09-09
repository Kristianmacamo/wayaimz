import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  buySchema,
  moderateSchema,
  payoutSchema,
  publishProductSchema,
  type BuyInput,
  type ModerateInput,
  type PayoutInput,
  type PublishProductInput,
} from "./marketplace.schemas";

/** Autor publica um material (fica pendente de aprovação). */
export const publishMaterial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: PublishProductInput) => publishProductSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { publishProduct } = await import("./marketplace.server");
    return publishProduct(context.userId, data);
  });

/** Estudante compra um material com M-Pesa. */
export const buyMaterial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: BuyInput) => buySchema.parse(d))
  .handler(async ({ data, context }) => {
    const { buyProduct } = await import("./marketplace.server");
    return buyProduct(context.userId, data);
  });

/** Administração: aprovar ou rejeitar um material submetido. */
export const moderateMaterial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: ModerateInput) => moderateSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Sem permissão.");
    const { moderateProduct } = await import("./marketplace.server");
    return moderateProduct(data.productId, data.aprovar, data.motivo);
  });

/** Autor solicita levantamento do saldo disponível. */
export const requestAuthorPayout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: PayoutInput) => payoutSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { requestPayout } = await import("./marketplace.server");
    return requestPayout(context.userId, data);
  });
