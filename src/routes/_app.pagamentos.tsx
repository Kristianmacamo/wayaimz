import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { PLANS, PAID_PLAN_IDS, PAYMENT_STATUS_LABEL, isPaidPlan, type PaidPlanId } from "@/lib/plans";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Smartphone, CheckCircle2, Loader2, ShieldCheck, XCircle, CreditCard, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { startMpesaPayment, startStripeCheckout, startPaysuiteCheckout, checkPaysuitePayment } from "@/lib/payments.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/pagamentos")({
  component: PagamentosPage,
  head: () => ({
    meta: [
      { title: "Pagamentos M-Pesa | Way Estudantes AI" },
      { name: "description", content: "Pague o seu plano do Way Estudantes AI directamente por M-Pesa e active o acesso na hora." },
      { property: "og:title", content: "Pagamentos M-Pesa | Way Estudantes AI" },
      { property: "og:description", content: "Active o seu plano académico em segundos com o M-Pesa." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): { plan: PaidPlanId; stripe?: "sucesso" | "cancelado"; ps?: string } => ({
    plan: (typeof s.plan === "string" && isPaidPlan(s.plan) ? s.plan : "semanal_premium") as PaidPlanId,
    ...(s.stripe === "sucesso" || s.stripe === "cancelado" ? { stripe: s.stripe as "sucesso" | "cancelado" } : {}),
    ...(typeof s.ps === "string" ? { ps: s.ps } : {}),
  }),
});

function StripeCard({ planId, amount, planName }: { planId: PaidPlanId; amount: number; planName: string }) {
  const [busy, setBusy] = useState(false);
  const checkout = useServerFn(startStripeCheckout);

  async function pay() {
    setBusy(true);
    try {
      const res = await checkout({ data: { plan: planId, origin: window.location.origin } });
      if (res.ok && res.url) {
        window.location.href = res.url;
        return;
      }
      toast.error(res.message);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao abrir o checkout.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="space-y-3 p-5">
      <div className="flex items-center gap-2">
        <CreditCard className="h-5 w-5 text-primary" />
        <p className="font-medium">Cartão bancário (Stripe)</p>
      </div>
      <p className="text-sm text-muted-foreground">
        Pague o plano {planName} com Visa, Mastercard ou carteira digital, num checkout seguro do Stripe. O plano é
        activado automaticamente após a confirmação.
      </p>
      <Button onClick={pay} disabled={busy} variant="outline" className="w-full">
        {busy ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> A abrir checkout...
          </>
        ) : (
          <>
            <CreditCard className="mr-2 h-4 w-4" /> Pagar {amount} MT com cartão
          </>
        )}
      </Button>
    </Card>
  );
}

function PaysuiteCard({ planId, amount }: { planId: PaidPlanId; amount: number }) {
  const [busy, setBusy] = useState<null | "epay">(null);
  const start = useServerFn(startPaysuiteCheckout);
  async function pay(method: "epay") {
    setBusy(method);
    try {
      const res = await start({ data: { plan: planId, origin: window.location.origin } });
      if (res.ok && res.url) {
        window.location.href = res.url;
        return;
      }
      toast.error(res.message);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao abrir o pagamento.");
    }
    setBusy(null);
  }
  return (
    <Card className="space-y-3 p-5">
      <div className="flex items-center gap-2">
        <Smartphone className="h-5 w-5 text-primary" />
        <p className="font-medium">M-Pesa, e-Mola ou IZI (ePay)</p>
      </div>
      <p className="text-sm text-muted-foreground">
        Escolha M-Pesa, e-Mola ou IZI na página segura da ePay e confirme no telemóvel. O plano é activado automaticamente.
      </p>
      <Button onClick={() => pay("epay")} disabled={!!busy} className="w-full">
        {busy === "epay" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Smartphone className="mr-2 h-4 w-4" />}
        Pagar {amount} MT
      </Button>
    </Card>
  );
}

function PaysuiteReturn({ paymentId }: { paymentId: string }) {
  const check = useServerFn(checkPaysuitePayment);
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["ps-check", paymentId],
    queryFn: async () => {
      const r = await check({ data: { paymentId } });
      if (r.status === "concluido") {
        qc.invalidateQueries({ queryKey: ["my-payments"] });
        qc.invalidateQueries({ queryKey: ["my-subscription"] });
        qc.invalidateQueries({ queryKey: ["my-profile"] });
      }
      return r;
    },
    refetchInterval: (q) => (q.state.data?.status === "a_processar" ? 4000 : false),
  });
  const ok = data?.status === "concluido";
  const failed = data?.status === "falhado";
  return (
    <Card className={`mt-6 flex items-center gap-3 p-4 text-sm ${ok ? "border-secondary/40 bg-secondary-soft/40" : failed ? "border-destructive/40" : ""}`}>
      {ok ? <CheckCircle2 className="h-5 w-5 text-secondary" /> : failed ? <XCircle className="h-5 w-5 text-destructive" /> : <Loader2 className="h-5 w-5 animate-spin" />}
      <span className="flex-1">{data?.message ?? "A verificar o pagamento..."}</span>
      {!ok && <Button type="button" size="sm" variant="outline" onClick={() => void qc.invalidateQueries({ queryKey: ["ps-check", paymentId] })}>
        <RefreshCw className="mr-1 h-3.5 w-3.5" /> Verificar novamente
      </Button>}
    </Card>
  );
}

function PagamentosPage() {
  const { plan, stripe, ps } = Route.useSearch();
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<PaidPlanId>(plan);
  const selected = PLANS[selectedId];

  const { data: payments } = useQuery({
    queryKey: ["my-payments"],
    queryFn: async () =>
      (await supabase.from("payments").select("*").order("created_at", { ascending: false }).limit(20)).data ?? [],
  });

  const { data: subscription } = useQuery({
    queryKey: ["my-subscription"],
    queryFn: async () =>
      (
        await supabase
          .from("subscriptions")
          .select("*")
          .eq("status", "activa")
          .order("end_date", { ascending: false })
          .limit(1)
          .maybeSingle()
      ).data,
  });

  return (
    <div className="mx-auto max-w-3xl p-6 md:p-10">
      <h1 className="font-display text-3xl font-bold">Pagamentos</h1>
      <p className="mt-1 text-muted-foreground">
        Escolha o plano e pague por M-Pesa, e-Mola, IZI ou cartão bancário. O acesso é activado automaticamente.
      </p>

      {stripe === "sucesso" && (
        <Card className="mt-6 flex items-center gap-3 border-secondary/40 bg-secondary-soft/40 p-4 text-sm">
          <CheckCircle2 className="h-5 w-5 text-secondary" />
          Pagamento por cartão recebido. O plano é activado assim que o Stripe confirmar (poucos segundos).
        </Card>
      )}
      {stripe === "cancelado" && (
        <Card className="mt-6 flex items-center gap-3 border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          <XCircle className="h-5 w-5" />
          Checkout cancelado. Pode tentar novamente quando quiser.
        </Card>
      )}


      {ps && <PaysuiteReturn paymentId={ps} />}

      {subscription && (
        <Card className="mt-6 flex items-center gap-3 border-secondary/40 bg-secondary-soft/40 p-4">
          <ShieldCheck className="h-5 w-5 text-secondary" />
          <p className="text-sm">
            Plano <strong className="capitalize">{PLANS[subscription.plan as PaidPlanId]?.name ?? subscription.plan}</strong> activo até{" "}
            <strong>{new Date(subscription.end_date).toLocaleDateString("pt-PT")}</strong>.
          </p>
        </Card>
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {PAID_PLAN_IDS.map((id) => {
          const p = PLANS[id];
          const active = id === selectedId;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setSelectedId(id)}
              className={`rounded-xl border p-4 text-left transition ${active ? "border-primary bg-primary/5 ring-2 ring-primary/30" : "hover:border-primary/40"}`}
            >
              <p className="text-sm font-semibold">{p.name}</p>
              <p className="mt-1 text-2xl font-bold">{p.price} MT</p>
              <p className="text-xs text-muted-foreground">
                / {p.period} · {p.credits} créditos
              </p>
            </button>
          );
        })}
      </div>

      <Link to="/planos" className="mt-3 inline-block text-sm text-primary hover:underline">
        Ver detalhes dos planos
      </Link>

      <div className="mt-6 grid gap-4">
        <PaysuiteCard planId={selected.id} amount={selected.price} />
        <StripeCard planId={selected.id} amount={selected.price} planName={selected.name} />
      </div>

      <h2 className="mt-10 font-display text-xl font-bold">Histórico de pagamentos</h2>
      <div className="mt-3 space-y-2">
        {(!payments || payments.length === 0) && (
          <p className="text-sm text-muted-foreground">Ainda não efectuou nenhum pagamento.</p>
        )}
        {payments?.map((p) => (
          <Card key={p.id} className="flex items-center justify-between gap-3 p-4">
            <div>
              <p className="font-medium">
                {PLANS[p.plan as PaidPlanId]?.name ?? p.plan} — {p.amount} MT
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(p.created_at).toLocaleString("pt-PT")} · {p.phone_number} · Ref: {p.payment_reference}
              </p>
              {p.error_message && <p className="mt-1 text-xs text-destructive">{p.error_message}</p>}
            </div>
            <Badge
              variant={p.status === "concluido" ? "default" : p.status === "falhado" ? "destructive" : "secondary"}
            >
              {p.status === "concluido" && <CheckCircle2 className="mr-1 h-3 w-3" />}
              {p.status === "falhado" && <XCircle className="mr-1 h-3 w-3" />}
              {PAYMENT_STATUS_LABEL[p.status] ?? p.status}
            </Badge>
          </Card>
        ))}
      </div>
    </div>
  );
}

