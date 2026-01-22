import { RestaurantSettings } from '@/types/index';

export function useBookingLogic(restaurantSettings: RestaurantSettings) {

    const getMinBookingTime = () => {
        const now = new Date();
        const minTime = new Date(now.getTime() + (restaurantSettings.minAdvanceHours * 60 * 60 * 1000));
        return minTime.toISOString().slice(0, 16);
    };

    const getMaxBookingTime = () => {
        const now = new Date();
        const maxTime = new Date(now.getTime() + (restaurantSettings.maxAdvanceDays * 24 * 60 * 60 * 1000));

        // Устанавливаем время окончания работы в этот день
        const [hours, minutes] = restaurantSettings.endTime.split(':');
        maxTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

        return maxTime.toISOString().slice(0, 16);
    };

    const isBookingTimeValid = (dateTimeString: string) => {
        if (!dateTimeString) return false;

        const selectedTime = new Date(dateTimeString);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        // Проверяем максимальное время вперед
        const maxTime = new Date(now.getTime() + (restaurantSettings.maxAdvanceDays * 24 * 60 * 60 * 1000));
        if (selectedTime > maxTime) return false;

        // Для сегодняшнего бронирования проверяем минимальное время (текущий час + 1)
        const selectedDate = new Date(selectedTime.getFullYear(), selectedTime.getMonth(), selectedTime.getDate());
        if (selectedDate.getTime() === today.getTime()) {
            // Для сегодняшнего дня минимальное время - текущий час + 1
            const minTime = new Date(now);
            minTime.setHours(now.getHours() + 1, 0, 0, 0);
            if (selectedTime < minTime) return false;

            // Также проверяем время работы ресторана
            const [startHours, startMinutes] = restaurantSettings.startTime.split(':');
            const [endHours, endMinutes] = restaurantSettings.endTime.split(':');

            const startTime = new Date(selectedDate);
            startTime.setHours(parseInt(startHours), parseInt(startMinutes), 0, 0);

            const endTime = new Date(selectedDate);
            endTime.setHours(parseInt(endHours), parseInt(endMinutes), 0, 0);

            if (selectedTime < startTime || selectedTime > endTime) return false;
        } else {
            // Для будущих дней проверяем только время работы ресторана
            const [startHours, startMinutes] = restaurantSettings.startTime.split(':');
            const [endHours, endMinutes] = restaurantSettings.endTime.split(':');

            const startTime = new Date(selectedDate);
            startTime.setHours(parseInt(startHours), parseInt(startMinutes), 0, 0);

            const endTime = new Date(selectedDate);
            endTime.setHours(parseInt(endHours), parseInt(endMinutes), 0, 0);

            if (selectedTime < startTime || selectedTime > endTime) return false;
        }

        return true;
    };

    const getAvailableBookingTimes = (selectedDate: string) => {
        // Генерируем слоты динамически на основе restaurantSettings
        const { startTime, endTime } = restaurantSettings;
        const toMinutes = (s: string) => {
            const [h, m] = s.split(':').map(Number);
            return h * 60 + m;
        };

        let startM = toMinutes(startTime);
        let endM = toMinutes(endTime);
        if (endM < startM) endM += 24 * 60; // Переход через полночь

        const allTimes = [];
        for (let m = startM; m <= endM; m += 30) {
            const h = Math.floor((m % (24 * 60)) / 60);
            const min = m % 60;
            allTimes.push(`${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`);
        }

        if (!selectedDate) return allTimes;

        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];

        // Если выбранная дата - сегодня, фильтруем прошедшее время
        if (selectedDate === todayStr) {
            const currentHour = today.getHours();
            const currentMinute = today.getMinutes();

            return allTimes.filter(time => {
                const [hour, minute] = time.split(':').map(Number);
                const slotTime = new Date(today);
                slotTime.setHours(hour, minute, 0, 0);

                const minBookingTime = new Date(today);
                minBookingTime.setHours(currentHour + restaurantSettings.minAdvanceHours, currentMinute, 0, 0);

                return slotTime >= minBookingTime;
            });
        }

        return allTimes;
    };

    return { getMinBookingTime, getMaxBookingTime, isBookingTimeValid, getAvailableBookingTimes };
}
