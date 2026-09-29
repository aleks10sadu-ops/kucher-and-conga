'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import Image from 'next/image';
import { ArrowRight, CalendarDays, Clock3, Mic2, Music2, Phone, Snowflake } from 'lucide-react';
import { SITE } from '../../components/forest/site';
import ForestHeader from '../../components/forest/ForestHeader';
import ForestFooter from '../../components/forest/ForestFooter';
import content from './content.ru.json';
import styles from './night.module.css';

const assetRoot = '/new-year-night-2027/';
const primaryPhone = SITE.phones[0];
const motionKey = 'new-year-night-motion';

function BookingLink() {
  return <a className={styles.primary} href={`tel:${primaryPhone.tel}`} aria-label={`${content.event.cta} по телефону ${primaryPhone.label}`}>
    {content.event.cta}<ArrowRight size={19} aria-hidden="true" />
  </a>;
}

function DiscoBall() {
  return <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
    <path d="M24 2v8M20 5h8M7 30h34M10 21h28M10 39h28M24 12v34" />
    <circle cx="24" cy="29" r="17" /><ellipse cx="24" cy="29" rx="8" ry="17" />
    <path d="m39 7 1.5 3.5L44 12l-3.5 1.5L39 17l-1.5-3.5L34 12l3.5-1.5Z" />
  </svg>;
}

function Cheers() {
  return <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <g transform="rotate(18 15 27)">
      <path d="M9 11h12l-1 15a5 5 0 0 1-10 0ZM15 31v12M10 43h10M10 19h10" />
    </g>
    <g transform="rotate(-18 33 27)">
      <path d="M27 11h12l-1 15a5 5 0 0 1-10 0ZM33 31v12M28 43h10M28 19h10" />
    </g>
    <path d="M24 2v4m-7-3 3 4m11-4-3 4" />
  </svg>;
}

const stageIcons = [Cheers, Mic2, DiscoBall];

