import { useState } from "react";
import { MoreVertical, Bookmark, Share2, Pencil, Trash2, Eye } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type CardItem = {
  kind: string;
  ref: string;
  title: string;
  content: string;
  href?: string;
};

type Props = {
  item: CardItem;
  onDetails?: () => void;
  onEdit?: () => void;
  className?: string;
  children: React.ReactNode;
};

export function ContentCard({ item, onDetails, onEdit, className, children }: Props) {
  const [savedId, setSavedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function guardar() {
    setBusy(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        toast.error("Inicie sessão para guardar.");
        return;
      }
      const { data, error } = await supabase
        .from("saved_items")
        .insert({
          user_id: auth.user.id,
          kind: item.kind,
          ref: item.ref,
          title: item.title,
          content: item.content,
          href: item.href ?? null,
        })
        .select("id")
        .single();
      if (error) throw error;
      setSavedId(data.id);
      toast.success("Guardado no seu perfil.");
    } catch (e) {
      toast.error("Não foi possível guardar.", { description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function apagar() {
    if (!savedId) {
      toast.info("Este cartão ainda não está guardado.");
      return;
    }
    const { error } = await supabase.from("saved_items").delete().eq("id", savedId);
    if (error) return toast.error("Erro ao apagar.");
    setSavedId(null);
    toast.success("Removido dos guardados.");
  }

  async function partilhar() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const text = `${item.title}\n\n${item.content}\n\n${url}`;
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: item.title, text });
      } else {
        await navigator.clipboard.writeText(text);
        toast.success("Copiado para a área de transferência.");
      }
    } catch {
      /* partilha cancelada */
    }
  }

  return (
    <div className={`relative rounded-xl border bg-card p-4 shadow-soft transition hover:shadow-elegant ${className ?? ""}`}>
      <div className="absolute right-2 top-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              aria-label="Opções do cartão"
              className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem disabled={busy} onSelect={() => void guardar()}>
              <Bookmark className="mr-2 h-4 w-4" /> Guardar
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => void partilhar()}>
              <Share2 className="mr-2 h-4 w-4" /> Partilhar
            </DropdownMenuItem>
            <DropdownMenuItem disabled={!onEdit} onSelect={() => onEdit?.()}>
              <Pencil className="mr-2 h-4 w-4" /> Editar
            </DropdownMenuItem>
            <DropdownMenuItem disabled={!savedId} onSelect={() => void apagar()}>
              <Trash2 className="mr-2 h-4 w-4" /> Apagar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled={!onDetails} onSelect={() => onDetails?.()}>
              <Eye className="mr-2 h-4 w-4" /> Ver detalhes
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {children}
    </div>
  );
}
