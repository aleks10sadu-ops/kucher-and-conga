'use client';

// Лёгкое поле спор для внутренних страниц: споры дрейфуют в пустых местах фона,
// реагируют на ветер курсора (резкий рывок сдувает, аккуратное подведение — лопает
// с разлётом и респавном), курсор оставляет прорастающий след-папоротник.
// Самодостаточно (без счётчика лендинга): кладётся абсолютным слоем в relative-контейнер.

import React, { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

type Spore = { id: number; top: string; left: string; size: number };

const rnd = (seed: number) => { const x = Math.sin(seed) * 10000; return x - Math.floor(x); };
const FILAMENTS = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2;
    return { x: +(12 + Math.cos(a) * 10).toFixed(2), y: +(12 + Math.sin(a) * 10).toFixed(2) };
});
const FERN = Array.from({ length: 9 }, (_, i) => {
    const p = i / 9;
    return { y: +(42 - p * 38).toFixed(2), len: +(11 * (1 - p * 0.72)).toFixed(2) };
});

function SporeGlyph() {
    return (
        <svg viewBox="0 0 24 24" width="100%" height="100%" style={{ display: 'block', overflow: 'visible' }}>
            <g stroke="rgba(246,249,243,0.72)" strokeWidth={1} strokeLinecap="round">
                {FILAMENTS.map((f, i) => (
                    <g key={i}>
                        <line x1={12} y1={12} x2={f.x} y2={f.y} />
                        <circle cx={f.x} cy={f.y} r={0.9} fill="rgba(246,249,243,0.85)" stroke="none" />
                    </g>
                ))}
            </g>
            <circle cx={12} cy={12} r={2.4} fill="#F6F9F3" />
        </svg>
    );
}

function FernGlyph() {
    return (
        <svg viewBox="0 0 30 46" width="30" height="46" style={{ display: 'block', overflow: 'visible' }}>
            <g stroke="rgba(246,249,243,0.85)" strokeWidth={1.4} strokeLinecap="round" fill="none">
                <path d="M15 46 C 15 34, 13 20, 15 4" />
                {FERN.map((n, i) => (
                    <g key={i} strokeWidth={1.1}>
                        <path d={`M15 ${n.y} C ${15 - n.len * 0.5} ${n.y - 1}, ${15 - n.len} ${n.y - n.len * 0.5}, ${15 - n.len} ${n.y - n.len}`} />
                        <path d={`M15 ${n.y} C ${15 + n.len * 0.5} ${n.y - 1}, ${15 + n.len} ${n.y - n.len * 0.5}, ${15 + n.len} ${n.y - n.len}`} />
                    </g>
                ))}
            </g>
        </svg>
    );
}

function Fern({ x, y, rot, scale }: { x: number; y: number; rot: number; scale: number }) {
    return (
        <motion.span
            initial={{ opacity: 0, scale: 0.15 }}
            animate={{ opacity: [0, 1, 1, 0], scale: [0.15, scale, scale, scale * 0.55] }}
            transition={{ duration: 1, ease: 'easeOut', times: [0, 0.32, 0.66, 1] }}
            style={{ position: 'absolute', left: x, top: y, width: 30, height: 46, marginLeft: -15, marginTop: -46, transformOrigin: '50% 100%', rotate: rot, filter: 'drop-shadow(0 0 6px rgba(244,247,242,0.5)) drop-shadow(0 0 2px rgba(122,190,122,0.55))' }}
        >
            <FernGlyph />
        </motion.span>
    );
}

