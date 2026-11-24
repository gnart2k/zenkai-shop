import { signToken } from '../../modules/portal/lib/token';

/** Requests never expire, so the payment token carries no expiry either. */
export function buildPaymentToken(requestId: string) {
  return signToken({ kind: 'pay', rid: requestId });
}

export function buildPaymentLink(requestId: string) {
  const base = (process.env.STOREFRONT_URL || 'http://localhost:4100').replace(/\/$/, '');
  return `${base}/pay/${buildPaymentToken(requestId)}`;
}
