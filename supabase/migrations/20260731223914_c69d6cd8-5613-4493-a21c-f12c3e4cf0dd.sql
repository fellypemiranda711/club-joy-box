CREATE TABLE public.lab_lens_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_id uuid NOT NULL REFERENCES public.labs(id) ON DELETE CASCADE,
  name text NOT NULL,
  lens_type text,
  refraction_index text,
  treatments text[] NOT NULL DEFAULT '{}',
  cost_cents integer NOT NULL DEFAULT 0,
  price_cents integer NOT NULL DEFAULT 0,
  notes text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lab_lens_products TO authenticated;
GRANT ALL ON public.lab_lens_products TO service_role;

ALTER TABLE public.lab_lens_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage lens products" ON public.lab_lens_products
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_lab_lens_products_lab ON public.lab_lens_products(lab_id);

CREATE TRIGGER set_lab_lens_products_updated_at
BEFORE UPDATE ON public.lab_lens_products
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();