import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { adminOf } from '../../../../lib/portal/http';
import { getStoreSettings } from '../../../../lib/portal/settings';

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const admin = adminOf(req);
  res.json({ admin, settings: await getStoreSettings(req.scope, admin.store_id) });
}
