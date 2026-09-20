'use client';

import { useState, type CSSProperties } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowDown, ArrowUpRight, Clock, Gift, Mic2, Music2, Phone, Snowflake, Trophy } from 'lucide-react';
import { SITE } from '../../components/forest/site';
import styles from './christmas.module.css';
import ForestHeader from '../../components/forest/ForestHeader';
import ForestFooter from '../../components/forest/ForestFooter';

const venues = [
    { name: 'Кучер', music: 'Музыкант Алекс', rooms: 'Барный зал, Морской зал и Крытая веранда', range: '18, 19, 25–29 декабря' },
    { name: 'CONGA', music: 'Музыканты Ирина и Илья', rooms: 'Праздник под перевёрнутым лесом', range: '18–29 декабря' },
] as const;

export default function ChristmasParty() {
    const [snow, setSnow] = useState(true);

    return (
        <>
        <ForestHeader />
        <div className={styles.page} data-snow={snow}>
            <a href="#christmas-main" className={styles.skip}>Перейти к афише</a>
            <div className={styles.snow} aria-hidden="true">
                {Array.from({ length: 26 }, (_, i) => <i key={i} style={{
                    '--x': `${(i * 37 + 9) % 100}%`, '--size': `${2 + i % 3}px`,
                    '--duration': `${17 + i % 13}s`, '--delay': `${-i * 2.7}s`,
                } as CSSProperties} />)}
            </div>

            <div className={styles.toolbar}>
                <nav aria-label="Навигация по афише">
                    <Link href="/events" className={styles.back}>Все события <ArrowUpRight size={16} /></Link>
                    <button type="button" className={styles.snowToggle} onClick={() => setSnow(!snow)} aria-pressed={snow} aria-label={snow ? 'Выключить снег' : 'Включить снег'}>
                        <Snowflake size={17} /><span>Снег {snow ? 'вкл' : 'выкл'}</span>
                    </button>
                </nav>
            </div>

            <main id="christmas-main">
                <section className={styles.hero} aria-labelledby="party-title">
                    <div className={styles.heroCopy}>
                        <h1 id="party-title">Этот декабрь —<br /><em>ваш праздник</em></h1>
                        <p className={styles.lead}>Новогодние корпоративы<br />в ресторане Кучер & CONGA</p>
                        <p className={styles.time}><Clock size={19} />Программа 19:00–00:00</p>
                        <a href="#booking" className={styles.primary}>Забронировать <ArrowDown size={18} /></a>
                        <div className={styles.year}><span>Встречаем</span>2027</div>
                        <p className={styles.month}>Декабрь 2026 · Дмитров</p>
                    </div>
                    <div className={styles.ornaments}>
                        <figure className={styles.bauble}>
                            <div className={styles.hanging}><Image src="/christmas-2027/irakliy.webp" width={768} height={1024} alt="Ираклий с микрофоном в золотом ёлочном шаре" priority sizes="(max-width: 600px) 60vw, 34vw" /></div>
                            <figcaption><strong>Ираклий</strong><span>ведущий в CONGA</span></figcaption>
                        </figure>
                        <figure className={styles.star}>
                            <div className={styles.hanging}><Image src="/christmas-2027/elena.webp" width={768} height={1024} alt="Елена «Золотая стрекоза» в золотой ёлочной звезде" priority sizes="(max-width: 600px) 54vw, 30vw" /></div>
                            <figcaption><strong>Елена</strong><span>«Золотая стрекоза» · Кучер</span></figcaption>
                        </figure>
                    </div>
                </section>

                <section id="dates" className={styles.dates} aria-labelledby="dates-title">
                    <div className={styles.sectionTitle}><span /><h2 id="dates-title">Даты программы по залам</h2><span /></div>
                    <div className={styles.venues}>
                        {venues.map(venue => (
                            <article className={styles.venue} key={venue.name}>
                                <h3>{venue.name}</h3>
                                <p className={styles.range}>{venue.range}</p>
                                <p className={styles.rooms}>{venue.rooms}</p>
                                <p className={styles.musicians}><Music2 size={17} />{venue.music}</p>
                                {venue.name === 'CONGA' && <p className={styles.special}>30 декабря — без развлекательной программы.</p>}
                            </article>
                        ))}
                    </div>
                </section>

                <section className={styles.program} aria-labelledby="program-title">
                    <div className={styles.sectionTitle}><span /><h2 id="program-title">В программе вечера</h2><span /></div>
                    <div className={styles.features}>
                        {[{ Icon: Mic2, label: 'Ведущие' }, { Icon: Gift, label: 'Конкурсы' }, { Icon: Trophy, label: 'Призы' }, { Icon: Music2, label: 'Дискотека' }].map(({ Icon, label }) => <div key={label}><Icon size={32} strokeWidth={1.2} /><h3>{label}</h3></div>)}
                    </div>
                    <p className={styles.hours}>В дни программы ресторан открыт с 14:00 до 01:00.</p>
                </section>

                <section id="booking" className={styles.booking} aria-labelledby="booking-title">
                    <Snowflake size={28} strokeWidth={1} className={styles.bookingStar} />
                    <h2 id="booking-title">Бронирование</h2>
                    <div className={styles.banquetMenu}>
                        <p className={styles.banquetLabel}>Банкетное меню на период новогодних корпоративов</p>
                        <dl className={styles.banquetPrices}>
                            <div><dt>Зал CONGA</dt><dd>от <strong>7 000 ₽</strong></dd></div>
                            <div><dt>Залы Кучера</dt><dd>от <strong>6 000 ₽</strong></dd></div>
                        </dl>
                    </div>
                    <p className={styles.deposit}>Бронь с 18 по 30 декабря подтверждается<br />после предоплаты <strong>10 000 ₽</strong>.</p>
                    <div className={styles.phones}>{SITE.phones.map((phone, i) => <a key={phone.tel} className={i === 0 ? styles.primary : styles.secondary} href={`tel:${phone.tel}`}><Phone size={18} />{phone.label}</a>)}</div>
                    <p className={styles.contactHint}>Позвоните, чтобы уточнить свободные места, меню и условия оплаты.</p>

                    <details className={styles.details} open>
                        <summary>Что важно знать перед бронированием</summary>
                        <div>
                            <p><strong>Участие в программе «Кучера».</strong> Беседки, Летняя веранда (кальянная) и отдельные банкетные залы в программе не участвуют; переход в зал с программой для их гостей не предусмотрен.</p>
                            <p><strong>Рассадка в CONGA.</strong> Конкретный стол при бронировании не закрепляется. Рассадка определяется в день мероприятия с учётом состава компаний.</p>
                            <p><strong>Оплата.</strong> После первоначальной предоплаты: 50% остатка до 1 ноября, оставшаяся сумма до 1 декабря. При бронировании после 1 ноября — половина остатка в течение недели, окончательный расчёт до 1 декабря; после 1 декабря — весь остаток в течение недели. Точный график согласуйте с администратором.</p>
                            <p><strong>Меню и отдельный зал.</strong> Новогоднее меню ожидается в начале октября. Состав меню, стоимость корпоратива и условия закрытия зала уточняйте у администратора.</p>
                        </div>
                    </details>
                </section>
            </main>
        </div>
        <ForestFooter />
        </>
    );
}
