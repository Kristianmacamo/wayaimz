import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { buyMaterial } from "@/lib/marketplace.functions";
import { calcularVenda, money, NIVEIS, TIPOS, nivelLabel, tipoLabel } from "@/lib/marketplace";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MkStatus } from "@/components/MkStatus";
import { BookOpen, FileText, GraduationCap, Loader2, Search, Smartphone } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/loja")({
  component: LojaPage,
  head: () => ({
    meta: [
      { title: "Loja de Materiais de Estudo | Way Estudantes AI" },
      { name: "description", content: "Compre ebooks, módulos de exame e testes para o ensino secundário, universitário e institutos técnicos em Moçambique." },
      { property: "og:title", content: "Loja de Materiais de Estudo | Way Estudantes AI" },
      { property: "og:description", content: "Materiais educacionais digitais com pagamento M-Pesa." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

type Produto = {
  id: string;
  titulo: string;
  descricao: string;
  disciplina: string;
  nivel_ensino: string;
  tipo: string;
  preco_base: number;
  paginas: number;
  author_name: string;
  ficheiro_url: string | null;
};

const TIPO_ICON: Record<string, typeof BookOpen> = { ebook: BookOpen, modulo_exame: GraduationCap, teste: FileText };

function LojaPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [nivel, setNivel] = useState<string>("todos");
  const [tipo, setTipo] = useState<string>("todos");
  const [disciplina, setDisciplina] = useState<string>("todas");
  const [aberto, setAberto] = useState<Produto | null>(null);
  const [telefone, setTelefone] = useState("");
  const [busy, setBusy] = useState(false);
  const comprar = useServerFn(buyMaterial);

  const { data: produtos = [], isLoading } = useQuery({
    queryKey: ["mk-loja"],
    queryFn: async () => {
      const { data } = await supabase
        .from("mk_products")
        .select("id, titulo, descricao, disciplina, nivel_ensino, tipo, preco_base, paginas, author_name, ficheiro_url")
        .eq("status", "aprovado")
        .order("created_at", { ascending: false });
      return (data ?? []) as Produto[];
    },
  });

  const disciplinas = useMemo(() => Array.from(new Set(produtos.map((p) => p.disciplina))).sort(), [produtos]);

  const lista = produtos.filter(
    (p) =>
      (nivel === "todos" || p.nivel_ensino === nivel) &&
      (tipo === "todos" || p.tipo === tipo) &&
      (disciplina === "todas" || p.disciplina === disciplina) &&
      (q.trim() === "" || `${p.titulo} ${p.disciplina} ${p.author_name}`.toLowerCase().includes(q.toLowerCase()))
  );

  async function pagar() {
    if (!aberto) return;
    setBusy(true);
    try {
      const res = await comprar({ data: { productId: aberto.id, phone: telefone } });
      if (res.ok) toast.success(res.message);
      else toast.error(res.message);
      if (res.saleId) {
        setAberto(null);
        setTelefone("");
        qc.invalidateQueries({ queryKey: ["mk-compras"] });
      }
    } catch {
      toast.error("Não foi possível contactar o M-Pesa. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  const b = aberto ? calcularVenda(Number(aberto.preco_base)) : null;

  return (
    <div className="mx-auto w-full max-w-6xl p-4 md:p-8">
      <header className="mb-6">
        <h1 className="font-display text-2xl font-bold md:text-3xl">Loja de Materiais</h1>
        <p className="text-sm text-muted-foreground">Ebooks, módulos de exame e testes publicados por professores moçambicanos.</p>
      </header>

      <Card className="mb-6 space-y-3 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Procurar por título, disciplina ou autor" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-2">
          <select className="h-9 rounded-md border bg-background px-2 text-sm" value={nivel} onChange={(e) => setNivel(e.target.value)}>
            <option value="todos">Todos os níveis</option>
            {NIVEIS.map((n) => <option key={n.value} value={n.value}>{n.label}</option>)}
          </select>
          <select className="h-9 rounded-md border bg-background px-2 text-sm" value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="todos">Todos os tipos</option>
            {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <select className="h-9 rounded-md border bg-background px-2 text-sm" value={disciplina} onChange={(e) => setDisciplina(e.target.value)}>
            <option value="todas">Todas as disciplinas</option>
            {disciplinas.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : lista.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">Nenhum material corresponde aos filtros escolhidos.</Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {lista.map((p) => {
            const Icon = TIPO_ICON[p.tipo] ?? BookOpen;
            const total = calcularVenda(Number(p.preco_base)).valorComIva;
            return (
              <Card key={p.id} className="flex flex-col p-4">
                <div className="mb-3 flex items-start gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><Icon className="h-5 w-5" /></div>
                  <div className="min-w-0">
                    <h2 className="line-clamp-2 text-sm font-semibold">{p.titulo}</h2>
                    <p className="text-xs text-muted-foreground">{p.author_name}</p>
                  </div>
                </div>
                <p className="mb-3 line-clamp-2 text-xs text-muted-foreground">{p.descricao}</p>
                <div className="mb-4 flex flex-wrap gap-1.5">
                  <Badge variant="secondary">{p.disciplina}</Badge>
                  <Badge variant="outline">{nivelLabel(p.nivel_ensino)}</Badge>
                  <Badge variant="outline">{tipoLabel(p.tipo)}</Badge>
                </div>
                <div className="mt-auto flex items-center justify-between">
                  <div>
                    <p className="text-lg font-bold text-primary">{money(total)}</p>
                    <p className="text-[11px] text-muted-foreground">IVA 16% incluído</p>
                  </div>
                  <Button size="sm" onClick={() => setAberto(p)}>Comprar</Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!aberto} onOpenChange={(o) => !o && setAberto(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Pagamento M-Pesa</DialogTitle></DialogHeader>
          {aberto && b && (
            <div className="space-y-4">
              <p className="text-sm font-medium">{aberto.titulo}</p>
              <div className="space-y-1 rounded-lg border bg-muted/40 p-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Preço base</span><span>{money(b.precoBase)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">IVA (16%)</span><span>{money(b.valorIva)}</span></div>
                <div className="flex justify-between border-t pt-1 font-semibold"><span>Total a pagar</span><span>{money(b.valorComIva)}</span></div>
                <div className="flex justify-between text-xs text-muted-foreground"><span>Comissão da plataforma (10%)</span><span>{money(b.comissaoPlataforma)}</span></div>
                <div className="flex justify-between text-xs text-muted-foreground"><span>Valor para o autor</span><span>{money(b.valorLiquidoAutor)}</span></div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Número M-Pesa (Vodacom)</label>
                <div className="relative">
                  <Smartphone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input className="pl-9" inputMode="tel" placeholder="84 123 4567" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
                </div>
                <p className="text-xs text-muted-foreground">Vai receber um pedido de confirmação no telemóvel. Introduza o seu PIN M-Pesa.</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground"><MkStatus status="pendente" /> o download é libertado só após confirmação</div>
              <Button className="w-full" disabled={busy || telefone.trim().length < 9} onClick={pagar}>
                {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> A aguardar confirmação…</> : `Pagar ${money(b.valorComIva)}`}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
