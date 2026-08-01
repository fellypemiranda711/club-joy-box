CREATE TABLE public.quote_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.quote_requests(id) ON DELETE CASCADE,
  tier integer NOT NULL CHECK (tier BETWEEN 1 AND 4),
  title text NOT NULL,
  description text,
  lens_product_id uuid REFERENCES public.lab_lens_products(id) ON DELETE SET NULL,
  lab_id uuid REFERENCES public.labs(id),
  member_price_cents integer NOT NULL DEFAULT 0,
  market_price_cents integer NOT NULL DEFAULT 0,
  selected boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (quote_id, tier)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.quote_options TO authenticated;
GRANT ALL ON public.quote_options TO service_role;

ALTER TABLE public.quote_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage quote options" ON public.quote_options
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "members read own quote options" ON public.quote_options
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.quote_requests q WHERE q.id = quote_options.quote_id AND q.user_id = auth.uid()));

CREATE TRIGGER quote_options_set_updated_at
  BEFORE UPDATE ON public.quote_options
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.choose_quote_option(_option_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _quote_id uuid;
  _price integer;
  _lab uuid;
  _commission numeric;
BEGIN
  SELECT o.quote_id, o.member_price_cents, COALESCE(o.lab_id, q.lab_id)
    INTO _quote_id, _price, _lab
  FROM public.quote_options o
  JOIN public.quote_requests q ON q.id = o.quote_id
  WHERE o.id = _option_id AND q.user_id = auth.uid() AND q.status IN ('quoted', 'received', 'quoting');

  IF _quote_id IS NULL THEN
    RAISE EXCEPTION 'Opção não encontrada ou indisponível';
  END IF;

  UPDATE public.quote_options SET selected = (id = _option_id) WHERE quote_id = _quote_id;

  SELECT commission_percent INTO _commission FROM public.labs WHERE id = _lab;

  UPDATE public.quote_requests
  SET status = 'approved',
      lab_id = COALESCE(_lab, lab_id),
      quoted_amount_cents = _price,
      commission_cents = CASE WHEN _commission IS NULL THEN commission_cents ELSE round(_price * _commission / 100) END
  WHERE id = _quote_id;
END;
$$;