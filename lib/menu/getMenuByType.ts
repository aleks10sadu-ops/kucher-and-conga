import { createSupabaseRouteClient } from '../supabase/server';
import { menuData } from '../../app/data/menu';
import { promotionsData } from '../../app/data/promotionsData';
import { kidsMenuData } from '../../app/data/kidsMenuData';
import { barMenuData } from '../../app/data/barMenuData';
import { wineMenuData } from '../../app/data/wineMenuData';
import { Database } from '@/types/database.types'; // Assuming we will generate this, but using any for now if not exists

// Define fallback types since we might not have static data types perfect yet
const STATIC_BY_TYPE: Record<string, any> = {
  main: menuData,
  promotions: promotionsData,
  kids: kidsMenuData,
  bar: barMenuData,
  wine: wineMenuData,
};

import { MenuCategory, MenuItem, MenuItemVariant } from '@/types/index';


export async function getMenuByType(menuTypeSlug: string = 'main'): Promise<MenuCategory[]> {
  // Fallback to static data if Supabase is not configured
  const useStaticFallback = (): MenuCategory[] => {
    const data = STATIC_BY_TYPE[menuTypeSlug] || STATIC_BY_TYPE.main;
    return (data.categories || []) as MenuCategory[];
  };

  try {
    const supabase = await createSupabaseRouteClient();

    // Find menu_type by slug
    const { data: menuType, error: mtError } = await supabase
      .from('menu_types')
      .select('id')
      .eq('slug', menuTypeSlug)
      .maybeSingle();

    if (mtError || !menuType) {
      return useStaticFallback();
    }

    const menuTypeId = menuType.id;

    // Load categories
    const { data: categories, error: catError } = await supabase
      .from('categories')
      .select('id, name, sort_order, note')
      .eq('menu_type_id', menuTypeId)
      .order('sort_order', { ascending: true });

    if (catError || !categories?.length) {
      return useStaticFallback();
    }

    // Load dishes for those categories
    const categoryIds = categories.map((c) => c.id);
    const { data: dishes, error: dishError } = await supabase
      .from('dishes')
      .select('id, category_id, name, description, price, weight, image_url, is_active')
      .in('category_id', categoryIds)
      .eq('is_active', true);

    if (dishError || !dishes?.length) {
      return useStaticFallback();
    }

    // Load variants
    const dishIds = dishes.map((d) => d.id);
    const { data: variants } = await supabase
      .from('dish_variants')
      .select('id, dish_id, name, price, weight')
      .in('dish_id', dishIds);

    const variantsByDish: Record<number, MenuItemVariant[]> = {};
    (variants || []).forEach((v) => {
      // @ts-ignore
      if (!variantsByDish[v.dish_id]) variantsByDish[v.dish_id] = [];
      // @ts-ignore
      variantsByDish[v.dish_id].push({
        id: v.id,
        name: v.name,
        price: Number(v.price),
        weight: v.weight || null,
      });
    });

    const itemsByCategory: Record<number, MenuItem[]> = {};
    dishes.forEach((d) => {
      // @ts-ignore
      if (!itemsByCategory[d.category_id]) itemsByCategory[d.category_id] = [];
      // @ts-ignore
      itemsByCategory[d.category_id].push({
        id: d.id,
        name: d.name,
        description: d.description || '',
        price: Number(d.price),
        weight: d.weight || null,
        image: d.image_url || null,
        // @ts-ignore
        variants: variantsByDish[d.id] || [],
      });
    });

    return categories.map((c) => ({
      id: c.id,
      name: c.name,
      note: c.note || undefined,
      // @ts-ignore
      items: (itemsByCategory[c.id] || []).map((item) => ({
        ...item,
        image: item.image || null,
      })),
    }));
  } catch {
    return useStaticFallback();
  }
}
