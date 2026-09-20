'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import Image from 'next/image';
import { ArrowDown, Phone } from 'lucide-react';
import ForestHeader from '../../components/forest/ForestHeader';
import ForestFooter from '../../components/forest/ForestFooter';
import { SITE } from '../../components/forest/site';
import NightSpotlights from './NightSpotlights';
import styles from './night.module.css';

const program = [
    'Welcome-фуршет с игристым и десертами',
    'Любимые блюда праздничного стола',
    'Программа с розыгрышами призов',
    'Дискотека под знакомые хиты',
    'Новогодние песни и мировые хиты в живом исполнении',
    'Световые спецэффекты в течение вечера',
    'Профессиональная фотосъёмка',
] as const;

export default function NewYearNight() {
    const hero = useRef<HTMLElement>(null);
    const [heroVisible, setHeroVisible] = useState(true);

    useEffect(() => {
        const element = hero.current;
        if (!element) return;
        let inView = true;
        const update = () => setHeroVisible(inView && !document.hidden);
        const observer = new IntersectionObserver(([entry]) => {
            inView = entry.isIntersecting;
            update();
        });
        observer.observe(element);
        document.addEventListener('visibilitychange', update);
        return () => {
            observer.disconnect();
            document.removeEventListener('visibilitychange', update);
        };
    }, []);

    return <>
        <ForestHeader />
        <div className={styles.page} data-hero-visible={heroVisible}>
            <a href="#night-main" className={styles.skip}>Перейти к афише</a>

            <main id="night-main">
                <section ref={hero} className={styles.hero} aria-labelledby="night-title">
                    <div className={styles.snow} aria-hidden="true">
                        {Array.from({ length: 20 }, (_, i) => <i key={i} style={{
                            '--x': `${(i * 37 + 9) % 100}%`, '--size': `${2 + i % 3}px`,
                            '--duration': `${20 + i % 13}s`, '--delay': `${-i * 3.7}s`,
                        } as CSSProperties} />)}
                    </div>
                    <div className={styles.heroCopy}>
                        <h1 id="night-title">Новогодняя<br /><em>ночь 2027</em></h1>
                        <p className={styles.lead}>В ресторане Кучер &amp; CONGA</p>
                        <p className={styles.date}>31 декабря 2026 · с 22:00</p>
                        <p className={styles.intro}>Праздничный стол, живая музыка и танцы до утра. Проведите эту ночь с близкими, а приготовления оставьте нам.</p>
                        <div className={styles.actions}>
                            <a href="#night-booking" className={styles.primary}>Забронировать <ArrowDown size={18} aria-hidden="true" /></a>
                            <a href="#night-program" className={styles.textLink}>Программа вечера</a>
                        </div>
                    </div>
                    <figure className={styles.portrait}>
                        <div className={styles.portraitScene}>
                            <NightSpotlights />
                            <div className={styles.portraitVisual} data-portrait-visual>
                                <Image src="/new-year-night-2027/irakliy-smile.webp" width={960} height={1200} alt="Ираклий с лёгкой улыбкой, ведущий новогодней ночи в CONGA" priority sizes="(max-width: 700px) 80vw, (max-width: 1100px) 42vw, 420px" />
                            </div>
                        </div>
                        <figcaption><strong>Ираклий</strong><span>Ведущий новогодней ночи в CONGA</span></figcaption>
                    </figure>
                </section>

                <section id="night-program" className={styles.program} aria-labelledby="program-title">
                    <div className={styles.sectionTitle}><span /><h2 id="program-title">В программе вечера</h2><span /></div>
                    <p className={styles.programNote}>Развлекательная программа только в зале CONGA</p>
                    <dl className={styles.timeline}>
                        <div><dt>22:00</dt><dd>Сбор гостей</dd></div>
                        <div><dt>22:30</dt><dd>Начало программы</dd></div>
                        <div><dt>04:00</dt><dd>Завершение вечера</dd></div>
                    </dl>
                    <ul className={styles.programList}>
                        {program.map(title => <li key={title}>{title}</li>)}
                    </ul>
                </section>

                <section id="night-booking" className={styles.booking} aria-labelledby="booking-title">
                    <h2 id="booking-title">Бронирование</h2>
                    <div className={styles.venues}>
                        <article className={styles.venue}>
                            <h3>Зал CONGA</h3>
                            <p className={styles.price}>15 000 ₽ <span>/ чел.</span></p>
                            <p className={styles.venueDescription}>Праздничный стол и развлекательная программа с Ираклием.</p>
                            <p className={styles.venueTime}>Сбор в 22:00 · программа 22:30–04:00</p>
                        </article>
                        <article className={styles.venue}>
                            <h3>Банкетные залы</h3>
                            <p className={styles.price}>8 000 ₽ <span>/ чел.</span></p>
                            <p className={styles.venueDescription}>Любимые традиционные блюда новогоднего стола для вашей компании.</p>
                            <p className={styles.venueTime}>22:00–04:00 · без развлекательной программы</p>
                        </article>
                    </div>
                    <p className={styles.contactHint}>Позвоните администраторам, чтобы уточнить свободные места и забронировать стол.</p>
                    <div className={styles.phones}>{SITE.phones.map((phone, i) => <a href={`tel:${phone.tel}`} key={phone.tel} className={i === 0 ? styles.primary : styles.secondary}><Phone size={18} aria-hidden="true" />{phone.label}</a>)}</div>
                    <p className={styles.address}>{SITE.address}</p>
                </section>
            </main>
        </div>
        <ForestFooter />
    </>;
}
