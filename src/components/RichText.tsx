import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { sanitizeMath } from "@/lib/math-text";
import { cn } from "@/lib/utils";

type Props = { children: string; className?: string };

/**
 * Renderiza texto da IA já limpo de LaTeX: nunca mostra $, \frac, \sqrt,
 * \Delta ou \cdot. Cada bloco de fórmula aparece numa caixa própria e as
 * secções são separadas por espaço (sem linhas horizontais).
 */
export function RichText({ children, className }: Props) {
  const text = sanitizeMath(children ?? "");
  return (
    <div className={cn("space-y-4 text-[15px] leading-relaxed", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h2 className="font-display text-xl font-bold">{children}</h2>,
          h2: ({ children }) => <h3 className="mt-2 font-display text-lg font-bold">{children}</h3>,
          h3: ({ children }) => <h4 className="mt-2 font-display text-base font-semibold">{children}</h4>,
          p: ({ children }) => <p className="whitespace-pre-wrap">{children}</p>,
          ul: ({ children }) => <ul className="ml-5 list-disc space-y-1.5">{children}</ul>,
          ol: ({ children }) => <ol className="ml-5 list-decimal space-y-1.5">{children}</ol>,
          li: ({ children }) => <li className="pl-1">{children}</li>,
          strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
          hr: () => <div className="h-2" />,
          blockquote: ({ children }) => (
            <div className="rounded-xl border bg-muted/50 p-4">{children}</div>
          ),
          code: ({ children, className: cls }) => {
            const isBlock = typeof cls === "string" && cls.includes("language-");
            if (!isBlock)
              return (
                <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[0.95em]">{children}</code>
              );
            return (
              <span className="my-2 block rounded-xl border border-primary/25 bg-primary/5 px-4 py-3 text-center font-mono text-base">
                {children}
              </span>
            );
          },
          pre: ({ children }) => <div className="my-3">{children}</div>,
          table: ({ children }) => (
            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full text-sm">{children}</table>
            </div>
          ),
          th: ({ children }) => <th className="bg-muted px-3 py-2 text-left font-semibold">{children}</th>,
          td: ({ children }) => <td className="border-t px-3 py-2 align-top">{children}</td>,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

/** Caixa destacada para uma fórmula isolada. */
export function FormulaBox({ children }: { children: string }) {
  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-center font-mono text-lg font-semibold">
      {sanitizeMath(children)}
    </div>
  );
}
