export const PLANS = {
  free: {
    id: "free" as const,
    name: "Gratuito",
    price: 0,
    period: "",
    chatLimit: 2,
    features: ["2 conversas grátis com a IA"],
    notIncluded: [],
  },
  basico: {
    id: "basico" as const,
    name: "Básico",
    price: 65,
    period: "semana",
    chatLimit: null,
    features: ["Chat AI básico", "Respostas ilimitadas"],
    notIncluded: ["Resolução de exercícios", "Testes", "Exames", "Download de PDF"],
  },
  premium: {
    id: "premium" as const,
    name: "Premium",
    price: 180,
    period: "semana",
    chatLimit: null,
    features: [
      "Tudo do Básico",
      "Resolução de exercícios",
      "Respostas para testes",
      "Download de PDF",
      "Trabalhos académicos",
    ],
    notIncluded: ["Suporte humano", "Exames completos", "Envio de ficheiros"],
  },
  completo: {
    id: "completo" as const,
    name: "Completo",
    price: 300,
    period: "mês",
    chatLimit: null,
    features: [
      "Tudo do Premium",
      "Suporte humano",
      "Testes e Exames completos",
      "Upload de fotos e ficheiros",
      "Assistente AI avançado",
    ],
    notIncluded: [],
  },
} as const;

export type PlanId = keyof typeof PLANS;

export function planAllows(plan: PlanId, feature: "chat" | "exercicios" | "testes" | "exames" | "pdf" | "uploads") {
  if (plan === "completo") return true;
  if (plan === "premium") return feature !== "exames" && feature !== "uploads";
  if (plan === "basico") return feature === "chat";
  return feature === "chat"; // free: limited by chat count
}

export const COMMISSION_RATE = 0.1;
