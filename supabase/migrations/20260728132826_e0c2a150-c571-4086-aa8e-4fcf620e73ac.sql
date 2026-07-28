
CREATE POLICY "materials_read_authenticated" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'course-materials');
CREATE POLICY "materials_admin_write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'course-materials' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "materials_admin_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'course-materials' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "materials_admin_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'course-materials' AND public.has_role(auth.uid(), 'admin'));
