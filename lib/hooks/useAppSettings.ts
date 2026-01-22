'use client';

import { useState, useEffect } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { DeliverySettings, RestaurantSettings } from '@/types/index';

const defaultRestaurantSettings: RestaurantSettings = {
    startTime: '10:00',
    endTime: '00:00',
    minAdvanceHours: 1,
    maxAdvanceDays: 30
};

const defaultDeliverySettings: DeliverySettings = {
    isDeliveryEnabled: true,
    startTime: '14:00',
    endTime: '22:00',
    minDeliveryHours: 1.5,
    maxAdvanceDays: 7
};

export function useAppSettings() {
    const [restaurantSettings, setRestaurantSettings] = useState<RestaurantSettings>(defaultRestaurantSettings);
    const [deliverySettings, setDeliverySettings] = useState<DeliverySettings>(defaultDeliverySettings);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSettings = async () => {
            const supabase = createSupabaseBrowserClient() as any;
            if (!supabase) {
                // Fallback logic
                const savedDel = localStorage.getItem('deliverySettings');
                if (savedDel) setDeliverySettings(JSON.parse(savedDel));
                setLoading(false);
                return;
            }

            try {
                // Fetch Restaurant Settings
                const { data: restData } = await supabase
                    .from('reservation_settings')
                    .select('*')
                    .eq('key', 'standard_schedule')
                    .single();

                if (restData && restData.value) {
                    const val = restData.value as any;
                    setRestaurantSettings(prev => ({
                        ...prev,
                        startTime: val.start || '10:00',
                        endTime: val.end || '00:00'
                    }));
                }

                // Fetch Delivery Settings
                const { data: delData } = await supabase
                    .from('reservation_settings')
                    .select('*')
                    .eq('key', 'delivery_settings')
                    .single();

                if (delData && delData.value) {
                    setDeliverySettings(prev => ({ ...prev, ...(delData.value as any) }));
                } else {
                    // Fallback
                    const savedDel = localStorage.getItem('deliverySettings');
                    if (savedDel) setDeliverySettings(JSON.parse(savedDel));
                }

            } catch (e) {
                console.error('Error fetching settings:', e);
                // Fallback
                const savedDel = localStorage.getItem('deliverySettings');
                if (savedDel) setDeliverySettings(JSON.parse(savedDel));
            } finally {
                setLoading(false);
            }
        };

        fetchSettings();
    }, []);

    return { restaurantSettings, deliverySettings, loading };
}
