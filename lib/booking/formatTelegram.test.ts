import { describe, it, expect } from 'vitest';
import { formatBookingTelegram, formatBookingTelegramMessages, type TelegramBookingInput } from './formatTelegram';
import { BANQUET_PACKAGES } from './banquetPackages';

const booking: TelegramBookingInput = {
  firstName: 'Анна', lastName: 'Иванова', phone: '+79991112233',
  date: '2026-09-18', time: '17:00', adults: 4, children: 2,
  bookingType: 'onsite', hallName: 'Изумрудный зал',
  cartItems: [], cartFoodSum: 0, mode: 'self',
};

const copyBlock = (message: string) => message.match(/<pre>([\s\S]*?)<\/pre>/)?.[1];
const decode = (text: string) => text
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

describe('booking copy block', () => {
  it('includes guest identity and phone, making the reported short request long enough without padding', () => {
    const message = formatBookingTelegram({ ...booking, mode: 'admin', adults: 2, time: '20:00', comment: 'НЕ БРОНИРОВАТЬ - ТЕСТ' });
    const text = 'Гость: Иванова Анна; Тел: +79991112233; ВЗР 2 ДЕТ 2 На 20:00 Комм: НЕ БРОНИРОВАТЬ - ТЕСТ; Тип заказа: Уточнить';
    expect(text.length).toBeGreaterThanOrEqual(76);
    expect(copyBlock(message)).toBe(text);
  });

  it.each([75, 76, 77, 300])('pads based on decoded text, preserving a %i-character original', (length) => {
    const shortBooking = { ...booking, firstName: 'Я', lastName: '', phone: '1' };
    const emptyComment = copyBlock(formatBookingTelegram({ ...shortBooking, comment: '' }))!.trimEnd();
    const comment = '<&>🎂' + 'я'.repeat(length - emptyComment.length + 1 - 5);
    const text = decode(copyBlock(formatBookingTelegram({ ...shortBooking, comment }))!);
    expect(text.trimEnd().length).toBe(length);
    expect(text.length).toBe(Math.max(length, 76));
    expect(text.slice(length)).toBe('\u00a0'.repeat(Math.max(0, 76 - length)));
  });

  it('keeps all supplied name parts and phone, flattening whitespace and escaping HTML', () => {
    const message = formatBookingTelegram({
      ...booking, lastName: ' Иванов<&> ', firstName: 'Иван\nИванович', phone: '+7\t999 111-22-33',
    });
    expect(copyBlock(message)).toContain('Гость: Иванов&lt;&amp;&gt; Иван Иванович; Тел: +7 999 111-22-33; ВЗР');
    expect(copyBlock(message)).not.toContain('\n');
    expect(copyBlock(message)).not.toContain('Изумрудный зал');
  });

  it('preserves the main request and hall, changes only the date display, and appends one compact block', () => {
    expect(formatBookingTelegram(booking)).toBe([
      '🍽 Новая заявка на бронь',
      'Гость: Иванова Анна',
      'Телефон: +79991112233',
      'Когда: 17:00 18.09.26',
      'Взрослых: 4',
      'Детей: 2',
      'Зал: Изумрудный зал',
      'Тип: Заказ по факту',
      'Для Excel:',
      `<pre>${'Гость: Иванова Анна; Тел: +79991112233; ВЗР 4 ДЕТ 2 На 17:00 Комм: —; Тип заказа: По факту'.padEnd(76, '\u00a0')}</pre>`,
    ].join('\n'));
    expect(formatBookingTelegramMessages(booking)).toEqual([formatBookingTelegram(booking)]);
  });

  it.each(BANQUET_PACKAGES)('copies $name with all its selected salads', (menu) => {
    const salads = menu.salads.slice(0, menu.requiredSalads).map((salad) => salad.name);
    const message = formatBookingTelegram({
      ...booking, bookingType: 'banquet', banquetMenuName: menu.name, banquetSaladNames: salads,
    });
    expect(copyBlock(message)).toBe(
      `Гость: Иванова Анна; Тел: +79991112233; ВЗР 4 ДЕТ 2 На 17:00 Комм: —; Тип заказа: БМ: ${menu.venue === 'conga' ? 'Conga' : 'Кучер'} ${menu.pricePerPerson} ₽/чел; Салаты: ${salads.join(', ')}`,
    );
    expect(message).toContain(`Банкетное меню: ${menu.name}`);
  });

  it('copies preorder quantities and visible dish options, without prices or the hall', () => {
    const message = formatBookingTelegram({
      ...booking, bookingType: 'preorder', cartFoodSum: 3300,
      cartItems: [
        { name: 'Стейк', qty: 2, price: 1500, modifiers: [
          { group: 'Прожарка', option: 'Medium' }, { group: 'Хлеб', option: 'Без хлеба' },
        ] },
        { name: 'Картофель фри', qty: 1, price: 300 },
      ],
    });
    expect(copyBlock(message)).toBe('Гость: Иванова Анна; Тел: +79991112233; ВЗР 4 ДЕТ 2 На 17:00 Комм: —; Тип заказа: ПЗ: Стейк × 2 (Прожарка: Medium), Картофель фри × 1');
    expect(message).toContain('Стейк × 2 — 3000 ₽');
    expect(message).toContain('Зал: Изумрудный зал');
  });

  it('uses Уточнить in admin mode even if stale menu data is present', () => {
    const message = formatBookingTelegram({
      ...booking, mode: 'admin', bookingType: 'banquet', hallName: null,
      banquetMenuName: 'Старое меню', banquetSaladNames: ['Старый салат'],
    });
    expect(copyBlock(message)).toBe('Гость: Иванова Анна; Тел: +79991112233; ВЗР 4 ДЕТ 2 На 17:00 Комм: —; Тип заказа: Уточнить'.padEnd(76, '\u00a0'));
    expect(message).toContain('Режим: Связаться с администратором');
    expect(message).not.toContain('Зал:');
    expect(message).not.toContain('Старое меню');
  });

  it('flattens comments only in the copy block and escapes HTML without losing text', () => {
    const message = formatBookingTelegram({
      ...booking, children: 0, comment: '  Стол <окна> & торт\r\nБез\tорехов </pre>  ',
    });
    expect(copyBlock(message)).toBe('Гость: Иванова Анна; Тел: +79991112233; ВЗР 4 ДЕТ 0 На 17:00 Комм: Стол &lt;окна&gt; &amp; торт Без орехов &lt;/pre&gt;; Тип заказа: По факту');
    expect(message).toContain('торт\r\nБез\tорехов');
    expect(message.match(/<pre>/g)).toHaveLength(1);
  });

  it('retains the original date if it is not ISO formatted', () => {
    expect(formatBookingTelegram({ ...booking, date: '18.09.26' })).toContain('Когда: 17:00 18.09.26');
  });

  it('sends a large preorder copy block separately without truncating the dishes', () => {
    const input = {
      ...booking, bookingType: 'preorder' as const,
      cartItems: Array.from({ length: 45 }, (_, index) => ({ name: `Блюдо ${index} с длинным названием`, qty: 2, price: 500 })),
      comment: 'Пожелания гостя. '.repeat(40),
    };
    const messages = formatBookingTelegramMessages(input);
    expect(messages).toHaveLength(2);
    expect(messages[0]).toContain('Зал: Изумрудный зал');
    expect(messages[1]).toBe(`Для Excel:\n<pre>${copyBlock(formatBookingTelegram(input))}</pre>`);
    for (const message of messages) {
      expect(decode(message.replace(/<\/?pre>/g, '')).length).toBeLessThanOrEqual(4096);
    }
  });

  it('splits extremely long text with intact HTML entities and emoji and no lost content', () => {
    const input = { ...booking, comment: '<&>🎂'.repeat(1800) };
    const messages = formatBookingTelegramMessages(input);
    const detailMessages = messages.filter((message) => !message.includes('<pre>'));
    const copyMessages = messages.filter((message) => message.includes('<pre>'));
    expect(detailMessages.join('')).toBe(formatBookingTelegram(input).split('\nДля Excel:\n')[0]);
    expect(copyMessages.map(copyBlock).join('')).toBe(copyBlock(formatBookingTelegram(input)));
    for (const message of messages) {
      const decoded = decode(message.replace(/<\/?pre>/g, ''));
      expect(decoded.length).toBeLessThanOrEqual(4096);
      expect(decoded).not.toMatch(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/);
    }
  });
});

