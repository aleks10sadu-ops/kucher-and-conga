// app/api/orders/route.ts — создание заказа доставки в iiko (источник «Сайт»).
// Уведомление в Telegram-группу присылает вебхук iiko после создания заказа,
// поэтому здесь в TG ничего не отправляем.
import { NextResponse, NextRequest } from 'next/server';
import { createSiteDelivery, type SiteOrderItem } from '@/lib/iiko/orders';
import { resolveStreetFromAddress, stripHouse } from '@/lib/iiko/streets';
import { composeAddressDetails } from '@/lib/booking/addressDetails';
import { getStopListProductIds } from '@/lib/iiko/stopList';
import { isBusinessLunchOpen, BUSINESS_LUNCH_WINDOW_TEXT } from '@/lib/menu/businessLunchWindow';
import { validateMinOrder } from '@/lib/delivery/minOrder';
import { isDeliveryOpen, deliveryClosedMessage } from '@/lib/delivery/schedule';
import { logOrderAttempt } from '@/lib/delivery/orderLog';

export const maxDuration = 60; // опрос статуса создания занимает до ~25с

interface IncomingItem {
  id: string | number;
  name: string;
  qty: number;
  price: number;
  productId?: string;
  isBusinessLunch?: boolean;
  modifiers?: { group: string; option: string; groupId?: string; optionId?: string }[];
}

interface IncomingPayload {
  name: string;
  phone: string;
  address: string;
  house?: string;
  building?: string;
  entrance?: string;
  floor?: string;
  apartment?: string;
  intercom?: string;
  coordinates?: number[] | null;
  comment?: string;
  allergy?: string;
  items: IncomingItem[];
  subtotal?: number;
  deliveryPrice?: number | null;
  total?: number;
  zoneName?: string;
  deliveryTime?: 'asap' | 'custom';
  deliveryTimeCustom?: string;
  paymentMethod?: 'card' | 'transfer' | 'cash';
  changeAmount?: string | number;
}

function normalizePhone(raw: string): string {
  const digits = String(raw).replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('8')) return '+7' + digits.slice(1);
  if (digits.length === 11 && digits.startsWith('7')) return '+' + digits;
  if (digits.length === 10) return '+7' + digits;
  return '+' + digits;
}

// Грубый разбор адреса из строки Яндекс-подсказок:
// «Московская область, Дмитров, Промышленная улица, 28, подъезд 1...»
const STREET_RE = /(улица|ул\.|проспект|просп|пер\.|переулок|шоссе|бульвар|наб\.|набережная|проезд|микрорайон|мкр|деревня|село|пос\.|посёлок|поселок)/i;

function parseAddress(full: string) {
  const parts = String(full).split(',').map((s) => s.trim()).filter(Boolean);
  const streetIdx = parts.findIndex((p) => STREET_RE.test(p));
  if (streetIdx === -1) {
    return { full, city: null, street: null, house: null };
  }
  const city = streetIdx > 0 ? parts[streetIdx - 1] : null;
  // в справочнике iiko улицы обычно без слова «улица»: «Промышленная», не «Промышленная улица»
  const street = parts[streetIdx].replace(/\s*(улица|ул\.)\s*/i, ' ').trim() || parts[streetIdx];
  const housePart = parts[streetIdx + 1];
  const house = housePart && /\d/.test(housePart) ? housePart : null;
  return { full, city, street, house };
}

function buildComment(p: IncomingPayload): string {
  const lines: string[] = ['ЗАКАЗ С САЙТА'];
  // Дом не дублируем — он уже в самом адресе; тут только корпус/подъезд/этаж/кв/домофон.
  const details = composeAddressDetails({ ...p, house: null });
  if (details) lines.push(`Детали адреса: ${details}`);
  if (p.deliveryTime === 'custom' && p.deliveryTimeCustom) {
    lines.push(`Время доставки: ${p.deliveryTimeCustom}`);
  } else {
    lines.push('Время доставки: как можно быстрее');
  }
  const pay =
    p.paymentMethod === 'card' ? 'картой при получении'
    : p.paymentMethod === 'transfer' ? 'переводом'
    : p.paymentMethod === 'cash'
      ? `наличными${p.changeAmount && p.changeAmount !== 'no-change' ? ` (сдача с ${p.changeAmount} ₽)` : ' (без сдачи)'}`
      : null;
  if (pay) lines.push(`Оплата: ${pay}`);
  if (p.zoneName) lines.push(`Зона доставки: ${p.zoneName}`);
  if (p.deliveryPrice) lines.push(`Платная доставка: ${p.deliveryPrice} ₽ (добавьте услугу в заказ)`);
  if (p.allergy) lines.push(`⚠️ ${p.allergy}`);
  if (p.comment) lines.push(`Комментарий гостя: ${p.comment}`);
  if (p.total) lines.push(`Итого с доставкой: ${p.total} ₽`);
  return lines.join('\n');
}

