import { createFileRoute } from "@tanstack/react-router";
import { SubjectHub } from "@/components/SubjectHub";
import { Lightbulb } from "lucide-react";

export const Route = createFileRoute("/_app/explicacoes")({
  head: () => ({
    meta: [
      { title: "Explicações — Way Estudantes AI" },
      { name: "description", content: "Explicações claras de matérias do ensino secundário e superior, passo a passo e em linguagem simples." },
      { property: "og:title", content: "Explicações — Way Estudantes AI" },
      { property: "og:description", content: "Compreenda qualquer matéria com explicações simples e exemplos." },
    ],
  }),
  component: () => (
    <SubjectHub
      title="Explicações"
      subtitle="Compreenda a matéria com explicações simples, passo a passo."
      feature="chat"
      icon={<Lightbulb className="h-6 w-6" />}
      prompts={[
        { label: "Explique como se tivesse 12 anos", prompt: "Explique de forma muito simples, como se eu tivesse 12 anos, o seguinte tema: " },
        { label: "Resumo da matéria", prompt: "Faça um resumo organizado, com tópicos e exemplos, sobre a matéria: " },
        { label: "Passo a passo", prompt: "Explique passo a passo, com cada etapa justificada, o seguinte conteúdo: " },
        { label: "Exemplos práticos", prompt: "Dê 5 exemplos práticos do dia a dia moçambicano sobre o tema: " },
        { label: "Mapa de estudo", prompt: "Crie um plano de estudo de 7 dias para dominar o tema: " },
        { label: "Perguntas de revisão", prompt: "Crie 10 perguntas de revisão com respostas sobre o tema: " },
      ]}
    />
  ),
});
