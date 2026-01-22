export interface WineVariant {
  name: string;
  price: number;
  weight: string;
}

export interface WineItem {
  id: number;
  name: string;
  type?: string;
  strength?: string;
  description?: string;
  grape?: string;
  price?: number;
  currency: string;
  volume?: number;
  volume_unit: string;
  weight: string;
  price_750?: number;
  price_125?: number;
  volume_750?: number;
  volume_125?: number;
  variants?: WineVariant[];
}

export interface WineParsedItem extends WineItem {
  categoryId: string;
  categoryName: string;
}

export interface WineCategory {
  id: string;
  name: string;
  description?: string;
  items: WineItem[];
}

export interface WineMenuData {
  title: string;
  color_legend: {
    white: string;
    red: string;
    rose: string;
  };
  categories: WineCategory[];
}

// Данные винной карты
export const wineMenuData: WineMenuData = {
  title: "Винная карта",
  color_legend: {
    white: "белое",
    red: "красное",
    rose: "розовое"
  },
  categories: [
    {
      id: "sparkling_wines",
      name: "Игристые вина",
      description: "Отличные аперитивы! Брют прекрасно дополнит легкие салаты, блюда из нежирного мяса, рыбы и морепродуктов. А вкус сладких и полусладких игристых великолепно раскроется с фруктами и десертами!",
      items: [
        {
          id: 1,
          name: "Бруни Просекко",
          type: "белое",
          strength: "11%",
          description: "белое брют, Италия, Венето",
          grape: "Глера",
          price: 3250,
          currency: "₽",
          volume: 750,
          volume_unit: "мл",
          weight: "750 мл"
        },
        {
          id: 2,
          name: "Бруни Кюве Дольче",
          type: "белое",
          strength: "7.5%",
          description: "белое сладкое, Италия, Пьемонт, Bruni (Бруни)",
          grape: "Мускат, Мальвазия",
          price: 1950,
          currency: "₽",
          volume: 750,
          volume_unit: "мл",
          weight: "750 мл"
        },
        {
          id: 3,
          name: "Нуволе Брют",
          type: "белое",
          strength: "10%",
          description: "брют белое, крепость 10%, ЗГУ Кубань, Таманский полуостров",
          grape: "Алиготе, Пино Блан, Рислинг рейнский, Шардоне, Бианка",
          price: 1250,
          currency: "₽",
          volume: 750,
          volume_unit: "мл",
          weight: "750 мл"
        },
        {
          id: 4,
          name: "Нуволе Полусладкое",
          type: "белое",
          strength: "10%",
          description: "игристое белое полусладкое, крепость 10%, ЗГУ Кубань, Таманский полуостров",
          grape: "Цитронный Магарача, Пино Бьянко, Алиготе, Бианка, Рислинг",
          price: 1250,
          currency: "₽",
          volume: 750,
          volume_unit: "мл",
          weight: "750 мл"
        },
        {
          id: 5,
          name: "Балаклава Мускат",
          type: "белое",
          strength: "11.5%",
          description: "белое полусладкое, крепость 11,5% об., ЗГУ, Крым",
          grape: "Мускат",
          price: 1650,
          currency: "₽",
          volume: 750,
          volume_unit: "мл",
          weight: "750 мл"
        },
        {
          id: 6,
          name: "Армения",
          type: "белое",
          strength: "11.5%",
          description: "белое полусухое, крепость 11,5%, Армения, Арагацотнская обл.",
          grape: "Кангун",
          price: 1450,
          currency: "₽",
          volume: 750,
          volume_unit: "мл",
          weight: "750 мл"
        },
        {
          id: 7,
          name: "Армения",
          type: "розовое",
          strength: "11.5%",
          description: "розовое полусухое, крепость 11,5%, Армения, Арагацотнская обл.",
          grape: "Арени",
          price: 1450,
          currency: "₽",
          volume: 750,
          volume_unit: "мл",
          weight: "750 мл"
        },
        {
          id: 8,
          name: "Мартини Асти",
          type: "белое",
          strength: "7.5%",
          description: "игристое белое сладкое, крепость 7,5%, Италия, Пьемонт, Асти",
          grape: "Белый мускат",
          price: 5900,
          currency: "₽",
          volume: 750,
          volume_unit: "мл",
          weight: "750 мл"
        },
        {
          id: 9,
          name: "Мартини Просекко",
          type: "белое",
          strength: "11.5%",
          description: "игристое белое, крепость 11,5%, Венето, Фриули-Венеция-Джулия, Италия",
          grape: "Глера и другие регламентированные сорта региона Просекко D.O.C",
          price: 5900,
          currency: "₽",
          volume: 750,
          volume_unit: "мл",
          weight: "750 мл"
        },
        {
          id: 10,
          name: "Мартини Брют",
          type: "белое",
          strength: "11.5%",
          description: "игристое белое, крепость 11,5%, Италия, Пьемонт",
          grape: "Пино Бьянко, Глера и другие сорта",
          price: 5900,
          currency: "₽",
          volume: 750,
          volume_unit: "мл",
          weight: "750 мл"
        }
      ]
    },
    {
      id: "white_light",
      name: "Тихие вина - Белые вина легкие и освежающие",
      description: "Прекрасная пара к блюдам из белого мяса, к рыбе и легким салатам",
      items: [
        {
          id: 11,
          name: "Пино Гриджио Альма Романа",
          type: "белое",
          strength: "12%",
          description: "белое полусухое, крепость 12%, Италия, Венето",
          grape: "Пино Гриджио",
          price: 1850,
          currency: "₽",
          volume: 750,
          volume_unit: "мл",
          weight: "750 мл"
        },
        {
          id: 12,
          name: "Совиньон Блан Селлар Селекшн",
          type: "белое",
          strength: "11.5%",
          description: "белое сухое, крепость 11,5%, Чили, Централь Велли",
          grape: "Совиньон Блан",
          price: 1650,
          currency: "₽",
          volume: 750,
          volume_unit: "мл",
          weight: "750 мл"
        },
        {
          id: 13,
          name: "Армения",
          type: "белое",
          strength: "13%",
          description: "белое полусладкое, крепость 13%, Армения, Арагацотнская обл.",
          grape: "Кангун",
          price: 1450,
          currency: "₽",
          volume: 750,
          volume_unit: "мл",
          weight: "750 мл"
        },
        {
          id: 14,
          name: "Апазанская Долина",
          type: "белое",
          strength: "11.5%",
          description: "Вино Мамико белое полусладкое, крепость 11,5%, Грузия, Кахетия",
          grape: "Ркацители, Кахури Мцване, Киси",
          price_750: 1250,
          price_125: 310,
          currency: "₽",
          volume_750: 750,
          volume_125: 125,
          volume_unit: "мл",
          variants: [
            {
              name: "750 мл",
              price: 1250,
              weight: "750 мл"
            },
            {
              name: "125 мл",
              price: 310,
              weight: "125 мл"
            }
          ],
          price: 1250,
          weight: "750 мл"
        }
      ]
    },
    {
      id: "white_aromatic",
      name: "Белые вина ароматные и полнотелые",
      description: "Идеальное сочетание с закусками, салатами и морепродуктами!",
      items: [
        {
          id: 15,
          name: "Ханс Баер Рислинг",
          type: "белое",
          strength: "11.5%",
          description: "белое полусухое, крепость 11,5%, Германия, Рейнгессен",
          grape: "Рислинг",
          price: 2850,
          currency: "₽",
          volume: 750,
          volume_unit: "мл",
          weight: "750 мл"
        },
        {
          id: 16,
          name: "Шато Люби",
          type: "белое",
          strength: "12.5%",
          description: "белое сухое, крепость 12,5%, Франция, Бордо",
          grape: "Совиньон Блан, Семийон",
          price: 2650,
          currency: "₽",
          volume: 750,
          volume_unit: "мл",
          weight: "750 мл"
        },
        {
          id: 17,
          name: "Армения",
          type: "белое",
          strength: "13%",
          description: "белое сухое, крепость 13%, Армения, Арагацотнская обл.",
          grape: "Кангун, Ркацители",
          price: 1450,
          currency: "₽",
          volume: 750,
          volume_unit: "мл",
          weight: "750 мл"
        },
        {
          id: 18,
          name: "Нуволе Бьянко Ароматико",
          type: "белое",
          strength: "11%",
          description: "белое сухое, крепость 11%, ЗГУ Кубань, Таманский п-ов.",
          grape: "Шардоне, Траминер",
          price_750: 1250,
          price_125: 310,
          currency: "₽",
          volume_750: 750,
          volume_125: 125,
          volume_unit: "мл",
          variants: [
            {
              name: "750 мл",
              price: 1250,
              weight: "750 мл"
            },
            {
              name: "125 мл",
              price: 310,
              weight: "125 мл"
            }
          ],
          price: 1250,
          weight: "750 мл"
        }
      ]
    },
    {
      id: "red_light",
      name: "Красные вина легкие, фруктовые",
      description: "Достойно подчеркнут грибные блюда, сыры и, конечно, десерты!",
      items: [
        {
          id: 19,
          name: "Санджовезе Рубиконе Альма Романа",
          type: "красное",
          strength: "12.5%",
          description: "красное полусухое, крепость 12,5%, Италия, Эмилия-Романия",
          grape: "Санджовезе",
          price: 1850,
          currency: "₽",
          volume: 750,
          volume_unit: "мл",
          weight: "750 мл"
        },
        {
          id: 20,
          name: "Киндзмараули",
          type: "красное",
          strength: "11%",
          description: "Мамико, красное полусладкое, крепость 11%, Грузия, Кахетия",
          grape: "Саперави",
          price: 1650,
          currency: "₽",
          volume: 750,
          volume_unit: "мл",
          weight: "750 мл"
        },
        {
          id: 21,
          name: "Апазанская Долина",
          type: "красное",
          strength: "12%",
          description: "Мамико, красное полусладкое, крепость 12%, Грузия, Кахетия",
          grape: "Каберне Совиньон, Мерло, Саперави",
          price_750: 1250,
          price_125: 310,
          currency: "₽",
          volume_750: 750,
          volume_125: 125,
          volume_unit: "мл",
          variants: [
            {
              name: "750 мл",
              price: 1250,
              weight: "750 мл"
            },
            {
              name: "125 мл",
              price: 310,
              weight: "125 мл"
            }
          ],
          price: 1250,
          weight: "750 мл"
        },
        {
          id: 22,
          name: "Армения",
          type: "красное",
          strength: "12%",
          description: "красное полусладкое, крепость 12%, Армения, Арагацотнская область",
          grape: "",
          price: 1450,
          currency: "₽",
          volume: 750,
          volume_unit: "мл",
          weight: "750 мл"
        },
        {
          id: 23,
          name: "Армения",
          type: "красное",
          strength: "13%",
          description: "красное сухое, крепость 13%, Армения, Арагацотнская обл.",
          grape: "Ахтанак, Арени",
          price: 1450,
          currency: "₽",
          volume: 750,
          volume_unit: "мл",
          weight: "750 мл"
        }
      ]
    },
    {
      id: "red_elegant",
      name: "Красные вина элегантные среднетелые",
      description: "Сдержанно дополнят вкус пасты и мясных закусок!",
      items: [
        {
          id: 24,
          name: "Бруни Монтепульчано д'Абруццо",
          type: "красное",
          strength: "12.5%",
          description: "красное сухое, крепость 12,5%, Италия, Абруццо",
          grape: "Монтепульчано",
          price: 2450,
          currency: "₽",
          volume: 750,
          volume_unit: "мл",
          weight: "750 мл"
        },
        {
          id: 25,
          name: "Шато Люби",
          type: "красное",
          strength: "14%",
          description: "красное сухое, крепость 14%, Франция, Бордо",
          grape: "Мерло, Каберне Совиньон, Каберне Фран",
          price: 2650,
          currency: "₽",
          volume: 750,
          volume_unit: "мл",
          weight: "750 мл"
        }
      ]
    },
    {
      id: "red_jammy",
      name: "Красные вина яркие джемовые",
      description: "Пожалуй, лучшая история к стейку, грилю и выдержанным сырам!",
      items: [
        {
          id: 26,
          name: "Шираз Камден Парк",
          type: "красное",
          strength: "14%",
          description: "красное полусухое, крепость 14%, Австралия",
          grape: "Шираз",
          price: 2450,
          currency: "₽",
          volume: 750,
          volume_unit: "мл",
          weight: "750 мл"
        },
        {
          id: 27,
          name: "Мальбек Трапиче (Мендоса)",
          type: "красное",
          strength: "12.5%",
          description: "красное сухое, крепость 12,5%, Аргентина",
          grape: "Мальбек",
          price: 2450,
          currency: "₽",
          volume: 750,
          volume_unit: "мл",
          weight: "750 мл"
        },
        {
          id: 28,
          name: "Нуволе Каберне Мерло",
          type: "красное",
          strength: "12%",
          description: "красное сухое, крепость 12%, ЗГУ Кубань, Таманский п-ов.",
          grape: "Каберне Совиньон, Мерло",
          price_750: 1250,
          price_125: 310,
          currency: "₽",
          volume_750: 750,
          volume_125: 125,
          volume_unit: "мл",
          variants: [
            {
              name: "750 мл",
              price: 1250,
              weight: "750 мл"
            },
            {
              name: "125 мл",
              price: 310,
              weight: "125 мл"
            }
          ],
          price: 1250,
          weight: "750 мл"
        }
      ]
    },
    {
      id: "rose_wine",
      name: "Розовое вино",
      description: "Яркий аперитив к летним салатам, тар-тару и рыбным блюдам",
      items: [
        {
          id: 29,
          name: "Нуволе Розе",
          type: "розовое",
          strength: "11.5%",
          description: "розовое сухое, крепость 11,5% ЗГУ Кубань, Таманский п-ов.",
          grape: "Каберне Совиньон, Цвайгельт",
          price_750: 1250,
          price_125: 310,
          currency: "₽",
          volume_750: 750,
          volume_125: 125,
          volume_unit: "мл",
          variants: [
            {
              name: "750 мл",
              price: 1250,
              weight: "750 мл"
            },
            {
              name: "125 мл",
              price: 310,
              weight: "125 мл"
            }
          ],
          price: 1250,
          weight: "750 мл"
        }
      ]
    },
    {
      id: "non_alcoholic_wine",
      name: "Безалкогольное вино",
      items: [
        {
          id: 30,
          name: "Hans Baer",
          type: "розовое",
          strength: "0.5%",
          description: "розовое сладкое, 0,5% Германия, Рейнгессен, Пино Нуар 100%",
          price: 1950,
          currency: "₽",
          volume: 750,
          volume_unit: "мл",
          weight: "750 мл"
        },
        {
          id: 31,
          name: "Vina Albali",
          type: "розовое",
          strength: "0.5%",
          description: "розовое сладкое, 0,5% Испания, Кастилия ла Манча, Гарнача 100%",
          price: 1950,
          currency: "₽",
          volume: 750,
          volume_unit: "мл",
          weight: "750 мл"
        }
      ]
    }
  ]
};
