import { DeliverySettings } from '@/types/index';

export function useDeliveryLogic(deliverySettings: DeliverySettings) {

    const getMinDeliveryTime = () => {
        const now = new Date();
        const minTime = new Date(now.getTime() + (deliverySettings.minDeliveryHours * 60 * 60 * 1000));
        return minTime.toISOString().slice(0, 16); // Формат YYYY-MM-DDTHH:MM
    };

    const getMaxDeliveryTime = () => {
        const now = new Date();
        const maxTime = new Date(now.getTime() + (deliverySettings.maxAdvanceDays * 24 * 60 * 60 * 1000));

        // Устанавливаем время окончания работы в этот день
        const [hours, minutes] = deliverySettings.endTime.split(':');
        maxTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

        return maxTime.toISOString().slice(0, 16);
    };

    const isDeliveryTimeValid = (dateTimeString: string) => {
        if (!dateTimeString) return false;

        const selectedTime = new Date(dateTimeString);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        // Проверяем минимальное время
        const minTime = new Date(now.getTime() + (deliverySettings.minDeliveryHours * 60 * 60 * 1000));
        if (selectedTime < minTime) return false;

        // Проверяем максимальное время вперед
        const maxTime = new Date(now.getTime() + (deliverySettings.maxAdvanceDays * 24 * 60 * 60 * 1000));
        if (selectedTime > maxTime) return false;

        // Для сегодняшней доставки проверяем время работы
        const selectedDate = new Date(selectedTime.getFullYear(), selectedTime.getMonth(), selectedTime.getDate());
        if (selectedDate.getTime() === today.getTime()) {
            const [startHours, startMinutes] = deliverySettings.startTime.split(':');
            const [endHours, endMinutes] = deliverySettings.endTime.split(':');

            const startTime = new Date(selectedDate);
            startTime.setHours(parseInt(startHours), parseInt(startMinutes), 0, 0);

            const endTime = new Date(selectedDate);
            endTime.setHours(parseInt(endHours), parseInt(endMinutes), 0, 0);

            if (selectedTime < startTime || selectedTime > endTime) return false;
        }

        return true;
    };

    const isDeliveryAvailableNow = () => {
        if (!deliverySettings.isDeliveryEnabled) return false;

        const now = new Date();
        const [startHours, startMinutes] = deliverySettings.startTime.split(':');
        const [endHours, endMinutes] = deliverySettings.endTime.split(':');

        const startTime = new Date(now);
        startTime.setHours(parseInt(startHours), parseInt(startMinutes), 0, 0);

        const endTime = new Date(now);
        endTime.setHours(parseInt(endHours), parseInt(endMinutes), 0, 0);

        return now >= startTime && now <= endTime;
    };

    return { getMinDeliveryTime, getMaxDeliveryTime, isDeliveryTimeValid, isDeliveryAvailableNow };
}
