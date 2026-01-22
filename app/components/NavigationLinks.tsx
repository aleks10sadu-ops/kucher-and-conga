import React from 'react';

type NavigationItem = {
    type: 'scroll' | 'link';
    target?: string;
    href?: string;
    label: string;
};

const NAVIGATION_ITEMS: NavigationItem[] = [
    { type: 'scroll', target: '#menu', label: 'Меню' },
    { type: 'scroll', target: '#about', label: 'О ресторане' },
    { type: 'scroll', target: '#gallery', label: 'Атмосфера' },
    { type: 'link', href: '/halls', label: 'Залы' },
    { type: 'scroll', target: '#reviews', label: 'Отзывы' },
    { type: 'scroll', target: '#booking', label: 'Бронь' },
    { type: 'link', href: '/events', label: 'События' },
    { type: 'link', href: '/vacancies', label: 'Вакансии' },
    { type: 'link', href: '/blog', label: 'Новостной блог' },
    { type: 'link', href: '/rules', label: 'Правила нахождения' },
    { type: 'link', href: '/account', label: 'Личный кабинет' },
];

type NavigationLinksProps = {
    scrollTo: (target: string) => void;
    className?: string;
};

export default function NavigationLinks({ scrollTo, className }: NavigationLinksProps) {
    const defaultLinkClassName = "text-left px-4 py-3 rounded-lg hover:bg-white/5 hover:text-amber-400 transition-colors duration-200 text-sm font-medium text-white";
    const linkClassName = className || defaultLinkClassName;

    return (
        <>
            {NAVIGATION_ITEMS.map((item, index) => (
                item.type === 'scroll' ? (
                    <button
                        key={index}
                        onClick={(e) => { e.stopPropagation(); if (item.target) scrollTo(item.target); }}
                        className={linkClassName}
                    >
                        {item.label}
                    </button>
                ) : (
                    <a
                        key={index}
                        href={item.href}
                        onClick={(e) => e.stopPropagation()}
                        className={linkClassName}
                    >
                        {item.label}
                    </a>
                )
            ))}
        </>
    );
}
