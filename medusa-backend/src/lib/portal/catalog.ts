import type { MedusaContainer } from '@medusajs/framework/types';
import { ContainerRegistrationKeys, MedusaError, Modules } from '@medusajs/framework/utils';
import { PORTAL_MODULE } from '../../modules/portal';
import type PortalModuleService from '../../modules/portal/service';

type Container = Pick<MedusaContainer, 'resolve'>;

type Price = { amount: number; currency_code: string; rules_count?: number | null };

export async function getStore(container: Container, storeId: string) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const { data } = await query.graph({
    entity: 'store',
    fields: [
      'id',
      'name',
      'default_sales_channel_id',
      'default_region_id',
      'supported_currencies.currency_code',
      'supported_currencies.is_default',
    ],
    filters: { id: storeId },
  });
  const store = data[0] as any;
  if (!store) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, `Store ${storeId} not found`);
  }
  return store;
}

export function storeCurrency(store: {
  supported_currencies?: { currency_code: string; is_default?: boolean }[];
}): string {
  const list = store.supported_currencies ?? [];
  return (list.find((c) => c.is_default) ?? list[0])?.currency_code ?? 'vnd';
}

/** The store-wide list price: no price rules, in the store's default currency. */
function pickPrice(prices: Price[] | undefined, currency: string): number | null {
  const match = (prices ?? []).find(
    (p) => p.currency_code === currency && !(p.rules_count && p.rules_count > 0)
  );
  return match ? Number(match.amount) : null;
}

/**
 * Resolves a variant for a store, enforcing that it is sold in the store's sales
 * channel, and returns its original (list) price. Never returns cost.
 */
