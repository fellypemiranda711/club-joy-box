CREATE TABLE public.quote_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id uuid NOT NULL REFERENCES public.quote_requests(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_admin boolean NOT NULL DEFAULT false,
  content text NOT NULL,
  read_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX quote_messages_quote_id_created_at_idx ON public.quote_messages (quote_id, created_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.quote_messages TO authenticated;
GRANT ALL ON public.quote_messages TO service_role;

ALTER TABLE public.quote_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read own quote messages" ON public.quote_messages
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (SELECT 1 FROM public.quote_requests q WHERE q.id = quote_id AND q.user_id = auth.uid())
);

CREATE POLICY "members send quote messages" ON public.quote_messages
FOR INSERT TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND is_admin = false
  AND EXISTS (SELECT 1 FROM public.quote_requests q WHERE q.id = quote_id AND q.user_id = auth.uid())
);

CREATE POLICY "admins send quote messages" ON public.quote_messages
FOR INSERT TO authenticated
WITH CHECK (sender_id = auth.uid() AND is_admin = true AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins manage quote messages" ON public.quote_messages
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins delete quote messages" ON public.quote_messages
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER quote_messages_updated_at BEFORE UPDATE ON public.quote_messages
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.quote_messages;