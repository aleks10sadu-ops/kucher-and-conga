// Утилита для проверки доступности файла в Supabase Storage

import { createSupabaseBrowserClient } from './client';

type CheckStorageFileResult = {
    exists: boolean;
    accessible: boolean;
    status?: number;
    statusText?: string;
    error?: string;
};

/**
 * Проверяет, существует ли файл в Supabase Storage и доступен ли он публично
 * @param {string} imageUrl - Public URL изображения
 * @returns {Promise<CheckStorageFileResult>}
 */
export async function checkStorageFile(imageUrl: string | null | undefined): Promise<CheckStorageFileResult> {
    if (!imageUrl || !imageUrl.includes('supabase.co')) {
        return { exists: false, accessible: false, error: 'Неверный URL' };
    }

    try {
        // Парсим URL для получения bucket и path
        const urlParts = imageUrl.split('/');
        const bucketIndex = urlParts.indexOf('public');

        if (bucketIndex === -1 || bucketIndex >= urlParts.length - 1) {
            return { exists: false, accessible: false, error: 'Неверный формат URL' };
        }

        const bucketName = urlParts[bucketIndex + 1];
        const filePath = urlParts.slice(bucketIndex + 2).join('/');

        // Проверяем через Supabase API
        const supabase = createSupabaseBrowserClient();
        if (!supabase) {
            return { exists: false, accessible: false, error: 'Supabase client не настроен' };
        }

        // Пытаемся получить информацию о файле
        const { error } = await supabase.storage
            .from(bucketName)
            .list(filePath.split('/').slice(0, -1).join('/'), {
                limit: 100,
                search: filePath.split('/').pop()
            });

        if (error) {
            console.error('Ошибка при проверке файла через Supabase API:', error);
        }

        // Также проверяем через fetch
        try {
            const response = await fetch(imageUrl, { method: 'HEAD' });
            return {
                exists: response.ok,
                accessible: response.ok,
                status: response.status,
                statusText: response.statusText,
                error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`
            };
        } catch (fetchError: any) {
            return {
                exists: false,
                accessible: false,
                error: `Ошибка fetch: ${fetchError.message}`
            };
        }
    } catch (err: any) {
        return {
            exists: false,
            accessible: false,
            error: `Ошибка проверки: ${err.message}`
        };
    }
}
