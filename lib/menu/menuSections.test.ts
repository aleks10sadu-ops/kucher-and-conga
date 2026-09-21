import { describe, expect, it } from 'vitest';
import { MENU_TYPE_DEFS, MENU_TYPE_ORDER } from './menuSections';

describe('menu section order', () => {
    it('keeps delivery first and separates the paper main menu', () => {
        expect(MENU_TYPE_ORDER.slice(0, 2)).toEqual(['delivery', 'main']);
        expect(MENU_TYPE_DEFS.slice(0, 2)).toEqual([
            { id: 'delivery', name: 'Доставка и самовывоз' },
            { id: 'main', name: 'Основное меню' },
        ]);
    });
});
