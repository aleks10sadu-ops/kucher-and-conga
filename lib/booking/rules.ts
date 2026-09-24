export type BookingType = 'onsite' | 'preorder' | 'banquet';
export type HallGroup = 'conga' | 'kucher' | 'other';

export type BookingHallPolicy = {
  name: string;
  allowedBookingTypes: readonly BookingType[];
  minimumOrder: number | null;
};

export type MinimumOrderStatus = {
  required: number;
  current: number;
  missing: number;
  satisfied: boolean;
};

export interface BookingRuleInput {
  adults: number;
  children: number;
  eventDate: string; // 'YYYY-MM-DD'
  eventTime: string; // 'HH:mm'
  now: Date;
  hallGroup: HallGroup | null;
  type: BookingType | null;
  cartFoodSum: number; // ₽
  hall?: BookingHallPolicy | null;
  banquetMenuPrice?: number | null;
}

export interface TypeAvailability {
  type: BookingType;
  allowed: boolean;
  reason?: string;
}

export interface BookingValidation {
  availableTypes: TypeAvailability[];
  canSubmit: boolean;
  blocking: string[];
  info: string[];
  minimumOrder: MinimumOrderStatus | null;
}

const MSK_OFFSET_MS = 3 * 60 * 60 * 1000;
const ADULTS_BANQUET_MIN = 6;
const ADULTS_NO_ONSITE = 9;
const ADULTS_BANQUET_ONLY = 12;
const BANQUET_LEAD_DAYS = 2;
const BOOKING_CLOSED_DATES = new Set(['2026-09-01']);
const BOOKING_CLOSED_FROM = '2026-12-18';
const BOOKING_CLOSED_TO = '2027-01-04';
const OCTOBER_HALL_CLOSED_FROM = '2026-10-18';
const OCTOBER_HALL_CLOSED_TO = '2026-10-29';
const OCTOBER_CLOSED_HALLS = new Set(['Барный зал', 'Веранда (Кучер)', 'Морской зал']);
// Минимум предзаказа НА КАЖДОГО ВЗРОСЛОГО (₽). Итоговый минимум = значение × число взрослых.
const PREORDER_MIN: Record<HallGroup, number | null> = { conga: 4000, kucher: 3000, other: null };

const PREORDER_HINT =
  'Предзаказ отправляется администраторам на рассмотрение через набор блюд в корзину на сайте — наберите позиции, и заявка с их составом уйдёт на согласование.';
const ADMIN_CONTACT_PREPAY = 'Для банкета нужна предоплата 10 000 ₽ — свяжется администратор.';
const ADMIN_CONTACT_HALL = 'Для этого зала свяжется администратор.';
const BANQUET_HALL_TYPE_REASON = 'Для этого банкетного зала выберите предзаказ или банкетное меню';

function formatRubles(amount: number): string {
  return String(amount).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export function bookingDateClosureMessage(eventDate: string): string | null {
  if (BOOKING_CLOSED_DATES.has(eventDate)) return '1 сентября бронирование недоступно.';
  if (eventDate >= BOOKING_CLOSED_FROM && eventDate <= BOOKING_CLOSED_TO) {
    return 'С 18 декабря по 4 января бронирование недоступно.';
  }
  return null;
}

export function isBookingDateClosed(eventDate: string): boolean {
  return bookingDateClosureMessage(eventDate) !== null;
}

export function bookingHallClosureMessage(eventDate: string, hallName: string | null | undefined): string | null {
  if (hallName && OCTOBER_CLOSED_HALLS.has(hallName.trim())
    && eventDate >= OCTOBER_HALL_CLOSED_FROM && eventDate <= OCTOBER_HALL_CLOSED_TO) {
    return `${hallName.trim()}: бронирование с 18 по 29 октября недоступно. Выберите другой зал или дату.`;
  }
  return null;
}

export function bookingTimeWindowForDate(eventDate: string): { start: string; end: string } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) return null;
  const [year, month, day] = eventDate.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return { start: date.getDay() === 0 ? '13:00' : '12:00', end: '22:00' };
}

export function isBookingTimeAllowed(eventDate: string, eventTime: string): boolean {
  const window = bookingTimeWindowForDate(eventDate);
  return Boolean(window && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(eventTime) && eventTime >= window.start && eventTime <= window.end);
}

export function classifyHall(hallName: string | null | undefined): HallGroup | null {
  if (!hallName) return null;
  const n = hallName.toLowerCase();
  if (n.includes('conga')) return 'conga';
  if (n.includes('банкет') || n.includes('беседк')) return 'other';
  return 'kucher';
}

export function preorderMinimum(group: HallGroup): number | null {
  return PREORDER_MIN[group];
}

export function banquetPackagesForHall(group: HallGroup | null): 'conga' | 'all' | null {
  if (!group) return null;
  return group === 'conga' ? 'conga' : 'all';
}

function eventDateParts(eventDate: string): { y: number; mo: number; day: number } {
  const [y, mo, day] = eventDate.split('-').map(Number);
  return { y, mo: mo - 1, day };
}

