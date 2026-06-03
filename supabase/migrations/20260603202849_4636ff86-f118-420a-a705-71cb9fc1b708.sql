
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.education_level AS ENUM ('secundario', 'superior');
CREATE TYPE public.plan_tier AS ENUM ('free', 'basico', 'premium', 'completo');
CREATE TYPE public.payment_status AS ENUM ('pendente', 'aprovado', 'rejeitado');
CREATE TYPE public.payment_method AS ENUM ('mpesa', 'paypal');
CREATE TYPE public.message_role AS ENUM ('user', 'assistant');

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  apelido TEXT NOT NULL,
  telefone TEXT NOT NULL,
  email TEXT NOT NULL,
  nivel education_level NOT NULL DEFAULT 'secundario',
  avatar_url TEXT,
  emoji TEXT,
  affiliate_code TEXT NOT NULL UNIQUE,
  referred_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  free_chats_used INTEGER NOT NULL DEFAULT 0,
  current_plan plan_tier NOT NULL DEFAULT 'free',
  plan_expires_at TIMESTAMPTZ,
  suspended BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- ============ CONVERSATIONS & MESSAGES (one continuous conversation per user) ============
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role message_role NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_messages_conversation ON public.messages(conversation_id, created_at);

GRANT SELECT, INSERT, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- ============ PAYMENTS ============
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan plan_tier NOT NULL,
  amount_mt NUMERIC(10,2) NOT NULL,
  method payment_method NOT NULL,
  status payment_status NOT NULL DEFAULT 'pendente',
  reference TEXT,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_payments_user ON public.payments(user_id, created_at DESC);
CREATE INDEX idx_payments_status ON public.payments(status, created_at DESC);

GRANT SELECT, INSERT ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- ============ AFFILIATE COMMISSIONS ============
CREATE TABLE public.affiliate_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  amount_mt NUMERIC(10,2) NOT NULL,
  paid BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_commissions_affiliate ON public.affiliate_commissions(affiliate_id, created_at DESC);

GRANT SELECT ON public.affiliate_commissions TO authenticated;
GRANT ALL ON public.affiliate_commissions TO service_role;
ALTER TABLE public.affiliate_commissions ENABLE ROW LEVEL SECURITY;

-- ============ POLICIES ============
-- profiles
CREATE POLICY "users view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));

-- user_roles
CREATE POLICY "users view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- conversations
CREATE POLICY "users manage own conversation" ON public.conversations FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- messages
CREATE POLICY "users manage own messages" ON public.messages FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- payments
CREATE POLICY "users view own payments" ON public.payments FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "users create own payments" ON public.payments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- commissions
CREATE POLICY "users view own commissions" ON public.affiliate_commissions FOR SELECT TO authenticated USING (auth.uid() = affiliate_id OR public.has_role(auth.uid(), 'admin'));

-- ============ TRIGGERS ============
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_conversations_updated BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- generate affiliate code
CREATE OR REPLACE FUNCTION public.generate_affiliate_code()
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE code TEXT;
BEGIN
  LOOP
    code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE affiliate_code = code);
  END LOOP;
  RETURN code;
END;
$$;

-- new user handler
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  ref_code TEXT;
  ref_id UUID;
BEGIN
  ref_code := NEW.raw_user_meta_data->>'ref';
  IF ref_code IS NOT NULL AND ref_code <> '' THEN
    SELECT id INTO ref_id FROM public.profiles WHERE affiliate_code = ref_code;
  END IF;

  INSERT INTO public.profiles (id, nome, apelido, telefone, email, nivel, emoji, avatar_url, affiliate_code, referred_by)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', 'Estudante'),
    COALESCE(NEW.raw_user_meta_data->>'apelido', ''),
    COALESCE(NEW.raw_user_meta_data->>'telefone', ''),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'nivel')::education_level, 'secundario'),
    NEW.raw_user_meta_data->>'emoji',
    NEW.raw_user_meta_data->>'avatar_url',
    public.generate_affiliate_code(),
    ref_id
  );

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');

  -- Promote main admin by email
  IF NEW.email = 'cristianonumerique@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
