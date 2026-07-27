import { createFileRoute } from "@tanstack/react-router";
import { SubjectHub } from "@/components/SubjectHub";
import { Sigma } from "lucide-react";

export const Route = createFileRoute("/_app/matematica")({
  head: () => ({
    meta: [
      { title: "Matemática — Way Estudantes AI" },
      { name: "description", content: "Ajuda em matemática: equações, geometria, funções e estatística explicadas passo a passo." },
      { property: "og:title", content: "Matemática — Way Estudantes AI" },
      { property: "og:description", content: "Resolva matemática passo a passo com a IA." },
    ],
  }),
  component: () => (
    <SubjectHub
      title="Matemática"
      subtitle="Resolva e compreenda matemática passo a passo."
      feature="chat"
      icon={<Sigma className="h-6 w-6" />}
      prompts={[
        { label: "Equações do 2.º grau", prompt: "Explique como resolver equações do 2.º grau pela fórmula de Bhaskara com 3 exemplos resolvidos." },
        { label: "Geometria — áreas", prompt: "Explique como calcular a área do triângulo, trapézio, paralelogramo e círculo com exemplos." },
        { label: "Funções", prompt: "Explique o que são funções lineares e quadráticas, com gráficos descritos e exemplos." },
        { label: "Trigonometria", prompt: "Explique seno, cosseno e tangente com exemplos práticos de triângulos retângulos." },
        { label: "Regra de três", prompt: "Explique a regra de três simples e composta com exercícios resolvidos." },
        { label: "Estatística básica", prompt: "Explique média, mediana, moda e desvio padrão com exemplos." },
      ]}
    />
  ),
});
