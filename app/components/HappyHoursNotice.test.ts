import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import HappyHoursNotice from './HappyHoursNotice';

describe('HappyHoursNotice', () => {
    it.each(['pickup', 'booking'] as const)('shows the offer without exposing timer boundaries for %s', (context) => {
        const html = renderToStaticMarkup(React.createElement(HappyHoursNotice, { context }));

        expect(html).toContain('Сейчас действуют Счастливые часы');
        expect(html).not.toContain('15:59');
        expect(html).not.toContain('16:00');
    });
});
