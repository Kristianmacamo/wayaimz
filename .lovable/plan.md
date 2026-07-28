## Objetivo

Reconstruir o Way Estudantes AI com áreas totalmente separadas (Chat, TPC, Trabalhos, Testes, Exames, Fórmulas), fórmulas apresentadas em formato matemático real e uma interface moderna com histórico e exportação.

## 1. Corrigir a renderização das fórmulas

Hoje o chat usa Markdown simples, por isso o LaTeX (`$`, `\Delta`, `\frac`, `\sqrt`, `\cdot`) aparece como texto cru.

- Adicionar renderização matemática real (KaTeX) a todas as respostas da IA e às páginas de fórmulas: `Δ = b² − 4ac` e frações/raízes aparecem desenhadas, nunca como código.
- Rede de segurança: um conversor que transforma qualquer LaTeX restante em texto legível (`\frac{a}{b}` → `(a) / (b)`, `\sqrt{x}` → `√x`, `\cdot` → `×`, remove `$`).
- Reforçar as instruções da IA para escrever matemática limpa.
- Cada fórmula/bloco de resolução dentro da sua própria caixa, separada por espaço — sem linhas horizontais.

## 2. Chat com IA (página independente)

`/chat` passa a ser só conversa, sem misturar Trabalhos/TPC/Fórmulas.

- Escrever pergunta, carregar fotografia, PDF e Word.
- Fotografia: a IA lê a imagem, reconhece o texto, resolve e explica passo a passo (modelo multimodal).
- PDF/Word: texto extraído e enviado como contexto.
- Histórico de conversas (lista lateral, várias conversas), copiar resposta, regenerar resposta.
- Respostas longas e organizadas com títulos, parágrafos e caixas.

## 3. TPC (`/tpc`)

Página própria: pergunta escrita, fotografia, PDF ou Word; resposta passo a passo, com resultado guardado no histórico. Não abre o chat.

## 4. Trabalhos Académicos (`/trabalhos`)

Sem qualquer ligação ao chat.

- Formulário: Tema, Curso, Descrição (e tamanho 6/12/18 páginas já existente).
- "Gerar Trabalho" abre uma **página de documento** (`/trabalhos/$id`) que gera: Capa, Índice, Introdução, Objetivos, Desenvolvimento (Capítulos 1–3), Conclusão, Referências (APA 7), Apêndices, Anexos.
- No documento: visualizar, editar secções, guardar, exportar PDF e exportar Word (.docx).

## 5. Testes (`/testes`) e Exames (`/exames`)

- Testes: geração automática de perguntas, respostas do aluno, correção, pontuação e explicação.
- Exames: exame completo com perguntas, resolução, nota final e explicação.
- Ambos guardados no histórico.

## 6. Fórmulas (`/formulas` e `/formulas/$id`)

Cada fórmula abre uma página completa com: Introdução, Conceito, Quando utilizar, Fórmula (caixa destacada), Explicação das variáveis, Exemplo resolvido, Exercício, Resposta, Dicas, Resumo.

Conteúdo baseado nas 20 fórmulas mais importantes da matemática (Pitágoras, Bhaskara, áreas, juros simples e compostos, relação fundamental da trigonometria, identidade de Euler, Euler para poliedros, etc.), além das categorias já existentes.

## 7. Interface

Grid layout, menu lateral, tab bar no telemóvel, botão flutuante com bottom sheet, menu de três pontos nos cartões, cartões retangulares, pesquisa inteligente (procura em fórmulas, páginas e histórico), modo claro/escuro e animações suaves.

## 8. Histórico e Perfil

- Histórico único (`/historico`) com perguntas, TPC, trabalhos, testes, exames, fórmulas, documentos, fotografias e PDFs.
- Perfil: fotografia, nome, plano, histórico, favoritos e configurações.

## 9. Rodapé

Contacto, WhatsApp 844772002, e-mail tendigitalmz@gmail.com, Política de Privacidade, Termos de Utilização, Perguntas Frequentes e Sobre o Way Estudantes AI (páginas próprias).

## 10. Regras de plano

- Fotografias e ficheiros (PDF/Word): apenas planos pagos (65 MT e 299 MT). No plano gratuito aparece um aviso a convidar à subscrição.
- Exportar PDF e Word: disponível no Básico (65 MT) e no Premium (299 MT).

## Notas técnicas

- Base de dados: nova tabela `documents` (trabalhos gerados, secções, estado), `history_items` (registo transversal) e reutilização de `saved_items` para favoritos; bucket `uploads` privado para imagens/PDF/Word do utilizador. Tudo com RLS por utilizador e GRANTs.
- Rotas novas: `_app.tpc.tsx`, `_app.historico.tsx`, `_app.formulas.$id.tsx`, `_app.trabalhos.index.tsx`, `_app.trabalhos.$id.tsx`, `privacidade`, `termos`, `faq`, `sobre`.
- Servidor: `createServerFn` separados para gerar trabalho, testes, exames e respostas de TPC (não passam pelo endpoint de chat); `/api/chat` fica exclusivo da conversa e passa a aceitar imagens.
- Renderização: `remark-math` + `rehype-katex` com CSS do KaTeX carregado no `__root.tsx`, mais utilitário `sanitizeMath` para o fallback.
- Exportação: PDF via geração no cliente e Word via ficheiro `.docx` gerado no servidor.
- Créditos: cada geração (trabalho, teste, exame, TPC) desconta créditos como o chat.
