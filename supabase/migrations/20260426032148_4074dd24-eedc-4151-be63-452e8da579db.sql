-- Fix mutable search_path on set_updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Make avatars bucket private and restrict listing
UPDATE storage.buckets SET public = false WHERE id = 'avatars';

DROP POLICY IF EXISTS "public read avatars" ON storage.objects;

CREATE POLICY "users read own avatar" ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "admins read all avatars" ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'avatars'
        AND public.has_role(auth.uid(), 'admin')
    );
