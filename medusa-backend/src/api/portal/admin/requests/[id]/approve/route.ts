import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { adminOf } from '../../../../../../lib/portal/http';
import { approveCollabRequestWorkflow } from '../../../../../../workflows/portal/review-collab-request';

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const admin = adminOf(req);
  const { result } = await approveCollabRequestWorkflow(req.scope).run({
    input: { request_id: req.params.id, store_id: admin.store_id, reviewer_id: admin.id },
  });
  res.json(result);
}
