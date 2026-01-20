'use client';

import React, { useState, useEffect } from 'react';
import { X, Save, Calendar, Clock, Trash2, Plus, AlertCircle } from 'lucide-react';
import { createSupabaseBrowserClient } from '../../lib/supabase/client';
import DateTimePicker from './DateTimePicker';

export default function ReservationSettings({ isOpen, onClose }) {
    const [restrictedDates, setRestrictedDates] = useState([]);
    const [restrictedTimes, setRestrictedTimes] = useState({});
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedTime, setSelectedTime] = useState('18:00');
    // New state for standard schedule
    const [standardSchedule, setStandardSchedule] = useState({ start: '10:00', end: '00:00' });

    const supabase = createSupabaseBrowserClient();

    // Инициализация при открытии
    useEffect(() => {
        if (isOpen) {
            if (!supabase) {
                setMessage({ type: 'error', text: 'Supabase не настроен' });
                return;
            }
            fetchSettings();

            // Устанавливаем сегодняшнюю дату по умолчанию для выбора времени
            const now = new Date();
            setSelectedDate(now.toISOString().split('T')[0]);
        }
    }, [isOpen]);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('reservation_settings')
                .select('*');

            if (error) throw error;

            const dates = data.find(s => s.key === 'restricted_dates')?.value || [];
            const times = data.find(s => s.key === 'restricted_times')?.value || {};
            const schedule = data.find(s => s.key === 'standard_schedule')?.value || { start: '10:00', end: '00:00' };

            setRestrictedDates(Array.isArray(dates) ? dates : []);
            setRestrictedTimes(typeof times === 'object' && times !== null ? times : {});
            setStandardSchedule(schedule);
        } catch (error) {
            console.error('Error fetching reservation settings:', error);
            setMessage({ type: 'error', text: 'Ошибка при загрузке настроек' });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage(null);
        try {
            // Сохраняем даты
            const { error: error1 } = await supabase
                .from('reservation_settings')
                .upsert({
                    key: 'restricted_dates',
                    value: restrictedDates,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'key' });

            // Сохраняем времена
            const { error: error2 } = await supabase
                .from('reservation_settings')
                .upsert({
                    key: 'restricted_times',
                    value: restrictedTimes,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'key' });

            // Сохраняем стандартное расписание
            const { error: error3 } = await supabase
                .from('reservation_settings')
                .upsert({
                    key: 'standard_schedule',
                    value: standardSchedule,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'key' });

            if (error1 || error2 || error3) throw error1 || error2 || error3;

            setMessage({ type: 'success', text: 'Настройки успешно сохранены!' });

            // Закрываем через 1.5 сек
            setTimeout(() => {
                onClose();
                setMessage(null);
            }, 1500);
        } catch (error) {
            console.error('Error saving reservation settings:', error);
            setMessage({ type: 'error', text: 'Ошибка при сохранении: ' + error.message });
        } finally {
            setSaving(false);
        }
    };

    const toggleDate = (dateStr) => {
        if (restrictedDates.includes(dateStr)) {
            setRestrictedDates(restrictedDates.filter(d => d !== dateStr));
        } else {
            setRestrictedDates([...restrictedDates, dateStr].sort());
        }
    };

    const addTimeRestriction = () => {
        if (!selectedDate) {
            setMessage({ type: 'error', text: 'Выберите дату' });
            return;
        }
        const currentTimes = restrictedTimes[selectedDate] || [];
        if (!currentTimes.includes(selectedTime)) {
            setRestrictedTimes({
                ...restrictedTimes,
                [selectedDate]: [...currentTimes, selectedTime].sort()
            });
        }
    };

    const removeTimeRestriction = (dateStr, time) => {
        const currentTimes = restrictedTimes[dateStr] || [];
        const updatedTimes = currentTimes.filter(t => t !== time);

        const newRestrictedTimes = { ...restrictedTimes };
        if (updatedTimes.length === 0) {
            delete newRestrictedTimes[dateStr];
        } else {
            newRestrictedTimes[dateStr] = updatedTimes;
        }
        setRestrictedTimes(newRestrictedTimes);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 transition-all animate-in fade-in duration-300">
            <div className="bg-neutral-900 border border-white/10 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl shadow-amber-500/10">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/5 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-400/20 rounded-xl">
                            <Calendar className="w-6 h-6 text-amber-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Ограничения бронирования</h2>
                            <p className="text-sm text-neutral-400">Управление доступностью дат и времени</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-white/10 text-neutral-400 hover:text-white transition-all"
                        aria-label="Закрыть"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <div className="w-10 h-10 border-4 border-amber-400/20 border-t-amber-400 rounded-full animate-spin"></div>
                            <p className="text-neutral-400 animate-pulse">Загрузка настроек...</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                            {/* Standard Schedule Section */}
                            <div className="lg:col-span-2 bg-white/5 border border-white/5 rounded-2xl p-5 shadow-inner">
                                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2 text-white">
                                    <Clock className="w-5 h-5 text-amber-400" />
                                    Стандартное время работы
                                </h3>
                                <p className="text-sm text-neutral-300 mb-6">
                                    Установите стандартный диапазон времени бронирования для всех дней.
                                </p>
                                <div className="flex flex-wrap gap-4 items-end">
                                    <div className="flex-1 min-w-[150px]">
                                        <label className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2 block">C:</label>
                                        <DateTimePicker
                                            timeOnly
                                            value={standardSchedule.start}
                                            onChange={(time) => setStandardSchedule({ ...standardSchedule, start: time })}
                                            className="w-full"
                                        />
                                    </div>
                                    <div className="flex-1 min-w-[150px]">
                                        <label className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2 block">До:</label>
                                        <DateTimePicker
                                            timeOnly
                                            value={standardSchedule.end}
                                            onChange={(time) => setStandardSchedule({ ...standardSchedule, end: time })}
                                            className="w-full"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Left Column: Block Dates */}
                            <div className="space-y-6">
                                <div className="bg-white/5 border border-white/5 rounded-2xl p-5 shadow-inner text-white">
                                    <h3 className="text-lg font-semibold mb-2 flex items-center gap-2 text-white">
                                        <Calendar className="w-5 h-5 text-amber-400" />
                                        Блокировка дат
                                    </h3>
                                    <p className="text-sm text-neutral-300 mb-6">
                                        Выберите даты, которые будут полностью закрыты для бронирования.
                                    </p>

                                    <div className="flex justify-center bg-black/40 rounded-xl p-4 border border-white/5 shadow-lg">
                                        <DateTimePicker
                                            dateOnly
                                            value=""
                                            onChange={(date) => toggleDate(date)}
                                            className="w-full"
                                        />
                                    </div>

                                    <div className="mt-6 flex flex-wrap gap-2">
                                        {restrictedDates.length === 0 ? (
                                            <div className="w-full py-6 flex flex-col items-center justify-center border border-dashed border-white/10 rounded-xl">
                                                <p className="text-sm text-neutral-500 italic">Нет заблокированных дат</p>
                                            </div>
                                        ) : (
                                            restrictedDates.map(date => (
                                                <div key={date} className="flex items-center gap-2 bg-neutral-800 border border-white/5 px-3 py-1.5 rounded-full text-sm group hover:border-red-500/50 transition-colors shadow-md">
                                                    <span className="text-white font-medium">
                                                        {new Date(date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    </span>
                                                    <button
                                                        onClick={() => toggleDate(date)}
                                                        className="text-neutral-500 hover:text-red-400 transition-colors"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Block Times */}
                            <div className="space-y-6">
                                <div className="bg-white/5 border border-white/5 rounded-2xl p-5 shadow-inner text-white">
                                    <h3 className="text-lg font-semibold mb-2 flex items-center gap-2 text-white">
                                        <Clock className="w-5 h-5 text-amber-400" />
                                        Ограничения по времени
                                    </h3>
                                    <p className="text-sm text-neutral-300 mb-6">
                                        Заблокируйте конкретные часы для выбранной даты.
                                    </p>

                                    <div className="space-y-4 p-4 bg-black/40 rounded-xl border border-white/5 shadow-lg">
                                        <div className="flex flex-col gap-2">
                                            <label className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Дата:</label>
                                            <DateTimePicker
                                                dateOnly
                                                value={selectedDate}
                                                onChange={(date) => setSelectedDate(date)}
                                            />
                                        </div>

                                        <div className="flex flex-col gap-2">
                                            <label className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Время для блокировки:</label>
                                            <div className="flex gap-2">
                                                <div className="flex-1">
                                                    <DateTimePicker
                                                        timeOnly
                                                        value={selectedTime}
                                                        onChange={(time) => setSelectedTime(time)}
                                                    />
                                                </div>
                                                <button
                                                    onClick={addTimeRestriction}
                                                    className="p-3 bg-amber-400 text-black rounded-xl hover:bg-amber-300 active:scale-95 transition-all shadow-lg hover:shadow-amber-500/20"
                                                >
                                                    <Plus className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-6 space-y-4 max-h-[250px] overflow-y-auto custom-scrollbar pr-2">
                                        {Object.keys(restrictedTimes).length === 0 ? (
                                            <div className="py-6 flex flex-col items-center justify-center border border-dashed border-white/10 rounded-xl">
                                                <p className="text-sm text-neutral-500 italic">Нет ограничений по времени</p>
                                            </div>
                                        ) : (
                                            Object.keys(restrictedTimes).sort().map(dateStr => (
                                                <div key={dateStr} className="bg-neutral-800/50 border border-white/5 rounded-xl p-3 shadow-md">
                                                    <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 uppercase tracking-widest mb-3">
                                                        <Calendar className="w-3 h-3" />
                                                        {new Date(dateStr).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                                                    </div>
                                                    <div className="flex flex-wrap gap-2">
                                                        {restrictedTimes[dateStr].map(time => (
                                                            <div key={time} className="flex items-center gap-2 bg-neutral-900 border border-white/10 px-2.5 py-1 rounded-lg text-xs group hover:border-red-500/50 transition-colors">
                                                                <span className="text-white">{time}</span>
                                                                <button
                                                                    onClick={() => removeTimeRestriction(dateStr, time)}
                                                                    className="text-neutral-500 hover:text-red-400 transition-colors"
                                                                >
                                                                    <Trash2 className="w-3 h-3" />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Status Messages */}
                    {message && (
                        <div className={`mt-6 p-4 rounded-2xl border flex items-center gap-3 animate-in slide-in-from-bottom-2 duration-300 ${message.type === 'success'
                            ? 'bg-green-500/10 border-green-500/20 text-green-400'
                            : 'bg-red-500/10 border-red-500/20 text-red-400'
                            }`}>
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            <p className="text-sm font-medium">{message.text}</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/5 bg-white/5 flex items-center justify-end gap-3 flex-shrink-0">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 rounded-full bg-neutral-800 text-white font-semibold hover:bg-neutral-700 transition"
                    >
                        Отмена
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving || loading}
                        className="px-8 py-2.5 rounded-full bg-amber-400 text-black font-bold hover:bg-amber-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-amber-500/30 flex items-center gap-2"
                    >
                        {saving ? (
                            <>
                                <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
                                Сохранение...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                Сохранить настройки
                            </>
                        )}
                    </button>
                </div>
            </div>

            <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
        </div>
    );
}
