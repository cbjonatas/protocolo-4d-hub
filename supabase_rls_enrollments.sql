-- Remove any lingering RPCs to prevent confusion
DROP FUNCTION IF EXISTS public.admin_toggle_enrollment(UUID, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.admin_toggle_enrollment(TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.admin_toggle_enrollment(JSON) CASCADE;

-- Create direct RLS policies that allow administrators to insert and delete enrollments
CREATE POLICY "enrollments_admin_insert" ON public.enrollments 
  FOR INSERT TO authenticated 
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "enrollments_admin_delete" ON public.enrollments 
  FOR DELETE TO authenticated 
  USING (public.has_role(auth.uid(), 'admin'));
