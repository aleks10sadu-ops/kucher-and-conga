import styles from './night.module.css';

const lights = [
    { kind: 'key', color: '#ffdfa3' },
    { kind: 'fill', color: '#fff1db' },
] as const;

export default function NightSpotlights() {
    return <div className={styles.spotlights} data-spotlights aria-hidden="true">
        {lights.map(({ kind, color }) => {
            const id = `night-spotlight-${kind}`;
            return <div key={kind} className={`${styles.spotlight} ${kind === 'key' ? styles.spotlightKey : styles.spotlightFill}`} data-spotlight={kind}>
                <svg className={styles.lightBeam} viewBox="0 0 300 700" preserveAspectRatio="none" aria-hidden="true">
                    <defs>
                        <linearGradient id={`${id}-length`} x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0" stopColor={color} stopOpacity=".86" />
                            <stop offset=".16" stopColor={color} stopOpacity=".48" />
                            <stop offset=".56" stopColor={color} stopOpacity=".19" />
                            <stop offset="1" stopColor={color} stopOpacity="0" />
                        </linearGradient>
                        <filter id={`${id}-soft`} x="-40%" y="-20%" width="180%" height="140%" colorInterpolationFilters="sRGB"><feGaussianBlur stdDeviation="7" /></filter>
                        <filter id={`${id}-core`} x="-40%" y="-20%" width="180%" height="140%" colorInterpolationFilters="sRGB"><feGaussianBlur stdDeviation="12" /></filter>
                    </defs>
                    <path d="M143 0H157L288 700H12Z" fill={`url(#${id}-length)`} filter={`url(#${id}-soft)`} />
                    <path d="M147 0H153L225 650H75Z" fill={`url(#${id}-length)`} opacity=".36" filter={`url(#${id}-core)`} />
                </svg>
                <svg className={styles.lightFixture} data-light-fixture viewBox="0 0 80 24" aria-hidden="true">
                    <defs>
                        <linearGradient id={`${id}-metal`} x1="0" y1="0" x2="1" y2="1">
                            <stop stopColor="#593127" /><stop offset=".35" stopColor="#bb8b52" /><stop offset=".7" stopColor="#805234" /><stop offset="1" stopColor="#3c1919" />
                        </linearGradient>
                        <radialGradient id={`${id}-lens`}>
                            <stop stopColor="#fff7de" /><stop offset=".64" stopColor={color} /><stop offset="1" stopColor="#bc8046" />
                        </radialGradient>
                    </defs>
                    <ellipse cx="40" cy="12" rx="32" ry="9" fill="#48201e" />
                    <ellipse cx="40" cy="12" rx="29" ry="7" fill={`url(#${id}-metal)`} />
                    <ellipse cx="40" cy="12" rx="24" ry="4.5" fill={`url(#${id}-lens)`} />
                    <path d="M15 14Q40 24 65 14" fill="none" stroke="#efcd91" strokeOpacity=".6" strokeWidth=".9" />
                </svg>
            </div>;
        })}
    </div>;
}
