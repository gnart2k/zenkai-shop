import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { MedusaError } from '@medusajs/framework/utils';
import { z } from '@medusajs/framework/zod';
import { adminOf, parse, portalOf } from '../../../../../../lib/portal/http';

const schema = z.object({ note: z.string().optional() });

/** Mark a payout as transferred to the collaborator. */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { store_id } = adminOf(req);
  const { note } = parse(schema, req.body);
  const portal = portalOf(req);
  const [payout] = await portal.listPayouts({ id: req.params.id, store_id }, { take: 1 });
  if (!payout) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, 'Payout not found');
  }
  if (payout.status === 'paid') {
    throw new MedusaError(MedusaError.Types.NOT_ALLOWED, 'Payout is already marked paid');
  }
  const updated = await portal.updatePayouts({
    id: payout.id,
    status: 'paid',
    paid_at: new Date(),
    note: note ?? null,
  });
  res.json({ payout: updated });
}
