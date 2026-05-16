-- =========================================================================
-- SUPABASE SCHEMA FOR CW REPORT DASHBOARD
-- Copy paste this entire script into your Supabase SQL Editor and hit RUN.
-- =========================================================================

-- 1. Create a table for User Profiles (to manage roles like Admin vs Writer)
CREATE TABLE public.profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
  email text,
  full_name text,
  role text DEFAULT 'writer'::text CHECK (role IN ('writer', 'admin')),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS) for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;


-- Function to check if current user is admin without triggering RLS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role FROM public.profiles WHERE id = auth.uid();
  RETURN user_role = 'admin';
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles Policies
-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (
    public.is_admin()
  );

-- Admins can update profiles (change roles)
CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE USING (
    public.is_admin()
  );

-- Function to automatically create a profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', 'writer');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function on signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- 2. Create the Reports table
CREATE TABLE public.reports (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  nama text NOT NULL,
  posisi text NOT NULL,
  divisi text NOT NULL,
  periode text NOT NULL,
  atasan text NOT NULL,
  ringkasan text,
  targets jsonb DEFAULT '[]'::jsonb,
  tugas_utama text,
  tugas_tambahan text,
  keterangan_lain text,
  pencapaian_utama text,
  kendalas jsonb DEFAULT '[]'::jsonb,
  eval_kelebihan text,
  eval_peningkatan text,
  rencana text,
  penutup text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS) for reports
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Reports Policies
-- Writers can only view their own reports. Admins can view all reports.
CREATE POLICY "Users can view own reports, admins view all" ON public.reports
  FOR SELECT USING (
    auth.uid() = user_id OR
    public.is_admin()
  );

-- Writers can only insert their own reports
CREATE POLICY "Users can insert own reports" ON public.reports
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Writers can only update their own reports. Admins can update all.
CREATE POLICY "Users can update own reports, admins update all" ON public.reports
  FOR UPDATE USING (
    auth.uid() = user_id OR
    public.is_admin()
  );

-- Writers can only delete their own reports. Admins can delete all.
CREATE POLICY "Users can delete own reports, admins delete all" ON public.reports
  FOR DELETE USING (
    auth.uid() = user_id OR
    public.is_admin()
  );

-- Function to set updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER set_reports_updated_at
BEFORE UPDATE ON public.reports
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- Note: The FIRST user to sign up will be a 'writer' by default.
-- To make yourself an admin, you will need to go to the Supabase Table Editor,
-- open the 'profiles' table, and change your role from 'writer' to 'admin'.
