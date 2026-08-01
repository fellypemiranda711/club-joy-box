REVOKE EXECUTE ON FUNCTION public.choose_quote_option(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.choose_quote_option(uuid) TO authenticated;