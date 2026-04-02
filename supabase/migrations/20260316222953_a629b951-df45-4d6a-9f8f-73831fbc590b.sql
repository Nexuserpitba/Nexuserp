
-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'administrador'));

-- Admins can manage all profiles
CREATE POLICY "Admins can manage profiles"
  ON public.profiles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'administrador'));

-- Add INSERT policy for profiles (needed by trigger, and for admin user creation)
CREATE POLICY "Service role can insert profiles"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);
