-- Applied to project bhqcazsrvyihxstezope on 2026-09-26.
-- Fixes: broken partner-profile RLS policy, missing profile UPDATE policy,
-- partner lookup before a pair exists, self-pairs/duplicate pairs, and
-- the signup trigger ignoring first_name.

-- 1. Prevent self-pairs and duplicate pairs
DELETE FROM public.pairs WHERE user_a_id = user_b_id;

ALTER TABLE public.pairs
  ADD CONSTRAINT pairs_distinct_users CHECK (user_a_id <> user_b_id);

CREATE UNIQUE INDEX IF NOT EXISTS pairs_unique_couple
  ON public.pairs (LEAST(user_a_id, user_b_id), GREATEST(user_a_id, user_b_id));

-- 2. Partner-profile read policy (previous version compared user_b_id to pairs.id)
DROP POLICY IF EXISTS "Users can view profiles of their pair partners" ON public.profiles;
CREATE POLICY "Users can view profiles of their pair partners"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.pairs
      WHERE (pairs.user_a_id = auth.uid() AND pairs.user_b_id = profiles.id)
         OR (pairs.user_b_id = auth.uid() AND pairs.user_a_id = profiles.id)
    )
  );

-- 3. Users can update their own profile
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 4. Secure partner lookup by email (exact match, signed-in users only)
CREATE OR REPLACE FUNCTION public.find_profile_by_email(p_email text)
RETURNS TABLE (id uuid, first_name text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT p.id, p.first_name
  FROM public.profiles p
  WHERE lower(p.email) = lower(trim(p_email))
    AND auth.uid() IS NOT NULL
  LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.find_profile_by_email(text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.find_profile_by_email(text) TO authenticated;

-- 5. Signup trigger reads first_name from auth metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'first_name'), ''), 'User')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
