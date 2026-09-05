import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { adminSetCredits } from "@/lib/payments.functions";
import { PLANS, PAYMENT_STATUS_LABEL, SUBSCRIPTION_STATUS_LABEL, type PlanId } from "@/lib/plans";
import { toast } from "sonner";
import { Ban, RefreshCw, DollarSign, Search } from "lucide-react";

export const Route = createFileRoute("/_app/admin")({
  beforeLoad: async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) throw redirect({ to: "/auth" });
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", u.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!data) throw redirect({ to: "/chat" });
  },
  component: AdminPage,
});

function planName(id: string) {
  return PLANS[id as PlanId]?.name ?? id;
}

function sumSince(rows: { amount: number; created_at: string }[], days: number) {
  const since = Date.now() - days * 24 * 60 * 60 * 1000;
  return rows.filter((r) => new Date(r.created_at).getTime() >= since).reduce((s, r) => s + Number(r.amount || 0), 0);
}

function AdminPage() {
  const qc = useQueryClient();
  const setCredits = useServerFn(adminSetCredits);
  const [q, setQ] = useState("");

  const { data: payments } = useQuery({
    queryKey: ["admin-payments"],
    queryFn: async () =>
      (await supabase.from("payments").select("*").order("created_at", { ascending: false }).limit(500)).data ?? [],
  });
  const { data: subs } = useQuery({
    queryKey: ["admin-subscriptions"],
    queryFn: async () =>
      (await supabase.from("subscriptions").select("*").order("created_at", { ascending: false }).limit(500)).data ?? [],
  });
  const { data: users } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () =>
      (await supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(1000)).data ?? [],
  });
  const { data: commissions } = useQuery({
    queryKey: ["admin-commissions"],
    queryFn: async () =>
      (await supabase.from("affiliate_commissions").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  const paid = useMemo(() => (payments ?? []).filter((p) => p.status === "concluido"), [payments]);
  const revenue = {
    dia: sumSince(paid, 1),
    semana: sumSince(paid, 7),
    mes: sumSince(paid, 30),
    ano: sumSince(paid, 365),
    total: paid.reduce((s, p) => s + Number(p.amount || 0), 0),
  };
  const commissionsPaid = (commissions ?? []).filter((c) => c.paid).reduce((s, c) => s + Number(c.amount_mt || 0), 0);
  const commissionsPending = (commissions ?? []).filter((c) => !c.paid).reduce((s, c) => s + Number(c.amount_mt || 0), 0);
  const profit = revenue.total - commissionsPaid - commissionsPending;

  async function call(fn: string, args: Record<string, unknown>, success: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.rpc as any)(fn, args);
    if (error) return toast.error(error.message);
    toast.success(success);
    qc.invalidateQueries();
  }

  async function editCredits(userId: string, current: number) {
    const v = window.prompt("Novos créditos:", String(current));
    if (v === null) return;
    const n = parseInt(v, 10);
    if (Number.isNaN(n) || n < 0) return toast.error("Valor inválido");
    try {
      await setCredits({ data: { userId, credits: n } });
      toast.success("Créditos actualizados");
      qc.invalidateQueries();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível actualizar os créditos");
    }
  }

  const term = q.trim().toLowerCase();
  const filteredUsers = (users ?? []).filter((u) =>
    !term
      ? true
      : `${u.nome} ${u.apelido} ${u.email} ${u.telefone} ${u.affiliate_code}`.toLowerCase().includes(term)
  );

  return (
    <div className="mx-auto max-w-6xl p-6 md:p-10">
      <h1 className="font-display text-3xl font-bold">Painel de Administração</h1>
      <p className="mt-1 text-muted-foreground">Pagamentos M-Pesa, assinaturas, utilizadores e relatórios financeiros.</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {[
          ["Hoje", revenue.dia],
          ["7 dias", revenue.semana],
          ["30 dias", revenue.mes],
          ["12 meses", revenue.ano],
          ["Total", revenue.total],
        ].map(([label, value]) => (
          <Card key={label as string} className="p-4">
            <p className="text-xs text-muted-foreground">Receita — {label as string}</p>
            <p className="mt-1 text-xl font-bold">{Number(value).toFixed(0)} MT</p>
          </Card>
        ))}
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Comissões pagas</p>
          <p className="mt-1 text-xl font-bold">{commissionsPaid.toFixed(2)} MT</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Comissões pendentes</p>
          <p className="mt-1 text-xl font-bold">{commissionsPending.toFixed(2)} MT</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Lucro líquido</p>
          <p className="mt-1 text-xl font-bold text-primary">{profit.toFixed(2)} MT</p>
        </Card>
      </div>

      <Tabs defaultValue="payments" className="mt-6">
        <TabsList>
          <TabsTrigger value="payments">Pagamentos ({payments?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="subs">Assinaturas ({subs?.filter((s) => s.status === "activa").length ?? 0})</TabsTrigger>
          <TabsTrigger value="users">Utilizadores ({users?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="commissions">Comissões</TabsTrigger>
        </TabsList>

        <TabsContent value="payments" className="space-y-2">
          {payments?.map((p) => {
            const u = users?.find((x) => x.id === p.user_id);
            return (
              <Card key={p.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-semibold">
                    {planName(p.plan)} — {p.amount} MT
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {u ? `${u.nome} ${u.apelido} (${u.email})` : p.user_id}
                  </p>
                  {u && (
                    <p className="text-xs">
                      Saldo actual: <strong>{u.credits ?? 0} créditos</strong> · Plano:{" "}
                      <span className="font-medium text-primary">{planName(u.current_plan)}</span>
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    M-Pesa {p.phone_number} · Ref: {p.payment_reference} ·{" "}
                    {new Date(p.created_at).toLocaleString("pt-PT")}
                  </p>
                  {p.transaction_id && (
                    <p className="text-xs">
                      ID: <span className="font-mono">{p.transaction_id}</span>
                    </p>
                  )}
                  {p.error_message && <p className="text-xs text-destructive">{p.error_message}</p>}
                </div>
                <Badge
                  variant={p.status === "concluido" ? "default" : p.status === "falhado" ? "destructive" : "secondary"}
                >
                  {PAYMENT_STATUS_LABEL[p.status] ?? p.status}
                </Badge>
              </Card>
            );
          })}
          {!payments?.length && <p className="text-sm text-muted-foreground">Sem pagamentos.</p>}
        </TabsContent>

        <TabsContent value="subs" className="space-y-2">
          {subs?.map((s) => {
            const u = users?.find((x) => x.id === s.user_id);
            return (
              <Card key={s.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-semibold">
                    {planName(s.plan)} — {s.amount} MT
                  </p>
                  <p className="text-xs text-muted-foreground">{u ? `${u.nome} ${u.apelido} (${u.email})` : s.user_id}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(s.start_date).toLocaleDateString("pt-PT")} →{" "}
                    {new Date(s.end_date).toLocaleDateString("pt-PT")}
                  </p>
                </div>
                <Badge variant={s.status === "activa" ? "default" : "secondary"}>
                  {SUBSCRIPTION_STATUS_LABEL[s.status] ?? s.status}
                </Badge>
              </Card>
            );
          })}
          {!subs?.length && <p className="text-sm text-muted-foreground">Sem assinaturas.</p>}
        </TabsContent>

        <TabsContent value="users" className="space-y-2">
          <div className="flex items-center gap-2 rounded-md border px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Procurar por nome, email, telefone ou código"
              className="w-full bg-transparent text-sm outline-none"
            />
          </div>
          {filteredUsers.map((u) => (
            <Card key={u.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="font-semibold">
                  {u.emoji ?? "🎓"} {u.nome} {u.apelido}
                </p>
                <p className="text-xs text-muted-foreground">
                  {u.email} · {u.telefone} · {u.nivel}
                </p>
                <p className="text-xs">
                  Plano: <span className="font-medium text-primary">{planName(u.current_plan)}</span> · Créditos:{" "}
                  <strong>{u.credits ?? 0}</strong> · Cód: <span className="font-mono">{u.affiliate_code}</span>
                  {u.plan_expires_at && ` · expira ${new Date(u.plan_expires_at).toLocaleDateString("pt-PT")}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {u.suspended && <Badge variant="destructive">Suspenso</Badge>}
                <Button size="sm" variant="outline" onClick={() => editCredits(u.id, u.credits ?? 0)}>
                  Créditos
                </Button>
                <Button
                  size="sm"
                  variant={u.suspended ? "default" : "outline"}
                  onClick={() =>
                    call(
                      "toggle_user_suspension",
                      { _user_id: u.id, _suspended: !u.suspended },
                      u.suspended ? "Reactivado" : "Suspenso"
                    )
                  }
                >
                  {u.suspended ? (
                    <>
                      <RefreshCw className="mr-1 h-4 w-4" />
                      Reactivar
                    </>
                  ) : (
                    <>
                      <Ban className="mr-1 h-4 w-4" />
                      Suspender
                    </>
                  )}
                </Button>
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="commissions" className="space-y-2">
          {commissions?.map((c) => {
            const aff = users?.find((u) => u.id === c.affiliate_id);
            return (
              <Card key={c.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="font-semibold">{Number(c.amount_mt).toFixed(2)} MT</p>
                  <p className="text-xs text-muted-foreground">
                    Afiliado: {aff ? `${aff.nome} ${aff.apelido}` : c.affiliate_id}
                  </p>
                  <p className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString("pt-PT")}</p>
                </div>
                {c.paid ? (
                  <Badge>Pago</Badge>
                ) : (
                  <Button size="sm" onClick={() => call("mark_commission_paid", { _id: c.id }, "Comissão marcada como paga")}>
                    <DollarSign className="mr-1 h-4 w-4" />
                    Marcar como pago
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
