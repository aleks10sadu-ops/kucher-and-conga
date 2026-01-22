// ВРЕМЕННЫЙ роут для миграции данных бизнес-ланчей из app/data/businessLunchData.js в Supabase.
// ВАЖНО: после успешной миграции этот файл нужно удалить из репозитория.

import { NextResponse, NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '../../../../lib/supabase/server';
import { businessLunchData } from '../../../../app/data/businessLunchData';

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

    // 1. Миграция бизнес-ланч сетов
    const sets = businessLunchData.business_lunch_sets || [];
    let insertedSets = 0;

    // Очищаем старые данные
    const { error: deleteSetsError } = await supabase
      .from('business_lunch_sets')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Удаляем все

    if (deleteSetsError) {
      return NextResponse.json(
        { ok: false, step: 'delete_old_sets', error: deleteSetsError.message },
        { status: 500 },
      );
    }

    for (let i = 0; i < sets.length; i++) {
      const set = sets[i];
      const { error: setError } = await supabase
        .from('business_lunch_sets')
        .insert({
          name: set.name,
          price: Number(set.price),
          currency: set.currency || '₽',
          courses: set.courses || [],
          sort_order: i,
          is_active: true,
        });

      if (setError) {
        return NextResponse.json(
          {
            ok: false,
            step: 'insert_set',
            set_name: set.name,
            error: setError.message,
          },
          { status: 500 },
        );
      }

      insertedSets += 1;
    }

    // 2. Миграция блюд по дням недели
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const menuByDay = businessLunchData.menu_by_day || {};
    let insertedDishes = 0;

    // Очищаем старые данные
    const { error: deleteDishesError } = await supabase
      .from('business_lunch_dishes')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Удаляем все

    if (deleteDishesError) {
      return NextResponse.json(
        { ok: false, step: 'delete_old_dishes', error: deleteDishesError.message },
        { status: 500 },
      );
    }

    for (const day of days) {
      const dishes = (menuByDay as any)[day] || [];
      for (let i = 0; i < dishes.length; i++) {
        const dish = dishes[i];
        const { error: dishError } = await supabase
          .from('business_lunch_dishes')
          .insert({
            day_of_week: day,
            category: dish.category || null,
            name: dish.name,
            ingredients: dish.ingredients || null,
            course_type: dish.type || dish.course_type || 'САЛАТ',
            sort_order: i,
          });

        if (dishError) {
          return NextResponse.json(
            {
              ok: false,
              step: 'insert_dish',
              day: day,
              dish_name: dish.name,
              error: dishError.message,
            },
            { status: 500 },
          );
        }

        insertedDishes += 1;
      }
    }

    // 3. Миграция гарниров и напитков
    const sides = businessLunchData.sides?.options || [];
    const drinks = businessLunchData.drinks?.options || [];
    let insertedOptions = 0;

    // Очищаем старые данные
    const { error: deleteOptionsError } = await supabase
      .from('business_lunch_options')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Удаляем все

    if (deleteOptionsError) {
      return NextResponse.json(
        { ok: false, step: 'delete_old_options', error: deleteOptionsError.message },
        { status: 500 },
      );
    }

    // Добавляем гарниры
    for (let i = 0; i < sides.length; i++) {
      const { error: optionError } = await supabase
        .from('business_lunch_options')
        .insert({
          option_type: 'sides',
          name: sides[i],
          sort_order: i,
          is_active: true,
        });

      if (optionError) {
        return NextResponse.json(
          {
            ok: false,
            step: 'insert_side',
            side_name: sides[i],
            error: optionError.message,
          },
          { status: 500 },
        );
      }

      insertedOptions += 1;
    }

    // Добавляем напитки
    for (let i = 0; i < drinks.length; i++) {
      const { error: optionError } = await supabase
        .from('business_lunch_options')
        .insert({
          option_type: 'drinks',
          name: drinks[i],
          sort_order: i,
          is_active: true,
        });

      if (optionError) {
        return NextResponse.json(
          {
            ok: false,
            step: 'insert_drink',
            drink_name: drinks[i],
            error: optionError.message,
          },
          { status: 500 },
        );
      }

      insertedOptions += 1;
    }

    // 4. Миграция информации о промо
    const promotion = businessLunchData.promotion || {};

    // Очищаем старые данные
    const { error: deletePromoError } = await supabase
      .from('business_lunch_promotion')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Удаляем все

    if (deletePromoError) {
      return NextResponse.json(
        { ok: false, step: 'delete_old_promotion', error: deletePromoError.message },
        { status: 500 },
      );
    }

    const { error: promoError } = await supabase
      .from('business_lunch_promotion')
      .insert({
        description: promotion.description || null,
        note: promotion.note || null,
        period: promotion.period || null,
      });

    if (promoError) {
      return NextResponse.json(
        {
          ok: false,
          step: 'insert_promotion',
          error: promoError.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      summary: {
        sets: insertedSets,
        dishes: insertedDishes,
        options: insertedOptions,
        promotion: 1,
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || String(e) },
      { status: 500 },
    );
  }
}

