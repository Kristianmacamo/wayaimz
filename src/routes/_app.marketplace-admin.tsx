import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ImageIcon, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { SHOP_CATEGORIAS, mt, shopProductSchema, shopSettingsSchema, useCoverUrls, useShopSettings, type ShopProduct } from "@/lib/shop";

export const Route = createFileRoute("/_app/marketplace-admin")({
  component: AdminShop,
  head: () => ({
    meta: [
      { title: "Gerir Marketplace | Way Estudantes AI" },
      { name: "description", content: "Adicionar, editar e organizar os produtos do Marketplace Way Estudantes AI." },
      { property: "og:title", content: "Gerir Marketplace | Way Estudantes AI" },
      { property: "og:description", content: "Painel de gestão de produtos do Marketplace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Form = { nome: string; descricao_curta: string; descricao: string; beneficios: string; o_que_recebe: string; preco: string; categoria: string; destaque: boolean; activo: boolean; link: string; capa_url: string | null };
const VAZIO: Form = { nome: "", descricao_curta: "", descricao: "", beneficios: "", o_que_recebe: "", preco: "", categoria: "Ebooks", destaque: false, activo: true, link: "", capa_url: null };

function AdminShop() {
  const qc = useQueryClient();
  const { data: isAdmin, isLoading: checking } = useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return false;
      const { data } = await supabase.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
      return !!data;
    },
  });
  const { data: produtos = [] } = useQuery({
    queryKey: ["shop-admin-products"],
    enabled: !!isAdmin,
    queryFn: async () => {
      const { data } = await supabase.from("shop_products").select("*").order("categoria").order("created_at", { ascending: false });
      return (data ?? []) as ShopProduct[];
    },
  });
  const { data: covers = {} } = useCoverUrls(produtos.map((p) => p.capa_url));
  const { data: settings } = useShopSettings();
  const [contactos, setContactos] = useState({ whatsapp: "", messenger: "" });
  useEffect(() => { if (settings) setContactos(settings); }, [settings]);

  const [editId, setEditId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<Form>(VAZIO);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [filtro, setFiltro] = useState("Todas");

  if (checking) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!isAdmin) return <div className="p-8 text-center text-muted-foreground">Acesso reservado a administradores.</div>;

  function refresh() {
    qc.invalidateQueries({ queryKey: ["shop-admin-products"] });
    qc.invalidateQueries({ queryKey: ["shop-products"] });
  }

  async function novo() { setEditId(null); setF(VAZIO); setFile(null); setOpen(true); }
  async function editar(p: ShopProduct) {
    const { data: l } = await supabase.from("shop_payment_links").select("link").eq("product_id", p.id).maybeSingle();
    setEditId(p.id);
    setF({ ...p, preco: String(p.preco), link: l?.link ?? "" });
    setFile(null);
    setOpen(true);
  }

  async function guardar() {
    const parsed = shopProductSchema.safeParse({ ...f, preco: Number(f.preco) });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    if (file && (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024)) { toast.error("A capa deve ser uma imagem até 5 MB."); return; }
    setBusy(true);
    try {
      let capa_url = f.capa_url;
      if (file) {
        const path = `${crypto.randomUUID()}.${file.name.split(".").pop() || "jpg"}`;
        const { error } = await supabase.storage.from("shop-covers").upload(path, file, { contentType: file.type });
        if (error) throw error;
        capa_url = path;
      }
      const { link, ...dados } = parsed.data;
      const row = { ...dados, capa_url };
      let id = editId;
      if (id) {
        const { error } = await supabase.from("shop_products").update(row).eq("id", id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("shop_products").insert(row).select("id").single();
        if (error) throw error;
        id = data.id;
      }
      if (link) await supabase.from("shop_payment_links").upsert({ product_id: id!, link });
      else await supabase.from("shop_payment_links").delete().eq("product_id", id!);
      toast.success("Produto guardado.");
      setOpen(false);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao guardar.");
    } finally { setBusy(false); }
  }

  async function apagar(p: ShopProduct) {
    if (!confirm(`Excluir "${p.nome}"?`)) return;
    const { error } = await supabase.from("shop_products").delete().eq("id", p.id);
    if (error) return toast.error(error.message);
    if (p.capa_url) await supabase.storage.from("shop-covers").remove([p.capa_url]);
    toast.success("Produto excluído."); refresh();
  }

  async function toggle(p: ShopProduct) {
    await supabase.from("shop_products").update({ activo: !p.activo }).eq("id", p.id);
    refresh();
  }

  async function guardarContactos() {
    const parsed = shopSettingsSchema.safeParse(contactos);
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    const { error } = await supabase.from("shop_settings").upsert({ id: 1, ...parsed.data });
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["shop-settings"] });
    toast.success("Contactos guardados.");
  }

  const lista = produtos.filter((p) => filtro === "Todas" || p.categoria === filtro);
  const activos = produtos.filter((p) => p.activo).length;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4 pb-24 md:p-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Gerir Marketplace</h1>
          <p className="text-sm text-muted-foreground">{produtos.length} produtos · {activos} activos</p>
        </div>
        <Button size="lg" onClick={novo}><Plus className="mr-1 h-5 w-5" />Adicionar produto</Button>
      </header>

      <section className="rounded-2xl border bg-card p-4">
        <h2 className="mb-3 font-semibold">Contactos de atendimento</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <div><label className="text-sm font-medium">WhatsApp (com código 258)</label><Input value={contactos.whatsapp} onChange={(e) => setContactos({ ...contactos, whatsapp: e.target.value })} placeholder="258844772002" /></div>
          <div><label className="text-sm font-medium">Link do Messenger</label><Input value={contactos.messenger} onChange={(e) => setContactos({ ...contactos, messenger: e.target.value })} placeholder="https://m.me/suapagina" /></div>
        </div>
        <Button className="mt-3" variant="outline" onClick={guardarContactos}>Guardar contactos</Button>
      </section>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4">
        {["Todas", ...SHOP_CATEGORIAS].map((c) => (
          <button key={c} onClick={() => setFiltro(c)} className={`shrink-0 rounded-full border px-3 py-1.5 text-sm ${filtro === c ? "border-primary bg-primary text-primary-foreground" : "bg-card"}`}>{c}</button>
        ))}
      </div>

      {lista.length === 0 ? (
        <div className="rounded-2xl border bg-card p-10 text-center text-sm text-muted-foreground">Nenhum produto. Clique em "Adicionar produto".</div>
      ) : (
        <div className="space-y-3">
          {lista.map((p) => (
            <div key={p.id} className="flex items-center gap-3 rounded-2xl border bg-card p-3">
              <div className="h-16 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
                {p.capa_url && covers[p.capa_url] ? <img src={covers[p.capa_url]} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center"><ImageIcon className="h-5 w-5 text-muted-foreground" /></div>}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{p.nome}</p>
                <p className="text-xs text-muted-foreground">{p.categoria} · {mt(p.preco)}{p.destaque ? " · Destaque" : ""}</p>
              </div>
              <Switch checked={p.activo} onCheckedChange={() => toggle(p)} aria-label="Activo" />
              <Button size="icon" variant="ghost" onClick={() => editar(p)} aria-label="Editar"><Pencil className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" onClick={() => apagar(p)} aria-label="Excluir"><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? "Editar produto" : "Novo produto"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Field label="Nome"><Input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Preço (MT)"><Input inputMode="decimal" value={f.preco} onChange={(e) => setF({ ...f, preco: e.target.value })} /></Field>
              <Field label="Categoria">
                <select className="h-10 w-full rounded-md border bg-background px-2 text-sm" value={f.categoria} onChange={(e) => setF({ ...f, categoria: e.target.value })}>
                  {SHOP_CATEGORIAS.map((c) => <option key={c}>{c}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Capa (imagem até 5 MB)"><Input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></Field>
            <Field label="Descrição curta"><Input value={f.descricao_curta} onChange={(e) => setF({ ...f, descricao_curta: e.target.value })} /></Field>
            <Field label="Descrição completa"><Textarea rows={4} value={f.descricao} onChange={(e) => setF({ ...f, descricao: e.target.value })} /></Field>
            <Field label="Benefícios (um por linha)"><Textarea rows={3} value={f.beneficios} onChange={(e) => setF({ ...f, beneficios: e.target.value })} /></Field>
            <Field label="O que o cliente recebe (um por linha)"><Textarea rows={3} value={f.o_que_recebe} onChange={(e) => setF({ ...f, o_que_recebe: e.target.value })} /></Field>
            <Field label="Link de pagamento (privado)"><Input value={f.link} onChange={(e) => setF({ ...f, link: e.target.value })} placeholder="https://…" /></Field>
            <div className="flex items-center justify-between"><span className="text-sm font-medium">Activo</span><Switch checked={f.activo} onCheckedChange={(v) => setF({ ...f, activo: v })} /></div>
            <div className="flex items-center justify-between"><span className="text-sm font-medium">Em destaque</span><Switch checked={f.destaque} onCheckedChange={(v) => setF({ ...f, destaque: v })} /></div>
            <Button className="w-full" size="lg" disabled={busy} onClick={guardar}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Guardar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><label className="text-sm font-medium">{label}</label>{children}</div>;
}
