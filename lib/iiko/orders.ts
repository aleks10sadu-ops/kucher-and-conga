import { iikoPost } from './client';
import { getToken } from './auth';
import { getIikoConfig } from './config';

export interface SiteOrderModifier {
  productId: string;
  productGroupId: string;
  amount: number;
}

export interface SiteOrderItem {
  productId: string;
  amount: number;
  modifiers: SiteOrderModifier[];
}

export interface CreateSiteDeliveryArgs {
  phone: string;
  customerName: string;
  comment: string;
  /** локальное время ресторана в формате iiko: "yyyy-MM-dd HH:mm:ss.fff" */
  completeBefore?: string | null;
  items: SiteOrderItem[];
  address: {
    full: string;
    city: string | null;
    street: string | null;
    /** реальный streetId из справочника iiko; при наличии передаётся вместо имени */
    streetId?: string | null;
    house: string | null;
    building?: string | null;
    entrance?: string | null;
    floor?: string | null;
    flat?: string | null;
    doorphone?: string | null;
    latitude: number | null;
    longitude: number | null;
  };
}

interface CreateDeliveryResponse {
  correlationId: string;
  orderInfo: { id: string; creationStatus: string };
}

interface OrderByIdResponse {
  orders: Array<{
    id: string;
    creationStatus: string;
    errorInfo: { message?: string; code?: string } | null;
  }>;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Создаёт доставку в iiko (источник «Сайт», курьерский тип заказа по умолчанию)
 * и дожидается результата создания. Бросает Error с причиной, если iiko отклонила заказ.
 */
export async function createSiteDelivery(args: CreateSiteDeliveryArgs): Promise<{ orderId: string }> {
  const { organizationId } = getIikoConfig();
  const terminalGroupId = process.env.IIKO_TERMINAL_GROUP_ID;
  if (!terminalGroupId) throw new Error('iiko config: missing env IIKO_TERMINAL_GROUP_ID');

  const token = await getToken();

  const order: Record<string, unknown> = {
    // курьерская доставка ресторана: iiko возьмёт тип заказа по умолчанию этого режима
    orderServiceType: 'DeliveryByCourier',
    sourceKey: 'Сайт',
    ...(args.completeBefore ? { completeBefore: args.completeBefore } : {}),
    phone: args.phone,
    customer: { name: args.customerName },
    comment: args.comment,
    items: args.items.map((it) => ({
      type: 'Product',
      productId: it.productId,
      amount: it.amount,
      modifiers: it.modifiers.map((m) => ({
        productId: m.productId,
        productGroupId: m.productGroupId,
        amount: m.amount,
      })),
    })),
    deliveryPoint: {
      ...(args.address.latitude != null && args.address.longitude != null
        ? { coordinates: { latitude: args.address.latitude, longitude: args.address.longitude } }
        : {}),
      address: {
        // streetId из справочника iiko — касса всегда покажет улицу; иначе имя строкой (fallback)
        street: args.address.streetId
          ? { id: args.address.streetId }
          : { name: args.address.street || args.address.full, city: args.address.city || 'Дмитров' },
        house: args.address.house || '-',
        ...(args.address.building ? { building: args.address.building } : {}),
        ...(args.address.entrance ? { entrance: args.address.entrance } : {}),
        ...(args.address.floor ? { floor: args.address.floor } : {}),
        ...(args.address.flat ? { flat: args.address.flat } : {}),
        ...(args.address.doorphone ? { doorphone: args.address.doorphone } : {}),
      },
      comment: args.address.full,
    },
  };

  const created = await iikoPost<CreateDeliveryResponse>(
    '/api/1/deliveries/create',
    { organizationId, terminalGroupId, createOrderSettings: { transportToFrontTimeout: 30 }, order },
    token,
  );

  const orderId = created.orderInfo.id;

  // Создание асинхронное: опрашиваем статус, чтобы вернуть сайту честный результат.
  for (let i = 0; i < 10; i++) {
    await sleep(2000);
    const st = await iikoPost<OrderByIdResponse>(
      '/api/1/deliveries/by_id',
      { organizationId, orderIds: [orderId] },
      token,
    );
    const o = st.orders?.[0];
    if (!o || o.creationStatus === 'InProgress') continue;
    if (o.creationStatus === 'Success') return { orderId };
    throw new Error(`iiko отклонила заказ: ${o.errorInfo?.message || o.errorInfo?.code || 'unknown'}`);
  }
  // ponytail: не дождались статуса за 20с — считаем успехом, кассовый вебхук всё равно уведомит
  return { orderId };
}
