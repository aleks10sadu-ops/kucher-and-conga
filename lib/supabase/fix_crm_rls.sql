-- ВНИМАНИЕ: Этот скрипт нужно выполнить в базе данных CRM (Admin Panel), 
-- а не в базе данных сайта!
-- Это исправит ошибку "new row violates row-level security policy" (код 42501).

-- 1. Разрешить анонимным пользователям (с сайта) создавать бронирования
-- Сначала удалим старую политику, если есть, чтобы избежать конфликтов
DROP POLICY IF EXISTS "Allow website to insert reservations" ON public.reservations;

CREATE POLICY "Allow website to insert reservations" 
ON public.reservations 
FOR INSERT 
TO anon 
WITH CHECK (true);

-- 2. На всякий случай разрешим чтение/создание/обновление гостей для сайта
DROP POLICY IF EXISTS "Allow website to select guests" ON public.guests;
CREATE POLICY "Allow website to select guests" ON public.guests FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Allow website to insert guests" ON public.guests;
CREATE POLICY "Allow website to insert guests" ON public.guests FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Allow website to update guests" ON public.guests;
CREATE POLICY "Allow website to update guests" ON public.guests FOR UPDATE TO anon USING (true);


-- 3. Если используется таблица halls для выборки ID зала, тоже дадим доступ на чтение
DROP POLICY IF EXISTS "Allow website to read halls" ON public.halls;
CREATE POLICY "Allow website to read halls" ON public.halls FOR SELECT TO anon USING (true);
