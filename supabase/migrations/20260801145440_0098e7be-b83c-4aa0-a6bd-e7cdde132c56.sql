-- 1. Limpar fluxo manual antigo
DROP FUNCTION IF EXISTS public.approve_payment(uuid);
DROP FUNCTION IF EXISTS public.reject_payment(uuid);

ALTER TABLE public.affiliate_commissions DROP CONSTRAINT IF EXISTS affiliate_commissions_payment_id_fkey;
DROP TABLE IF EXISTS public.payments CASCADE;

-- 2. Planos como texto (substituem os antigos)
ALTER TABLE public.profiles ALTER COLUMN current_plan DROP DEFAULT;
ALTER TABLE public.profiles ALTER COLUMN current_plan TYPE text USING current_plan::text;
UPDATE public.profiles SET current_plan = 'free' WHERE current_plan NOT IN ('free','semanal','semanal_premium','mensal_premium');
ALTER TABLE public.profiles ALTER COLUMN current_plan SET DEFAULT 'free';
ALTER TABLE public.profiles ADD CONSTRAINT profiles_current_plan_check
  CHECK (current_plan IN ('free','semanal','semanal_premium','mensal_premium'));

-- 3. Pagamentos M-Pesa
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number text NOT NULL,
  amount numeric(10,2) NOT NULL CHECK (amount > 0),
  plan text NOT NULL CHECK (plan IN ('semanal','semanal_premium','mensal_premium')),
  provider text NOT NULL DEFAULT 'mpesa',
  transaction_id text,
  conversation_id text,
  payment_reference text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','a_processar','concluido','falhado')),
  error_message text,
  api_response jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own payments" ON public.payments
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER payments_updated_at BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX payments_user_idx ON public.payments(user_id, created_at DESC);
CREATE INDEX payments_status_idx ON public.payments(status);

-- 4. Assinaturas
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan text NOT NULL CHECK (plan IN ('semanal','semanal_premium','mensal_premium')),
  amount numeric(10,2) NOT NULL,
  status text NOT NULL DEFAULT 'activa' CHECK (status IN ('activa','expirada','cancelada')),
  start_date timestamptz NOT NULL DEFAULT now(),
  end_date timestamptz NOT NULL,
  payment_reference text,
  payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own subscriptions" ON public.subscriptions
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER subscriptions_updated_at BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX subscriptions_user_idx ON public.subscriptions(user_id, end_date DESC);

-- 5. Comissões de afiliado voltam a apontar para os pagamentos
ALTER TABLE public.affiliate_commissions
  ADD CONSTRAINT affiliate_commissions_payment_id_fkey
  FOREIGN KEY (payment_id) REFERENCES public.payments(id) ON DELETE CASCADE;

-- 6. Expiração automática + verificação de assinatura activa
CREATE OR REPLACE FUNCTION public.expire_subscriptions()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  WITH expired AS (
    UPDATE public.subscriptions SET status = 'expirada'
    WHERE status = 'activa' AND end_date < now()
    RETURNING user_id
  )
  UPDATE public.profiles p SET current_plan = 'free', plan_expires_at = NULL
  WHERE p.id IN (SELECT user_id FROM expired)
    AND NOT EXISTS (
      SELECT 1 FROM public.subscriptions s
      WHERE s.user_id = p.id AND s.status = 'activa' AND s.end_date > now()
    );
$$;

CREATE OR REPLACE FUNCTION public.has_active_subscription(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = _user_id AND status = 'activa' AND end_date > now()
  );
$$;

GRANT EXECUTE ON FUNCTION public.has_active_subscription(uuid) TO authenticated;