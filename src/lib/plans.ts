/**
 * Catálogo de planos do Way Estudantes AI.
 * Fonte única de verdade para preços, duração e permissões.
 */

export const PLANS = {
  free: {
    id: "free" as const,
    name: "Gratuito",
    price: 0,
    days: 0,
    period: "",
    credits: 10,
    features: ["10 créditos iniciais", "Chat AI básico"],
    notIncluded: ["Resolução de exercícios", "Testes", "Exames", "Download de PDF", "Suporte"],
  },
  semanal: {
    id: "semanal" as const,
    name: "Semanal",
    price: 65,
    days: 7,
    period: "semana",
    credits: 300,
    features: ["300 créditos", "Chat AI básico", "Explicações passo a passo", "Válido por 7 dias"],
    notIncluded: ["Resolução de exercícios", "Testes", "Exames", "Download de PDF", "Suporte"],
  },
  semanal_premium: {
    id: "semanal_premium" as const,
    name: "Semanal Premium",
    price: 180,
    days: 7,
    period: "semana",
    credits: 1000,
    features: [
      "1.000 créditos",
      "Resolução de exercícios",
      "Respostas para testes",
      "Trabalhos académicos",
      "Download de PDF e Word",
      "Válido por 7 dias",
    ],
    notIncluded: ["Exames completos", "Envio de ficheiros e fotos", "Suporte humano"],
  },
  mensal_premium: {
    id: "mensal_premium" as const,
    name: "Mensal Premium",
    price: 300,
    days: 30,
    period: "mês",
    credits: 4000,
    features: [
      "4.000 créditos",
      "Assistente AI avançado",
      "Resolução de exercícios",
      "Testes e exames completos",
      "Trabalhos académicos",
      "Upload de fotos e ficheiros",
      "Download de PDF e Word",
      "Suporte prioritário",
    ],
    notIncluded: [],
  },
} as const;

export type PlanId = keyof typeof PLANS;

export const PAID_PLAN_IDS = ["semanal", "semanal_premium", "mensal_premium"] as const;
export type PaidPlanId = (typeof PAID_PLAN_IDS)[number];

export function isPaidPlan(id: string): id is PaidPlanId {
  return (PAID_PLAN_IDS as readonly string[]).includes(id);
}

export type Feature =
  | "chat"
  | "pdf"
  | "images"
  | "priority"
  | "exercicios"
  | "testes"
  | "exames"
  | "trabalhos"
  | "uploads";

export function planAllows(plan: PlanId, feature: Feature) {
  if (plan === "mensal_premium") return true;
  if (plan === "semanal_premium") {
    return (
      feature === "chat" ||
      feature === "pdf" ||
      feature === "exercicios" ||
      feature === "testes" ||
      feature === "trabalhos"
    );
  }
  return feature === "chat";
}

/** Planos que dão acesso aos Trabalhos Académicos. */
export const WORK_PLAN_IDS = ["semanal_premium", "mensal_premium"] as const;


export const COMMISSION_RATE = 0.1;

/** Mensagens legíveis para os estados de pagamento guardados na base de dados. */
export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  pendente: "Pendente",
  a_processar: "A processar",
  concluido: "Concluído",
  falhado: "Falhado",
};

export const SUBSCRIPTION_STATUS_LABEL: Record<string, string> = {
  activa: "Activa",
  expirada: "Expirada",
  cancelada: "Cancelada",
};
