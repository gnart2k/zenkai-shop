import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { z } from '@medusajs/framework/zod';
import { adminOf, parse, portalOf } from '../../../../../../lib/portal/http';
import { setVariantPricing } from '../../../../../../lib/portal/pricing';

const schema = z.object({
  price: z.number().positive().optional(),
  original_price: z.number().nonnegative().nullable().optional(),
  original_cost: z.number().nonnegative().nullable().optional(),
});

/** The three prices of a variant. Only variants sold in the admin's own store. */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { store_id } = adminOf(req);
  const [row] = await portalOf(req).listVariantCosts(
    { variant_id: req.params.variant_id },
    { take: 1 }
  );
  res.json({
    variant_id: req.params.variant_id,
    store_id,
    original_price: row?.original_price != null ? Number(row.original_price) : null,
    original_cost: row?.original_cost != null ? Number(row.original_cost) : null,
  });
}

export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  const { store_id } = adminOf(req);
  const body = parse(schema, req.body);
  res.json(await setVariantPricing(req.scope, store_id, req.params.variant_id, body));
}
