// app/api/orders/route.ts — создание заказа доставки в iiko (источник «Сайт»).
// Persist the validated notification before contacting the terminal. A worker
// sends it independently, sharing its claim with the iiko webhook and poller.
import { NextResponse, NextRequest } from 'next/server';
import { createSiteOrder, type SiteOrderAddress, type SiteOrderItem } from '@/lib/iiko/orders';
import { resolveStreetFromAddress, stripHouse } from '@/lib/iiko/streets';
import { composeAddressDetails } from '@/lib/booking/addressDetails';
import { getStopListProductIds } from '@/lib/iiko/stopList';
import { checkDeliveryZoneForCoords, findZoneByName } from '@/app/data/deliveryZones';
import { logOrderAttempt } from '@/lib/delivery/orderLog';
import { withoutGarnishForMarkedLunch } from '@/lib/menu/businessLunchModifiers';
import { evaluateAuthoritativeOrderRules, evaluateOrderPreflight } from '@/lib/delivery/orderRules';
import type { FulfillmentType } from '@/lib/delivery/types';
import { SITE } from '@/app/components/forest/site';
import { getIikoMenu } from '@/lib/iiko';
import type { MenuItem } from '@/types/index';
import { randomUUID } from 'node:crypto';
import { createOrderNotifications, formatSiteOrder, UUID } from '@/lib/delivery/orderNotifications.mjs';

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

type IncomingModifier = NonNullable<IncomingItem['modifiers']>[number];

type AuthoritativeItem = IncomingItem & {
  productId: string;
  isBusinessLunch: boolean;
  modifiers: IncomingModifier[];
};

