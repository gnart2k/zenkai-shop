import { generateSku, slugForSku } from '../sku';

describe('sku', () => {
  it('slugs Vietnamese titles to ASCII', () => {
    expect(slugForSku('Đèn bàn gỗ lũa trắng mộc')).toBe('DEN-BAN-GO-LUA-TRANG-MOC');
  });

  it('limits length without a trailing dash', () => {
    expect(slugForSku('Đèn cây gỗ lũa kệ treo chụp mây')).toBe('DEN-CAY-GO-LUA-KE-TREO');
  });

  it('is deterministic and ends with the variant id tail', () => {
    expect(generateSku('Đèn bàn', 'variant_01M84FGVSAJMWE0R7N5GHMPKX2')).toBe('DEN-BAN-HMPKX2');
  });

  it('falls back for titles with no usable characters', () => {
    expect(generateSku('???', 'variant_abcdef123456')).toBe('SKU-123456');
  });
});
