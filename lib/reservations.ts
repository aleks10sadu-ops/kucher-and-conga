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
    console.log('Using DIRECT CRM DB connection v3 (Surname + Hall)');
    const supabaseUrl = process.env.NEXT_PUBLIC_CRM_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_CRM_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('CRM Supabase credentials are missing');
        return {
            success: false,
            error: 'Ошибка конфигурации сервера. Пожалуйста, свяжитесь с администратором.',
        };
    }

    // Создаем клиент специально для CRM базы данных
    const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);

    try {
        console.log('Creating reservation in CRM DB:', data);

        const firstName = data.firstName || (data.name ? data.name.split(' ')[0] : '') || data.name || '';
        const lastName = data.lastName || (data.name && data.name.includes(' ') ? data.name.split(' ').slice(1).join(' ') : '') || '';

        // 1. Поиск или создание гостя
        // Нормализуем телефон (если нужно), здесь предполагаем, что он уже в нужном формате или как есть
        const { data: existingGuest, error: findError } = await supabase
            .from('guests')
            .select('id, first_name, last_name')
            .eq('phone', data.phone)
            .maybeSingle();

        if (findError) {
            console.error('Error finding guest:', findError);
            throw findError;
        }

        let guestId: string | undefined;

        if (existingGuest) {
            guestId = existingGuest.id;
            // Опционально: можно обновить фамилию, если она не была заполнена
            if (!existingGuest.last_name && lastName) {
                await supabase.from('guests').update({ last_name: lastName }).eq('id', guestId);
            }
        } else {
            // Создаем нового гостя
            const { data: newGuest, error: createGuestError } = await supabase
                .from('guests')
                .insert([
                    {
                        first_name: firstName,
                        last_name: lastName,
                        phone: data.phone,
                        // is_blacklisted: false, // Вырезано из-за ошибки прав доступа
                    }
                ])
                .select()
                .single();

            if (createGuestError) {
                console.error('Error creating guest:', JSON.stringify(createGuestError, null, 2));
                // Если ошибка говорит, что гость уже существует (race condition), попробуем найти снова
                if (createGuestError.code === '23505') { // Unique violation
                    const { data: retryGuest, error: retryError } = await supabase
                        .from('guests')
                        .select('id')
                        .eq('phone', data.phone)
                        .single();

                    if (retryError || !retryGuest) throw createGuestError; // Если все равно ошибка, выбрасываем исходную
                    guestId = retryGuest.id;
                } else {
                    throw createGuestError;
                }
            } else {
                guestId = newGuest.id;
            }
        }

        // 2. Создание бронирования
        // Предполагаем, что таблица reservations имеет поля: guest_id, reservation_date, reservation_time, guests_count, comments, status
        // Статус по умолчанию обычно 'pending' или 'new', или база сама ставит default
        // Проверим формат даты и времени. data.date: YYYY-MM-DD, data.time: HH:mm

        const reservationPayload = {
            guest_id: guestId,
            reservation_date: data.date,
            reservation_time: data.time,
            guests_count: data.guests_count,
            comments: data.comments || '',
            status: 'pending', // Или 'new', ставим безопасный дефолт, обычно CRM его подхватит
            created_via: 'website', // Поле для отслеживания источника, если есть
            hall_id: data.hallId || null // ID зала
        };

        const { data: reservation, error: reservationError } = await supabase
            .from('reservations')
            .insert([reservationPayload])
            .select()
            .single();

        if (reservationError) {
            console.error('Error creating reservation:', JSON.stringify(reservationError, null, 2));

            // Проверка на черный список (если есть триггер или политика)
            if (reservationError.message && reservationError.message.includes('blacklist')) {
                return {
                    success: false,
                    error: 'К сожалению, создание бронирования невозможно. Пожалуйста, свяжитесь с рестораном.',
                };
            }

            throw reservationError;
        }

        console.log('Reservation created successfully:', reservation);
        return {
            success: true,
            reservation: reservation,
            message: 'Бронирование успешно создано! Мы свяжемся с вами для подтверждения.',
        };

    } catch (error: any) {
        console.error('Unexpected error in createReservation:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        return {
            success: false,
            error: 'Произошла ошибка при создании бронирования. Попробуйте позже или позвоните нам.',
            details: error.message
        };
    }
}
