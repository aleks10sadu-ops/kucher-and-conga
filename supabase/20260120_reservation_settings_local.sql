-- Migration: 20260120_reservation_settings_local.sql

-- First, ensure the admins table exists as it's required for RLS policies
CREATE TABLE IF NOT EXISTS public.admins (
    id UUID PRIMARY KEY, -- auth.users.id
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'editor', -- editor | superadmin
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create the settings table
CREATE TABLE IF NOT EXISTS public.reservation_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.reservation_settings ENABLE ROW LEVEL SECURITY;

-- Allow public read access (everyone can see blocked dates/times)
DROP POLICY IF EXISTS "Allow public read access for settings" ON public.reservation_settings;
CREATE POLICY "Allow public read access for settings" ON public.reservation_settings
    FOR SELECT USING (true);

-- Allow admin full access (only users in public.admins table can modify)
DROP POLICY IF EXISTS "Allow admin full access for settings" ON public.reservation_settings;
CREATE POLICY "Allow admin full access for settings" ON public.reservation_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.admins a
            WHERE a.id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.admins a
            WHERE a.id = auth.uid()
        )
    );
