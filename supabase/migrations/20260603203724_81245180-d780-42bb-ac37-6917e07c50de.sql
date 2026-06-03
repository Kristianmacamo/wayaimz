
-- Allow admins to manage payments + suspend users
CREATE POLICY "admins update payments" ON public.payments
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins view all profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins view all roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins update commissions" ON public.affiliate_commissions
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins view all payments list" ON public.payments
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Approve payment: sets status, extends plan, creates affiliate commission
CREATE OR REPLACE FUNCTION public.approve_payment(_payment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pay RECORD;
  ref_user uuid;
  plan_duration interval;
  base_expiry timestamptz;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT * INTO pay FROM public.payments WHERE id = _payment_id;
  IF pay IS NULL OR pay.status = 'aprovado' THEN RETURN; END IF;

  plan_duration := CASE pay.plan
    WHEN 'basico' THEN interval '7 days'
    WHEN 'premium' THEN interval '7 days'
    WHEN 'completo' THEN interval '30 days'
    ELSE interval '0'
  END;

  UPDATE public.payments
    SET status = 'aprovado', approved_at = now(), approved_by = auth.uid()
    WHERE id = _payment_id;

  SELECT GREATEST(COALESCE(plan_expires_at, now()), now()) INTO base_expiry
    FROM public.profiles WHERE id = pay.user_id;

  UPDATE public.profiles
    SET current_plan = pay.plan, plan_expires_at = base_expiry + plan_duration
    WHERE id = pay.user_id;

  SELECT referred_by INTO ref_user FROM public.profiles WHERE id = pay.user_id;
  IF ref_user IS NOT NULL THEN
    INSERT INTO public.affiliate_commissions (affiliate_id, referred_user_id, payment_id, amount_mt)
    VALUES (ref_user, pay.user_id, pay.id, pay.amount_mt * 0.10);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_payment(_payment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  UPDATE public.payments SET status = 'rejeitado', approved_at = now(), approved_by = auth.uid()
    WHERE id = _payment_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.toggle_user_suspension(_user_id uuid, _suspended boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  UPDATE public.profiles SET suspended = _suspended WHERE id = _user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_commission_paid(_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  UPDATE public.affiliate_commissions SET paid = true WHERE id = _id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_payment(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_payment(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_user_suspension(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_commission_paid(uuid) TO authenticated;
