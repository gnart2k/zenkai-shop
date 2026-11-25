import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { getStoreProductDetail } from '../../../../../../../lib/portal/catalog';

/** One product with its full information for a collaborator (no original cost). */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  res.json(await getStoreProductDetail(req.scope, req.params.store_id, req.params.product_id));
}
