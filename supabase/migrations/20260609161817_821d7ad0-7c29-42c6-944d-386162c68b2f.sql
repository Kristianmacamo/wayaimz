ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS credits integer NOT NULL DEFAULT 100;

UPDATE public.profiles SET credits = 100 WHERE credits IS NULL OR credits = 0;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
  ref_code TEXT;
  ref_id UUID;
BEGIN
  ref_code := NEW.raw_user_meta_data->>'ref';
  IF ref_code IS NOT NULL AND ref_code <> '' THEN
    SELECT id INTO ref_id FROM public.profiles WHERE affiliate_code = ref_code;
  END IF;

  INSERT INTO public.profiles (id, nome, apelido, telefone, email, nivel, emoji, avatar_url, affiliate_code, referred_by, credits)
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
    ref_id,
    100
  );

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');

  IF NEW.email = 'cristianonumerique@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;