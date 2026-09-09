import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { money, nivelLabel, tipoLabel } from "@/lib/marketplace";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MkStatus } from "@/components/MkStatus";
import { Download, Loader2, Receipt, ShoppingBag } from "lucide-react";

export const Route = createFileRoute("/_app/meus-materiais")({
  component: MeusMateriaisPage,
  head: () => ({
    meta: [
      { title: "Os meus materiais | Way Estudantes AI" },
      { name: "description", content: "Aceda aos ebooks, módulos e testes que comprou e veja o histórico de compras e recibos." },
      { property: "og:title", content: "Os meus materiais | Way Estudantes AI" },
      { property: "og:description", content: "Downloads e recibos das suas compras de materiais de estudo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

type Compra = {
  id: string;
  preco_base: number;
  valor_iva: number;
  valor_com_iva: number;
  status_pagamento: string;
  referencia_mpesa: string | null;
  mpesa_transaction_id: string | null;
  created_at: string;
  erro_mensagem: string | null;
  mk_products: { titulo: string; tipo: string; nivel_ensino: string; disciplina: string; ficheiro_url: string | null } | null;
};

function MeusMateriaisPage() {
  const { data: compras = [], isLoading } = useQuery({
    queryKey: ["mk-compras"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [];
      const { data } = await supabase
        .from("mk_sales")
        .select("id, preco_base, valor_iva, valor_com_iva, status_pagamento, referencia_mpesa, mpesa_transaction_id, created_at, erro_mensagem, mk_products(titulo, tipo, nivel_ensino, disciplina, ficheiro_url)")
        .eq("buyer_id", u.user.id)
        .order("created_at", { ascending: false });
      return (data ?? []) as unknown as Compra[];
    },
    refetchInterval: 15000,
  });

  const pagos = compras.filter((c) => c.status_pagamento === "confirmado");

  return (
    <div className="mx-auto w-full max-w-5xl p-4 md:p-8">
      <header className="mb-6">
        <h1 className="font-display text-2xl font-bold md:text-3xl">Os meus materiais</h1>
        <p className="text-sm text-muted-foreground">Downloads dos materiais comprados e histórico de compras.</p>
      </header>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : compras.length === 0 ? (
        <Card className="p-10 text-center">
          <ShoppingBag className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="mb-4 text-sm text-muted-foreground">Ainda não comprou nenhum material.</p>
          <Button asChild><Link to="/loja">Ver a loja</Link></Button>
        </Card>
      ) : (
        <div className="space-y-6">
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Prontos para descarregar ({pagos.length})</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {pagos.map((c) => (
                <Card key={c.id} className="p-4">
                  <p className="mb-1 text-sm font-semibold">{c.mk_products?.titulo}</p>
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    <Badge variant="secondary">{c.mk_products?.disciplina}</Badge>
                    <Badge variant="outline">{nivelLabel(c.mk_products?.nivel_ensino ?? "")}</Badge>
                    <Badge variant="outline">{tipoLabel(c.mk_products?.tipo ?? "")}</Badge>
                  </div>
                  {c.mk_products?.ficheiro_url ? (
                    <Button asChild size="sm" className="w-full">
                      <a href={c.mk_products.ficheiro_url} target="_blank" rel="noreferrer"><Download className="mr-2 h-4 w-4" /> Descarregar</a>
                    </Button>
                  ) : (
                    <Button size="sm" variant="secondary" className="w-full" disabled>Ficheiro em preparação</Button>
                  )}
                  {c.erro_mensagem && <p className="mt-2 text-[11px] text-amber-700">{c.erro_mensagem}</p>}
                </Card>
              ))}
              {pagos.length === 0 && <p className="text-sm text-muted-foreground">Nenhum pagamento confirmado ainda.</p>}
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Histórico e recibos</h2>
            <Card className="divide-y">
              {compras.map((c) => (
                <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{c.mk_products?.titulo}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(c.created_at).toLocaleDateString("pt-MZ")} · Ref. {c.referencia_mpesa ?? "—"}
                      {c.mpesa_transaction_id ? ` · ${c.mpesa_transaction_id}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">Base {money(c.preco_base)} + IVA {money(c.valor_iva)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-sm font-semibold"><Receipt className="h-4 w-4 text-muted-foreground" />{money(c.valor_com_iva)}</span>
                    <MkStatus status={c.status_pagamento} />
                  </div>
                </div>
              ))}
            </Card>
          </section>
        </div>
      )}
    </div>
  );
}
