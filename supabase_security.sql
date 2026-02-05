
-- 1. ENUM for Roles (Strict Typing)
CREATE TYPE app_role AS ENUM ('super_admin', 'project_manager', 'site_manager', 'client');

-- 2. User Roles Table (Links auth.users to logic roles)
CREATE TABLE public.user_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'site_manager', -- Default lowest privilege
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id)
);

-- 3. Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_engineering ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;

-- 4. RLS POLICIES

-- A. User Roles Policies
-- Users can read their own role
CREATE POLICY "Read own role" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- Only Admins can assign roles
CREATE POLICY "Admin manage roles" ON public.user_roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- B. Task Engineering Policies (SENSITIVE DATA - COSTS)
-- Logic: Site Managers (Capataz) and Clients CANNOT see engineering specs (costs/yields)
-- They only see the Task existence via project_tasks, not the deep financial data here.

CREATE POLICY "Financial Data Access" ON public.task_engineering
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'project_manager')
    )
  );

CREATE POLICY "Financial Data Modification" ON public.task_engineering
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'project_manager')
    )
  );

-- C. Project Tasks Policies (Operational Data)
-- Everyone can see tasks, but only Managers/Capataz can update progress. Clients Read-Only.

CREATE POLICY "Read Tasks" ON public.project_tasks
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Update Progress" ON public.project_tasks
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'project_manager', 'site_manager')
    )
  );

-- Function to handle new user signup (Trigger)
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'site_manager');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
