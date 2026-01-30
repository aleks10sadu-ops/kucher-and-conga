import { useState, useEffect, useCallback, useMemo } from 'react'
import { createCrmBrowserClient } from '@/lib/supabase/crm-client'

export interface DailyAvailability {
    date: string;              // 'YYYY-MM-DD'
    total_capacity: number;
    reserved_count: number;
    remaining_capacity: number;
    is_full: boolean;          // true, если мест меньше, чем запрашиваемое кол-во гостей
}

export function useHallAvailability(hallId: string | null, monthDate: Date, guestsCount: number) {
    const [availability, setAvailability] = useState<Record<string, boolean>>({}) // { '2026-05-20': true (isFull) }
    const [loading, setLoading] = useState(false)

    // Use singleton CRM client
    const supabase = useMemo(() => createCrmBrowserClient(), [])

    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();

    const fetchAvailability = useCallback(async () => {
        if (!hallId) return

        // Don't fetch for fallback/local halls that aren't in CRM
        if (hallId.startsWith('fallback-')) {
            setLoading(false)
            return
        }

        if (!supabase) {
            console.warn('CRM Supabase client not initialized (missing credentials?)')
            setLoading(false)
            return
        }

        setLoading(true)

        // Вычисляем начало и конец месяца
        const start = new Date(year, month, 1)
        const end = new Date(year, month + 1, 0)

        // Форматируем даты в YYYY-MM-DD (учтите часовые пояса, если нужно)
        // Используем 'en-CA' (YYYY-MM-DD) для корректного форматирования локальной даты
        const startDate = start.toLocaleDateString('en-CA');
        const endDate = end.toLocaleDateString('en-CA');

        const { data, error } = await supabase.rpc('get_hall_month_availability', {
            p_hall_id: hallId,
            p_date_start: startDate,
            p_date_end: endDate,
            p_guests_count: guestsCount
        } as any)

        if (error) {
            console.error('Error fetching availability:', JSON.stringify(error, null, 2), error)
            setLoading(false)
            return
        }

        // Преобразуем в удобный словарь: { DateString: isFull }
        const lookup: Record<string, boolean> = {}
        if (Array.isArray(data)) {
            (data as DailyAvailability[]).forEach(day => {
                lookup[day.date] = day.is_full
            })
        }

        setAvailability(lookup)
        setLoading(false)
    }, [hallId, year, month, guestsCount, supabase])

    // 1. Initial Fetch
    useEffect(() => {
        fetchAvailability()
    }, [fetchAvailability])

    // 2. Realtime Subscription
    useEffect(() => {
        if (!hallId || !supabase) return

        const channel = supabase
            .channel(`hall_availability_${hallId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'reservations',
                    filter: `hall_id=eq.${hallId}` // Слушаем изменения только этого зала
                },
                () => {
                    // console.log('Realtime update: refreshing availability...')
                    fetchAvailability() // Перезапрашиваем данные при любом изменении
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [hallId, fetchAvailability, supabase])

    return { availability, loading }
}
