import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import ForestScene, { SectionsMenuLinks } from './ForestBloom';

describe('ForestBloom sections menu', () => {
    it('renders a link to the FAQ page', () => {
        const html = renderToStaticMarkup(
            React.createElement(SectionsMenuLinks, { onNavigate: () => undefined }),
        );

        expect(html).toContain('href="/faq"');
        expect(html).toContain('Вопросы и ответы');
    });

    it('separates the paper menu from the delivery order section', () => {
        const html = renderToStaticMarkup(
            React.createElement(SectionsMenuLinks, { onNavigate: () => undefined }),
        );

        expect(html).toContain('href="/menu#main"');
        expect(html).toContain('href="/menu#delivery"');
    });

    it('names the local restaurant intent in the visible page heading', () => {
        const html = renderToStaticMarkup(React.createElement(ForestScene));

        expect(html).toMatch(/<h1[^>]*>Ресторан в Дмитрове,[\s\S]*где лес растёт с[^<]*потолка<\/h1>/);
    });

    it('uses the controlled restaurant map instead of an advertising map iframe', () => {
        const html = renderToStaticMarkup(React.createElement(ForestScene));

        expect(html).toContain('aria-label="Интерактивная карта расположения ресторана Кучер и Конга"');
        expect(html).toContain('Построить маршрут');
        expect(html).not.toContain('map-widget/v1');
    });

    it('shows branded five-star guest reviews instead of the Yandex iframe', () => {
        const html = renderToStaticMarkup(React.createElement(ForestScene));

        expect(html).toContain('aria-label="Пятизвёздочные отзывы гостей"');
        expect(html).toContain('Рейтинг гостей на Яндекс Картах');
        expect(html.match(/aria-label="5 из 5"/g)).toHaveLength(4);
        expect(html).not.toContain('maps-reviews-widget');
    });
});
