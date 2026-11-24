import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { ContainerRegistrationKeys } from '@medusajs/framework/utils';
import { getStore } from '../../../../../../lib/portal/catalog';

/**
 * Medusa (platform) admin: one store's own catalog. Products are the ones sold in the store's
 * sales channel; categories are the ones the store created (portal_store_id) plus any it uses.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const store = await getStore(req.scope, req.params.id);
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

  let products: any[] = [];
  if (store.default_sales_channel_id) {
    const { data: links } = await query.graph({
      entity: 'product_sales_channel',
      fields: ['product_id'],
      filters: { sales_channel_id: store.default_sales_channel_id },
    });
    const ids = (links as any[]).map((l) => l.product_id);
    if (ids.length) {
      const { data } = await query.graph({
        entity: 'product',
        fields: [
          'id',
          'title',
          'status',
          'thumbnail',
          'categories.id',
          'categories.name',
          'variants.id',
          'variants.sku',
          'variants.price_set.prices.amount',
          'variants.price_set.prices.currency_code',
          'variants.price_set.prices.rules_count',
        ],
        filters: { id: ids },
        pagination: { take: 500 },
      });
      products = (data as any[]).map((p) => {
        const prices = (p.variants ?? []).flatMap((v: any) => v.price_set?.prices ?? []);
        const list = prices.find((x: any) => !(x.rules_count > 0));
        return {
          id: p.id,
          title: p.title,
          status: p.status,
          thumbnail: p.thumbnail,
          sku: p.variants?.[0]?.sku ?? null,
          price: list ? Number(list.amount) : null,
          currency_code: list?.currency_code ?? null,
          categories: (p.categories ?? []).map((c: any) => ({ id: c.id, name: c.name })),
        };
      });
    }
  }

  const { data: all } = await query.graph({
    entity: 'product_category',
    fields: ['id', 'name', 'handle', 'is_active', 'metadata'],
    pagination: { take: 500 },
  });
  const count = new Map<string, number>();
  for (const p of products)
    for (const c of p.categories) count.set(c.id, (count.get(c.id) ?? 0) + 1);
  const categories = (all as any[])
    .filter((c) => c.metadata?.portal_store_id === store.id || count.has(c.id))
    .map((c) => ({
      id: c.id,
      name: c.name,
      handle: c.handle,
      is_active: c.is_active,
      owned: c.metadata?.portal_store_id === store.id,
      product_count: count.get(c.id) ?? 0,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  res.json({ store: { id: store.id, name: store.name }, products, categories });
}
