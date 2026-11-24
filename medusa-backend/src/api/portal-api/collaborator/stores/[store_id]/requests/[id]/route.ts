import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { MedusaError } from '@medusajs/framework/utils';
import { actorIdOf, portalOf } from '../../../../../../../lib/portal/http';
import { serializeCollaboratorRequest } from '../../../../../../../lib/portal/serializers';

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const [request] = await portalOf(req).listCollabRequests(
    { id: req.params.id, store_id: req.params.store_id, collaborator_id: actorIdOf(req) },
    { take: 1 }
  );
  if (!request) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, 'Request not found');
  }
  res.json({ request: serializeCollaboratorRequest(request) });
}
