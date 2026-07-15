export interface IikoConfig {
  apiLogin: string;
  /** appId приложения из Developer Portal iiko — включает авторизацию v2 (вместе с appSecret) */
  appId: string | null;
  /** clientSecret приложения из Developer Portal iiko (храним только в env, не в коде) */
  appSecret: string | null;
  organizationId: string;
  externalMenuId: string;
  /** Имя внешнего меню iiko, которое сайт ищет в списке /api/2/menu (цены без наценки).
   *  Если меню с таким именем нет — используется externalMenuId. Пустая строка отключает поиск. */
  externalMenuName: string;
  baseUrl: string;
}

export function getIikoConfig(): IikoConfig {
  const apiLogin = process.env.IIKO_API_LOGIN;
  const organizationId = process.env.IIKO_ORGANIZATION_ID;
  const externalMenuId = process.env.IIKO_EXTERNAL_MENU_ID;

  const missing = (
    [
      ['IIKO_API_LOGIN', apiLogin],
      ['IIKO_ORGANIZATION_ID', organizationId],
      ['IIKO_EXTERNAL_MENU_ID', externalMenuId],
    ] as const
  )
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(`iiko config: missing env ${missing.join(', ')}`);
  }

  return {
    apiLogin: apiLogin!,
    appId: process.env.IIKO_APP_ID?.trim() || null,
    appSecret: process.env.IIKO_APP_SECRET?.trim() || null,
    organizationId: organizationId!,
    externalMenuId: externalMenuId!,
    externalMenuName: (process.env.IIKO_EXTERNAL_MENU_NAME ?? 'Сайт').trim(),
    baseUrl: process.env.IIKO_BASE_URL || 'https://api-ru.iiko.services',
  };
}
