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
                    <div className="mt-3 flex items-center gap-3">
                        {SITE.socials.map((s) => (
                            <a
                                key={s.id}
                                href={s.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={s.label}
                                title={s.label}
                                className="grid h-11 w-11 place-items-center rounded-full bg-[#EFE9E0]/[0.06] text-[#EFE9E0] ring-1 ring-inset ring-[#EFE9E0]/10 transition-colors hover:bg-brass hover:text-bark"
                            >
                                <SocialIcon id={s.id} />
                            </a>
                        ))}
                    </div>
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
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden>
                <path d="M21.94 4.9 18.6 19.2c-.25 1.1-.9 1.37-1.83.85l-5.05-3.72-2.44 2.35c-.27.27-.5.5-1.02.5l.36-5.14L16.98 6.7c.4-.36-.09-.56-.63-.2L6.79 12.4l-5.03-1.57c-1.09-.34-1.11-1.09.23-1.61L20.53 3.3c.91-.34 1.7.2 1.41 1.6Z" />
            </svg>
        );
    }
    if (id === 'vk') {
        return (
            <svg viewBox="0 0 24 24" width="21" height="21" fill="currentColor" aria-hidden>
                <path d="M13.16 17.36c-5.46 0-8.98-3.84-9.12-10.2h2.79c.1 4.68 2.26 6.68 3.9 7.09V7.16h2.66v3.94c1.6-.17 3.28-2.03 3.85-3.94h2.6c-.43 2.35-2.23 4.2-3.5 4.97 1.27.62 3.32 2.24 4.12 5.23h-2.86c-.62-1.98-2.15-3.5-4.21-3.71v3.71h-.32Z" />
            </svg>
        );
    }
    return null;
}
