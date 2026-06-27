'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import Image from 'next/image';
import {
  Phone, MapPin, Clock,
  ShoppingCart, Plus, Minus, X, Trash2, Menu,
  Users, AlertCircle
} from 'lucide-react';

import EnhancedMenuSection from './components/EnhancedMenuSection';
import ContentManager from './components/ContentManager';
import AboutSection from './components/AboutSection';
import GallerySection from './components/GallerySection';
import DeliveryMap from './components/DeliveryMapNew';

import DeliverySettings from './components/DeliverySettings';
import DeliveryStatusBanner from './components/DeliveryStatusBanner';
import DateTimePicker from './components/DateTimePicker';
import useAdminCheck from '../lib/hooks/useAdminCheck';
import { createReservation } from '../lib/reservations';
import ReservationSettings from './components/ReservationSettings';
import { createSupabaseBrowserClient } from '../lib/supabase/client';
import HallSelector from './components/HallSelector';
import { User, UserPlus } from 'lucide-react';

// Зоны доставки для определения по координатам
import { useCart } from '../lib/hooks/useCart';
import { deliveryZones, checkDeliveryZoneForCoords, type DeliveryZone } from './data/deliveryZones';
import NavigationLinks from './components/NavigationLinks';

import { gallery, events } from './data/content';
import { isPointInPolygon } from '../lib/utils/geo';
import { useAppSettings } from '../lib/hooks/useAppSettings';
import { useBookingLogic } from '../lib/hooks/useBookingLogic';
import { useDeliveryLogic } from '../lib/hooks/useDeliveryLogic';

import { evaluateBooking, classifyHall, banquetPackagesForHall, type BookingType } from '@/lib/booking/rules';
import { BANQUET_PACKAGES, isBanquetPackageAllowed } from '@/lib/booking/banquetPackages';
import { composeReservationComment } from '@/lib/booking/composeReservation';
import BookingTypeSelector from './components/BookingTypeSelector';
import BanquetMenuModal from './components/BanquetMenuModal';




/* --- УТИЛИТА СКРОЛЛА --- */


/* --- ДАННЫЕ --- */



// Функция проверки попадания точки в полигон


/* --- НАВИГАЦИОННЫЕ ССЫЛКИ --- */


/* --- УТИЛИТЫ КОРЗИНЫ --- */


/* --- СТРАНИЦА --- */

interface BookingData {
  firstName: string;
  lastName: string;
  phone: string;
  date: string;
  time: string;
  adults: number;
  children: number;
  bookingType: BookingType;
  banquetPackageId: string | null;
  comment: string;
  hallId: string | number | null;
}

interface DeliveryForm {
  name: string;
  phone: string;
  address: string;
  comment: string;
  deliveryZone: DeliveryZone | null;
  deliveryPrice: number | null;
  coordinates: number[] | null;
  deliveryTime: 'asap' | 'custom' | string;
  deliveryTimeCustom: string;
  paymentMethod: 'card' | 'transfer' | 'cash' | string;
  changeAmount: 'no-change' | string;
  hasAllergy: boolean;
  allergyDetails: string;
}

