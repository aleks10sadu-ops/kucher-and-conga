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
    status?: string;
    table_id?: string;
};


/**
 * Создает бронирование напрямую в базе данных CRM Supabase
 */

/**
 * Создает бронирование напрямую в базе данных CRM Supabase
 */
export async function createReservation(data: CreateReservationData): Promise<CreateReservationResponse> {
    console.log('Using RPC for public reservation');
    const supabaseUrl = process.env.NEXT_PUBLIC_CRM_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_CRM_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('CRM Supabase credentials are missing. Check NEXT_PUBLIC_CRM_SUPABASE_URL and NEXT_PUBLIC_CRM_SUPABASE_ANON_KEY');
        return {
            success: false,
            error: 'Ошибка конфигурации сервера (CRM). Пожалуйста, свяжитесь с администратором.',
        };
    }

    const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);

    try {
        console.log('Creating reservation via RPC:', data);

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
            // Simple length check to filter out empty strings or short IDs, RPC validation will handle the rest
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
            p_status: data.status || undefined,
            p_table_id: data.table_id || undefined,
            p_menu_type: 'main_menu' // Custom request to force main menu
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

/**
 * Проверка доступности зала через RPC
 */
export async function checkHallAvailability(
    hallId: string,
    date: string,
    time: string,
    duration: string = '02:00'
): Promise<{ success: boolean; remaining_capacity?: number; is_available?: boolean; error?: string }> {
    const supabaseUrl = process.env.NEXT_PUBLIC_CRM_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_CRM_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        return { success: false, error: 'Configuration error' };
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    let timeStr = time;
    if (timeStr && timeStr.length === 5) {
        timeStr += ':00';
    }

    console.log(`Checking availability for Hall: ${hallId}, Date: ${date}, Time: ${timeStr}`);

    try {
        const { data, error } = await supabase.rpc('get_hall_availability', {
            p_hall_id: hallId,
            p_date: date,
            p_time: timeStr,
            p_duration: duration
        });

        console.log('Availability Check Result:', { data, error });

        if (error) {
            console.error('Error checking availability:', error);
            return { success: false, error: error.message };
        }

        // RPC returns an array (of one record) usually
        const result = Array.isArray(data) && data.length > 0 ? data[0] : data;

        // If returned empty array or null
        if (!result) {
            return { success: false, error: 'Empty response from availability check' };
        }

        return {
            success: true,
            remaining_capacity: result.remaining_capacity,
            is_available: result.is_available
        };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

/**
 * Получение списка комнат для банкетного зала
 */
export async function getBanquetRooms(hallId: string): Promise<any[]> {
    const supabaseUrl = process.env.NEXT_PUBLIC_CRM_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_CRM_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) return [];

    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        const { data, error } = await supabase
            .from('tables')
            .select('*')
            .eq('hall_id', hallId)
            .eq('type', 'room');

        if (error) {
            console.error('Error fetching rooms:', error);
            return [];
        }

        return data || [];
    } catch (err) {
        console.error('Error in getBanquetRooms:', err);
        return [];
    }
}


