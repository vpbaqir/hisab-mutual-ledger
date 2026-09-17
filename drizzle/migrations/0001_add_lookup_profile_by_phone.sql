CREATE OR REPLACE FUNCTION public.lookup_profile_by_phone(_phone text)
RETURNS TABLE(id uuid, full_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.full_name
  FROM public.profiles p
  WHERE p.phone = _phone
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.lookup_profile_by_phone(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_profile_by_phone(text) TO authenticated;