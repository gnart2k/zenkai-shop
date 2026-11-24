import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { ContainerRegistrationKeys } from '@medusajs/framework/utils';

/**
 * Product categories are shared across stores in Medusa, but a storefront should only show the
 * ones that actually hold products sold in its own sales channel (its publishable key). Returns
 * those category ids plus their ancestors, so menus keep their parents.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const channelIds: string[] = (req as any).publishable_key_context?.sales_channel_ids ?? [];
  if (!channelIds.length) {
    res.json({ category_ids: null });
    return;
  }

  const { data: links } = await query.graph({
    entity: 'product_sales_channel',
    fields: ['product_id'],
    filters: { sales_channel_id: channelIds },
  });
  const productIds = Array.from(new Set((links as any[]).map((l) => l.product_id)));
  const direct = new Set<string>();
  if (productIds.length) {
    const { data: products } = await query.graph({
      entity: 'product',
      fields: ['id', 'categories.id'],
      filters: { id: productIds, status: 'published' },
    });
    for (const p of products as any[]) for (const c of p.categories ?? []) direct.add(c.id);
  }

  const { data: all } = await query.graph({
    entity: 'product_category',
    fields: ['id', 'parent_category_id'],
  });
  const parent = new Map(
    (all as any[]).map((c) => [c.id as string, c.parent_category_id as string | null])
  );
  const visible = new Set<string>();
  for (const id of direct) {
    let cur: string | null | undefined = id;
    while (cur && !visible.has(cur)) {
      visible.add(cur);
      cur = parent.get(cur);
    }
  }
  res.json({ category_ids: Array.from(visible) });
}