export async function POST(req: NextRequest) {
  // Хвост записи журнала — общий для всех исходов этой попытки.
  let logTail: Partial<Parameters<typeof logOrderAttempt>[0]> = {};
  try {
    const p = (await req.json()) as IncomingPayload;
    logTail = {
      name: p.name, phone: p.phone, address: p.address,
      items: (p.items || []).map((it) => ({ name: it.name, qty: it.qty, price: it.price })),
      subtotal: p.subtotal, total: p.total,
    };

    if (!p.phone || !p.address || !Array.isArray(p.items) || p.items.length === 0) {
      await logOrderAttempt({ outcome: 'bad_request', detail: 'phone, address и items обязательны', ...logTail });
      return NextResponse.json({ ok: false, error: 'phone, address и items обязательны' }, { status: 400 });
    }

    // График приёма доставок (МСК): вне окна заказ не принимаем — гость видит
    // расписание на сегодня. Проверка серверная: клиентские часы не важны.
    if (!isDeliveryOpen()) {
      const message = deliveryClosedMessage();
      await logOrderAttempt({ outcome: 'rejected_schedule', detail: message, ...logTail });
      return NextResponse.json(
        { ok: false, error: 'delivery_closed', message },
        { status: 409 },
      );
    }

    // Окно бизнес-ланча: сеты заказывают только Пн–Пт 12:00–16:00 по Москве.
    // Проверяем на сервере — клиент мог держать вкладку открытой с рабочих часов.
    if (p.items.some((it) => it.isBusinessLunch) && !isBusinessLunchOpen()) {
      const message = `Бизнес-ланчи можно заказать только ${BUSINESS_LUNCH_WINDOW_TEXT} (по Москве). Уберите сет из корзины или оформите заказ в рабочие часы.`;
      await logOrderAttempt({ outcome: 'rejected_bl_window', detail: message, ...logTail });
      return NextResponse.json(
        { ok: false, error: 'business_lunch_closed', message },
        { status: 409 },
      );
    }

    // Минимальный заказ: от 1000 ₽ или от 2 бизнес-ланчей (по сумме позиций, без стоимости доставки).
    const minOrder = validateMinOrder(p.items);
    if (!minOrder.isValid) {
      await logOrderAttempt({ outcome: 'rejected_min_order', detail: minOrder.message ?? undefined, ...logTail });
      return NextResponse.json(
        { ok: false, code: 'MIN_ORDER', error: minOrder.message },
        { status: 422 },
      );
    }

    // Стоп-лист: блюда и модификаторы «на стопе» отклоняем ДО создания заказа в iiko.
    // Клиент обязан обработать 409 без TG-фолбэка — иначе стоп-лист обходится.
    const stopped = await getStopListProductIds();
    const blockedNames = p.items
      .filter((it) =>
        (it.productId && stopped.has(String(it.productId))) ||
        (it.modifiers || []).some((m) => m.optionId && stopped.has(String(m.optionId))))
      .map((it) => it.name);
    if (blockedNames.length > 0) {
      await logOrderAttempt({ outcome: 'rejected_stop_list', detail: blockedNames.join(', '), ...logTail });
      return NextResponse.json(
        {
          ok: false,
          error: 'stop_list',
          message: `Увы, уже закончилось: ${blockedNames.join(', ')}. Уберите эти блюда из корзины и оформите заказ снова.`,
          blocked: blockedNames,
        },
        { status: 409 },
      );
    }

    const items: SiteOrderItem[] = [];
    for (const it of p.items) {
      // productId кладут в корзину карточка блюда и конструктор ланчей;
      // для старых позиций (корзина собрана до деплоя) его нет — заказ уйдёт по fallback в TG.
      if (!it.productId) {
        return NextResponse.json(
          { ok: false, error: `позиция «${it.name}» без iiko productId` },
          { status: 422 },
        );
      }
      items.push({
        productId: it.productId,
        amount: it.qty,
        modifiers: (it.modifiers || [])
          .filter((m) => m.optionId && m.groupId && m.optionId !== 'no-bread')
          .map((m) => ({
            productId: m.optionId!,
            // синтетическая группа «Хлеб» из mapMenu имеет префикс bread- поверх реального GUID
            productGroupId: m.groupId!.replace(/^bread-/, ''),
            amount: 1,
          })),
      });
    }

    const [lat, lon] = Array.isArray(p.coordinates) && p.coordinates.length >= 2
      ? p.coordinates
      : [null, null];

    // «к 20:00» → completeBefore для iiko (время ресторана, МСК).
    // datetime-local с сайта приходит без таймзоны — это уже московское время, берём как есть;
    // ISO с зоной (Z/offset) конвертируем в МСК.
    let completeBefore: string | null = null;
    if (p.deliveryTime === 'custom' && p.deliveryTimeCustom) {
      const naive = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::\d{2})?$/.exec(p.deliveryTimeCustom);
      if (naive) {
        completeBefore = `${naive[1]} ${naive[2]}:00.000`;
      } else {
        const d = new Date(p.deliveryTimeCustom);
        if (!isNaN(d.getTime())) {
          const msk = new Date(d.getTime() + 3 * 60 * 60 * 1000);
          completeBefore = msk.toISOString().slice(0, 19).replace('T', ' ') + '.000';
        }
      }
    }

    const parsed = parseAddress(p.address);
    // Резолвим улицу в реальный streetId справочника iiko, чтобы касса показывала
    // название, а не прочерки. Перебираем все части адреса — гость может написать
    // «Промышленная», «Промышленная, дом 20Б» или полную строку из подсказок.
    // Не нашли/ошибка — откат на имя строкой внутри createSiteDelivery.
    const resolved = await resolveStreetFromAddress(p.address, parsed.city);
    const streetName = resolved?.streetName || parsed.street || stripHouse(p.address) || p.address;
    const house = (p.house && p.house.trim()) || parsed.house;

    // Канонический адрес для курьера: каждая деталь ровно один раз.
    const courierAddress = [
      parsed.city || 'Дмитров',
      streetName,
      house ? `д. ${house}` : null,
      composeAddressDetails({ ...p, house: null }) || null,
    ].filter(Boolean).join(', ');

    // line1 для нового формата адресов iiko: город, улица, дом, корпус одной строкой.
    // Подъезд/этаж/кв/домофон сюда НЕ кладём — в city-формате они уходят отдельными полями.
    const line1 = [
      parsed.city || 'Дмитров',
      streetName,
      house ? `д. ${house}` : null,
      p.building?.trim() ? `корп. ${p.building.trim()}` : null,
    ].filter(Boolean).join(', ');

    const { orderId } = await createSiteDelivery({
      phone: normalizePhone(p.phone),
      customerName: p.name || 'Гость сайта',
      comment: buildComment(p),
      completeBefore,
      items,
      address: {
        ...parsed,
        street: streetName,
        streetId: resolved?.streetId ?? null,
        // Явное поле «дом» с формы имеет приоритет над разбором строки адреса.
        house,
        building: p.building?.trim() || null,
        entrance: p.entrance?.trim() || null,
        floor: p.floor?.trim() || null,
        flat: p.apartment?.trim() || null,
        doorphone: p.intercom?.trim() || null,
        // deliveryPoint.comment покажет курьеру полный адрес с деталями.
        full: courierAddress,
        // line1 — весь адрес одной строкой для нового формата адресов iiko.
        line1,
        latitude: lat,
        longitude: lon,
      },
    });

    await logOrderAttempt({ outcome: 'iiko_ok', detail: orderId, ...logTail });
    return NextResponse.json({ ok: true, orderId });
  } catch (e: any) {
    console.error('site order -> iiko failed:', e?.message || e);
    await logOrderAttempt({ outcome: 'iiko_error', detail: String(e?.message || e), ...logTail });
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 502 });
  }
}
