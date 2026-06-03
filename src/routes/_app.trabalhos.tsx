import { createFileRoute } from "@tanstack/react-router";
import { SubjectHub } from "@/components/SubjectHub";
import { BookOpen } from "lucide-react";

export const Route = createFileRoute("/_app/trabalhos")({ component: () => (
  <SubjectHub
    title="Trabalhos Académicos"
    subtitle="Produza trabalhos para casa estruturados com a ajuda da IA."
    feature="exercicios"
    icon={<BookOpen className="h-6 w-6" />}
    prompts={[
      { label: "Trabalho de Biologia", prompt: "Ajude-me a escrever um trabalho académico de Biologia sobre a fotossíntese, com introdução, desenvolvimento e conclusão." },
      { label: "Trabalho de História", prompt: "Faça um trabalho académico sobre a história da independência de Moçambique, com referências." },
      { label: "Trabalho de Português", prompt: "Escreva uma redação dissertativa sobre a importância da leitura para os jovens moçambicanos." },
      { label: "Trabalho de Geografia", prompt: "Elabore um trabalho sobre os recursos naturais de Moçambique." },
      { label: "Trabalho de Física", prompt: "Faça um trabalho sobre as Leis de Newton com exemplos práticos." },
      { label: "Trabalho de Química", prompt: "Elabore um trabalho sobre a tabela periódica e as suas aplicações." },
    ]}
  />
)});
