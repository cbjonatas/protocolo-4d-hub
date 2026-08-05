INSERT INTO public.enrollments (user_id, course_id)
SELECT p.id, c.id
FROM public.profiles p
CROSS JOIN public.courses c
WHERE c.slug = 'protocolo-4d'
  AND NOT EXISTS (
    SELECT 1 FROM public.enrollments e
    WHERE e.user_id = p.id AND e.course_id = c.id
  );