CREATE TABLE public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tema text NOT NULL,
  curso text NOT NULL DEFAULT '',
  descricao text NOT NULL DEFAULT '',
  pages integer NOT NULL DEFAULT 6,
  sections jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'rascunho',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT ALL ON public.documents TO service_role;

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own documents"
  ON public.documents FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER documents_set_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.history_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL,
  title text NOT NULL,
  content text,
  href text,
  file_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.history_items TO authenticated;
GRANT ALL ON public.history_items TO service_role;

ALTER TABLE public.history_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own history"
  ON public.history_items FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER history_items_set_updated_at
  BEFORE UPDATE ON public.history_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX history_items_user_created_idx ON public.history_items (user_id, created_at DESC);
CREATE INDEX documents_user_created_idx ON public.documents (user_id, created_at DESC);