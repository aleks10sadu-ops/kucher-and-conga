-- Rewriting the function to force 'main_menu' without changing the signature used by the frontend.
-- This prevents the 404 error (Signature Mismatch) while ensuring bookings are not 'banquet'.

CREATE OR REPLACE FUNCTION create_public_reservation(
    p_hall_id uuid,
    p_date date,
    p_time time without time zone,
    p_guests_count integer,
    p_phone text,
    p_name text,
    p_comments text DEFAULT NULL::text,
    p_status text DEFAULT 'new'::text,
    p_table_id uuid DEFAULT NULL::uuid
    -- Removed p_menu_type from signature to match frontend call
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_guest_id uuid;
  v_reservation_id uuid;
  v_names text[];
  v_first_name text;
  v_last_name text;
BEGIN
  -- 1. Parse name
  v_names := string_to_array(trim(p_name), ' ');
  v_first_name := v_names[1];
  v_last_name := array_to_string(v_names[2:], ' ');

  -- 2. Find or Create Guest
  SELECT id INTO v_guest_id FROM guests WHERE phone = p_phone LIMIT 1;

  IF v_guest_id IS NULL THEN
    INSERT INTO guests (first_name, last_name, phone, status)
    VALUES (v_first_name, v_last_name, p_phone, 'regular')
    RETURNING id INTO v_guest_id;
  END IF;

  -- 3. Create Reservation
  -- HARDCODED 'main_menu' here to fix the issue
  INSERT INTO reservations (
    date, time, hall_id, table_id, guest_id, guests_count, 
    status, comments, created_via, menu_type
  )
  VALUES (
    p_date, p_time, p_hall_id, p_table_id, v_guest_id, p_guests_count, 
    p_status, p_comments, 'website', 'main_menu'
  )
  RETURNING id INTO v_reservation_id;

  RETURN json_build_object('success', true, 'id', v_reservation_id);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$function$;
