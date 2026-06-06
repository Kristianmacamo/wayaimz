import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { PLANS, type PlanId } from "@/lib/plans";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Smartphone, CreditCard, CheckCircle2, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createStripeCheckout } from "@/lib/stripe.functions";
import { createPaypalOrder, capturePaypalOrder, getPaypalClientId } from "@/lib/paypal.functions";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/pagamentos")({
  component: PagamentosPage,
  validateSearch: (s: Record<string, unknown>) => ({
    plan: (typeof s.plan === "string" ? s.plan : "premium") as PlanId,
    status: typeof s.status === "string" ? s.status : undefined,
  }),
});



function PagamentosPage() {
  const { plan, status } = Route.useSearch();
  const qc = useQueryClient();
  const selected = PLANS[plan as PlanId] ?? PLANS.premium;
  const checkout = useServerFn(createStripeCheckout);
  const createOrder = useServerFn(createPaypalOrder);
  const captureOrder = useServerFn(capturePaypalOrder);

  const { data: payments } = useQuery({
    queryKey: ["my-payments"],
    queryFn: async () =>
      (await supabase.from("payments").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  const { data: ppCfg } = useQuery({
    queryKey: ["paypal-cfg"],
    queryFn: async () => getPaypalClientId(),
  });

  const [method, setMethod] = useState<"stripe" | "paypal" | "mpesa">("mpesa");
  const [sending, setSending] = useState(false);
  const [paymentIdRef, setPaymentIdRef] = useState<string | null>(null);

  async function payWithStripe() {
    if (selected.id === "free") return;
    setSending(true);
    try {
      const res = await checkout({ data: { plan: selected.id as "basico" | "premium" | "completo" } });
      window.location.href = res.url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao iniciar pagamento");
      setSending(false);
    }
  }

  void paymentIdRef;


  return (
    <div className="mx-auto max-w-3xl p-6 md:p-10">
      <h1 className="font-display text-3xl font-bold">Pagamento</h1>
      <p className="mt-1 text-muted-foreground">Pague de forma segura e ative o seu plano automaticamente.</p>

      {status === "success" && (
        <Card className="mt-4 border-green-500/40 bg-green-500/5 p-4 text-sm">
          ✅ Pagamento recebido! O seu plano será activado em segundos. Recarregue a página se não aparecer.
        </Card>
      )}
      {status === "cancel" && (
        <Card className="mt-4 border-yellow-500/40 bg-yellow-500/5 p-4 text-sm">
          Pagamento cancelado. Pode tentar novamente quando quiser.
        </Card>
      )}

      <Card className="mt-6 border-primary/30 bg-gradient-card p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Plano selecionado</p>
            <p className="font-display text-xl font-bold">{selected.name}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">{selected.price} MT</p>
            <p className="text-xs text-muted-foreground">
              ≈ ${selected.priceUsd} {selected.period && `· ${selected.period}`}
            </p>
          </div>
        </div>
        <Link to="/planos" className="mt-3 inline-block text-sm text-primary hover:underline">
          Alterar plano
        </Link>
      </Card>

      <Tabs value={method} onValueChange={(v) => setMethod(v as "stripe" | "paypal" | "mpesa")} className="mt-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="mpesa">
            <Smartphone className="mr-2 h-4 w-4" /> M-Pesa
          </TabsTrigger>
          <TabsTrigger value="stripe">
            <CreditCard className="mr-2 h-4 w-4" /> Cartão
          </TabsTrigger>
          <TabsTrigger value="paypal">
            <CreditCard className="mr-2 h-4 w-4" /> PayPal
          </TabsTrigger>
        </TabsList>

        <TabsContent value="paypal">
          <Card className="p-5">
            <div className="flex items-start gap-3">
              <Lock className="mt-1 h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Pagamento com PayPal</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Pague com a sua conta PayPal ou cartão. O plano é activado automaticamente após confirmação.
                </p>
              </div>
            </div>
            {ppCfg?.clientId && selected.id !== "free" ? (
              <div className="mt-4">
                <PayPalScriptProvider
                  options={{ clientId: ppCfg.clientId, currency: "USD", intent: "capture" }}
                >
                  <PayPalButtons
                    style={{ layout: "vertical", shape: "rect" }}
                    disabled={sending}
                    createOrder={async () => {
                      setSending(true);
                      try {
                        const r = await createOrder({
                          data: { plan: selected.id as "basico" | "premium" | "completo" },
                        });
                        setPaymentIdRef(r.paymentId);
                        return r.orderId;
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : "Erro");
                        setSending(false);
                        throw e;
                      }
                    }}
                    onApprove={async (data) => {
                      try {
                        await captureOrder({
                          data: { orderId: data.orderID, paymentId: paymentIdRef! },
                        });
                        toast.success("Pagamento aprovado! Plano activado.");
                        qc.invalidateQueries({ queryKey: ["my-payments"] });
                        qc.invalidateQueries({ queryKey: ["my-profile"] });
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : "Erro a capturar");
                      } finally {
                        setSending(false);
                      }
                    }}
                    onCancel={() => setSending(false)}
                    onError={(err) => {
                      toast.error(String(err));
                      setSending(false);
                    }}
                  />
                </PayPalScriptProvider>
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">PayPal indisponível para este plano.</p>
            )}
            <p className="mt-2 text-xs text-muted-foreground">
              Valor: ${selected.priceUsd} USD (≈ {selected.price} MT).
            </p>
          </Card>
        </TabsContent>

        <TabsContent value="stripe">
          <Card className="p-5">
            <div className="flex items-start gap-3">
              <Lock className="mt-1 h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Pagamento seguro com Visa / Mastercard</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Será redirecionado para o checkout seguro do Stripe. Após a confirmação, o seu plano é activado
                  automaticamente.
                </p>
              </div>
            </div>
            <Button
              onClick={payWithStripe}
              disabled={sending || selected.id === "free"}
              className="mt-4 w-full bg-gradient-hero"
            >
              {sending ? "A redireccionar..." : `Pagar $${selected.priceUsd} com cartão`}
            </Button>
            <p className="mt-2 text-xs text-muted-foreground">
              Valor em dólares (Stripe não suporta MZN). 1 USD ≈ 64 MT.
            </p>
          </Card>
        </TabsContent>



        <TabsContent value="mpesa">
          <MpesaForm planId={selected.id} amount={selected.price} onSent={() => qc.invalidateQueries({ queryKey: ["my-payments"] })} />
        </TabsContent>
      </Tabs>

      <h2 className="mt-10 font-display text-xl font-bold">Meus pagamentos</h2>
      <div className="mt-3 space-y-2">
        {(!payments || payments.length === 0) && (
          <p className="text-sm text-muted-foreground">Ainda não submeteu nenhum pagamento.</p>
        )}
        {payments?.map((p) => (
          <Card key={p.id} className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium capitalize">
                {p.plan} — {p.amount_mt} MT
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(p.created_at).toLocaleString("pt-PT")} · {p.method.toUpperCase()} · Ref: {p.reference}
              </p>
            </div>
            <Badge
              variant={p.status === "aprovado" ? "default" : p.status === "rejeitado" ? "destructive" : "secondary"}
            >
              {p.status === "aprovado" && <CheckCircle2 className="mr-1 h-3 w-3" />}
              {p.status}
            </Badge>
          </Card>
        ))}
      </div>
    </div>
  );
}
