import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { ContainerRegistrationKeys } from '@medusajs/framework/utils';
import { actorIdOf, portalOf } from '../../../../lib/portal/http';

/** Stores this collaborator can work with. */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const memberships = await portalOf(req).listStoreCollaborators({
    collaborator_id: actorIdOf(req),
    status: 'active',
  });
  const ids = memberships.map((m) => m.store_id);
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const { data: stores } = ids.length
    ? await query.graph({ entity: 'store', fields: ['id', 'name'], filters: { id: ids } })
    : { data: [] };
  res.json({ stores });
}
