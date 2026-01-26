-- CRITICAL FIX ONLY
-- This script installs the trigger to force 'main_menu'.
-- It does NOT touch the debug page or other tables.

-- 1. Create the function
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

-- 2. Drop old trigger to be safe
DROP TRIGGER IF EXISTS trg_force_main_menu_website ON public.reservations;

-- 3. Bind the trigger
CREATE TRIGGER trg_force_main_menu_website
BEFORE INSERT ON public.reservations
FOR EACH ROW
EXECUTE FUNCTION public.force_main_menu_for_website();
