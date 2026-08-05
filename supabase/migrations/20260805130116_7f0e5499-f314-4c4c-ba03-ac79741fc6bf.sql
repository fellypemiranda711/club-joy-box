ALTER TABLE public.quote_requests
  ADD COLUMN IF NOT EXISTS fulfillment_status text NOT NULL DEFAULT 'paid',
  ADD COLUMN IF NOT EXISTS tracking_code text,
  ADD COLUMN IF NOT EXISTS carrier text,
  ADD COLUMN IF NOT EXISTS estimated_delivery date;

CREATE TABLE IF NOT EXISTS public.quote_status_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id uuid NOT NULL REFERENCES public.quote_requests(id) ON DELETE CASCADE,
  status text NOT NULL,
  note text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS quote_status_events_quote_idx ON public.quote_status_events(quote_id, created_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.quote_status_events TO authenticated;
GRANT ALL ON public.quote_status_events TO service_role;

ALTER TABLE public.quote_status_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read own quote events" ON public.quote_status_events
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR EXISTS (
      SELECT 1 FROM public.quote_requests q
      WHERE q.id = quote_status_events.quote_id AND q.user_id = auth.uid()
    )
  );

CREATE POLICY "admins manage quote events" ON public.quote_status_events
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));