// Единые данные ресторана для шапки/подвала и SEO. Один источник правды.

export const SITE = {
    name: 'Кучер & Conga',
    city: 'Дмитров',
    address: 'Дмитров, Промышленная улица, 20Б',
    phones: [
        { label: '+7 (916) 317-78-87', tel: '+79163177887' },
        { label: '+7 (916) 297-78-87', tel: '+79162977887' },
    ],
    telegram: 'https://t.me/Kvazar27',
    // Соцсети ресторана (кнопки в подвале).
    socials: [
        { id: 'telegram', label: 'Telegram', cta: 'Мы в Telegram', href: 'https://t.me/kucherandconga' },
        { id: 'vk', label: 'ВКонтакте', cta: 'Мы ВКонтакте', href: 'https://vk.com/restoran_kucher' },
    ],
    yandexOrg: 'https://yandex.ru/maps/org/kucher_conga/10214255530/',
    hours: [
        { d: 'Пн–Чт', t: '12:00 — 23:00', note: 'вход до 22:00' },
        { d: 'Пт, Сб', t: '12:00 — 01:00', note: 'вход до 23:00' },
        { d: 'Вс', t: '13:00 — 23:00', note: 'вход до 22:00' },
    ],
    hoursNote: 'Брони и доставка — с 12:00 до 22:00',
} as const;

// Разделы для выдвижного меню шапки.
export const NAV = [
    { href: '/menu', label: 'Меню и доставка' },
    { href: '/booking', label: 'Забронировать стол' },
    { href: '/promotions', label: 'Акции' },
    { href: '/events', label: 'События' },
    { href: '/halls', label: 'Залы и банкеты' },
    { href: '/vacancies', label: 'Вакансии' },
    { href: '/#atmosphere', label: 'Атмосфера' },
    { href: '/#reviews', label: 'Отзывы гостей' },
    { href: '/#find', label: 'Как нас найти' },
] as const;

// Короткая навигация в строке шапки (десктоп).
export const NAV_TOP = [
    { href: '/menu', label: 'Меню' },
    { href: '/booking', label: 'Бронь' },
    { href: '/events', label: 'События' },
    { href: '/halls', label: 'Залы' },
    { href: '/vacancies', label: 'Команда' },
] as const;

// Базовый адрес сайта для SEO (sitemap/robots/canonical/Schema).
// Задайте NEXT_PUBLIC_SITE_URL в Vercel, если боевой домен другой.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://kucherandconga.ru').replace(/\/$/, '');

// Реквизиты оператора для юридических страниц (152-ФЗ).
// ВАЖНО: заполните значения с пометкой «⟨…⟩» реальными данными юрлица/ИП.
export const LEGAL = {
    operator: 'Индивидуальный предприниматель Багдасарян Сергей Эдуардович',
    inn: '772088340270',
    ogrn: '323508100249719', // ОГРНИП
    legalAddress: '141801, г. Дмитров, ул. Маринино, д. 90',
    email: 'sergobgdo@yandex.ru',
    updated: '9 июля 2026 г.',
} as const;
