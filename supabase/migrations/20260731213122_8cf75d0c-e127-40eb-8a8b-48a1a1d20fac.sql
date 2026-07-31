CREATE OR REPLACE FUNCTION public.respond_to_quote(_quote_id uuid, _decision text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _decision NOT IN ('approved', 'canceled') THEN
    RAISE EXCEPTION 'Decisão inválida';
  END IF;

  UPDATE public.quote_requests
  SET status = _decision
  WHERE id = _quote_id
    AND user_id = auth.uid()
    AND status = 'quoted';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solicitação não encontrada ou não está aguardando sua resposta';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.respond_to_quote(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.respond_to_quote(uuid, text) TO authenticated;