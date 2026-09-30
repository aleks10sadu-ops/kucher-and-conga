import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import EventsClient from './events/EventsClient';
import HallsClient from './halls/HallsClient';
import VacanciesClient from './vacancies/VacanciesClient';

const post = {
  id: 'post-1',
  slug: 'test-post',
  title: 'Тестовая карточка',
  excerpt: 'Короткое описание без искусственного пустого пространства.',
  content: null,
  image_url: '/halls/rubin.webp',
  published_at: '2026-08-20T00:00:00.000Z',
  created_at: '2026-08-20T00:00:00.000Z',
  category: 'test',
  is_published: true,
};

it('shows event times in Moscow regardless of the server timezone', () => {
  const previousTimezone = process.env.TZ;
  try {
    process.env.TZ = 'UTC';
    const html = renderToStaticMarkup(React.createElement(EventsClient, { initialPosts: [] }));
    expect(html).toContain('31 дек., 22:00');
    expect(html).not.toContain('31 дек., 19:00');
  } finally {
    if (previousTimezone === undefined) delete process.env.TZ;
    else process.env.TZ = previousTimezone;
  }
});

describe.each([
  ['залов', HallsClient],
  ['вакансий', VacanciesClient],
  ['событий', EventsClient],
])('сетка карточек %s', (_section, Component) => {
  it('не растягивает первую публикацию на две строки', () => {
    const html = renderToStaticMarkup(
      React.createElement(Component, { initialPosts: [post] }),
    );

    expect(html).not.toContain('row-span-2');
    expect(html).not.toContain('col-span-2');
    expect(html).not.toContain('auto-rows-[1fr]');
    expect(html).toContain('h-44');
    expect(html).toContain('md:h-52');
  });
});
