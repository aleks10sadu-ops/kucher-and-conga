const translations: Record<string, string> = {
    conga: 'Конга', kucher: 'Кучер', welcome: 'Приветственный', telegram: 'Телеграм',
    bbq: 'барбекю', prime: 'Прайм', rich: 'Рич', darbas: 'Дарбас', cola: 'Кола',
    borjomi: 'Боржоми', 'bona aqua': 'Бон Аква', iiko: 'Айко',
};

// Переводим только текст: адреса, почта и атрибуты HTML остаются исходными.
export function russianPublicText(value: string): string {
    return value.split(/(<[^>]*>|https?:\/\/[^\s<]+|[\w.+-]+@[\w.-]+\.[a-z]+)/gi)
        .map((part, index) => index % 2 ? part : part
            .replace(/\b(Bona\s+Aqua|Conga|Kucher|Welcome|Telegram|BBQ|PRIME|Rich|Darbas|Cola|Borjomi|iiko)\b/gi,
                (word) => translations[word.toLowerCase().replace(/\s+/g, ' ')])
            .replace(/Кучер\s*&(?:amp;)?\s*Конга/g, 'Кучер и Конга'))
        .join('');
}

export function russianPublicPost<T extends { title: string; excerpt?: string | null; content?: string | null }>(post: T): T {
    return {
        ...post,
        title: russianPublicText(post.title),
        ...(post.excerpt != null ? { excerpt: russianPublicText(post.excerpt) } : {}),
        ...(post.content != null ? { content: russianPublicText(post.content) } : {}),
    };
}
