// ВРЕМЕННЫЙ роут для миграции данных меню из app/data/* в Supabase.
// ВАЖНО: после успешной миграции этот файл нужно удалить из репозитория.

import { NextResponse, NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '../../../../lib/supabase/server';

import { menuTypes } from '../../../../app/data/menuTypes';
import { menuData } from '../../../../app/data/menu';
import { barMenuData } from '../../../../app/data/barMenuData';
import { kidsMenuData } from '../../../../app/data/kidsMenuData';
import { promotionsData } from '../../../../app/data/promotionsData';
import { wineMenuData } from '../../../../app/data/wineMenuData';

const MENU_TYPE_ID_FLAGS: Record<string, any> = {
  main: {},
  promotions: { is_promo: true },
  kids: { is_kids: true },
  bar: { is_bar: true },
  wine: { is_wine: true },
  business: { is_business_lunch: true },
};

const DATA_BY_MENU_TYPE: Record<string, any> = {
  main: menuData,
  promotions: promotionsData,
  kids: kidsMenuData,
  bar: barMenuData,
  wine: wineMenuData,
};

function buildWeight(item: any) {
  if (item.weight) return String(item.weight);
  if (item.volume && item.volume_unit) return `${item.volume} ${item.volume_unit}`;
  if (item.volume_small && item.volume_unit) return `${item.volume_small} ${item.volume_unit}`;
  return null;
}

function pickPrice(item: any) {
  if (item.price != null) return Number(item.price);
  if (item.price_small != null) return Number(item.price_small);
  if (item.price_large != null) return Number(item.price_large);
  return 0;
}

export async function POST(req: NextRequest) {
  try {
    const secretHeader = req.headers.get('x-migration-secret');
    const expectedSecret = process.env.MIGRATION_SECRET;

    if (!expectedSecret) {
      return NextResponse.json(
        { ok: false, error: 'MIGRATION_SECRET env var is not set' },
        { status: 500 },
      );
    }

    if (secretHeader !== expectedSecret) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createSupabaseAdminClient() as any;

    // 1. Upsert menu_types на основе menuTypes.js
    const upsertPayload = menuTypes.map((mt: any) => ({
      slug: mt.id,
      name: mt.name,
      description: mt.description || null,
      ...MENU_TYPE_ID_FLAGS[mt.id],
    }));

    const { error: mtUpsertError } = await supabase
      .from('menu_types')
      .upsert(upsertPayload, { onConflict: 'slug' });

    if (mtUpsertError) {
      return NextResponse.json(
        { ok: false, step: 'upsert_menu_types', error: mtUpsertError.message },
        { status: 500 },
      );
    }

    const slugs = Object.keys(DATA_BY_MENU_TYPE);

    const { data: menuTypesRows, error: mtSelectError } = await supabase
      .from('menu_types')
      .select('id, slug')
      .in('slug', slugs);

    if (mtSelectError) {
      return NextResponse.json(
        { ok: false, step: 'select_menu_types', error: mtSelectError.message },
        { status: 500 },
      );
    }

    const menuTypeIdBySlug: Record<string, string> = {};
    for (const row of menuTypesRows || []) {
      menuTypeIdBySlug[row.slug] = row.id;
    }

    // 2. Для повторного запуска чистим старые категории/блюда только для этих типов
    const menuTypeIds = Object.values(menuTypeIdBySlug);
    if (menuTypeIds.length > 0) {
      const { error: delCatError } = await supabase
        .from('categories')
        .delete()
        .in('menu_type_id', menuTypeIds);
      if (delCatError) {
        return NextResponse.json(
          { ok: false, step: 'delete_old_categories', error: delCatError.message },
          { status: 500 },
        );
      }
      // Благодаря ON DELETE CASCADE удалятся и dishes, и dish_variants
    }

    const summary = [];

    // 3. Перенос категорий и блюд
    for (const slug of slugs) {
      const menuTypeId = menuTypeIdBySlug[slug];
      if (!menuTypeId) continue;

      const src = DATA_BY_MENU_TYPE[slug];
      const categories = src?.categories || [];

      let insertedCategories = 0;
      let insertedDishes = 0;
      let insertedVariants = 0;

      for (let i = 0; i < categories.length; i++) {
        const cat = categories[i];

        // insert category
        const { data: catRows, error: catError } = await supabase
          .from('categories')
          .insert({
            menu_type_id: menuTypeId,
            name: cat.name,
            sort_order: i,
            note: cat.note || null,
          })
          .select('id')
          .limit(1);

        if (catError || !catRows?.[0]) {
          return NextResponse.json(
            {
              ok: false,
              step: 'insert_category',
              menu_type_slug: slug,
              category_name: cat.name,
              error: catError?.message || 'No category id returned',
            },
            { status: 500 },
          );
        }

        insertedCategories += 1;
        const categoryId = catRows[0].id;

        const items = cat.items || [];
        for (const item of items) {
          const price = pickPrice(item);
          const weight = buildWeight(item);

          const { data: dishRows, error: dishError } = await supabase
            .from('dishes')
            .insert({
              category_id: categoryId,
              name: item.name,
              description: item.description || null,
              price,
              weight,
              image_url: null,
              is_active: true,
              is_kids: slug === 'kids',
              is_promo: slug === 'promotions',
              is_wine: slug === 'wine',
            })
            .select('id')
            .limit(1);

          if (dishError || !dishRows?.[0]) {
            return NextResponse.json(
              {
                ok: false,
                step: 'insert_dish',
                menu_type_slug: slug,
                category_name: cat.name,
                dish_name: item.name,
                error: dishError?.message || 'No dish id returned',
              },
              { status: 500 },
            );
          }

          insertedDishes += 1;
          const dishId = dishRows[0].id;

          // Варианты (если есть)
          if (Array.isArray(item.variants) && item.variants.length > 0) {
            for (const variant of item.variants) {
              const variantPrice =
                variant.price != null ? Number(variant.price) : price;
              const variantWeight = (variant as any).weight || weight;

              const { error: variantError } = await supabase
                .from('dish_variants')
                .insert({
                  dish_id: dishId,
                  name: variant.name || '',
                  price: variantPrice,
                  weight: variantWeight || null,
                });

              if (variantError) {
                return NextResponse.json(
                  {
                    ok: false,
                    step: 'insert_dish_variant',
                    menu_type_slug: slug,
                    category_name: cat.name,
                    dish_name: item.name,
                    variant_name: variant.name,
                    error: variantError.message,
                  },
                  { status: 500 },
                );
              }

              insertedVariants += 1;
            }
          }
        }
      }

      summary.push({
        menu_type_slug: slug,
        categories: insertedCategories,
        dishes: insertedDishes,
        variants: insertedVariants,
      });
    }

    return NextResponse.json({ ok: true, summary });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || String(e) },
      { status: 500 },
    );
  }
}


