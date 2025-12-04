-- Create app roles enum
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'tester');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  username TEXT NOT NULL UNIQUE,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Create projects table
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  client TEXT NOT NULL,
  domain TEXT,
  ip_addresses TEXT[],
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'on-hold')),
  start_date DATE,
  end_date DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create project_assignments table (which testers are assigned to which projects)
CREATE TABLE public.project_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (project_id, user_id)
);

-- Create findings table
CREATE TABLE public.findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('Critical', 'High', 'Medium', 'Low', 'Informational')),
  description TEXT,
  impact TEXT,
  remediation TEXT,
  steps_to_reproduce TEXT,
  affected_component TEXT,
  cvss_score DECIMAL(3,1),
  cwe_id TEXT,
  status TEXT DEFAULT 'Open' CHECK (status IN ('Open', 'In Progress', 'Resolved', 'Accepted')),
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create finding_pocs table for POC images
CREATE TABLE public.finding_pocs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  finding_id UUID REFERENCES public.findings(id) ON DELETE CASCADE NOT NULL,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  uploaded_by UUID REFERENCES auth.users(id) NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finding_pocs ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to check if user is assigned to a project
CREATE OR REPLACE FUNCTION public.is_assigned_to_project(_user_id UUID, _project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.project_assignments
    WHERE user_id = _user_id
      AND project_id = _project_id
  )
  OR public.has_role(_user_id, 'admin')
  OR public.has_role(_user_id, 'manager')
$$;

-- Profiles policies
CREATE POLICY "Users can view all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- User roles policies
CREATE POLICY "Admins can manage roles"
ON public.user_roles FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Projects policies
CREATE POLICY "Admins and managers can manage projects"
ON public.projects FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Assigned testers can view projects"
ON public.projects FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') 
  OR public.has_role(auth.uid(), 'manager')
  OR EXISTS (
    SELECT 1 FROM public.project_assignments 
    WHERE project_assignments.project_id = projects.id 
    AND project_assignments.user_id = auth.uid()
  )
);

-- Project assignments policies
CREATE POLICY "Admins and managers can manage assignments"
ON public.project_assignments FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Users can view own assignments"
ON public.project_assignments FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Findings policies
CREATE POLICY "Users can view findings for assigned projects"
ON public.findings FOR SELECT TO authenticated
USING (public.is_assigned_to_project(auth.uid(), project_id));

CREATE POLICY "Users can create findings for assigned projects"
ON public.findings FOR INSERT TO authenticated
WITH CHECK (
  public.is_assigned_to_project(auth.uid(), project_id)
  AND auth.uid() = created_by
);

CREATE POLICY "Users can update own findings"
ON public.findings FOR UPDATE TO authenticated
USING (auth.uid() = created_by);

CREATE POLICY "Users can delete own findings"
ON public.findings FOR DELETE TO authenticated
USING (auth.uid() = created_by);

-- Finding POCs policies
CREATE POLICY "Users can view POCs for accessible findings"
ON public.finding_pocs FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.findings f
    WHERE f.id = finding_pocs.finding_id
    AND public.is_assigned_to_project(auth.uid(), f.project_id)
  )
);

CREATE POLICY "Users can upload POCs to own findings"
ON public.finding_pocs FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = uploaded_by
  AND EXISTS (
    SELECT 1 FROM public.findings f
    WHERE f.id = finding_pocs.finding_id
    AND public.is_assigned_to_project(auth.uid(), f.project_id)
  )
);

CREATE POLICY "Users can delete own POCs"
ON public.finding_pocs FOR DELETE TO authenticated
USING (auth.uid() = uploaded_by);

-- Create storage bucket for POC images
INSERT INTO storage.buckets (id, name, public) VALUES ('poc-images', 'poc-images', true);

-- Storage policies for POC images
CREATE POLICY "Authenticated users can upload POC images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'poc-images');

CREATE POLICY "Anyone can view POC images"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'poc-images');

CREATE POLICY "Users can delete own POC images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'poc-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Trigger for auto-creating profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username, full_name)
  VALUES (new.id, COALESCE(new.raw_user_meta_data ->> 'username', new.email), new.raw_user_meta_data ->> 'full_name');
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger for findings
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_findings_updated_at
  BEFORE UPDATE ON public.findings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();