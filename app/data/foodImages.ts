// Заглушка для блюд без изображения
// Возвращает null - это означает что у блюда нет изображения и нужно показать плейсхолдер

// Пустой объект - все изображения теперь загружаются из Supabase
export const foodImages: Record<string, string | null> = {};

// Функция для получения изображения блюда
// Возвращает null если изображения нет (показывать плейсхолдер)
export function getFoodImage(itemId: string): string | null {
    return null;
}
