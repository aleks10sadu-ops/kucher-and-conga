import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { BookingData } from '@/types/index';
import { createCrmBrowserClient } from '@/lib/supabase/crm-client';

type CreateReservationResponse = {
    success: boolean;
    reservation?: any; // Replace with proper Db type when available
    message?: string;
    error?: string;
    details?: string;
};

type CreateReservationData = BookingData & {
    name?: string; // legacy support
    guests_count: number;
    comments?: string;
    status?: 'new' | 'waitlist';
};


/**
 * Создает бронирование напрямую в базе данных CRM Supabase
 */
export async function createReservation(data: CreateReservationData): Promise<CreateReservationResponse> {
    const supabase = createCrmBrowserClient();

    if (!supabase) {
        console.error('CRM Supabase credentials are missing.');
        return {
            success: false,
            error: 'Ошибка конфигурации сервера (CRM). Пожалуйста, свяжитесь с администратором.',
        };
    }

    try {
        const firstName = data.firstName || (data.name ? data.name.split(' ')[0] : '') || data.name || '';
        const lastName = data.lastName || (data.name && data.name.includes(' ') ? data.name.split(' ').slice(1).join(' ') : '') || '';

        // Prepare RPC parameters
        // Ensure time has seconds: HH:mm -> HH:mm:00
        let timeStr = data.time;

        // If waitlist and no time selected, use a default placeholder time
        if (!timeStr && data.status === 'waitlist') {
            timeStr = '00:00';
        }

        if (timeStr && timeStr.length === 5) {
            timeStr += ':00';
        }

        // Validate hallId - must be UUID string, not number
        let hallIdParam = undefined;
        if (typeof data.hallId === 'string' && data.hallId.length > 10) {
            // Simple length check to filter out empty strings or short IDs
            hallIdParam = data.hallId;
        }

        const rpcParams = {
            p_phone: data.phone,
            p_first_name: firstName,
            p_last_name: lastName || undefined,
            p_date: data.date,
            p_time: timeStr,
            p_guests_count: data.guests_count,
            p_hall_id: hallIdParam,
            p_comments: data.comments || undefined,
            p_status: data.status || 'new'
            // p_menu_id НЕ передаём - бронь создаётся с Основным меню
        };

        const result = await supabase.rpc('create_public_reservation', rpcParams);
        const { data: responseData, error } = result;

        if (error) {
            console.error('Error creating reservation via RPC:', JSON.stringify(error, null, 2), error);
            // Проверка на черный список (ошибку может вернуть и RPC если внутри raise exception)
            if (error.message && error.message.includes('blacklist')) {
                return {
                    success: false,
                    error: 'К сожалению, создание бронирования невозможно. Пожалуйста, свяжитесь с рестораном.',
                };
            }
            throw error;
        }

        if (responseData && responseData.success) {
            return {
                success: true,
                reservation: { id: responseData.reservation_id }, // minimal mock object
                message: 'Ваша заявка принята!',
            };
        } else {
            console.error('RPC returned failure:', responseData);
            return {
                success: false,
                error: responseData?.error || 'Не удалось отправить бронь',
                details: responseData?.error
            };
        }

    } catch (error: any) {
        console.error('Unexpected error in createReservation:', JSON.stringify(error, null, 2), error);
        return {
            success: false,
            error: 'Произошла ошибка при создании бронирования. Попробуйте позже или позвоните нам.',
            details: error.message
        };
    }
}
