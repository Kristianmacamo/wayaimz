import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Loader2, Search, Sparkles, Store } from "lucide-react";
import { toast } from "sonner";
import { SHOP_CATEGORIAS, useCoverUrls, useShopSettings, type ShopProduct } from "@/lib/shop";
import { ShopProductCard, abrirPagamento } from "@/components/ShopProductCard";

export const Route = createFileRoute("/_app/marketplace/")({
  component: MarketplacePage,
  head: () => ({
    meta: [
      { title: "Marketplace | Way Estudantes AI" },
      { name: "description", content: "Cursos, ebooks, PDFs e materiais de estudo digitais para estudantes de Moçambique, com preços em Meticais." },
      { property: "og:title", content: "Marketplace | Way Estudantes AI" },
      { property: "og:description", content: "Produtos digitais para estudantes moçambicanos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function MarketplacePage() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("Todos");
  const { data: settings } = useShopSettings();
  const { data: produtos = [], isLoading } = useQuery({
    queryKey: ["shop-products"],
    queryFn: async () => {
      const { data } = await supabase.from("shop_products").select("*").eq("activo", true).order("created_at", { ascending: false });
      return (data ?? []) as ShopProduct[];
    },
  });
  const { data: covers = {} } = useCoverUrls(produtos.map((p) => p.capa_url));
  const wa = settings?.whatsapp ?? "";
  const ms = settings?.messenger ?? "";

  const filtrados = useMemo(() => produtos.filter((p) =>
    (cat === "Todos" || p.categoria === cat) &&
    (!q.trim() || `${p.nome} ${p.descricao_curta} ${p.categoria}`.toLowerCase().includes(q.toLowerCase()))
  ), [produtos, cat, q]);

  const aFiltrar = q.trim() !== "" || cat !== "Todos";
  const destaque = produtos.filter((p) => p.destaque);
  const recentes = produtos.slice(0, 6);
  const maisVendidos = [...produtos].filter((p) => p.vendas > 0).sort((a, b) => b.vendas - a.vendas).slice(0, 6);

  async function comprar(p: ShopProduct) {
    const ok = await abrirPagamento(p.id, wa, p);
    if (!ok) toast.error("Pagamento ainda não disponível para este produto.");
  }

  const grid = (list: ShopProduct[]) => (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {list.map((p) => <ShopProductCard key={p.id} p={p} cover={p.capa_url ? covers[p.capa_url] : undefined} whatsapp={wa} messenger={ms} onBuy={comprar} />)}
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-6xl p-4 pb-24 md:p-8">
      <section className="mb-6 overflow-hidden rounded-3xl bg-gradient-hero p-6 text-primary-foreground shadow-elegant md:p-10">
        <p className="mb-2 inline-flex items-center gap-1 rounded-full bg-background/20 px-3 py-1 text-xs font-semibold"><Store className="h-3.5 w-3.5" /> Marketplace</p>
        <h1 className="font-display text-2xl font-bold md:text-4xl">Tudo para estudar melhor</h1>
        <p className="mt-2 max-w-xl text-sm opacity-90 md:text-base">Cursos, ebooks, PDFs e ferramentas digitais. Pague em Meticais ou compre pelo WhatsApp.</p>
        <div className="relative mt-5 max-w-xl">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input className="h-12 bg-background pl-10 text-base text-foreground" placeholder="Procurar produtos…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </section>

      <div className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1">
        {["Todos", ...SHOP_CATEGORIAS].map((c) => (
          <button key={c} onClick={() => setCat(c)} className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition ${cat === c ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-primary"}`}>{c}</button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : produtos.length === 0 ? (
        <div className="rounded-2xl border bg-card p-10 text-center text-sm text-muted-foreground">Ainda não há produtos. Volte em breve!</div>
      ) : aFiltrar ? (
        filtrados.length ? grid(filtrados) : <div className="rounded-2xl border bg-card p-10 text-center text-sm text-muted-foreground">Nenhum produto encontrado.</div>
      ) : (
        <div className="space-y-10">
          {destaque.length > 0 && (<section><h2 className="mb-3 flex items-center gap-2 text-lg font-bold"><Sparkles className="h-5 w-5 text-secondary" />Em destaque</h2>{grid(destaque)}</section>)}
          <section><h2 className="mb-3 text-lg font-bold">Mais recentes</h2>{grid(recentes)}</section>
          {maisVendidos.length > 0 && (<section><h2 className="mb-3 text-lg font-bold">Mais vendidos</h2>{grid(maisVendidos)}</section>)}
        </div>
      )}
    </div>
  );
}
