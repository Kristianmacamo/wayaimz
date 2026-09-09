/** Marketplace educacional — lógica de servidor. */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { calcularVenda, motivoBloqueio } from "./marketplace";
import type { PublishProductInput, BuyInput, PayoutInput } from "./marketplace.schemas";
import { c2bPayment, generateReference, isMpesaLive, isMpesaMsisdn, normalizeMsisdn } from "./mpesa.server";

async function nomeDoUtilizador(userId: string) {
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("nome, apelido")
    .eq("id", userId)
    .maybeSingle();
  return `${data?.nome ?? "Utilizador"} ${data?.apelido ?? ""}`.trim();
}

export async function publishProduct(userId: string, input: PublishProductInput) {
  const bloqueio = motivoBloqueio(`${input.titulo} ${input.descricao} ${input.disciplina}`);
  if (bloqueio) return { ok: false as const, message: bloqueio, productId: null };

  const author_name = await nomeDoUtilizador(userId);
  const { data, error } = await supabaseAdmin
    .from("mk_products")
    .insert({
      author_id: userId,
      author_name,
      titulo: input.titulo,
      descricao: input.descricao,
      disciplina: input.disciplina,
      nivel_ensino: input.nivel_ensino,
      tipo: input.tipo,
      preco_base: input.preco_base,
      paginas: input.paginas,
      ficheiro_url: input.ficheiro_url,
      status: "pendente",
    })
    .select("id")
    .single();

  if (error || !data) return { ok: false as const, message: "Não foi possível publicar o material.", productId: null };
  return {
    ok: true as const,
    message: "Material submetido. Fica visível na loja assim que for aprovado.",
    productId: data.id,
  };
}

export async function buyProduct(userId: string, input: BuyInput) {
  const msisdn = normalizeMsisdn(input.phone);
  if (!msisdn) return { ok: false as const, message: "Número inválido. Use um número moçambicano, ex.: 84 123 4567.", saleId: null, status: "falhado" as const };
  if (!isMpesaMsisdn(msisdn)) return { ok: false as const, message: "O M-Pesa só aceita números Vodacom (84 ou 85).", saleId: null, status: "falhado" as const };

  const { data: produto } = await supabaseAdmin
    .from("mk_products")
    .select("id, titulo, preco_base, status, author_id")
    .eq("id", input.productId)
    .maybeSingle();

  if (!produto || produto.status !== "aprovado") {
    return { ok: false as const, message: "Material indisponível.", saleId: null, status: "falhado" as const };
  }

  const b = calcularVenda(Number(produto.preco_base));
  const referencia = generateReference();
  const buyer_name = await nomeDoUtilizador(userId);

  const { data: venda, error } = await supabaseAdmin
    .from("mk_sales")
    .insert({
      product_id: produto.id,
      buyer_id: userId,
      buyer_name,
      author_id: produto.author_id,
      preco_base: b.precoBase,
      valor_iva: b.valorIva,
      valor_com_iva: b.valorComIva,
      comissao_plataforma: b.comissaoPlataforma,
      valor_liquido_autor: b.valorLiquidoAutor,
      numero_telefone: msisdn,
      referencia_mpesa: referencia,
      status_pagamento: "a_processar",
    })
    .select("id")
    .single();

  if (error || !venda) {
    return { ok: false as const, message: "Não foi possível registar a compra.", saleId: null, status: "falhado" as const };
  }

  const result = await c2bPayment({
    amount: b.valorComIva,
    msisdn,
    reference: referencia,
    thirdPartyReference: referencia,
  });

  const pendente = !result.ok && result.code === "INS-9";
  const status = result.ok ? "confirmado" : pendente ? "a_processar" : "falhado";
  const teste = !isMpesaLive();

  await supabaseAdmin
    .from("mk_sales")
    .update({
      status_pagamento: status,
      mpesa_transaction_id: result.transactionId,
      erro_mensagem: result.ok ? (teste ? "TESTE (sandbox): sem dinheiro real." : null) : `${result.code}: ${result.message}`,
    })
    .eq("id", venda.id);

  return {
    ok: result.ok,
    saleId: venda.id,
    status,
    message: result.ok
      ? teste
        ? "Pagamento de TESTE concluído (sandbox). O material foi libertado para demonstração; nenhum dinheiro real foi movimentado."
        : "Pagamento confirmado! O material já está em Os meus materiais."
      : pendente
        ? "Pedido enviado para o seu telemóvel. Confirme com o PIN M-Pesa; a compra é libertada assim que a Vodacom confirmar."
        : result.message,
  };
}

export async function moderateProduct(productId: string, aprovar: boolean, motivo?: string) {
  const { error } = await supabaseAdmin
    .from("mk_products")
    .update({ status: aprovar ? "aprovado" : "rejeitado", rejeicao_motivo: aprovar ? null : (motivo ?? "Fora das categorias educacionais.") })
    .eq("id", productId);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function requestPayout(userId: string, input: PayoutInput) {
  const { data: vendas } = await supabaseAdmin
    .from("mk_sales")
    .select("valor_liquido_autor")
    .eq("author_id", userId)
    .eq("status_pagamento", "confirmado");
  const ganho = (vendas ?? []).reduce((s, v) => s + Number(v.valor_liquido_autor), 0);

  const { data: pagos } = await supabaseAdmin
    .from("mk_payouts")
    .select("amount_mt")
    .eq("author_id", userId)
    .neq("status", "rejeitado");
  const levantado = (pagos ?? []).reduce((s, p) => s + Number(p.amount_mt), 0);

  const saldo = Math.round((ganho - levantado) * 100) / 100;
  if (input.amount > saldo) {
    return { ok: false as const, message: `Saldo insuficiente. Disponível: ${saldo.toFixed(2)} MT.` };
  }

  const { error } = await supabaseAdmin.from("mk_payouts").insert({
    author_id: userId,
    amount_mt: input.amount,
    numero_telefone: input.phone,
    status: "pendente",
  });
  if (error) return { ok: false as const, message: "Não foi possível registar o pedido." };
  return { ok: true as const, message: "Pedido de levantamento registado. Será processado pela plataforma." };
}
