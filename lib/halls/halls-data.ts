// Общие данные и логика слияния залов: используется и серверным загрузчиком
// (booking/page.tsx, ISR), и клиентским HallSelector (обновление после правок админа).
import { russianPublicPost, russianPublicText } from '../content/russianPublicText';

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
    {
        id: 'fallback-1',
        name: 'Конга',
        capacity: 140,
        description: 'Просторный современный зал с панорамными окнами, подвесным лесом и авторскими светильниками. Выразительный интерьер, собственный бар и гибкая рассадка подходят для свадеб, корпоративов, концертов и больших семейных праздников.',
        image: '/halls/conga.webp',
        gallery: ['/halls/conga-2.webp', '/halls/conga-3.webp', '/halls/conga-4.webp', '/halls/conga-5.webp'],
    },
    {
        id: 'fallback-2',
        name: 'Морской зал',
        capacity: 52,
        description: 'Светлый зал с морскими деталями, цветными креслами и выразительным интерьером для семейных встреч и праздников.',
        image: '/halls/morskoy.webp',
    },
    {
        id: 'fallback-3',
        name: 'Барный зал',
        capacity: 36,
        description: 'Камерный зал в тёплом дереве с собственной барной стойкой и камином — для дружеских встреч, семейных ужинов и небольших праздников.',
        image: '/halls/bar.webp',
    },
    {
        id: 'fallback-4',
        name: 'Веранда (Кучер)',
        capacity: 20,
        description: 'Светлая закрытая веранда с панорамными окнами и бирюзовыми акцентами для спокойных встреч в любое время года.',
        image: '/halls/veranda.webp',
    },
    {
        id: 'fallback-5',
        name: 'Летняя веранда',
        capacity: 50,
        description: 'Просторная веранда среди берёз с мягкими диванами и яркими подвесными светильниками.',
        image: '/halls/letka.webp',
    },
    {
        id: 'fallback-6',
        name: 'Беседки (Кучер)',
        capacity: '6–8',
        description: 'Отдельные закрытые беседки среди зелени — уютное пространство для семейного обеда, встречи с друзьями или камерного праздника. В каждой беседке есть собственный стол, мягкий естественный свет и атмосфера загородного отдыха.',
        image: '/halls/gazebo.webp',
        gallery: ['/halls/gazebo-2.webp', '/halls/gazebo-3.webp', '/halls/gazebo-4.webp', '/halls/gazebo-5.webp'],
    },
    {
        id: 'fallback-7',
        name: 'Банкетные залы',
        capacity: 30,
        description: 'Отдельный банкетный комплекс с несколькими залами и уютным внутренним двором для больших и камерных мероприятий.',
        image: '/halls/banquet.webp',
    },
];

// CRM-залы (реальные ID) + локальный контент (описания/фото) + фолбэк → единый список.
export function mergeHalls(crmHalls: any[], localContent: any[]): Hall[] {
    localContent = localContent.map(russianPublicPost);
    if (crmHalls.length > 0) {
        const nameMapping: Record<string, string> = {
            'Барный (Кучер)': 'Барный зал',
            'Морской (Кучер)': 'Морской зал',
            'Беседки': 'Беседки (Кучер)',
            'Летка': 'Летняя веранда',
        };
        return crmHalls.map((crmHall) => {
            const normalizedName = nameMapping[crmHall.name] || russianPublicText(crmHall.name);
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
