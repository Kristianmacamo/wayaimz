# Integração M-Pesa (API oficial) — Way Estudantes AI

Pagamento automático por M-Pesa: o estudante escolhe o plano, introduz o número, confirma no telemóvel e o acesso é activado na hora. Ambiente **produção (live)** desde o início.

## Antes de começar

Preciso de 3 segredos (guardados como Secrets, nunca no frontend):

- `MPESA_API_KEY`
- `MPESA_PUBLIC_KEY`
- `MPESA_SERVICE_PROVIDER_CODE`

Vou pedi-los na primeira etapa da implementação. Sem eles a integração não pode ser testada.

## Planos (substituem os actuais)

| Plano | Preço | Duração |
|---|---|---|
| Semanal | 65 MT | 7 dias |
| Semanal Premium | 180 MT | 7 dias |
| Mensal Premium | 300 MT | 30 dias |

O plano Gratuito deixa de existir como plano pago; os utilizadores sem assinatura activa ficam sem acesso às funcionalidades premium (mantêm os créditos que já têm).

## Base de dados

- **subscriptions** (nova): utilizador, plano, valor, estado (activa / expirada / cancelada), data de início, data de fim, referência de pagamento.
- **payments** (reescrita): utilizador, número de telefone, valor, fornecedor, id da transação M-Pesa, referência, estado (pendente / a processar / concluído / falhado), resposta da API guardada para auditoria.
- Regras de acesso: cada utilizador só vê os seus pagamentos e assinaturas; o administrador vê tudo. Só o servidor pode criar ou alterar registos de pagamento.
- Função automática que marca assinaturas como expiradas quando passa a data de fim, e helper `has_active_subscription` usado pelas restantes regras.
- Remoção do fluxo manual: colunas de comprovativo/código, aprovação manual e o bucket `mpesa-proofs` deixam de ser usados.

## Fluxo de pagamento

```text
Utilizador escolhe plano
  -> introduz número M-Pesa (84/85…)
  -> backend cria pagamento "a processar"
  -> backend chama a API C2B do M-Pesa (assinada com a Public Key)
  -> utilizador confirma no telemóvel
  -> backend valida a resposta (código INS-0 = sucesso)
  -> grava transaction_id + resposta completa
  -> cria/renova a assinatura e activa o acesso
  -> recibo + notificação de sucesso
```

Erros da API são traduzidos para mensagens claras em português (saldo insuficiente, número inválido, tempo esgotado, transação duplicada) com botão **Tentar novamente**. Enquanto decorre, o ecrã mostra o indicador "A aguardar confirmação no telemóvel".

## Ecrãs

**Planos / Pagamento** — cartões dos 3 planos, botão "Pagar com M-Pesa", campo de número com validação moçambicana, estado de processamento animado, recibo no fim.

**Painel do utilizador** — plano actual, estado da assinatura, dias restantes, data de expiração, botão Renovar, histórico de pagamentos com recibo descarregável.

**Painel do administrador** — total de utilizadores, assinaturas activas, total de pagamentos, receita total / diária / mensal / anual, contagens de pendentes / concluídos / falhados, pesquisa por utilizador, exportação Excel e PDF.

Interface em tema escuro, responsiva (telemóvel, tablet, computador), com animações nos botões e estados de carregamento em todas as acções.

## Detalhes técnicos

- Toda a comunicação com o M-Pesa vive no servidor: `src/lib/mpesa.server.ts` (cliente HTTP, encriptação RSA da API Key com a Public Key para gerar o Bearer, mapeamento de códigos de erro) e `src/lib/payments.functions.ts` (`createMpesaPayment`, `getMySubscription`, `listMyPayments`, `adminDashboardStats`) via `createServerFn` com `requireSupabaseAuth`. Não são criadas Edge Functions — o runtime TanStack já é o backend.
- Callback opcional do M-Pesa em `src/routes/api/public/mpesa-callback.ts`, com verificação da origem/assinatura antes de qualquer escrita; o resultado síncrono da C2B continua a ser a fonte principal.
- Camada de tipos e catálogo de planos em `src/lib/plans.ts` (reescrito) + hooks `useSubscription` / `useMpesaPayment`.
- Escritas privilegiadas com o cliente admin carregado dentro do handler, depois de validar a resposta da API.
- Créditos e comissões de afiliado (10%) continuam a ser atribuídos, agora no momento da confirmação automática.

## Fora do âmbito

Reembolsos automáticos e débito recorrente (o M-Pesa C2B exige confirmação manual do utilizador em cada pagamento) — a renovação é feita pelo botão Renovar.
