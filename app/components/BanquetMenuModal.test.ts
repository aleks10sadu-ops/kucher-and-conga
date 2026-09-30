import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type StateSetter = (value: unknown) => void;
type PendingEffect = () => void | (() => void);

let hookCursor = 0;
let hookState: unknown[] = [];
let pendingEffects: PendingEffect[] = [];

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return {
    ...actual,
    useState: (initial: unknown) => {
      const index = hookCursor++;
      if (!(index in hookState)) {
        hookState[index] = typeof initial === 'function' ? (initial as () => unknown)() : initial;
      }
      const setState: StateSetter = (value) => {
        hookState[index] = typeof value === 'function'
          ? (value as (current: unknown) => unknown)(hookState[index])
          : value;
      };
      return [hookState[index], setState];
    },
    useEffect: (effect: PendingEffect, deps?: readonly unknown[]) => {
      const index = hookCursor++;
      const previous = hookState[index] as readonly unknown[] | undefined;
      const changed = !deps || !previous || deps.some((value, depIndex) => !Object.is(value, previous[depIndex]));
      hookState[index] = deps;
      if (changed) pendingEffects.push(effect);
    },
  };
});

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  motion: new Proxy({}, { get: (_target, tag: string) => tag }),
}));

vi.mock('lucide-react', () => ({ X: () => null, Check: () => null }));

import BanquetMenuModal from './BanquetMenuModal';

type ModalProps = Parameters<typeof BanquetMenuModal>[0];

function renderModal(props: ModalProps): React.ReactNode {
  let tree: React.ReactNode = null;
  for (let pass = 0; pass < 3; pass += 1) {
    hookCursor = 0;
    pendingEffects = [];
    tree = BanquetMenuModal(props);
    const effects = pendingEffects;
    if (!effects.length) break;
    effects.forEach((effect) => effect());
  }
  return tree;
}

function textContent(node: React.ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textContent).join('');
  if (!React.isValidElement(node)) return '';
  return textContent((node.props as { children?: React.ReactNode }).children);
}

function clickButton(node: React.ReactNode, label: string): boolean {
  if (Array.isArray(node)) return node.some((child) => clickButton(child, label));
  if (!React.isValidElement(node)) return false;
  const props = node.props as { children?: React.ReactNode; onClick?: () => void };
  if (node.type === 'button' && textContent(props.children).includes(label)) {
    props.onClick?.();
    return true;
  }
  return clickButton(props.children, label);
}

describe('BanquetMenuModal reopen behavior', () => {
  beforeEach(() => {
    hookCursor = 0;
    hookState = [];
    pendingEffects = [];
    vi.stubGlobal('document', { body: { style: { overflow: '' } } });
  });

  it('renders Conga after closing on Kucher and reopening with the Conga-only filter', () => {
    const common = { onClose: () => undefined, selectable: true, selectedPackageId: null } as const;
    const allMenus = renderModal({ ...common, isOpen: true, hallFilter: 'all' });
    expect(clickButton(allMenus, 'Зал Кучер')).toBe(true);

    renderModal({ ...common, isOpen: true, hallFilter: 'all' });
    renderModal({ ...common, isOpen: false, hallFilter: 'all' });
    const congaOnly = renderModal({ ...common, isOpen: true, hallFilter: 'conga' });

    expect(renderToStaticMarkup(React.createElement(React.Fragment, null, congaOnly))).toContain('>Конга<');
  });
});
