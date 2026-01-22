'use client';

import React, { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '../../../lib/supabase/client';

interface Page {
    slug: string;
    title: string;
    content: any; // JSONB content
    updated_at: string;
}

export default function AdminPagesPage() {
    const [loading, setLoading] = useState(true);
    const [pages, setPages] = useState<Page[]>([]);
    const [selectedSlug, setSelectedSlug] = useState('');
    const [currentPage, setCurrentPage] = useState<Page | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const load = async () => {
            const supabase = createSupabaseBrowserClient() as any;
            if (!supabase) {
                setError('Supabase не настроен');
                setLoading(false);
                return;
            }

            const { data, error: pagesError } = await supabase
                .from('pages')
                .select('slug, title, content, updated_at')
                .order('slug', { ascending: true });

            if (pagesError) {
                setError(pagesError.message);
                setLoading(false);
                return;
            }

            setPages(data || []);
            if (data?.[0]) {
                setSelectedSlug(data[0].slug);
                setCurrentPage(data[0]);
            }
            setLoading(false);
        };

        load();
    }, []);

    useEffect(() => {
        if (!selectedSlug) return;
        const page = pages.find((p) => p.slug === selectedSlug) || null;
        setCurrentPage(page);
    }, [selectedSlug, pages]);

    const handleContentChange = (value: string) => {
        try {
            const parsed = JSON.parse(value);
            setCurrentPage((prev) => (prev ? { ...prev, content: parsed } : prev));
            setError('');
        } catch {
            // Игнорируем до сохранения, но подсказка через error при сабмите
        }
    };

    const handleSave = async () => {
        if (!currentPage) return;

        setSaving(true);
        setError('');

        const supabase = createSupabaseBrowserClient() as any;
        if (!supabase) {
            setError('Supabase не настроен');
            setSaving(false);
            return;
        }

        const { error: updateError } = await supabase
            .from('pages')
            .update({
                title: currentPage.title,
                content: currentPage.content,
            })
            .eq('slug', currentPage.slug);

        if (updateError) {
            setError(updateError.message);
        }

        setSaving(false);
    };

    if (loading) {
        return <div>Загрузка страниц...</div>;
    }

    return (
        <div className="space-y-4">
            <h1 className="text-xl font-bold">Страницы</h1>

            {error && (
                <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                    {error}
                </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
                <select
                    value={selectedSlug}
                    onChange={(e) => setSelectedSlug(e.target.value)}
                    className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-400"
                >
                    {pages.map((p) => (
                        <option key={p.slug} value={p.slug}>
                            {p.slug} — {p.title}
                        </option>
                    ))}
                </select>
            </div>

            {currentPage && (
                <div className="space-y-3">
                    <div>
                        <label className="block text-sm mb-1">Заголовок</label>
                        <input
                            value={currentPage.title || ''}
                            onChange={(e) =>
                                setCurrentPage((prev) =>
                                    prev ? { ...prev, title: e.target.value } : prev,
                                )
                            }
                            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 outline-none focus:border-amber-400"
                        />
                    </div>

                    <div>
                        <label className="block text-sm mb-1">
                            Контент (JSON, под будущий WYSIWYG)
                        </label>
                        <textarea
                            rows={14}
                            defaultValue={JSON.stringify(currentPage.content || {}, null, 2)}
                            onChange={(e) => handleContentChange(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 font-mono text-xs outline-none focus:border-amber-400"
                        />
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-4 py-2 rounded-full bg-amber-400 text-black font-semibold text-sm hover:bg-amber-300 disabled:opacity-60"
                    >
                        {saving ? 'Сохранение...' : 'Сохранить'}
                    </button>
                </div>
            )}
        </div>
    );
}
