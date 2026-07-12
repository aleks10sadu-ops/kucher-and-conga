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
                    <div className="mt-3 flex flex-col items-start gap-2">
                        {SITE.socials.map((s) => (
                            <a
                                key={s.id}
                                href={s.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={s.cta}
                                className="inline-flex items-center gap-2.5 rounded-full border border-[#EFE9E0]/15 bg-[#EFE9E0]/[0.06] py-2 pl-2.5 pr-4 text-[14px] text-[#EFE9E0] transition-colors hover:border-brass hover:bg-brass hover:text-bark"
                            >
                                <SocialIcon id={s.id} />
                                {s.cta}
                            </a>
                        ))}
                    </div>
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

// Фирменные логотипы соцсетей (моно, наследуют currentColor).
function SocialIcon({ id }: { id: string }) {
    if (id === 'telegram') {
        return (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden>
                <path d="M9.78 15.6 9.6 20c.53 0 .76-.23 1.03-.5l2.48-2.37 5.14 3.76c.94.52 1.61.25 1.86-.87l3.38-15.83c.3-1.4-.5-1.94-1.42-1.6L1.14 9.9c-1.37.53-1.35 1.29-.23 1.63l5.1 1.6L17.8 6.32c.56-.37 1.06-.16.65.2Z" />
            </svg>
        );
    }
    if (id === 'vk') {
        return (
            <svg viewBox="0 0 24 24" width="19" height="19" fill="currentColor" aria-hidden>
                <path d="M13.16 17.36c-5.46 0-8.98-3.84-9.12-10.2h2.79c.1 4.68 2.26 6.68 3.9 7.09V7.16h2.66v3.94c1.6-.17 3.28-2.03 3.85-3.94h2.6c-.43 2.35-2.23 4.2-3.5 4.97 1.27.62 3.32 2.24 4.12 5.23h-2.86c-.62-1.98-2.15-3.5-4.21-3.71v3.71h-.32Z" />
            </svg>
        );
    }
    return null;
}
