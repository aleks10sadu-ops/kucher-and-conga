-- Function to get the entire active menu structure in one request
-- Returns a JSON object with menu type slugs as keys
CREATE OR REPLACE FUNCTION get_active_menu()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with privileges of the creator (usually admin/postgres)
AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_object_agg(mt.slug, mt_data.data)
    INTO result
    FROM menu_types mt
    CROSS JOIN LATERAL (
        SELECT jsonb_build_object(
            'categories', COALESCE(
                (
                    SELECT jsonb_agg(
                        jsonb_build_object(
                            'id', c.id,
                            'name', c.name,
                            'note', c.note,
                            'items', COALESCE(
                                (
                                    SELECT jsonb_agg(
                                        jsonb_build_object(
                                            'id', d.id,
                                            'name', d.name,
                                            'description', COALESCE(d.description, ''),
                                            'price', d.price,
                                            'weight', d.weight,
                                            'image', d.image_url,
                                            'categoryId', d.category_id,
                                            'variants', COALESCE(
                                                (
                                                    SELECT jsonb_agg(
                                                        jsonb_build_object(
                                                            'id', dv.id,
                                                            'name', dv.name,
                                                            'price', dv.price,
                                                            'weight', dv.weight
                                                        )
                                                    )
                                                    FROM dish_variants dv
                                                    WHERE dv.dish_id = d.id
                                                ),
                                                '[]'::jsonb
                                            )
                                        )
                                    )
                                    FROM dishes d
                                    WHERE d.category_id = c.id AND d.is_active = true
                                ),
                                '[]'::jsonb
                            )
                        ) ORDER BY c.sort_order ASC
                    )
                    FROM categories c
                    WHERE c.menu_type_id = mt.id
                ),
                '[]'::jsonb
            )
        ) AS data
    ) mt_data
    WHERE mt.slug NOT IN ('business', 'banquet');

    RETURN result;
END;
$$;
