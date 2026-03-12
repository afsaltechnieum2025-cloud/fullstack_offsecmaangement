-- Remove the policy that allows users to insert their own role
DROP POLICY IF EXISTS "Users can insert own role" ON public.user_roles;

-- Clean up all existing data (we'll recreate fresh)
DELETE FROM public.finding_pocs;
DELETE FROM public.findings;
DELETE FROM public.project_assignments;
DELETE FROM public.user_roles;
DELETE FROM public.profiles;