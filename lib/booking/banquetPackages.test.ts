import { describe, it, expect } from 'vitest';
import { isBanquetPackageAllowed } from './banquetPackages';

describe('isBanquetPackageAllowed', () => {
  it('conga filter allows conga-7500', () => {
    expect(isBanquetPackageAllowed('conga', 'conga-7500')).toBe(true);
  });

  it('conga filter blocks kucher-5000', () => {
    expect(isBanquetPackageAllowed('conga', 'kucher-5000')).toBe(false);
  });

  it('all filter allows conga-7500', () => {
    expect(isBanquetPackageAllowed('all', 'conga-7500')).toBe(true);
  });

  it('all filter allows kucher-5000', () => {
    expect(isBanquetPackageAllowed('all', 'kucher-5000')).toBe(true);
  });

  it('null filter returns false regardless of package', () => {
    expect(isBanquetPackageAllowed(null, 'conga-7500')).toBe(false);
  });

  it('null packageId returns false', () => {
    expect(isBanquetPackageAllowed('all', null)).toBe(false);
  });

  it('undefined packageId returns false', () => {
    expect(isBanquetPackageAllowed('conga', undefined)).toBe(false);
  });

  it('unknown packageId returns false', () => {
    expect(isBanquetPackageAllowed('all', 'nonexistent-pkg')).toBe(false);
  });
});
