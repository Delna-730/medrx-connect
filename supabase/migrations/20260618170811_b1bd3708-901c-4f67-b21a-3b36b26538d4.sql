
CREATE POLICY "View medicine images" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'medicine-images' AND (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.retailers r WHERE r.user_id = auth.uid() AND r.status = 'approved')
  )
);
CREATE POLICY "Admin upload medicine images" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'medicine-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin update medicine images" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'medicine-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin delete medicine images" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'medicine-images' AND public.has_role(auth.uid(), 'admin'));
