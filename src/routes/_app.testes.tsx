import { createFileRoute } from "@tanstack/react-router";
import { SubjectHub } from "@/components/SubjectHub";
import { ClipboardCheck } from "lucide-react";

export const Route = createFileRoute("/_app/testes")({ component: () => (
  <SubjectHub
    title="Preparação para Testes"
    subtitle="Pratique com perguntas tipo teste e receba correção imediata."
    feature="testes"
    icon={<ClipboardCheck className="h-6 w-6" />}
    prompts={[
      { label: "Teste de Matemática 10ª", prompt: "Gere um teste de Matemática da 10ª classe com 10 perguntas e gabarito comentado." },
      { label: "Teste de Português", prompt: "Gere um teste de Português com 10 perguntas de interpretação e gramática, com correção." },
      { label: "Teste de Biologia", prompt: "Crie um teste de Biologia sobre o corpo humano com 10 perguntas e respostas justificadas." },
      { label: "Teste de História", prompt: "Crie um teste sobre a colonização e independência de Moçambique." },
      { label: "Quiz rápido de Física", prompt: "Faça um quiz de 5 perguntas sobre Mecânica com resolução." },
      { label: "Simulado de Química", prompt: "Gere um simulado de Química Geral com 8 questões e gabarito." },
    ]}
  />
)});
