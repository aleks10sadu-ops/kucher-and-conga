export type DeliveryZone = {
    id: number;
    name: string;
    price: number;
    color?: string;
    opacity?: number;
    coordinates: number[][][]; // Polygon coordinates
};

export type CartItem = {
    id: string | number;
    name: string;
    price: number;
    img?: string;
    qty: number;
    [key: string]: any; // For flexible properties until fully strictly typed
};

export type DeliverySettings = {
    isDeliveryEnabled: boolean;
    startTime: string;
    endTime: string;
    minDeliveryHours: number;
    maxAdvanceDays: number;
};

export type RestaurantSettings = {
    startTime: string;
    endTime: string;
    minAdvanceHours: number;
    maxAdvanceDays: number;
};

export type BookingData = {
    name?: string; // Legacy
    firstName: string;
    lastName?: string;
    phone: string;
    date: string;
    time: string;
    guests: number;
    comment?: string;
    hallId?: string | number | null;
};

export type DeliveryForm = {
    name: string;
    phone: string;
    address: string;
    comment: string;
    deliveryZone: DeliveryZone | null;
    deliveryPrice: number | null;
    coordinates: number[] | null;
    deliveryTime: 'asap' | string;
    deliveryTimeCustom: string;
    paymentMethod: 'card' | 'transfer' | 'cash';
    changeAmount: 'no-change' | string;
    hasAllergy: boolean;
    allergyDetails: string;
};

export type MenuItemVariant = {
    id?: string | number;
    name: string;
    price: number;
    weight: string | number | null;
};

export type MenuItem = {
    id: string | number;
    name: string;
    description?: string | null;
    price?: number;
    weight?: string | number | null;
    image?: string | null;
    image_url?: string | null;
    variants?: MenuItemVariant[];
    categoryId?: string | number;
    category_id?: string | number | null;
    [key: string]: any;
};

export type MenuCategory = {
    id: string | number;
    name: string;
    note?: string;
    items: MenuItem[];
    sort_order?: number;
};

export type BusinessLunchSet = {
    id: number;
    name: string;
    price: number;
    currency: string;
    courses: string[];
};

export type BusinessLunchDish = {
    category: string;
    name: string;
    ingredients: string;
    type: string;
    id?: number | string;
    course_type?: string;
    day_of_week?: string;
};

export type BusinessLunchData = {
    restaurant: string;
    promotion: {
        description: string;
        note: string;
        period: string;
    };
    business_lunch_sets: BusinessLunchSet[];
    menu_by_day: Record<string, BusinessLunchDish[]>;
    sides: {
        description: string;
        options: string[];
    };
    drinks: {
        description: string;
        options: string[];
    };
    delivery: {
        minimum_order: string;
        free_delivery: string;
        whatsapp: string;
        phone: string;
        website: string;
    };
};


