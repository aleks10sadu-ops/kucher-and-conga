import { describe, it, expect, beforeEach } from 'vitest';
import { getIikoConfig } from './config';

describe('getIikoConfig', () => {
  beforeEach(() => {
    delete process.env.IIKO_API_LOGIN;
    delete process.env.IIKO_ORGANIZATION_ID;
    delete process.env.IIKO_EXTERNAL_MENU_ID;
    delete process.env.IIKO_EXTERNAL_MENU_NAME;
    delete process.env.IIKO_BASE_URL;
    delete process.env.IIKO_APP_ID;
    delete process.env.IIKO_APP_SECRET;
  });

  it('throws and names every missing variable', () => {
    expect(() => getIikoConfig()).toThrowError(
      /IIKO_API_LOGIN.*IIKO_ORGANIZATION_ID.*IIKO_EXTERNAL_MENU_ID/,
    );
  });

  it('returns config with default baseUrl when all set', () => {
    process.env.IIKO_API_LOGIN = 'login';
    process.env.IIKO_ORGANIZATION_ID = 'org';
    process.env.IIKO_EXTERNAL_MENU_ID = '79802';
    expect(getIikoConfig()).toEqual({
      apiLogin: 'login',
      appId: null, // v2-авторизация отключена, пока не заданы IIKO_APP_ID/IIKO_APP_SECRET
      appSecret: null,
      organizationId: 'org',
      externalMenuId: '79802',
      externalMenuName: 'Сайт', // дефолт: сайт ищет внешнее меню «Сайт» по имени
      baseUrl: 'https://api-ru.iiko.services',
    });
  });

  it('включает v2-авторизацию, когда заданы IIKO_APP_ID и IIKO_APP_SECRET', () => {
    process.env.IIKO_API_LOGIN = 'login';
    process.env.IIKO_ORGANIZATION_ID = 'org';
    process.env.IIKO_EXTERNAL_MENU_ID = '79802';
    process.env.IIKO_APP_ID = 'app-123';
    process.env.IIKO_APP_SECRET = 'secret-xyz';
    expect(getIikoConfig()).toMatchObject({ appId: 'app-123', appSecret: 'secret-xyz' });
  });
});
