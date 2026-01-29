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
    console.log('[DEBUG] Starting createReservation with data:', JSON.stringify(data, null, 2));
    const supabaseUrl = process.env.NEXT_PUBLIC_CRM_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_CRM_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('[DEBUG] CRM Supabase credentials are missing.', { supabaseUrl: !!supabaseUrl, supabaseKey: !!supabaseKey });
        return {
            success: false,
            error: 'Ошибка конфигурации сервера (CRM). Пожалуйста, свяжитесь с администратором.',
        };
    }

    const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
        }
    });

    try {
        const firstName = data.firstName || (data.name ? data.name.split(' ')[0] : '') || data.name || '';
        const lastName = data.lastName || (data.name && data.name.includes(' ') ? data.name.split(' ').slice(1).join(' ') : '') || '';

        // Prepare RPC parameters
        // Ensure time has seconds: HH:mm -> HH:mm:00
        let timeStr = data.time;
        if (timeStr && timeStr.length === 5) {
            timeStr += ':00';
        }

        // Validate hallId - must be UUID string, not number
        let hallIdParam = undefined;
        if (typeof data.hallId === 'string' && data.hallId.length > 10) {
            // Simple length check to filter out empty strings or short IDs
            hallIdParam = data.hallId;
        } else {
            console.log('[DEBUG] Hall ID is invalid or not provided, skipping:', data.hallId);
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
            // Explicitly pass menu_type to resolve postgres function ambiguity (discriminator)
            p_menu_type: null
        };

        console.log('[DEBUG] Calling RPC create_public_reservation with params:', JSON.stringify(rpcParams, null, 2));

        const result = await supabase.rpc('create_public_reservation', rpcParams);
        const { data: responseData, error } = result;

        console.log('[DEBUG] RPC Raw Result:', JSON.stringify(result, null, 2));

        if (error) {
            console.error('[DEBUG] Error creating reservation via RPC:', error);
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
            console.log('[DEBUG] Reservation created successfully via RPC:', responseData);
            return {
                success: true,
                reservation: { id: responseData.reservation_id }, // minimal mock object
                message: 'Ваша заявка принята!',
            };
        } else {
            console.error('[DEBUG] RPC returned failure:', responseData);
            return {
                success: false,
                error: responseData?.error || 'Не удалось отправить бронь',
                details: responseData?.error
            };
        }

    } catch (error: any) {
        console.error('[DEBUG] Unexpected error in createReservation:', error);
        return {
            success: false,
            // Show the actual error message to the user for debugging
            error: `Ошибка: ${error.message || JSON.stringify(error) || 'Неизвестная ошибка'}. Попробуйте позже.`,
            details: error.message
        };
    }
}
