CREATE TYPE public.mk_level AS ENUM ('secundario','universidade','instituto');
CREATE TYPE public.mk_type AS ENUM ('ebook','modulo_exame','teste');
CREATE TYPE public.mk_status AS ENUM ('pendente','aprovado','rejeitado');
CREATE TYPE public.mk_pay_status AS ENUM ('pendente','a_processar','confirmado','falhado');

CREATE TABLE public.mk_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  author_name text NOT NULL DEFAULT 'Autor',
  titulo text NOT NULL,
  descricao text NOT NULL DEFAULT '',
  disciplina text NOT NULL,
  nivel_ensino public.mk_level NOT NULL,
  tipo public.mk_type NOT NULL,
  preco_base numeric NOT NULL CHECK (preco_base >= 0),
  ficheiro_url text,
  paginas integer NOT NULL DEFAULT 0,
  status public.mk_status NOT NULL DEFAULT 'pendente',
  rejeicao_motivo text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mk_products TO authenticated;
GRANT ALL ON public.mk_products TO service_role;
ALTER TABLE public.mk_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ver materiais aprovados" ON public.mk_products FOR SELECT TO authenticated
  USING (status = 'aprovado' OR auth.uid() = author_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "autor cria material" ON public.mk_products FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = author_id);
CREATE POLICY "autor edita material" ON public.mk_products FOR UPDATE TO authenticated
  USING (auth.uid() = author_id OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (auth.uid() = author_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "autor apaga material" ON public.mk_products FOR DELETE TO authenticated
  USING (auth.uid() = author_id OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER mk_products_updated BEFORE UPDATE ON public.mk_products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.mk_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.mk_products(id) ON DELETE CASCADE,
  buyer_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  buyer_name text NOT NULL DEFAULT 'Estudante',
  author_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  preco_base numeric NOT NULL,
  valor_iva numeric NOT NULL,
  valor_com_iva numeric NOT NULL,
  comissao_plataforma numeric NOT NULL,
  valor_liquido_autor numeric NOT NULL,
  metodo_pagamento text NOT NULL DEFAULT 'mpesa',
  numero_telefone text,
  mpesa_transaction_id text,
  referencia_mpesa text,
  status_pagamento public.mk_pay_status NOT NULL DEFAULT 'pendente',
  erro_mensagem text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.mk_sales TO authenticated;
GRANT ALL ON public.mk_sales TO service_role;
ALTER TABLE public.mk_sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ver vendas proprias" ON public.mk_sales FOR SELECT TO authenticated
  USING (auth.uid() = buyer_id OR auth.uid() = author_id OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER mk_sales_updated BEFORE UPDATE ON public.mk_sales
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.mk_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount_mt numeric NOT NULL CHECK (amount_mt > 0),
  numero_telefone text,
  status text NOT NULL DEFAULT 'pendente',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.mk_payouts TO authenticated;
GRANT ALL ON public.mk_payouts TO service_role;
ALTER TABLE public.mk_payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ver levantamentos proprios" ON public.mk_payouts FOR SELECT TO authenticated
  USING (auth.uid() = author_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "pedir levantamento" ON public.mk_payouts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = author_id);
CREATE POLICY "admin actualiza levantamento" ON public.mk_payouts FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER mk_payouts_updated BEFORE UPDATE ON public.mk_payouts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX mk_products_status_idx ON public.mk_products(status);
CREATE INDEX mk_sales_product_idx ON public.mk_sales(product_id);

-- Dados fictícios de demonstração
INSERT INTO public.mk_products (id, author_name, titulo, descricao, disciplina, nivel_ensino, tipo, preco_base, paginas, status, created_at) VALUES
('11111111-1111-4111-8111-000000000001','Prof. Amâncio Matola','Módulo de Exame de Matemática 12ª Classe','Resolução comentada dos exames nacionais dos últimos 5 anos.','Matemática','secundario','modulo_exame',150,84,'aprovado', now() - interval '40 days'),
('11111111-1111-4111-8111-000000000002','Prof. Amâncio Matola','Ebook de Física — Mecânica e Ondas','Teoria resumida e 120 exercícios resolvidos.','Física','secundario','ebook',120,96,'aprovado', now() - interval '32 days'),
('11111111-1111-4111-8111-000000000003','Dra. Ilda Chirindza','Testes de Biologia 11ª Classe','Colectânea de 20 testes com chave de correcção.','Biologia','secundario','teste',80,45,'aprovado', now() - interval '25 days'),
('11111111-1111-4111-8111-000000000004','Eng. Salomão Bila','Módulo de Contabilidade Geral I','Manual completo para o 1º ano universitário.','Contabilidade','universidade','ebook',250,160,'aprovado', now() - interval '20 days'),
('11111111-1111-4111-8111-000000000005','Eng. Salomão Bila','Exercícios de Electrotecnia — Instituto Técnico','Fichas práticas com soluções passo a passo.','Electrotecnia','instituto','teste',95,52,'aprovado', now() - interval '15 days'),
('11111111-1111-4111-8111-000000000006','Dra. Ilda Chirindza','Módulo de Exame de Química Geral','Preparação para exames de admissão universitária.','Química','universidade','modulo_exame',180,110,'aprovado', now() - interval '10 days'),
('11111111-1111-4111-8111-000000000007','Prof. Nélio Cuamba','Ebook de Introdução ao Direito','Noções fundamentais para estudantes do 1º ano.','Direito','universidade','ebook',220,140,'pendente', now() - interval '4 days'),
('11111111-1111-4111-8111-000000000008','Prof. Nélio Cuamba','Testes de Informática Básica','Avaliações práticas para institutos técnicos.','Informática','instituto','teste',70,38,'pendente', now() - interval '2 days');

INSERT INTO public.mk_sales (product_id, buyer_name, preco_base, valor_iva, valor_com_iva, comissao_plataforma, valor_liquido_autor, numero_telefone, mpesa_transaction_id, referencia_mpesa, status_pagamento, created_at)
SELECT p.id, b.nome, p.preco_base,
  round(p.preco_base * 0.16, 2),
  round(p.preco_base * 1.16, 2),
  round(p.preco_base * 1.16 * 0.10, 2),
  round(p.preco_base * 1.16 * 0.90, 2),
  b.tel, b.txn, b.ref, b.st::public.mk_pay_status, now() - (b.dias || ' days')::interval
FROM public.mk_products p
JOIN (VALUES
  ('11111111-1111-4111-8111-000000000001'::uuid,'Carla Muianga','258841234567','TXN0001A','WAYMK0001','confirmado',30),
  ('11111111-1111-4111-8111-000000000001'::uuid,'Jorge Sitoe','258851112233','TXN0002A','WAYMK0002','confirmado',22),
  ('11111111-1111-4111-8111-000000000002'::uuid,'Ana Macuácua','258842223344','TXN0003A','WAYMK0003','confirmado',18),
  ('11111111-1111-4111-8111-000000000003'::uuid,'Hélder Tembe','258843334455','TXN0004A','WAYMK0004','confirmado',14),
  ('11111111-1111-4111-8111-000000000004'::uuid,'Rita Nhaca','258854445566','TXN0005A','WAYMK0005','confirmado',9),
  ('11111111-1111-4111-8111-000000000004'::uuid,'Domingos Zita','258845556677','TXN0006A','WAYMK0006','pendente',3),
  ('11111111-1111-4111-8111-000000000005'::uuid,'Sónia Chissano','258846667788','TXN0007A','WAYMK0007','confirmado',6),
  ('11111111-1111-4111-8111-000000000006'::uuid,'Elton Mabjaia','258857778899','TXN0008A','WAYMK0008','falhado',2)
) AS b(pid,nome,tel,txn,ref,st,dias) ON b.pid = p.id;