-- Drop previous versions to avoid ambiguity
DROP FUNCTION IF EXISTS get_hall_month_availability(text, date, date, int);
DROP FUNCTION IF EXISTS get_hall_month_availability(uuid, date, date, int); 
DROP FUNCTION IF EXISTS get_hall_month_availability(bigint, date, date, int);

-- Function to get hall availability for a date range
CREATE OR REPLACE FUNCTION get_hall_month_availability(
    p_hall_id text,
    p_date_start date,
    p_date_end date,
    p_guests_count int
)
RETURNS TABLE (
    date date,
    total_capacity int,
    reserved_count int,
    remaining_capacity int,
    is_full boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_hall_capacity int;
    v_hall_id uuid;
BEGIN
    -- Cast text hall_id to UUID
    -- The error "uuid = bigint" implied the column is UUID and we were comparing with BigInt.
    -- So we must use UUID.
    BEGIN
        v_hall_id := p_hall_id::uuid;
    EXCEPTION WHEN OTHERS THEN
        v_hall_id := NULL;
    END;

    -- 1. Get total capacity for the hall from 'halls' table
    IF v_hall_id IS NOT NULL THEN
        BEGIN
            SELECT capacity INTO v_hall_capacity
            FROM halls
            WHERE id = v_hall_id;
        EXCEPTION WHEN OTHERS THEN
            v_hall_capacity := NULL;
        END;
    END IF;

    -- Fallback capacity if not found or error
    IF v_hall_capacity IS NULL THEN
        v_hall_capacity := 50; -- Default fallback
    END IF;
    
    -- Implementation: Return availability for each day in range
    RETURN QUERY
    WITH date_series AS (
        SELECT generate_series(p_date_start, p_date_end, '1 day'::interval)::date AS day
    ),
    daily_stats AS (
        SELECT
            r.date,
            COUNT(*) as reservation_count,
            COALESCE(SUM(r.guests_count), 0) as total_guests
        FROM reservations r
        WHERE v_hall_id IS NOT NULL 
          AND r.hall_id = v_hall_id
          AND r.date BETWEEN p_date_start AND p_date_end
          AND r.status NOT IN ('cancelled', 'rejected') 
        GROUP BY r.date
    )
    SELECT
        ds.day as date,
        v_hall_capacity as total_capacity,
        COALESCE(s.total_guests, 0)::int as reserved_count,
        (v_hall_capacity - COALESCE(s.total_guests, 0))::int as remaining_capacity,
        (COALESCE(s.total_guests, 0) + p_guests_count > v_hall_capacity) as is_full
    FROM date_series ds
    LEFT JOIN daily_stats s ON ds.day = s.date;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_hall_month_availability(text, date, date, int) TO anon;
GRANT EXECUTE ON FUNCTION get_hall_month_availability(text, date, date, int) TO authenticated;
GRANT EXECUTE ON FUNCTION get_hall_month_availability(text, date, date, int) TO service_role;

-- Force schema cache reload
NOTIFY pgrst, 'reload schema';
