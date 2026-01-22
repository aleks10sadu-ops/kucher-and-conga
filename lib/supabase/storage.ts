// Утилиты для работы с Supabase Storage

import { createSupabaseBrowserClient } from './client';

const BUCKETS = {
    DISHES: 'dish-images',
    CONTENT: 'content-images', // Для залов, вакансий, событий, блога
};

export type ContentType = 'dish' | 'halls' | 'vacancies' | 'events' | 'blog';

/**
 * Универсальная функция для загрузки изображений
 * @param {File} file - Файл изображения
 * @param {string} type - Тип контента: 'dish' | 'halls' | 'vacancies' | 'events' | 'blog'
 * @param {string} itemId - ID элемента (для организации файлов)
 * @returns {Promise<string>} - Public URL загруженного изображения
 */
export async function uploadImage(file: File, type: ContentType = 'dish', itemId: string | number | null = null): Promise<string> {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
        throw new Error('Supabase client не настроен');
    }

    // Определяем bucket и папку
    let bucketName, folder;
    if (type === 'dish') {
        bucketName = BUCKETS.DISHES;
        folder = 'dishes';
    } else {
        bucketName = BUCKETS.CONTENT;
        folder = type; // 'halls', 'vacancies', 'events', 'blog'
    }

    // Генерируем уникальное имя файла
    const fileExt = file.name.split('.').pop();
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);

    const fileName = itemId
        ? `${folder}/${itemId}/${timestamp}-${randomStr}.${fileExt}`
        : `${folder}/temp/${timestamp}-${randomStr}.${fileExt}`;

    const filePath = fileName;

    // Загружаем файл
    const { error } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
        });

    if (error) {
        throw new Error(`Ошибка загрузки: ${error.message}`);
    }

    // Получаем public URL
    const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

    return publicUrl;
}

/**
 * Удаляет изображение из Supabase Storage
 * @param {string} imageUrl - URL изображения для удаления
 */
export async function deleteImage(imageUrl: string): Promise<void> {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
        throw new Error('Supabase client не настроен');
    }

    if (!imageUrl) {
        return; // Нет изображения для удаления
    }

    // Определяем bucket из URL
    // URL выглядит как: https://[project].supabase.co/storage/v1/object/public/bucket-name/path/to/file.jpg
    const urlParts = imageUrl.split('/');
    const bucketIndex = urlParts.indexOf('public');

    if (bucketIndex === -1 || bucketIndex === urlParts.length - 1) {
        throw new Error('Неверный URL изображения');
    }

    const bucketName = urlParts[bucketIndex + 1];
    const filePath = urlParts.slice(bucketIndex + 2).join('/');

    if (!filePath || !bucketName) {
        throw new Error('Неверный URL изображения');
    }

    const { error } = await supabase.storage
        .from(bucketName)
        .remove([filePath]);

    if (error) {
        throw new Error(`Ошибка удаления: ${error.message}`);
    }
}

/**
 * Загружает изображение блюда (для обратной совместимости)
 * @param {File} file - Файл изображения
 * @param {string} dishId - ID блюда
 * @returns {Promise<string>} - Public URL загруженного изображения
 */
export async function uploadDishImage(file: File, dishId: string | number | null = null): Promise<string> {
    return uploadImage(file, 'dish', dishId);
}

/**
 * Удаляет изображение блюда (для обратной совместимости)
 * @param {string} imageUrl - URL изображения для удаления
 */
export async function deleteDishImage(imageUrl: string): Promise<void> {
    return deleteImage(imageUrl);
}

/**
 * Проверяет, является ли URL изображением из Supabase Storage
 * @param {string} url - URL для проверки
 * @returns {boolean}
 */
export function isSupabaseStorageUrl(url: string | null | undefined): boolean {
    if (!url) return false;
    return url.includes('supabase.co/storage/v1/object/public');
}
