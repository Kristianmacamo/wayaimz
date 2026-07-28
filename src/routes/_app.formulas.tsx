import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { FORMULA_CATEGORIES } from "@/lib/formulas";
import { ContentCard } from "@/components/ContentCard";
import { Button } from "@/components/ui/button";
import { Calculator, Sparkles, Beaker } from "lucide-react";

type Search = { cat?: string };

export const Route = createFileRoute("/_app/formulas")({
  validateSearch: (s: Record<string, unknown>): Search => ({ cat: typeof s.cat === "string" ? s.cat : undefined }),
  head: () => ({
    meta: [
      { title: "Fórmulas Explicadas — Way Estudantes AI" },
      { name: "description", content: "Fórmulas de geometria, álgebra, estatística, contabilidade, gestão e economia com explicação e exemplo prático." },
      { property: "og:title", content: "Fórmulas Explicadas — Way Estudantes AI" },
      { property: "og:description", content: "Biblioteca de fórmulas com explicação teórica e exemplo resolvido." },
    ],
  }),
  component: FormulasPage,
});

function FormulasPage() {
  const { cat } = Route.useSearch();
  const navigate = useNavigate();
  const [active, setActive] = useState(cat ?? FORMULA_CATEGORIES[0].id);
  const category = FORMULA_CATEGORIES.find((c) => c.id === active) ?? FORMULA_CATEGORIES[0];

  return (
    <div className="mx-auto max-w-5xl p-5 pb-28 md:p-10">
      <div className="mb-6 flex items-start gap-4">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-hero text-primary-foreground shadow-soft">
          <Calculator className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold md:text-3xl">Fórmulas</h1>
          <p className="mt-1 text-sm text-muted-foreground">Cada fórmula com explicação teórica e exemplo prático.</p>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {FORMULA_CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => {
              setActive(c.id);
              navigate({ to: "/formulas", search: { cat: c.id } });
            }}
            className={`rounded-full border px-3 py-1.5 text-sm transition ${
              c.id === active ? "border-primary bg-primary text-primary-foreground" : "hover:border-primary"
            }`}
          >
            {c.emoji} {c.name}
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {category.formulas.map((f) => (
          <ContentCard
            key={f.id}
            item={{
              kind: "formula",
              ref: f.id,
              title: f.name,
              content: `${f.formula}\n\n${f.explanation.join("\n")}\n\nExemplo:\n${f.example}`,
            }}
          >
            <h3 className="pr-8 font-display text-lg font-bold">{f.name}</h3>
            <div className="mt-2 rounded-lg bg-muted px-3 py-2 font-mono text-sm">{f.formula}</div>
            <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
              {f.explanation.map((e) => (
                <li key={e}>• {e}</li>
              ))}
            </ul>
            <div className="mt-3 rounded-lg border border-dashed p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-secondary">Exemplo prático</p>
              <pre className="mt-1 whitespace-pre-wrap font-sans text-sm">{f.example}</pre>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild size="sm" className="bg-gradient-hero">
                <Link to="/formulas/$id" params={{ id: f.id }}>
                  <Sparkles className="mr-1 h-4 w-4" /> Ver explicação completa
                </Link>
              </Button>
              <Button asChild size="sm" variant="ghost">
                <Link to="/chat" search={{ start: `Dê-me 5 exercícios práticos sobre "${f.name}" com as respetivas resoluções.` } as never}>
                  <Beaker className="mr-1 h-4 w-4" /> Ver exercícios
                </Link>
              </Button>
            </div>

          </ContentCard>
        ))}
      </div>
    </div>
  );
}
