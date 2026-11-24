import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { z } from '@medusajs/framework/zod';
import { adminOf, parse } from '../../../../lib/portal/http';
import { createStoreProduct, listAdminProducts } from '../../../../lib/portal/products';

const nullableMoney = z.number().nonnegative().nullable().optional();

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).nullable().optional(),
  handle: z.string().max(200).nullable().optional(),
  status: z.enum(['draft', 'published']).default('draft'),
  category_ids: z.array(z.string()).default([]),
  thumbnail: z.string().max(500).nullable().optional(),
  variant: z.object({
    title: z.string().min(1).max(100).default('Tiêu chuẩn'),
    sku: z.string().max(100).nullable().optional(),
    price: z.number().positive(),
    original_price: nullableMoney,
    original_cost: nullableMoney,
    quantity: z.number().int().nonnegative().nullable().optional(),
  }),
});

/** All products of the admin's store (drafts included) with the three prices and stock. */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { store_id } = adminOf(req);
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const offset = Number(req.query.offset) || 0;
  res.json({ ...(await listAdminProducts(req.scope, store_id, { limit, offset })), limit, offset });
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { store_id } = adminOf(req);
  const body = parse(createSchema, req.body);
  res.status(201).json(await createStoreProduct(req.scope, store_id, body));
}
