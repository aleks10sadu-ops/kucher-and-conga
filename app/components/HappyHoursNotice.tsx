export default function HappyHoursNotice({ context }: { context: 'pickup' | 'booking' }) {
    return (
        <div role="status" className="rounded-xl border border-brass/35 bg-brass/10 p-4 text-sm text-cream">
            <p className="font-semibold text-brass">Сейчас действуют Счастливые часы — скидка 20%</p>
            <p className="mt-1 leading-relaxed text-cream/80">
                {context === 'pickup'
                    ? 'Скидка доступна на самовывоз.'
                    : 'Скидка доступна при заказе в ресторане для столиков до 8 взрослых включительно.'}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-cream/60">
                В праздничные дни не действует. {context === 'booking' && 'На банкетные меню скидка не распространяется. '}Скидки не суммируются — применяется наибольшая.
            </p>
        </div>
    );
}
