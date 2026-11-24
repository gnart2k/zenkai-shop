import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { MedusaError } from '@medusajs/framework/utils';
import { z } from '@medusajs/framework/zod';
import { adminOf, parse, portalOf } from '../../../../../../lib/portal/http';
import { reverseEarningWorkflow } from '../../../../../../workflows/portal/ledger';

const schema = z.object({ reason: z.string().optional() });

/** Manual reversal, e.g. after a refund (order cancellations reverse automatically). */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { store_id } = adminOf(req);
  const { reason } = parse(schema, req.body);
  const [request] = await portalOf(req).listCollabRequests(
    { id: req.params.id, store_id },
    { take: 1 }
  );
  if (!request) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, 'Request not found');
  }
  const { result } = await reverseEarningWorkflow(req.scope).run({
    input: { request_id: request.id, reason: reason ?? 'Refunded' },
  });
  res.json(result);
}
