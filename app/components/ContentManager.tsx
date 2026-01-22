'use client';

import React, { useState, useEffect, useCallback, ChangeEvent } from 'react';
import { X, Plus, Edit2, Save, Trash2, Eye, EyeOff } from 'lucide-react';
import { createSupabaseBrowserClient } from '../../lib/supabase/client';
import { uploadImage, isSupabaseStorageUrl, type ContentType } from '../../lib/supabase/storage';

// Типы для поста
export interface Post {
    id?: number | string;
    title: string;
    slug: string;
    content: string;
    excerpt: string;
    image_url: string; // Может быть пустой строкой, поэтому string, а не string | null в начальном состоянии
    is_published: boolean;
    category?: string;
    created_at?: string;
    updated_at?: string;
    published_at?: string | null;
    created_by?: string;
}

// Начальное состояние для новой записи
const INITIAL_POST_STATE: Post = {
    title: '',
    slug: '',
    content: '',
    excerpt: '',
    image_url: '',
    is_published: true,
};

// Названия категорий
const CATEGORY_NAMES: Record<string, string> = {
    vacancies: 'Вакансии',
    events: 'События',
    blog: 'Новостной блог',
    halls: 'Залы',
};

interface ContentManagerProps {
    category: string;
    isOpen: boolean;
    onClose: () => void;
}

