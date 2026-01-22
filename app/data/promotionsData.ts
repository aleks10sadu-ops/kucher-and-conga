
export interface PromotionItem {
  id: number;
  name: string;
  name_transliteration: string;
  description: string;
  ingredients: string[];
  price: number;
  currency: string;
  volume: number;
  volume_unit: string;
  weight: string;
  bottle: string;
  bottle_color: string;
  drink_color: string;
}

export interface PromotionCategory {
  id: string;
  name: string;
  items: PromotionItem[];
}

export interface PromotionsData {
  title: string;
  categories: PromotionCategory[];
}

// Данные акций
export const promotionsData: PromotionsData = {
  title: "Акция на коктейли с Hoppers Gin",
  categories: [
    {
      id: "promotions",
      name: "Акция на коктейли с Hoppers Gin",
      items: [
        {
          id: 1,
          name: "Свободное падение",
          name_transliteration: "Svobodnoe padenie",
          description: "Hoppers Original gin, сок грейпфрута, сахарный сироп, сок лимона, корица, перец, грейпфрут",
          ingredients: [
            "Hoppers Original gin",
            "сок грейпфрута",
            "сахарный сироп",
            "сок лимона",
            "корица",
            "перец",
            "грейпфрут"
          ],
          price: 360,
          currency: "₽",
          volume: 350,
          volume_unit: "мл",
          weight: "350 мл",
          bottle: "Hoppers Original Gin",
          bottle_color: "blue_cap",
          drink_color: "orange_yellow"
        },
        {
          id: 2,
          name: "Лавандос",
          name_transliteration: "Lavandos",
          description: "Hoppers Lavander gin, сироп 'лаванда', чабрец, сахарный сироп, сок лимона",
          ingredients: [
            "Hoppers Lavander gin",
            "сироп 'лаванда'",
            "чабрец",
            "сахарный сироп",
            "сок лимона"
          ],
          price: 360,
          currency: "₽",
          volume: 250,
          volume_unit: "мл",
          weight: "250 мл",
          bottle: "Hoppers Lavander Gin",
          bottle_color: "purple_cap",
          drink_color: "purple_lavender"
        },
        {
          id: 3,
          name: "Жгучий мандарин",
          name_transliteration: "Zhguchiy mandarin",
          description: "Hoppers Mandarin gin, сироп 'мандарин', сок апельсина, сок лимона, табаско",
          ingredients: [
            "Hoppers Mandarin gin",
            "сироп 'мандарин'",
            "сок апельсина",
            "сок лимона",
            "табаско"
          ],
          price: 420,
          currency: "₽",
          volume: 350,
          volume_unit: "мл",
          weight: "350 мл",
          bottle: "Hoppers Mandarin Gin",
          bottle_color: "red_cap",
          drink_color: "green_yellow"
        }
      ]
    }
  ]
};
