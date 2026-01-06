'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import Image from 'next/image';
import {
  Phone, MapPin, Clock, Utensils,
  ShoppingCart, Plus, Minus, X, Trash2, Menu,
  Home, Users, AlertCircle, ChevronLeft, ChevronRight
} from 'lucide-react';
import EnhancedMenuSection from './components/EnhancedMenuSection';
import ContentManager from './components/ContentManager';
import DeliveryMap from './components/DeliveryMapNew';
import useAdminCheck from '../lib/hooks/useAdminCheck';
import { createReservation } from '../lib/reservations';

/* --- УТИЛИТА СКРОЛЛА --- */
const scrollTo = (target) => {
  const element = document.querySelector(target);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};

/* --- ДАННЫЕ --- */

const gallery = [
  '/atmosphere_1.webp',
  '/atmosphere_2.webp',
  '/atmosphere_3.webp',
  '/atmosphere_4.webp',
  '/atmosphere_5.webp',
  '/atmosphere_6.webp',
];

const events = [
  {
    id: 'new-year',
    title: 'Новогодняя ночь',
    image: '/kongo_ng.webp',
    link: '/events'
  }
];

/* --- НАВИГАЦИОННЫЕ ССЫЛКИ --- */
const NAVIGATION_ITEMS = [
  { type: 'scroll', target: '#menu', label: 'Меню' },
  { type: 'scroll', target: '#about', label: 'О ресторане' },
  { type: 'scroll', target: '#gallery', label: 'Атмосфера' },
  { type: 'link', href: '/halls', label: 'Залы' },
  { type: 'scroll', target: '#reviews', label: 'Отзывы' },
  { type: 'scroll', target: '#booking', label: 'Бронь' },
  { type: 'link', href: '/events', label: 'События' },
  { type: 'link', href: '/vacancies', label: 'Вакансии' },
  { type: 'link', href: '/blog', label: 'Новостной блог' },
  { type: 'link', href: '/rules', label: 'Правила нахождения' },
  { type: 'link', href: '/account', label: 'Личный кабинет' },
];

/* --- КОМПОНЕНТ НАВИГАЦИОННЫХ ССЫЛОК --- */
function NavigationLinks({ scrollTo }) {
  const linkClassName = "text-left px-4 py-3 rounded-lg hover:bg-white/5 hover:text-amber-400 transition-colors duration-200 text-sm font-medium text-white";
  
  return (
    <>
      {NAVIGATION_ITEMS.map((item, index) => (
        item.type === 'scroll' ? (
          <button
            key={index}
            onClick={(e) => { e.stopPropagation(); scrollTo(item.target); }}
            className={linkClassName}
          >
            {item.label}
          </button>
        ) : (
          <a
            key={index}
            href={item.href}
            onClick={(e) => e.stopPropagation()}
            className={linkClassName}
          >
            {item.label}
          </a>
        )
      ))}
    </>
  );
}

