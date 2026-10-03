CREATE TABLE public.shop_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao_curta text NOT NULL DEFAULT '',
  descricao text NOT NULL DEFAULT '',
  beneficios text NOT NULL DEFAULT '',
  o_que_recebe text NOT NULL DEFAULT '',
  preco numeric NOT NULL DEFAULT 0 CHECK (preco >= 0),
  categoria text NOT NULL DEFAULT 'Outros',
  capa_url text,
  destaque boolean NOT NULL DEFAULT false,
  vendas integer NOT NULL DEFAULT 0,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.shop_products TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.shop_products TO authenticated;
GRANT ALL ON public.shop_products TO service_role;
ALTER TABLE public.shop_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ver produtos activos" ON public.shop_products FOR SELECT USING (activo OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin insere produtos" ON public.shop_products FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin edita produtos" ON public.shop_products FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin apaga produtos" ON public.shop_products FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER shop_products_updated BEFORE UPDATE ON public.shop_products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.shop_payment_links (
  product_id uuid PRIMARY KEY REFERENCES public.shop_products(id) ON DELETE CASCADE,
  link text NOT NULL
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shop_payment_links TO authenticated;
GRANT ALL ON public.shop_payment_links TO service_role;
ALTER TABLE public.shop_payment_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin gere links" ON public.shop_payment_links FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.shop_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  whatsapp text NOT NULL DEFAULT '',
  messenger text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.shop_settings TO anon, authenticated;
GRANT INSERT, UPDATE ON public.shop_settings TO authenticated;
GRANT ALL ON public.shop_settings TO service_role;
ALTER TABLE public.shop_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ver contactos" ON public.shop_settings FOR SELECT USING (true);
CREATE POLICY "admin insere contactos" ON public.shop_settings FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin edita contactos" ON public.shop_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
INSERT INTO public.shop_settings (id, whatsapp) VALUES (1, '258844772002') ON CONFLICT DO NOTHING;

CREATE POLICY "capas visiveis" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'shop-covers');
CREATE POLICY "admin envia capas" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'shop-covers' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin actualiza capas" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'shop-covers' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin apaga capas" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'shop-covers' AND public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.get_shop_payment_link(_product_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT l.link FROM public.shop_payment_links l JOIN public.shop_products p ON p.id = l.product_id
  WHERE l.product_id = _product_id AND p.activo
$$;
REVOKE EXECUTE ON FUNCTION public.get_shop_payment_link(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_shop_payment_link(uuid) TO authenticated;