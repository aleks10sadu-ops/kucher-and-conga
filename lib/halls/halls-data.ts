// Общие данные и логика слияния залов: используется и серверным загрузчиком
// (booking/page.tsx, ISR), и клиентским HallSelector (обновление после правок админа).

export type Hall = {
    id: string; // ID для API брони (из CRM или фолбэк)
    name: string;
    capacity: number | string;
    description: string;
    image: string;
    gallery?: string[];
    dbId?: number | string; // ID записи в локальном Supabase (контент)
};

// Базовые данные залов (фолбэк для первого рендера / если CRM недоступна).
export const FALLBACK_HALLS: Hall[] = [
    { id: 'fallback-1', name: 'Conga', capacity: 140, description: 'Главный зал ресторана Conga — подвешенный лес и лампы-грибы.', image: '/halls/conga.jpg' },
    { id: 'fallback-2', name: 'Морской (Кучер)', capacity: 52, description: 'Морской зал ресторана Кучер.', image: '/halls/morskoy.jpg' },
    { id: 'fallback-3', name: 'Барный (Кучер)', capacity: 36, description: 'Уютный барный зал.', image: '/halls/bar.jpg' },
    { id: 'fallback-4', name: 'Веранда (Кучер)', capacity: 20, description: 'Веранда ресторана Кучер.', image: '/halls/veranda.jpg' },
    { id: 'fallback-5', name: 'Кальянная зона (Кучер)', capacity: 50, description: 'Летняя веранда с кальянной зоной.', image: '/halls/letka.jpg' },
    { id: 'fallback-6', name: 'Беседки (Кучер)', capacity: '6–8', description: 'Беседки с первой по четвёртую.', image: '/halls/gazebo.jpg' },
    { id: 'fallback-7', name: 'Банкетные залы (Кучер)', capacity: 25, description: 'Шоколад, Рубин, Изумруд — для банкетов.', image: '/halls/banquet.jpg' },
];

// CRM-залы (реальные ID) + локальный контент (описания/фото) + фолбэк → единый список.
export function mergeHalls(crmHalls: any[], localContent: any[]): Hall[] {
    if (crmHalls.length > 0) {
        const nameMapping: Record<string, string> = { 'Летка': 'Кальянная зона (Кучер)' };
        return crmHalls.map((crmHall) => {
            const normalizedName = nameMapping[crmHall.name] || crmHall.name;
            const localEntry =
                localContent.find((p: any) => p.title.toLowerCase() === normalizedName.toLowerCase()) ||
                localContent.find((p: any) => p.title.toLowerCase() === crmHall.name.toLowerCase());
            const initialEntry =
                FALLBACK_HALLS.find((h) => h.name.toLowerCase() === normalizedName.toLowerCase()) ||
                FALLBACK_HALLS.find((h) => h.name.toLowerCase() === crmHall.name.toLowerCase());
            return {
                id: crmHall.id,
                name: normalizedName,
                capacity: crmHall.capacity || localEntry?.metadata?.capacity || initialEntry?.capacity || 0,
                description: localEntry?.content || initialEntry?.description || '',
                image: localEntry?.image_url || initialEntry?.image || '/halls/placeholder.jpg',
                gallery: localEntry?.metadata?.gallery || [],
                dbId: localEntry?.id,
            };
        });
    }
    if (localContent.length > 0) {
        return FALLBACK_HALLS.map((hall) => {
            const dbEntry = localContent.find((p: any) => p.title.toLowerCase() === hall.name.toLowerCase());
            if (dbEntry) {
                return {
                    ...hall,
                    description: dbEntry.content || hall.description,
                    image: dbEntry.image_url || hall.image,
                    capacity: dbEntry.metadata?.capacity || hall.capacity,
                    gallery: dbEntry.metadata?.gallery || [],
                    dbId: dbEntry.id,
                };
            }
            return hall;
        });
    }
    return FALLBACK_HALLS;
}
