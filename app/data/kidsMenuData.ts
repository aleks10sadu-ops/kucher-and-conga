import { MenuCategory } from "@/types";

export interface KidsMenuData {
    title: string;
    category: string;
    categories: MenuCategory[];
}

// Данные детского меню
export const kidsMenuData: KidsMenuData = {
    title: "Детское меню",
    category: "Детское питание",
    categories: [
        {
            id: "kids_menu",
            name: "Детское меню",
            items: [
                {
                    id: 1,
                    name: "Детский бургер с картофелем фри и кетчупом",
                    description: "Ароматная булочка, котлета, свежие огурцы, салат Романо, сыр Чеддер, соус Чесночный. Подается с картофелем фри и кетчупом",
                    weight: "390 гр",
                    weight_unit: "гр",
                    variants: [
                        {
                            name: "котлета из курицы",
                            price: 590,
                            weight: "390 гр"
                        },
                        {
                            name: "котлета из говядины",
                            price: 690,
                            weight: "390 гр"
                        }
                    ],
                    price: 590
                },
                {
                    id: 2,
                    name: "Салатик с голубикой и курицей",
                    description: "Куриное филе, салатный микс, сыр Пармезан, голубика свежая, соус крем-бальзамик",
                    weight: "150 гр",
                    weight_unit: "гр",
                    price: 490,
                    currency: "руб"
                },
                {
                    id: 3,
                    name: "Цезарек с курочкой",
                    weight: "115 гр",
                    weight_unit: "гр",
                    price: 280,
                    currency: "руб"
                },
                {
                    id: 4,
                    name: "Морковные и яблочные палочки",
                    weight: "150 гр",
                    weight_unit: "гр",
                    price: 180,
                    currency: "руб"
                },
                {
                    id: 5,
                    name: "Овощной салатик",
                    description: "Помидоры, огурцы, сладкий перец, маслины, растительное масло",
                    weight: "180 гр",
                    weight_unit: "гр",
                    price: 390,
                    currency: "руб"
                },
                {
                    id: 6,
                    name: "Борщ со сметанкой",
                    weight: "270 гр",
                    weight_unit: "гр",
                    price: 210,
                    currency: "руб"
                },
                {
                    id: 7,
                    name: "Лапшичка куриная",
                    weight: "315 гр",
                    weight_unit: "гр",
                    price: 210,
                    currency: "руб"
                },
                {
                    id: 8,
                    name: "Куриная котлетка с пюре",
                    weight: "200 гр",
                    weight_unit: "гр",
                    price: 340,
                    currency: "руб"
                },
                {
                    id: 9,
                    name: "Паста с томатами",
                    weight: "180 гр",
                    weight_unit: "гр",
                    price: 310,
                    currency: "руб"
                },
                {
                    id: 10,
                    name: "Паста с курочкой",
                    weight: "200 гр",
                    weight_unit: "гр",
                    price: 510,
                    currency: "руб"
                },
                {
                    id: 11,
                    name: "Паста Сырная",
                    weight: "180 гр",
                    weight_unit: "гр",
                    price: 410,
                    currency: "руб"
                },
                {
                    id: 12,
                    name: "Куриные наггетсы с кетчупом",
                    weight: "120/50 гр",
                    weight_unit: "гр",
                    price: 350,
                    currency: "руб"
                },
                {
                    id: 13,
                    name: "Хрустящие сырные шарики",
                    weight: "200 гр",
                    weight_unit: "гр",
                    price: 480,
                    currency: "руб"
                },
                {
                    id: 14,
                    name: "Золотистые куриные колобки",
                    weight: "200 гр",
                    weight_unit: "гр",
                    price: 360,
                    currency: "руб"
                },
                {
                    id: 15,
                    name: "Пицца с сыром и курочкой",
                    weight: "350 гр",
                    weight_unit: "гр",
                    price: 580,
                    currency: "руб"
                },
                {
                    id: 16,
                    name: "Пицца с грушей и нутеллой",
                    weight: "350 гр",
                    weight_unit: "гр",
                    price: 660,
                    currency: "руб"
                }
            ]
        }
    ]
};
