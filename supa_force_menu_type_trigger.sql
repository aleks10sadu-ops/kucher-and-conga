-- Force 'main_menu' for website reservations using a Trigger
-- This ensures that no matter what the RPC function does, the data is saved correctly.

-- 1. Create the trigger function
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

-- 2. Drop existing trigger if it exists (to avoid errors on re-run)
DROP TRIGGER IF EXISTS trg_force_main_menu_website ON public.reservations;

-- 3. Create the trigger
CREATE TRIGGER trg_force_main_menu_website
BEFORE INSERT ON public.reservations
FOR EACH ROW
EXECUTE FUNCTION public.force_main_menu_for_website();
