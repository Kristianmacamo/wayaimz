import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { PLANS, type PlanId } from "@/lib/plans";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Smartphone, CreditCard, Copy, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/pagamentos")({
  component: PagamentosPage,
  validateSearch: (s: Record<string, unknown>) => ({ plan: (typeof s.plan === "string" ? s.plan : "premium") as PlanId }),
});

const MPESA_NUMBER = "+258 84 000 0000";
const PAYPAL_EMAIL = "wayestudantes@example.com";

function PagamentosPage() {
  const { plan } = Route.useSearch();
  const qc = useQueryClient();
  const selected = PLANS[plan] ?? PLANS.premium;

  const { data: payments } = useQuery({
    queryKey: ["my-payments"],
    queryFn: async () => (await supabase.from("payments").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  const [reference, setReference] = useState("");
  const [method, setMethod] = useState<"mpesa" | "paypal">("mpesa");
  const [sending, setSending] = useState(false);

  async function submit() {
    if (!reference.trim()) { toast.error("Indique a referência do pagamento"); return; }
    setSending(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase.from("payments").insert({
      user_id: u.user.id,
      plan: selected.id,
      amount_mt: selected.price,
      method,
      reference: reference.trim(),
    });
    setSending(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Pagamento submetido. Aguarde aprovação do administrador.");
    setReference("");
    qc.invalidateQueries({ queryKey: ["my-payments"] });
  }

  function copy(v: string) { navigator.clipboard.writeText(v); toast.success("Copiado!"); }

  return (
    <div className="mx-auto max-w-3xl p-6 md:p-10">
      <h1 className="font-display text-3xl font-bold">Pagamento</h1>
      <p className="mt-1 text-muted-foreground">Pague de forma segura e ative o seu plano após aprovação.</p>

      <Card className="mt-6 border-primary/30 bg-gradient-card p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Plano selecionado</p>
            <p className="font-display text-xl font-bold">{selected.name}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">{selected.price} MT</p>
            <p className="text-xs text-muted-foreground">{selected.period && `por ${selected.period}`}</p>
          </div>
        </div>
        <Link to="/planos" className="mt-3 inline-block text-sm text-primary hover:underline">Alterar plano</Link>
      </Card>

      <Tabs value={method} onValueChange={(v) => setMethod(v as "mpesa" | "paypal")} className="mt-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="mpesa"><Smartphone className="mr-2 h-4 w-4" /> M-Pesa</TabsTrigger>
          <TabsTrigger value="paypal"><CreditCard className="mr-2 h-4 w-4" /> PayPal</TabsTrigger>
        </TabsList>

        <TabsContent value="mpesa">
          <Card className="p-5">
            <p className="text-sm">1. Envie <strong>{selected.price} MT</strong> via M-Pesa para o número:</p>
            <div className="mt-3 flex items-center justify-between rounded-lg bg-muted px-4 py-3 font-mono">
              <span>{MPESA_NUMBER}</span>
              <button onClick={() => copy(MPESA_NUMBER)}><Copy className="h-4 w-4 text-primary" /></button>
            </div>
            <p className="mt-4 text-sm">2. Cole abaixo a referência da transação M-Pesa:</p>
            <div className="mt-2 space-y-2">
              <Label>Referência M-Pesa</Label>
              <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Ex: MP2406.1234.AB123" />
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="paypal">
          <Card className="p-5">
            <p className="text-sm">1. Envie o valor equivalente a <strong>{selected.price} MT</strong> para a conta PayPal:</p>
            <div className="mt-3 flex items-center justify-between rounded-lg bg-muted px-4 py-3 font-mono text-sm">
              <span>{PAYPAL_EMAIL}</span>
              <button onClick={() => copy(PAYPAL_EMAIL)}><Copy className="h-4 w-4 text-primary" /></button>
            </div>
            <p className="mt-4 text-sm">2. Cole abaixo o ID da transação PayPal:</p>
            <div className="mt-2 space-y-2">
              <Label>ID da transação PayPal</Label>
              <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Ex: 8XJ123456A7890123" />
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <Button onClick={submit} disabled={sending} className="mt-4 w-full bg-gradient-hero">
        {sending ? "A enviar..." : "Submeter Pagamento"}
      </Button>

      <h2 className="mt-10 font-display text-xl font-bold">Meus pagamentos</h2>
      <div className="mt-3 space-y-2">
        {(!payments || payments.length === 0) && <p className="text-sm text-muted-foreground">Ainda não submeteu nenhum pagamento.</p>}
        {payments?.map((p) => (
          <Card key={p.id} className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium capitalize">{p.plan} — {p.amount_mt} MT</p>
              <p className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleString("pt-PT")} · {p.method.toUpperCase()} · Ref: {p.reference}</p>
            </div>
            <Badge variant={p.status === "aprovado" ? "default" : p.status === "rejeitado" ? "destructive" : "secondary"}>
              {p.status === "aprovado" && <CheckCircle2 className="mr-1 h-3 w-3" />}
              {p.status}
            </Badge>
          </Card>
        ))}
      </div>
    </div>
  );
}