export async function resolveVariantForStore(
  container: Container,
  storeId: string,
  variantId: string,
  opts: { requirePublished?: boolean } = {}
) {
  const requirePublished = opts.requirePublished ?? true;
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const store = await getStore(container, storeId);
  const currency = storeCurrency(store);

  const { data } = await query.graph({
    entity: 'product_variant',
    fields: [
      'id',
      'sku',
      'title',
      'product.id',
      'product.title',
      'product.status',
      'product.sales_channels.id',
      'price_set.prices.amount',
      'price_set.prices.currency_code',
      'price_set.prices.rules_count',
    ],
    filters: { id: variantId },
  });
  const variant = data[0] as any;
  const inChannel = (variant?.product?.sales_channels ?? []).some(
    (sc: { id: string }) => sc.id === store.default_sales_channel_id
  );
  if (!variant || (requirePublished && variant.product?.status !== 'published') || !inChannel) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, 'Product is not available in this store');
  }
  const price = pickPrice(variant.price_set?.prices, currency);
  if (price === null) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Variant has no ${currency.toUpperCase()} price`
    );
  }
  // Three prices per variant: suggested (the store price), original (what the
  // collaborator's profit is measured from, defaults to the store price) and the
  // private original cost, which is never returned from here.
  const portal = container.resolve<PortalModuleService>(PORTAL_MODULE);
  const [vc] = await portal.listVariantCosts({ variant_id: variantId }, { take: 1 });
  const original = vc?.original_price != null ? Number(vc.original_price) : price;
  return {
    store,
    variant_id: variant.id as string,
    sku: (variant.sku as string | null) ?? null,
    product_id: variant.product.id as string,
    product_title: variant.product.title as string,
    currency_code: currency,
    suggested_price: price,
    original_price: original,
  };
}

/** Read-only catalog for collaborators. Contains list price, never original cost. */
export async function getStoreCatalog(
  container: Container,
  storeId: string,
  opts: { limit: number; offset: number }
) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const store = await getStore(container, storeId);
  const currency = storeCurrency(store);
  if (!store.default_sales_channel_id) {
    return { products: [], count: 0, currency_code: currency };
  }
  // Products cannot be filtered by sales channel directly, so resolve ids via the link.
  const { data: links } = await query.graph({
    entity: 'product_sales_channel',
    fields: ['product_id'],
    filters: { sales_channel_id: store.default_sales_channel_id },
  });
  const productIds = [...new Set((links as { product_id: string }[]).map((l) => l.product_id))];
  if (!productIds.length) {
    return { products: [], count: 0, currency_code: currency };
  }
  const { data, metadata } = await query.graph({
    entity: 'product',
    fields: [
      'id',
      'title',
      'handle',
      'thumbnail',
      'variants.id',
      'variants.sku',
      'variants.title',
      'variants.price_set.prices.amount',
      'variants.price_set.prices.currency_code',
      'variants.price_set.prices.rules_count',
    ],
    filters: { id: productIds, status: 'published' },
    pagination: { take: opts.limit, skip: opts.offset },
  });
  const variantIds = (data as any[]).flatMap((p: any) => (p.variants ?? []).map((v: any) => v.id));
  const portal = container.resolve<PortalModuleService>(PORTAL_MODULE);
  const vcs = variantIds.length ? await portal.listVariantCosts({ variant_id: variantIds }) : [];
  // Only the collaborator-facing original price is read here, never original_cost.
  const originalOf = new Map(
    vcs.filter((c) => c.original_price != null).map((c) => [c.variant_id, Number(c.original_price)])
  );
  const products = (data as any[]).map((p: any) => ({
    id: p.id,
    title: p.title,
    handle: p.handle,
    thumbnail: p.thumbnail,
    variants: (p.variants ?? []).map((v: any) => ({
      id: v.id,
      sku: v.sku,
      title: v.title,
      suggested_price: pickPrice(v.price_set?.prices, currency),
      original_price: originalOf.get(v.id) ?? pickPrice(v.price_set?.prices, currency),
    })),
  }));
  return { products, count: metadata?.count ?? products.length, currency_code: currency };
}

/**
 * The suggested price IS the store price: the variant's store-wide price in the
 * store's default currency. Updating it here updates it in the store too.
 *
 * Medusa's price-set update deletes prices that are not in the input, so every
 * existing price is passed back with its id and only the target amount changes.
 */
export async function updateSuggestedPrice(
  container: Container,
  storeId: string,
  variantId: string,
  amount: number
) {
  const { currency_code } = await resolveVariantForStore(container, storeId, variantId, {
    requirePublished: false,
  });
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const { data } = await query.graph({
    entity: 'product_variant',
    fields: [
      'id',
      'price_set.id',
      'price_set.prices.id',
      'price_set.prices.amount',
      'price_set.prices.currency_code',
      'price_set.prices.rules_count',
    ],
    filters: { id: variantId },
  });
  const priceSet = (data[0] as any)?.price_set;
  const prices: Price & { id: string }[] = priceSet?.prices ?? [];
  const target = prices.find(
    (p: any) => p.currency_code === currency_code && !(p.rules_count && p.rules_count > 0)
  ) as any;
  if (!priceSet || !target) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, 'Variant has no store-wide price to update');
  }

  const pricing = container.resolve(Modules.PRICING);
  await pricing.updatePriceSets(priceSet.id, {
    prices: (prices as any[]).map((p) => ({
      id: p.id,
      currency_code: p.currency_code,
      amount: p.id === target.id ? amount : Number(p.amount),
    })),
  });
  return { variant_id: variantId, currency_code, amount };
}

/** Purges storefront caches so a changed price shows up right away. Never throws. */
export async function revalidateStorefront(container: Container, tags: string[]) {
  const url = process.env.STOREFRONT_URL;
  const secret = process.env.REVALIDATE_SECRET;
  if (!url || !secret) {
    return;
  }
  try {
    await fetch(
      `${url.replace(/\/$/, '')}/api/revalidate?tags=${tags.join(',')}&secret=${encodeURIComponent(secret)}`
    );
  } catch {
    // The storefront cache expires on its own; a failed purge must not fail the edit.
  }
}
