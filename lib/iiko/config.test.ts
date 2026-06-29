import { describe, it, expect, beforeEach } from 'vitest';
import { getIikoConfig } from './config';

describe('getIikoConfig', () => {
  beforeEach(() => {
    delete process.env.IIKO_API_LOGIN;
    delete process.env.IIKO_ORGANIZATION_ID;
    delete process.env.IIKO_EXTERNAL_MENU_ID;
    delete process.env.IIKO_BASE_URL;
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
      organizationId: 'org',
      externalMenuId: '79802',
      baseUrl: 'https://api-ru.iiko.services',
    });
  });
});
