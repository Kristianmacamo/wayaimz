import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { publishMaterial, requestAuthorPayout } from "@/lib/marketplace.functions";
import { DISCIPLINAS, NIVEIS, TIPOS, calcularVenda, money, nivelLabel, tipoLabel } from "@/lib/marketplace";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MkStatus } from "@/components/MkStatus";
import { Loader2, Upload, Wallet, Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/autor")({
  component: AutorPage,
  head: () => ({
    meta: [
      { title: "Área do Autor | Way Estudantes AI" },
      { name: "description", content: "Publique ebooks, módulos de exame e testes, acompanhe vendas, receita líquida e peça levantamentos por M-Pesa." },
      { property: "og:title", content: "Área do Autor | Way Estudantes AI" },
      { property: "og:description", content: "Publique materiais educacionais e acompanhe as suas vendas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

type Produto = {
  id: string;
  titulo: string;
  disciplina: string;
  nivel_ensino: string;
  tipo: string;
  preco_base: number;
  status: string;
  rejeicao_motivo: string | null;
  created_at: string;
};

type Venda = {
  id: string;
  buyer_name: string;
  preco_base: number;
  valor_iva: number;
  valor_com_iva: number;
  comissao_plataforma: number;
  valor_liquido_autor: number;
  status_pagamento: string;
  created_at: string;
  mk_products: { titulo: string } | null;
};

type Payout = { id: string; amount_mt: number; status: string; numero_telefone: string | null; created_at: string };

function AutorPage() {
  const qc = useQueryClient();
  const publicar = useServerFn(publishMaterial);
  const levantar = useServerFn(requestAuthorPayout);

  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [disciplina, setDisciplina] = useState<string>(DISCIPLINAS[0]);
  const [nivel, setNivel] = useState<string>("secundario");
  const [tipo, setTipo] = useState<string>("ebook");
  const [preco, setPreco] = useState("150");
  const [paginas, setPaginas] = useState("0");
  const [ficheiro, setFicheiro] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const [valor, setValor] = useState("");
  const [telefone, setTelefone] = useState("");
  const [busyPayout, setBusyPayout] = useState(false);

  const { data: userId } = useQuery({
    queryKey: ["me-id"],
    queryFn: async () => (await supabase.auth.getUser()).data.user?.id ?? null,
  });

  const { data: produtos = [], isLoading: loadProd } = useQuery({
    queryKey: ["mk-meus-produtos", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("mk_products")
        .select("id, titulo, disciplina, nivel_ensino, tipo, preco_base, status, rejeicao_motivo, created_at")
        .eq("author_id", userId!)
        .order("created_at", { ascending: false });
      return (data ?? []) as unknown as Produto[];
    },
  });

  const { data: vendas = [] } = useQuery({
    queryKey: ["mk-minhas-vendas", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("mk_sales")
        .select("id, buyer_name, preco_base, valor_iva, valor_com_iva, comissao_plataforma, valor_liquido_autor, status_pagamento, created_at, mk_products(titulo)")
        .eq("author_id", userId!)
        .order("created_at", { ascending: false });
      return (data ?? []) as unknown as Venda[];
    },
  });

  const { data: payouts = [] } = useQuery({
    queryKey: ["mk-payouts", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("mk_payouts")
        .select("id, amount_mt, status, numero_telefone, created_at")
        .eq("author_id", userId!)
        .order("created_at", { ascending: false });
      return (data ?? []) as unknown as Payout[];
    },
  });

  const ganho = useMemo(
    () => vendas.filter((v) => v.status_pagamento === "confirmado").reduce((s, v) => s + Number(v.valor_liquido_autor), 0),
    [vendas],
  );
  const levantado = useMemo(
    () => payouts.filter((p) => p.status !== "rejeitado").reduce((s, p) => s + Number(p.amount_mt), 0),
    [payouts],
  );
  const saldo = Math.round((ganho - levantado) * 100) / 100;
  const b = calcularVenda(Number(preco) || 0);

  async function submeter() {
    if (titulo.trim().length < 5) return toast.error("O título deve ter pelo menos 5 caracteres.");
    setBusy(true);
    try {
      let url: string | null = null;
      if (ficheiro) {
        const path = `${userId}/mk/${Date.now()}-${ficheiro.name.replace(/[^\w.-]/g, "_")}`;
        const { error } = await supabase.storage.from("uploads").upload(path, ficheiro);
        if (error) throw new Error("Não foi possível carregar o ficheiro.");
        url = path;
      }
      const r = await publicar({
        data: {
          titulo: titulo.trim(),
          descricao: descricao.trim(),
          disciplina,
          nivel_ensino: nivel as "secundario" | "universidade" | "instituto",
          tipo: tipo as "ebook" | "modulo_exame" | "teste",
          preco_base: Number(preco) || 0,
          paginas: Number(paginas) || 0,
          ficheiro_url: url,
        },
      });
      if (!r.ok) toast.error(r.message);
      else {
        toast.success(r.message);
        setTitulo(""); setDescricao(""); setFicheiro(null);
        qc.invalidateQueries({ queryKey: ["mk-meus-produtos"] });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao publicar.");
    } finally {
      setBusy(false);
    }
  }

  async function pedirLevantamento() {
    const amount = Number(valor) || 0;
    if (amount < 50) return toast.error("O valor mínimo de levantamento é 50 MT.");
    if (telefone.replace(/\D/g, "").length < 9) return toast.error("Indique um número M-Pesa válido.");
    setBusyPayout(true);
    try {
      const r = await levantar({ data: { amount, phone: telefone } });
      if (!r.ok) toast.error(r.message);
      else {
        toast.success(r.message);
        setValor("");
        qc.invalidateQueries({ queryKey: ["mk-payouts"] });
      }
    } catch {
      toast.error("Não foi possível registar o pedido.");
    } finally {
      setBusyPayout(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl p-4 md:p-8">
      <h1 className="font-display text-2xl font-bold md:text-3xl">Área do Autor</h1>
      <p className="mt-1 text-sm text-muted-foreground">Publique materiais educacionais e acompanhe vendas e levantamentos.</p>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Receita líquida</p>
          <p className="mt-1 text-xl font-bold">{money(ganho)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Já levantado</p>
          <p className="mt-1 text-xl font-bold">{money(levantado)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Saldo disponível</p>
          <p className="mt-1 text-xl font-bold text-primary">{money(saldo)}</p>
        </Card>
      </div>

      <Tabs defaultValue="publicar" className="mt-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="publicar">Publicar</TabsTrigger>
          <TabsTrigger value="produtos">Materiais</TabsTrigger>
          <TabsTrigger value="vendas">Vendas</TabsTrigger>
          <TabsTrigger value="saldo">Saldo</TabsTrigger>
        </TabsList>

        <TabsContent value="publicar">
          <Card className="space-y-4 p-4">
            <div>
              <Label htmlFor="titulo">Título</Label>
              <Input id="titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: Módulo de Exame de Matemática — 12.ª classe" />
            </div>
            <div>
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea id="descricao" rows={3} value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="O que o estudante vai aprender…" />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <Label htmlFor="disciplina">Disciplina</Label>
                <select id="disciplina" className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm" value={disciplina} onChange={(e) => setDisciplina(e.target.value)}>
                  {DISCIPLINAS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <Label htmlFor="nivel">Nível de ensino</Label>
                <select id="nivel" className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm" value={nivel} onChange={(e) => setNivel(e.target.value)}>
                  {NIVEIS.map((n) => <option key={n.value} value={n.value}>{n.label}</option>)}
                </select>
              </div>
              <div>
                <Label htmlFor="tipo">Tipo</Label>
                <select id="tipo" className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm" value={tipo} onChange={(e) => setTipo(e.target.value)}>
                  {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="preco">Preço base (MT)</Label>
                <Input id="preco" inputMode="numeric" value={preco} onChange={(e) => setPreco(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="paginas">Número de páginas</Label>
                <Input id="paginas" inputMode="numeric" value={paginas} onChange={(e) => setPaginas(e.target.value)} />
              </div>
            </div>
            <div>
              <Label htmlFor="ficheiro">Ficheiro do material (PDF, Word…)</Label>
              <Input id="ficheiro" type="file" onChange={(e) => setFicheiro(e.target.files?.[0] ?? null)} />
            </div>

            <div className="rounded-lg border bg-muted/40 p-3 text-sm">
              <p className="font-semibold">Como fica o preço para o estudante</p>
              <div className="mt-2 space-y-1 text-muted-foreground">
                <p className="flex justify-between"><span>Preço base</span><span>{money(b.precoBase)}</span></p>
                <p className="flex justify-between"><span>IVA 16%</span><span>{money(b.valorIva)}</span></p>
                <p className="flex justify-between font-medium text-foreground"><span>Total pago</span><span>{money(b.valorComIva)}</span></p>
                <p className="flex justify-between"><span>Comissão da plataforma (10%)</span><span>-{money(b.comissaoPlataforma)}</span></p>
                <p className="flex justify-between font-semibold text-primary"><span>Recebe</span><span>{money(b.valorLiquidoAutor)}</span></p>
              </div>
            </div>

            <Button onClick={submeter} disabled={busy} className="w-full">
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Publicar material
            </Button>
            <p className="text-xs text-muted-foreground">Só é aceite conteúdo educacional. O material fica visível na loja depois de aprovado.</p>
          </Card>
        </TabsContent>

        <TabsContent value="produtos">
          {loadProd ? (
            <div className="grid place-items-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : produtos.length === 0 ? (
            <Card className="p-6 text-center text-sm text-muted-foreground">Ainda não publicou materiais.</Card>
          ) : (
            <div className="space-y-3">
              {produtos.map((p) => (
                <Card key={p.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{p.titulo}</p>
                      <p className="text-xs text-muted-foreground">{p.disciplina} · {nivelLabel(p.nivel_ensino)} · {tipoLabel(p.tipo)}</p>
                      <p className="mt-1 text-sm font-medium">{money(calcularVenda(Number(p.preco_base)).valorComIva)} <span className="text-xs text-muted-foreground">com IVA</span></p>
                      {p.rejeicao_motivo && <p className="mt-1 text-xs text-destructive">{p.rejeicao_motivo}</p>}
                    </div>
                    <MkStatus status={p.status} />
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="vendas">
          {vendas.length === 0 ? (
            <Card className="p-6 text-center text-sm text-muted-foreground">Ainda não há vendas.</Card>
          ) : (
            <div className="space-y-3">
              {vendas.map((v) => (
                <Card key={v.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{v.mk_products?.titulo ?? "Material"}</p>
                      <p className="text-xs text-muted-foreground">{v.buyer_name} · {new Date(v.created_at).toLocaleDateString("pt-MZ")}</p>
                    </div>
                    <MkStatus status={v.status_pagamento} />
                  </div>
                  <div className="mt-3 space-y-1 border-t pt-3 text-sm text-muted-foreground">
                    <p className="flex justify-between"><span>Preço base</span><span>{money(v.preco_base)}</span></p>
                    <p className="flex justify-between"><span>IVA 16%</span><span>{money(v.valor_iva)}</span></p>
                    <p className="flex justify-between"><span>Total pago</span><span>{money(v.valor_com_iva)}</span></p>
                    <p className="flex justify-between"><span>Comissão (10%)</span><span>-{money(v.comissao_plataforma)}</span></p>
                    <p className="flex justify-between font-semibold text-primary"><span>Recebeu</span><span>{money(v.valor_liquido_autor)}</span></p>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="saldo">
          <Card className="space-y-4 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold"><Wallet className="h-4 w-4" /> Solicitar levantamento</div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="valor">Valor (MT)</Label>
                <Input id="valor" inputMode="numeric" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="Mínimo 50" />
              </div>
              <div>
                <Label htmlFor="tel">Número M-Pesa</Label>
                <Input id="tel" inputMode="tel" value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="84 123 4567" />
              </div>
            </div>
            <Button onClick={pedirLevantamento} disabled={busyPayout} className="w-full">
              {busyPayout ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              Pedir {valor ? money(Number(valor) || 0) : "levantamento"}
            </Button>
            <p className="text-xs text-muted-foreground">Saldo disponível: <span className="font-semibold text-foreground">{money(saldo)}</span></p>

            <div className="border-t pt-3">
              <p className="mb-2 text-sm font-semibold">Histórico de levantamentos</p>
              {payouts.length === 0 ? (
                <p className="text-sm text-muted-foreground">Ainda não pediu levantamentos.</p>
              ) : (
                <div className="space-y-2">
                  {payouts.map((p) => (
                    <div key={p.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                      <div>
                        <p className="font-medium">{money(p.amount_mt)}</p>
                        <p className="text-xs text-muted-foreground">{p.numero_telefone} · {new Date(p.created_at).toLocaleDateString("pt-MZ")}</p>
                      </div>
                      <MkStatus status={p.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
