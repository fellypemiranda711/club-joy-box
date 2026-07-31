REVOKE EXECUTE ON FUNCTION public.has_any_active_subscription(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_any_active_subscription(uuid) TO authenticated, service_role;