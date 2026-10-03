import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const SHOP_CATEGORIAS = [
  "Cursos",
  "Ebooks",
  "PDFs",
  "Videoaulas",
  "Planos Premium",
  "Materiais escolares",
  "Ferramentas digitais",
  "Outros",
] as const;

export type ShopProduct = {
  id: string;
  nome: string;
  descricao_curta: string;
  descricao: string;
  beneficios: string;
  o_que_recebe: string;
  preco: number;
  categoria: string;
  capa_url: string | null;
  destaque: boolean;
  vendas: number;
  activo: boolean;
  created_at: string;
};

export const shopProductSchema = z.object({
  nome: z.string().trim().min(3, "Nome muito curto").max(140),
  descricao_curta: z.string().trim().max(200),
  descricao: z.string().trim().max(5000),
  beneficios: z.string().trim().max(3000),
  o_que_recebe: z.string().trim().max(3000),
  preco: z.number().min(0).max(1_000_000),
  categoria: z.enum(SHOP_CATEGORIAS),
  destaque: z.boolean(),
  activo: z.boolean(),
  link: z.union([z.literal(""), z.string().trim().url("Link de pagamento inválido").max(500)]),
});

export const shopSettingsSchema = z.object({
  whatsapp: z.string().trim().regex(/^\d{9,15}$/, "Use só dígitos, ex.: 258844772002").or(z.literal("")),
  messenger: z.union([z.literal(""), z.string().trim().url("Link inválido").max(300)]),
});

export function mt(v: number) {
  return `${Number(v ?? 0).toLocaleString("pt-MZ", { maximumFractionDigits: 2 })} MT`;
}

export function linhas(t: string) {
  return t.split("\n").map((l) => l.replace(/^[-•*]\s*/, "").trim()).filter(Boolean);
}

export function whatsappUrl(numero: string, p: Pick<ShopProduct, "nome" | "preco">) {
  const msg = `Olá! Quero comprar o produto ${p.nome}, no valor de ${mt(p.preco)}. Como posso fazer o pagamento?`;
  return `https://wa.me/${numero}?text=${encodeURIComponent(msg)}`;
}

export function messengerUrl(link: string, p: Pick<ShopProduct, "nome" | "preco">) {
  const msg = `Olá! Tenho interesse no produto ${p.nome} (${mt(p.preco)}).`;
  const sep = link.includes("?") ? "&" : "?";
  return `${link}${sep}text=${encodeURIComponent(msg)}`;
}

export function useShopSettings() {
  return useQuery({
    queryKey: ["shop-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("shop_settings").select("whatsapp, messenger").eq("id", 1).maybeSingle();
      return data ?? { whatsapp: "", messenger: "" };
    },
  });
}

/** Capas ficam num armazenamento privado: gera links temporários. */
export function useCoverUrls(paths: (string | null)[]) {
  const list = paths.filter((p): p is string => !!p);
  return useQuery({
    queryKey: ["shop-covers", list],
    enabled: list.length > 0,
    staleTime: 50 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase.storage.from("shop-covers").createSignedUrls(list, 3600);
      const map: Record<string, string> = {};
      (data ?? []).forEach((d) => { if (d.path && d.signedUrl) map[d.path] = d.signedUrl; });
      return map;
    },
  });
}
