import { createFileRoute } from "@tanstack/react-router";
import Stripe from "stripe";

export const Route = createFileRoute("/api/public/stripe-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.STRIPE_SECRET_KEY;
        const whSecret = process.env.STRIPE_WEBHOOK_SECRET;
        if (!secret || !whSecret) return new Response("Missing secrets", { status: 500 });

        const stripe = new Stripe(secret);
        const sig = request.headers.get("stripe-signature");
        if (!sig) return new Response("Missing signature", { status: 400 });
        const body = await request.text();

        let event: Stripe.Event;
        try {
          event = await stripe.webhooks.constructEventAsync(body, sig, whSecret);
        } catch (err) {
          console.error("stripe sig error", err);
          return new Response("Bad signature", { status: 400 });
        }

        if (event.type === "checkout.session.completed") {
          const session = event.data.object as Stripe.Checkout.Session;
          const paymentId = session.metadata?.payment_id;
          if (!paymentId) return new Response("Missing payment_id metadata", { status: 200 });

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          // Mark reference to session id and call approve RPC (uses admin -> bypasses RLS but RPC requires admin role check; use direct logic instead)
          const { data: pay } = await supabaseAdmin
            .from("payments")
            .select("*")
            .eq("id", paymentId)
            .maybeSingle();
          if (!pay || pay.status === "aprovado") return new Response("ok", { status: 200 });

          const durationDays = pay.plan === "completo" ? 30 : 7;

          await supabaseAdmin
            .from("payments")
            .update({ status: "aprovado", approved_at: new Date().toISOString() })
            .eq("id", paymentId);

          const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("plan_expires_at, referred_by")
            .eq("id", pay.user_id)
            .single();

          const baseExpiry = profile?.plan_expires_at && new Date(profile.plan_expires_at) > new Date()
            ? new Date(profile.plan_expires_at)
            : new Date();
          const newExpiry = new Date(baseExpiry.getTime() + durationDays * 86400000);

          await supabaseAdmin
            .from("profiles")
            .update({ current_plan: pay.plan, plan_expires_at: newExpiry.toISOString() })
            .eq("id", pay.user_id);

          if (profile?.referred_by) {
            await supabaseAdmin.from("affiliate_commissions").insert({
              affiliate_id: profile.referred_by,
              referred_user_id: pay.user_id,
              payment_id: pay.id,
              amount_mt: pay.amount_mt * 0.1,
            });
          }
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});
