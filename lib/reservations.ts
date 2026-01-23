import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { BookingData } from '@/types/index';

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
};


/**
 * Создает бронирование напрямую в базе данных CRM Supabase
 */
export async function createReservation(data: CreateReservationData): Promise<CreateReservationResponse> {
    console.log('Using RPC for public reservation');
    const supabaseUrl = process.env.NEXT_PUBLIC_CRM_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_CRM_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('CRM Supabase credentials are missing');
        return {
            success: false,
            error: 'Ошибка конфигурации сервера. Пожалуйста, свяжитесь с администратором.',
        };
    }

    const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);

    try {
        console.log('Creating reservation via RPC:', data);

        const firstName = data.firstName || (data.name ? data.name.split(' ')[0] : '') || data.name || '';
        const lastName = data.lastName || (data.name && data.name.includes(' ') ? data.name.split(' ').slice(1).join(' ') : '') || '';

        // Prepare RPC parameters
        const rpcParams = {
            p_phone: data.phone,
            p_first_name: firstName,
            p_last_name: lastName || undefined,
            p_date: data.date,
            p_time: data.time,
            p_guests_count: data.guests_count,
            p_hall_id: data.hallId || undefined,
            p_comments: data.comments || undefined
        };

        const { data: responseData, error } = await supabase.rpc('create_public_reservation', rpcParams);

        if (error) {
            console.error('Error creating reservation via RPC:', error);
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
            console.log('Reservation created successfully via RPC:', responseData);
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
        console.error('Unexpected error in createReservation:', error);
        return {
            success: false,
            error: 'Произошла ошибка при создании бронирования. Попробуйте позже или позвоните нам.',
            details: error.message
        };
    }
}