describe('formatBookingTelegram', () => {
  it('renders a full preorder request', () => {
    const msg = formatBookingTelegram({
      firstName: 'Иван', lastName: 'Петров', phone: '+7 999 000-00-00',
      date: '2026-07-01', time: '18:00',
      adults: 10, children: 1, bookingType: 'preorder', hallName: 'Conga',
      cartItems: [{ name: 'Стейк', qty: 2, price: 1500 }],
      cartFoodSum: 3000, comment: 'Большой стол',
    });
    expect(msg).toMatch(/Петров Иван/);
    expect(msg).toMatch(/\+7 999 000-00-00/);
    expect(msg).toContain('Когда: 18:00 01.07.26');
    expect(msg).toMatch(/Взрослых: 10/);
    expect(msg).toMatch(/Детей: 1/);
    expect(msg).toMatch(/Предзаказ/);
    expect(msg).toMatch(/Стейк × 2/);
    expect(msg).toMatch(/3000/);
  });

  it('escapes HTML special chars in user-provided values', () => {
    const msg = formatBookingTelegram({
      firstName: 'Анна<script>', lastName: 'Иванов&сын', phone: '+7 999 111-22-33',
      date: '2026-08-01', time: '19:00',
      adults: 2, children: 0, bookingType: 'banquet',
      hallName: 'Conga & Кучер',
      cartItems: [],
      cartFoodSum: 0,
      banquetMenuName: 'Меню < Люкс >',
      banquetSaladNames: ['Кучер & Ко', 'Салат <Особый>'],
      source: 'страница <зала> & меню',
      comment: 'стол < 5 & окно',
    });
    // Escaped sequences must appear
    expect(msg).toContain('&lt;script&gt;');
    expect(msg).toContain('Иванов&amp;сын');
    expect(msg).toContain('Conga &amp; Кучер');
    expect(msg).toContain('Меню &lt; Люкс &gt;');
    expect(msg).toContain('Кучер &amp; Ко, Салат &lt;Особый&gt;');
    expect(msg).toContain('страница &lt;зала&gt; &amp; меню');
    expect(msg).toContain('стол &lt; 5 &amp; окно');
    // Raw user-supplied < and & must NOT appear in user-value positions
    // (static labels like "🍽 Новая заявка" are fine — just check the dynamic parts)
    expect(msg).not.toContain('<script>');
    expect(msg).not.toContain('стол < 5');
  });

  it('renders structured banquet context without package wording', () => {
    const msg = formatBookingTelegram({
      firstName: 'Анна', lastName: 'Иванова', phone: '+7 999 111-22-33',
      date: '2026-08-01', time: '19:00',
      adults: 12,
      children: 4,
      bookingType: 'banquet',
      hallName: 'Изумрудный зал',
      cartItems: [],
      cartFoodSum: 0,
      banquetMenuName: 'Conga — банкетное меню 6000 ₽/чел',
      banquetSaladNames: ['Цезарь с креветками', 'Кучер', 'Оливье с говядиной'],
      calculatedAmount: 72000,
      minimumOrder: 70000,
      source: 'страница зала',
    });

    expect(msg).toContain('Тип: Банкетное меню');
    expect(msg).toContain('Зал: Изумрудный зал');
    expect(msg).toContain('Банкетное меню: Conga — банкетное меню 6000 ₽/чел');
    expect(msg).toContain('Салаты: Цезарь с креветками, Кучер, Оливье с говядиной');
    expect(msg).toContain('Расчётная сумма: 72 000 ₽');
    expect(msg).toContain('Минимальная сумма зала: 70 000 ₽');
    expect(msg).toContain('Источник: страница зала');
    expect(msg).not.toMatch(/банкетный пакет/i);
  });

  it('renders and escapes a contextual promotion ref on one source line', () => {
    const msg = formatBookingTelegram({
      firstName: 'Анна', lastName: 'Иванова', phone: '+7 999 111-22-33',
      date: '2026-08-01', time: '19:00',
      adults: 2, children: 0, bookingType: 'onsite', hallName: null,
      cartItems: [], cartFoodSum: 0,
      source: 'раздел «Акции»',
      sourceRef: '<promotions&summer>',
    });

    expect(msg).toContain('Источник: раздел «Акции» — &lt;promotions&amp;summer&gt;');
    expect(msg.match(/^Источник:/gm)).toHaveLength(1);
    expect(msg).not.toContain('<promotions&summer>');
  });
});

