import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { getStoreCatalog } from '../../../../../../lib/portal/catalog';

/** Read-only catalog: list price only. Original cost is never exposed here. */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const offset = Number(req.query.offset) || 0;
  const catalog = await getStoreCatalog(req.scope, req.params.store_id, { limit, offset });
  res.json({ ...catalog, limit, offset });
}
