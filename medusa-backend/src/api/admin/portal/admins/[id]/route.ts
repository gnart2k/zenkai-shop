import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { MedusaError } from '@medusajs/framework/utils';
import { portalOf } from '../../../../../lib/portal/http';

/** Removes a portal admin of a store (their login stops working: portal access checks the record). */
export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const portal = portalOf(req);
  const [admin] = await portal.listPortalAdmins({ id: req.params.id }, { take: 1 });
  if (!admin) throw new MedusaError(MedusaError.Types.NOT_FOUND, 'Portal admin not found');
  await portal.deletePortalAdmins([admin.id]);
  res.json({ id: admin.id, deleted: true });
}