function MpesaForm({ planId, amount, onDone }: { planId: PaidPlanId; amount: number; onDone: () => void }) {
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const pay = useServerFn(startMpesaPayment);

  async function submit() {
    setResult(null);
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 9) {
      toast.error("Introduza o seu número M-Pesa (84 ou 85).");
      return;
    }
    setBusy(true);
    const toastId = toast.loading("A enviar pedido para o seu telemóvel... confirme com o PIN M-Pesa.");
    try {
      const res = await pay({ data: { plan: planId, phone } });
      setResult({ ok: res.ok, message: res.message });
      if (res.ok) {
        toast.success(res.message, { id: toastId });
        onDone();
      } else {
        toast.error(res.message, { id: toastId });
        onDone();
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao processar o pagamento.";
      setResult({ ok: false, message: msg });
      toast.error(msg, { id: toastId });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="space-y-4 p-5">
      <div>
        <p className="font-medium">Como funciona</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
          <li>Introduza o número M-Pesa (Vodacom) associado à sua conta.</li>
          <li>Clique em <strong>Pagar {amount} MT</strong>.</li>
          <li>Receberá um pedido no telemóvel — introduza o seu PIN M-Pesa.</li>
          <li>Assim que confirmar, o plano e os créditos são activados automaticamente.</li>
        </ol>
        <p className="mt-3 rounded-md border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          Os pagamentos são recebidos na conta M-Pesa oficial do WAY Estudantes AI:{" "}
          <strong className="text-foreground">84 477 2002</strong>
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="msisdn" className="text-sm font-medium">
          Número M-Pesa
        </label>
        <div className="flex items-center gap-2">
          <span className="rounded-md border bg-muted px-3 py-2 text-sm text-muted-foreground">+258</span>
          <input
            id="msisdn"
            inputMode="numeric"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="84 123 4567"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </div>
        <p className="text-xs text-muted-foreground">Apenas números Vodacom (84 ou 85).</p>
      </div>

      <Button onClick={submit} disabled={busy} className="w-full bg-gradient-hero">
        {busy ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> A aguardar confirmação...
          </>
        ) : (
          <>
            <Smartphone className="mr-2 h-4 w-4" /> Pagar {amount} MT
          </>
        )}
      </Button>

      {result && (
        <div
          className={`rounded-md border p-3 text-sm ${result.ok ? "border-secondary/50 bg-secondary-soft/40" : "border-destructive/40 bg-destructive/10 text-destructive"}`}
        >
          {result.message}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Pagamento processado pela API oficial do M-Pesa (Vodacom Moçambique). Nunca pedimos o seu PIN.
      </p>
    </Card>
  );
}
