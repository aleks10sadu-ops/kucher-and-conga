'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Clock, AlertCircle } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

type AvailableTimeRange = {
    start: string;
    end: string;
    interval?: number;
};

type DateTimePickerProps = {
    value: string;
    onChange: (value: string) => void;
    min?: string;
    max?: string;
    required?: boolean;
    className?: string;
    showTime?: boolean;
    timeOnly?: boolean;
    dateOnly?: boolean;
    availableTimes?: string[] | null;
    todayOnly?: boolean;
    availableTimeRange?: AvailableTimeRange | null;
    disablePastDates?: boolean;
};

type Restrictions = {
    dates: string[];
    times: Record<string, string[]>;
};

type Schedule = {
    start: string;
    end: string;
};

export default function DateTimePicker({
    value,
    onChange,
    min,
    max,
    required = false,
    className = '',
    showTime = true,
    timeOnly = false,
    dateOnly = false,
    availableTimes = null,
    todayOnly = false,
    availableTimeRange = null,
    disablePastDates = false
}: DateTimePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedTime, setSelectedTime] = useState('');
    const [restrictions, setRestrictions] = useState<Restrictions>({ dates: [], times: {} });
    // Default to 10:00 - 00:00 if not set, but will be overwritten by DB
    const [standardSchedule, setStandardSchedule] = useState<Schedule>({ start: '10:00', end: '00:00' });

    // Загружаем ограничения при монтировании
    useEffect(() => {
        const fetchRestrictions = async () => {
            try {
                const supabase = createSupabaseBrowserClient() as any;
                if (!supabase) return;

                const { data, error } = await supabase
                    .from('reservation_settings')
                    .select('*');

                if (error) {
                    // If the table doesn't exist yet or other DB error, fallback to CRM API
                    throw error;
                }

                // data is any because supabase client is any
                const settingsData = data as any[];

                const dates = settingsData.find((s: any) => s.key === 'restricted_dates')?.value || [];
                const times = settingsData.find((s: any) => s.key === 'restricted_times')?.value || {};
                const schedule = settingsData.find((s: any) => s.key === 'standard_schedule')?.value || { start: '10:00', end: '00:00' };

                setRestrictions({ dates, times });
                setStandardSchedule(schedule);
            } catch (error) {
                console.warn('Error fetching local restrictions, trying CRM API:', error);

                // Fallback to CRM API
                try {
                    const response = await fetch('https://k-c-reservations.vercel.app/api/settings/public');
                    if (response.ok) {
                        const data = await response.json();
                        // The public API returns an object { restricted_dates, restricted_times }
                        // whereas the DB stores them as multiple rows. Adjust accordingly.
                        const dates = data.restricted_dates || [];
                        const times = data.restricted_times || {};
                        const schedule = data.standard_schedule || { start: '10:00', end: '00:00' };
                        setRestrictions({ dates, times });
                        setStandardSchedule(schedule);
                    }
                } catch (apiError) {
                    console.error('All restriction fetch attempts failed:', apiError);
                }
            }
        };
        fetchRestrictions();
    }, []);

    // Парсим начальное значение
    useEffect(() => {
        if (value) {
            if (timeOnly) {
                // Для поля времени только
                setSelectedTime(value);
            } else if (dateOnly) {
                // Для поля даты только
                setSelectedDate(value);
            } else {
                // Для полного datetime
                const date = new Date(value);
                if (!isNaN(date.getTime())) {
                    setSelectedDate(date.toISOString().split('T')[0]);
                    if (showTime) {
                        setSelectedTime(date.toTimeString().slice(0, 5));
                    }
                }
            }
        } else if (todayOnly && !dateOnly && !timeOnly) {
            // Для todayOnly автоматически устанавливаем сегодняшнюю дату
            // Используем локальное время для согласованности с сервером
            const now = new Date();
            const today = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
            setSelectedDate(today);
        }
    }, [value, showTime, timeOnly, dateOnly, todayOnly]);

    // Синхронизируем внутреннее состояние с внешним значением
    useEffect(() => {
        if (!value) {
            setSelectedDate('');
            setSelectedTime('');
        }
    }, [value]);

    // Обновляем времена когда меняются availableTimes или selectedDate
    useEffect(() => {
        // Если есть availableTimes, убеждаемся что они правильно отображаются
        if (availableTimes && availableTimes.length > 0) {
            // Ничего не делаем, просто перерисовываем компонент
        }
    }, [availableTimes, selectedDate]);

    // Функция для обновления значения при выборе
    const updateValue = (date: string, time?: string) => {
        // Не вызываем onChange, если значение уже установлено (избегаем бесконечного цикла)
        let newValue = '';
        if (timeOnly && time) {
            newValue = time;
        } else if (dateOnly && date) {
            newValue = date;
        } else if (date && (showTime ? time : true)) {
            const dateTimeString = showTime
                ? `${date}T${time}:00`
                : `${date}T12:00:00`;

            // Проверяем min/max ограничения
            const dateTime = new Date(dateTimeString);
            if (min && dateTime < new Date(min)) return;
            if (max && dateTime > new Date(max)) return;

            newValue = dateTimeString;
        }

        if (newValue && newValue !== value) {
            onChange(newValue);
        }
    };

    // Генерируем дни месяца
    const generateCalendarDays = () => {
        const today = new Date();
        const currentMonth = selectedDate ? new Date(selectedDate + 'T12:00:00') : today;
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();

        // Создаем дату без учета часового пояса
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDate = new Date(year, month, 1 - firstDay.getDay());

        const days = [];
        const current = new Date(startDate);

        for (let i = 0; i < 42; i++) {
            days.push(new Date(current));
            current.setDate(current.getDate() + 1);
        }

        return days;
    };

    // Генерируем доступные временные интервалы
    const generateTimeSlots = (): string[] => {
        if (availableTimes) return availableTimes;

        if (availableTimeRange) {
            const { start, end, interval = 60 } = availableTimeRange;
            const slots = [];
            const [startHour, startMinute] = start.split(':').map(Number);
            const [endHour, endMinute] = end.split(':').map(Number);

            const startMinutes = startHour * 60 + startMinute;
            const endMinutes = endHour * 60 + endMinute;

            for (let minutes = startMinutes; minutes <= endMinutes; minutes += interval) {
                const hour = Math.floor(minutes / 60);
                const minute = minutes % 60;
                const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                slots.push(timeString);
            }

            return slots;
        }

        // Use standard schedule from DB
        const { start, end } = standardSchedule;
        // Helper to convert time to minutes
        const toMinutes = (timeStr: string) => {
            const [h, m] = timeStr.split(':').map(Number);
            return h * 60 + m;
        };

        const startMinutes = toMinutes(start);
        let endMinutes = toMinutes(end);

        // Handle overnight schedules (e.g. 10:00 to 02:00)
        if (endMinutes < startMinutes) {
            endMinutes += 24 * 60; // Add 24 hours
        }

        const slots = [];
        for (let minutes = startMinutes; minutes <= endMinutes; minutes += 30) {
            // Normalize minutes to 0-1439 for display
            const normalizedMinutes = minutes % (24 * 60);
            const h = Math.floor(normalizedMinutes / 60);
            const m = normalizedMinutes % 60;
            const timeString = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
            slots.push(timeString);
        }

        return slots;
    };

    // Названия месяцев на русском
    const monthNames = [
        'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
        'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ];

    // Названия дней недели на русском
    const dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

    const formatDisplayValue = () => {
        if (timeOnly && selectedTime) {
            // Для поля времени форматируем в читаемый вид: "7 января 2026 г. в 16:30"
            try {
                const date = new Date(selectedTime);
                if (!isNaN(date.getTime())) {
                    const day = date.getDate();
                    const month = date.toLocaleDateString('ru-RU', { month: 'long' });
                    const year = date.getFullYear();
                    const time = date.toTimeString().slice(0, 5);
                    return `${day} ${month} ${year} г. в ${time}`;
                }
            } catch (error) {
                console.warn('Error formatting time:', error);
            }
            return selectedTime; // fallback to original format
        }

        if (dateOnly && selectedDate) {
            const date = new Date(selectedDate + 'T12:00:00');
            return date.toLocaleDateString('ru-RU');
        }

        if (!selectedDate) return '';

        const date = new Date(selectedDate + 'T12:00:00');
        const dateStr = date.toLocaleDateString('ru-RU');

        if (showTime && selectedTime) {
            return `${dateStr} ${selectedTime}`;
        }

        return dateStr;
    };

    const calendarDays = generateCalendarDays();
    const currentMonth = selectedDate ? new Date(selectedDate + 'T12:00:00') : new Date();

    return (
        <div className={`relative ${className}`}>
            {/* Поле ввода */}
            <div className="relative">
                <input
                    type="text"
                    value={formatDisplayValue()}
                    onClick={() => setIsOpen(!isOpen)}
                    readOnly
                    required={required}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-amber-400 cursor-pointer"
                    placeholder={
                        timeOnly ? "Выберите время" : "Выберите дату"
                    }
                />
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                >
                    {showTime ? <Clock className="w-4 h-4" /> : <Calendar className="w-4 h-4" />}
                </button>
            </div>

            {/* Выпадающий календарь */}
            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-neutral-800 border border-neutral-600 rounded-lg shadow-xl max-h-96 overflow-hidden">
                        {/* Календарь (показывается для dateOnly и полного режима) */}
                        {(!timeOnly) && (
                            <>
                                {/* Заголовок календаря */}
                                <div className="flex items-center justify-between p-4 border-b border-neutral-600">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const newDate = new Date(currentMonth);
                                            newDate.setMonth(newDate.getMonth() - 1);
                                            const year = newDate.getFullYear();
                                            const month = (newDate.getMonth() + 1).toString().padStart(2, '0');
                                            const date = newDate.getDate().toString().padStart(2, '0');
                                            setSelectedDate(`${year}-${month}-${date}`);
                                        }}
                                        className="p-1 hover:bg-neutral-700 rounded"
                                    >
                                        ‹
                                    </button>
                                    <span className="font-semibold text-white">
                                        {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const newDate = new Date(currentMonth);
                                            newDate.setMonth(newDate.getMonth() + 1);
                                            const year = newDate.getFullYear();
                                            const month = (newDate.getMonth() + 1).toString().padStart(2, '0');
                                            const date = newDate.getDate().toString().padStart(2, '0');
                                            setSelectedDate(`${year}-${month}-${date}`);
                                        }}
                                        className="p-1 hover:bg-neutral-700 rounded"
                                    >
                                        ›
                                    </button>
                                </div>

                                {/* Дни недели */}
                                <div className="grid grid-cols-7 gap-1 p-2">
                                    {dayNames.map(day => (
                                        <div key={day} className="text-center text-xs font-medium text-neutral-400 py-1">
                                            {day}
                                        </div>
                                    ))}
                                </div>

                                {/* Дни месяца */}
                                <div className="grid grid-cols-7 gap-1 p-2">
                                    {calendarDays.map((day, index) => {
                                        const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
                                        // Используем тот же формат даты, что и при установке selectedDate
                                        const dayYear = day.getFullYear();
                                        const dayMonth = (day.getMonth() + 1).toString().padStart(2, '0');
                                        const dayDate = day.getDate().toString().padStart(2, '0');
                                        const dayFormatted = `${dayYear}-${dayMonth}-${dayDate}`;
                                        const isSelected = selectedDate === dayFormatted;
                                        const isToday = day.toDateString() === new Date().toDateString();
                                        const isRestricted = restrictions.dates.includes(dayFormatted);
                                        const isDisabled = (min && day < new Date(min)) || (max && day > new Date(max)) || (todayOnly && !isToday) || (disablePastDates && day.getTime() < new Date().setHours(0, 0, 0, 0)) || isRestricted;

                                        return (
                                            <button
                                                key={index}
                                                type="button"
                                                onClick={() => {
                                                    if (!isDisabled) {
                                                        // Используем локальную дату вместо UTC для корректного отображения
                                                        const year = day.getFullYear();
                                                        const month = (day.getMonth() + 1).toString().padStart(2, '0');
                                                        const date = day.getDate().toString().padStart(2, '0');
                                                        const newDate = `${year}-${month}-${date}`;
                                                        setSelectedDate(newDate);
                                                        if (dateOnly) {
                                                            updateValue(newDate);
                                                            setIsOpen(false);
                                                        } else if (!showTime && !timeOnly) {
                                                            updateValue(newDate);
                                                            setIsOpen(false);
                                                        }
                                                    }
                                                }}
                                                className={`text-center py-2 text-sm rounded ${isSelected
                                                    ? 'bg-amber-400 text-black font-semibold'
                                                    : isToday
                                                        ? 'bg-neutral-700 text-white'
                                                        : isCurrentMonth && !isDisabled
                                                            ? 'hover:bg-neutral-700 text-white'
                                                            : 'text-neutral-500'
                                                    } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                disabled={isDisabled}
                                            >
                                                {day.getDate()}
                                            </button>
                                        );
                                    })}
                                </div>
                            </>
                        )}

                        {/* Выбор времени */}
                        {(!dateOnly) && (
                            <div className={`${(!timeOnly) ? 'border-t border-neutral-600' : ''} p-4`}>
                                <label className="block text-sm font-medium text-neutral-300 mb-2">
                                    Время:
                                </label>
                                <div className="grid grid-cols-4 gap-2">
                                    {generateTimeSlots().map(time => {
                                        // Для бронирования столов не применяем дополнительную фильтрацию времени
                                        // availableTimes уже содержит правильную логику фильтрации
                                        const restrictedTimesForDate = restrictions.times[selectedDate] || [];
                                        const isTimeDisabled = restrictedTimesForDate.includes(time);

                                        return (
                                            <button
                                                key={time}
                                                type="button"
                                                onClick={() => {
                                                    if (isTimeDisabled) return;
                                                    setSelectedTime(time);
                                                    updateValue(selectedDate, time);
                                                    setIsOpen(false);
                                                }}
                                                disabled={isTimeDisabled}
                                                className={`py-2 px-3 text-sm rounded border ${selectedTime === time
                                                    ? 'bg-amber-400 text-black border-amber-400'
                                                    : isTimeDisabled
                                                        ? 'bg-neutral-900 border-neutral-700 text-neutral-600 cursor-not-allowed'
                                                        : 'border-neutral-600 text-white hover:border-neutral-500 hover:bg-neutral-700'
                                                    }`}
                                            >
                                                {time}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
