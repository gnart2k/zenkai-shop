import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { z } from '@medusajs/framework/zod';
import { adminOf, parse } from '../../../../lib/portal/http';
import { createCategory, listCategories } from '../../../../lib/portal/products';

const schema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(1000).nullable().optional(),
  is_active: z.boolean().default(true),
});

/** Every category (they are shared across stores); `owned` marks the ones this store may edit. */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { store_id } = adminOf(req);
  res.json({ categories: await listCategories(req.scope, store_id) });
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { store_id } = adminOf(req);
  res.status(201).json(await createCategory(req.scope, store_id, parse(schema, req.body)));
}
