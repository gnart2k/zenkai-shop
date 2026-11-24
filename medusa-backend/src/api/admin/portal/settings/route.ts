import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { z } from '@medusajs/framework/zod';
import { getStore } from '../../../../lib/portal/catalog';
import { parse, portalOf } from '../../../../lib/portal/http';
import { getStoreSettings } from '../../../../lib/portal/settings';

const putSchema = z.object({
  store_id: z.string().min(1),
  deposit_percent: z.number().min(0).max(100).optional(),
  default_contact_email: z.string().email().nullable().optional(),
});

/** Medusa (platform) admin: per-store portal settings. Default deposit is 20%. */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const store_id = parse(z.object({ store_id: z.string().min(1) }), req.query).store_id;
  res.json({ store_id, settings: await getStoreSettings(req.scope, store_id) });
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { store_id, ...patch } = parse(putSchema, req.body);
  await getStore(req.scope, store_id);
  const portal = portalOf(req);
  const [existing] = await portal.listPortalSettings({ store_id }, { take: 1 });
  if (existing) {
    await portal.updatePortalSettings({ id: existing.id, ...patch });
  } else {
    await portal.createPortalSettings({ store_id, ...patch });
  }
  res.json({ store_id, settings: await getStoreSettings(req.scope, store_id) });
}
