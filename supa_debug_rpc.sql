-- Create a secure RPC to fetch recent reservations for debugging
-- This bypasses RLS so you can see the data on the debug page.

CREATE OR REPLACE FUNCTION debug_get_reservations()
RETURNS TABLE (
  id uuid,
  created_at timestamptz,
  menu_type varchar,
  created_via text,
  status varchar,
  guest_name text,
  guest_phone varchar,
  hall_name varchar
)
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with owner privileges to bypass RLS
AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.created_at,
    r.menu_type,
    r.created_via,
    r.status,
    (g.first_name || ' ' || g.last_name)::text as guest_name,
    g.phone as guest_phone,
    h.name as hall_name
  FROM reservations r
  LEFT JOIN guests g ON r.guest_id = g.id
  LEFT JOIN halls h ON r.hall_id = h.id
  ORDER BY r.created_at DESC
  LIMIT 10;
END;
$$;
