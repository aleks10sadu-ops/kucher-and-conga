-- Force PostgREST to reload the schema cache
NOTIFY pgrst, 'reload schema';
