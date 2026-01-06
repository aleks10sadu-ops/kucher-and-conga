'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Clock } from 'lucide-react';

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
  availableTimeRange = null
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');

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
      const today = new Date().toISOString().split('T')[0];
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

  // Функция для обновления значения при выборе
  const updateValue = (date, time) => {
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

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days = [];
    const current = new Date(startDate);

    for (let i = 0; i < 42; i++) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return days;
  };

  // Генерируем доступные временные интервалы
  const generateTimeSlots = () => {
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

    return [
      '10:00', '11:00', '12:00', '13:00',
      '14:00', '15:00', '16:00', '17:00',
      '18:00', '19:00', '20:00', '21:00',
      '22:00', '23:00', '00:00', '01:00'
    ];
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
      return selectedTime;
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
          className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-sm outline-none focus:border-amber-400 cursor-pointer"
          placeholder={
            timeOnly ? "Выберите время" :
            dateOnly ? "Выберите дату" :
            showTime ? "Выберите дату и время" : "Выберите дату"
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
                      setSelectedDate(newDate.toISOString().split('T')[0]);
                    }}
                    className="p-1 hover:bg-neutral-700 rounded"
                  >
                    ‹
                  </button>
                  <span className="font-semibold">
                    {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const newDate = new Date(currentMonth);
                      newDate.setMonth(newDate.getMonth() + 1);
                      setSelectedDate(newDate.toISOString().split('T')[0]);
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
                    const isSelected = selectedDate === day.toISOString().split('T')[0];
                    const isToday = day.toDateString() === new Date().toDateString();
                    const isDisabled = (min && day < new Date(min)) || (max && day > new Date(max)) || (todayOnly && !isToday);

                    return (
                      <button
                        key={index}
                        type="button"
                        onClick={() => {
                          if (!isDisabled) {
                            const newDate = day.toISOString().split('T')[0];
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
                        className={`text-center py-2 text-sm rounded ${
                          isSelected
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
                    // Проверяем, не прошло ли время
                    const now = new Date();
                    const [hours, minutes] = time.split(':').map(Number);
                    const timeDate = new Date();
                    timeDate.setHours(hours, minutes, 0, 0);

                    // Всегда проверяем, не прошло ли время + 1.5 часа (для доставки)
                    const minTime = new Date(now.getTime() + (1.5 * 60 * 60 * 1000)); // +1.5 часа
                    const isTimeDisabled = timeDate < minTime;

                    return (
                      <button
                        key={time}
                        type="button"
                        onClick={() => {
                          if (!isTimeDisabled) {
                            setSelectedTime(time);
                            updateValue(selectedDate, time);
                            setIsOpen(false);
                          }
                        }}
                        className={`py-2 px-3 text-sm rounded border ${
                          selectedTime === time
                            ? 'bg-amber-400 text-black border-amber-400'
                            : isTimeDisabled
                            ? 'border-neutral-700 text-neutral-500 opacity-50 cursor-not-allowed'
                            : 'border-neutral-600 text-neutral-300 hover:border-neutral-500 hover:bg-neutral-700'
                        }`}
                        disabled={isTimeDisabled}
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
