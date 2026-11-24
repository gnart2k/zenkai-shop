import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { getStore } from '../../../lib/portal/catalog';
import { storeIdForHost } from '../../../lib/portal/domains';
import { portalOf } from '../../../lib/portal/http';
import { normalizeHost, publishableKeysOfStore } from '../../../lib/portal/store-context';
import { verifyToken } from '../../../modules/portal/lib/token';

/**
 * Public. Which store (tenant) a storefront request belongs to, so one storefront app can serve
 * many stores. Resolve by ?host=<hostname> (the store's storefront domain) or by
 * ?preview=<signed preview token> (the editor's live preview of one store's draft).
 * Returns that store's publishable key, which is public by design.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const portal = portalOf(req);
  let storeId: string | null = null;

  const host = typeof req.query.host === 'string' ? normalizeHost(req.query.host) : null;
  if (host) storeId = await storeIdForHost(portal, host);
  const preview = typeof req.query.preview === 'string' ? req.query.preview : '';
  if (!storeId && preview) {
    const payload = verifyToken<{ kind: string; store_id: string }>(preview);
    if (payload?.kind === 'sf-preview') storeId = payload.store_id;
  }
  if (!storeId) {
    res.status(404).json({ message: 'No store for this host' });
    return;
  }

  const store = await getStore(req.scope, storeId);
  const [key] = await publishableKeysOfStore(req.scope, store);
  if (!key) {
    res.status(404).json({ message: 'Store has no storefront key' });
    return;
  }
  res.setHeader('Cache-Control', 'public, max-age=30');
  res.json({ store_id: store.id, name: store.name, publishable_key: key.token });
}
