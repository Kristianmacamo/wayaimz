export const PLANS = {
  free: {
    id: "free" as const,
    name: "Gratuito",
    price: 0,
    priceUsd: 0,
    period: "",
    credits: 100,
    features: ["100 créditos para começar", "Chat AI básico"],
    notIncluded: ["Suporte prioritário", "Download de PDF", "Download de imagens premium"],
  },
  basico: {
    id: "basico" as const,
    name: "Básico",
    price: 65,
    priceUsd: 1,
    period: "mês",
    credits: 500,
    features: [
      "500 créditos por mês",
      "Carregar até 3 fotos por semana",
      "Tirar fotografias para enviar ao AI",
      "Resolver exercícios básicos",
      "Acesso a todas as fórmulas",
      "Explicações simples passo a passo",
    ],
    notIncluded: ["Download de PDF", "Suporte prioritário"],
  },
  premium: {
    id: "premium" as const,
    name: "Premium",
    price: 299,
    priceUsd: 5,
    period: "mês",
    credits: 2500,
    features: [
      "2.500 créditos por mês",
      "Carregar até 10 fotos",
      "Resolução avançada de exercícios",
      "Criação automática de trabalhos (6, 12 e 18 páginas)",
      "Resumos inteligentes",
      "Prioridade nas respostas da IA",
      "Baixar respostas em PDF",
      "Suporte prioritário",
      "Todas as funcionalidades desbloqueadas",
    ],
    notIncluded: [],
  },
} as const;

export type PlanId = keyof typeof PLANS;

export type Feature = "chat" | "pdf" | "images" | "priority" | "exercicios" | "testes" | "exames" | "uploads";

export function planAllows(plan: PlanId, feature: Feature) {
  if (plan === "premium") return true;
  if (plan === "basico") return feature !== "priority" && feature !== "exames" && feature !== "uploads";
  return feature === "chat";
}

export const COMMISSION_RATE = 0.1;
