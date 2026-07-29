import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { generateText } from "ai";

const MODEL = "google/gemini-3.6-flash";

const STYLE = `Escreve em português de Moçambique, com linguagem académica clara.
REGRAS DE FORMATAÇÃO OBRIGATÓRIAS:
- NUNCA uses LaTeX. É proibido escrever $, $$, \\frac, \\sqrt, \\Delta, \\cdot, \\left, \\right.
- Escreve a matemática em texto normal com símbolos reais: x² − 6x + 9 = 0, Δ = b² − 4ac, x = (−b ± √Δ) / 2a, π, ÷, ×, ≤, ≥.
- Cada fórmula isolada deve ficar num bloco de código markdown (três plicas) para aparecer numa caixa própria.
- Usa títulos (##), subtítulos (###) e parágrafos. NUNCA uses linhas horizontais (---) para separar secções.
- Respostas longas, completas e bem organizadas.`;

type AiInput = { prompt: string; system?: string; maxTokens?: number };

async function runAi({ prompt, system }: AiInput) {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Serviço de IA indisponível.");
  const gateway = createLovableAiGatewayProvider(key);
  const { text } = await generateText({
    model: gateway(MODEL),
    system: `${system ?? "És o Way Estudantes AI, assistente académico."}\n\n${STYLE}`,
    prompt,
  });
  return text;
}

async function spendCredits(
  supabase: { from: (t: string) => any },
  userId: string,
  cost: number,
) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("credits, suspended, current_plan")
    .eq("id", userId)
    .maybeSingle();
  if (!profile) throw new Error("Perfil não encontrado.");
  if (profile.suspended) throw new Error("Conta suspensa.");
  const credits = profile.credits ?? 0;
  if (credits < cost) throw new Error("Sem créditos suficientes. Adquira um plano para continuar.");
  await supabase.from("profiles").update({ credits: credits - cost }).eq("id", userId);
  return profile.current_plan as string;
}

async function logHistory(
  supabase: { from: (t: string) => any },
  userId: string,
  item: { kind: string; title: string; content?: string; href?: string; file_url?: string },
) {
  await supabase.from("history_items").insert({ user_id: userId, ...item });
}

/** Responde a um TPC (texto e/ou ficheiro já transcrito no cliente). */
export const answerTpc = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { question: string; context?: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await spendCredits(supabase, userId, 1);
    const text = await runAi({
      system: "És um explicador de TPC para estudantes moçambicanos. Resolves passo a passo, com muita clareza.",
      prompt: [
        "Resolve o seguinte trabalho para casa passo a passo.",
        "Estrutura a resposta com: Enunciado, Dados, Resolução passo a passo, Resultado final e Explicação simples.",
        data.context ? `\nConteúdo do ficheiro enviado pelo estudante:\n${data.context.slice(0, 12000)}` : "",
        `\nPergunta do estudante:\n${data.question}`,
      ].join("\n"),
    });
    await logHistory(supabase, userId, { kind: "tpc", title: data.question.slice(0, 120), content: text, href: "/tpc" });
    return { text };
  });

/** Gera um trabalho académico completo e guarda-o como documento. */
export const generateWork = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { tema: string; curso: string; descricao: string; pages: number }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await spendCredits(supabase, userId, 5);

    const SECTIONS = [
      "Capa",
      "Índice",
      "Introdução",
      "Objetivos",
      "Desenvolvimento",
      "Conclusão",
      "Referências Bibliográficas",
    ];

    const results = await Promise.all(
      SECTIONS.map(async (section) => {
        const body = await runAi({
          system: "És um professor universitário que redige trabalhos académicos completos em português de Moçambique, seguindo a norma APA 7.",
          prompt: [
            `Trabalho académico com aproximadamente ${data.pages} páginas.`,
            `Tema: ${data.tema}`,
            `Curso/Disciplina: ${data.curso || "não indicado"}`,
            `Descrição pedida pelo estudante: ${data.descricao || "não indicada"}`,
            "",
            `Escreve APENAS a secção "${section}" do trabalho, com conteúdo completo e pronto a entregar.`,
            section === "Capa"
              ? "Na capa apresenta: nome da instituição, curso, tema, nome do estudante (deixa ___), docente (deixa ___), local e ano."
              : "",
            section === "Índice"
              ? "Lista estas secções numeradas, sem números de página inventados: Introdução, Objetivos, Desenvolvimento, Conclusão, Referências Bibliográficas."
              : "",
            section === "Desenvolvimento"
              ? `Divide o desenvolvimento em 3 capítulos com subtítulos (###) e conteúdo extenso, adequado a ${data.pages} páginas.`
              : "",
            section === "Referências Bibliográficas" ? "Usa exclusivamente o formato APA 7." : "",
            "Não escrevas o título da secção — apenas o conteúdo.",
          ]
            .filter(Boolean)
            .join("\n"),
        });
        return { title: section, body };
      }),
    );

    const { data: doc, error } = await supabase
      .from("documents")
      .insert({
        user_id: userId,
        tema: data.tema,
        curso: data.curso,
        descricao: data.descricao,
        pages: data.pages,
        sections: results,
        status: "gerado",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    await logHistory(supabase, userId, {
      kind: "trabalho",
      title: data.tema,
      content: `Trabalho de ${data.pages} páginas`,
      href: `/documento/${doc.id}`,
    });

    return { id: doc.id as string };
  });

/** Gera um teste ou exame completo com correcção e explicação. */
export const generateAssessment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { tipo: "teste" | "exame"; tema: string; nivel: string; questoes: number }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await spendCredits(supabase, userId, 3);
    const isExame = data.tipo === "exame";
    const text = await runAi({
      system: "És um professor que elabora testes e exames com correcção detalhada.",
      prompt: [
        `Cria um ${isExame ? "exame completo" : "teste"} sobre: ${data.tema}.`,
        `Nível: ${data.nivel || "ensino secundário"}. Número de perguntas: ${data.questoes}.`,
        "",
        "Organiza assim, com títulos:",
        "## Perguntas — enunciados numerados (mistura escolha múltipla e desenvolvimento).",
        isExame ? "## Resolução — resolução completa de cada pergunta." : "## Respostas — resposta correta de cada pergunta.",
        "## Correção — critérios e cotação de cada pergunta.",
        isExame ? "## Nota — escala de classificação de 0 a 20 valores." : "## Pontuação — total e escala de 0 a 20 valores.",
        "## Explicação — explicação didática dos conceitos avaliados.",
      ].join("\n"),
    });
    await logHistory(supabase, userId, {
      kind: data.tipo,
      title: `${isExame ? "Exame" : "Teste"}: ${data.tema}`,
      content: text,
      href: isExame ? "/exames" : "/testes",
    });
    return { text };
  });

/** Explicação completa de uma fórmula (usada na página da fórmula). */
export const explainFormula = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { name: string; formula: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await spendCredits(supabase, userId, 1);
    const text = await runAi({
      system: "És um professor de matemática que explica fórmulas de forma muito clara.",
      prompt: `Explica a fórmula "${data.name}" (${data.formula}) com as secções: Introdução, Conceito, Quando utilizar, Fórmula, Explicação das variáveis, Exemplo resolvido, Exercício, Resposta, Dicas e Resumo.`,
    });
    await logHistory(supabase, userId, { kind: "formula", title: data.name, content: text, href: "/formulas" });
    return { text };
  });