function Burst({ left, top, size }: { left: number; top: number; size: number }) {
    const n = 8;
    return (
        <div style={{ position: 'absolute', left, top, width: 0, height: 0, pointerEvents: 'none' }}>
            {Array.from({ length: n }, (_, i) => {
                const a = (i / n) * Math.PI * 2;
                const d = size * 1.4 + (i % 3) * 8;
                const px = Math.max(3, Math.round(size * 0.22));
                return (
                    <motion.span key={i}
                        initial={{ opacity: 0.95, x: 0, y: 0, scale: 1 }}
                        animate={{ opacity: 0, x: Math.cos(a) * d, y: Math.sin(a) * d, scale: 0.2 }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                        style={{ position: 'absolute', left: -px / 2, top: -px / 2, width: px, height: px, borderRadius: '50%', background: 'radial-gradient(closest-side,#F6F9F3,rgba(194,148,85,0.5),transparent)' }}
                    />
                );
            })}
        </div>
    );
}

export default function SporeField({ count = 14, className = '' }: { count?: number; className?: string }) {
    const reduce = useReducedMotion();
    const rootRef = useRef<HTMLDivElement>(null);
    const makeInitial = (): Spore[] => Array.from({ length: count }, (_, i) => ({
        id: i,
        top: (5 + rnd(i * 12.9898) * 86).toFixed(2) + '%',
        left: (3 + rnd(i * 78.233) * 92).toFixed(2) + '%',
        size: Math.round(18 + rnd(i * 3.17) * 14),
    }));
    const [spores, setSpores] = useState<Spore[]>(makeInitial);
    const [ferns, setFerns] = useState<{ id: number; x: number; y: number; rot: number; scale: number }[]>([]);
    const [bursts, setBursts] = useState<{ id: number; left: number; top: number; size: number }[]>([]);
    const sporesRef = useRef(spores);
    const spanRefs = useRef(new Map<number, HTMLElement>());
    const runtime = useRef(new Map<number, { x: number; y: number; vx: number; vy: number; ph: number }>());
    const popping = useRef(new Set<number>());
    const mouse = useRef({ x: -9999, y: -9999, in: false, spd: 0 });
    const lastFern = useRef({ x: 0, y: 0, t: 0 });
    const idRef = useRef(10000);

    useEffect(() => { sporesRef.current = spores; }, [spores]);

    const pop = (id: number, px: number, py: number, size: number) => {
        if (popping.current.has(id)) return;
        popping.current.add(id);
        const bid = idRef.current++;
        setBursts((b) => [...b, { id: bid, left: px, top: py, size }]);
        setTimeout(() => { setBursts((b) => b.filter((z) => z.id !== bid)); popping.current.delete(id); }, 700);
        runtime.current.delete(id);
        spanRefs.current.delete(id);
        const repl: Spore = {
            id: idRef.current++,
            top: (5 + Math.random() * 86).toFixed(2) + '%',
            left: (3 + Math.random() * 92).toFixed(2) + '%',
            size: Math.round(18 + Math.random() * 14),
        };
        setSpores((prev) => prev.filter((z) => z.id !== id).concat(repl));
    };

    const spawnFern = (x: number, y: number) => {
        const id = idRef.current++;
        const rot = Math.random() * 44 - 22;
        const scale = 0.72 + Math.random() * 0.6;
        setFerns((f) => (f.length > 20 ? f.slice(1) : f).concat({ id, x, y, rot, scale }));
        setTimeout(() => setFerns((f) => f.filter((z) => z.id !== id)), 1050);
    };

    useEffect(() => {
        if (reduce) return;
        const onMove = (e: PointerEvent) => {
            const el = rootRef.current; if (!el) return;
            const r = el.getBoundingClientRect();
            const x = e.clientX - r.left, y = e.clientY - r.top;
            const m = mouse.current;
            const inb = x >= 0 && y >= 0 && x <= r.width && y <= r.height;
            m.spd = Math.min(70, Math.hypot(x - m.x, y - m.y));
            m.x = x; m.y = y; m.in = inb;
            if (inb) {
                const lf = lastFern.current;
                const now = performance.now();
                if (Math.hypot(x - lf.x, y - lf.y) > 44 && now - lf.t > 55) {
                    lf.x = x; lf.y = y; lf.t = now;
                    spawnFern(x, y);
                }
            }
        };
        window.addEventListener('pointermove', onMove, { passive: true });
        return () => window.removeEventListener('pointermove', onMove);
    }, [reduce]);

    useEffect(() => {
        if (reduce) return;
        let raf = 0, t0 = 0;
        const R = 155;
        const loop = (t: number) => {
            if (!t0) t0 = t;
            const time = (t - t0) / 1000;
            const el = rootRef.current;
            const w = el ? el.clientWidth : 1000, h = el ? el.clientHeight : 1000;
            const m = mouse.current;
            for (const s of sporesRef.current) {
                const bx = (parseFloat(s.left) / 100) * w;
                const by = (parseFloat(s.top) / 100) * h;
                let rt = runtime.current.get(s.id);
                if (!rt) { rt = { x: bx, y: by, vx: 0, vy: 0, ph: (s.id % 12) * 0.7 }; runtime.current.set(s.id, rt); }
                const ax = bx + Math.sin(time * 0.5 + rt.ph) * 9;
                const ay = by + Math.cos(time * 0.42 + rt.ph * 1.3) * 11;
                if (m.in) {
                    const dx = rt.x - m.x, dy = rt.y - m.y;
                    const dist = Math.hypot(dx, dy) || 1;
                    if (dist < R) {
                        const f = 1 - dist / R;
                        const push = f * (0.32 + m.spd * 0.045);
                        rt.vx += (dx / dist) * push;
                        rt.vy += (dy / dist) * push;
                        if (dist < 26 && m.spd < 30) pop(s.id, rt.x, rt.y, s.size);
                    }
                }
                rt.vx += (ax - rt.x) * 0.02;
                rt.vy += (ay - rt.y) * 0.02;
                rt.vx *= 0.87; rt.vy *= 0.87;
                rt.x += rt.vx; rt.y += rt.vy;
                const node = spanRefs.current.get(s.id);
                if (node) node.style.transform = `translate(${(rt.x - bx).toFixed(2)}px,${(rt.y - by).toFixed(2)}px)`;
            }
            m.spd *= 0.9;
            raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(raf);
    }, [reduce]);

    return (
        <>
            <div ref={rootRef} aria-hidden className={className} style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
                {spores.map((s) => (
                    <span key={s.id}
                        ref={(n) => { if (n) spanRefs.current.set(s.id, n); else spanRefs.current.delete(s.id); }}
                        style={{ position: 'absolute', top: s.top, left: s.left, width: s.size, height: s.size, willChange: 'transform', opacity: reduce ? 0.6 : 0.85, filter: 'drop-shadow(0 0 8px rgba(244,247,242,0.5)) drop-shadow(0 0 3px rgba(194,148,85,0.55))' }}
                    >
                        <SporeGlyph />
                    </span>
                ))}
            </div>
            <div aria-hidden style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
                {ferns.map((f) => <Fern key={f.id} x={f.x} y={f.y} rot={f.rot} scale={f.scale} />)}
                {bursts.map((b) => <Burst key={b.id} left={b.left} top={b.top} size={b.size} />)}
            </div>
        </>
    );
}
