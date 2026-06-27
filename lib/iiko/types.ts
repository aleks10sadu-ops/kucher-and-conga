// Минимально необходимые поля сырого ответа iiko Cloud API (/api/2/menu/by_id).

export interface IikoNutrition {
  fats: number | null;
  proteins: number | null;
  carbs: number | null;
  energy: number | null;
}

export interface IikoPrice {
  organizationId: string;
  price: number | null;
}

export interface IikoItemSize {
  sku?: string;
  sizeName?: string;
  portionWeightGrams?: number | null;
  prices?: IikoPrice[];
  buttonImageUrl?: string | null;
  nutritionPerHundredGrams?: IikoNutrition | null;
  itemModifierGroups?: unknown[];
}

export interface IikoItem {
  itemId: string;
  sku?: string;
  name: string;
  description?: string;
  isHidden?: boolean;
  type?: string;
  itemSizes?: IikoItemSize[];
}

export interface IikoCategory {
  id: string;
  name: string;
  items?: IikoItem[];
}

export interface IikoExternalMenu {
  id?: number | string;
  name?: string;
  itemCategories?: IikoCategory[];
}
