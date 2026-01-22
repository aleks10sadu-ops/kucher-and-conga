// ВРЕМЕННЫЙ роут для миграции новогодней ночи в события
// ВАЖНО: после успешной миграции этот файл нужно удалить из репозитория.

import { NextResponse, NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '../../../../lib/supabase/server';

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

    // Проверяем, есть ли уже запись "Новогодняя ночь"
    const { data: existing } = await supabase
      .from('content_posts')
      .select('id')
      .eq('category', 'events')
      .eq('slug', 'novogodnyaya-noch')
      .maybeSingle();

    if (existing) {
      return NextResponse.json({
        ok: true,
        message: 'Запись "Новогодняя ночь" уже существует',
      });
    }

    // Создаем запись "Новогодняя ночь" в событиях
    const { data: newPost, error } = await supabase
      .from('content_posts')
      .insert({
        category: 'events',
        title: 'Новогодняя ночь',
        slug: 'novogodnyaya-noch',
        content: '<p class="text-lg text-neutral-300 leading-relaxed">Присоединяйтесь к нам на незабываемую новогоднюю ночь! Мы подготовили специальную программу, изысканное меню и праздничную атмосферу для вас и ваших близких.</p>',
        excerpt: 'Присоединяйтесь к нам на незабываемую новогоднюю ночь! Мы подготовили специальную программу, изысканное меню и праздничную атмосферу для вас и ваших близких.',
        image_url: '/kongo_ng.webp',
        is_published: true,
        published_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      message: 'Запись "Новогодняя ночь" успешно создана в событиях',
      post: newPost,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || String(e) },
      { status: 500 },
    );
  }
}