function daysUntilEvent(now: Date, eventDate: string): number {
  const msk = new Date(now.getTime() + MSK_OFFSET_MS);
  const todayUTC = Date.UTC(msk.getUTCFullYear(), msk.getUTCMonth(), msk.getUTCDate());
  const { y, mo, day } = eventDateParts(eventDate);
  const evUTC = Date.UTC(y, mo, day);
  return Math.round((evUTC - todayUTC) / 86400000);
}

function banquetDateEligible(now: Date, eventDate: string): boolean {
  return daysUntilEvent(now, eventDate) >= BANQUET_LEAD_DAYS;
}

export function evaluateBooking(input: BookingRuleInput): BookingValidation {
  const { adults, eventDate, now, hallGroup, type, cartFoodSum, hall, banquetMenuPrice } = input;

  // Доступность предзаказа зависит от числа гостей, банкета — ещё и от даты.
  const onsiteAllowed = adults < ADULTS_NO_ONSITE;
  const preorderAllowed = adults < ADULTS_BANQUET_ONLY;
  const banquetAllowed =
    adults >= ADULTS_BANQUET_MIN && (!eventDate || banquetDateEligible(now, eventDate));

  const onsiteReason = onsiteAllowed
    ? undefined
    : adults >= ADULTS_BANQUET_ONLY
      ? 'От 12 гостей — только банкет'
      : 'От 9 гостей — предзаказ или банкет';
  const preorderReason = preorderAllowed ? undefined : 'От 12 гостей — только банкет';
  const banquetReason = banquetAllowed
    ? undefined
    : adults < ADULTS_BANQUET_MIN
      ? 'Банкет — от 6 гостей'
      : `Банкет оформляется минимум за ${BANQUET_LEAD_DAYS} дня`;

  const typeAvailability = (bookingType: BookingType, allowed: boolean, reason?: string): TypeAvailability => {
    const hallAllowsType = !hall || hall.allowedBookingTypes.includes(bookingType);
    if (hallAllowsType) return { type: bookingType, allowed, reason };

    return {
      type: bookingType,
      allowed: false,
      reason: bookingType === 'onsite'
        ? BANQUET_HALL_TYPE_REASON
        : 'Этот вариант бронирования недоступен для выбранного зала',
    };
  };

  const availableTypes: TypeAvailability[] = [
    typeAvailability('onsite', onsiteAllowed, onsiteReason),
    typeAvailability('preorder', preorderAllowed, preorderReason),
    typeAvailability('banquet', banquetAllowed, banquetReason),
  ];

  const blocking: string[] = [];
  const info: string[] = [];

  if (!type) {
    return { availableTypes, canSubmit: false, blocking, info, minimumOrder: null };
  }

  const selected = availableTypes.find((t) => t.type === type)!;
  if (!selected.allowed) {
    if (selected.reason) blocking.push(selected.reason);
    return { availableTypes, canSubmit: false, blocking, info, minimumOrder: null };
  }

  let canSubmit = true;
  const currentAmount = type === 'preorder'
    ? cartFoodSum
    : type === 'banquet' && banquetMenuPrice
      ? banquetMenuPrice * adults
      : 0;
  const minimumOrder = hall?.minimumOrder == null ? null : {
    required: hall.minimumOrder,
    current: currentAmount,
    missing: Math.max(0, hall.minimumOrder - currentAmount),
    satisfied: currentAmount >= hall.minimumOrder,
  };

  const applyHallMinimum = () => {
    if (!minimumOrder || minimumOrder.satisfied) return;
    blocking.push(
      `Минимальная сумма заказа — ${formatRubles(minimumOrder.required)} ₽. ` +
      `Сейчас: ${formatRubles(minimumOrder.current)} ₽. ` +
      `Не хватает: ${formatRubles(minimumOrder.missing)} ₽.`,
    );
    canSubmit = false;
  };

  if (type === 'onsite') {
    // правил-доменных блокировок нет
  } else if (type === 'preorder') {
    info.push(PREORDER_HINT);
    if (!hallGroup) {
      blocking.push('Выберите зал.');
      canSubmit = false;
    } else if (minimumOrder) {
      applyHallMinimum();
    } else if (cartFoodSum <= 0) {
      blocking.push('Наберите блюда в корзину для предзаказа.');
      canSubmit = false;
    } else {
      const perAdult = preorderMinimum(hallGroup);
      if (perAdult != null) {
        // Минимум предзаказа считается на КАЖДОГО взрослого (дети не учитываются).
        const required = perAdult * Math.max(1, adults);
        if (cartFoodSum < required) {
          blocking.push(
            `Минимум предзаказа для этого зала — ${perAdult} ₽ на каждого взрослого. ` +
            `Для ${adults} взр. это ${required} ₽. Доберите ещё ${required - cartFoodSum} ₽.`,
          );
          canSubmit = false;
        }
      } else {
        info.push(ADMIN_CONTACT_HALL);
      }
    }
    if (canSubmit) {
      info.push(
        `Для подтверждения предзаказа необходимо внести предоплату ${cartFoodSum < 10000 ? '5 000' : '10 000'} ₽ — для этого с вами свяжется администратор.`,
      );
    }
  } else if (type === 'banquet') {
    info.push(ADMIN_CONTACT_PREPAY);
    if (!hallGroup) {
      blocking.push('Выберите зал для банкета.');
      canSubmit = false;
    }
    applyHallMinimum();
  }

  return { availableTypes, canSubmit, blocking, info, minimumOrder };
}
