-- Enable the pg_trgm extension for text search if needed (optional but good for future)
-- create extension if not exists pg_trgm;

-- 1. Ensure 'content-images' bucket exists
insert into storage.buckets (id, name, public)
values ('content-images', 'content-images', true)
on conflict (id) do nothing;

-- 2. Storage Policies for 'content-images'

-- Allow public read access to all files in content-images
create policy "Give public access to content-images"
on storage.objects for select
using ( bucket_id = 'content-images' );

-- Allow authenticated users (admins/staff) to upload files
create policy "Allow authenticated uploads to content-images"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'content-images' );

-- Allow authenticated users to update their own uploads (or all if admin)
create policy "Allow authenticated updates to content-images"
on storage.objects for update
to authenticated
using ( bucket_id = 'content-images' );

-- Allow authenticated users to delete files
create policy "Allow authenticated deletes to content-images"
on storage.objects for delete
to authenticated
using ( bucket_id = 'content-images' );

-- 3. Add 'metadata' column to 'content_posts' table
-- This allows storing unstructured data like 'capacity' for halls
alter table public.content_posts 
add column if not exists metadata jsonb default '{}'::jsonb;

-- Optional: Create an index on metadata for faster querying if we filter by capacity later
create index if not exists idx_content_posts_metadata on public.content_posts using gin (metadata);

-- 4. Enable RLS on content_posts if not already enabled (it likely is)
alter table public.content_posts enable row level security;

-- Ensure policies exist for content_posts (if they don't already)
-- Public read access
create policy "Allow public read access to content_posts"
on public.content_posts for select
using ( true );

-- Authenticated full access (simplified for this context)
create policy "Allow authenticated full access to content_posts"
on public.content_posts for all
to authenticated
using ( true )
with check ( true );
