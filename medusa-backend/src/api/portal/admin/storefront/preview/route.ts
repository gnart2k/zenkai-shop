import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { adminOf } from '../../../../../lib/portal/http';
import { signToken } from '../../../../../modules/portal/lib/token';

const TTL_SECONDS = 60 * 60;

/**
 * A short-lived signed token that lets the storefront render this store's draft.
 * It only grants read access to the draft (never to anything else) and expires in an hour.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { store_id } = adminOf(req);
  res.json({
    token: signToken({ kind: 'sf-preview', store_id }, TTL_SECONDS),
    expires_at: new Date(Date.now() + TTL_SECONDS * 1000).toISOString(),
  });
}
