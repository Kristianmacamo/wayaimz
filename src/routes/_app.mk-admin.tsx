import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { moderateMaterial } from "@/lib/marketplace.functions";
import { NIVEIS, money, nivelLabel, tipoLabel } from "@/lib/marketplace";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MkStatus } from "@/components/MkStatus";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Check, Loader2, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/mk-admin")({
  component: MkAdminPage,
  head: () => ({
    meta: [
      { title: "Administração do Marketplace | Way Estudantes AI" },
      { name: "description", content: "Receita, IVA, comissões, moderação de materiais e ranking de autores do marketplace educacional." },
      { property: "og:title", content: "Administração do Marketplace | Way Estudantes AI" },
      { property: "og:description", content: "Painel de gestão do marketplace educacional moçambicano." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

type Venda = {
  id: string;
  buyer_name: string;
  author_id: string | null;
  preco_base: number;
  valor_iva: number;
  valor_com_iva: number;
  comissao_plataforma: number;
  valor_liquido_autor: number;
  status_pagamento: string;
  created_at: string;
  mk_products: { titulo: string; nivel_ensino: string } | null;
};

type Produto = {
  id: string;
  titulo: string;
  descricao: string;
  disciplina: string;
  nivel_ensino: string;
  tipo: string;
  preco_base: number;
  author_name: string;
  status: string;
};

function MkAdminPage() {
  const qc = useQueryClient();
  const moderar = useServerFn(moderateMaterial);
  const [nivel, setNivel] = useState("todos");
  const [busy, setBusy] = useState<string | null>(null);

  const { data: vendas = [], isLoading } = useQuery({
    queryKey: ["mk-admin-vendas"],
    queryFn: async () => {
      const { data } = await supabase
        .from("mk_sales")
        .select("id, buyer_name, author_id, preco_base, valor_iva, valor_com_iva, comissao_plataforma, valor_liquido_autor, status_pagamento, created_at, mk_products(titulo, nivel_ensino)")
        .order("created_at", { ascending: false });
      return (data ?? []) as unknown as Venda[];
    },
  });

  const { data: produtos = [] } = useQuery({
    queryKey: ["mk-admin-produtos"],
    queryFn: async () => {
      const { data } = await supabase
        .from("mk_products")
        .select("id, titulo, descricao, disciplina, nivel_ensino, tipo, preco_base, author_name, status")
        .order("created_at", { ascending: false });
      return (data ?? []) as unknown as Produto[];
    },
  });

  const filtradas = useMemo(
    () => vendas.filter((v) => nivel === "todos" || v.mk_products?.nivel_ensino === nivel),
    [vendas, nivel],
  );
  const confirmadas = filtradas.filter((v) => v.status_pagamento === "confirmado");
  const receita = confirmadas.reduce((s, v) => s + Number(v.valor_com_iva), 0);
  const iva = confirmadas.reduce((s, v) => s + Number(v.valor_iva), 0);
  const comissao = confirmadas.reduce((s, v) => s + Number(v.comissao_plataforma), 0);

  const porMes = useMemo(() => {
    const m = new Map<string, { mes: string; receita: number; comissao: number; iva: number }>();
    for (const v of confirmadas) {
      const d = new Date(v.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const cur = m.get(key) ?? { mes: key, receita: 0, comissao: 0, iva: 0 };
      cur.receita += Number(v.valor_com_iva);
      cur.comissao += Number(v.comissao_plataforma);
      cur.iva += Number(v.valor_iva);
      m.set(key, cur);
    }
    return [...m.values()].sort((a, b) => a.mes.localeCompare(b.mes));
  }, [confirmadas]);

  const ranking = useMemo(() => {
    const m = new Map<string, { nome: string; vendas: number; total: number }>();
    for (const v of confirmadas) {
      const p = produtos.find((x) => x.titulo === v.mk_products?.titulo);
      const nome = p?.author_name ?? "Autor";
      const cur = m.get(nome) ?? { nome, vendas: 0, total: 0 };
      cur.vendas += 1;
      cur.total += Number(v.valor_liquido_autor);
      m.set(nome, cur);
    }
    return [...m.values()].sort((a, b) => b.total - a.total).slice(0, 10);
  }, [confirmadas, produtos]);

  const pendentes = produtos.filter((p) => p.status === "pendente");

  async function decidir(id: string, aprovar: boolean) {
    setBusy(id);
    try {
      await moderar({ data: { productId: id, aprovar, motivo: aprovar ? undefined : "Fora das categorias educacionais." } });
      toast.success(aprovar ? "Material aprovado." : "Material rejeitado.");
      qc.invalidateQueries({ queryKey: ["mk-admin-produtos"] });
    } catch {
      toast.error("Não foi possível concluir a moderação.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl p-4 md:p-8">
      <h1 className="font-display text-2xl font-bold md:text-3xl">Marketplace — Administração</h1>
      <p className="mt-1 text-sm text-muted-foreground">Receita, impostos, comissões e moderação de materiais.</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {[{ value: "todos", label: "Todos os níveis" }, ...NIVEIS].map((n) => (
          <Button key={n.value} size="sm" variant={nivel === n.value ? "default" : "outline"} onClick={() => setNivel(n.value)}>
            {n.label}
          </Button>
        ))}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4"><p className="text-xs text-muted-foreground">Receita total</p><p className="mt-1 text-xl font-bold">{money(receita)}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">IVA cobrado</p><p className="mt-1 text-xl font-bold">{money(iva)}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Comissão (10%)</p><p className="mt-1 text-xl font-bold text-primary">{money(comissao)}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Vendas confirmadas</p><p className="mt-1 text-xl font-bold">{confirmadas.length}</p></Card>
      </div>

      <Card className="mt-4 p-4">
        <p className="mb-3 text-sm font-semibold">Vendas por mês</p>
        <div className="h-56 w-full">
          {isLoading ? (
            <div className="grid h-full place-items-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={porMes}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="mes" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip formatter={(v: number) => money(Number(v))} />
                <Bar dataKey="receita" name="Receita" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="comissao" name="Comissão" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      <Tabs defaultValue="moderacao" className="mt-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="moderacao">Aprovações</TabsTrigger>
          <TabsTrigger value="vendas">Pagamentos</TabsTrigger>
          <TabsTrigger value="autores">Autores</TabsTrigger>
          <TabsTrigger value="fiscal">Fiscal</TabsTrigger>
        </TabsList>

        <TabsContent value="moderacao">
          {pendentes.length === 0 ? (
            <Card className="p-6 text-center text-sm text-muted-foreground">Nenhum material à espera de aprovação.</Card>
          ) : (
            <div className="space-y-3">
              {pendentes.map((p) => (
                <Card key={p.id} className="p-4">
                  <p className="font-semibold">{p.titulo}</p>
                  <p className="text-xs text-muted-foreground">{p.author_name} · {p.disciplina} · {nivelLabel(p.nivel_ensino)} · {tipoLabel(p.tipo)}</p>
                  {p.descricao && <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{p.descricao}</p>}
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" onClick={() => decidir(p.id, true)} disabled={busy === p.id}>
                      {busy === p.id ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Check className="mr-1 h-4 w-4" />} Aprovar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => decidir(p.id, false)} disabled={busy === p.id}>
                      <X className="mr-1 h-4 w-4" /> Rejeitar
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="vendas">
          <div className="space-y-3">
            {filtradas.map((v) => (
              <Card key={v.id} className="flex items-start justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{v.mk_products?.titulo ?? "Material"}</p>
                  <p className="text-xs text-muted-foreground">{v.buyer_name} · {new Date(v.created_at).toLocaleDateString("pt-MZ")}</p>
                  <p className="mt-1 text-sm">{money(v.valor_com_iva)} <span className="text-xs text-muted-foreground">(IVA {money(v.valor_iva)} · comissão {money(v.comissao_plataforma)})</span></p>
                </div>
                <MkStatus status={v.status_pagamento} />
              </Card>
            ))}
            {filtradas.length === 0 && <Card className="p-6 text-center text-sm text-muted-foreground">Sem vendas para este filtro.</Card>}
          </div>
        </TabsContent>

        <TabsContent value="autores">
          {ranking.length === 0 ? (
            <Card className="p-6 text-center text-sm text-muted-foreground">Ainda não há autores com vendas.</Card>
          ) : (
            <div className="space-y-2">
              {ranking.map((a, i) => (
                <Card key={a.nome} className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-muted text-sm font-bold">{i + 1}</span>
                    <div>
                      <p className="font-medium">{a.nome}</p>
                      <p className="text-xs text-muted-foreground">{a.vendas} venda(s)</p>
                    </div>
                  </div>
                  <p className="font-semibold">{money(a.total)}</p>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="fiscal">
          <Card className="p-4">
            <p className="text-sm font-semibold">Relatório de IVA por mês</p>
            <div className="mt-3 space-y-2">
              {porMes.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem dados.</p>
              ) : porMes.map((m) => (
                <div key={m.mes} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                  <span>{m.mes}</span>
                  <span className="text-muted-foreground">Receita {money(m.receita)}</span>
                  <span className="font-semibold">IVA {money(m.iva)}</span>
                </div>
              ))}
            </div>
            <Button
              className="mt-4"
              variant="outline"
              onClick={() => {
                const linhas = ["mes,receita,iva,comissao", ...porMes.map((m) => `${m.mes},${m.receita.toFixed(2)},${m.iva.toFixed(2)},${m.comissao.toFixed(2)}`)];
                const blob = new Blob([linhas.join("\n")], { type: "text/csv;charset=utf-8" });
                const a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                a.download = "relatorio-iva.csv";
                a.click();
                URL.revokeObjectURL(a.href);
              }}
            >
              Exportar relatório (CSV)
            </Button>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
