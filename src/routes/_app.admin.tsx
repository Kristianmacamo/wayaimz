import { createFileRoute, redirect } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, X, Ban, RefreshCw, DollarSign } from "lucide-react";

export const Route = createFileRoute("/_app/admin")({
  beforeLoad: async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) throw redirect({ to: "/auth" });
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id).eq("role", "admin").maybeSingle();
    if (!data) throw redirect({ to: "/chat" });
  },
  component: AdminPage,
});

function AdminPage() {
  const qc = useQueryClient();

  const { data: payments } = useQuery({
    queryKey: ["admin-payments"],
    queryFn: async () => (await supabase.from("payments").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const { data: users } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => (await supabase.from("profiles").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const { data: commissions } = useQuery({
    queryKey: ["admin-commissions"],
    queryFn: async () => (await supabase.from("affiliate_commissions").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  async function call(fn: string, args: Record<string, unknown>, success: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.rpc as any)(fn, args);
    if (error) return toast.error(error.message);
    toast.success(success);
    qc.invalidateQueries();
  }

  const approved = payments?.filter((p) => p.status === "aprovado") ?? [];
  const totalRevenue = approved.reduce((s, p) => s + Number(p.amount_mt || 0), 0);
  const totalCommissions = commissions?.reduce((s, c) => s + Number(c.amount_mt || 0), 0) ?? 0;
  const totalProfit = totalRevenue - totalCommissions;

  async function setCredits(userId: string, current: number) {
    const v = window.prompt("Novos créditos:", String(current));
    if (v === null) return;
    const n = parseInt(v, 10);
    if (Number.isNaN(n) || n < 0) return toast.error("Valor inválido");
    await call("admin_set_credits", { _user_id: userId, _credits: n }, "Créditos actualizados");
  }

  return (
    <div className="mx-auto max-w-6xl p-6 md:p-10">
      <h1 className="font-display text-3xl font-bold">Painel de Administração</h1>
      <p className="mt-1 text-muted-foreground">Gerir pagamentos, utilizadores, créditos e comissões.</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Card className="p-4"><p className="text-xs text-muted-foreground">Receita aprovada</p><p className="mt-1 text-2xl font-bold">{totalRevenue.toFixed(0)} MT</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Comissões afiliados</p><p className="mt-1 text-2xl font-bold">{totalCommissions.toFixed(0)} MT</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Lucro líquido</p><p className="mt-1 text-2xl font-bold text-primary">{totalProfit.toFixed(0)} MT</p></Card>
      </div>

      <Tabs defaultValue="payments" className="mt-6">
        <TabsList>
          <TabsTrigger value="payments">Pagamentos ({payments?.filter((p) => p.status === "pendente").length ?? 0})</TabsTrigger>
          <TabsTrigger value="users">Utilizadores ({users?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="commissions">Comissões</TabsTrigger>
        </TabsList>

        <TabsContent value="payments" className="space-y-2">
          {payments?.map((p) => {
            const u = users?.find((x) => x.id === p.user_id);
            const pAny = p as unknown as { transaction_code?: string; proof_url?: string };
            return (
              <Card key={p.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-semibold capitalize">{p.plan} — {p.amount_mt} MT</p>
                  <p className="text-xs text-muted-foreground">{u ? `${u.nome} ${u.apelido} (${u.email})` : p.user_id}</p>
                  <p className="text-xs text-muted-foreground">{p.method.toUpperCase()} · Ref: {p.reference} · {new Date(p.created_at).toLocaleString("pt-PT")}</p>
                  {pAny.transaction_code && <p className="text-xs">Código: <span className="font-mono">{pAny.transaction_code}</span></p>}
                  {pAny.proof_url && <a href={pAny.proof_url} target="_blank" rel="noreferrer" className="text-xs text-primary underline">Ver comprovativo</a>}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={p.status === "aprovado" ? "default" : p.status === "rejeitado" ? "destructive" : "secondary"}>{p.status}</Badge>
                  {p.status === "pendente" && (
                    <>
                      <Button size="sm" onClick={() => call("approve_payment", { _payment_id: p.id }, "Pagamento aprovado")}><Check className="mr-1 h-4 w-4" />Aprovar</Button>
                      <Button size="sm" variant="outline" onClick={() => call("reject_payment", { _payment_id: p.id }, "Pagamento rejeitado")}><X className="mr-1 h-4 w-4" />Rejeitar</Button>
                    </>
                  )}
                </div>
              </Card>
            );
          })}
          {!payments?.length && <p className="text-sm text-muted-foreground">Sem pagamentos.</p>}
        </TabsContent>

        <TabsContent value="users" className="space-y-2">
          {users?.map((u) => {
            const uAny = u as unknown as { credits?: number };
            return (
              <Card key={u.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-semibold">{u.emoji ?? "🎓"} {u.nome} {u.apelido}</p>
                  <p className="text-xs text-muted-foreground">{u.email} · {u.telefone} · {u.nivel}</p>
                  <p className="text-xs">Plano: <span className="font-medium text-primary capitalize">{u.current_plan}</span> · Créditos: <strong>{uAny.credits ?? 0}</strong> · Cód: <span className="font-mono">{u.affiliate_code}</span></p>
                </div>
                <div className="flex items-center gap-2">
                  {u.suspended && <Badge variant="destructive">Suspenso</Badge>}
                  <Button size="sm" variant="outline" onClick={() => setCredits(u.id, uAny.credits ?? 0)}>Créditos</Button>
                  <Button size="sm" variant={u.suspended ? "default" : "outline"}
                    onClick={() => call("toggle_user_suspension", { _user_id: u.id, _suspended: !u.suspended }, u.suspended ? "Reativado" : "Suspenso")}>
                    {u.suspended ? <><RefreshCw className="mr-1 h-4 w-4" />Reativar</> : <><Ban className="mr-1 h-4 w-4" />Suspender</>}
                  </Button>
                </div>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="commissions" className="space-y-2">
          {commissions?.map((c) => {
            const aff = users?.find((u) => u.id === c.affiliate_id);
            return (
              <Card key={c.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="font-semibold">{Number(c.amount_mt).toFixed(2)} MT</p>
                  <p className="text-xs text-muted-foreground">Afiliado: {aff ? `${aff.nome} ${aff.apelido}` : c.affiliate_id}</p>
                  <p className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString("pt-PT")}</p>
                </div>
                {c.paid ? <Badge>Pago</Badge> : (
                  <Button size="sm" onClick={() => call("mark_commission_paid", { _id: c.id }, "Comissão marcada como paga")}>
                    <DollarSign className="mr-1 h-4 w-4" />Marcar como pago
                  </Button>
                )}
              </Card>
            );
          })}
          {!commissions?.length && <p className="text-sm text-muted-foreground">Sem comissões.</p>}
        </TabsContent>
      </Tabs>
    </div>
  );
}
