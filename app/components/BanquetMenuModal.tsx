'use client';

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type BanquetMenuModalProps = {
    isOpen: boolean;
    onClose: () => void;
};

export default function BanquetMenuModal({ isOpen, onClose }: BanquetMenuModalProps) {
    const [activeTab, setActiveTab] = useState<'conga' | 'kucher'>('conga');
    const [activeCongaMenu, setActiveCongaMenu] = useState<'7500' | '6000'>('7500');

    // Lock body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }

        // Cleanup on unmount
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-4">
            {/* Blurred dark overlay */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

            {/* Modal - cream/white elegant design */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative w-full max-w-6xl max-h-[95vh] bg-amber-50 rounded-xl shadow-2xl overflow-hidden flex flex-col"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 md:p-5 bg-stone-800 shrink-0">
                    <h2 className="text-lg md:text-xl font-bold text-amber-100 uppercase tracking-[0.3em]">
                        Банкетное меню
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full bg-stone-700 hover:bg-stone-600 transition text-stone-300 hover:text-white"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Hall Tabs */}
                <div className="flex bg-stone-700 shrink-0">
                    <button
                        onClick={() => setActiveTab('conga')}
                        className={`flex-1 py-3 md:py-4 text-center font-bold tracking-wider transition-all uppercase text-sm md:text-base ${activeTab === 'conga'
                            ? 'bg-amber-50 text-stone-800'
                            : 'text-stone-300 hover:bg-stone-600 hover:text-white'
                            }`}
                    >
                        Зал Conga
                    </button>
                    <button
                        onClick={() => setActiveTab('kucher')}
                        className={`flex-1 py-3 md:py-4 text-center font-bold tracking-wider transition-all uppercase text-sm md:text-base ${activeTab === 'kucher'
                            ? 'bg-amber-50 text-stone-800'
                            : 'text-stone-300 hover:bg-stone-600 hover:text-white'
                            }`}
                    >
                        Зал Кучер
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto bg-amber-50">
                    <AnimatePresence mode="wait">
                        {activeTab === 'conga' ? (
                            <motion.div
                                key="conga"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="p-4 md:p-6"
                            >
                                {/* ОЧЕНЬ ЧЁТКИЕ КНОПКИ ВЫБОРА МЕНЮ */}
                                <div className="flex justify-center gap-2 md:gap-4 mb-6">
                                    <button
                                        onClick={() => setActiveCongaMenu('7500')}
                                        className={`px-4 md:px-8 py-3 md:py-4 rounded-lg text-sm md:text-base font-bold transition-all duration-200 border-2 ${activeCongaMenu === '7500'
                                            ? 'bg-emerald-700 text-white border-emerald-700 shadow-lg scale-105'
                                            : 'bg-white text-stone-700 border-stone-300 hover:border-emerald-600 hover:text-emerald-700'
                                            }`}
                                    >
                                        МЕНЮ 7500 ₽
                                    </button>
                                    <button
                                        onClick={() => setActiveCongaMenu('6000')}
                                        className={`px-4 md:px-8 py-3 md:py-4 rounded-lg text-sm md:text-base font-bold transition-all duration-200 border-2 ${activeCongaMenu === '6000'
                                            ? 'bg-emerald-700 text-white border-emerald-700 shadow-lg scale-105'
                                            : 'bg-white text-stone-700 border-stone-300 hover:border-emerald-600 hover:text-emerald-700'
                                            }`}
                                    >
                                        МЕНЮ 6000 ₽
                                    </button>
                                </div>

                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={activeCongaMenu}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        {/* Menu Header */}
                                        <div className="text-center mb-6 pb-4 border-b-2 border-stone-300">
                                            <h3 className="text-2xl md:text-3xl font-serif font-bold text-stone-800 mb-1">CONGA</h3>
                                            <p className="text-stone-500 tracking-widest text-xs md:text-sm mb-3">БАНКЕТНОЕ МЕНЮ</p>
                                            <div className="inline-block px-6 py-2 bg-emerald-700 rounded-lg">
                                                <span className="text-xl md:text-2xl font-bold text-white">{activeCongaMenu} ₽</span>
                                                <span className="text-emerald-100 ml-2 text-xs md:text-sm">/ 1460 гр./чел.</span>
                                            </div>
                                        </div>

                                        {/* Menu Content */}
                                        {activeCongaMenu === '7500' ? (
                                            <CongaMenu7500 />
                                        ) : (
                                            <CongaMenu6000 />
                                        )}
                                    </motion.div>
                                </AnimatePresence>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="kucher"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="p-4 md:p-6"
                            >
                                <KucherMenu />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
}

// ===== CONGA 7500 =====
function CongaMenu7500() {
    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-6">
                <div className="space-y-4">
                    <MenuCard title="ЗАКУСКИ" weight="480 гр." color="emerald">
                        <Item name="Мясное ассорти" desc="Говяжий язык, бастурма, куриный рулет, суджук, грудинка" w="70" />
                        <Item name="Сырное ассорти" desc="с шоколадом, медом, орехами" w="100" />
                        <Item name="Рыбное ассорти" desc="Масляная рыба, копчёный осётр, сёмга" w="25" />
                        <Item name="Баклажанные рулетики" desc="с грецким орехом" w="25" />
                        <Item name="Мини-бургер" desc="с куриной котлетой" w="80" />
                        <Item name="Брускетта" desc="с томлёной говядиной" w="50" />
                        <Item name="Мини-круассан" desc="с копчёной рыбой" w="50" />
                        <Item name="Овощной букет" w="80" />
                    </MenuCard>
                </div>

                <div className="space-y-4">
                    <MenuCard title="САЛАТЫ" subtitle="4 вида на выбор" weight="240 гр." color="emerald">
                        <Item name="Цезарь с креветками" desc="Микс-салат, креветки, Пармезан, чипсы" w="60" />
                        <Item name="Цезарь с курицей" desc="Микс-салат, курица, Пармезан, чипсы" w="60" />
                        <Item name="Кучер" desc="Свинина, говядина, шампиньоны, перец" w="60" />
                        <Item name="Оливье с говядиной" desc="Говядина, горошек, картофель, морковь" w="60" />
                        <Item name="Оливье с красной рыбой" desc="Красная рыба, горошек, картофель" w="60" />
                        <Item name="С бужениной" desc="Буженина, перец, кабачок, морковь" w="60" />
                    </MenuCard>
                    <MenuCard title="ГОРЯЧАЯ ЗАКУСКА" weight="80 гр." color="emerald">
                        <Item name="Бразильский сырный хлеб" desc="с жульеном из красной рыбы" w="80" />
                    </MenuCard>
                </div>

                <div className="space-y-4">
                    <MenuCard title="МЯСНЫЕ БЛЮДА" weight="400 гр." color="emerald">
                        <Item name="Телячьи щёчки" desc="с бататом и сливовым соусом" w="200" />
                        <Item name="Стейк из говяжьей вырезки" desc="с картофелем и перечным соусом" w="200" />
                    </MenuCard>
                    <MenuCard title="РЫБНОЕ БЛЮДО" weight="160 гр." color="emerald">
                        <Item name="Стейк из форели" desc="с птитимом и морковным гелем" w="160" />
                    </MenuCard>
                    <div className="p-3 bg-emerald-700 rounded-lg text-center">
                        <div className="text-white font-bold text-sm">ХЛЕБ — 100 гр.</div>
                    </div>
                </div>
            </div>

            <ConditionsCard />
        </>
    );
}

// ===== CONGA 6000 =====
function CongaMenu6000() {
    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-6">
                <div className="space-y-4">
                    <MenuCard title="ЗАКУСКИ" weight="510 гр." color="emerald">
                        <Item name="Сельдь с картофелем" w="50" />
                        <Item name="Ассорти сыров" desc="с медом, шоколадом" w="35" />
                        <Item name="Мясное ассорти" desc="Гусь, утка, балык, ветчина" w="40" />
                        <Item name="Овощной букет" w="85" />
                        <Item name="Баклажанные рулетики" desc="с орехом и чесноком" w="25" />
                        <Item name="Паштет из печени" desc="с клюквенным конфитюром" w="50" />
                        <Item name="Мини-бургер" desc="с куриной котлетой" w="80" />
                        <Item name="Брускетта" desc="с томлёной говядиной" w="50" />
                        <Item name="Мини-круассан" desc="с копчёной рыбой" w="50" />
                        <Item name="Рыбное ассорти" desc="Масляная, осётр, сёмга" w="45" />
                    </MenuCard>
                </div>

                <div className="space-y-4">
                    <MenuCard title="САЛАТЫ" subtitle="3 вида на выбор" weight="180 гр." color="emerald">
                        <Item name="Цезарь с креветками" desc="Микс-салат, креветки, Пармезан" w="60" />
                        <Item name="Цезарь с курицей" desc="Микс-салат, курица, Пармезан" w="60" />
                        <Item name="Кучер" desc="Свинина, говядина, шампиньоны" w="60" />
                        <Item name="Оливье с красной рыбой" desc="Рыба, горошек, картофель" w="60" />
                        <Item name="С бужениной" desc="Буженина, перец, кабачок" w="60" />
                    </MenuCard>
                    <MenuCard title="ГОРЯЧАЯ ЗАКУСКА" weight="50 гр." color="emerald">
                        <Item name="Бразильская булочка" desc="с грибным жульеном" w="50" />
                    </MenuCard>
                </div>

                <div className="space-y-4">
                    <MenuCard title="ШАШЛЫЧНЫЙ СЕТ" weight="420 гр." color="emerald">
                        <Item name="Баранина" w="60" />
                        <Item name="Свиная шейка" w="60" />
                        <Item name="Куриное бедро" w="60" />
                        <Item name="Люля-кебаб говядина" w="60" />
                        <Item name="Люля-кебаб курица" w="60" />
                        <Item name="Картофельные дольки" w="100" />
                        <Item name="Шашлычный соус" w="20" />
                    </MenuCard>
                    <MenuCard title="ОСЕТР С ОВОЩАМИ" weight="200 гр." color="emerald">
                        <Item name="Осетр" w="100" />
                        <Item name="Овощи «Европа»" desc="Кабачок, перец, шампиньоны" w="100" />
                    </MenuCard>
                    <div className="p-3 bg-emerald-700 rounded-lg text-center">
                        <div className="text-white font-bold text-sm">ХЛЕБ — 100 гр.</div>
                    </div>
                </div>
            </div>

            <ConditionsCard />
        </>
    );
}

// ===== KUCHER =====
function KucherMenu() {
    return (
        <>
            <div className="text-center mb-6 pb-4 border-b-2 border-stone-300">
                <h3 className="text-2xl md:text-3xl font-serif font-bold text-stone-800 mb-1">КУЧЕР</h3>
                <p className="text-stone-500 tracking-widest text-xs md:text-sm mb-3">БАНКЕТНОЕ МЕНЮ</p>
                <div className="inline-block px-6 py-2 bg-amber-600 rounded-lg">
                    <span className="text-xl md:text-2xl font-bold text-white">5000 ₽</span>
                    <span className="text-amber-100 ml-2 text-xs md:text-sm">/ 1480 гр./чел.</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-6">
                <div className="space-y-4">
                    <MenuCard title="ЗАКУСКИ" weight="500 гр." color="amber">
                        <Item name="Сельдь с картофелем" w="50" />
                        <Item name="Ассорти фермерских сыров" desc="с медом и горьким шоколадом" w="35" />
                        <Item name="Деликатесное мясное ассорти" desc="Гусиный рулет, утиный рулет, балык, бастурма" w="40" />
                        <Item name="Овощной букет" w="85" />
                        <Item name="Баклажанные рулетики" desc="с грецким орехом и чесноком" w="25" />
                        <Item name="Паштет из куриной печени" desc="с клюквенным конфитюром" w="50" />
                        <Item name="Мини-бургер" desc="с куриной котлетой" w="80" />
                        <Item name="А-ля брускетта" desc="с томлёной говядиной" w="50" />
                        <Item name="Мини-круассан" desc="с копчёной красной рыбой" w="50" />
                        <Item name="Лосось слабосолёный" w="35" />
                    </MenuCard>
                </div>

                <div className="space-y-4">
                    <MenuCard title="САЛАТЫ" subtitle="На выбор 3 вида" weight="180 гр." color="amber">
                        <Item name="Цезарь с креветками" desc="Микс-салат, креветки, Пармезан, чипсы" w="60" />
                        <Item name="Цезарь с курицей" desc="Микс-салат, курица, Пармезан, чипсы" w="60" />
                        <Item name="Кучер" desc="Свинина, говядина, шампиньоны, перец" w="60" />
                        <Item name="Оливье с красной рыбой" desc="Рыба, горошек, картофель, морковь" w="60" />
                        <Item name="С бужениной" desc="Буженина, перец, кабачок, морковь" w="60" />
                    </MenuCard>
                    <MenuCard title="ГОРЯЧАЯ ЗАКУСКА" weight="80 гр." color="amber">
                        <Item name="Хачапури по-имеретинский" w="80" />
                    </MenuCard>
                </div>

                <div className="space-y-4">
                    <MenuCard title="ШАШЛЫЧНЫЙ СЕТ" subtitle="с картофелем" weight="420 гр." color="amber">
                        <Item name="Баранина" w="60" />
                        <Item name="Свиная шейка" w="60" />
                        <Item name="Куриное бедро" w="60" />
                        <Item name="Люля-кебаб из говядины" w="60" />
                        <Item name="Люля-кебаб из курицы" w="60" />
                        <Item name="Картофельные дольки" w="100" />
                        <Item name="Шашлычный соус" w="20" />
                    </MenuCard>
                    <MenuCard title="ОСЕТР С ОВОЩАМИ" weight="200 гр." color="amber">
                        <Item name="Осетр" w="100" />
                        <Item name="Овощи «Европа»" desc="Кабачок, перец, шампиньоны" w="100" />
                    </MenuCard>
                    <div className="p-3 bg-amber-600 rounded-lg text-center">
                        <div className="text-white font-bold text-sm">ХЛЕБ — 100 гр.</div>
                    </div>
                </div>
            </div>

            <ConditionsCard color="amber" />
        </>
    );
}

// ===== REUSABLE COMPONENTS =====
function MenuCard({ title, subtitle, weight, color, children }: {
    title: string;
    subtitle?: string;
    weight: string;
    color: 'emerald' | 'amber';
    children: React.ReactNode
}) {
    const headerBg = color === 'emerald' ? 'bg-emerald-700' : 'bg-amber-600';

    return (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className={`${headerBg} px-4 py-2 flex items-center justify-between`}>
                <div>
                    <h4 className="text-white font-bold text-sm uppercase">{title}</h4>
                    {subtitle && <div className="text-white/80 text-xs">{subtitle}</div>}
                </div>
                <div className="text-white font-bold text-xs bg-white/20 px-2 py-1 rounded">{weight}</div>
            </div>
            <div className="p-3 space-y-2">
                {children}
            </div>
        </div>
    );
}

function Item({ name, desc, w }: { name: string; desc?: string; w: string }) {
    return (
        <div className="flex items-start justify-between gap-2 py-1 border-b border-stone-100 last:border-0">
            <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-stone-800">{name}</div>
                {desc && <div className="text-xs text-stone-500 leading-tight">{desc}</div>}
            </div>
            <div className="text-xs text-stone-600 font-semibold whitespace-nowrap">{w} гр.</div>
        </div>
    );
}

function ConditionsCard({ color = 'emerald' }: { color?: 'emerald' | 'amber' }) {
    const accentColor = color === 'emerald' ? 'text-emerald-700' : 'text-amber-700';

    return (
        <div className="bg-white rounded-lg shadow-md p-4">
            <h4 className="font-bold text-stone-800 text-sm uppercase mb-3 pb-2 border-b border-stone-200">
                Условия
            </h4>
            <ul className="space-y-3 text-xs text-stone-600 leading-relaxed">
                <li className="flex gap-2">
                    <span className={`${accentColor} font-bold shrink-0`}>1.</span>
                    <span>Спиртные и безалкогольные напитки разрешено принести с собой. Алкогольные напитки принимаются только в закупоренном виде и при наличии акцизной марки на таре. Безалкогольные напитки (кроме соков) принимаются только в стеклянной таре не более 0,5л.</span>
                </li>
                <li className="flex gap-2">
                    <span className={`${accentColor} font-bold shrink-0`}>2.</span>
                    <span>Любые продукты питания (заблаговременно не оговоренные при заключении договора) запрещено приносить с собой и употреблять во время Банкета.</span>
                </li>
                <li className="flex gap-2">
                    <span className={`${accentColor} font-bold shrink-0`}>3.</span>
                    <span>Переход из одного зала в другой зал запрещен.</span>
                </li>
                <li className="flex gap-2">
                    <span className={`${accentColor} font-bold shrink-0`}>4.</span>
                    <span>При изменении количества гостей в меньшую сторону в день мероприятия - корректировки не производятся.</span>
                </li>
                <li className="flex gap-2">
                    <span className={`${accentColor} font-bold shrink-0`}>5.</span>
                    <span>Не разрешено проводить индивидуальную развлекательную программу, подключаться к аппаратуре заведения в общем зале Ресторана.</span>
                </li>
                <li className="flex gap-2">
                    <span className={`${accentColor} font-bold shrink-0`}>6.</span>
                    <span>Заказчик принимает на себя обязательство нести ответственность за приглашенных на Мероприятие Гостей, их поведение и действия. Не допускается некорректное поведение гостей Мероприятия по отношению к сотрудникам Ресторана, присутствующим в зале посетителям и имуществу заведения.</span>
                </li>
                <li className="flex gap-2">
                    <span className={`${accentColor} font-bold shrink-0`}>7.</span>
                    <span>При нарушении любого пункта, заведение оставляет за собой право отказать гостю или гостям в обслуживании, попросить их оплатить счет и покинуть заведение.</span>
                </li>
            </ul>
            <div className="mt-4 pt-3 border-t border-stone-200 text-[10px] text-red-600 font-semibold text-center leading-relaxed">
                Обращаем Ваше внимание на то, что конкретизация стола в зале "CONGA" при приеме банкета НЕ ПРОИЗВОДИТСЯ! Точная схема расстановки столов определяется в день проведения Мероприятия Администрацией Ресторана, которая руководствуется принципами оптимальной рассадки в условиях наполняемости зала.
            </div>
        </div>
    );
}
