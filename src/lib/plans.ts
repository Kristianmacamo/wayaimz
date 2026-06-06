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
      "Funcionalidades básicas",
      "Download de PDF",
      "Download de imagens",
    ],
    notIncluded: ["Suporte prioritário"],
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
      "Suporte prioritário",
      "Download de PDF e imagens",
      "Todas as funcionalidades desbloqueadas",
    ],
    notIncluded: [],
  },
} as const;

export type PlanId = keyof typeof PLANS;

export function planAllows(plan: PlanId, feature: "chat" | "pdf" | "images" | "priority") {
  if (plan === "premium") return true;
  if (plan === "basico") return feature === "chat" || feature === "pdf" || feature === "images";
  return feature === "chat";
}

export const COMMISSION_RATE = 0.1;
