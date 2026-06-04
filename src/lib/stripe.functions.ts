import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getRequestHost } from "@tanstack/react-start/server";
import { z } from "zod";
import Stripe from "stripe";
import { PLANS, type PlanId } from "@/lib/plans";

const Input = z.object({ plan: z.enum(["basico", "premium", "completo"]) });

export const createStripeCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => Input.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const planDef = PLANS[data.plan as PlanId];
    if (!planDef || planDef.priceUsd <= 0) throw new Error("Plano inválido");

    const secret = process.env.STRIPE_SECRET_KEY;
    if (!secret) throw new Error("Missing STRIPE_SECRET_KEY");
    const stripe = new Stripe(secret);

    // Create pending payment record
    const { data: payment, error: pErr } = await supabase
      .from("payments")
      .insert({
        user_id: userId,
        plan: data.plan,
        amount_mt: planDef.price,
        method: "stripe",
        reference: "pending",
        status: "pendente",
      })
      .select("id")
      .single();
    if (pErr || !payment) throw new Error(pErr?.message ?? "Falha ao criar pagamento");

    const host = getRequestHost();
    const proto = host.includes("localhost") ? "http" : "https";
    const origin = `${proto}://${host}`;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: Math.round(planDef.priceUsd * 100),
            product_data: {
              name: `Way Estudantes — Plano ${planDef.name}`,
              description: `${planDef.price} MT (≈ $${planDef.priceUsd}) · ${planDef.period}`,
            },
          },
        },
      ],
      metadata: { payment_id: payment.id, user_id: userId, plan: data.plan },
      success_url: `${origin}/pagamentos?status=success&pid=${payment.id}`,
      cancel_url: `${origin}/pagamentos?status=cancel`,
    });

    await supabase.from("payments").update({ reference: session.id }).eq("id", payment.id);

    return { url: session.url! };
  });
