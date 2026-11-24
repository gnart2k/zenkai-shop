const round2 = (n: number) => Math.round(n * 100) / 100;

/** Deposit due = commercial price x quantity x deposit %. */
export function computeDeposit(
  commercialPrice: number,
  quantity: number,
  depositPercent: number
): number {
  return round2((commercialPrice * quantity * depositPercent) / 100);
}

/** Collaborator earning = (commercial price - original price) x quantity. */
export function computeEarning(
  commercialPrice: number,
  originalPrice: number,
  quantity: number
): number {
  return round2((commercialPrice - originalPrice) * quantity);
}

/** Admin-only view: store margin after paying the collaborator earning. */
export function computeStoreMargin(
  originalPrice: number,
  originalCost: number,
  quantity: number
): number {
  return round2((originalPrice - originalCost) * quantity);
}

/** Sum signed ledger amounts (earnings positive, reversals negative). */
export function netAmount(entries: { amount: number }[]): number {
  return round2(entries.reduce((sum, e) => sum + Number(e.amount), 0));
}
