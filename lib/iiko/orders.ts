import { iikoPost } from './client';
import { getToken } from './auth';
import { getIikoConfig } from './config';
import { getAddressFormat, type AddressFormat } from './orgSettings';
import type { FulfillmentType } from '../delivery/types';

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

export interface CreateSiteOrderArgs {
  /** Same durable ID on the website, notification card and iiko. */
  orderId?: string;
  fulfillmentType: FulfillmentType;
  phone: string;
  customerName: string;
  comment: string;
  /** локальное время ресторана в формате iiko: "yyyy-MM-dd HH:mm:ss.fff" */
  completeBefore?: string | null;
  items: SiteOrderItem[];
  address?: SiteOrderAddress;
}

export interface SiteOrderAddress {
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
}

export type CreateSiteDeliveryArgs = Omit<CreateSiteOrderArgs, 'fulfillmentType'> & {
  fulfillmentType?: 'delivery';
};

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
  address: SiteOrderAddress,
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

export function buildIikoOrder(args: CreateSiteOrderArgs, addressFormat: AddressFormat): Record<string, unknown> {
  if (args.fulfillmentType === 'delivery' && !args.address) {
    throw new Error('delivery address is required');
  }

  return {
    ...(args.orderId ? { id: args.orderId } : {}),
    orderServiceType: args.fulfillmentType === 'pickup' ? 'DeliveryByClient' : 'DeliveryByCourier',
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
    ...(args.fulfillmentType === 'delivery' && args.address ? {
      deliveryPoint: {
        ...(args.address.latitude != null && args.address.longitude != null
          ? { coordinates: { latitude: args.address.latitude, longitude: args.address.longitude } }
          : {}),
        address: buildDeliveryAddress(addressFormat, args.address),
        comment: args.address.full,
      },
    } : {}),
  };
}

/**
 * Создаёт доставку в iiko (источник «Сайт», курьерский тип заказа по умолчанию)
 * и дожидается результата создания. Бросает Error с причиной, если iiko отклонила заказ.
 */
export async function createSiteOrder(args: CreateSiteOrderArgs): Promise<{ orderId: string; creationStatus: 'Success' | 'InProgress' }> {
  const { organizationId } = getIikoConfig();
  const terminalGroupId = process.env.IIKO_TERMINAL_GROUP_ID;
  if (!terminalGroupId) throw new Error('iiko config: missing env IIKO_TERMINAL_GROUP_ID');

  const token = await getToken();
  const addressFormat = args.fulfillmentType === 'delivery' ? await getAddressFormat(token) : 'legacy';
  const order = buildIikoOrder(args, addressFormat);

  const created = await iikoPost<CreateDeliveryResponse>(
    '/api/1/deliveries/create',
    { organizationId, terminalGroupId, createOrderSettings: { transportToFrontTimeout: 30 }, order },
    token,
  );

  const orderId = created.orderInfo.id;
  if (args.orderId && orderId !== args.orderId) throw new Error('iiko returned a different order ID');

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
    if (o.creationStatus === 'Success') return { orderId, creationStatus: 'Success' };
    throw new Error(`iiko отклонила заказ: ${o.errorInfo?.message || o.errorInfo?.code || 'unknown'}`);
  }
  return { orderId, creationStatus: 'InProgress' };
}

/** Совместимый entry point для существующих курьерских заказов. */
export function createSiteDelivery(args: CreateSiteDeliveryArgs): Promise<{ orderId: string; creationStatus: 'Success' | 'InProgress' }> {
  return createSiteOrder({ ...args, fulfillmentType: 'delivery' });
}
