import { z } from "zod";

export const publishProductSchema = z.object({
  titulo: z.string().min(5).max(160),
  descricao: z.string().max(2000).default(""),
  disciplina: z.string().min(2).max(60),
  nivel_ensino: z.enum(["secundario", "universidade", "instituto"]),
  tipo: z.enum(["ebook", "modulo_exame", "teste"]),
  preco_base: z.number().min(0).max(100000),
  paginas: z.number().int().min(0).max(5000).default(0),
  ficheiro_url: z.string().max(500).nullable().default(null),
});
export type PublishProductInput = z.infer<typeof publishProductSchema>;

export const buySchema = z.object({
  productId: z.string().uuid(),
  phone: z.string().min(9).max(20),
});
export type BuyInput = z.infer<typeof buySchema>;

export const moderateSchema = z.object({
  productId: z.string().uuid(),
  aprovar: z.boolean(),
  motivo: z.string().max(500).optional(),
});
export type ModerateInput = z.infer<typeof moderateSchema>;

export const payoutSchema = z.object({
  amount: z.number().min(50).max(1000000),
  phone: z.string().min(9).max(20),
});
export type PayoutInput = z.infer<typeof payoutSchema>;
