import { Link } from "@tanstack/react-router";
import { MessageCircle, Send, ShoppingCart, Eye, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { mt, messengerUrl, whatsappUrl, type ShopProduct } from "@/lib/shop";

export function ShopProductCard({
  p, cover, whatsapp, messenger, onBuy,
}: { p: ShopProduct; cover?: string; whatsapp: string; messenger: string; onBuy: (p: ShopProduct) => void }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border bg-card shadow-soft transition hover:shadow-elegant">
      <Link to="/marketplace/$id" params={{ id: p.id }} className="relative block aspect-[4/3] bg-gradient-hero">
        {cover ? (
          <img src={cover} alt={p.nome} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full place-items-center text-primary-foreground/80"><ImageIcon className="h-10 w-10" /></div>
        )}
        <span className="absolute left-2 top-2 rounded-full bg-background/90 px-2.5 py-1 text-[11px] font-semibold text-primary">{p.categoria}</span>
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 font-semibold leading-snug">{p.nome}</h3>
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{p.descricao_curta}</p>
        <p className="mt-3 text-xl font-bold text-primary">{mt(p.preco)}</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button asChild variant="outline" size="sm"><Link to="/marketplace/$id" params={{ id: p.id }}><Eye className="mr-1 h-4 w-4" />Ver produto</Link></Button>
          <Button size="sm" onClick={() => onBuy(p)}><ShoppingCart className="mr-1 h-4 w-4" />Comprar agora</Button>
          {whatsapp && (
            <Button asChild variant="secondary" size="sm"><a href={whatsappUrl(whatsapp, p)} target="_blank" rel="noopener noreferrer"><MessageCircle className="mr-1 h-4 w-4" />WhatsApp</a></Button>
          )}
          {messenger && (
            <Button asChild variant="secondary" size="sm"><a href={messengerUrl(messenger, p)} target="_blank" rel="noopener noreferrer"><Send className="mr-1 h-4 w-4" />Messenger</a></Button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Abre o link de pagamento do produto (lido no servidor, nunca exposto na lista). */
export async function abrirPagamento(id: string, whatsapp: string, p: ShopProduct) {
  const { supabase } = await import("@/integrations/supabase/client");
  const { data } = await supabase.rpc("get_shop_payment_link", { _product_id: id });
  if (data) { window.open(data, "_blank", "noopener"); return true; }
  if (whatsapp) { window.open(whatsappUrl(whatsapp, p), "_blank", "noopener"); return true; }
  return false;
}
