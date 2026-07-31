CREATE TABLE public.quote_measurements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.quote_requests(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  front_photo_path text,
  profile_photo_path text,
  reference_width_mm numeric NOT NULL DEFAULT 85.6,
  pd_mm numeric,
  dnp_right_mm numeric,
  dnp_left_mm numeric,
  height_right_mm numeric,
  height_left_mm numeric,
  pantoscopic_angle_deg numeric,
  points jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending_review',
  admin_notes text,
  validated_by uuid,
  validated_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (quote_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.quote_measurements TO authenticated;
GRANT ALL ON public.quote_measurements TO service_role;

ALTER TABLE public.quote_measurements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read own measurements" ON public.quote_measurements
FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "create own measurements" ON public.quote_measurements
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.quote_requests q
    WHERE q.id = quote_id AND q.user_id = auth.uid()
      AND q.status IN ('approved', 'completed')
  )
);

CREATE POLICY "update own pending measurements" ON public.quote_measurements
FOR UPDATE TO authenticated
USING (auth.uid() = user_id AND status = 'pending_review')
WITH CHECK (auth.uid() = user_id AND status = 'pending_review');

CREATE POLICY "admins manage measurements" ON public.quote_measurements
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER quote_measurements_updated_at
BEFORE UPDATE ON public.quote_measurements
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "measurements read own folder" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'measurements'
  AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin'))
);

CREATE POLICY "measurements insert own folder" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'measurements'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "measurements update own folder" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'measurements' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'measurements' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "measurements delete own folder" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'measurements'
  AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin'))
);