ALTER TABLE public.quote_messages
  ADD COLUMN IF NOT EXISTS attachment_path text,
  ADD COLUMN IF NOT EXISTS attachment_name text,
  ADD COLUMN IF NOT EXISTS attachment_type text;

CREATE POLICY "chat attachments read own" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'chat-attachments' AND (
    public.has_role(auth.uid(), 'admin') OR
    EXISTS (
      SELECT 1 FROM public.quote_requests q
      WHERE q.user_id = auth.uid()
        AND (storage.foldername(name))[1] = q.id::text
    )
  )
);

CREATE POLICY "chat attachments upload own" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'chat-attachments' AND (
    public.has_role(auth.uid(), 'admin') OR
    EXISTS (
      SELECT 1 FROM public.quote_requests q
      WHERE q.user_id = auth.uid()
        AND (storage.foldername(name))[1] = q.id::text
    )
  )
);

CREATE POLICY "chat attachments admin delete" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'chat-attachments' AND public.has_role(auth.uid(), 'admin'));