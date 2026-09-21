import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import CartDrawer from './CartDrawer';

const baseProps = {
    onClose: vi.fn(),
    items: [],
    onAdd: vi.fn(),
    onDecrement: vi.fn(),
    onRemove: vi.fn(),
    count: 0,
    total: 0,
    onDeliveryClick: vi.fn(),
};

describe('CartDrawer accessibility tree', () => {
    it('does not render focusable controls while the drawer is closed', () => {
        const html = renderToStaticMarkup(
            React.createElement(CartDrawer, { ...baseProps, isOpen: false, isMounted: true }),
        );

        expect(html).toBe('');
    });

    it('exposes an open cart as a modal dialog', () => {
        const html = renderToStaticMarkup(
            React.createElement(CartDrawer, { ...baseProps, isOpen: true, isMounted: true }),
        );

        expect(html).toContain('role="dialog"');
        expect(html).toContain('aria-modal="true"');
        expect(html).not.toContain('aria-hidden="true" role="dialog"');
    });
});
