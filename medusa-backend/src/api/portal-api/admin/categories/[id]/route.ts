import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { z } from '@medusajs/framework/zod';
import { adminOf, parse } from '../../../../../lib/portal/http';
import { deleteCategory, updateCategory } from '../../../../../lib/portal/products';

const schema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(1000).nullable().optional(),
  is_active: z.boolean().optional(),
});

export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  const { store_id } = adminOf(req);
  res.json(await updateCategory(req.scope, store_id, req.params.id, parse(schema, req.body)));
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const { store_id } = adminOf(req);
  res.json(await deleteCategory(req.scope, store_id, req.params.id));
}
