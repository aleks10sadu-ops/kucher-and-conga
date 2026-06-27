export interface IikoConfig {
  apiLogin: string;
  organizationId: string;
  externalMenuId: string;
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
    organizationId: organizationId!,
    externalMenuId: externalMenuId!,
    baseUrl: process.env.IIKO_BASE_URL || 'https://api-ru.iiko.services',
  };
}
