import { expect, it } from 'vitest';
import { russianPublicPost, russianPublicText } from './russianPublicText';
import { mergeHalls } from '../halls/halls-data';
import { bookingHallKeyForName, normalizeBookingHalls } from '../booking/hallCatalog';
import { classifyHall } from '../booking/rules';
import { mapExternalMenu } from '../iiko/mapMenu';
import { applyBusinessLunchNames } from '../iiko/businessLunchNames';

it('translates public copy while preserving HTML, links, contacts and source records', () => {
    const content = '<a href="/halls/conga" class="conga">Conga</a> https://conga.example/Welcome team@conga.ru';
    const post = { title: 'Кучер & CONGA', content, excerpt: null, slug: 'conga', image_url: '/conga.webp' };
    expect(russianPublicPost(post)).toEqual({ ...post, title: 'Кучер и Конга', content: content.replace('>Conga<', '>Конга<') });
    expect(post.title).toBe('Кучер & CONGA');
    expect(russianPublicText('Welcome-фуршет · Telegram · PRIME+ · BBQ · Rich · Darbas · Cola · Borjomi · Bona Aqua · iiko'))
        .toBe('Приветственный-фуршет · Телеграм · Прайм+ · барбекю · Рич · Дарбас · Кола · Боржоми · Бон Аква · Айко');
});

it('keeps CRM identity, content matching and booking rules for old and Russian hall names', () => {
    for (const name of ['Conga', 'CONGA', 'Конга']) {
        const [hall] = mergeHalls([{ id: 'crm-conga', name, capacity: 140 }], [{ id: 'post-id', title: 'Conga', content: 'Зал CONGA', image_url: '/halls/conga.webp' }]);
        expect(hall).toMatchObject({ id: 'crm-conga', name: 'Конга', description: 'Зал Конга', dbId: 'post-id', image: '/halls/conga.webp' });
        expect(bookingHallKeyForName(name)).toBe('conga');
        expect(classifyHall(name)).toBe('conga');
        expect(normalizeBookingHalls([hall])[0]).toMatchObject({ key: 'conga', name: 'Конга', sourceHallId: 'crm-conga', group: 'conga', banquetMenus: ['conga-7500', 'conga-6000'] });
    }
});

it('translates live menu names and descriptions without changing product IDs or prices', () => {
    const menu = mapExternalMenu({ itemCategories: [{ id: 'drinks', name: 'Напитки', items: [{ itemId: 'drink-id', name: 'Вода Bona Aqua', description: 'Соус BBQ', itemSizes: [{ prices: [{ organizationId: 'test-org', price: 200 }] }] }] }] });
    expect(menu.main.categories[0].items[0]).toMatchObject({ id: 'drink-id', name: 'Вода Бон Аква', description: 'Соус барбекю', price: 200 });
    expect(applyBusinessLunchNames(menu.main.categories, new Map([['drink-id', 'Голень BBQ']]))[0].items[0].name).toBe('Голень барбекю');
});
