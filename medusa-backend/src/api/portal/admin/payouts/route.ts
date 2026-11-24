import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { z } from '@medusajs/framework/zod';
import { adminOf, parse, portalOf } from '../../../../lib/portal/http';
import { createPayoutsWorkflow } from '../../../../workflows/portal/create-payouts';

const schema = z.object({
  period: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional(),
});

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { store_id } = adminOf(req);
  const payouts = await portalOf(req).listPayouts({ store_id }, { order: { created_at: 'DESC' } });
  res.json({ payouts });
}

/** Month-end: one payout per collaborator for everything still owed. */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { store_id } = adminOf(req);
  const { period } = parse(schema, req.body);
  const { result } = await createPayoutsWorkflow(req.scope).run({ input: { store_id, period } });
  const payouts = result.length
    ? await portalOf(req).listPayouts({ id: result.map((p) => p.id) })
    : [];
  res.status(201).json({ payouts });
}
