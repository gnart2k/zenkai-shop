import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { ContainerRegistrationKeys } from '@medusajs/framework/utils';
import { resolveStoreForRequest } from '../../../lib/portal/store-context';
import {
  DEFAULT_STOREFRONT_CONFIG,
  readStorefrontConfig,
  sanitizeStorefrontConfig,
} from '../../../lib/portal/storefront-config';
import { verifyToken } from '../../../modules/portal/lib/token';

/**
 * Public: the storefront theme of the store this storefront belongs to. The store is found
 * through the publishable key's sales channels; with a single store it falls back to that
 * store; with several stores an unknown key gets the defaults (never another store's config).
 *
 * With ?preview=<signed token> (issued to a portal admin) it returns that store's draft
 * instead, flagged `preview: true`. The token is HMAC-signed, scoped to one store and
 * expires, so the draft is never exposed to visitors.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const { data: stores } = await query.graph({
    entity: 'store',
    fields: ['id', 'metadata', 'default_sales_channel_id'],
  });

  const token = typeof req.query.preview === 'string' ? req.query.preview : '';
  if (token) {
    const payload = verifyToken<{ kind: string; store_id: string }>(token);
    const target =
      payload?.kind === 'sf-preview'
        ? (stores as any[]).find((s) => s.id === payload.store_id)
        : undefined;
    if (target) {
      const md = target.metadata ?? {};
      const config = md.storefront_draft
        ? sanitizeStorefrontConfig(md.storefront_draft)
        : readStorefrontConfig(md);
      res.setHeader('Cache-Control', 'no-store');
      res.json({ ...config, preview: true });
      return;
    }
  }

  const store = await resolveStoreForRequest(req);
  res.json(store ? readStorefrontConfig(store.metadata) : DEFAULT_STOREFRONT_CONFIG);
}
