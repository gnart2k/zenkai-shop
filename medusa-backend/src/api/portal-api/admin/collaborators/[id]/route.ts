import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { MedusaError } from '@medusajs/framework/utils';
import { deleteCollaboratorFromStore } from '../../../../../lib/portal/collaborators';
import { adminOf, portalOf } from '../../../../../lib/portal/http';

/**
 * Without ?permanent=true: revoke access to this store only (history is kept).
 * With ?permanent=true: delete the collaborator from this store for good (see
 * deleteCollaboratorFromStore: refused when they have earnings or payouts).
 */
export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const { store_id } = adminOf(req);
  if (req.query.permanent === 'true') {
    res.json(await deleteCollaboratorFromStore(req.scope, store_id, req.params.id));
    return;
  }
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
