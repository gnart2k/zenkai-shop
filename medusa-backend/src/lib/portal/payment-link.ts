import type { MedusaContainer } from '@medusajs/framework/types';
import { PORTAL_MODULE } from '../../modules/portal';
import { signToken } from '../../modules/portal/lib/token';
import type PortalModuleService from '../../modules/portal/service';
import { BASE_DOMAIN } from './domains';

/** Requests never expire, so the payment token carries no expiry either. */
export function buildPaymentToken(requestId: string) {
  return signToken({ kind: 'pay', rid: requestId });
}

/**
 * Where the customer pays: the request's OWN store storefront (its <slug>.<base domain> address),
 * because the cart belongs to that store's sales channel and only that storefront's publishable
 * key can read it. STOREFRONT_URL is the fallback (a store without a slug).
 */
export async function storefrontBaseFor(
  container: Pick<MedusaContainer, 'resolve'>,
  storeId: string
): Promise<string> {
  const portal = container.resolve<PortalModuleService>(PORTAL_MODULE);
  const [setting] = await portal.listPortalSettings({ store_id: storeId }, { take: 1 });
  if (setting?.slug) {
    return BASE_DOMAIN === 'localhost'
      ? `http://${setting.slug}.localhost:4100`
      : `https://${setting.slug}.${BASE_DOMAIN}`;
  }
  return (process.env.STOREFRONT_URL || 'http://localhost:4100').replace(/\/$/, '');
}

export async function buildPaymentLink(
  container: Pick<MedusaContainer, 'resolve'>,
  request: { id: string; store_id: string }
) {
  const base = await storefrontBaseFor(container, request.store_id);
  return `${base}/pay/${buildPaymentToken(request.id)}`;
}
