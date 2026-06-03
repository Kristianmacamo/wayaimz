import { createFileRoute } from "@tanstack/react-router";
import { SubjectHub } from "@/components/SubjectHub";
import { FileText } from "lucide-react";

export const Route = createFileRoute("/_app/exames")({ component: () => (
  <SubjectHub
    title="Preparação para Exames"
    subtitle="Exames completos por disciplina e classe, com resolução detalhada."
    feature="exames"
    icon={<FileText className="h-6 w-6" />}
    prompts={[
      { label: "Exame Matemática 12ª", prompt: "Crie um exame final de Matemática da 12ª classe com 15 questões e resolução completa." },
      { label: "Exame Português 12ª", prompt: "Crie um exame de Português da 12ª classe com produção textual e interpretação." },
      { label: "Exame Biologia 12ª", prompt: "Gere um exame de Biologia da 12ª classe com 15 perguntas e gabarito." },
      { label: "Exame Física 12ª", prompt: "Gere um exame de Física da 12ª classe com problemas resolvidos." },
      { label: "Exame Química 12ª", prompt: "Crie um exame de Química da 12ª com questões e correção." },
      { label: "Exame História 12ª", prompt: "Crie um exame de História com foco em Moçambique e África." },
    ]}
  />
)});