/* --- УТИЛИТЫ КОРЗИНЫ --- */
function useCart() {
  const [items, setItems] = useState([]); // [{ id, name, price, img, qty }]

  const add = useCallback((product) => {
    setItems(prev => {
      const idx = prev.findIndex(p => p.id === product.id);
      // Если количество 0 или меньше, удаляем элемент
      if (product.qty <= 0) {
        if (idx >= 0) {
          return prev.filter(p => p.id !== product.id);
        }
        return prev;
      }
      // Ограничиваем максимальное количество до 99
      const maxQty = Math.min(product.qty, 99);
      if (idx >= 0) {
        // Элемент уже есть в корзине - устанавливаем новое количество (не добавляем!)
        const copy = [...prev];
        copy[idx] = { ...copy[idx], qty: maxQty };
        return copy;
      }
      // Новый элемент - добавляем с указанным количеством (не более 99)
      return [...prev, { ...product, qty: maxQty || 1 }];
    });
  }, []);

  const dec = useCallback((id) => {
    setItems(prev => {
      const idx = prev.findIndex(p => p.id === id);
      if (idx < 0) return prev;
      const cur = prev[idx];
      if (cur.qty <= 1) return prev.filter(p => p.id !== id);
      const copy = [...prev];
      copy[idx] = { ...cur, qty: cur.qty - 1 };
      return copy;
    });
  }, []);

  const remove = useCallback((id) => {
    setItems(prev => prev.filter(p => p.id !== id));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const count = useMemo(() => items.reduce((s, i) => s + i.qty, 0), [items]);
  const total = useMemo(() => items.reduce((s, i) => s + i.qty * i.price, 0), [items]);

  return { items, add, dec, remove, clear, count, total };
}

/* --- СТРАНИЦА --- */
export default function Page() {
  const [guests, setGuests] = useState(2);
  const [cartOpen, setCartOpen] = useState(false);
  const [deliveryOpen, setDeliveryOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedGalleryImage, setSelectedGalleryImage] = useState(null);
  const [currentGalleryIndex, setCurrentGalleryIndex] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  const [contentManagerOpen, setContentManagerOpen] = useState(false);
  const [contentManagerCategory, setContentManagerCategory] = useState(null);
  const [bookingMessage, setBookingMessage] = useState(null); // { type: 'success' | 'error', text: string }
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingPrivacyConsent, setBookingPrivacyConsent] = useState(false);
  const [deliveryPrivacyConsent, setDeliveryPrivacyConsent] = useState(false);
  const { items, add, dec, remove, clear, count, total } = useCart();
  
  // Используем хук для проверки админа
  const { isAdmin, loading: adminLoading } = useAdminCheck(true);

  // Устанавливаем флаг монтирования для избежания hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Доставка: локальный стейт формы
  const [dForm, setDForm] = useState({
    name: '',
    phone: '',
    address: '',
    comment: '',
    deliveryZone: null,
    deliveryPrice: null,
    coordinates: null
  });

  // Обработчики для карты доставки
  const handleDeliveryZoneChange = (zone) => {
    setDForm(prev => ({
      ...prev,
      deliveryZone: zone,
      deliveryPrice: zone ? zone.price : null
    }));
  };

  const handleDeliveryAddressChange = (address, coordinates) => {
    setDForm(prev => ({
      ...prev,
      address: address,
      coordinates: coordinates
    }));
  };

  // Блокируем скролл body при открытых модалках (но не при меню)
  useEffect(() => {
    const opened = cartOpen || deliveryOpen || selectedGalleryImage;
    if (opened) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => (document.body.style.overflow = prev);
    }
  }, [cartOpen, deliveryOpen, selectedGalleryImage]);

  // Закрываем меню при клике вне его области
  useEffect(() => {
    if (menuOpen) {
      const handleClickOutside = (e) => {
        // Проверяем, что клик был не на кнопке открытия меню
        const menuButton = e.target.closest('button[aria-label*="меню"]');
        if (menuButton && !menuButton.closest('aside[aria-label="Навигация"]')) {
          // Кнопка открытия меню вне самого меню - не закрываем
          return;
        }
        
        // Проверяем, находится ли клик внутри любого из меню навигации (mobile или desktop)
        const clickedInsideMenu = e.target.closest('aside[aria-label="Навигация"]');
        
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
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setDeliveryOpen(false);
        setCartOpen(false);
        setMenuOpen(false);
        setSelectedGalleryImage(null);
        setCurrentGalleryIndex(0);
      }
      // Навигация по галерее стрелками
      if (selectedGalleryImage) {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          const newIndex = currentGalleryIndex > 0 ? currentGalleryIndex - 1 : gallery.length - 1;
          setCurrentGalleryIndex(newIndex);
          setSelectedGalleryImage(gallery[newIndex]);
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          const newIndex = currentGalleryIndex < gallery.length - 1 ? currentGalleryIndex + 1 : 0;
          setCurrentGalleryIndex(newIndex);
          setSelectedGalleryImage(gallery[newIndex]);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedGalleryImage, currentGalleryIndex]);




  // Для карточки: есть ли в корзине
  const qtyInCart = (id) => items.find(i => i.id === id)?.qty ?? 0;

  // Отправка в Telegram API
  async function notifyTelegram(payload) {
    const res = await fetch('/api/telegram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'Telegram notify failed');
  }

  // Сабмит БРОНИ (из секции booking)
  async function submitBooking(e) {
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

    const form = new FormData(e.currentTarget);
    const name = form.get('name') || '';
    const phone = form.get('phone') || '';
    const date = form.get('date') || '';
    const time = form.get('time') || '';
    const guestsValue = form.get('guests') || guests;
    const comment = form.get('comment') || '';

    // URL API сайта бронирований из переменной окружения
    // Настройте переменную NEXT_PUBLIC_RESERVATIONS_API_URL в .env.local
    // Пример: NEXT_PUBLIC_RESERVATIONS_API_URL=https://your-reservations-site.vercel.app
    const reservationsApiUrl = process.env.NEXT_PUBLIC_RESERVATIONS_API_URL || '';

    try {
      // Если указан URL API бронирований, отправляем туда
      if (reservationsApiUrl) {
        const reservationData = {
          name: name,
          phone: phone,
          date: date,
          time: time,
          guests_count: Number(guestsValue) || guests,
          comments: comment || undefined,
        };

        const result = await createReservation(reservationData, reservationsApiUrl);

        if (result.success) {
          // Если есть предупреждение о CORS, но бронирование создано
          const message = result.warning 
            ? 'Бронирование успешно создано!'
            : result.message || 'Бронирование успешно создано! Мы свяжемся с вами для подтверждения.';
          
          setBookingMessage({
            type: 'success',
            text: message,
          });
          
          try {
            e.currentTarget.reset();
            setGuests(2);
            setBookingPrivacyConsent(false);
          } catch (resetError) {
            console.warn('Failed to reset form:', resetError);
            // Игнорируем ошибки сброса формы, так как бронирование уже создано
          }
          
          // Также отправляем в Telegram как резервный вариант
          try {
            await notifyTelegram({
              type: 'booking',
              name,
              phone,
              date,
              time,
              guests: guestsValue,
              comment,
              items,
              total,
            });
          } catch (telegramError) {
            console.warn('Failed to send to Telegram:', telegramError);
            // Не показываем ошибку пользователю, так как основное бронирование создано
          }
          
          // Выходим из функции, так как бронирование успешно создано
          setBookingLoading(false);
          return;
        } else {
          setBookingMessage({
            type: 'error',
            text: result.error || 'Ошибка при создании бронирования. Попробуйте позже.',
          });
          setBookingLoading(false);
          return;
        }
      } else {
        // Если URL API не указан, отправляем только в Telegram (старое поведение)
        const payload = {
          type: 'booking',
          name,
          phone,
          date,
          time,
          guests: guestsValue,
          comment,
          items,
          total,
        };
        await notifyTelegram(payload);
        setBookingMessage({
          type: 'success',
          text: 'Заявка на бронирование отправлена! Мы свяжемся с вами.',
        });
        e.currentTarget.reset();
        setGuests(2);
        setBookingPrivacyConsent(false);
        setBookingLoading(false);
        return;
      }
    } catch (error) {
      console.error('Booking submission error:', error);
      // Показываем ошибку только если бронирование не было успешно создано
      // (т.е. если мы не вышли из функции раньше через return)
      setBookingMessage({
        type: 'error',
        text: 'Произошла ошибка при отправке заявки. Попробуйте позже или свяжитесь с нами по телефону.',
      });
    } finally {
      setBookingLoading(false);
    }
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
  async function submitDelivery(e) {
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

    const deliveryTotal = total + (dForm.deliveryPrice || 0);

    const payload = {
      type: 'delivery',
      ...dForm,
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
      coordinates: null
    });
    setDeliveryPrivacyConsent(false);
    alert(`Заявка на доставку отправлена! Стоимость доставки: ${dForm.deliveryPrice === 0 ? 'бесплатно' : dForm.deliveryPrice + '₽'}. Ожидайте звонка.`);
  }

  return (
    <>
    <div className="bg-neutral-950 text-white">
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
              <a 
                href="tel:+74992299222" 
                className="flex items-center gap-2 text-sm hover:text-amber-400 hover:scale-105 active:scale-95 transition-all duration-200"
              >
                <Phone className="w-4 h-4" /> +7 (499) 229-92-22
              </a>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className={`p-2 rounded-lg border border-white/10 hover:border-white/40 hover:bg-white/5 transition-all duration-200 ${
                  menuOpen ? 'scale-95 bg-white/10' : 'hover:scale-110 active:scale-95'
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
              className={`p-2 rounded-lg border border-white/10 hover:border-white/40 hover:bg-white/5 transition-all duration-200 ${
                menuOpen ? 'scale-95 bg-white/10' : 'hover:scale-110 active:scale-95'
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

      {/* ADVANTAGES */}
      <section id="about" className="py-8 sm:py-12 lg:py-16 border-t border-white/10 pt-20 sm:pt-24 md:pt-20">
        <div className="container mx-auto px-4">
          <h2 className="text-center text-lg sm:text-xl md:text-2xl lg:text-4xl font-bold uppercase tracking-wider">ПОЧЕМУ ВЫБИРАЮТ НАС</h2>
          <div className="mt-4 sm:mt-6 lg:mt-10 grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-3 lg:gap-6">
            <div className="rounded-lg sm:rounded-xl lg:rounded-2xl bg-white/5 p-3 sm:p-4 lg:p-6 border border-white/10 hover:bg-white/10 hover:border-amber-400/30 hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer">
              <Utensils className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 text-amber-400 mb-2 sm:mb-3 lg:mb-4 hover:scale-110 transition-transform duration-200" />
              <h3 className="mt-2 sm:mt-3 lg:mt-4 text-sm sm:text-base lg:text-xl font-semibold">Изысканное меню</h3>
              <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm lg:text-base text-neutral-300">Наше меню сочетает в себе классические рецепты и современные гастрономические тенденции, предлагая блюда, которые восхищают своим вкусом и подачей</p>
            </div>
            <div className="rounded-lg sm:rounded-xl lg:rounded-2xl bg-white/5 p-3 sm:p-4 lg:p-6 border border-white/10 hover:bg-white/10 hover:border-amber-400/30 hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer">
              <Home className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 text-amber-400 mb-2 sm:mb-3 lg:mb-4 hover:scale-110 transition-transform duration-200" />
              <h3 className="mt-2 sm:mt-3 lg:mt-4 text-sm sm:text-base lg:text-xl font-semibold">Атмосферный интерьер</h3>
              <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm lg:text-base text-neutral-300">Каждая деталь интерьера создаёт неповторимую атмосферу уюта и стиля, погружая вас в мир эстетического наслаждения и комфорта</p>
            </div>
            <div className="rounded-lg sm:rounded-xl lg:rounded-2xl bg-white/5 p-3 sm:p-4 lg:p-6 border border-white/10 hover:bg-white/10 hover:border-amber-400/30 hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer">
              <Users className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 text-amber-400 mb-2 sm:mb-3 lg:mb-4 hover:scale-110 transition-transform duration-200" />
              <h3 className="mt-2 sm:mt-3 lg:mt-4 text-sm sm:text-base lg:text-xl font-semibold">Безупречное обслуживание</h3>
              <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm lg:text-base text-neutral-300">Наш персонал – это команда профессионалов, которые заботятся о каждом госте, обеспечивая высокий уровень сервиса и создавая приятные впечатления от посещения</p>
            </div>
          </div>
        </div>
      </section>

      {/* МЕНЮ РЕСТОРАНА */}
      <EnhancedMenuSection 
        onAddToCart={add} 
        cartItems={items}
        enableAdminEditing={true}
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
              <p className="mt-1.5 sm:mt-2 text-sm sm:text-base lg:text-lg text-neutral-300 text-center mb-4 sm:mb-6 lg:mb-8">Оставьте контакты — администратор подтвердит бронь.</p>
              {isMounted ? (
                <form onSubmit={submitBooking} className="mt-3 sm:mt-4 lg:mt-5 grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 lg:gap-5 max-w-3xl mx-auto">
                  <input id="booking-name" name="name" aria-label="Имя" className="bg-black/40 border border-white/10 rounded-lg px-3 sm:px-4 lg:px-5 py-2.5 sm:py-3 lg:py-4 text-sm sm:text-base lg:text-lg outline-none focus:border-amber-400" placeholder="Имя" required />
                  <input id="booking-phone" name="phone" aria-label="Телефон" className="bg-black/40 border border-white/10 rounded-lg px-3 sm:px-4 lg:px-5 py-2.5 sm:py-3 lg:py-4 text-sm sm:text-base lg:text-lg outline-none focus:border-amber-400" placeholder="Телефон" required />
                  <input id="booking-date" name="date" type="date" aria-label="Дата" className="bg-black/40 border border-white/10 rounded-lg px-3 sm:px-4 lg:px-5 py-2.5 sm:py-3 lg:py-4 text-sm sm:text-base lg:text-lg outline-none focus:border-amber-400" required />
                  <input id="booking-time" name="time" type="time" aria-label="Время" className="bg-black/40 border border-white/10 rounded-lg px-3 sm:px-4 lg:px-5 py-2.5 sm:py-3 lg:py-4 text-sm sm:text-base lg:text-lg outline-none focus:border-amber-400" required />
                  <div className="md:col-span-2 flex items-center gap-2 sm:gap-3 lg:gap-4">
                    <label htmlFor="guests" className="text-sm sm:text-base lg:text-lg text-neutral-300 font-medium">Гостей:</label>
                    <input
                      id="guests" name="guests" type="number" min={1} value={guests}
                      onChange={(e) => setGuests(Number(e.target.value))}
                      className="w-24 sm:w-28 lg:w-32 bg-black/40 border border-white/10 rounded-lg px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base lg:text-lg outline-none focus:border-amber-400"
                    />
                  </div>
                  <textarea id="booking-comment" name="comment" aria-label="Пожелания" className="md:col-span-2 bg-black/40 border border-white/10 rounded-lg px-3 sm:px-4 lg:px-5 py-2.5 sm:py-3 lg:py-4 text-sm sm:text-base lg:text-lg outline-none focus:border-amber-400" rows={3} placeholder="Пожелания (необязательно)" />
                  <div className="md:col-span-2 flex items-start gap-2">
                    <input
                      type="checkbox"
                      id="booking-privacy-consent"
                      checked={bookingPrivacyConsent}
                      onChange={(e) => setBookingPrivacyConsent(e.target.checked)}
                      className="mt-1 w-4 h-4 rounded border-white/20 bg-black/40 text-amber-400 focus:ring-amber-400 focus:ring-2"
                      required
                    />
                    <label htmlFor="booking-privacy-consent" className="text-xs sm:text-sm text-neutral-300">
                      Оформляя бронирование, вы соглашаетесь с{' '}
                      <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300 underline">
                        политикой конфиденциальности
                      </a>
                    </label>
                  </div>
                  {bookingMessage && (
                    <div className={`md:col-span-2 p-3 sm:p-4 rounded-lg border ${
                      bookingMessage.type === 'success' 
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
                  <button 
                    type="submit"
                    disabled={bookingLoading}
                    className="md:col-span-2 px-6 sm:px-8 lg:px-10 py-2.5 sm:py-3 lg:py-4 text-sm sm:text-base lg:text-lg rounded-full bg-amber-400 text-black font-semibold hover:bg-amber-300 hover:scale-105 active:scale-95 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    {bookingLoading ? 'Отправка...' : 'Отправить заявку'}
                  </button>
                </form>
              ) : (
                <form onSubmit={submitBooking} className="mt-3 sm:mt-4 lg:mt-5 grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 lg:gap-5 max-w-3xl mx-auto">
                  <input name="name" className="bg-black/40 border border-white/10 rounded-lg px-3 sm:px-4 lg:px-5 py-2.5 sm:py-3 lg:py-4 text-sm sm:text-base lg:text-lg outline-none focus:border-amber-400" placeholder="Имя" required />
                  <input name="phone" className="bg-black/40 border border-white/10 rounded-lg px-3 sm:px-4 lg:px-5 py-2.5 sm:py-3 lg:py-4 text-sm sm:text-base lg:text-lg outline-none focus:border-amber-400" placeholder="Телефон" required />
                  <input name="date" type="date" className="bg-black/40 border border-white/10 rounded-lg px-3 sm:px-4 lg:px-5 py-2.5 sm:py-3 lg:py-4 text-sm sm:text-base lg:text-lg outline-none focus:border-amber-400" required />
                  <input name="time" type="time" className="bg-black/40 border border-white/10 rounded-lg px-3 sm:px-4 lg:px-5 py-2.5 sm:py-3 lg:py-4 text-sm sm:text-base lg:text-lg outline-none focus:border-amber-400" required />
                  <div className="md:col-span-2 flex items-center gap-2 sm:gap-3 lg:gap-4">
                    <label htmlFor="guests" className="text-sm sm:text-base lg:text-lg text-neutral-300 font-medium">Гостей:</label>
                    <input
                      id="guests" name="guests" type="number" min={1} value={guests}
                      onChange={(e) => setGuests(Number(e.target.value))}
                      className="w-24 sm:w-28 lg:w-32 bg-black/40 border border-white/10 rounded-lg px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base lg:text-lg outline-none focus:border-amber-400"
                    />
                  </div>
                  <textarea name="comment" className="md:col-span-2 bg-black/40 border border-white/10 rounded-lg px-3 sm:px-4 lg:px-5 py-2.5 sm:py-3 lg:py-4 text-sm sm:text-base lg:text-lg outline-none focus:border-amber-400" rows={3} placeholder="Пожелания (необязательно)" />
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
                  {bookingMessage && (
                    <div className={`md:col-span-2 p-3 sm:p-4 rounded-lg border ${
                      bookingMessage.type === 'success' 
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
                  <button 
                    type="submit"
                    disabled={bookingLoading}
                    className="md:col-span-2 px-6 sm:px-8 lg:px-10 py-2.5 sm:py-3 lg:py-4 text-sm sm:text-base lg:text-lg rounded-full bg-amber-400 text-black font-semibold hover:bg-amber-300 hover:scale-105 active:scale-95 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    {bookingLoading ? 'Отправка...' : 'Отправить заявку'}
                  </button>
                </form>
              )}
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

      {/* GALLERY */}
      <section id="gallery" className="py-8 sm:py-12 lg:py-16 border-t border-white/10">
        <div className="container mx-auto px-4">
          <h2 className="text-center text-2xl sm:text-3xl md:text-4xl font-bold uppercase tracking-wider">Атмосфера</h2>
          <div className="mt-8 sm:mt-10 grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
            {gallery.map((src, idx) => (
              <div 
                key={idx}
                onClick={() => {
                  setSelectedGalleryImage(src);
                  setCurrentGalleryIndex(idx);
                }}
                className="overflow-hidden rounded-xl border border-white/10 hover:border-amber-400/30 transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer"
              >
                <Image 
                  src={src} 
                  alt={`Галерея ${idx + 1}`} 
                  width={400}
                  height={300}
                  sizes="(max-width: 640px) 50vw, (max-width: 768px) 50vw, 33vw"
                  className={`h-56 md:h-64 w-full object-cover transition-transform duration-300 hover:scale-110 ${
                    idx === 0 ? 'object-[center_75%]' : ''
                  }`}
                  loading={idx < 3 ? "eager" : "lazy"}
                  style={{ objectFit: 'cover' }}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Gallery Image Modal */}
      {selectedGalleryImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => {
            setSelectedGalleryImage(null);
            setCurrentGalleryIndex(0);
          }}
        >
          <div className="relative max-w-7xl max-h-[90vh] w-full h-full flex items-center justify-center">
            <button
              onClick={() => {
                setSelectedGalleryImage(null);
                setCurrentGalleryIndex(0);
              }}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition z-10"
              aria-label="Закрыть"
            >
              <X className="w-6 h-6" />
            </button>
            
            {/* Левая стрелка */}
            <div className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-10">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const newIndex = currentGalleryIndex > 0 ? currentGalleryIndex - 1 : gallery.length - 1;
                  setCurrentGalleryIndex(newIndex);
                  setSelectedGalleryImage(gallery[newIndex]);
                }}
                className="p-2 sm:p-3 rounded-full bg-gray-500/50 hover:bg-gray-500/70 text-white transition-all duration-200 backdrop-blur-sm"
                aria-label="Предыдущее изображение"
              >
                <ChevronLeft className="w-6 h-6 sm:w-8 sm:h-8" />
              </button>
            </div>
            
            {/* Изображение */}
            <div className="relative w-full h-full max-w-7xl max-h-[90vh] flex items-center justify-center">
              <Image 
                src={selectedGalleryImage} 
                alt="Развернутое изображение" 
                width={1920}
                height={1080}
                sizes="100vw"
                className="max-w-full max-h-full object-contain rounded-lg"
                onClick={(e) => e.stopPropagation()}
                priority
                style={{ width: 'auto', height: 'auto' }}
              />
            </div>
            
            {/* Правая стрелка */}
            <div className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-10">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const newIndex = currentGalleryIndex < gallery.length - 1 ? currentGalleryIndex + 1 : 0;
                  setCurrentGalleryIndex(newIndex);
                  setSelectedGalleryImage(gallery[newIndex]);
                }}
                className="p-2 sm:p-3 rounded-full bg-gray-500/50 hover:bg-gray-500/70 text-white transition-all duration-200 backdrop-blur-sm"
                aria-label="Следующее изображение"
              >
                <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8" />
              </button>
            </div>
          </div>
        </div>
      )}

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
              <a href="tel:+74992299222" className="mt-2 block text-lg hover:text-amber-400 hover:scale-105 transition-all duration-200"><Phone className="inline w-4 h-4 mr-2" />+7 (499) 229-92-22</a>
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
        className={`md:hidden fixed left-0 top-0 z-50 h-full w-full sm:w-[420px] bg-neutral-950 border-r border-white/10 transform transition-transform duration-300 ${
          menuOpen ? 'translate-x-0' : '-translate-x-full'
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
        className={`hidden md:block fixed right-0 top-0 z-50 h-full w-[420px] bg-neutral-950 border-l border-white/10 transform transition-transform duration-300 ${
          menuOpen ? 'translate-x-0' : 'translate-x-full'
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
        className={`fixed right-0 top-0 z-50 h-full w-full sm:w-[420px] bg-neutral-950 border-l border-white/10 transform transition-transform duration-300 ${
          cartOpen ? 'translate-x-0' : 'translate-x-full'
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
            onClick={() => setDeliveryOpen(true)}
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
        className={`fixed inset-x-0 top-1/2 -translate-y-1/2 z-50 mx-auto w-[94%] max-w-6xl rounded-2xl bg-neutral-950 border border-white/10 transition overflow-hidden ${
          deliveryOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        role="dialog"
        aria-label="Оформление доставки"
      >
        <div className="flex flex-col lg:flex-row h-[90vh] max-h-[800px]">
          {/* Левая часть - форма */}
          <div className="flex-1 p-6 border-r border-white/10 lg:max-w-md">
            <div className="flex items-center justify-between mb-4">
              <div className="text-lg font-semibold">Оформление доставки</div>
              <button onClick={() => setDeliveryOpen(false)} className="p-2 rounded hover:bg-white/5" aria-label="Закрыть">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={submitDelivery} className="grid grid-cols-1 gap-3 h-full overflow-auto">
              <input
                required placeholder="Имя"
                className="bg-black/40 border border-white/10 rounded-lg px-4 py-3 outline-none focus:border-amber-400"
                value={dForm.name}
                onChange={e => setDForm(o => ({ ...o, name: e.target.value }))}
              />
              <input
                required placeholder="Телефон"
                className="bg-black/40 border border-white/10 rounded-lg px-4 py-3 outline-none focus:border-amber-400"
                value={dForm.phone}
                onChange={e => setDForm(o => ({ ...o, phone: e.target.value }))}
              />
              <textarea
                rows={3} placeholder="Комментарий (необязательно)"
                className="bg-black/40 border border-white/10 rounded-lg px-4 py-3 outline-none focus:border-amber-400"
                value={dForm.comment}
                onChange={e => setDForm(o => ({ ...o, comment: e.target.value }))}
              />

              {/* Информация о доставке */}
              {dForm.address && dForm.deliveryPrice !== null && (
                <div className="p-3 rounded-lg border bg-green-900/20 border-green-500/50 text-green-300">
                  <div className="mb-2">
                    <span className="text-sm opacity-75">Адрес:</span>
                    <div className="text-lg font-semibold">{dForm.address}</div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm opacity-75">Стоимость доставки:</span>
                    <span className="text-xl font-bold text-amber-400">
                      {dForm.deliveryPrice === 0 ? 'Бесплатно' : `${dForm.deliveryPrice}₽`}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  id="delivery-privacy-consent"
                  checked={deliveryPrivacyConsent}
                  onChange={(e) => setDeliveryPrivacyConsent(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-white/20 bg-black/40 text-amber-400 focus:ring-amber-400 focus:ring-2"
                  required
                />
                <label htmlFor="delivery-privacy-consent" className="text-xs sm:text-sm text-neutral-300">
                  Оформляя доставку, вы соглашаетесь с{' '}
                  <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300 underline">
                    политикой конфиденциальности
                  </a>
                </label>
              </div>

              {/* Предупреждение о бизнес-ланчах */}
              {validateBusinessLunchOrder.businessLunchCount > 0 && !validateBusinessLunchOrder.isValid && (
                <div className="p-3 bg-amber-400/10 border border-amber-400/20 rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-amber-300 text-sm font-semibold mb-1">Условия заказа бизнес-ланчей</p>
                    <p className="text-amber-200/80 text-xs">{validateBusinessLunchOrder.message}</p>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={items.length === 0 || (validateBusinessLunchOrder.businessLunchCount > 0 && !validateBusinessLunchOrder.isValid) || !dForm.deliveryZone}
                className="mt-4 px-8 py-3 rounded-full bg-amber-400 text-black font-semibold hover:bg-amber-300 hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-lg hover:shadow-xl"
              >
                Отправить заявку в Telegram
              </button>

              <div className="text-sm text-neutral-400 space-y-1">
                <div>Позиций в заказе: <b>{items.reduce((s,i)=>s+i.qty,0)}</b></div>
                <div>Сумма заказа: <b>{total.toLocaleString('ru-RU')} ₽</b></div>
                {dForm.deliveryPrice !== null && dForm.deliveryPrice > 0 && (
                  <div>Доставка: <b>{dForm.deliveryPrice} ₽</b></div>
                )}
                {dForm.deliveryPrice !== null && (
                  <div className="border-t border-white/10 pt-1 mt-2">
                    Итого: <b className="text-amber-400">{(total + (dForm.deliveryPrice || 0)).toLocaleString('ru-RU')} ₽</b>
                  </div>
                )}
              </div>

              {validateBusinessLunchOrder.businessLunchCount > 0 && (
                <div className="text-xs text-amber-400">
                  Бизнес-ланчей в заказе: {validateBusinessLunchOrder.businessLunchCount}
                </div>
              )}
            </form>
          </div>

          {/* Правая часть - карта */}
          <div className="flex-1 min-h-[400px]">
            <DeliveryMap
              onZoneChange={handleDeliveryZoneChange}
              onAddressChange={handleDeliveryAddressChange}
            />
          </div>
        </div>
      </div>
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
    </>
  );
}
