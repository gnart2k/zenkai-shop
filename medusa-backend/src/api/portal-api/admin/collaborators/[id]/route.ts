import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { MedusaError } from '@medusajs/framework/utils';
import { adminOf, portalOf } from '../../../../../lib/portal/http';

/** Revoke access to this store only. History (requests, ledger) is kept. */
export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const { store_id } = adminOf(req);
  const portal = portalOf(req);
  const [m] = await portal.listStoreCollaborators(
    { store_id, collaborator_id: req.params.id },
    { take: 1 }
  );
  if (!m) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, 'Collaborator not found in this store');
  }
  await portal.updateStoreCollaborators({ id: m.id, status: 'revoked' });
  res.json({ id: req.params.id, status: 'revoked' });
}