interface IncomingPayload {
  requestId?: string;
  fulfillmentType?: 'delivery' | 'pickup';
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

function resolveAuthoritativeItems(
  incoming: IncomingItem[],
  menu: Record<string, { categories: Array<{ items: MenuItem[] }> }>,
): { ok: true; items: AuthoritativeItem[] } | { ok: false; message: string } {
  const catalog = new Map<string, { item: MenuItem; isBusinessLunch: boolean }>();
  for (const [menuType, section] of Object.entries(menu)) {
    for (const category of section.categories || []) {
      for (const item of category.items || []) {
        catalog.set(String(item.id), { item, isBusinessLunch: menuType === 'business' });
      }
    }
  }

  const items: AuthoritativeItem[] = [];
  for (const candidate of incoming) {
    const productId = typeof candidate?.productId === 'string' ? candidate.productId.trim() : '';
    const catalogEntry = productId ? catalog.get(productId) : null;
    if (!catalogEntry) {
      return { ok: false, message: `Позиция «${candidate?.name || 'без названия'}» отсутствует в актуальном меню.` };
    }

    const basePrice = Number(catalogEntry.item.price);
    if (!Number.isFinite(basePrice) || basePrice < 0) {
      return { ok: false, message: `Для позиции «${catalogEntry.item.name}» не удалось определить актуальную цену.` };
    }

    if (candidate.modifiers != null && !Array.isArray(candidate.modifiers)) {
      return { ok: false, message: `Некорректные модификаторы позиции «${catalogEntry.item.name}».` };
    }
    const groups = catalogEntry.item.modifierGroups || [];
    const mappedModifiers: Array<IncomingModifier & { price: number }> = [];
    const selectedKeys = new Set<string>();
    for (const modifier of candidate.modifiers || []) {
      const groupId = typeof modifier?.groupId === 'string' ? modifier.groupId.trim() : '';
      const optionId = typeof modifier?.optionId === 'string' ? modifier.optionId.trim() : '';
      const group = groups.find((entry) => String(entry.id) === groupId);
      const option = group?.options.find((entry) => String(entry.id) === optionId);
      const key = `${groupId}:${optionId}`;
      if (!group || !option || selectedKeys.has(key)) {
        return { ok: false, message: `Модификаторы позиции «${catalogEntry.item.name}» устарели или некорректны.` };
      }
      selectedKeys.add(key);
      mappedModifiers.push({
        group: group.name,
        option: option.name,
        groupId: String(group.id),
        optionId: String(option.id),
        price: Number(option.price) || 0,
      });
    }

    const modifiers = withoutGarnishForMarkedLunch(mappedModifiers, catalogEntry.isBusinessLunch);
    const garnishWasDisabled = modifiers.length !== mappedModifiers.length;
    for (const group of groups) {
      if (garnishWasDisabled && group.name.toLocaleLowerCase('ru-RU').includes('гарнир')) continue;
      const selectedCount = modifiers.filter((modifier) => modifier.groupId === String(group.id)).length;
      if (selectedCount < (group.min ?? 0) || selectedCount > (group.max ?? 1)) {
        return { ok: false, message: `Выберите допустимые модификаторы для позиции «${catalogEntry.item.name}».` };
      }
    }

    const unitPrice = basePrice + modifiers.reduce((sum, modifier) => sum + modifier.price, 0);
    if (!Number.isFinite(candidate.price) || candidate.price !== unitPrice) {
      return { ok: false, message: `Цена позиции «${catalogEntry.item.name}» изменилась. Обновите меню и корзину.` };
    }

    items.push({
      ...candidate,
      id: productId,
      name: catalogEntry.item.name,
      productId,
      price: unitPrice,
      isBusinessLunch: catalogEntry.isBusinessLunch,
      modifiers: modifiers.map(({ price: _price, ...modifier }) => modifier),
    });
  }
  return { ok: true, items };
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

function buildComment(p: IncomingPayload, fulfillmentType: FulfillmentType): string {
  const fulfillmentLabel = fulfillmentType === 'pickup' ? 'Самовывоз' : 'Доставка';
  const lines: string[] = ['ЗАКАЗ С САЙТА', `Способ получения: ${fulfillmentLabel}`];
  // Дом не дублируем — он уже в самом адресе; тут только корпус/подъезд/этаж/кв/домофон.
  const details = fulfillmentType === 'delivery' ? composeAddressDetails({ ...p, house: null }) : '';
  if (details) lines.push(`Детали адреса: ${details}`);
  const timingSubject = fulfillmentType === 'pickup' ? 'самовывоза' : 'доставки';
  if (p.deliveryTime === 'custom' && p.deliveryTimeCustom) {
    const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(p.deliveryTimeCustom);
    const formattedTime = match
      ? `${match[3]}.${match[2]}.${match[1]} в ${match[4]}:${match[5]}`
      : p.deliveryTimeCustom;
    lines.push(`Время ${timingSubject}: ${formattedTime}`);
  } else {
    lines.push(`Время ${timingSubject}: как можно быстрее`);
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
  if (p.total) {
    lines.push(fulfillmentType === 'pickup' ? `Итого: ${p.total} ₽` : `Итого с доставкой: ${p.total} ₽`);
  }
  return lines.join('\n');
}

export async function POST(req: NextRequest) {
  // Хвост записи журнала — общий для всех исходов этой попытки.
  let logTail: Partial<Parameters<typeof logOrderAttempt>[0]> = {};
  let acceptedOrderId: string | undefined;
  try {
    const p = (await req.json()) as IncomingPayload;
    if (p.requestId !== undefined && !UUID.test(p.requestId)) {
      return NextResponse.json({ ok: false, error: 'invalid_request_id' }, { status: 400 });
    }
    logTail = { name: p.name, phone: p.phone, address: p.address };

    if (!p.phone || !Array.isArray(p.items) || p.items.length === 0) {
      await logOrderAttempt({ outcome: 'bad_request', detail: 'phone и items обязательны', ...logTail });
      return NextResponse.json({ ok: false, error: 'phone и items обязательны' }, { status: 400 });
    }

    if (p.items.some((item) => !item || !Number.isSafeInteger(item.qty) || item.qty <= 0)) {
      await logOrderAttempt({ outcome: 'bad_request', detail: 'Количество позиций должно быть целым положительным числом.', ...logTail });
      return NextResponse.json(
        { ok: false, error: 'invalid_items', message: 'Количество каждой позиции должно быть целым положительным числом.' },
        { status: 422 },
      );
    }

    const preflight = evaluateOrderPreflight({
      fulfillmentType: p.fulfillmentType,
      address: p.address,
      deliveryTime: p.deliveryTime,
      deliveryTimeCustom: p.deliveryTimeCustom,
    });
    if (!preflight.ok) {
      await logOrderAttempt({
        outcome: preflight.status === 409 ? 'rejected_schedule' : 'bad_request',
        detail: preflight.message,
        ...logTail,
      });
      return NextResponse.json(
        { ok: false, error: preflight.error, message: preflight.message },
        { status: preflight.status },
      );
    }

    let authoritative: ReturnType<typeof resolveAuthoritativeItems>;
    try {
      authoritative = resolveAuthoritativeItems(p.items, await getIikoMenu());
    } catch (error) {
      const detail = `authoritative menu unavailable: ${String((error as Error)?.message || error)}`;
      console.error(detail);
      await logOrderAttempt({ outcome: 'iiko_error', detail, ...logTail });
      return NextResponse.json(
        {
          ok: false,
          error: 'menu_unavailable',
          message: 'Не удалось проверить актуальные цены меню. Обновите страницу и повторите заказ.',
        },
        { status: 409 },
      );
    }
    if (!authoritative.ok) {
      await logOrderAttempt({ outcome: 'bad_request', detail: authoritative.message, ...logTail });
      return NextResponse.json(
        { ok: false, error: 'invalid_items', message: authoritative.message },
        { status: 422 },
      );
    }
    const authoritativeItems = authoritative.items;

    const zone = preflight.fulfillmentType === 'pickup'
      ? null
      : ((Array.isArray(p.coordinates) && p.coordinates.length === 2
          ? checkDeliveryZoneForCoords(p.coordinates)
          : null) ?? findZoneByName(p.zoneName));
    if (preflight.fulfillmentType === 'delivery' && !zone) {
      const message = 'Не удалось определить зону доставки. Уточните адрес или выберите точку на карте.';
      await logOrderAttempt({ outcome: 'bad_request', detail: message, ...logTail });
      return NextResponse.json(
        { ok: false, error: 'delivery_zone_unknown', message },
        { status: 422 },
      );
    }
    const serverSubtotal = authoritativeItems.reduce((sum, item) => sum + item.price * item.qty, 0);
    const serverDeliveryPrice = preflight.fulfillmentType === 'pickup' ? 0 : (zone?.price ?? 0);
    logTail = {
      ...logTail,
      address: preflight.fulfillmentType === 'pickup' ? `Самовывоз: ${SITE.address}` : p.address,
      items: authoritativeItems.map((it) => ({ name: it.name, qty: it.qty, price: it.price })),
      subtotal: serverSubtotal,
      total: serverSubtotal + serverDeliveryPrice,
    };

    const rules = evaluateAuthoritativeOrderRules({
      preflight,
      items: authoritativeItems,
      zone,
    });
    if (!rules.ok) {
      await logOrderAttempt({
        outcome: rules.error === 'MIN_ORDER'
          ? 'rejected_min_order'
          : rules.error === 'business_lunch_closed'
            ? 'rejected_bl_window'
            : rules.status === 409
              ? 'rejected_schedule'
              : 'bad_request',
        detail: rules.message,
        ...logTail,
      });
      return NextResponse.json(
        {
          ok: false,
          code: rules.error === 'MIN_ORDER' ? 'MIN_ORDER' : undefined,
          error: rules.error,
          message: rules.message,
        },
        { status: rules.status },
      );
    }

    const normalizedPayload: IncomingPayload = {
      ...p,
      items: authoritativeItems,
      subtotal: serverSubtotal,
      deliveryPrice: rules.fulfillmentType === 'delivery' ? (zone?.price ?? 0) : 0,
      total: serverSubtotal + (rules.fulfillmentType === 'delivery' ? (zone?.price ?? 0) : 0),
      zoneName: rules.fulfillmentType === 'delivery' ? zone?.name : undefined,
    };

    // Сервер повторяет правило конструктора: если выбранное блюдо бизнес-ланча
    // отмечено «Без гарнира», старый/подменённый выбор гарнира не должен попасть
    // ни в проверку стоп-листа, ни в заказ iiko.
    const orderItems = authoritativeItems;

    // Стоп-лист: блюда и модификаторы «на стопе» отклоняем ДО создания заказа в iiko.
    // Клиент обязан обработать 409 без TG-фолбэка — иначе стоп-лист обходится.
    const stopped = await getStopListProductIds();
    const blockedNames = orderItems
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
    for (const it of orderItems) {
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

    const orderId = p.requestId || randomUUID();
    const notifications = createOrderNotifications(process.env);
    const saved = await notifications.reserve(orderId, formatSiteOrder({
      ...normalizedPayload,
      fulfillmentType: rules.fulfillmentType,
      phone: normalizePhone(p.phone),
      address: rules.fulfillmentType === 'pickup' ? SITE.address : p.address,
      orderComment: buildComment(normalizedPayload, rules.fulfillmentType),
    }, orderId));
    acceptedOrderId = orderId;
    // A retry (including the browser's network fallback) must not create a
    // second iiko order. Reject reuse with a different payload in reserve().
    if (!saved.created) return NextResponse.json({ ok: true, orderId, creationStatus: 'InProgress' });

    let courierIikoAddress: SiteOrderAddress | undefined;
    if (rules.fulfillmentType === 'delivery') {
      const [lat, lon] = Array.isArray(p.coordinates) && p.coordinates.length >= 2
        ? p.coordinates
        : [null, null];
      const parsed = parseAddress(p.address);
      // Не нашли/ошибка — откат на имя строкой внутри createSiteOrder.
      const resolved = await resolveStreetFromAddress(p.address, parsed.city);
      const streetName = resolved?.streetName || parsed.street || stripHouse(p.address) || p.address;
      const house = (p.house && p.house.trim()) || parsed.house;
      const courierAddress = [
        parsed.city || 'Дмитров',
        streetName,
        house ? `д. ${house}` : null,
        composeAddressDetails({ ...p, house: null }) || null,
      ].filter(Boolean).join(', ');
      const line1 = [
        parsed.city || 'Дмитров',
        streetName,
        house ? `д. ${house}` : null,
        p.building?.trim() ? `корп. ${p.building.trim()}` : null,
      ].filter(Boolean).join(', ');
      courierIikoAddress = {
        ...parsed,
        street: streetName,
        streetId: resolved?.streetId ?? null,
        house,
        building: p.building?.trim() || null,
        entrance: p.entrance?.trim() || null,
        floor: p.floor?.trim() || null,
        flat: p.apartment?.trim() || null,
        doorphone: p.intercom?.trim() || null,
        full: courierAddress,
        line1,
        latitude: lat,
        longitude: lon,
      };
    }

    const created = await createSiteOrder({
      orderId,
      fulfillmentType: rules.fulfillmentType,
      phone: normalizePhone(p.phone),
      customerName: p.name || 'Гость сайта',
      comment: buildComment(normalizedPayload, rules.fulfillmentType),
      completeBefore: rules.completeBefore,
      items,
      ...(rules.fulfillmentType === 'delivery' ? { address: courierIikoAddress! } : {}),
    });

    await logOrderAttempt({ outcome: created.creationStatus === 'InProgress' ? 'iiko_pending' : 'iiko_ok', detail: orderId, ...logTail });
    return NextResponse.json({ ok: true, orderId, creationStatus: created.creationStatus });
  } catch (e: any) {
    console.error('site order -> iiko failed:', e?.message || e);
    await logOrderAttempt({ outcome: 'iiko_error', detail: String(e?.message || e), ...logTail });
    if (acceptedOrderId) {
      // The full validated card is durably queued even if this best-effort
      // status update fails. The worker checks the same iiko ID afterwards.
      try { await createOrderNotifications(process.env).db(`?id=eq.${acceptedOrderId}&last_status=eq.CreationPending`, 'PATCH', { last_status: 'CreationError' }); }
      catch { console.error('Could not mark terminal creation error:', acceptedOrderId); }
      return NextResponse.json({ ok: true, orderId: acceptedOrderId, creationStatus: 'InProgress' });
    }
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 502 });
  }
}