export default function Page() {
  const [cartOpen, setCartOpen] = useState(false);
  const [deliveryOpen, setDeliveryOpen] = useState(false);
  const [mapModalOpen, setMapModalOpen] = useState(false);
  const [deliverySettingsOpen, setDeliverySettingsOpen] = useState(false);
  const [reservationSettingsOpen, setReservationSettingsOpen] = useState(false);

  // --- HOOKS ---


  const { restaurantSettings, deliverySettings, loading: settingsLoading } = useAppSettings();
  const { getMinBookingTime, getMaxBookingTime, isBookingTimeValid, getAvailableBookingTimes } = useBookingLogic(restaurantSettings);
  const { getMinDeliveryTime, getMaxDeliveryTime, isDeliveryTimeValid, isDeliveryAvailableNow } = useDeliveryLogic(deliverySettings);

  // Форматируем время для Москвы (GMT+3)
  const formatMoscowTime = (date: Date | string) => {
    const d = new Date(date);
    const moscowTime = new Date(d.getTime() + (3 * 60 * 60 * 1000)); // GMT+3
    return moscowTime.toLocaleString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Форматируем дату для Москвы в формате DD.MM.YYYY
  const formatMoscowDate = (date: Date | string) => {
    const d = new Date(date);
    const moscowTime = new Date(d.getTime() + (3 * 60 * 60 * 1000));
    return moscowTime.toLocaleDateString('ru-RU');
  };

  // Форматируем время для Москвы в формате HH:MM
  const formatMoscowTimeOnly = (date: Date | string) => {
    const d = new Date(date);
    const moscowTime = new Date(d.getTime() + (3 * 60 * 60 * 1000));
    return moscowTime.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  const [menuOpen, setMenuOpen] = useState(false);

  const [isMounted, setIsMounted] = useState(false);
  const [contentManagerOpen, setContentManagerOpen] = useState(false);
  const [contentManagerCategory, setContentManagerCategory] = useState<string | null>(null);
  const [bookingMessage, setBookingMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null); // { type: 'success' | 'error', text: string }
  const [bookingLoading, setBookingLoading] = useState(false);

  /* --- УТИЛИТА СКРОЛЛА --- */
  const scrollTo = (target: string) => {
    const element = document.querySelector(target);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };
  const [bookingData, setBookingData] = useState<BookingData>({
    firstName: '',
    lastName: '',
    phone: '',
    date: '',
    time: '',
    adults: 2,
    children: 0,
    bookingType: 'onsite',
    banquetPackageId: null,
    comment: '',
    hallId: null
  });

  const [bookingPrivacyConsent, setBookingPrivacyConsent] = useState(false);
  const [deliveryPrivacyConsent, setDeliveryPrivacyConsent] = useState(false);
  const { items, add, dec, remove, clear, count, total } = useCart();

  // --- BOOKING: тип брони, валидация по правилам ---
  const [selectedHallName, setSelectedHallName] = useState<string | null>(null);
  const [banquetModalOpen, setBanquetModalOpen] = useState(false);

  const cartFoodSum = items.reduce((s, i) => s + (i.price || 0) * (i.qty || 0), 0);
  const hallGroup = classifyHall(selectedHallName);
  const validation = evaluateBooking({
    adults: bookingData.adults,
    children: bookingData.children,
    eventDate: bookingData.date,
    eventTime: bookingData.time,
    now: new Date(),
    hallGroup,
    type: bookingData.bookingType,
    cartFoodSum,
  });
  const allowedSignature = validation.availableTypes.map(t => (t.allowed ? '1' : '0')).join('');

  // Авто-переключение типа брони, если выбранный стал недоступен
  useEffect(() => {
    const current = validation.availableTypes.find(t => t.type === bookingData.bookingType);
    if (current && !current.allowed) {
      const firstAllowed = validation.availableTypes.find(t => t.allowed);
      if (firstAllowed) {
        setBookingData(prev => ({ ...prev, bookingType: firstAllowed.type }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowedSignature, bookingData.bookingType]);


  // Используем хук для проверки админа
  const { isAdmin, loading: adminLoading } = useAdminCheck(true);

  // Устанавливаем флаг монтирования для избежания hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Доставка: локальный стейт формы
  const [dForm, setDForm] = useState<DeliveryForm>({
    name: '',
    phone: '',
    address: '',
    comment: '',
    deliveryZone: null,
    deliveryPrice: null,
    coordinates: null,
    deliveryTime: 'asap', // 'asap' или конкретное время
    deliveryTimeCustom: '',
    paymentMethod: 'card', // 'card', 'transfer', 'cash'
    changeAmount: 'no-change', // 'no-change' или сумма сдачи
    hasAllergy: false, // Есть ли аллергия
    allergyDetails: '' // Детали аллергии
  });

  const handlePhoneChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    onChange: (value: string) => void
  ) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 11) val = val.slice(0, 11);
    if (!val) {
      onChange('');
      return;
    }
    if (val[0] === '8' || val[0] === '7') val = '7' + val.slice(1);
    else val = '7' + val;

    let formatted = '+7';
    if (val.length > 1) formatted += ' (' + val.slice(1, 4);
    if (val.length > 4) formatted += ') ' + val.slice(4, 7);
    if (val.length > 7) formatted += '-' + val.slice(7, 9);
    if (val.length > 9) formatted += '-' + val.slice(9, 11);

    onChange(formatted);
  };


  // Обработчики для карты доставки
  const handleDeliveryZoneChange = (zone: DeliveryZone | null) => {
    setDForm(prev => ({
      ...prev,
      deliveryZone: zone,
      deliveryPrice: zone ? zone.price : null
    }));
  };

  const handleDeliveryAddressChange = (address: string, coordinates: number[] | null) => {
    setDForm(prev => ({
      ...prev,
      address: address,
      coordinates: coordinates
    }));
  };

  // Блокируем скролл body при открытых модальном окне (но не при меню)
  useEffect(() => {
    const opened = cartOpen || deliveryOpen;
    if (opened) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [cartOpen, deliveryOpen]);


  // Закрываем меню при клике вне его области
  useEffect(() => {
    if (menuOpen) {
      const handleClickOutside = (e: MouseEvent) => {
        // Проверяем, что клик был не на кнопке открытия меню
        const target = e.target as HTMLElement;
        const menuButton = target.closest('button[aria-label*="меню"]');
        if (menuButton && !menuButton.closest('aside[aria-label="Навигация"]')) {
          // Кнопка открытия меню вне самого меню - не закрываем
          return;
        }

        // Проверяем, находится ли клик внутри любого из меню навигации (mobile или desktop)
        const clickedInsideMenu = target.closest('aside[aria-label="Навигация"]');

        // Если клик был внутри меню, не закрываем его
        if (clickedInsideMenu) {
          return;
        }

        // Если клик был вне меню, закрываем его
        setMenuOpen(false);
      };

      // Добавляем обработчик с небольшой задержкой, чтобы не сработал сразу при открытии
      const timeoutId = setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
      }, 100);

      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [menuOpen]);


  // Закрытие по ESC и навигация по галерее
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDeliveryOpen(false);
        setCartOpen(false);
        setMenuOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);




  // Для карточки: есть ли в корзине
  const qtyInCart = (id: string) => items.find(i => i.id === id)?.qty ?? 0;

  // Отправка в Telegram API
  async function notifyTelegram(payload: any) {
    const res = await fetch('/api/telegram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'Telegram notify failed');
  }

  // Сабмит БРОНИ (из секции booking)
  async function submitBooking(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    // Проверка согласия на обработку персональных данных
    if (!bookingPrivacyConsent) {
      setBookingMessage({
        type: 'error',
        text: 'Необходимо дать согласие на обработку персональных данных.',
      });
      return;
    }

    setBookingLoading(true);
    setBookingMessage(null);

    const { phone, date, time, comment, firstName, lastName, hallId, adults, children, bookingType, banquetPackageId } = bookingData;

    // Check if hall is selected
    if (!hallId) {
      setBookingMessage({
        type: 'error',
        text: 'Пожалуйста, выберите зал для бронирования.',
      });
      setBookingLoading(false);
      return;
    }

    // Проверка времени бронирования
    if (date && time) {
      const bookingDateTime = `${date}T${time}:00`;
      if (!isBookingTimeValid(bookingDateTime)) {
        setBookingMessage({
          type: 'error',
          text: `Время бронирования должно быть в рабочее время ресторана (${restaurantSettings.startTime} - ${restaurantSettings.endTime}) и не раньше чем за ${restaurantSettings.minAdvanceHours} час(а) от текущего времени.`,
        });
        setBookingLoading(false);
        return;
      }
    }

    // Проверка доменных правил брони
    if (!validation.canSubmit) {
      setBookingMessage({
        type: 'error',
        text: validation.blocking[0] || 'Бронирование с такими параметрами недоступно. Свяжитесь с администратором.',
      });
      setBookingLoading(false);
      return;
    }
    if (bookingType === 'banquet' && !isBanquetPackageAllowed(banquetPackagesForHall(hallGroup), banquetPackageId)) {
      setBookingMessage({
        type: 'error',
        text: 'Выберите банкетный пакет, совместимый с выбранным залом.',
      });
      setBookingLoading(false);
      return;
    }

    // Общие данные брони
    const banquetPackageName = BANQUET_PACKAGES.find(p => p.id === banquetPackageId)?.name ?? null;
    const preorderItems = bookingType === 'preorder'
      ? items.map(c => ({ name: c.name, qty: c.qty, price: c.price }))
      : [];
    const preorderSum = bookingType === 'preorder' ? cartFoodSum : 0;
    const composedComment = composeReservationComment({
      adults,
      children,
      bookingType,
      hallName: selectedHallName,
      cartItems: preorderItems,
      cartFoodSum: preorderSum,
      banquetPackageName: bookingType === 'banquet' ? banquetPackageName : null,
      comment,
    });

    const telegramPayload = {
      type: 'booking' as const,
      name: `${firstName} ${lastName}`.trim(),
      firstName,
      lastName: lastName || '',
      phone,
      date,
      time,
      adults,
      children,
      bookingType,
      hallName: selectedHallName,
      cartItems: preorderItems,
      cartFoodSum: preorderSum,
      banquetPackageName: bookingType === 'banquet' ? banquetPackageName : null,
      comment,
    };

    const resetBooking = () => {
      setBookingData({
        firstName: '',
        lastName: '',
        phone: '',
        date: '',
        time: '',
        adults: 2,
        children: 0,
        bookingType: 'onsite',
        banquetPackageId: null,
        comment: '',
        hallId: null,
      });
      setSelectedHallName(null);
      setBookingPrivacyConsent(false);
    };

    const SUCCESS_TEXT = 'Заявка принята! Администратор свяжется с вами для подтверждения.';

    // Best-effort: attempt both CRM and Telegram independently.
    // Success is shown if EITHER channel received the request.
    let crmOk = false;
    let telegramOk = false;

    try {
      const result = await createReservation({
        firstName,
        lastName,
        phone,
        date,
        time,
        adults,
        children,
        bookingType,
        banquetPackageId,
        comment,
        hallId,
        composedComment,
      });
      if (result.success) {
        crmOk = true;
      } else {
        console.warn('CRM reservation failed:', result.error);
      }
    } catch (error) {
      console.error('CRM reservation error:', error);
    }

    try {
      await notifyTelegram(telegramPayload);
      telegramOk = true;
    } catch (telegramError) {
      console.warn('Telegram notify failed:', telegramError);
    }

    if (crmOk || telegramOk) {
      setBookingMessage({ type: 'success', text: SUCCESS_TEXT });
      resetBooking();
    } else {
      setBookingMessage({
        type: 'error',
        text: 'Произошла ошибка при отправке заявки. Попробуйте позже или свяжитесь с нами по телефону.',
      });
    }
    setBookingLoading(false);
  }

  // Проверка условий заказа бизнес-ланчей
  const validateBusinessLunchOrder = useMemo(() => {
    const businessLunchItems = items.filter(item => item.isBusinessLunch);
    const businessLunchCount = businessLunchItems.reduce((sum, item) => sum + item.qty, 0);
    const businessLunchTotal = businessLunchItems.reduce((sum, item) => sum + (item.price * item.qty), 0);

    // Если есть бизнес-ланчи, проверяем условия
    if (businessLunchItems.length > 0) {
      // Условие: либо 2+ бизнес-ланча, либо сумма от 1000₽
      const isValid = businessLunchCount >= 2 || total >= 1000;
      return {
        isValid,
        businessLunchCount,
        businessLunchTotal,
        message: isValid
          ? null
          : businessLunchCount < 2 && total < 1000
            ? 'Для заказа бизнес-ланчей необходимо либо 2+ бизнес-ланча, либо сумма заказа от 1000₽'
            : businessLunchCount < 2
              ? 'Для заказа бизнес-ланчей необходимо минимум 2 бизнес-ланча'
              : 'Для заказа бизнес-ланчей сумма заказа должна быть от 1000₽'
      };
    }

    return { isValid: true, businessLunchCount: 0, businessLunchTotal: 0, message: null };
  }, [items, total]);

  // Сабмит ДОСТАВКИ (из модалки)
  async function submitDelivery(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    // Проверка согласия на обработку персональных данных
    if (!deliveryPrivacyConsent) {
      alert('Необходимо дать согласие на обработку персональных данных.');
      return;
    }

    // Проверка условий для бизнес-ланчей
    if (!validateBusinessLunchOrder.isValid) {
      alert(validateBusinessLunchOrder.message);
      return;
    }

    // Проверка зоны доставки
    if (!dForm.deliveryZone) {
      alert('Пожалуйста, укажите адрес доставки и выберите зону на карте.');
      return;
    }

    // Проверка времени доставки
    if (dForm.deliveryTime === 'custom' && !dForm.deliveryTimeCustom) {
      alert('Пожалуйста, укажите время доставки.');
      return;
    }

    // Проверка корректности времени доставки
    if (dForm.deliveryTime === 'custom' && dForm.deliveryTimeCustom) {
      // Для доставки проверяем только время (создаем полный datetime с сегодняшней датой)
      const today = new Date().toISOString().split('T')[0];
      const fullDateTime = `${today}T${dForm.deliveryTimeCustom.split('T')[1]}`;

      if (!isDeliveryTimeValid(fullDateTime)) {
        alert(`Время доставки должно быть с 16:00 до 22:00 и не раньше чем за ${deliverySettings.minDeliveryHours} час(а) от текущего времени.`);
        return;
      }
    }

    // Проверка аллергии
    if (dForm.hasAllergy && !dForm.allergyDetails.trim()) {
      alert('Пожалуйста, укажите на что у вас аллергия.');
      return;
    }

    const deliveryTotal = total + (dForm.deliveryPrice || 0);

    // Формируем информацию об аллергии
    const allergyInfo = dForm.hasAllergy && dForm.allergyDetails.trim()
      ? { allergy: `Аллергия на: ${dForm.allergyDetails.trim()}` }
      : {};

    const payload = {
      type: 'delivery',
      ...dForm,
      ...allergyInfo,
      items,
      subtotal: total,
      deliveryPrice: dForm.deliveryPrice,
      total: deliveryTotal,
      zoneName: dForm.deliveryZone?.name,
    };

    await notifyTelegram(payload);
    setDeliveryOpen(false);
    setCartOpen(false);
    setDForm({
      name: '',
      phone: '',
      address: '',
      comment: '',
      deliveryZone: null,
      deliveryPrice: null,
      coordinates: null,
      deliveryTime: 'asap',
      deliveryTimeCustom: '',
      paymentMethod: 'card',
      changeAmount: 'no-change',
      hasAllergy: false,
      allergyDetails: ''
    });
    setDeliveryPrivacyConsent(false);
    alert(`Заявка на доставку отправлена! Стоимость доставки: ${dForm.deliveryPrice === 0 ? 'бесплатно' : dForm.deliveryPrice + '₽'}. Ожидайте звонка.`);
  }

  return (
    <>
      <div className="bg-neutral-950 text-white" lang="ru">
        {/* NAV */}
        <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-neutral-950/95 backdrop-blur-md">
          <div className="container mx-auto px-4 py-3">
            {/* Desktop layout: логотип слева, телефон и кнопки справа */}
            <div className="hidden md:flex items-center justify-between">
              <button
                onClick={() => scrollTo('#top')}
                className="flex items-center hover:scale-105 active:scale-95 transition-transform duration-200"
              >
                <img src="/kongo_logo_main.svg" alt="КОНГО" className="h-7 w-auto" loading="eager" fetchPriority="high" />
              </button>

              <div className="flex items-center gap-3">

                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className={`p-2 rounded-lg border border-white/10 hover:border-white/40 hover:bg-white/5 transition-all duration-200 ${menuOpen ? 'scale-95 bg-white/10' : 'hover:scale-110 active:scale-95'
                    }`}
                  aria-label={menuOpen ? "Закрыть меню" : "Открыть меню"}
                >
                  <Menu className={`w-6 h-6 transition-transform duration-200 ${menuOpen ? 'rotate-90' : ''}`} />
                </button>
                <button
                  aria-label="Открыть корзину"
                  onClick={() => setCartOpen(true)}
                  className="relative p-2 rounded-lg border border-white/10 hover:border-white/40 hover:bg-white/5 hover:scale-110 active:scale-95 transition-all duration-200"
                >
                  <ShoppingCart className="w-5 h-5" />
                  {count > 0 && (
                    <span className="absolute -top-1 -right-1 text-[11px] leading-none bg-amber-400 text-black px-1.5 py-0.5 rounded-full font-bold">
                      {count}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Mobile/Tablet layout: меню слева, логотип по центру, корзина справа */}
            <div className="md:hidden flex items-center justify-between">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className={`p-2 rounded-lg border border-white/10 hover:border-white/40 hover:bg-white/5 transition-all duration-200 ${menuOpen ? 'scale-95 bg-white/10' : 'hover:scale-110 active:scale-95'
                  }`}
                aria-label={menuOpen ? "Закрыть меню" : "Открыть меню"}
              >
                <Menu className={`w-6 h-6 transition-transform duration-200 ${menuOpen ? 'rotate-90' : ''}`} />
              </button>

              <button
                onClick={() => scrollTo('#top')}
                className="flex items-center hover:scale-105 active:scale-95 transition-transform duration-200"
              >
                <img src="/kongo_logo_main.svg" alt="КОНГО" className="h-7 w-auto" loading="eager" fetchPriority="high" />
              </button>

              <button
                aria-label="Открыть корзину"
                onClick={() => setCartOpen(true)}
                className="relative p-2 rounded-lg border border-white/10 hover:border-white/40 hover:bg-white/5 hover:scale-110 active:scale-95 transition-all duration-200"
              >
                <ShoppingCart className="w-5 h-5" />
                {count > 0 && (
                  <span className="absolute -top-1 -right-1 text-[11px] leading-none bg-amber-400 text-black px-1.5 py-0.5 rounded-full font-bold">
                    {count}
                  </span>
                )}
              </button>
            </div>
          </div>

        </header>


        {/* HERO */}
        <a id="top" />
        <section className="relative w-full min-h-[60vh] sm:min-h-[65vh] lg:min-h-[70vh] pt-16 sm:pt-20 md:pt-16 pb-32 sm:pb-36 md:pb-28 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/80 z-10" />
          <Image
            src="/hero-image.webp"
            alt="Ресторан Кучер и Конга — атмосфера вечера"
            fill
            priority
            fetchPriority="high"
            sizes="100vw"
            className="object-cover"
            quality={75}
          />
          <div className="relative z-20 flex items-center min-h-[calc(70vh-4rem)] sm:min-h-[calc(75vh-5rem)] md:min-h-[calc(80vh-4rem)] pt-12 sm:pt-16 md:pt-0 pb-24 sm:pb-28 md:pb-20">
            <div className="container mx-auto px-4 w-full">
              <div className="flex flex-col lg:grid lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-12 items-stretch w-full max-w-full lg:max-w-7xl mx-auto px-2 sm:px-4 translate-y-[5%] sm:translate-y-[6%] lg:translate-y-[8%]" suppressHydrationWarning>
                {/* Изображение мероприятия (первым на мобильных) */}
                <a
                  href="/events"
                  className="w-full order-1 lg:order-2 mx-auto lg:mx-0 lg:justify-self-end block overflow-hidden rounded-xl sm:rounded-2xl shadow-2xl hover:scale-105 transition-transform duration-300 lg:h-full"
                  suppressHydrationWarning
                >
                  <Image
                    src="/kongo_ng.webp"
                    alt="Новогодняя ночь"
                    width={450}
                    height={338}
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 450px"
                    className="w-full h-full object-cover"
                    loading="eager"
                    priority
                    fetchPriority="high"
                    quality={70}
                    suppressHydrationWarning
                  />
                </a>

                {/* Первый контейнер - Информация о ресторане (вторым на мобильных) */}
                <div className="w-full rounded-xl sm:rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-4 sm:p-6 md:p-8 lg:p-11 shadow-2xl flex flex-col justify-between lg:justify-self-start lg:self-center order-2 lg:order-1">
                  <div>
                    <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-6xl font-extrabold leading-tight mb-2 sm:mb-3 lg:mb-5">
                      <span className="text-white">Кучер</span>
                      <span className="text-white mx-1 sm:mx-2 lg:mx-3">&</span>
                      <span className="text-white">Conga</span>
                    </h1>
                    <div className="space-y-1.5 sm:space-y-2 lg:space-y-4 text-xs sm:text-sm md:text-base lg:text-xl text-neutral-200 leading-relaxed">
                      <p>
                        Кухня нашего Ресторана - это совершенно новый взгляд на продукт, постоянный поиск новых сочетаний и вкусов.
                      </p>
                      <p className="text-neutral-300">
                        В своей работе мы руководствуемся инновационным подходом в приготовлении продуктов с использованием новых техник и технологий.
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 sm:mt-5 lg:mt-7 flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3 lg:gap-4">
                    <button
                      onClick={() => scrollTo('#booking')}
                      className="px-4 sm:px-6 lg:px-7 py-2 sm:py-2.5 lg:py-3 rounded-full bg-amber-400 text-black font-semibold hover:bg-amber-300 hover:scale-105 active:scale-95 transition-all duration-200 text-center w-full sm:w-auto sm:min-w-[180px] lg:min-w-[220px] h-[38px] sm:h-[42px] lg:h-[46px] text-xs sm:text-sm lg:text-base shadow-lg hover:shadow-xl whitespace-nowrap"
                    >
                      Забронировать стол
                    </button>
                    <button
                      onClick={() => scrollTo('#menu')}
                      className="px-4 sm:px-6 lg:px-7 py-2 sm:py-2.5 lg:py-3 rounded-full bg-amber-400 text-black font-semibold hover:bg-amber-300 hover:scale-105 active:scale-95 transition-all duration-200 text-center w-full sm:w-auto sm:min-w-[160px] lg:min-w-[200px] h-[38px] sm:h-[42px] lg:h-[46px] text-xs sm:text-sm lg:text-base shadow-lg hover:shadow-xl whitespace-nowrap"
                    >
                      Смотреть меню
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ADVANTAGES (AboutSection) */}
        <AboutSection />

        {/* Статус доставки */}
        {/* Статус доставки - показываем только если доставка недоступна */}
        {!isDeliveryAvailableNow() && (
          <section className="py-4 border-t border-white/10">
            <div className="container mx-auto px-4">
              <DeliveryStatusBanner
                settings={deliverySettings}
                isAvailable={isDeliveryAvailableNow()}
                onDeliveryClick={() => scrollTo('#menu')}
              />
            </div>
          </section>
        )}

        {/* МЕНЮ РЕСТОРАНА */}
        <EnhancedMenuSection
          onAddToCart={add}
          cartItems={items}
          enableAdminEditing={false}
        />

        {/* Админ-панель управления контентом */}
        {!adminLoading && isAdmin && (
          <section className="py-8 border-t border-white/10">
            <div className="container mx-auto px-4">
              <div className="max-w-6xl mx-auto">
                <h2 className="text-2xl font-bold mb-4 text-center">Управление контентом</h2>
                <div className="flex flex-wrap justify-center gap-3">
                  <button
                    onClick={() => {
                      setContentManagerCategory('vacancies');
                      setContentManagerOpen(true);
                    }}
                    className="px-4 py-2 rounded-full bg-blue-500 text-white font-semibold hover:bg-blue-600 transition"
                  >
                    Управление вакансиями
                  </button>
                  <button
                    onClick={() => {
                      setContentManagerCategory('events');
                      setContentManagerOpen(true);
                    }}
                    className="px-4 py-2 rounded-full bg-purple-500 text-white font-semibold hover:bg-purple-600 transition"
                  >
                    Управление событиями
                  </button>
                  <button
                    onClick={() => {
                      setContentManagerCategory('blog');
                      setContentManagerOpen(true);
                    }}
                    className="px-4 py-2 rounded-full bg-green-500 text-white font-semibold hover:bg-green-600 transition"
                  >
                    Управление блогом
                  </button>
                  <button
                    onClick={() => {
                      setContentManagerCategory('halls');
                      setContentManagerOpen(true);
                    }}
                    className="px-4 py-2 rounded-full bg-orange-500 text-white font-semibold hover:bg-orange-600 transition"
                  >
                    Управление залами
                  </button>
                  <button
                    onClick={() => setDeliverySettingsOpen(true)}
                    className="px-4 py-2 rounded-full bg-amber-500 text-black font-semibold hover:bg-amber-400 transition"
                  >
                    ⚙️ Настройки доставки
                  </button>
                  <button
                    onClick={() => setReservationSettingsOpen(true)}
                    className="px-4 py-2 rounded-full bg-amber-500 text-black font-semibold hover:bg-amber-400 transition"
                  >
                    📅 Ограничения бронирования
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* BOOKING FORM */}
        <section id="booking" className="py-8 sm:py-12 lg:py-16 xl:py-20 border-t border-white/10">
          <div className="container mx-auto px-4">
            <div className="max-w-[1500px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-7 items-stretch">
              {/* Левое изображение */}
              <div className="hidden lg:block lg:col-span-3 rounded-2xl overflow-hidden border border-white/10 bg-white/5 shadow-lg relative min-h-[400px] sm:min-h-[500px] lg:min-h-[600px]">
                <Image
                  src="/konga_bron.webp"
                  alt="Интерьер ресторана"
                  fill
                  sizes="(max-width: 1024px) 0vw, 25vw"
                  className="object-cover object-right"
                  loading="lazy"
                />
              </div>

              {/* Форма бронирования */}
              <div className="lg:col-span-6 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6 md:p-8 lg:p-10 shadow-lg">
                <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold uppercase tracking-wider text-center mb-3 sm:mb-4 lg:mb-5 break-words">Забронировать стол</h2>
                <p className="mt-1.5 sm:mt-2 text-sm sm:text-base lg:text-lg text-neutral-300 text-center mb-2 sm:mb-3 lg:mb-4">Оставьте контакты — администратор подтвердит бронь.</p>
                <p className="text-xs sm:text-sm text-amber-400 text-center mb-4 sm:mb-6 lg:mb-8">
                  📅 Бронирование столов доступно с {restaurantSettings.startTime} до {restaurantSettings.endTime}
                </p>
                <form onSubmit={submitBooking} className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  {/* Hall Selector */}
                  <div className="md:col-span-2">
                    <HallSelector
                      selectedHallId={bookingData.hallId ? String(bookingData.hallId) : null}
                      onSelect={(id, name) => {
                        setBookingData(prev => ({ ...prev, hallId: id, banquetPackageId: null }));
                        setSelectedHallName(name ?? null);
                      }}
                    />
                  </div>

                  {/* Контакты: Имя и Фамилия */}
                  <div className="md:col-span-2 grid md:grid-cols-2 gap-4">
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                      <input
                        type="text"
                        placeholder="Ваше имя"
                        value={bookingData.firstName || ''}
                        onChange={(e) => setBookingData(prev => ({ ...prev, firstName: e.target.value }))}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-400 transition-colors pl-11"
                        required
                      />
                    </div>
                    <div className="relative">
                      <UserPlus className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                      <input
                        type="text"
                        placeholder="Фамилия"
                        value={bookingData.lastName || ''}
                        onChange={(e) => setBookingData(prev => ({ ...prev, lastName: e.target.value }))}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-400 transition-colors pl-11"
                        required
                      />
                    </div>
                  </div>

                  {/* Телефон */}
                  <div className="md:col-span-2 relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                    <input
                      type="tel"
                      placeholder="Телефон +7 (999) 000-00-00"
                      value={bookingData.phone}
                      onChange={(e) => handlePhoneChange(e, (val) => setBookingData(prev => ({ ...prev, phone: val })))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-400 transition-colors pl-11"
                      required
                    />
                  </div>

                  {/* Дата и Время */}
                  <div className="md:col-span-2 grid md:grid-cols-2 gap-4">
                    {/* Date Picker */}
                    <DateTimePicker
                      dateOnly
                      value={bookingData.date}
                      onChange={(date) => setBookingData(prev => ({ ...prev, date }))}
                      disablePastDates
                    />

                    {/* Time Selector */}
                    <DateTimePicker
                      timeOnly
                      value={bookingData.time}
                      onChange={(time) => setBookingData(prev => ({ ...prev, time }))}
                      availableTimes={getAvailableBookingTimes(bookingData.date)}
                      required
                    />
                  </div>


                  {/* Гости: взрослые и дети */}
                  <div className="md:col-span-2 grid md:grid-cols-2 gap-4">
                    <div className="relative">
                      <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                      <div className="absolute left-11 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none">
                        Взрослых:
                      </div>
                      <input
                        id="adults" name="adults" type="number" min={1}
                        value={bookingData.adults}
                        onChange={(e) => {
                          const v = Math.max(1, Number(e.target.value) || 0);
                          setBookingData(prev => ({ ...prev, adults: v }));
                        }}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pl-32 focus:outline-none focus:border-amber-400 transition-colors text-white"
                      />
                    </div>
                    <div className="relative">
                      <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                      <div className="absolute left-11 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none">
                        Детей:
                      </div>
                      <input
                        id="children" name="children" type="number" min={0}
                        value={bookingData.children}
                        onChange={(e) => {
                          const v = Math.max(0, Number(e.target.value) || 0);
                          setBookingData(prev => ({ ...prev, children: v }));
                        }}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pl-28 focus:outline-none focus:border-amber-400 transition-colors text-white"
                      />
                    </div>
                  </div>

                  {/* Тип брони */}
                  <div className="md:col-span-2">
                    <BookingTypeSelector
                      validation={validation}
                      selectedType={bookingData.bookingType}
                      onSelect={(t) => setBookingData(prev => ({ ...prev, bookingType: t }))}
                    />
                  </div>

                  {/* Предзаказ: сводка корзины */}
                  {bookingData.bookingType === 'preorder' && (
                    <div className="md:col-span-2 rounded-xl border border-white/10 bg-white/5 p-4">
                      {items.length === 0 ? (
                        <p className="text-sm text-neutral-300">
                          Наберите блюда в меню для предзаказа.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          <div className="text-sm font-semibold text-neutral-200">Состав предзаказа:</div>
                          <ul className="space-y-1">
                            {items.map((it) => (
                              <li key={it.id} className="flex justify-between text-sm text-neutral-300">
                                <span>{it.name} × {it.qty}</span>
                                <span>{(it.price || 0) * (it.qty || 0)} ₽</span>
                              </li>
                            ))}
                          </ul>
                          <div className="flex justify-between text-sm font-semibold text-amber-300 pt-2 border-t border-white/10">
                            <span>Сумма предзаказа</span>
                            <span>{cartFoodSum} ₽</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Банкет: выбор пакета */}
                  {bookingData.bookingType === 'banquet' && (
                    <div className="md:col-span-2 space-y-2">
                      <button
                        type="button"
                        onClick={() => setBanquetModalOpen(true)}
                        className="w-full py-3 rounded-xl font-semibold bg-white/10 text-white hover:bg-white/20 transition"
                      >
                        Выбрать банкетный пакет
                      </button>
                      {bookingData.banquetPackageId && (
                        <p className="text-sm text-amber-300 text-center">
                          Выбран пакет: {BANQUET_PACKAGES.find(p => p.id === bookingData.banquetPackageId)?.name}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Comment Input */}
                  <div className="md:col-span-2 relative">
                    <textarea
                      name="comment"
                      value={bookingData.comment}
                      onChange={(e) => setBookingData(prev => ({ ...prev, comment: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-400 transition-colors text-white"
                      rows={3}
                      placeholder="Пожелания (необязательно)"
                    />
                  </div>

                  {/* Privacy Checkbox */}
                  <div className="md:col-span-2 flex items-start gap-2">
                    <input
                      type="checkbox"
                      id="booking-privacy-consent-ssr"
                      checked={bookingPrivacyConsent}
                      onChange={(e) => setBookingPrivacyConsent(e.target.checked)}
                      className="mt-1 w-4 h-4 rounded border-white/20 bg-black/40 text-amber-400 focus:ring-amber-400 focus:ring-2"
                      required
                    />
                    <label htmlFor="booking-privacy-consent-ssr" className="text-xs sm:text-sm text-neutral-300">
                      Оформляя бронирование, вы соглашаетесь с{' '}
                      <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300 underline">
                        политикой конфиденциальности
                      </a>
                    </label>
                  </div>

                  {/* Message Area */}
                  {bookingMessage && (
                    <div className={`md:col-span-2 p-3 sm:p-4 rounded-lg border ${bookingMessage.type === 'success'
                      ? 'bg-green-500/20 border-green-500/50 text-green-300'
                      : 'bg-red-500/20 border-red-500/50 text-red-300'
                      }`}>
                      <div className="flex items-center gap-2">
                        {bookingMessage.type === 'success' ? (
                          <span className="text-green-400">✓</span>
                        ) : (
                          <AlertCircle className="w-4 h-4" />
                        )}
                        <span className="text-sm sm:text-base">{bookingMessage.text}</span>
                      </div>
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={
                      bookingLoading ||
                      !validation.canSubmit ||
                      !bookingPrivacyConsent ||
                      !bookingData.firstName.trim() ||
                      !bookingData.phone.trim() ||
                      !bookingData.hallId ||
                      !bookingData.date ||
                      !bookingData.time ||
                      !isBookingTimeValid(`${bookingData.date}T${bookingData.time}:00`) ||
                      (bookingData.bookingType === 'banquet' && !isBanquetPackageAllowed(banquetPackagesForHall(hallGroup), bookingData.banquetPackageId))
                    }
                    className="md:col-span-2 px-6 sm:px-8 lg:px-10 py-2.5 sm:py-3 lg:py-4 text-sm sm:text-base lg:text-lg rounded-full bg-amber-400 text-black font-semibold hover:bg-amber-300 hover:scale-105 active:scale-95 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    {bookingLoading ? 'Отправка...' : 'Отправить заявку'}
                  </button>
                </form>

                {/* Модалка выбора банкетного пакета */}
                <BanquetMenuModal
                  isOpen={banquetModalOpen}
                  onClose={() => setBanquetModalOpen(false)}
                  selectable
                  hallFilter={banquetPackagesForHall(hallGroup)}
                  selectedPackageId={bookingData.banquetPackageId}
                  onSelectPackage={(id) => {
                    setBookingData(prev => ({ ...prev, banquetPackageId: id }));
                    setBanquetModalOpen(false);
                  }}
                />


              </div>

              {/* Правое изображение */}
              <div className="hidden lg:block lg:col-span-3 rounded-2xl overflow-hidden border border-white/10 bg-white/5 shadow-lg relative min-h-[400px] sm:min-h-[500px] lg:min-h-[600px]">
                <Image
                  src="/konga_bron_2.webp"
                  alt="Интерьер ресторана"
                  fill
                  sizes="(max-width: 1024px) 0vw, 25vw"
                  className="object-cover object-[20%_center]"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </section>

        {/* GALLERY (GallerySection) */}
        <GallerySection gallery={gallery} />

        {/* REVIEWS */}
        <section id="reviews" className="py-8 sm:py-12 lg:py-16 border-t border-white/10">
          <div className="container mx-auto px-4">
            <h2 className="text-center text-2xl sm:text-3xl md:text-4xl font-bold uppercase tracking-wider mb-8 sm:mb-10">Отзывы гостей</h2>
            <div className="max-w-[760px] mx-auto">
              <div className="rounded-2xl overflow-hidden border border-white/10 bg-white/5 p-2 sm:p-4">
                <div className="w-full h-[500px] sm:h-[600px] md:h-[700px] overflow-hidden relative">
                  <iframe
                    className="w-full h-full border border-white/10 rounded-lg"
                    src="https://yandex.ru/maps-reviews-widget/10214255530?comments"
                    frameBorder="0"
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title="Отзывы Яндекс.Карт"
                  />
                  <a
                    href="https://yandex.kz/maps/org/kucher_conga/10214255530/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute bottom-2 left-0 right-0 text-center text-[10px] text-neutral-400 hover:text-amber-400 transition-colors px-5"
                  >
                    Kucher&Conga
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* YANDEX MAP */}
        <section className="py-8 sm:py-12 lg:py-16 border-t border-white/10">
          <div className="container mx-auto px-4">
            <h2 className="text-center text-2xl sm:text-3xl md:text-4xl font-bold uppercase tracking-wider mb-4 sm:mb-6 md:mb-12">
              Как нас найти
            </h2>
            <div className="max-w-6xl mx-auto">
              <div className="rounded-2xl overflow-hidden border border-white/10 bg-white/5 p-4">
                <div className="w-full h-[300px] sm:h-[350px] md:h-[400px] rounded-lg overflow-hidden relative">
                  {/* Яндекс карта через iframe */}
                  <iframe
                    src="https://yandex.ru/map-widget/v1/?um=constructor%3A1c90c41847ab12bb686f7ffc03fcb5b1930c854da9e094965c7ac7ad24f8e4b7&amp;source=constructor"
                    width="100%"
                    height="400"
                    frameBorder="0"
                    allowFullScreen
                    style={{
                      border: 0,
                      width: '100%',
                      height: '100%',
                      minHeight: '400px'
                    }}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title="Карта расположения ресторана Кучер и Конга"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CONTACTS */}
        <section className="py-8 sm:py-12 lg:py-16 border-t border-white/10">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
              <div className="rounded-2xl bg-white/5 p-6 border border-white/10 hover:bg-white/10 hover:border-amber-400/30 hover:scale-105 active:scale-95 transition-all duration-300">
                <div className="uppercase text-xs tracking-widest text-neutral-400">Телефон</div>
                <div className="mt-2 space-y-1">
                  <div className="text-sm text-neutral-400 mb-1">Администрация:</div>
                  <a href="tel:+79162977887" className="block text-lg hover:text-amber-400 hover:scale-105 transition-all duration-200">
                    <Phone className="inline w-4 h-4 mr-2" />+7 (916) 297-78-87
                  </a>
                  <a href="tel:+79163177887" className="block text-lg hover:text-amber-400 hover:scale-105 transition-all duration-200">
                    <Phone className="inline w-4 h-4 mr-2" />+7 (916) 317-78-87
                  </a>
                </div>
              </div>
              <div className="rounded-2xl bg-white/5 p-6 border border-white/10 hover:bg-white/10 hover:border-amber-400/30 hover:scale-105 active:scale-95 transition-all duration-300">
                <div className="uppercase text-xs tracking-widest text-neutral-400">Адрес</div>
                <div className="mt-2 text-lg"><MapPin className="inline w-4 h-4 mr-2" />г. Дмитров, ул. Промышленная 20 Б</div>
              </div>
              <div className="rounded-2xl bg-white/5 p-6 border border-white/10 hover:bg-white/10 hover:border-amber-400/30 hover:scale-105 active:scale-95 transition-all duration-300">
                <div className="uppercase text-xs tracking-widest text-neutral-400">Часы работы</div>
                <div className="mt-2 text-lg"><Clock className="inline w-4 h-4 mr-2" />Пн–Вс: 12:00 — 00:00</div>
              </div>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="border-t border-white/10">
          <div className="container mx-auto px-4 py-10">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex items-center">
                <img src="/kongo_logo_main.svg" alt="КОНГО" className="h-6 w-auto" loading="lazy" />
              </div>
              <div className="text-sm text-neutral-400">© {new Date().getFullYear()} Ресторан «Кучер и Конга». Все права защищены.</div>
              <div className="text-sm text-neutral-400 flex items-center gap-6 flex-wrap">
                <a href="/privacy" className="hover:text-amber-400 hover:scale-105 transition-all duration-200">Политика конфиденциальности</a>
                <a href="/terms" className="hover:text-amber-400 hover:scale-105 transition-all duration-200">Пользовательское соглашение</a>
              </div>
            </div>
          </div>
        </footer>

        {/* --- NAVIGATION MENU --- */}
        {/* Mobile/Tablet: меню выезжает слева */}
        <aside
          aria-label="Навигация"
          aria-hidden={isMounted ? (menuOpen ? "false" : "true") : "true"}
          role="dialog"
          className={`md:hidden fixed left-0 top-0 z-50 h-full w-full sm:w-[420px] bg-neutral-950 border-r border-white/10 transform transition-transform duration-300 ${menuOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
          onClick={(e) => e.stopPropagation()}
          suppressHydrationWarning
        >
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Menu className="w-5 h-5" />
              <span className="font-semibold">Навигация</span>
            </div>
            <button onClick={() => setMenuOpen(false)} aria-label="Закрыть" className="p-2 rounded hover:bg-white/5">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="h-[calc(100%-80px)] overflow-auto p-4">
            <nav className="flex flex-col gap-2">
              <NavigationLinks scrollTo={scrollTo} />
            </nav>
          </div>
        </aside>

        {/* Desktop: меню выезжает справа */}
        <aside
          aria-label="Навигация"
          aria-hidden={isMounted ? (menuOpen ? "false" : "true") : "true"}
          role="dialog"
          className={`hidden md:block fixed right-0 top-0 z-50 h-full w-[420px] bg-neutral-950 border-l border-white/10 transform transition-transform duration-300 ${menuOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
          onClick={(e) => e.stopPropagation()}
          suppressHydrationWarning
        >
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Menu className="w-5 h-5" />
              <span className="font-semibold">Навигация</span>
            </div>
            <button onClick={() => setMenuOpen(false)} aria-label="Закрыть" className="p-2 rounded hover:bg-white/5">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="h-[calc(100%-80px)] overflow-auto p-4">
            <nav className="flex flex-col gap-2">
              <NavigationLinks scrollTo={scrollTo} />
            </nav>
          </div>
        </aside>

        {/* --- CART DRAWER --- */}
        {cartOpen && <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setCartOpen(false)} aria-hidden />}
        <aside
          aria-label="Корзина"
          aria-hidden={isMounted ? (cartOpen ? "false" : "true") : "true"}
          role="dialog"
          className={`fixed right-0 top-0 z-50 h-full w-full sm:w-[420px] bg-neutral-950 border-l border-white/10 transform transition-transform duration-300 ${cartOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
          suppressHydrationWarning
        >
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              <span className="font-semibold">Корзина</span>
              {count > 0 && <span className="text-sm text-neutral-400">({count})</span>}
            </div>
            <button onClick={() => setCartOpen(false)} aria-label="Закрыть" className="p-2 rounded hover:bg-white/5">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="h-[calc(100%-230px)] overflow-auto p-4 space-y-4">
            {items.length === 0 ? (
              <div className="text-neutral-400">Ваша корзина пуста. Добавьте блюда из меню.</div>
            ) : (
              items.map((i) => (
                <div key={i.id} className="flex gap-3 rounded-xl border border-white/10 p-3">
                  <img src={i.img} alt={i.name} className="h-16 w-16 object-cover rounded-lg" />
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold">{i.name}</div>
                        <div className="text-sm text-neutral-400">{i.price.toLocaleString('ru-RU')} ₽</div>
                      </div>
                      <button onClick={() => remove(i.id)} className="p-1 rounded hover:bg-white/5" aria-label="Удалить позицию">
                        <Trash2 className="w-4 h-4 text-neutral-400" />
                      </button>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => dec(i.id)}
                          className="p-2 rounded-full border border-white/20 hover:border-amber-400/50 hover:scale-110 active:scale-95 transition-all duration-200"
                          aria-label="Убавить"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <input
                          type="number"
                          min="1"
                          max="99"
                          value={i.qty}
                          onChange={(e) => {
                            const newQty = parseInt(e.target.value) || 1;
                            if (newQty > 0 && newQty <= 99) {
                              add({ ...i, qty: newQty });
                            }
                          }}
                          className="w-12 text-center bg-black/40 border border-white/10 rounded-lg px-2 py-1 outline-none focus:border-amber-400 text-sm"
                        />
                        <button
                          onClick={() => {
                            if (i.qty < 99) {
                              add({ ...i, qty: i.qty + 1 });
                            }
                          }}
                          disabled={i.qty >= 99}
                          className="p-2 rounded-full bg-amber-400 text-black hover:bg-amber-300 hover:scale-110 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                          aria-label="Добавить"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="font-semibold">{(i.qty * i.price).toLocaleString('ru-RU')} ₽</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="absolute bottom-0 left-0 right-0 border-t border-white/10 p-4 space-y-3 bg-neutral-950">
            <div className="flex items-center justify-between">
              <span className="text-neutral-400">Итого</span>
              <span className="text-xl font-bold">{total.toLocaleString('ru-RU')} ₽</span>
            </div>

            {/* Предупреждение о бизнес-ланчах */}
            {validateBusinessLunchOrder.businessLunchCount > 0 && !validateBusinessLunchOrder.isValid && (
              <div className="p-3 bg-amber-400/10 border border-amber-400/20 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-amber-300 text-sm font-semibold mb-1">Условия заказа бизнес-ланчей</p>
                  <p className="text-amber-200/80 text-xs">{validateBusinessLunchOrder.message}</p>
                  <p className="text-amber-200/60 text-xs mt-1">
                    Бизнес-ланчей в заказе: {validateBusinessLunchOrder.businessLunchCount} |
                    Сумма: {total.toLocaleString('ru-RU')} ₽
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                disabled={items.length === 0 || (validateBusinessLunchOrder.businessLunchCount > 0 && !validateBusinessLunchOrder.isValid)}
                onClick={() => {
                  if (!isDeliveryAvailableNow() && !deliverySettings.isDeliveryEnabled) {
                    alert('Доставка временно отключена администратором.');
                    return;
                  }
                  setDeliveryOpen(true);
                }}
                className="w-full px-6 py-3 rounded-full bg-amber-400 text-black font-semibold hover:bg-amber-300 hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-lg hover:shadow-xl"
              >
                Доставка
              </button>
            </div>
            <p className="text-[12px] text-neutral-400">
              Оплата на месте/при получении. Администратор свяжется для подтверждения.
            </p>
          </div>
        </aside>

        {/* --- DELIVERY MODAL --- */}
        {deliveryOpen && <div className="fixed inset-0 z-50 bg-black/60" onClick={() => setDeliveryOpen(false)} aria-hidden />}
        <div
          className={`fixed inset-x-0 top-1/2 -translate-y-1/2 z-50 mx-auto w-[94%] max-w-6xl rounded-2xl bg-neutral-950 border border-white/10 transition overflow-hidden ${deliveryOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
            }`}
          role="dialog"
          aria-label="Оформление доставки"
        >
          <div className="flex flex-col lg:flex-row min-h-[90vh] max-h-[95vh]">

            {/* Левая часть - форма */}
            <div className="flex-1 p-4 sm:p-6 lg:p-8 border-r border-white/10 lg:max-w-md flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-6 sm:mb-8 flex-shrink-0">
                <div className="text-lg sm:text-xl font-semibold">Оформление доставки</div>
                <button onClick={() => setDeliveryOpen(false)} className="p-2 rounded hover:bg-white/5 flex-shrink-0" aria-label="Закрыть">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Информационный блок о часах работы */}
              {!isDeliveryAvailableNow() && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg mb-4">
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-amber-300 font-semibold mb-1">Доставка временно недоступна</h4>
                      <p className="text-amber-200 text-sm">
                        Доставка осуществляется с {deliverySettings.startTime} до {deliverySettings.endTime}.
                        Вы можете выбрать время доставки или оформить заказ на другое время.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={submitDelivery} className="grid grid-cols-1 gap-3 sm:gap-4 flex-1 overflow-y-auto min-h-0">
                <input
                  required placeholder="Имя"
                  className="bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-sm outline-none focus:border-amber-400"
                  value={dForm.name}
                  onChange={e => setDForm(o => ({ ...o, name: e.target.value }))}
                />
                <input
                  required placeholder="Телефон"
                  className="bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-sm outline-none focus:border-amber-400"
                  value={dForm.phone}
                  onChange={e => setDForm(o => ({ ...o, phone: e.target.value }))}
                />
                <textarea
                  rows={2} placeholder="Комментарий (необязательно)"
                  className="bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-sm outline-none focus:border-amber-400 resize-none min-h-[60px]"
                  value={dForm.comment}
                  onChange={e => setDForm(o => ({ ...o, comment: e.target.value }))}
                />

                {/* Ручной ввод адреса */}
                <input
                  placeholder="Адрес доставки"
                  className="bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-sm outline-none focus:border-amber-400"
                  value={dForm.address}
                  onChange={e => {
                    const newAddress = e.target.value;
                    setDForm(o => ({ ...o, address: newAddress }));

                    // Если адрес пустой, сбрасываем зону доставки
                    if (!newAddress.trim()) {
                      setDForm(o => ({ ...o, deliveryZone: null, deliveryPrice: null }));
                      return;
                    }


                    // Пытаемся определить зону по введенному адресу
                    if (window.ymaps && newAddress.trim()) {
                      window.ymaps.geocode(newAddress.trim() + ', Дмитров, Московская область', {
                        results: 1,
                        boundedBy: [[56.2, 37.3], [56.5, 37.7]]
                      }).then((result: any) => {
                        const firstGeoObject = result.geoObjects.get(0);
                        if (firstGeoObject) {
                          const coords = firstGeoObject.geometry.getCoordinates();
                          const zone = checkDeliveryZoneForCoords(coords);
                          if (zone) {
                            setDForm(o => ({ ...o, deliveryZone: zone, deliveryPrice: zone.price }));
                          } else {
                            setDForm(o => ({ ...o, deliveryZone: null, deliveryPrice: null }));
                          }
                        }

                      }).catch((error: any) => {
                        console.warn('Could not geocode manual address:', error);
                        // Если геокодинг не удался, пробуем определить по ключевым словам
                        const lowerAddress = newAddress.toLowerCase();
                        let zone = null;

                        if (lowerAddress.includes('промышленная') || lowerAddress.includes('загорская') || lowerAddress.includes('московская')) {
                          zone = deliveryZones[0]; // Бесплатная доставка
                        } else if (lowerAddress.includes('внуковская') || lowerAddress.includes('кропоткинская') || lowerAddress.includes('туполева')) {
                          zone = deliveryZones[1]; // Зона 200₽
                        } else if (lowerAddress.includes('ключевая') || lowerAddress.includes('лобненская') || lowerAddress.includes('ольявидово')) {
                          zone = deliveryZones[2]; // Зона 300₽
                        } else if (lowerAddress.includes('солнечная') || lowerAddress.includes('юбилейная') || lowerAddress.includes('габово')) {
                          zone = deliveryZones[3]; // Зона 400₽
                        } else if (lowerAddress.includes('центральная') || lowerAddress.includes('богослово') || lowerAddress.includes('жуково')) {
                          zone = deliveryZones[4]; // Зона 500₽
                        }

                        if (zone) {
                          setDForm(o => ({ ...o, deliveryZone: zone, deliveryPrice: zone.price }));
                        }

                      });
                    }
                  }}
                />

                {/* Кнопка выбора адреса на карте (только для мобильных) */}
                <button
                  type="button"
                  onClick={() => setMapModalOpen(true)}
                  className="lg:hidden px-4 py-3 text-sm rounded-lg bg-neutral-700 text-neutral-200 border border-neutral-600 hover:bg-neutral-600 hover:border-neutral-500 transition-colors"
                >
                  📍 Выбрать на карте
                </button>

                {/* Время доставки */}
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    Время доставки
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="deliveryTime"
                        value="asap"
                        checked={dForm.deliveryTime === 'asap'}
                        onChange={e => setDForm(o => ({ ...o, deliveryTime: e.target.value, deliveryTimeCustom: '' }))}
                        className="w-4 h-4 text-amber-400 bg-black/40 border-white/20 focus:ring-amber-400 focus:ring-1"
                      />
                      <span className="ml-2 text-sm text-neutral-300">Как можно быстрее</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="deliveryTime"
                        value="custom"
                        checked={dForm.deliveryTime === 'custom'}
                        onChange={e => setDForm(o => ({ ...o, deliveryTime: e.target.value }))}
                        className="w-4 h-4 text-amber-400 bg-black/40 border-white/20 focus:ring-amber-400 focus:ring-1"
                      />
                      <span className="ml-2 text-sm text-neutral-300">К определенному времени</span>
                    </label>
                    {dForm.deliveryTime === 'custom' && (
                      <div className="mt-2 space-y-2">
                        <DateTimePicker
                          value={dForm.deliveryTimeCustom}
                          onChange={(value) => {
                            // Создаем полное время с сегодняшней датой
                            const today = new Date().toISOString().split('T')[0];
                            const fullDateTime = `${today}T${value}:00`;
                            setDForm(o => ({ ...o, deliveryTimeCustom: fullDateTime }));
                          }}
                          required={dForm.deliveryTime === 'custom'}
                          timeOnly={true}
                          availableTimeRange={{ start: '16:00', end: '22:00', interval: 30 }}
                        />
                        <p className="text-xs text-neutral-500">
                          Доставка доступна: {deliverySettings.startTime} - {deliverySettings.endTime}
                          (минимум через {deliverySettings.minDeliveryHours} ч.)
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Способ оплаты */}
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    Способ оплаты
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="card"
                        checked={dForm.paymentMethod === 'card'}
                        onChange={e => setDForm(o => ({ ...o, paymentMethod: e.target.value, changeAmount: 'no-change' }))}
                        className="w-4 h-4 text-amber-400 bg-black/40 border-white/20 focus:ring-amber-400 focus:ring-1"
                      />
                      <span className="ml-2 text-sm text-neutral-300">Картой (при получении)</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="transfer"
                        checked={dForm.paymentMethod === 'transfer'}
                        onChange={e => setDForm(o => ({ ...o, paymentMethod: e.target.value, changeAmount: 'no-change' }))}
                        className="w-4 h-4 text-amber-400 bg-black/40 border-white/20 focus:ring-amber-400 focus:ring-1"
                      />
                      <span className="ml-2 text-sm text-neutral-300">Переводом</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="cash"
                        checked={dForm.paymentMethod === 'cash'}
                        onChange={e => setDForm(o => ({ ...o, paymentMethod: e.target.value }))}
                        className="w-4 h-4 text-amber-400 bg-black/40 border-white/20 focus:ring-amber-400 focus:ring-1"
                      />
                      <span className="ml-2 text-sm text-neutral-300">Наличными</span>
                    </label>
                  </div>
                </div>

                {/* Сдача (только при выборе наличных) */}
                {dForm.paymentMethod === 'cash' && (
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-2">
                      С какой суммы требуется сдача?
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="changeAmount"
                          value="no-change"
                          checked={dForm.changeAmount === 'no-change'}
                          onChange={e => setDForm(o => ({ ...o, changeAmount: e.target.value }))}
                          className="w-4 h-4 text-amber-400 bg-black/40 border-white/20 focus:ring-amber-400 focus:ring-1"
                        />
                        <span className="ml-2 text-sm text-neutral-300">Без сдачи</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="changeAmount"
                          value="custom"
                          checked={typeof dForm.changeAmount === 'string' && dForm.changeAmount !== 'no-change'}
                          onChange={e => setDForm(o => ({ ...o, changeAmount: '' }))}
                          className="w-4 h-4 text-amber-400 bg-black/40 border-white/20 focus:ring-amber-400 focus:ring-1"
                        />
                        <span className="ml-2 text-sm text-neutral-300">С суммы:</span>
                      </label>
                      {typeof dForm.changeAmount === 'string' && dForm.changeAmount !== 'no-change' && (
                        <input
                          type="number"
                          placeholder="Введите сумму"
                          value={dForm.changeAmount}
                          onChange={e => setDForm(o => ({ ...o, changeAmount: e.target.value }))}
                          className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-sm outline-none focus:border-amber-400"
                          min="0"
                          step="1"
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* Информация о доставке */}
                {dForm.address && dForm.deliveryPrice !== null && (
                  <div className="p-3 rounded-lg border bg-green-900/20 border-green-500/50 text-green-300">
                    <div className="mb-2">
                      <span className="text-sm opacity-75">Адрес:</span>
                      <div className="text-sm font-semibold leading-tight">{dForm.address}</div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm opacity-75">Стоимость:</span>
                      <span className="text-lg font-bold text-amber-400">
                        {dForm.deliveryPrice === 0 ? 'Бесплатно' : `${dForm.deliveryPrice}₽`}
                      </span>
                    </div>
                  </div>
                )}

                {/* Аллергия */}
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    Есть ли аллергия?
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="hasAllergy"
                        value="false"
                        checked={!dForm.hasAllergy}
                        onChange={(e) => setDForm(o => ({ ...o, hasAllergy: false, allergyDetails: '' }))}
                        className="w-4 h-4 text-amber-400 bg-black/40 border-white/20 focus:ring-amber-400 focus:ring-1"
                      />
                      <span className="ml-2 text-sm text-neutral-300">Нет</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="hasAllergy"
                        value="true"
                        checked={dForm.hasAllergy}
                        onChange={(e) => setDForm(o => ({ ...o, hasAllergy: true }))}
                        className="w-4 h-4 text-amber-400 bg-black/40 border-white/20 focus:ring-amber-400 focus:ring-1"
                      />
                      <span className="ml-2 text-sm text-neutral-300">Да</span>
                    </label>
                    {dForm.hasAllergy && (
                      <textarea
                        rows={2}
                        placeholder="Укажите продукты или вещества, на которые есть аллергия..."
                        value={dForm.allergyDetails}
                        onChange={(e) => setDForm(o => ({ ...o, allergyDetails: e.target.value }))}
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-sm outline-none focus:border-amber-400 resize-none min-h-[60px]"
                      />
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="delivery-privacy-consent"
                    checked={deliveryPrivacyConsent}
                    onChange={(e) => setDeliveryPrivacyConsent(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded border-white/20 bg-black/40 text-amber-400 focus:ring-amber-400 focus:ring-1"
                    required
                  />
                  <label htmlFor="delivery-privacy-consent" className="text-sm text-neutral-300 leading-relaxed">
                    Оформляя доставку, вы соглашаетесь с{' '}
                    <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300 underline">
                      политикой конфиденциальности
                    </a>
                  </label>
                </div>

                {/* Сумма заказа */}
                <div className="bg-neutral-800/50 rounded-lg p-4 border border-neutral-700">
                  <div className="space-y-2 text-sm text-neutral-300">
                    <div className="flex justify-between">
                      <span>Позиций в заказе:</span>
                      <span className="font-medium">{items.reduce((s, i) => s + i.qty, 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Сумма заказа:</span>
                      <span className="font-medium">{total.toLocaleString('ru-RU')} ₽</span>
                    </div>
                    {dForm.deliveryPrice !== null && dForm.deliveryPrice > 0 && (
                      <div className="flex justify-between">
                        <span>Доставка:</span>
                        <span className="font-medium">{dForm.deliveryPrice} ₽</span>
                      </div>
                    )}
                    {dForm.deliveryPrice !== null && (
                      <>
                        <div className="border-t border-neutral-600 pt-3 mt-3">
                          <div className="flex justify-between items-center">
                            <span className="text-lg font-semibold text-white">Итого:</span>
                            <span className="text-xl font-bold text-amber-400">{(total + (dForm.deliveryPrice || 0)).toLocaleString('ru-RU')} ₽</span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

              </form>

              {/* Фиксированные элементы внизу */}
              <div className="flex-shrink-0 mt-4 space-y-3">
                {/* Предупреждение о бизнес-ланчах */}
                {validateBusinessLunchOrder.businessLunchCount > 0 && !validateBusinessLunchOrder.isValid && (
                  <div className="p-3 bg-amber-400/10 border border-amber-400/20 rounded-lg flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-amber-300 text-sm font-semibold mb-2">Условия заказа бизнес-ланчей</p>
                      <p className="text-amber-200/80 text-sm leading-relaxed">{validateBusinessLunchOrder.message}</p>
                    </div>
                  </div>
                )}

                <form onSubmit={submitDelivery} className="space-y-3">
                  <button
                    type="submit"
                    disabled={items.length === 0 || (validateBusinessLunchOrder.businessLunchCount > 0 && !validateBusinessLunchOrder.isValid) || !dForm.deliveryZone}
                    className="w-full px-6 py-3 text-base rounded-full bg-amber-400 text-black font-semibold hover:bg-amber-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                  >
                    Отправить в Telegram
                  </button>

                  {validateBusinessLunchOrder.businessLunchCount > 0 && (
                    <div className="text-xs text-amber-400 text-center">
                      Бизнес-ланчей в заказе: {validateBusinessLunchOrder.businessLunchCount}
                    </div>
                  )}
                </form>
              </div>
            </div>

            {/* Правая часть - карта (десктоп) */}
            <div className="hidden lg:block flex-1 min-h-[400px]">
              <DeliveryMap
                onZoneChange={handleDeliveryZoneChange}
                onAddressChange={handleDeliveryAddressChange}
              />
            </div>
          </div>
        </div>

        {/* Модальное окно карты для мобильных устройств */}
        {mapModalOpen && (
          <>
            <div className="fixed inset-0 z-50 bg-black/60 lg:hidden" onClick={() => setMapModalOpen(false)} aria-hidden />
            <div
              className={`fixed inset-x-0 inset-y-0 z-50 mx-auto w-full h-full lg:hidden rounded-none bg-neutral-950 border border-white/10 transition overflow-hidden ${mapModalOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
                }`}
              role="dialog"
              aria-label="Выбор адреса доставки"
            >
              <div className="flex flex-col h-full">
                {/* Заголовок */}
                <div className="flex items-center justify-between p-4 border-b border-white/10 bg-neutral-950">
                  <div className="text-lg font-semibold">Выберите адрес доставки</div>
                  <button onClick={() => setMapModalOpen(false)} className="p-2 rounded hover:bg-white/5" aria-label="Закрыть">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Карта */}
                <div className="flex-1">
                  <DeliveryMap
                    onZoneChange={handleDeliveryZoneChange}
                    onAddressChange={(address, coords) => {
                      handleDeliveryAddressChange(address, coords);
                      setMapModalOpen(false); // Закрываем модальное окно после выбора адреса
                    }}
                  />
                </div>

                {/* Кнопка подтверждения */}
                <div className="p-4 border-t border-white/10 bg-neutral-950">
                  <button
                    onClick={() => setMapModalOpen(false)}
                    className="w-full px-6 py-3 rounded-full bg-amber-400 text-black font-semibold hover:bg-amber-300 transition-colors"
                  >
                    Подтвердить адрес
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
        {/* Footer */}
        <footer className="w-full py-6 mt-12 border-t border-white/10 bg-black/20 backdrop-blur-sm">
          <div className="container mx-auto px-4 flex justify-center items-center">
            <p className="text-sm text-neutral-500 font-medium">
              Сайт разработан{' '}
              <a
                href="https://t.me/Kvazar27"
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-400 hover:text-amber-300 transition-colors"
              >
                @Kvazar27
              </a>
            </p>
          </div>
        </footer>
      </div>

      {/* Модальное окно управления контентом */}
      {contentManagerOpen && contentManagerCategory && (
        <ContentManager
          category={contentManagerCategory}
          isOpen={contentManagerOpen}
          onClose={() => {
            setContentManagerOpen(false);
            setContentManagerCategory(null);
          }}
        />
      )}

      {/* Модальное окно настроек доставки */}
      <DeliverySettings
        isOpen={deliverySettingsOpen}
        onClose={() => setDeliverySettingsOpen(false)}
      />

      <ReservationSettings
        isOpen={reservationSettingsOpen}
        onClose={() => setReservationSettingsOpen(false)}
      />
    </>
  );
}
