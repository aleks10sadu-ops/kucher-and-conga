import { describe, it, expect } from 'vitest';
import { formatBookingTelegram } from './formatTelegram';

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
    expect(msg).toMatch(/2026-07-01 18:00/);
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
      banquetPackageName: 'Пакет < Люкс >',
      comment: 'стол < 5 & окно',
    });
    // Escaped sequences must appear
    expect(msg).toContain('&lt;script&gt;');
    expect(msg).toContain('Иванов&amp;сын');
    expect(msg).toContain('Conga &amp; Кучер');
    expect(msg).toContain('Пакет &lt; Люкс &gt;');
    expect(msg).toContain('стол &lt; 5 &amp; окно');
    // Raw user-supplied < and & must NOT appear in user-value positions
    // (static labels like "🍽 Новая заявка" are fine — just check the dynamic parts)
    expect(msg).not.toContain('<script>');
    expect(msg).not.toContain('стол < 5');
  });
});