export default function NewYearNight() {
  const [motionEnabled, setMotionEnabled] = useState(false);

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncPreference = () => {
      let saved: string | null = null;
      try { saved = window.localStorage.getItem(motionKey); } catch { /* Storage may be unavailable. */ }
      setMotionEnabled(!preference.matches && saved !== 'off');
    };
    syncPreference();
    preference.addEventListener('change', syncPreference);
    return () => preference.removeEventListener('change', syncPreference);
  }, []);

  const toggleMotion = () => {
    const next = !motionEnabled;
    setMotionEnabled(next);
    try { window.localStorage.setItem(motionKey, next ? 'on' : 'off'); } catch { /* The toggle still works in this tab. */ }
  };

  return <>
    <ForestHeader />
    <div className={styles.page} data-motion={motionEnabled ? 'on' : 'off'}>
    <a href="#night-main" className={styles.skip}>Перейти к афише</a>
    <div className={styles.edgeLeft} aria-hidden="true" />
    <div className={styles.edgeRight} aria-hidden="true" />
    <div className={styles.cornerLeft} aria-hidden="true" />
    <div className={styles.cornerRight} aria-hidden="true" />
    <div className={styles.snow} aria-hidden="true">
      {Array.from({ length: 12 }, (_, i) => <i key={i} style={{
        '--x': i % 2 ? `${98 + i % 3 * .5}%` : `${i % 3 * .5}%`,
        '--duration': `${22 + i % 7}s`, '--delay': `${-i * 3.1}s`,
      } as CSSProperties} />)}
    </div>

    <main id="night-main">
      <section className={styles.hero} aria-labelledby="night-title">
        <div className={styles.heroImage}>
          <Image src={`${assetRoot}conga-stage-guests-v4.webp`} alt="Иллюстрация новогодней ночи у сцены CONGA: ведущий, гости и две праздничные ёлки" fill priority unoptimized />
        </div>
        <div className={styles.heroShade} aria-hidden="true" />
        <div className={styles.heroContent}>
          <h1 id="night-title">Новогодняя<br />ночь 2027</h1>
          <p className={styles.heroBrand}>в Кучер &amp; Conga</p>
          <div className={styles.heroFacts}>
            <p><CalendarDays aria-hidden="true" />{content.event.dateText}</p>
            <p><Clock3 aria-hidden="true" />Сбор гостей с {content.event.gatheringTime}</p>
            <p><Cheers />Программа {content.event.programTime}</p>
          </div>
          <BookingLink />
        </div>
      </section>

      <div className={styles.inner}>
        <section id="night-conga" className={styles.conga} aria-labelledby="conga-title">
          <div className={styles.congaImage}>
            <Image src={`${assetRoot}conga-dining.webp`} alt="Иллюстрация зала CONGA: панорамные окна, подвешенная зелень, узнаваемые светильники и гости за столами" fill sizes="(max-width: 760px) 100vw, 55vw" />
          </div>
          <div className={styles.congaCopy}>
            <h2 id="conga-title">{content.conga.title}</h2>
            <p className={styles.price}>{content.conga.priceLabel}</p>
            <p>{content.conga.intro}</p>
            <p>{content.conga.description}</p>
            <div className={styles.congaMeta}>
              <span><Music2 aria-hidden="true" />Живая<br />музыка</span>
              <span><Cheers />Праздничный<br />стол</span>
              <span><DiscoBall />Танцы<br />до утра</span>
            </div>
          </div>
        </section>

        <section id="night-program" className={styles.program} aria-labelledby="program-title">
          <h2 id="program-title">Праздничная программа</h2>
          <div className={styles.overview}>
            {content.program.overview.map((item, index) => {
              const Icon = stageIcons[index];
              return <article key={item.title}>
                <Icon aria-hidden="true" />
                <div>
                  <h3>{index + 1}. {item.title}</h3>
                  <p>{item.description}</p>
                  <span className={styles.overviewTime}>{item.time}</span>
                </div>
              </article>;
            })}
          </div>
          <ol className={styles.fullProgram}>
            {content.program.fullItems.map(item => <li key={item}>{item}</li>)}
          </ol>
          <p className={styles.programEnd}>Встречаем Новый год в ночь с 31 декабря на 1 января. Программа до 04:00.</p>
        </section>

        <section id="night-private" className={styles.private} aria-labelledby="private-title">
          <div className={styles.privateCopy}>
            <h2 id="private-title">{content.privateHalls.title}</h2>
            <p className={styles.price}>{content.privateHalls.priceLabel}</p>
            <p>{content.privateHalls.description}</p>
            <p className={styles.privateTime}><Clock3 size={23} aria-hidden="true" />{content.privateHalls.time}</p>
          </div>
          <div className={styles.privateImage}>
            <Image src={`${assetRoot}private-company.webp`} alt="Иллюстрация отдельного банкетного зала: гости за деревянным столом без скатерти" fill sizes="(max-width: 760px) 100vw, 58vw" />
          </div>
        </section>

        <section id="night-gallery" className={styles.gallery} aria-labelledby="gallery-title">
          <h2 id="gallery-title" className={styles.visuallyHidden}>Атмосфера новогодней ночи</h2>
          <div className={styles.galleryGrid}>
            {content.gallery.map(item => <figure key={item.image}>
              <div className={styles.galleryImage}><Image src={`${assetRoot}${item.image}`} alt={item.alt} fill sizes="(max-width: 760px) 50vw, 25vw" /></div>
              <figcaption>{item.title}</figcaption>
            </figure>)}
          </div>
        </section>
      </div>

    </main>

    <div className={styles.finale}>
      <div className={styles.winterScene} aria-hidden="true" />
      <section id="night-booking" className={styles.booking} aria-labelledby="booking-title">
        <h2 id="booking-title">{content.booking.titleLines.map((line, index) => <span key={line}>{index > 0 && ' '}{line}</span>)}</h2>
        <p>{content.booking.description}</p>
        <BookingLink />
        <div className={styles.phones}>
          {SITE.phones.map(phone => <a key={phone.tel} href={`tel:${phone.tel}`}><Phone size={16} aria-hidden="true" />{phone.label}</a>)}
        </div>
        <p className={styles.address}>{SITE.address}</p>
      </section>
    <div className={styles.motionControls}>
      <button type="button" className={styles.motionToggle} onClick={toggleMotion} aria-pressed={motionEnabled}>
        <Snowflake size={16} aria-hidden="true" />{motionEnabled ? 'Выключить снег' : 'Включить снег'}
      </button>
    </div>
    </div>
    </div>
    <ForestFooter />
  </>;
}
