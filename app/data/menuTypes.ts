
export interface MenuType {
    id: string;
    name: string;
    description: string;
    isActive: boolean;
}

// Типы меню ресторана Konga
export const menuTypes: MenuType[] = [
    {
        id: 'main',
        name: 'Основное меню',
        description: 'Полное меню ресторана с основными блюдами',
        isActive: true
    },
    {
        id: 'promotions',
        name: 'Акции',
        description: 'Специальные предложения и скидки',
        isActive: false
    },
    {
        id: 'kids',
        name: 'Детское меню',
        description: 'Блюда для детей',
        isActive: false
    },
    {
        id: 'bar',
        name: 'Барное меню',
        description: 'Коктейли, напитки и закуски к ним',
        isActive: false
    },
    {
        id: 'wine',
        name: 'Винная карта',
        description: 'Коллекция вин и алкогольных напитков',
        isActive: false
    },
    {
        id: 'business',
        name: 'Бизнес-ланч',
        description: 'Комплексные обеды для деловых встреч',
        isActive: false
    },
    {
        id: 'banquet',
        name: 'Банкетное меню',
        description: 'Меню для торжественных мероприятий',
        isActive: false
    }
];

// Функция для получения активного типа меню
export function getActiveMenuType(): MenuType {
    return menuTypes.find(type => type.isActive) || menuTypes[0];
}

// Функция для переключения типа меню
export function setActiveMenuType(typeId: string): void {
    menuTypes.forEach(type => {
        type.isActive = type.id === typeId;
    });
}
