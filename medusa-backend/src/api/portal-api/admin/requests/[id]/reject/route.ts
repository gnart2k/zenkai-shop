import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { z } from '@medusajs/framework/zod';
import { adminOf, parse } from '../../../../../../lib/portal/http';
import { rejectCollabRequestWorkflow } from '../../../../../../workflows/portal/review-collab-request';

const schema = z.object({ reason: z.string().min(1) });

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const admin = adminOf(req);
  const { reason } = parse(schema, req.body);
  const { result } = await rejectCollabRequestWorkflow(req.scope).run({
    input: { request_id: req.params.id, store_id: admin.store_id, reviewer_id: admin.id, reason },
  });
  res.json({ request: result });
}
