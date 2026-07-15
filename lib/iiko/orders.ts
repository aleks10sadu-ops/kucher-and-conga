import { iikoPost } from './client';
import { getToken } from './auth';
import { getIikoConfig } from './config';
import { getAddressFormat, type AddressFormat } from './orgSettings';

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
    /** весь адрес одной строкой (город, улица, дом, корпус) — для нового формата iiko (line1) */
    line1: string;
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
 * Собирает объект deliveryPoint.address под формат адресов, включённый в iiko.
 *
 * legacy — разбор на улицу/дом/корпус (street + house + building + детали).
 * city   — новый формат: весь адрес одной строкой в line1, отдельными остаются
 *          только «детали внутри дома» (подъезд/этаж/квартира/домофон), а корпус
 *          уходит внутрь line1 (в city-формате отдельного поля building нет).
 *
 * Поле `type` — дискриминатор схемы iiko: без него касса берёт legacy по умолчанию,
 * но указываем явно для обоих форматов.
 */
export function buildDeliveryAddress(
  format: AddressFormat,
  address: CreateSiteDeliveryArgs['address'],
): Record<string, unknown> {
  if (format === 'city') {
    return {
      type: 'city',
      line1: (address.line1 || address.full).slice(0, 250),
      ...(address.entrance ? { entrance: address.entrance } : {}),
      ...(address.floor ? { floor: address.floor } : {}),
      ...(address.flat ? { flat: address.flat } : {}),
      ...(address.doorphone ? { doorphone: address.doorphone } : {}),
    };
  }
  return {
    type: 'legacy',
    // streetId из справочника iiko — касса всегда покажет улицу; иначе имя строкой (fallback)
    street: address.streetId
      ? { id: address.streetId }
      : { name: address.street || address.full, city: address.city || 'Дмитров' },
    house: address.house || '-',
    ...(address.building ? { building: address.building } : {}),
    ...(address.entrance ? { entrance: address.entrance } : {}),
    ...(address.floor ? { floor: address.floor } : {}),
    ...(address.flat ? { flat: address.flat } : {}),
    ...(address.doorphone ? { doorphone: address.doorphone } : {}),
  };
}

/**
 * Создаёт доставку в iiko (источник «Сайт», курьерский тип заказа по умолчанию)
 * и дожидается результата создания. Бросает Error с причиной, если iiko отклонила заказ.
 */
export async function createSiteDelivery(args: CreateSiteDeliveryArgs): Promise<{ orderId: string }> {
  const { organizationId } = getIikoConfig();
  const terminalGroupId = process.env.IIKO_TERMINAL_GROUP_ID;
  if (!terminalGroupId) throw new Error('iiko config: missing env IIKO_TERMINAL_GROUP_ID');

  const token = await getToken();
  const addressFormat = await getAddressFormat(token);

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
      address: buildDeliveryAddress(addressFormat, args.address),
      // курьеру — полный адрес с деталями (в city-формате детали не влезают в line1)
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
