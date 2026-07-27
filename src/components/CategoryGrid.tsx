import { Link } from "@tanstack/react-router";

export const CATEGORIES = [
  { id: "geometria", name: "Geometria", emoji: "📐", desc: "Áreas, perímetros e volumes" },
  { id: "algebra", name: "Álgebra", emoji: "➗", desc: "Equações e produtos notáveis" },
  { id: "estatistica", name: "Estatística", emoji: "📊", desc: "Média, variância e desvio" },
  { id: "contabilidade", name: "Contabilidade", emoji: "🧾", desc: "Balanço e resultados" },
  { id: "gestao", name: "Gestão", emoji: "💼", desc: "Custos, margens e vendas" },
  { id: "economia", name: "Economia", emoji: "📈", desc: "PIB, inflação e mercados" },
  { id: "programacao", name: "Programação", emoji: "💻", desc: "Lógica e algoritmos" },
  { id: "trabalhos", name: "Trabalhos Académicos", emoji: "📚", desc: "6, 12 ou 18 páginas" },
] as const;

export function CategoryGrid({ authed = true }: { authed?: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {CATEGORIES.map((c) => {
        const inner = (
          <>
            <span className="text-2xl">{c.emoji}</span>
            <p className="mt-2 font-semibold leading-tight">{c.name}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{c.desc}</p>
          </>
        );
        const cls =
          "block rounded-xl border bg-card p-4 text-left shadow-soft transition hover:-translate-y-0.5 hover:border-primary hover:shadow-elegant";
        if (!authed) {
          return (
            <Link key={c.id} to="/auth" className={cls}>
              {inner}
            </Link>
          );
        }
        return c.id === "trabalhos" ? (
          <Link key={c.id} to="/trabalhos" className={cls}>
            {inner}
          </Link>
        ) : (
          <Link key={c.id} to="/formulas" search={{ cat: c.id }} className={cls}>
            {inner}
          </Link>
        );
      })}
    </div>
  );
}
