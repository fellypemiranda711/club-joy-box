CREATE SEQUENCE IF NOT EXISTS public.service_order_seq START 1;

ALTER TABLE public.quote_requests
  ADD COLUMN IF NOT EXISTS os_number text;

UPDATE public.quote_requests q
SET os_number = 'OS-' || lpad(nextval('public.service_order_seq')::text, 6, '0')
FROM (SELECT id FROM public.quote_requests WHERE os_number IS NULL ORDER BY created_at) s
WHERE q.id = s.id;

ALTER TABLE public.quote_requests
  ALTER COLUMN os_number SET DEFAULT 'OS-' || lpad(nextval('public.service_order_seq')::text, 6, '0');

ALTER TABLE public.quote_requests
  ALTER COLUMN os_number SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS quote_requests_os_number_key ON public.quote_requests (os_number);

GRANT USAGE ON SEQUENCE public.service_order_seq TO authenticated, service_role;