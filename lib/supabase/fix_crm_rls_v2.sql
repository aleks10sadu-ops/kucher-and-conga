-- ВНИМАНИЕ: Выполните в CRM DB (Admin Panel)
-- V2 Script: Более полное исправление прав доступа (Permissions + RLS)

-- 1. Явно выдаем права на таблицы роли 'anon' (и 'public' для надежности)
GRANT USAGE ON SCHEMA public TO anon;
GRANT ALL ON TABLE public.reservations TO anon;
GRANT ALL ON TABLE public.guests TO anon;
GRANT SELECT ON TABLE public.halls TO anon;

-- Для последовательностей (если используются serial/identity поля)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;

-- 2. Обновляем политики RLS для reservations (используем TO public чтобы охватить все роли)
DROP POLICY IF EXISTS "Allow website to insert reservations" ON public.reservations;
CREATE POLICY "Allow website to insert reservations" 
ON public.reservations 
FOR INSERT 
TO public 
WITH CHECK (true);

-- Разрешаем чтение созданной записи (важно для .select() после insert)
DROP POLICY IF EXISTS "Allow website to select reservations" ON public.reservations;
CREATE POLICY "Allow website to select reservations" 
ON public.reservations 
FOR SELECT 
TO public 
USING (true);

-- 3. Обновляем политики RLS для guests
DROP POLICY IF EXISTS "Allow website to select guests" ON public.guests;
CREATE POLICY "Allow website to select guests" ON public.guests FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Allow website to insert guests" ON public.guests;
CREATE POLICY "Allow website to insert guests" ON public.guests FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Allow website to update guests" ON public.guests;
CREATE POLICY "Allow website to update guests" ON public.guests FOR UPDATE TO public USING (true);

-- 4. Обновляем политику для halls
DROP POLICY IF EXISTS "Allow website to read halls" ON public.halls;
CREATE POLICY "Allow website to read halls" ON public.halls FOR SELECT TO public USING (true);

-- 5. Принудительное обновление кэша схемы
NOTIFY pgrst, 'reload config';
