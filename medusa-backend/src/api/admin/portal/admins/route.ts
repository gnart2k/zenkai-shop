import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { z } from '@medusajs/framework/zod';
import { getStore } from '../../../../lib/portal/catalog';
import { parse, portalOf } from '../../../../lib/portal/http';
import { invitePortalAdmin } from '../../../../lib/portal/invites';

const schema = z.object({
  store_id: z.string().min(1),
  email: z.string().email(),
  name: z.string().optional().nullable(),
});

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { store_id } = parse(z.object({ store_id: z.string().min(1) }), req.query);
  res.json({ admins: await portalOf(req).listPortalAdmins({ store_id }) });
}

/** Medusa admin creates a portal admin for one store and gets the invite link. */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = parse(schema, req.body);
  await getStore(req.scope, body.store_id);
  const { admin, invite_link } = await invitePortalAdmin(req.scope, body);
  res.status(201).json({ admin, invite_link });
}
