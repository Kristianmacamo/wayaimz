import { z } from "zod";
import { PAID_PLAN_IDS } from "./plans";

export const startPaymentSchema = z.object({
  plan: z.enum(PAID_PLAN_IDS),
  phone: z.string().min(9).max(20),
});
export type StartPaymentInput = z.infer<typeof startPaymentSchema>;

export const startStripeSchema = z.object({
  plan: z.enum(PAID_PLAN_IDS),
  origin: z.string().url(),
  email: z.string().email().optional(),
});
export type StartStripeInput = z.infer<typeof startStripeSchema>;

export const startPaysuiteSchema = z.object({
  plan: z.enum(PAID_PLAN_IDS),
  
  origin: z.string().url(),
});
export type StartPaysuiteInput = z.infer<typeof startPaysuiteSchema>;

export const setCreditsSchema = z.object({
  userId: z.string().uuid(),
  credits: z.number().int().min(0).max(1_000_000),
});
export type SetCreditsInput = z.infer<typeof setCreditsSchema>;