describe('formatBookingTelegram modifiers & mode', () => {
  it('renders modifier sub-bullets under a preorder item', () => {
    const msg = formatBookingTelegram({
      firstName: 'Иван', lastName: 'Петров', phone: '+7 999 000-00-00',
      date: '2026-07-01', time: '18:00',
      adults: 2, children: 0, bookingType: 'preorder', hallName: 'Conga',
      cartItems: [{ name: 'Стейк', qty: 1, price: 1500, modifiers: [
        { group: 'Гарнир', option: 'Пюре' },
        { group: 'Хлеб', option: 'Без хлеба' },
      ] }],
      cartFoodSum: 1500,
    });
    expect(msg).toMatch(/Стейк × 1/);
    expect(msg).toMatch(/Гарнир: Пюре/);
    // «Без хлеба» скрыто
    expect(msg).not.toMatch(/Без хлеба/);
  });

  it('shows admin mode label', () => {
    const msg = formatBookingTelegram({
      firstName: 'Анна', lastName: 'И', phone: '+7 999 000-00-00',
      date: '2026-07-01', time: '18:00',
      adults: 2, children: 0, bookingType: 'onsite', hallName: 'Conga',
      cartItems: [], cartFoodSum: 0, mode: 'admin',
    });
    expect(msg).toMatch(/Режим: Связаться с администратором/);
  });
});
