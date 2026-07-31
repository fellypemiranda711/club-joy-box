CREATE OR REPLACE FUNCTION public.has_any_active_subscription(user_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = user_uuid
      AND (
        (status IN ('active','trialing','past_due') AND (current_period_end IS NULL OR current_period_end > now()))
        OR (status = 'canceled' AND current_period_end > now())
      )
  );
$$;

DROP POLICY IF EXISTS "create own quotes" ON public.quote_requests;
CREATE POLICY "create own quotes"
  ON public.quote_requests FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (public.has_any_active_subscription(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role))
  );