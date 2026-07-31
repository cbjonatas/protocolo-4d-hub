-- Clean up test/demo student data from database tables, preserving only admin access
DELETE FROM public.enrollments;
DELETE FROM public.lesson_progress;
DELETE FROM public.goal_progress;
DELETE FROM public.exam_progress;
DELETE FROM public.question_answers;
DELETE FROM public.exam_attempts;

-- Remove non-admin user roles
DELETE FROM public.user_roles WHERE role != 'admin';

-- Remove non-admin profiles
DELETE FROM public.profiles WHERE LOWER(email) != 'admin@protocolo4d.com' AND email NOT LIKE '%admin%';
