// app/api/orders/route.ts — создание заказа доставки в iiko (источник «Сайт»).
// Уведомление в Telegram-группу присылает вебхук iiko после создания заказа,
// поэтому здесь в TG ничего не отправляем.
import { NextResponse, NextRequest } from 'next/server';
import { createSiteDelivery, type SiteOrderItem } from '@/lib/iiko/orders';

export const maxDuration = 60; // опрос статуса создания занимает до ~25с

interface IncomingItem {
  id: string | number;
  name: string;
  qty: number;
  price: number;
  productId?: string;
  modifiers?: { group: string; option: string; groupId?: string; optionId?: string }[];
}

interface IncomingPayload {
  name: string;
  phone: string;
  address: string;
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
  try {
    const p = (await req.json()) as IncomingPayload;

    if (!p.phone || !p.address || !Array.isArray(p.items) || p.items.length === 0) {
      return NextResponse.json({ ok: false, error: 'phone, address и items обязательны' }, { status: 400 });
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

    const { orderId } = await createSiteDelivery({
      phone: normalizePhone(p.phone),
      customerName: p.name || 'Гость сайта',
      comment: buildComment(p),
      items,
      address: { ...parseAddress(p.address), latitude: lat, longitude: lon },
    });

    return NextResponse.json({ ok: true, orderId });
  } catch (e: any) {
    console.error('site order -> iiko failed:', e?.message || e);
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 502 });
  }
}