export default function ContentManager({ category, isOpen, onClose }: ContentManagerProps) {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingPost, setEditingPost] = useState<Post | null>(null);
    const [newPost, setNewPost] = useState<Post>(INITIAL_POST_STATE);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    // Получаем текущую редактируемую запись (либо editingPost, либо newPost)
    const currentPost = editingPost || newPost;
    const isEditMode = !!editingPost;

    // Универсальный обработчик изменения полей формы
    const handleFieldChange = useCallback((field: keyof Post, value: any) => {
        if (editingPost) {
            setEditingPost(prev => prev ? ({ ...prev, [field]: value }) : null);
        } else {
            setNewPost(prev => ({ ...prev, [field]: value }));
        }
    }, [editingPost]);

    // Сброс формы
    const resetForm = useCallback(() => {
        setEditingPost(null);
        setNewPost(INITIAL_POST_STATE);
        setImagePreview(null);
    }, []);

    useEffect(() => {
        if (isOpen) {
            loadPosts();
        }
    }, [isOpen, category]);

    const loadPosts = async () => {
        setLoading(true);
        try {
            const supabase = createSupabaseBrowserClient() as any;
            if (!supabase) {
                setLoading(false);
                return;
            }

            const { data, error } = await supabase
                .from('content_posts')
                .select('*')
                .eq('category', category)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error loading posts:', error);
                setPosts([]);
            } else {
                setPosts(data || []);
            }
        } catch (err) {
            console.error('Error:', err);
            setPosts([]);
        } finally {
            setLoading(false);
        }
    };

    const generateSlug = (title: string): string => {
        return title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    };

    const handleSave = async (post: Post) => {
        try {
            const supabase = createSupabaseBrowserClient() as any;
            if (!supabase) return;

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                alert('Необходимо войти в систему');
                return;
            }

            if (!post.title.trim() || !post.content.trim()) {
                alert('Заголовок и содержание обязательны');
                return;
            }

            const slug = post.slug || generateSlug(post.title);

            // Отладочная информация
            console.log('Сохранение записи:', {
                id: post.id,
                title: post.title,
                image_url: post.image_url,
                hasImage: !!post.image_url,
                isSupabaseUrl: post.image_url ? isSupabaseStorageUrl(post.image_url) : false
            });

            if (post.id) {
                // Обновление
                const { error } = await supabase
                    .from('content_posts')
                    .update({
                        title: post.title,
                        slug: slug,
                        content: post.content,
                        excerpt: post.excerpt || null,
                        image_url: post.image_url || null,
                        is_published: post.is_published,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', post.id);

                if (error) {
                    alert('Ошибка сохранения: ' + error.message);
                    return;
                }
            } else {
                // Создание
                const { data: newPostData, error } = await supabase
                    .from('content_posts')
                    .insert({
                        category: category,
                        title: post.title,
                        slug: slug,
                        content: post.content,
                        excerpt: post.excerpt || null,
                        image_url: post.image_url || null,
                        is_published: post.is_published,
                        published_at: post.is_published ? new Date().toISOString() : null,
                        created_by: user.id,
                    })
                    .select()
                    .single();

                if (error) {
                    alert('Ошибка создания: ' + error.message);
                    return;
                }

                // Если изображение было загружено в temp, перемещаем его в папку с ID записи
                let finalImageUrl = post.image_url;
                if (newPostData && post.image_url && isSupabaseStorageUrl(post.image_url)) {
                    try {
                        // Извлекаем путь к файлу из URL
                        const urlParts = post.image_url.split('/');
                        const bucketIndex = urlParts.indexOf('public');
                        if (bucketIndex !== -1 && bucketIndex < urlParts.length - 1) {
                            const bucketName = urlParts[bucketIndex + 1];
                            const oldPath = urlParts.slice(bucketIndex + 2).join('/');

                            // Если файл в temp, перемещаем его
                            if (oldPath.includes('/temp/')) {
                                const fileName = oldPath.split('/temp/')[1];
                                const newPath = `${category}/${newPostData.id}/${fileName}`;

                                console.log('Перемещение изображения:', { oldPath, newPath, bucketName });

                                // Проверяем, что исходный файл существует
                                const { data: oldFileData, error: oldFileError } = await supabase.storage
                                    .from(bucketName)
                                    .list(oldPath.split('/').slice(0, -1).join('/'), {
                                        search: oldPath.split('/').pop()
                                    });

                                if (oldFileError || !oldFileData || oldFileData.length === 0) {
                                    console.error('❌ Исходный файл не найден в temp:', oldPath);
                                    console.error('Ошибка:', oldFileError);
                                    alert('Внимание: Файл не найден в временной папке. Возможно, он был удален. Проверьте Storage.');
                                } else {
                                    console.log('✅ Исходный файл найден:', oldFileData);

                                    // Копируем файл в новое место
                                    const { data: copyData, error: copyError } = await supabase.storage
                                        .from(bucketName)
                                        .copy(oldPath, newPath);

                                    if (copyError) {
                                        console.error('❌ Ошибка копирования изображения:', copyError);
                                        console.error('Детали:', {
                                            oldPath,
                                            newPath,
                                            bucketName,
                                            error: copyError.message
                                        });
                                        alert(`Ошибка перемещения файла: ${copyError.message}. URL останется временным.`);
                                    } else {
                                        console.log('✅ Файл скопирован:', { oldPath, newPath });

                                        // Проверяем, что новый файл существует
                                        const { data: newFileData, error: newFileError } = await supabase.storage
                                            .from(bucketName)
                                            .list(newPath.split('/').slice(0, -1).join('/'), {
                                                search: newPath.split('/').pop()
                                            });

                                        if (newFileError || !newFileData || newFileData.length === 0) {
                                            console.error('❌ Новый файл не найден после копирования:', newPath);
                                            alert('Файл скопирован, но не найден в новом месте. Проверьте Storage.');
                                        } else {
                                            console.log('✅ Новый файл подтвержден:', newFileData);

                                            // Получаем новый URL
                                            const { data: { publicUrl } } = supabase.storage
                                                .from(bucketName)
                                                .getPublicUrl(newPath);

                                            console.log('✅ Файл скопирован, новый URL:', publicUrl);

                                            // Обновляем URL в базе данных
                                            const { error: updateError } = await supabase
                                                .from('content_posts')
                                                .update({ image_url: publicUrl })
                                                .eq('id', newPostData.id);

                                            if (updateError) {
                                                console.error('❌ Ошибка обновления URL изображения:', updateError);
                                                alert('Изображение загружено, но не удалось обновить URL. Попробуйте обновить запись вручную.');
                                            } else {
                                                console.log('✅ Изображение успешно перемещено и URL обновлен:', publicUrl);
                                                finalImageUrl = publicUrl;

                                                // Проверяем, что URL действительно обновился
                                                const { data: verifyData, error: verifyError } = await supabase
                                                    .from('content_posts')
                                                    .select('image_url')
                                                    .eq('id', newPostData.id)
                                                    .single();

                                                if (!verifyError && verifyData) {
                                                    console.log('✅ Проверка: URL в базе данных после обновления:', verifyData.image_url);
                                                    if (verifyData.image_url !== publicUrl) {
                                                        console.warn('⚠️ ВНИМАНИЕ: URL в базе данных не совпадает с ожидаемым!');
                                                        console.warn('Ожидалось:', publicUrl);
                                                        console.warn('В базе:', verifyData.image_url);
                                                    }
                                                }
                                            }

                                            // Удаляем старый файл из temp только после успешного копирования
                                            const { error: removeError } = await supabase.storage
                                                .from(bucketName)
                                                .remove([oldPath]);

                                            if (removeError) {
                                                console.warn('⚠️ Не удалось удалить временный файл:', removeError);
                                            } else {
                                                console.log('✅ Временный файл удален');
                                            }
                                        }
                                    }
                                }
                            } else {
                                // Файл уже не в temp, URL уже правильный
                                console.log('Изображение уже в правильной папке:', oldPath);
                            }
                        }
                    } catch (moveError) {
                        console.error('Ошибка перемещения изображения:', moveError);
                        alert('Изображение загружено, но произошла ошибка при перемещении. Проверьте консоль.');
                    }
                } else if (newPostData && post.image_url) {
                    // Логируем, если URL есть, но не из Supabase Storage
                    console.log('Изображение сохранено (внешний URL):', post.image_url);
                } else if (newPostData) {
                    console.log('Запись создана без изображения');
                }

                // Проверяем финальный URL в базе данных
                if (newPostData) {
                    const { data: checkData, error: checkError } = await supabase
                        .from('content_posts')
                        .select('image_url')
                        .eq('id', newPostData.id)
                        .single();

                    if (!checkError && checkData) {
                        console.log('Финальный URL в базе данных:', checkData.image_url);
                    }
                }
            }

            resetForm();

            // Небольшая задержка перед перезагрузкой, чтобы дать время обновиться URL
            await new Promise(resolve => setTimeout(resolve, 500));
            await loadPosts();
        } catch (err: any) {
            alert('Ошибка: ' + String(err?.message || err));
        }
    };

    const handleDelete = async (postId: number | string) => {
        if (!window.confirm('Удалить эту запись?')) return;
        try {
            const supabase = createSupabaseBrowserClient() as any;
            if (!supabase) return;

            const { error } = await supabase
                .from('content_posts')
                .delete()
                .eq('id', postId);

            if (error) {
                alert('Ошибка удаления: ' + error.message);
                return;
            }

            loadPosts();
        } catch (err: any) {
            alert('Ошибка: ' + String(err?.message || err));
        }
    };

    const handleTogglePublish = async (post: Post) => {
        if (!post.id) return;
        try {
            const supabase = createSupabaseBrowserClient() as any;
            if (!supabase) return;

            const { error } = await supabase
                .from('content_posts')
                .update({
                    is_published: !post.is_published,
                    published_at: !post.is_published ? new Date().toISOString() : post.published_at,
                })
                .eq('id', post.id);

            if (error) {
                alert('Ошибка: ' + error.message);
                return;
            }

            loadPosts();
        } catch (err: any) {
            alert('Ошибка: ' + String(err?.message || err));
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="bg-neutral-900 border border-white/10 rounded-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-neutral-900 border-b border-white/10 p-4 flex items-center justify-between">
                    <h2 className="text-2xl font-bold">Управление: {CATEGORY_NAMES[category]}</h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-white/10 transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {loading ? (
                        <div className="text-center py-12 text-neutral-400">Загрузка...</div>
                    ) : (
                        <>
                            {/* Форма добавления/редактирования */}
                            {(isEditMode || currentPost.title) && (
                                <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                                    <h3 className="text-lg font-bold mb-3">
                                        {isEditMode ? 'Редактировать запись' : 'Добавить новую запись'}
                                    </h3>
                                    <div className="space-y-3">
                                        <input
                                            type="text"
                                            value={currentPost.title}
                                            onChange={(e) => handleFieldChange('title', e.target.value)}
                                            placeholder="Заголовок"
                                            className="w-full bg-black/40 border border-white/20 rounded px-3 py-2 text-sm outline-none focus:border-amber-400"
                                        />
                                        <input
                                            type="text"
                                            value={currentPost.slug || generateSlug(currentPost.title)}
                                            onChange={(e) => handleFieldChange('slug', e.target.value)}
                                            placeholder="Slug (URL)"
                                            className="w-full bg-black/40 border border-white/20 rounded px-3 py-2 text-sm outline-none focus:border-amber-400"
                                        />
                                        <input
                                            type="text"
                                            value={currentPost.excerpt}
                                            onChange={(e) => handleFieldChange('excerpt', e.target.value)}
                                            placeholder="Краткое описание (необязательно)"
                                            className="w-full bg-black/40 border border-white/20 rounded px-3 py-2 text-sm outline-none focus:border-amber-400"
                                        />
                                        <div className="space-y-2">
                                            <label className="block text-sm text-neutral-300">Изображение</label>

                                            {/* Загрузка файла */}
                                            <label className="block cursor-pointer">
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={async (e: ChangeEvent<HTMLInputElement>) => {
                                                        const file = e.target.files?.[0];
                                                        if (!file) return;

                                                        // Проверяем размер файла (макс 5MB)
                                                        if (file.size > 5 * 1024 * 1024) {
                                                            alert('Размер файла не должен превышать 5MB');
                                                            return;
                                                        }

                                                        setUploadingImage(true);

                                                        try {
                                                            // Создаем preview
                                                            const reader = new FileReader();
                                                            reader.onloadend = () => {
                                                                setImagePreview(reader.result as string);
                                                            };
                                                            reader.readAsDataURL(file);

                                                            // Загружаем в Supabase Storage
                                                            // Для новых записей используем temp, для существующих - их ID
                                                            const postId = editingPost?.id || null;
                                                            const uploadedUrl = await uploadImage(file, category as ContentType, postId);

                                                            console.log('Изображение загружено:', {
                                                                uploadedUrl,
                                                                postId,
                                                                category,
                                                                urlType: typeof uploadedUrl,
                                                                urlLength: uploadedUrl?.length,
                                                                isValid: uploadedUrl && (uploadedUrl.startsWith('http://') || uploadedUrl.startsWith('https://') || uploadedUrl.startsWith('/'))
                                                            });

                                                            // Проверяем валидность URL перед сохранением
                                                            if (!uploadedUrl || (typeof uploadedUrl === 'string' && uploadedUrl.trim().length === 0)) {
                                                                throw new Error('Получен пустой URL изображения');
                                                            }

                                                            handleFieldChange('image_url', uploadedUrl);

                                                            // Preview оставляем для отображения
                                                        } catch (err: any) {
                                                            console.error('Ошибка загрузки изображения:', err);
                                                            alert(`Ошибка загрузки изображения: ${err.message}`);
                                                            setImagePreview(null);
                                                        } finally {
                                                            setUploadingImage(false);
                                                        }
                                                    }}
                                                    className="hidden"
                                                    disabled={uploadingImage}
                                                />
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 px-3 py-2 bg-black/40 border border-white/20 rounded text-sm text-neutral-300 hover:bg-black/60 transition text-center pointer-events-none">
                                                        {uploadingImage ? 'Загрузка...' : '📤 Загрузить изображение'}
                                                    </div>
                                                </div>
                                            </label>

                                            {/* Preview загружаемого изображения */}
                                            {imagePreview && (
                                                <div className="p-2 bg-white/5 rounded-lg">
                                                    <img
                                                        src={imagePreview}
                                                        alt="Preview"
                                                        className="w-full h-32 object-cover rounded"
                                                    />
                                                </div>
                                            )}

                                            {/* Или ввести URL вручную */}
                                            <div className="text-xs text-neutral-400 text-center">или</div>
                                            <input
                                                type="text"
                                                value={currentPost.image_url}
                                                onChange={(e) => handleFieldChange('image_url', e.target.value)}
                                                placeholder="Введите URL изображения (https://... или /local-image.webp)"
                                                className="w-full bg-black/40 border border-white/20 rounded px-3 py-2 text-sm outline-none focus:border-amber-400"
                                            />
                                            {currentPost.image_url && (
                                                <div className="text-xs text-neutral-500">
                                                    {isSupabaseStorageUrl(currentPost.image_url)
                                                        ? '✓ Изображение в Supabase Storage'
                                                        : 'Внешний URL'}
                                                </div>
                                            )}
                                        </div>
                                        <textarea
                                            value={currentPost.content}
                                            onChange={(e) => handleFieldChange('content', e.target.value)}
                                            placeholder="Содержание (HTML поддерживается)"
                                            rows={10}
                                            className="w-full bg-black/40 border border-white/20 rounded px-3 py-2 text-sm outline-none focus:border-amber-400 font-mono"
                                        />
                                        <div className="flex items-center gap-4">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={currentPost.is_published}
                                                    onChange={(e) => handleFieldChange('is_published', e.target.checked)}
                                                    className="rounded"
                                                />
                                                <span className="text-sm">Опубликовано</span>
                                            </label>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleSave(currentPost)}
                                                    className="px-4 py-2 rounded bg-amber-400 text-black font-semibold hover:bg-amber-300 text-sm"
                                                >
                                                    <Save className="w-4 h-4 inline mr-1" />
                                                    Сохранить
                                                </button>
                                                <button
                                                    onClick={resetForm}
                                                    className="px-4 py-2 rounded bg-white/10 text-white text-sm"
                                                >
                                                    Отмена
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Кнопка добавления новой записи */}
                            {!isEditMode && !currentPost.title && (
                                <button
                                    onClick={() => setNewPost({ ...INITIAL_POST_STATE, title: ' ' })}
                                    className="w-full px-4 py-3 rounded-lg bg-green-500 text-white font-semibold hover:bg-green-600 transition"
                                >
                                    <Plus className="w-4 h-4 inline mr-2" />
                                    Добавить новую запись
                                </button>
                            )}

                            {/* Список записей */}
                            <div className="space-y-3">
                                {posts.length === 0 ? (
                                    <div className="text-center py-12 text-neutral-400">
                                        Записей пока нет
                                    </div>
                                ) : (
                                    posts.map((post) => (
                                        <div key={post.id} className="p-4 bg-black/40 border border-white/10 rounded-lg">
                                            {editingPost?.id === post.id ? null : (
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <h4 className="font-semibold">{post.title}</h4>
                                                            {!post.is_published && (
                                                                <span className="px-2 py-0.5 rounded bg-neutral-700 text-xs text-neutral-300">
                                                                    Черновик
                                                                </span>
                                                            )}
                                                        </div>
                                                        {post.excerpt && (
                                                            <p className="text-sm text-neutral-400 mb-2">{post.excerpt}</p>
                                                        )}
                                                        <p className="text-xs text-neutral-500">
                                                            Slug: {post.slug} | Создано: {post.created_at ? new Date(post.created_at).toLocaleDateString('ru-RU') : 'Неизвестно'}
                                                        </p>
                                                    </div>
                                                    <div className="flex gap-2 ml-4">
                                                        <button
                                                            onClick={() => handleTogglePublish(post)}
                                                            className="p-1.5 rounded hover:bg-white/10 text-amber-400"
                                                            title={post.is_published ? 'Снять с публикации' : 'Опубликовать'}
                                                        >
                                                            {post.is_published ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                                        </button>
                                                        <button
                                                            onClick={() => setEditingPost(post)}
                                                            className="p-1.5 rounded hover:bg-white/10 text-amber-400"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => post.id && handleDelete(post.id)}
                                                            className="p-1.5 rounded hover:bg-red-500/20 text-red-400"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
