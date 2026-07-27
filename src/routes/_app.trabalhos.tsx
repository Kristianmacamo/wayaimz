import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { WORK_SIZES, MODELO_INTRODUCAO, MODELO_CONCLUSAO, MODELO_REFERENCIAS, MODELO_APENDICES, buildWorkPrompt } from "@/lib/trabalhos";
import { ContentCard } from "@/components/ContentCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BookOpen, Check, FileDown, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_app/trabalhos")({
  head: () => ({
    meta: [
      { title: "Trabalhos Académicos — Way Estudantes AI" },
      { name: "description", content: "Gere trabalhos académicos de 6, 12 ou 18 páginas com capa, índice, introdução, desenvolvimento, conclusão e referências." },
      { property: "og:title", content: "Trabalhos Académicos — Way Estudantes AI" },
      { property: "og:description", content: "Escolha o tamanho do trabalho e a IA gera a estrutura completa." },
    ],
  }),
  component: TrabalhosPage,
});

function TrabalhosPage() {
  const [tema, setTema] = useState("");
  const [disciplina, setDisciplina] = useState("");
  const [sizeId, setSizeId] = useState<(typeof WORK_SIZES)[number]["id"]>("p6");
  const size = WORK_SIZES.find((s) => s.id === sizeId)!;

  return (
    <div className="mx-auto max-w-5xl p-5 pb-28 md:p-10">
      <div className="mb-6 flex items-start gap-4">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-hero text-primary-foreground shadow-soft">
          <BookOpen className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold md:text-3xl">Trabalhos Académicos</h1>
          <p className="mt-1 text-sm text-muted-foreground">Escolha o tema e o tamanho — a plataforma gera a estrutura completa.</p>
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-5 shadow-soft">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="tema">Tema do trabalho</Label>
            <Input id="tema" value={tema} onChange={(e) => setTema(e.target.value)} placeholder="Ex.: A poluição dos rios em Moçambique" className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="disc">Disciplina / Curso</Label>
            <Input id="disc" value={disciplina} onChange={(e) => setDisciplina(e.target.value)} placeholder="Ex.: Biologia, 11.ª classe" className="mt-1.5" />
          </div>
        </div>
      </div>

      <h2 className="mb-3 mt-8 font-display text-xl font-bold">Escolha o tamanho</h2>
      <div className="grid gap-4 md:grid-cols-3">
        {WORK_SIZES.map((s) => (
          <ContentCard
            key={s.id}
            item={{ kind: "trabalho", ref: s.id, title: s.title, content: `${s.description}\n\n${s.structure.join("\n")}` }}
            onEdit={() => setSizeId(s.id)}
            className={s.id === sizeId ? "ring-2 ring-primary" : ""}
          >
            <button onClick={() => setSizeId(s.id)} className="block w-full text-left">
              <span className="inline-flex rounded-full bg-secondary-soft px-2.5 py-0.5 text-xs font-semibold text-secondary">
                {s.pages} páginas
              </span>
              <h3 className="mt-2 pr-8 font-display text-lg font-bold">{s.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.description}</p>
              <ul className="mt-3 space-y-1 text-sm">
                {s.structure.map((item) => (
                  <li key={item} className="flex gap-2">
                    <Check className="h-4 w-4 shrink-0 text-success" /> {item}
                  </li>
                ))}
              </ul>
            </button>
          </ContentCard>
        ))}
      </div>

      <div className="sticky bottom-20 z-20 mt-6 rounded-2xl border bg-card/95 p-4 shadow-elegant backdrop-blur md:bottom-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Selecionado: <strong className="text-foreground">{size.title}</strong>
          </p>
          <Button asChild className="bg-gradient-hero" disabled={!tema.trim()}>
            <Link to="/chat" search={{ start: buildWorkPrompt(size, tema, disciplina) } as never}>
              <Sparkles className="mr-1 h-4 w-4" /> Gerar trabalho com IA
            </Link>
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          <FileDown className="mr-1 inline h-3.5 w-3.5" />
          O download em PDF está disponível no plano Premium.
        </p>
      </div>

      <h2 className="mb-3 mt-10 font-display text-xl font-bold">Modelos e orientações</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <ContentCard item={{ kind: "modelo", ref: "introducao", title: "Modelo de Introdução", content: MODELO_INTRODUCAO }}>
          <h3 className="pr-8 font-display text-lg font-bold">Modelo de Introdução</h3>
          <p className="mt-2 text-sm text-muted-foreground">{MODELO_INTRODUCAO}</p>
        </ContentCard>
        <ContentCard item={{ kind: "modelo", ref: "conclusao", title: "Modelo de Conclusão", content: MODELO_CONCLUSAO }}>
          <h3 className="pr-8 font-display text-lg font-bold">Modelo de Conclusão</h3>
          <p className="mt-2 text-sm text-muted-foreground">{MODELO_CONCLUSAO}</p>
        </ContentCard>
        <ContentCard item={{ kind: "modelo", ref: "referencias", title: "Referências Bibliográficas", content: MODELO_REFERENCIAS.join("\n") }}>
          <h3 className="pr-8 font-display text-lg font-bold">Referências Bibliográficas</h3>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            {MODELO_REFERENCIAS.map((r) => <li key={r}>• {r}</li>)}
          </ul>
        </ContentCard>
        <ContentCard item={{ kind: "modelo", ref: "apendices", title: "Apêndices", content: MODELO_APENDICES.join("\n") }}>
          <h3 className="pr-8 font-display text-lg font-bold">Apêndices</h3>
          <p className="mt-2 text-sm text-muted-foreground">Materiais complementares produzidos pelo estudante:</p>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            {MODELO_APENDICES.map((r) => <li key={r}>• {r}</li>)}
          </ul>
        </ContentCard>
      </div>
    </div>
  );
}
