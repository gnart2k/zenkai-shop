/** ASCII, upper-case slug: "Đèn bàn gỗ lũa" -> "DEN-BAN-GO-LUA". */
export function slugForSku(text: string, maxLength = 24): string {
  const full = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  let cut = full.slice(0, maxLength);
  // Cut at a word boundary instead of in the middle of a word.
  if (full.length > maxLength && full[maxLength] !== '-' && cut.includes('-')) {
    cut = cut.slice(0, cut.lastIndexOf('-'));
  }
  return cut.replace(/-+$/g, '') || 'SKU';
}

/**
 * Deterministic, readable and unique: product slug + the tail of the variant id.
 * The id tail (a ULID) is what guarantees uniqueness; the slug is for humans.
 */
export function generateSku(productTitle: string, variantId: string): string {
  return `${slugForSku(productTitle)}-${variantId.slice(-6).toUpperCase()}`;
}
