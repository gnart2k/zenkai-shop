import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { adminOf, portalOf } from '../../../../lib/portal/http';

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { store_id } = adminOf(req);
  const status = req.query.status as string | undefined;
  const requests = await portalOf(req).listCollabRequests(
    { store_id, ...(status ? { status: status as any } : {}) },
    { order: { created_at: 'DESC' } }
  );
  const portal = portalOf(req);
  const ids = [...new Set(requests.map((r) => r.collaborator_id))];
  const collaborators = ids.length ? await portal.listCollaborators({ id: ids }) : [];
  res.json({
    requests: requests.map((r) => ({
      ...r,
      collaborator_email: collaborators.find((c) => c.id === r.collaborator_id)?.email ?? null,
    })),
  });
}
