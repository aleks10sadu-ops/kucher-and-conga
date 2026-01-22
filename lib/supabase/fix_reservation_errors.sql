-- Migration: fix_missing_tables_v3.sql
-- Description: Creates missing 'guests' and 'reservations' tables, ensures settings exist, and forces schema update.

-- 1. Create 'guests' table
CREATE TABLE IF NOT EXISTS public.guests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    first_name TEXT,
    last_name TEXT,
    phone TEXT UNIQUE NOT NULL,
    is_blacklisted BOOLEAN DEFAULT false,
    comments TEXT
);

-- Enable RLS for guests
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;

-- Policies for guests
DROP POLICY IF EXISTS "Allow anon select guests by phone" ON public.guests;
CREATE POLICY "Allow anon select guests by phone" ON public.guests FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow anon insert guests" ON public.guests;
CREATE POLICY "Allow anon insert guests" ON public.guests FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon update guests" ON public.guests;
CREATE POLICY "Allow anon update guests" ON public.guests FOR UPDATE USING (true);


-- 2. Create 'reservations' table
CREATE TABLE IF NOT EXISTS public.reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    guest_id UUID REFERENCES public.guests(id),
    reservation_date DATE NOT NULL,
    reservation_time TIME NOT NULL,
    guests_count INTEGER NOT NULL,
    comments TEXT,
    status TEXT DEFAULT 'pending', 
    created_via TEXT DEFAULT 'website',
    hall_id TEXT
);

-- IMPORTANT: Explicitly add the column if the table already existed but was missing it
ALTER TABLE public.reservations 
ADD COLUMN IF NOT EXISTS created_via text DEFAULT 'website';

-- Enable RLS for reservations
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

-- Policies for reservations
DROP POLICY IF EXISTS "Allow anon insert reservations" ON public.reservations;
CREATE POLICY "Allow anon insert reservations" ON public.reservations FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon select reservations" ON public.reservations;
CREATE POLICY "Allow anon select reservations" ON public.reservations FOR SELECT USING (true);


-- 3. Ensure 'reservation_settings' table exists
CREATE TABLE IF NOT EXISTS public.reservation_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.reservation_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access for settings" ON public.reservation_settings;
CREATE POLICY "Allow public read access for settings" ON public.reservation_settings FOR SELECT USING (true);
    
-- 4. Insert default settings (safe upsert)
INSERT INTO public.reservation_settings (key, value)
VALUES ('standard_schedule', '{"start": "10:00", "end": "00:00"}'::jsonb)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.reservation_settings (key, value)
VALUES ('delivery_settings', '{"isDeliveryEnabled": true, "startTime": "14:00", "endTime": "22:00", "minDeliveryHours": 1.5, "maxAdvanceDays": 7}'::jsonb)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.reservation_settings (key, value)
VALUES ('restricted_dates', '[]'::jsonb)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.reservation_settings (key, value)
VALUES ('restricted_times', '{}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 5. FORCE SCHEMA CACHE RELOAD
-- This notifies PostgREST to reload the schema cache immediately
NOTIFY pgrst, 'reload config';
