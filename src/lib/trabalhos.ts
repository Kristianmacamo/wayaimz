export type WorkSize = {
  id: "p6" | "p12" | "p18";
  pages: number;
  title: string;
  description: string;
  structure: string[];
};

export const WORK_SIZES: WorkSize[] = [
  {
    id: "p6",
    pages: 9,
    title: "Trabalho de 9 Páginas",
    description: "Ideal para TPCs, relatórios curtos e atividades de sala de aula.",
    structure: ["Capa", "Índice", "Introdução", "Desenvolvimento", "Conclusão", "Referências bibliográficas"],
  },
  {
    id: "p12",
    pages: 15,
    title: "Trabalho de 15 Páginas",
    description: "Recomendado para trabalhos de módulo, seminários e relatórios mais detalhados.",
    structure: [
      "Capa",
      "Índice",
      "Introdução",
      "Objetivos",
      "Revisão teórica",
      "Desenvolvimento",
      "Exemplos práticos",
      "Conclusão",
      "Referências bibliográficas",
    ],
  },
  {
    id: "p18",
    pages: 21,
    title: "Trabalho de 21 Páginas",
    description: "Adequado para projetos finais, relatórios de estágio e trabalhos de investigação.",
    structure: [
      "Capa",
      "Índice",
      "Introdução",
      "Problema de pesquisa",
      "Objetivos geral e específicos",
      "Metodologia",
      "Fundamentação teórica",
      "Desenvolvimento",
      "Análise e discussão",
      "Conclusão",
      "Referências bibliográficas",
    ],
  },
];

export const MODELO_INTRODUCAO =
  "A introdução apresenta o tema do trabalho, explica a sua importância e mostra o que será estudado ao longo do documento. Também ajuda o leitor a compreender o objetivo da pesquisa e a organização do conteúdo.";

export const MODELO_CONCLUSAO =
  "A conclusão resume os principais resultados obtidos, destaca o que foi aprendido e apresenta uma visão final sobre o tema estudado. Não deve trazer ideias totalmente novas, mas sim sintetizar o desenvolvimento do trabalho.";

export const MODELO_REFERENCIAS = [
  "Autor. Título do Livro. Editora, Ano.",
  "Autor. Título do Artigo. Revista, Ano.",
  "Site oficial consultado (com data de acesso).",
];


export function buildWorkPrompt(size: WorkSize, tema: string, disciplina: string) {
  return [
    `Elabore um trabalho académico completo com aproximadamente ${size.pages} páginas.`,
    `Tema: ${tema || "(indique o tema)"}.`,
    disciplina ? `Disciplina/Curso: ${disciplina}.` : "",
    "",
    "Siga rigorosamente esta estrutura, com títulos numerados:",
    ...size.structure.map((s, i) => `${i + 1}. ${s}`),
    "",
    "Escreva em português de Moçambique, com linguagem académica clara, parágrafos desenvolvidos e conteúdo suficiente para o número de páginas indicado. Inclua referências bibliográficas reais e bem formatadas.",
  ]
    .filter(Boolean)
    .join("\n");
}
