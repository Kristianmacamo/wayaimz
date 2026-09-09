/** Regras do marketplace educacional — partilhadas entre browser e servidor. */

export const IVA_RATE = 0.16;
export const COMMISSION_RATE = 0.1;

export type NivelEnsino = "secundario" | "universidade" | "instituto";
export type TipoMaterial = "ebook" | "modulo_exame" | "teste";
export type EstadoPagamento = "pendente" | "a_processar" | "confirmado" | "falhado";
export type EstadoProduto = "pendente" | "aprovado" | "rejeitado";

export const NIVEIS: { value: NivelEnsino; label: string }[] = [
  { value: "secundario", label: "Ensino Secundário" },
  { value: "universidade", label: "Universidade" },
  { value: "instituto", label: "Instituto Técnico" },
];

export const TIPOS: { value: TipoMaterial; label: string }[] = [
  { value: "ebook", label: "Ebook" },
  { value: "modulo_exame", label: "Módulo de Exame" },
  { value: "teste", label: "Teste" },
];

export const DISCIPLINAS = [
  "Matemática",
  "Física",
  "Química",
  "Biologia",
  "Geografia",
  "História",
  "Português",
  "Inglês",
  "Filosofia",
  "Contabilidade",
  "Economia",
  "Direito",
  "Informática",
  "Electrotecnia",
  "Mecânica",
  "Enfermagem",
  "Agronomia",
] as const;

export function nivelLabel(v: string) {
  return NIVEIS.find((n) => n.value === v)?.label ?? v;
}
export function tipoLabel(v: string) {
  return TIPOS.find((t) => t.value === v)?.label ?? v;
}

export function money(v: number) {
  return `${Number(v ?? 0).toLocaleString("pt-MZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MT`;
}

export type Breakdown = {
  precoBase: number;
  valorIva: number;
  valorComIva: number;
  comissaoPlataforma: number;
  valorLiquidoAutor: number;
};

/** IVA 16% sobre o preço base; comissão de 10% da plataforma sobre o total. */
export function calcularVenda(precoBase: number): Breakdown {
  const base = Math.max(0, Number(precoBase) || 0);
  const r = (n: number) => Math.round(n * 100) / 100;
  const valorIva = r(base * IVA_RATE);
  const valorComIva = r(base + valorIva);
  const comissaoPlataforma = r(valorComIva * COMMISSION_RATE);
  return {
    precoBase: r(base),
    valorIva,
    valorComIva,
    comissaoPlataforma,
    valorLiquidoAutor: r(valorComIva - comissaoPlataforma),
  };
}

/** Moderação de nicho: só é permitido conteúdo educacional. */
const NICHOS_BLOQUEADOS = [
  "emagrec",
  "dieta",
  "perder peso",
  "marketing digital",
  "dropship",
  "criptomoeda",
  "cripto",
  "forex",
  "trading",
  "apostas",
  "aposta",
  "betting",
  "renda extra",
  "ganhar dinheiro",
  "afiliado",
  "musculac",
  "sedu",
  "namoro",
  "beleza",
  "maquilhagem",
  "receitas de cozinha",
];

export function motivoBloqueio(texto: string): string | null {
  const t = texto.toLowerCase();
  const achado = NICHOS_BLOQUEADOS.find((k) => t.includes(k));
  if (!achado) return null;
  return `Este marketplace aceita apenas materiais educacionais. O termo "${achado}" indica um nicho fora do ensino.`;
}
