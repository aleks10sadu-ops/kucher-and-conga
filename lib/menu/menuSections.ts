export const MENU_TYPE_ORDER = ['delivery', 'main', 'business', 'bar', 'wine', 'kids', 'promotions'] as const;

export const MENU_TYPE_DEFS: readonly { id: string; name: string }[] = [
    { id: 'delivery', name: 'Доставка и самовывоз' },
    { id: 'main', name: 'Основное меню' },
    { id: 'business', name: 'Бизнес-ланч' },
    { id: 'bar', name: 'Бар' },
    { id: 'wine', name: 'Винная карта' },
    { id: 'banquet', name: 'Банкетное меню' },
    { id: 'kids', name: 'Детское' },
    { id: 'promotions', name: 'Акции' },
];
