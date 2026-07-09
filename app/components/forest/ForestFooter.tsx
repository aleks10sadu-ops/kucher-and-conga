import React from 'react';
import { SITE } from './site';

// Общий подвал «Перевёрнутого леса»: адрес, телефоны, часы, юр-ссылки.
export default function ForestFooter() {
    return (
        <footer className="border-t-[3px] border-oxblood bg-bark">
            <div className="mx-auto grid max-w-[1280px] grid-cols-1 gap-7 px-5 pb-2 pt-10 md:grid-cols-3 md:px-8">
                <FootCol label="Адрес">
                    <span className="text-[16px] leading-relaxed text-[#EFE9E0]">{SITE.address}</span>
                </FootCol>
                <FootCol label="Телефоны">
                    {SITE.phones.map((p) => (
                        <a key={p.tel} href={`tel:${p.tel}`} className="text-[16px] text-[#EFE9E0]">
                            {p.label}
                        </a>
                    ))}
                </FootCol>
                <FootCol label="Часы работы">
                    {SITE.hours.map((h) => (
                        <span key={h.d} className="text-[15px] text-[#EFE9E0]">
                            {h.d}&nbsp;&nbsp;{h.t} <span className="text-[#EFE9E0]/50">({h.note})</span>
                        </span>
                    ))}
                    <span className="mt-1 text-[13px] text-brass">{SITE.hoursNote}</span>
                </FootCol>
            </div>
            <div className="mx-auto mt-6 flex max-w-[1280px] flex-wrap items-center justify-between gap-3.5 border-t border-[#EFE9E0]/10 px-5 pb-8 pt-4 md:px-8">
                <span className="text-[12.5px] text-[#EFE9E0]/50">© 2026 Ресторан «Кучер и Конга»</span>
                <div className="flex flex-wrap items-center gap-5 text-[13px]">
                    <a href="/privacy" className="text-[#EFE9E0]/70 hover:text-[#EFE9E0]">Политика конфиденциальности</a>
                    <a href="/rules" className="text-[#EFE9E0]/70 hover:text-[#EFE9E0]">Правила пользования</a>
                    <a href={SITE.telegram} target="_blank" rel="noopener noreferrer" className="text-[#EFE9E0]/70 hover:text-[#EFE9E0]">
                        Сайт разработан — @Kvazar27
                    </a>
                </div>
            </div>
        </footer>
    );
}

function FootCol({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-2">
            <span className="text-[12.5px] text-brass">{label}</span>
            {children}
        </div>
    );
}
