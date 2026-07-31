ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS price_id text,
  ADD COLUMN IF NOT EXISTS product_id text,
  ADD COLUMN IF NOT EXISTS environment text NOT NULL DEFAULT 'sandbox',
  ADD COLUMN IF NOT EXISTS current_period_start timestamptz,
  ADD COLUMN IF NOT EXISTS current_period_end timestamptz,
  ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_stripe_subscription_id_key
  ON public.subscriptions(stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_env
  ON public.subscriptions(user_id, environment);

DROP POLICY IF EXISTS "service role manages subscriptions" ON public.subscriptions;
CREATE POLICY "service role manages subscriptions"
  ON public.subscriptions FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.has_active_subscription(user_uuid uuid, check_env text DEFAULT 'live')
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = user_uuid
      AND environment = check_env
      AND (
        (status IN ('active', 'trialing', 'past_due') AND (current_period_end IS NULL OR current_period_end > now()))
        OR (status = 'canceled' AND current_period_end > now())
      )
  );
$$;

REVOKE ALL ON FUNCTION public.has_active_subscription(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.has_active_subscription(uuid, text) TO authenticated, service_role;