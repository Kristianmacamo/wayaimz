/**
 * Rede de segurança: converte LaTeX cru em texto matemático legível.
 * Só é aplicada ao texto que sobra depois do KaTeX — o utilizador nunca
 * deve ver `$`, `\frac`, `\sqrt`, `\Delta`, `\cdot`, etc.
 */

const SYMBOLS: Record<string, string> = {
  Delta: "Δ",
  delta: "δ",
  alpha: "α",
  beta: "β",
  gamma: "γ",
  theta: "θ",
  pi: "π",
  sigma: "σ",
  Sigma: "Σ",
  mu: "μ",
  lambda: "λ",
  omega: "ω",
  infty: "∞",
  cdot: "×",
  times: "×",
  div: "÷",
  pm: "±",
  mp: "∓",
  leq: "≤",
  geq: "≥",
  neq: "≠",
  approx: "≈",
  equiv: "≡",
  rightarrow: "→",
  Rightarrow: "⇒",
  to: "→",
  ldots: "…",
  dots: "…",
  in: "∈",
  forall: "∀",
  exists: "∃",
  sum: "Σ",
  int: "∫",
  angle: "∠",
  degree: "°",
  circ: "°",
  percent: "%",
};

function stripBraces(value: string) {
  const trimmed = value.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return trimmed.slice(1, -1);
  return trimmed;
}

/** Converte um pedaço de LaTeX em texto simples legível. */
export function latexToPlain(input: string): string {
  let out = input;

  // \frac{a}{b} -> (a) / (b)
  for (let i = 0; i < 4; i++) {
    out = out.replace(/\\d?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, (_m, a, b) => {
      const top = stripBraces(a);
      const bottom = stripBraces(b);
      const simple = /^[\w.,]+$/.test(top) && /^[\w.,]+$/.test(bottom);
      return simple ? `${top}/${bottom}` : `(${top}) / (${bottom})`;
    });
  }

  // \sqrt[n]{x} e \sqrt{x}
  out = out.replace(/\\sqrt\s*\[([^\]]*)\]\s*\{([^{}]*)\}/g, (_m, n, x) => `raiz de índice ${n} de (${stripBraces(x)})`);
  for (let i = 0; i < 4; i++) {
    out = out.replace(/\\sqrt\s*\{([^{}]*)\}/g, (_m, x) => {
      const inner = stripBraces(x);
      return /^[\w.,]+$/.test(inner) ? `√${inner}` : `√(${inner})`;
    });
  }

  // \text{...}, \mathrm{...}, \mathbf{...}
  out = out.replace(/\\(?:text|mathrm|mathbf|mathit|operatorname)\s*\{([^{}]*)\}/g, "$1");

  // expoentes e índices simples
  const SUP: Record<string, string> = { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹", n: "ⁿ", i: "ⁱ", "+": "⁺", "-": "⁻" };
  const SUB: Record<string, string> = { "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄", "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉", n: "ₙ", i: "ᵢ", a: "ₐ" };
  out = out.replace(/\^\{([^{}]{1,3})\}|\^(\w)/g, (_m, a, b) => {
    const src = (a ?? b) as string;
    const mapped = [...src].map((c) => SUP[c] ?? null);
    return mapped.every(Boolean) ? mapped.join("") : `^${src}`;
  });
  out = out.replace(/_\{([^{}]{1,3})\}|_(\w)/g, (_m, a, b) => {
    const src = (a ?? b) as string;
    const mapped = [...src].map((c) => SUB[c] ?? null);
    return mapped.every(Boolean) ? mapped.join("") : `_${src}`;
  });

  // símbolos nomeados
  out = out.replace(/\\([A-Za-z]+)/g, (m, name: string) => SYMBOLS[name] ?? m.replace("\\", ""));

  // restos de LaTeX
  out = out.replace(/\\left|\\right|\\!|\\,|\\;|\\quad|\\qquad/g, " ");
  out = out.replace(/\\\\/g, "\n");
  out = out.replace(/[{}]/g, "");
  out = out.replace(/\\/g, "");

  return out.replace(/[ \t]{2,}/g, " ").trim();
}

/**
 * Remove delimitadores LaTeX que tenham escapado ao KaTeX e converte o
 * conteúdo em texto legível. Nunca deixa `$`, `\(`, `\[` visíveis.
 */
export function sanitizeMath(input: string): string {
  if (!input) return "";
  let out = input;

  // blocos \[ ... \] e \( ... \)
  out = out.replace(/\\\[([\s\S]*?)\\\]/g, (_m, inner) => `\n\n${latexToPlain(inner)}\n\n`);
  out = out.replace(/\\\(([\s\S]*?)\\\)/g, (_m, inner) => latexToPlain(inner));

  // $$ ... $$ e $ ... $
  out = out.replace(/\$\$([\s\S]*?)\$\$/g, (_m, inner) => `\n\n${latexToPlain(inner)}\n\n`);
  out = out.replace(/\$([^$\n]+)\$/g, (_m, inner) => latexToPlain(inner));

  // qualquer comando LaTeX solto fora de delimitadores
  if (/\\[A-Za-z]+/.test(out)) out = latexToPlain(out);

  // nunca mostrar cifrões soltos de matemática
  out = out.replace(/(^|\s)\$(?=\S)/g, "$1").replace(/\$(?=\s|$)/g, "");

  // sem linhas horizontais a dividir conteúdo
  out = out.replace(/^\s*([-*_])\1{2,}\s*$/gm, "");

  return out;
}

/** Verdadeiro quando ainda existe sintaxe LaTeX no texto. */
export function hasLatex(input: string) {
  return /\$|\\[A-Za-z]+|\\\(|\\\[/.test(input);
}
