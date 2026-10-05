import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { generateWork } from "@/lib/ai.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { BookOpen, FileText, Loader2, Lock, Sparkles } from "lucide-react";
import { planAllows, type PlanId } from "@/lib/plans";
import { toast } from "sonner";
import { Carregando } from "@/components/Carregando";

export const Route = createFileRoute("/_app/trabalhos")({
  head: () => ({
    meta: [
      { title: "Trabalhos Académicos — Way Estudantes AI" },
      { name: "description", content: "Gere trabalhos académicos completos com capa, índice, introdução, desenvolvimento, conclusão e referências, e exporte em Word ou PDF." },
      { property: "og:title", content: "Trabalhos Académicos — Way Estudantes AI" },
      { property: "og:description", content: "Indique tema, curso e descrição e receba o documento pronto para descarregar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TrabalhosPage,
});

/** Tempo de geração (minutos) → dimensão aproximada do trabalho. */
const MINUTES_TO_PAGES: Record<number, number> = { 1: 9, 2: 12, 3: 15, 4: 18, 5: 21 };

/** Traduz erros técnicos em mensagens claras com o próximo passo. */
function friendlyError(e: unknown) {
  const msg = e instanceof Error ? e.message : String(e ?? "");
  if (/PLANO_NECESSARIO/i.test(msg))
    return "Os Trabalhos Académicos exigem um plano Premium activo. Vá a Pagamentos para activar.";
  if (/cr[ée]dito/i.test(msg)) return "Ficou sem créditos. Vá a Planos e ative um plano para continuar.";
  if (/suspens/i.test(msg)) return "A sua conta está suspensa. Contacte o suporte pelo WhatsApp +258 84 477 2002.";
  if (/unauthorized|401|sess/i.test(msg)) return "A sessão expirou. Saia e volte a entrar na sua conta.";
  if (/perfil/i.test(msg)) return "Perfil não encontrado. Complete o seu perfil e tente novamente.";
  if (/fetch|network|timeout|failed/i.test(msg)) return "Falha de ligação. Verifique a internet e tente novamente.";
  return msg || "Ocorreu um erro inesperado. Tente novamente dentro de instantes.";
}

function TrabalhosPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [tema, setTema] = useState("");
  const [curso, setCurso] = useState("");
  const [descricao, setDescricao] = useState("");
  const [minutos, setMinutos] = useState(2);
  const [formato, setFormato] = useState<"pdf" | "docx">("docx");

  const { data: docs } = useQuery({
    queryKey: ["documents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("id, tema, curso, pages, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: profile } = useQuery({
    queryKey: ["my-profile-plan"],
    queryFn: async () =>
      (await supabase.from("profiles").select("current_plan, plan_expires_at").maybeSingle()).data,
  });
  const plano = (profile?.current_plan ?? "free") as PlanId;
  const planoActivo =
    plano !== "free" && (!profile?.plan_expires_at || new Date(profile.plan_expires_at) > new Date());
  const podeGerar = planoActivo && planAllows(plano, "trabalhos");

  const [elapsed, setElapsed] = useState(0);

  const gerar = useServerFn(generateWork);
  const mutation = useMutation({
    mutationFn: async () =>
      gerar({ data: { tema: tema.trim(), curso: curso.trim(), descricao: descricao.trim(), pages: MINUTES_TO_PAGES[minutos] } }),
    onMutate: () => setElapsed(0),
    onSuccess: (res) => {
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Documento gerado com sucesso.");
      navigate({ to: "/documento/$id", params: { id: res.id }, search: { formato } });
    },
    onError: (e: Error) =>
      toast.error("Não foi possível gerar o trabalho", { description: friendlyError(e) }),
  });

  useEffect(() => {
    if (!mutation.isPending) return;
    const timer = setInterval(() => setElapsed((v) => v + 1), 1000);
    return () => clearInterval(timer);
  }, [mutation.isPending]);

  return (
    <div className="mx-auto max-w-4xl p-5 pb-28 md:p-10">
      <div className="mb-6 flex items-start gap-4">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-hero text-primary-foreground shadow-soft">
          <BookOpen className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold md:text-3xl">Trabalhos Académicos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Indique o tema, o curso e a descrição. A IA gera o documento com capa, índice e capítulos — pronto a editar e descarregar.
          </p>
        </div>
      </div>

      {!podeGerar && (
        <div className="mb-6 rounded-2xl border border-primary/30 bg-primary/5 p-5 shadow-soft">
          <div className="flex items-start gap-3">
            <Lock className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div className="min-w-0">
              <p className="font-semibold">Funcionalidade paga</p>
              <p className="mt-1 text-sm text-muted-foreground">
                A geração de Trabalhos Académicos está incluída no plano <strong>Semanal Premium (180 MT)</strong> e no
                plano <strong>Mensal Premium (300 MT)</strong>. Depois de pagar, gera trabalhos completos e descarrega
                em Word ou PDF.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button asChild className="bg-gradient-hero">
                  <Link to="/pagamentos" search={{ plan: "semanal_premium" }}>Pagar plano</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/planos">Ver planos</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button className="bg-gradient-hero" disabled={!podeGerar}>
            <Sparkles className="mr-1.5 h-4 w-4" /> Gerar Trabalho
          </Button>
        </DialogTrigger>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Novo trabalho académico</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="tema">Tema do trabalho</Label>
              <Input id="tema" value={tema} onChange={(e) => setTema(e.target.value)} placeholder="Ex.: A poluição dos rios em Moçambique" className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="curso">Curso</Label>
              <Input id="curso" value={curso} onChange={(e) => setCurso(e.target.value)} placeholder="Ex.: Biologia, 11.ª classe" className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="desc">Descrição</Label>
              <Textarea id="desc" value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={3} placeholder="O que deve ser abordado no trabalho?" className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="min">Tempo de geração: {minutos} minuto{minutos > 1 ? "s" : ""} (~{MINUTES_TO_PAGES[minutos]} páginas)</Label>
              <input
                id="min"
                type="range"
                min={1}
                max={5}
                step={1}
                value={minutos}
                onChange={(e) => setMinutos(Number(e.target.value))}
                className="mt-2 w-full accent-primary"
              />
            </div>
            <div>
              <Label>Tipo de documento</Label>
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                {(["docx", "pdf"] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFormato(f)}
                    className={`rounded-xl border px-3 py-2 text-sm font-medium ${formato === f ? "border-primary bg-primary/10 text-primary" : "bg-card"}`}
                  >
                    {f === "docx" ? "Word (.docx)" : "PDF"}
                  </button>
                ))}
              </div>
            </div>

            <Button
              className="w-full bg-gradient-hero"
              disabled={!tema.trim() || mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> A gerar documento... {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}</>
              ) : (
                "Gerar documento"
              )}
            </Button>
            {mutation.isError && !mutation.isPending && (
              <p className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
                {friendlyError(mutation.error)}
              </p>
            )}
            {mutation.isPending && (
              <p className="text-center text-xs text-muted-foreground">
                A escrever capa, índice e capítulos. Pode demorar 1 a 3 minutos — não feche esta janela.
              </p>
            )}
            <p className="text-center text-xs text-muted-foreground">
              O conteúdo é gerado apenas no documento — não é enviado para o Chat AI.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {mutation.isPending && (
        <Carregando
          detalhe={`A criar o trabalho de ${MINUTES_TO_PAGES[minutos]} páginas · ${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, "0")}`}
        />
      )}

      <h2 className="mb-3 mt-9 font-display text-xl font-bold">Os meus documentos</h2>
      {!docs?.length ? (
        <div className="rounded-2xl border bg-card p-6 text-center text-sm text-muted-foreground shadow-soft">
          Ainda não gerou nenhum trabalho. Clique em <strong>Gerar Trabalho</strong> para começar.
        </div>
      ) : (
        <div className="grid gap-3">
          {docs.map((d) => (
            <Link
              key={d.id}
              to="/documento/$id"
              params={{ id: d.id }}
              className="flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-soft transition hover:bg-accent"
            >
              <FileText className="h-5 w-5 shrink-0 text-primary" />
              <div className="min-w-0">
                <p className="truncate font-medium">{d.tema}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {d.curso || "Sem curso"} • {d.pages} páginas • {new Date(d.created_at).toLocaleDateString("pt-PT")}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
