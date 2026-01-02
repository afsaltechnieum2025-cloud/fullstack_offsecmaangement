-- Add retest_status column to findings table
ALTER TABLE public.findings 
ADD COLUMN retest_status text DEFAULT NULL;

-- Add retest_date column to track when last retested
ALTER TABLE public.findings 
ADD COLUMN retest_date timestamp with time zone DEFAULT NULL;

-- Add retest_notes column for any notes
ALTER TABLE public.findings 
ADD COLUMN retest_notes text DEFAULT NULL;

-- Add retested_by column to track who did the retest
ALTER TABLE public.findings 
ADD COLUMN retested_by uuid DEFAULT NULL;