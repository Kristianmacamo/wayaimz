import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check, CreditCard, ImageIcon, Loader2, MessageCircle, Package, Send, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { linhas, messengerUrl, mt, useCoverUrls, useShopSettings, whatsappUrl, type ShopProduct } from "@/lib/shop";
import { abrirPagamento } from "@/components/ShopProductCard";

export const Route = createFileRoute("/_app/marketplace/$id")({
  component: ProdutoPage,
  head: () => ({
    meta: [
      { title: "Produto | Marketplace Way Estudantes AI" },
      { name: "description", content: "Detalhes, benefícios e preço em Meticais deste produto digital para estudantes." },
      { property: "og:title", content: "Produto | Marketplace Way Estudantes AI" },
      { property: "og:description", content: "Produto digital do Marketplace Way Estudantes AI." },
      { property: "og:type", content: "product" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function ProdutoPage() {
  const { id } = Route.useParams();
  const { data: settings } = useShopSettings();
  const { data: p, isLoading } = useQuery({
    queryKey: ["shop-product", id],
    queryFn: async () => {
      const { data } = await supabase.from("shop_products").select("*").eq("id", id).maybeSingle();
      return data as ShopProduct | null;
    },
  });
  const { data: covers = {} } = useCoverUrls([p?.capa_url ?? null]);
  const wa = settings?.whatsapp ?? "";
  const ms = settings?.messenger ?? "";

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!p) return (
    <div className="p-8 text-center">
      <p className="mb-4 text-muted-foreground">Produto não encontrado ou indisponível.</p>
      <Button asChild variant="outline"><Link to="/marketplace">Voltar ao Marketplace</Link></Button>
    </div>
  );

  const cover = p.capa_url ? covers[p.capa_url] : undefined;
  async function pagar() {
    if (!p) return;
    const ok = await abrirPagamento(p.id, wa, p);
    if (!ok) toast.error("Pagamento ainda não disponível para este produto.");
  }

  return (
    <div className="mx-auto w-full max-w-5xl p-4 pb-24 md:p-8">
      <Link to="/marketplace" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"><ArrowLeft className="h-4 w-4" />Marketplace</Link>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="overflow-hidden rounded-3xl bg-gradient-hero shadow-elegant">
          {cover ? <img src={cover} alt={p.nome} className="aspect-[4/3] h-full w-full object-cover" /> : <div className="grid aspect-[4/3] place-items-center text-primary-foreground/80"><ImageIcon className="h-14 w-14" /></div>}
        </div>
        <div>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{p.categoria}</span>
          <h1 className="mt-3 font-display text-2xl font-bold md:text-3xl">{p.nome}</h1>
          <p className="mt-3 text-3xl font-bold text-primary">{mt(p.preco)}</p>
          <div className="mt-5 grid gap-2">
            <Button size="lg" className="h-12 text-base" onClick={pagar}><ShoppingCart className="mr-2 h-5 w-5" />Comprar agora</Button>
            <Button size="lg" variant="outline" className="h-12 text-base" onClick={pagar}><CreditCard className="mr-2 h-5 w-5" />Pagar agora</Button>
            {wa && <Button asChild size="lg" variant="secondary" className="h-12 text-base"><a href={whatsappUrl(wa, p)} target="_blank" rel="noopener noreferrer"><MessageCircle className="mr-2 h-5 w-5" />Comprar pelo WhatsApp</a></Button>}
            {ms && <Button asChild size="lg" variant="secondary" className="h-12 text-base"><a href={messengerUrl(ms, p)} target="_blank" rel="noopener noreferrer"><Send className="mr-2 h-5 w-5" />Falar pelo Messenger</a></Button>}
          </div>
        </div>
      </div>

      <div className="mt-8 space-y-6">
        {p.descricao && <section className="rounded-2xl border bg-card p-5"><h2 className="mb-2 font-bold">Descrição</h2><p className="whitespace-pre-line text-sm text-muted-foreground">{p.descricao}</p></section>}
        {linhas(p.beneficios).length > 0 && (
          <section className="rounded-2xl border bg-card p-5"><h2 className="mb-3 font-bold">Benefícios</h2>
            <ul className="space-y-2">{linhas(p.beneficios).map((b) => <li key={b} className="flex gap-2 text-sm"><Check className="mt-0.5 h-4 w-4 shrink-0 text-secondary" />{b}</li>)}</ul>
          </section>
        )}
        {linhas(p.o_que_recebe).length > 0 && (
          <section className="rounded-2xl border bg-card p-5"><h2 className="mb-3 font-bold">O que vai receber</h2>
            <ul className="space-y-2">{linhas(p.o_que_recebe).map((b) => <li key={b} className="flex gap-2 text-sm"><Package className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{b}</li>)}</ul>
          </section>
        )}
      </div>
    </div>
  );
}
