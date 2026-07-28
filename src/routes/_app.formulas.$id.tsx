import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { findFormula } from "@/lib/formulas";
import { Button } from "@/components/ui/button";
import { FormulaBox, RichText } from "@/components/RichText";
import { ArrowLeft, Sparkles, Loader2 } from "lucide-react";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { explainFormula } from "@/lib/ai.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/formulas/$id")({
  loader: ({ params }) => {
    const found = findFormula(params.id);
    if (!found) throw notFound();
    return found;
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: "Fórmula não encontrada" }, { name: "robots", content: "noindex" }] };
    const t = `${loaderData.formula.name} — Way Estudantes AI`;
    const d = `${loaderData.formula.formula} · explicação, exemplo resolvido e exercício.`;
    return {
      meta: [
        { title: t },
        { name: "description", content: d },
        { property: "og:title", content: t },
        { property: "og:description", content: d },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  component: FormulaPage,
  notFoundComponent: FormulaNotFound,
});

function FormulaNotFound() {
  return (
    <div className="mx-auto max-w-2xl p-8 text-center">
      <h1 className="font-display text-xl font-bold">Fórmula não encontrada</h1>
      <Button asChild className="mt-4"><Link to="/formulas">Voltar às fórmulas</Link></Button>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border bg-card p-5 shadow-soft">
      <h2 className="font-display text-lg font-bold">{title}</h2>
      <div className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

function FormulaPage() {
  const { category, formula } = Route.useLoaderData();
  const explain = useServerFn(explainFormula);
  const [extra, setExtra] = useState("");
  const [loading, setLoading] = useState(false);

  async function askAi() {
    setLoading(true);
    try {
      const res = await explain({ data: { name: formula.name, formula: formula.formula } });
      setExtra(res.text);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível gerar a explicação.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-5 pb-28 md:p-10">
      <Link to="/formulas" search={{ cat: category.id }} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> {category.emoji} {category.name}
      </Link>

      <h1 className="font-display text-2xl font-bold md:text-3xl">{formula.name}</h1>

      <Section title="Introdução">
        {formula.intro ?? `A fórmula ${formula.name} é usada frequentemente nos exercícios escolares.`}
      </Section>

      <Section title="Conceito">
        {formula.concept ?? formula.explanation.join(" ")}
      </Section>

      <Section title="Quando utilizar">
        {formula.whenToUse ?? "Sempre que o enunciado pedir esta grandeza ou fornecer os dados necessários."}
      </Section>

      <section className="rounded-2xl border bg-card p-5 shadow-soft">
        <h2 className="mb-3 font-display text-lg font-bold">Fórmula</h2>
        <FormulaBox>{formula.formula}</FormulaBox>
      </section>

      <Section title="Explicação das variáveis">
        <ul className="space-y-1.5">
          {formula.explanation.map((e) => (
            <li key={e}>• {e}</li>
          ))}
        </ul>
      </Section>

      <Section title="Exemplo resolvido">
        <pre className="whitespace-pre-wrap font-sans">{formula.example}</pre>
      </Section>

      {formula.exercise && (
        <Section title="Exercício para praticar">
          <p>{formula.exercise}</p>
          {formula.answer && (
            <details className="mt-3 rounded-xl border bg-muted/40 p-3">
              <summary className="cursor-pointer text-sm font-semibold text-foreground">Ver resposta</summary>
              <pre className="mt-2 whitespace-pre-wrap font-sans">{formula.answer}</pre>
            </details>
          )}
        </Section>
      )}

      {formula.tips && formula.tips.length > 0 && (
        <Section title="Dicas">
          <ul className="space-y-1.5">
            {formula.tips.map((t) => (
              <li key={t}>• {t}</li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Resumo">
        {formula.summary ?? formula.formula}
      </Section>

      <div className="rounded-2xl border bg-card p-5 shadow-soft">
        <Button onClick={askAi} disabled={loading} className="bg-gradient-hero">
          {loading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1 h-4 w-4" />}
          Pedir explicação detalhada à IA
        </Button>
        {extra && <div className="mt-4 border-t pt-4"><RichText>{extra}</RichText></div>}
      </div>
    </div>
  );
}
