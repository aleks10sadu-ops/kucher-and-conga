import content from './holidayBanquetContent.json';

export type BanquetCategory = 'regular' | 'corporate' | 'night';
export type BanquetVenue = 'kucher' | 'conga';

export const BANQUET_CATEGORIES = [
    { id: 'regular', name: 'Банкетные меню' },
    { id: 'corporate', name: 'Новогодние корпоративы' },
    { id: 'night', name: 'Новогодняя ночь' },
] as const;

const kucherProgramHalls = 'Барный зал, Морской зал и Крытая веранда';

export const HOLIDAY_BANQUETS = [
    { category: 'corporate', venue: 'kucher', price: 5000, program: false, halls: 'Отдельные банкетные залы, Летняя веранда и беседки', content: content.kucher },
    { category: 'corporate', venue: 'kucher', price: 6000, program: true, halls: kucherProgramHalls, content: content.kucher },
    { category: 'corporate', venue: 'kucher', price: 7000, program: true, halls: kucherProgramHalls, content: content.corporate7000 },
    { category: 'corporate', venue: 'kucher', price: 8000, program: true, halls: kucherProgramHalls, content: content.corporate8000 },
    { category: 'corporate', venue: 'conga', price: 7000, program: true, halls: 'Зал Конга', content: content.corporate7000 },
    { category: 'corporate', venue: 'conga', price: 8000, program: true, halls: 'Зал Конга', content: content.corporate8000 },
    { category: 'night', venue: 'kucher', price: 8000, program: false, halls: 'Отдельные банкетные залы Кучера', content: content.night },
    { category: 'night', venue: 'conga', price: 15000, program: true, halls: 'Зал Конга', content: content.night },
] as const;

export function holidayBanquetHref(category: Exclude<BanquetCategory, 'regular'>, venue: BanquetVenue) {
    return `/menu?banquet=${category}&hall=${venue}#banquet`;
}

export function readBanquetDeepLink(search: string): { category: BanquetCategory; venue: BanquetVenue } {
    const params = new URLSearchParams(search);
    const requested = params.get('banquet');
    return {
        category: requested === 'corporate' || requested === 'night' ? requested : 'regular',
        venue: params.get('hall') === 'kucher' ? 'kucher' : 'conga',
    };
}
