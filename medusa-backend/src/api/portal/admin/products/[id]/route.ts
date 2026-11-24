import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { z } from '@medusajs/framework/zod';
import { adminOf, parse } from '../../../../../lib/portal/http';
import {
  deleteStoreProduct,
  getAdminProduct,
  updateStoreProduct,
} from '../../../../../lib/portal/products';

const nullableMoney = z.number().nonnegative().nullable().optional();

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).nullable().optional(),
  handle: z.string().max(200).optional(),
  status: z.enum(['draft', 'published']).optional(),
  category_ids: z.array(z.string()).optional(),
  thumbnail: z.string().max(500).nullable().optional(),
  variants: z
    .array(
      z.object({
        id: z.string(),
        title: z.string().min(1).max(100).optional(),
        sku: z.string().max(100).nullable().optional(),
        price: z.number().positive().optional(),
        original_price: nullableMoney,
        original_cost: nullableMoney,
        quantity: z.number().int().nonnegative().nullable().optional(),
      })
    )
    .optional(),
});

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { store_id } = adminOf(req);
  res.json(await getAdminProduct(req.scope, store_id, req.params.id));
}

export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  const { store_id } = adminOf(req);
  const body = parse(updateSchema, req.body);
  res.json(await updateStoreProduct(req.scope, store_id, req.params.id, body));
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const { store_id } = adminOf(req);
  res.json(await deleteStoreProduct(req.scope, store_id, req.params.id));
}
