-- SIMPLE DEBUG RPC
-- No joins, just raw data to verify menu_type

CREATE OR REPLACE FUNCTION public.debug_get_reservations_simple()
RETURNS TABLE (
  id uuid,
  created_at timestamptz,
  menu_type varchar,
  created_via text,
  status varchar
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.created_at,
    r.menu_type,
    r.created_via,
    r.status
  FROM public.reservations r
  ORDER BY r.created_at DESC
  LIMIT 10;
END;
$$;

GRANT EXECUTE ON FUNCTION public.debug_get_reservations_simple TO anon, authenticated, service_role;
