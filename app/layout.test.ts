import React from 'react';
import vm from 'node:vm';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/font/google', () => ({
    Vollkorn: () => ({ variable: '--font-display' }),
    Golos_Text: () => ({ variable: '--font-body' }),
}));

import RootLayout, { metadata, YANDEX_METRIKA_SCRIPT } from './layout';

function findJsonLd(node: React.ReactNode): string[] {
    if (!React.isValidElement(node)) return [];

    const element = node as React.ReactElement<{
        children?: React.ReactNode;
        type?: string;
        dangerouslySetInnerHTML?: { __html: string };
    }>;
    const own =
        element.type === 'script' && element.props.type === 'application/ld+json'
            ? [element.props.dangerouslySetInnerHTML?.__html || '']
            : [];

    return own.concat(React.Children.toArray(element.props.children).flatMap(findJsonLd));
}

describe('root SEO metadata', () => {
    it('publishes a connected restaurant entity with hours and official profiles', () => {
        const tree = RootLayout({ children: React.createElement('main') });
        const schemas = findJsonLd(tree).map((value) => JSON.parse(value));
        const graph = schemas.flatMap((schema) => schema['@graph'] || []);
        const restaurant = graph.find((item) => item['@id']?.endsWith('/#restaurant'));
        const website = graph.find((item) => item['@type'] === 'WebSite');

        expect(restaurant).toEqual(
            expect.objectContaining({
                '@type': 'Restaurant',
                acceptsReservations: true,
                hasMenu: expect.stringMatching(/\/menu$/),
                openingHoursSpecification: expect.any(Array),
                sameAs: expect.arrayContaining([
                    expect.stringContaining('yandex.ru/maps/org/'),
                    expect.stringContaining('vk.com/'),
                ]),
            }),
        );
        expect(website).toEqual(expect.objectContaining({ publisher: { '@id': restaurant['@id'] } }));
    });

    it('sets complete social preview metadata', () => {
        expect(metadata.openGraph).toEqual(expect.objectContaining({ locale: 'ru_RU', type: 'website' }));
        expect(metadata.twitter).toEqual(expect.objectContaining({ card: 'summary_large_image' }));
    });

    it('publishes favicon formats for search engines and major browsers', () => {
        expect(metadata.icons).toEqual({
            icon: [
                { url: '/favicon-v4.ico', type: 'image/x-icon', sizes: '256x256' },
                { url: '/favicon-48x48-v4.png', type: 'image/png', sizes: '48x48' },
                { url: '/kucher-conga-favicon-v4.svg', type: 'image/svg+xml', sizes: 'any' },
            ],
            shortcut: '/favicon-v4.ico',
            apple: [{ url: '/apple-touch-icon-v4.png', type: 'image/png', sizes: '180x180' }],
        });
    });
});

describe('Yandex Metrika', () => {
    it('renders counter 111802696 and its no-JavaScript tracking pixel on every page', () => {
        const tree = RootLayout({ children: React.createElement('main') });
        const html = renderToStaticMarkup(tree);

        expect(YANDEX_METRIKA_SCRIPT).toContain('mc.yandex.ru/metrika/tag.js?id=111802696');
        expect(YANDEX_METRIKA_SCRIPT).toContain("ym(111802696, 'init'");
        expect(html).toContain('https://mc.yandex.ru/watch/111802696');
    });

    it('sends a virtual page view when Next.js changes the browser URL', () => {
        const insertedScripts: Array<{ async?: number; src?: string }> = [];
        const listeners = new Map<string, () => void>();
        const location = { href: 'https://kucherandconga.ru/' };
        const documentObject = {
            scripts: [] as Array<{ src?: string }>,
            referrer: 'https://yandex.ru/search/',
            title: 'Главная',
            createElement: () => ({}),
            getElementsByTagName: () => [
                {
                    parentNode: {
                        insertBefore: (script: { async?: number; src?: string }) => insertedScripts.push(script),
                    },
                },
            ],
        };
        const history = {
            pushState: (_state: unknown, _title: string, url?: string | URL | null) => {
                if (url) location.href = new URL(String(url), location.href).href;
            },
            replaceState: (_state: unknown, _title: string, url?: string | URL | null) => {
                if (url) location.href = new URL(String(url), location.href).href;
            },
        };
        const windowObject: Record<string, unknown> = {
            document: documentObject,
            history,
            location,
            addEventListener: (event: string, listener: () => void) => listeners.set(event, listener),
        };

        const browserContext = {
            window: windowObject,
            document: documentObject,
            history,
            location,
            URL,
            Date,
        };
        Object.defineProperty(browserContext, 'ym', {
            get: () => windowObject.ym,
        });
        vm.runInNewContext(YANDEX_METRIKA_SCRIPT, browserContext);

        documentObject.title = 'Меню и доставка';
        history.pushState(null, '', '/menu');

        const queuedCalls = (windowObject.ym as { a?: IArguments[] }).a?.map((args) => Array.from(args)) || [];
        expect(insertedScripts).toEqual([
            expect.objectContaining({ async: 1, src: 'https://mc.yandex.ru/metrika/tag.js?id=111802696' }),
        ]);
        expect(queuedCalls).toContainEqual([
            111802696,
            'hit',
            'https://kucherandconga.ru/menu',
            { referer: 'https://kucherandconga.ru/', title: 'Меню и доставка' },
        ]);
    });
});
