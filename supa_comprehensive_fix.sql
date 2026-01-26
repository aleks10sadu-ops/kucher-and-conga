-- COMPREHENSIVE FIX SCRIPT
-- 1. Fixes the Debug Page (Grants permissions)
-- 2. Fixes the Banquet Menu issue (Ensures Trigger is active)

-- PART 1: DEBUG RPC (With Permissions)
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
SECURITY DEFINER
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

-- CRITICAL: Grant permission to public users (anon)
GRANT EXECUTE ON FUNCTION debug_get_reservations TO anon, authenticated, service_role;


-- PART 2: FORCE MAIN MENU TRIGGER
CREATE OR REPLACE FUNCTION public.force_main_menu_for_website()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- If reservation comes from website, force menu_type to 'main_menu'
  IF NEW.created_via = 'website' THEN
     NEW.menu_type := 'main_menu';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_force_main_menu_website ON public.reservations;

CREATE TRIGGER trg_force_main_menu_website
BEFORE INSERT ON public.reservations
FOR EACH ROW
EXECUTE FUNCTION public.force_main_menu_for_website();
