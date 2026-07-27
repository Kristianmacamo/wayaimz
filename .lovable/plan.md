## Objetivo

Atualizar o Way Estudantes AI com uma estrutura de navegação moderna (side menu, tab bar, FAB, bottom sheet, cartões em grid), uma biblioteca de Fórmulas com explicação e exemplo, e uma área de Trabalhos Académicos com escolha de 6, 12 ou 18 páginas.

## 1. Página inicial

- Novo bloco de boas-vindas: "Bem-vindo ao Way Estudantes AI" com o texto de apresentação (explicações passo a passo, fórmulas, trabalhos académicos, ferramentas inteligentes).
- Grid de categorias em cartões retangulares: Geometria, Álgebra, Estatística, Contabilidade, Gestão, Economia, Programação, Trabalhos Académicos — cada cartão leva ao chat/fórmulas com contexto da matéria.
- Botões existentes (Criar Conta / Entrar / Experimentar) mantidos.

## 2. Navegação

**Menu lateral (desktop e gaveta no telemóvel)**
Início · Matemática · Fórmulas · Trabalhos Académicos · Explicações · Exercícios Práticos · Planos · Perfil do Estudante · Configurações
(mantém-se acesso a Pagamentos, Afiliados, Suporte e Admin numa secção secundária do menu)

**Tab bar inferior (só telemóvel)**
Início · Fórmulas · Praticar · Trabalhos · Conta

**FAB (botão flutuante, canto inferior direito)**
Abre um bottom sheet com ações rápidas: Carregar Foto · Resolver Exercício · Criar Resumo · Gerar Introdução · Ver Fórmulas. Cada ação abre o chat com o pedido pré-preenchido (ou o seletor de imagem, conforme o plano).

**Menu de três pontos nos cartões**
Guardar · Partilhar · Editar · Apagar · Ver detalhes (guardar usa a base de dados do utilizador; partilhar usa link/WhatsApp).

## 3. Fórmulas

Nova página `/formulas` com fórmulas por categoria, cada uma em cartão com: fórmula, explicação dos símbolos e exemplo prático resolvido. Conteúdo inicial de Geometria:
- Área do triângulo: A = (b × h) ÷ 2 — exemplo 10 e 6 → 30
- Área do trapézio: A = [(B + b) × h] ÷ 2 — exemplo 12, 8, 5 → 50
- Área do paralelogramo: A = b × h — exemplo 9 × 4 → 36
- Área do círculo: A = π × r² — exemplo r = 7 → π × 49

Cada fórmula tem botão "Pedir explicação à IA" e "Ver exercícios".

## 4. Trabalhos Académicos

Página `/trabalhos` reformulada: escolher tema + tamanho do trabalho.
- 6 páginas: capa, índice, introdução, desenvolvimento, conclusão, referências. Para TPCs e relatórios curtos.
- 12 páginas: acrescenta objetivos, revisão teórica, exemplos práticos, apêndices. Para módulos e seminários.
- 18 páginas: acrescenta problema de pesquisa, objetivos geral/específicos, metodologia, fundamentação teórica, análise e discussão. Para projetos finais e estágios.

Inclui blocos explicativos com modelo de introdução, modelo de conclusão, formato de referências bibliográficas e o que colocar em apêndices. Ao gerar, a IA recebe a estrutura escolhida como instrução; download de PDF permanece exclusivo do plano Premium.

## 5. Planos

Atualizar os textos dos planos com as vantagens indicadas, mantendo os preços atuais (65 MT e 299 MT) e o fluxo M-Pesa manual:
- Semanal/Básico: até 3 fotos por semana, exercícios básicos, acesso às fórmulas, explicações simples.
- Premium: até 10 fotos, resolução avançada, criação automática de trabalhos, resumos inteligentes, prioridade nas respostas.

Cada plano ganha uma ilustração gerada (estudante com telemóvel; estudante com laptop).

## 6. Configurações e Perfil

Nova página `/configuracoes`: dados da conta, foto/emoji, notificações, tema, sair. Perfil do Estudante mostra créditos, plano, progresso.

## Notas técnicas

- Novas rotas: `_app.formulas.tsx`, `_app.matematica.tsx`, `_app.explicacoes.tsx`, `_app.configuracoes.tsx`; `_app.trabalhos.tsx` reescrita.
- Componentes novos: `AppTabBar`, `QuickActionsFab` (Sheet do shadcn), `CategoryGrid`, `ContentCard` (com DropdownMenu de 3 pontos), `FormulaCard`.
- Dados de fórmulas e estruturas de trabalho em `src/lib/formulas.ts` e `src/lib/trabalhos.ts` (estáticos, sem base de dados).
- Guardar cartões exige uma tabela nova `saved_items` com RLS por utilizador e GRANTs.
- Layout `_app.tsx` passa a incluir tab bar + FAB com padding inferior no telemóvel; tudo usa os tokens semânticos existentes (azul/verde académico).
