import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RichText } from "@/components/RichText";
import { exportPdf, exportWord, type DocSection } from "@/lib/export-doc";
import { ArrowLeft, Download, Eye, Loader2, Pencil, Save } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/documento/$id")({
  head: () => ({
    meta: [
      { title: "Documento gerado — Way Estudantes AI" },
      { name: "description", content: "Veja, edite e exporte em Word ou PDF o seu trabalho académico gerado com Inteligência Artificial." },
      { property: "og:title", content: "Documento gerado — Way Estudantes AI" },
      { property: "og:description", content: "Trabalho académico com capa, índice e capítulos, pronto a descarregar." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): { formato?: "pdf" | "docx" } =>
    s.formato === "pdf" || s.formato === "docx" ? { formato: s.formato } : {},
  component: DocumentoPage,
});

function DocumentoPage() {
  const { id } = Route.useParams();
  const { formato } = Route.useSearch();
  const [sections, setSections] = useState<DocSection[]>([]);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState<"pdf" | "docx" | null>(null);

  async function handleExport(kind: "pdf" | "docx") {
    if (!doc) return;
    if (!sections.length) {
      toast.error("Documento vazio", { description: "Gere novamente o trabalho antes de exportar." });
      return;
    }
    setExporting(kind);
    const id = toast.loading(
      kind === "pdf" ? "A preparar o PDF..." : "A preparar o ficheiro Word...",
    );
    try {
      if (kind === "pdf") await exportPdf(doc.tema, sections);
      else await exportWord(doc.tema, sections);
      toast.success("Transferência iniciada.", { id });
    } catch (e) {
      toast.error("Não foi possível exportar", {
        id,
        description: e instanceof Error ? e.message : "Verifique a ligação à internet e tente novamente.",
      });
    } finally {
      setExporting(null);
    }
  }


  const { data: doc, isLoading } = useQuery({
    queryKey: ["document", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("documents").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (doc?.sections) setSections((doc.sections as unknown as DocSection[]) ?? []);
  }, [doc]);

  async function save() {
    setSaving(true);
    const { error } = await supabase.from("documents").update({ sections: sections as unknown as never }).eq("id", id);
    setSaving(false);
    if (error) return toast.error("Não foi possível guardar as alterações.");
    setEditing(false);
    toast.success("Alterações guardadas.");
  }

  if (isLoading) {
    return (
      <div className="grid h-64 place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <p className="text-sm text-muted-foreground">Documento não encontrado.</p>
        <Button asChild variant="outline" className="mt-4"><Link to="/trabalhos">Voltar aos trabalhos</Link></Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-5 pb-28 md:p-10">
      <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
        <Link to="/trabalhos"><ArrowLeft className="mr-1 h-4 w-4" /> Trabalhos</Link>
      </Button>

      <h1 className="font-display text-2xl font-bold md:text-3xl">{doc.tema}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{doc.curso || "Sem curso"} • {doc.pages} páginas</p>

      <div className="sticky top-0 z-20 -mx-1 mt-4 flex flex-wrap gap-2 rounded-2xl border bg-card/95 p-3 shadow-soft backdrop-blur">
        <Button variant="outline" size="sm" onClick={() => setEditing((v) => !v)}>
          {editing ? <><Eye className="mr-1.5 h-4 w-4" /> Pré-visualizar</> : <><Pencil className="mr-1.5 h-4 w-4" /> Editar</>}
        </Button>
        {editing && (
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />} Guardar
          </Button>
        )}
        <Button
          size="sm"
          variant={formato === "docx" ? "default" : "outline"}
          onClick={() => handleExport("docx")}
          disabled={exporting !== null}
          className={formato === "docx" ? "bg-gradient-hero" : ""}
        >
          {exporting === "docx" ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Download className="mr-1.5 h-4 w-4" />} Word (.docx)
        </Button>
        <Button
          size="sm"
          variant={formato === "pdf" ? "default" : "outline"}
          onClick={() => handleExport("pdf")}
          disabled={exporting !== null}
          className={formato === "pdf" ? "bg-gradient-hero" : ""}
        >
          {exporting === "pdf" ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Download className="mr-1.5 h-4 w-4" />} PDF
        </Button>
      </div>

      <div className="mt-6 space-y-7 rounded-2xl border bg-card p-5 shadow-soft md:p-8">
        {sections.map((s, i) => (
          <section key={s.title + i}>
            <h2 className="font-display text-xl font-bold">{s.title}</h2>
            {editing ? (
              <Textarea
                value={s.body}
                onChange={(e) =>
                  setSections((prev) => prev.map((x, idx) => (idx === i ? { ...x, body: e.target.value } : x)))
                }
                rows={10}
                className="mt-2 font-mono text-sm"
              />
            ) : (
              <RichText className="mt-2">{s.body}</RichText>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
