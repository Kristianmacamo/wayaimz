import { createFileRoute } from "@tanstack/react-router";
import { SubjectHub } from "@/components/SubjectHub";
import { Beaker } from "lucide-react";

export const Route = createFileRoute("/_app/exercicios")({ component: () => (
  <SubjectHub
    title="Resolução de Exercícios"
    subtitle="Resolva exercícios passo a passo com explicações claras."
    feature="exercicios"
    icon={<Beaker className="h-6 w-6" />}
    prompts={[
      { label: "Equação do 2.º grau", prompt: "Resolva passo a passo: 2x² − 5x + 3 = 0" },
      { label: "Sistema de equações", prompt: "Resolva o sistema: { x + y = 10 ; 2x − y = 5 }" },
      { label: "Regra de três simples", prompt: "Se 5 trabalhadores fazem uma obra em 12 dias, em quantos dias 10 trabalhadores farão a mesma obra?" },
      { label: "Reações químicas", prompt: "Balanceie a equação: H2 + O2 → H2O" },
      { label: "Análise sintática", prompt: "Faça a análise sintática da frase: 'O estudante moçambicano estuda todos os dias com dedicação.'" },
      { label: "Conversão de unidades", prompt: "Converta 72 km/h para m/s e explique o procedimento." },
    ]}
  />
)});
