import { NextResponse, NextRequest } from 'next/server';
import { formatBookingTelegramMessages } from '@/lib/booking/formatTelegram';
import { bookingHallClosureMessage } from '@/lib/booking/rules';
import { getStopListProductIds } from '@/lib/iiko/stopList';
import { POST as submitOrder } from '@/app/api/orders/route';
import { buildMessage, type TelegramPayload } from '@/lib/delivery/formatTelegram';
const TG_API = (token: string) => `https://api.telegram.org/bot${token}/sendMessage`;
export async function POST(req: NextRequest) {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token || !process.env.TELEGRAM_CHAT_ID) {
      return NextResponse.json({ ok: false, error: 'Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID' }, { status: 500 });
    }

    const payload = await req.json() as TelegramPayload;
    if (payload.type === 'delivery') {
      return submitOrder(new NextRequest(new URL('/api/orders', req.url), {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      }));
    }

    if (payload.type === 'booking') {
      const hallClosureMessage = bookingHallClosureMessage(payload.date, payload.hallName);
      if (hallClosureMessage) {
        return NextResponse.json({ ok: false, error: 'hall_closed', message: hallClosureMessage }, { status: 409 });
      }
    }

    // Стоп-лист для предзаказа к брони: блюда «на стопе» отклоняем до отправки заявки.
    // (Доставки сюда попадают только TG-фолбэком после /api/orders, где проверка уже была.)
    if (payload.type === 'booking' && payload.bookingType === 'preorder' && Array.isArray(payload.cartItems)) {
      const stopped = await getStopListProductIds();
      const blocked = payload.cartItems
        .filter((it) => it.productId && stopped.has(String(it.productId)))
        .map((it) => it.name);
      if (blocked.length > 0) {
        return NextResponse.json(
          {
            ok: false,
            error: 'stop_list',
            message: `Увы, уже закончилось: ${blocked.join(', ')}. Уберите эти блюда из предзаказа и отправьте заявку снова.`,
            blocked,
          },
          { status: 409 },
        );
      }
    }

    // Брони — в отдельную группу, чтобы доставщики не видели лишнего;
    // доставки (fallback при недоступной iiko) — в общую группу доставок.
    const chatId = payload.type === 'booking'
      ? (process.env.TELEGRAM_BOOKING_CHAT_ID || process.env.TELEGRAM_CHAT_ID)
      : process.env.TELEGRAM_CHAT_ID;
    const messages = payload.type === 'booking'
      ? formatBookingTelegramMessages(payload)
      : [buildMessage(payload)];
    let data: { ok: boolean; description?: string; result?: { message_id: number } } = { ok: false };
    let firstMessageId: number | undefined;
    for (const text of messages) {
      const res = await fetch(TG_API(token), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
          ...(firstMessageId ? { reply_parameters: { message_id: firstMessageId } } : {}),
        }),
      });
      data = await res.json();
      if (!data.ok) break;
      firstMessageId ??= data.result?.message_id;
    }
    if (!data.ok) {
      return NextResponse.json({ ok: false, error: data.description || 'Telegram API error' }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
