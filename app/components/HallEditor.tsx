'use client';

import React, { useState, useEffect, ChangeEvent } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, Upload, Trash2, Plus } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { uploadImage, isSupabaseStorageUrl } from '@/lib/supabase/storage';

export type HallData = {
    id: string; // The hardcoded ID or DB ID
    name: string;
    capacity: number | string;
    description: string;
    image: string;
    gallery?: string[]; // Additional images
    dbId?: number | string; // The ID in content_posts table if exists
};

interface HallEditorProps {
    hall: HallData;
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void; // Trigger reload in parent
}

export default function HallEditor({ hall, isOpen, onClose, onSave }: HallEditorProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: hall.name,
        description: hall.description,
        capacity: hall.capacity,
        image_url: hall.image,
        gallery: hall.gallery || [] as string[]
    });
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadingGallery, setUploadingGallery] = useState(false);

    // Prevent body scroll when open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            return () => { document.body.style.overflow = 'unset'; };
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            alert('Файл слишком большой (макс 5MB)');
            return;
        }

        setUploading(true);
        try {
            // Preview
            const reader = new FileReader();
            reader.onloadend = () => setImagePreview(reader.result as string);
            reader.readAsDataURL(file);

            // Upload
            const url = await uploadImage(file, 'halls');
            setFormData(prev => ({ ...prev, image_url: url }));
        } catch (error: any) {
            alert('Ошибка загрузки: ' + error.message);
            setImagePreview(null);
        } finally {
            setUploading(false);
        }
    };

    const handleGalleryUpload = async (e: ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setUploadingGallery(true);
        try {
            const newUrls: string[] = [];

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                if (file.size > 5 * 1024 * 1024) {
                    alert(`Файл ${file.name} слишком большой (макс 5MB)`);
                    continue;
                }
                const url = await uploadImage(file, 'halls');
                newUrls.push(url);
            }

            setFormData(prev => ({ ...prev, gallery: [...prev.gallery, ...newUrls] }));
        } catch (error: any) {
            alert('Ошибка загрузки галереи: ' + error.message);
        } finally {
            setUploadingGallery(false);
        }
    };

    const removeGalleryImage = (index: number) => {
        setFormData(prev => ({
            ...prev,
            gallery: prev.gallery.filter((_, i) => i !== index)
        }));
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const supabase = createSupabaseBrowserClient() as any;
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                alert('Вы должны быть авторизованы');
                return;
            }

            // Prepare data
            const slug = formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
            const postData = {
                category: 'halls',
                title: formData.name, // This is key for mapping!
                slug: slug,
                content: formData.description, // Store description in content
                image_url: formData.image_url,
                is_published: true,
                metadata: {
                    capacity: formData.capacity,
                    gallery: formData.gallery,
                    original_id: hall.id // Store the hardcoded ID for reference
                },
                created_by: user.id,
                updated_at: new Date().toISOString()
            };

            let error;

            if (hall.dbId) {
                // Update existing
                const { error: err } = await supabase
                    .from('content_posts')
                    .update(postData)
                    .eq('id', hall.dbId);
                error = err;
            } else {
                // Check if already exists by title to avoid duplicates (safeguard)
                const { data: existing } = await supabase
                    .from('content_posts')
                    .select('id')
                    .eq('category', 'halls')
                    .eq('title', formData.name)
                    .single();

                if (existing) {
                    const { error: err } = await supabase
                        .from('content_posts')
                        .update(postData)
                        .eq('id', existing.id);
                    error = err;
                } else {
                    // Create new
                    const { error: err } = await supabase
                        .from('content_posts')
                        .insert({
                            ...postData,
                            published_at: new Date().toISOString()
                        });
                    error = err;
                }
            }

            if (error) throw error;

            onSave();
            onClose();
        } catch (error: any) {
            console.error('Save error:', error);
            alert('Ошибка сохранения: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-neutral-900 border border-white/10 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto relative shadow-2xl">
                <div className="flex items-center justify-between p-4 border-b border-white/10 sticky top-0 bg-neutral-900 z-10">
                    <h3 className="text-xl font-bold text-white">Редактирование зала</h3>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition text-neutral-400 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    {/* Main Image */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-neutral-300">Главное изображение</label>
                        <div className="relative group aspect-video bg-black/40 rounded-lg overflow-hidden border border-white/10">
                            {(imagePreview || formData.image_url) ? (
                                <img
                                    src={imagePreview || formData.image_url}
                                    alt="Preview"
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="flex items-center justify-center h-full text-neutral-500">
                                    Нет изображения
                                </div>
                            )}

                            <label className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                <span className="flex items-center gap-2 text-white font-medium">
                                    <Upload className="w-5 h-5" />
                                    {uploading ? 'Загрузка...' : 'Загрузить фото'}
                                </span>
                                <input
                                    type="file"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    disabled={uploading}
                                />
                            </label>
                        </div>
                    </div>

                    {/* Gallery */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-neutral-300">Галерея</label>
                        <div className="grid grid-cols-3 gap-2">
                            {formData.gallery.map((url, index) => (
                                <div key={index} className="relative group aspect-square bg-black/40 rounded-lg overflow-hidden border border-white/10">
                                    <img
                                        src={url}
                                        alt={`Gallery ${index}`}
                                        className="w-full h-full object-cover"
                                    />
                                    <button
                                        onClick={() => removeGalleryImage(index)}
                                        className="absolute top-1 right-1 p-1 bg-red-500/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}

                            <label className="aspect-square bg-white/5 border border-white/10 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-white/10 transition">
                                <Plus className="w-6 h-6 text-neutral-400 mb-1" />
                                <span className="text-xs text-neutral-400">
                                    {uploadingGallery ? '...' : 'Добавить'}
                                </span>
                                <input
                                    type="file"
                                    className="hidden"
                                    accept="image/*"
                                    multiple
                                    onChange={handleGalleryUpload}
                                    disabled={uploadingGallery}
                                />
                            </label>
                        </div>
                    </div>

                    {/* Name */}
                    <div>
                        <label className="block text-sm font-medium text-neutral-300 mb-1">Название</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full bg-black/40 border border-white/20 rounded-lg px-3 py-2 outline-none focus:border-amber-400 text-white"
                        />
                    </div>

                    {/* Capacity */}
                    <div>
                        <label className="block text-sm font-medium text-neutral-300 mb-1">Вместимость (чел.)</label>
                        <input
                            type="text"
                            value={formData.capacity}
                            onChange={(e) => setFormData(prev => ({ ...prev, capacity: e.target.value }))}
                            className="w-full bg-black/40 border border-white/20 rounded-lg px-3 py-2 outline-none focus:border-amber-400 text-white"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-neutral-300 mb-1">Описание</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            rows={4}
                            className="w-full bg-black/40 border border-white/20 rounded-lg px-3 py-2 outline-none focus:border-amber-400 resize-none text-white"
                        />
                    </div>

                    <div className="pt-2 flex gap-3">
                        <button
                            onClick={handleSave}
                            disabled={loading || uploading || uploadingGallery}
                            className="flex-1 py-2.5 bg-amber-400 text-black font-semibold rounded-lg hover:bg-amber-300 transition disabled:opacity-50"
                        >
                            {loading ? 'Сохранение...' : 'Сохранить изменения'}
                        </button>
                        <button
                            onClick={onClose}
                            className="px-4 py-2.5 bg-white/10 text-white font-semibold rounded-lg hover:bg-white/20 transition"
                        >
                            Отмена
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
