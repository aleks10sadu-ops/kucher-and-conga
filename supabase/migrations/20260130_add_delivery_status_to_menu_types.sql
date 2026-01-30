-- Add is_delivery_available column to menu_types table
ALTER TABLE public.menu_types 
ADD COLUMN IF NOT EXISTS is_delivery_available BOOLEAN DEFAULT TRUE;

-- Update existing records to have is_delivery_available = true (though default handles this for new inserts, we want to be explicit for existing)
UPDATE public.menu_types SET is_delivery_available = TRUE WHERE is_delivery_available IS NULL;
