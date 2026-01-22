'use client';

import React, { useState, useEffect } from 'react';
import { X, Save, Clock } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { DeliverySettings as DeliverySettingsType } from '@/types/index';

type DeliverySettingsProps = {
    isOpen: boolean;
    onClose: () => void;
};

export default function DeliverySettings({ isOpen, onClose }: DeliverySettingsProps) {
    const [settings, setSettings] = useState<DeliverySettingsType>({
        isDeliveryEnabled: true,
        startTime: '14:00',
        endTime: '22:00',
        minDeliveryHours: 1.5,
        maxAdvanceDays: 7
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const supabase = createSupabaseBrowserClient() as any;

    // Загружаем настройки при открытии
    useEffect(() => {
        if (isOpen) {
            loadSettings();
        }
    }, [isOpen]);

    const loadSettings = async () => {
        try {
            if (!supabase) return;
            setLoading(true);
            const { data, error } = await supabase
                .from('reservation_settings')
                .select('*')
                .eq('key', 'delivery_settings')
                .single();

            if (error && error.code !== 'PGRST116') {
                console.error('Error loading delivery settings from DB:', error);
            }

            if (data && data.value) {
                setSettings(data.value);
            } else {
                // Fallback to localStorage if not found in DB (migration path)
                const saved = localStorage.getItem('deliverySettings');
                if (saved) {
                    setSettings(JSON.parse(saved));
                }
            }
        } catch (error) {
            console.error('Error loading delivery settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const saveSettings = async () => {
        if (!supabase) return;
        setLoading(true);
        setMessage('');

        try {
            // Проверяем корректность времени
            const startTime = new Date(`1970-01-01T${settings.startTime}:00`);
            const endTime = new Date(`1970-01-01T${settings.endTime}:00`);

            if (startTime >= endTime) {
                setMessage('Время окончания должно быть позже времени начала');
                setLoading(false);
                return;
            }

            // Сохраняем настройки в Supabase
            const { error } = await supabase
                .from('reservation_settings')
                .upsert({
                    key: 'delivery_settings',
                    value: settings,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'key' });

            if (error) throw error;

            // Также обновляем localStorage для обратной совместимости (optional)
            localStorage.setItem('deliverySettings', JSON.stringify(settings));

            setMessage('Настройки успешно сохранены в базе данных!');

            // Закрываем через 2 секунды
            setTimeout(() => {
                onClose();
                setMessage(''); // Clear message on close
            }, 2000);

        } catch (error: any) {
            console.error('Error saving delivery settings:', error);
            setMessage('Ошибка при сохранении настроек: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (field: keyof DeliverySettingsType, value: any) => {
        setSettings(prev => ({ ...prev, [field]: value }));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <div className="bg-neutral-950 border border-white/10 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                {/* Заголовок */}
                <div className="flex items-center justify-between p-6 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <Clock className="w-6 h-6 text-amber-400" />
                        <h2 className="text-xl font-semibold text-white">Настройки доставки</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded hover:bg-white/5"
                        aria-label="Закрыть"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Форма настроек */}
                <div className="p-6 space-y-6">
                    {/* Включение/отключение доставки */}
                    <div>
                        <label className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                checked={settings.isDeliveryEnabled}
                                onChange={(e) => handleChange('isDeliveryEnabled', e.target.checked)}
                                className="w-5 h-5 text-amber-400 bg-black/40 border-white/20 rounded focus:ring-amber-400 focus:ring-2"
                            />
                            <span className="text-sm font-medium text-neutral-300">Доставка включена</span>
                        </label>
                    </div>

                    {/* Время работы доставки */}
                    <div>
                        <label className="block text-sm font-medium text-neutral-300 mb-3">
                            Время работы доставки (текущий день)
                        </label>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs text-neutral-400 mb-1">Время начала</label>
                                <input
                                    type="time"
                                    value={settings.startTime}
                                    onChange={(e) => handleChange('startTime', e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-amber-400"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-neutral-400 mb-1">Время окончания</label>
                                <input
                                    type="time"
                                    value={settings.endTime}
                                    onChange={(e) => handleChange('endTime', e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-amber-400"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Минимальное время доставки */}
                    <div>
                        <label className="block text-sm font-medium text-neutral-300 mb-3">
                            Минимальное время доставки (часы)
                        </label>
                        <input
                            type="number"
                            min="0.5"
                            max="24"
                            step="0.5"
                            value={settings.minDeliveryHours}
                            onChange={(e) => handleChange('minDeliveryHours', parseFloat(e.target.value))}
                            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-amber-400"
                        />
                        <p className="text-xs text-neutral-500 mt-1">
                            Заказы принимаются минимум за {settings.minDeliveryHours} часа до доставки
                        </p>
                    </div>

                    {/* Максимальное количество дней вперед */}
                    <div>
                        <label className="block text-sm font-medium text-neutral-300 mb-3">
                            Максимум дней вперед
                        </label>
                        <input
                            type="number"
                            min="1"
                            max="30"
                            value={settings.maxAdvanceDays}
                            onChange={(e) => handleChange('maxAdvanceDays', parseInt(e.target.value))}
                            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-amber-400"
                        />
                        <p className="text-xs text-neutral-500 mt-1">
                            Можно заказывать доставку максимум за {settings.maxAdvanceDays} дней
                        </p>
                    </div>

                    {/* Сообщение */}
                    {message && (
                        <div className={`p-3 rounded-lg border text-sm ${message.includes('успешно')
                            ? 'bg-green-900/20 border-green-500/50 text-green-300'
                            : 'bg-red-900/20 border-red-500/50 text-red-300'
                            }`}>
                            {message}
                        </div>
                    )}

                    {/* Кнопки */}
                    <div className="flex gap-3 pt-4">
                        <button
                            onClick={saveSettings}
                            disabled={loading}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-amber-400 text-black rounded-lg hover:bg-amber-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <Save className="w-4 h-4" />
                            {loading ? 'Сохранение...' : 'Сохранить'}
                        </button>
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-neutral-700 text-neutral-200 rounded-lg hover:bg-neutral-600 transition-colors"
                        >
                            Отмена
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
