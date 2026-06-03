import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Users, DollarSign, Link as LinkIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { COMMISSION_RATE } from "@/lib/plans";

export const Route = createFileRoute("/_app/afiliados")({ component: AfiliadosPage });

function AfiliadosPage() {
  const { data: profile } = useQuery({
    queryKey: ["my-profile"],
    queryFn: async () => (await supabase.from("profiles").select("affiliate_code").maybeSingle()).data,
  });
  const { data: commissions } = useQuery({
    queryKey: ["my-commissions"],
    queryFn: async () => (await supabase.from("affiliate_commissions").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const { data: referrals } = useQuery({
    queryKey: ["my-referrals", profile?.affiliate_code],
    enabled: !!profile?.affiliate_code,
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [];
      const { data } = await supabase.from("profiles").select("id, nome, apelido, created_at").eq("referred_by", u.user.id);
      return data ?? [];
    },
  });

  const code = profile?.affiliate_code ?? "—";
  const link = typeof window !== "undefined" ? `${window.location.origin}/auth?ref=${code}` : "";
  const total = (commissions ?? []).reduce((s, c) => s + Number(c.amount_mt), 0);
  const pending = (commissions ?? []).filter((c) => !c.paid).reduce((s, c) => s + Number(c.amount_mt), 0);

  function copy(v: string) { navigator.clipboard.writeText(v); toast.success("Copiado!"); }

  return (
    <div className="mx-auto max-w-4xl p-6 md:p-10">
      <h1 className="font-display text-3xl font-bold">Programa de Afiliados</h1>
      <p className="mt-1 text-muted-foreground">Ganhe {COMMISSION_RATE * 100}% sobre cada pagamento de quem se registar pelo seu link.</p>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Card className="p-5"><div className="flex items-center gap-3"><Users className="h-8 w-8 text-primary" /><div><p className="text-2xl font-bold">{referrals?.length ?? 0}</p><p className="text-xs text-muted-foreground">Indicados</p></div></div></Card>
        <Card className="p-5"><div className="flex items-center gap-3"><DollarSign className="h-8 w-8 text-secondary" /><div><p className="text-2xl font-bold">{total.toFixed(0)} MT</p><p className="text-xs text-muted-foreground">Total ganho</p></div></div></Card>
        <Card className="p-5"><div className="flex items-center gap-3"><DollarSign className="h-8 w-8 text-amber-500" /><div><p className="text-2xl font-bold">{pending.toFixed(0)} MT</p><p className="text-xs text-muted-foreground">Por receber</p></div></div></Card>
      </div>

      <Card className="mt-6 p-5">
        <h2 className="font-display font-semibold">O seu código</h2>
        <div className="mt-2 flex items-center justify-between rounded-lg bg-muted px-4 py-3 font-mono text-lg">
          <span>{code}</span>
          <Button size="sm" variant="ghost" onClick={() => copy(code)}><Copy className="h-4 w-4" /></Button>
        </div>
        <h2 className="mt-5 font-display font-semibold">O seu link de afiliado</h2>
        <div className="mt-2 flex items-center justify-between rounded-lg bg-muted px-4 py-3 text-sm">
          <span className="truncate"><LinkIcon className="mr-2 inline h-4 w-4 text-primary" />{link}</span>
          <Button size="sm" variant="ghost" onClick={() => copy(link)}><Copy className="h-4 w-4" /></Button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Partilhe nas redes sociais, WhatsApp ou grupos de estudo. Receberá automaticamente {COMMISSION_RATE * 100}% por cada plano aprovado.</p>
      </Card>

      <h2 className="mt-8 font-display text-xl font-bold">Histórico de comissões</h2>
      <div className="mt-3 space-y-2">
        {(!commissions || commissions.length === 0) && <p className="text-sm text-muted-foreground">Ainda não tem comissões.</p>}
        {commissions?.map((c) => (
          <Card key={c.id} className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium">{Number(c.amount_mt).toFixed(2)} MT</p>
              <p className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString("pt-PT")}</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${c.paid ? "bg-secondary-soft text-secondary" : "bg-amber-100 text-amber-700"}`}>
              {c.paid ? "Pago" : "Pendente"}
            </span>
          </Card>
        ))}
      </div>
    </div>
  );
}
