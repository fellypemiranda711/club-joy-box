ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS lab_id uuid REFERENCES public.labs(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.get_user_lab_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT lab_id FROM public.profiles WHERE id = auth.uid();
$$;

-- Laboratório vê apenas os orçamentos atribuídos ao seu lab
CREATE POLICY "labs read assigned quotes"
  ON public.quote_requests
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'lab')
    AND lab_id = public.get_user_lab_id()
  );

-- Laboratório vê apenas as medidas dos orçamentos do seu lab
CREATE POLICY "labs read assigned measurements"
  ON public.quote_measurements
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'lab')
    AND EXISTS (
      SELECT 1 FROM public.quote_requests q
      WHERE q.id = quote_measurements.quote_id
        AND q.lab_id = public.get_user_lab_id()
    )
  );

-- Laboratório vê apenas os eventos de rastreio dos seus pedidos
CREATE POLICY "labs read assigned events"
  ON public.quote_status_events
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'lab')
    AND EXISTS (
      SELECT 1 FROM public.quote_requests q
      WHERE q.id = quote_status_events.quote_id
        AND q.lab_id = public.get_user_lab_id()
    )
  );

-- Laboratório registra eventos de rastreio nos seus pedidos
CREATE POLICY "labs insert assigned events"
  ON public.quote_status_events
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'lab')
    AND created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.quote_requests q
      WHERE q.id = quote_status_events.quote_id
        AND q.lab_id = public.get_user_lab_id()
    )
  );