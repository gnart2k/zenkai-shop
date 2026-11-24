import type { MedusaContainer } from '@medusajs/framework/types';
import { ContainerRegistrationKeys, MedusaError, Modules } from '@medusajs/framework/utils';
import {
  createInventoryItemsWorkflow,
  createInventoryLevelsWorkflow,
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  deleteProductCategoriesWorkflow,
  deleteProductsWorkflow,
  updateInventoryLevelsWorkflow,
  updateProductCategoriesWorkflow,
  updateProductsWorkflow,
} from '@medusajs/medusa/core-flows';
import { PORTAL_MODULE } from '../../modules/portal';
import type PortalModuleService from '../../modules/portal/service';
import { getStore, revalidateStorefront, storeCurrency } from './catalog';
import { setVariantPricing, validatePricing } from './pricing';

type Container = Pick<MedusaContainer, 'resolve'>;

/** ASCII lower-case slug for handles: "Đèn bàn" -> "den-ban". */
export function slugify(text: string): string {
  return (
    text
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'item'
  );
}

async function uniqueHandle(
  container: Container,
  entity: 'product' | 'product_category',
  base: string
) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  let handle = base;
  for (let i = 2; i < 50; i++) {
    const { data } = await query.graph({ entity, fields: ['id'], filters: { handle } });
    if (!data.length) {
      return handle;
    }
    handle = `${base}-${i}`;
  }
  return `${base}-${Date.now()}`;
}

/** Sales channel, currency, stock location and shipping profile of the admin's store. */
export async function storeContext(container: Container, storeId: string) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const store = await getStore(container, storeId);
  if (!store.default_sales_channel_id) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, 'Store has no default sales channel');
  }
  const { data: locs } = await query.graph({
    entity: 'sales_channel_location',
    fields: ['stock_location_id'],
    filters: { sales_channel_id: store.default_sales_channel_id },
  });
  const { data: profiles } = await query.graph({
    entity: 'shipping_profile',
    fields: ['id'],
    pagination: { take: 1 },
  });
  return {
    store,
    salesChannelId: store.default_sales_channel_id as string,
    currency: storeCurrency(store),
    stockLocationId: ((locs[0] as any)?.stock_location_id as string | undefined) ?? null,
    shippingProfileId: ((profiles[0] as any)?.id as string | undefined) ?? null,
  };
}

async function productIdsInChannel(container: Container, salesChannelId: string) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const { data } = await query.graph({
    entity: 'product_sales_channel',
    fields: ['product_id'],
    filters: { sales_channel_id: salesChannelId },
  });
  return [...new Set((data as { product_id: string }[]).map((l) => l.product_id))];
}

export async function assertProductInStore(
  container: Container,
  storeId: string,
  productId: string
) {
  const ctx = await storeContext(container, storeId);
  const ids = await productIdsInChannel(container, ctx.salesChannelId);
  if (!ids.includes(productId)) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, 'Product not found in this store');
  }
  return ctx;
}

const PRODUCT_FIELDS = [
  'id',
  'title',
  'handle',
  'description',
  'status',
  'thumbnail',
  'images.url',
  'categories.id',
  'categories.name',
  'variants.id',
  'variants.sku',
  'variants.title',
  'variants.manage_inventory',
  'variants.price_set.prices.amount',
  'variants.price_set.prices.currency_code',
  'variants.price_set.prices.rules_count',
  'variants.inventory_items.inventory.location_levels.location_id',
  'variants.inventory_items.inventory.location_levels.stocked_quantity',
];

async function shapeProducts(
  container: Container,
  ctx: Awaited<ReturnType<typeof storeContext>>,
  rows: any[]
) {
  const portal = container.resolve<PortalModuleService>(PORTAL_MODULE);
  const variantIds = rows.flatMap((p) => (p.variants ?? []).map((v: any) => v.id));
  const pricing = variantIds.length
    ? await portal.listVariantCosts({ variant_id: variantIds })
    : [];
  const byVariant = new Map(pricing.map((c) => [c.variant_id, c]));

  return rows.map((p) => ({
    id: p.id,
    title: p.title,
    handle: p.handle,
    description: p.description,
    status: p.status,
    thumbnail: p.thumbnail,
    images: (p.images ?? []).map((i: any) => i.url),
    categories: (p.categories ?? []).map((c: any) => ({ id: c.id, name: c.name })),
    variants: (p.variants ?? []).map((v: any) => {
      const price = (v.price_set?.prices ?? []).find(
        (x: any) => x.currency_code === ctx.currency && !(x.rules_count > 0)
      );
      const suggested = price ? Number(price.amount) : null;
      const vc = byVariant.get(v.id);
      const levels = (v.inventory_items ?? []).flatMap(
        (ii: any) => ii.inventory?.location_levels ?? []
      );
      const atStore = levels.filter(
        (l: any) => !ctx.stockLocationId || l.location_id === ctx.stockLocationId
      );
      return {
        id: v.id,
        sku: v.sku,
        title: v.title,
        suggested_price: suggested,
        original_price: vc?.original_price != null ? Number(vc.original_price) : suggested,
        original_cost: vc?.original_cost != null ? Number(vc.original_cost) : null,
        manage_inventory: !!v.manage_inventory,
        quantity: v.manage_inventory
          ? atStore.reduce((sum: number, l: any) => sum + Number(l.stocked_quantity ?? 0), 0)
          : null,
      };
    }),
  }));
}

export async function listAdminProducts(
  container: Container,
  storeId: string,
  opts: { limit: number; offset: number }
) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const ctx = await storeContext(container, storeId);
  const ids = await productIdsInChannel(container, ctx.salesChannelId);
  if (!ids.length) {
    return { products: [], count: 0, currency_code: ctx.currency };
  }
  const { data, metadata } = await query.graph({
    entity: 'product',
    fields: PRODUCT_FIELDS,
    filters: { id: ids },
    pagination: { take: opts.limit, skip: opts.offset, order: { created_at: 'DESC' } },
  });
  return {
    products: await shapeProducts(container, ctx, data as any[]),
    count: metadata?.count ?? data.length,
    currency_code: ctx.currency,
  };
}

export async function getAdminProduct(container: Container, storeId: string, productId: string) {
  const ctx = await assertProductInStore(container, storeId, productId);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const { data } = await query.graph({
    entity: 'product',
    fields: PRODUCT_FIELDS,
    filters: { id: productId },
  });
  const [product] = await shapeProducts(container, ctx, data as any[]);
  return { product, currency_code: ctx.currency };
}

// ---- Inventory --------------------------------------------------------------

/** Sets the stocked quantity at the store's location, creating inventory if needed. */
async function setQuantity(
  container: Container,
  ctx: Awaited<ReturnType<typeof storeContext>>,
  variantId: string,
  quantity: number
) {
  if (!ctx.stockLocationId) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, 'Store has no stock location');
  }
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const productModule = container.resolve(Modules.PRODUCT);
  const { data } = await query.graph({
    entity: 'product_variant',
    fields: ['id', 'sku', 'inventory_items.inventory_item_id'],
    filters: { id: variantId },
  });
  const variant = data[0] as any;
  let itemId: string | undefined = variant?.inventory_items?.[0]?.inventory_item_id;

  if (itemId) {
    const { data: levels } = await query.graph({
      entity: 'inventory_level',
      fields: ['id'],
      filters: { inventory_item_id: itemId, location_id: ctx.stockLocationId },
    });
    if (levels.length) {
      await updateInventoryLevelsWorkflow(container as any).run({
        input: {
          updates: [
            {
              inventory_item_id: itemId,
              location_id: ctx.stockLocationId,
              stocked_quantity: quantity,
            },
          ],
        },
      });
    } else {
      await createInventoryLevelsWorkflow(container as any).run({
        input: {
          inventory_levels: [
            {
              inventory_item_id: itemId,
              location_id: ctx.stockLocationId,
              stocked_quantity: quantity,
            },
          ],
        },
      });
    }
  } else {
    const { result } = await createInventoryItemsWorkflow(container as any).run({
      input: {
        items: [
          {
            requires_shipping: true,
            location_levels: [{ location_id: ctx.stockLocationId, stocked_quantity: quantity }],
          },
        ],
      },
    });
    itemId = (result as any[])[0].id as string;
    const link = container.resolve(ContainerRegistrationKeys.LINK);
    await link.create({
      [Modules.PRODUCT]: { variant_id: variantId },
      [Modules.INVENTORY]: { inventory_item_id: itemId },
    });
  }
  await productModule.updateProductVariants(variantId, { manage_inventory: true });
}

// ---- Products ---------------------------------------------------------------

export type CreateProductInput = {
  title: string;
  description?: string | null;
  handle?: string | null;
  status: 'draft' | 'published';
  category_ids: string[];
  thumbnail?: string | null;
  variant: {
    title: string;
    sku?: string | null;
    price: number;
    original_price?: number | null;
    original_cost?: number | null;
    quantity?: number | null;
  };
};

export async function createStoreProduct(
  container: Container,
  storeId: string,
  input: CreateProductInput
) {
  const ctx = await storeContext(container, storeId);
  const v = input.variant;
  validatePricing(v.price, v.original_price ?? v.price, v.original_cost ?? null);

  const handle = await uniqueHandle(container, 'product', slugify(input.handle || input.title));
  const optionTitle = 'Phiên bản';
  const { result } = await createProductsWorkflow(container as any).run({
    input: {
      products: [
        {
          title: input.title,
          handle,
          description: input.description ?? undefined,
          status: input.status,
          thumbnail: input.thumbnail ?? undefined,
          images: input.thumbnail ? [{ url: input.thumbnail }] : undefined,
          category_ids: input.category_ids,
          sales_channels: [{ id: ctx.salesChannelId }],
          shipping_profile_id: ctx.shippingProfileId ?? undefined,
          metadata: { portal_store_id: storeId },
          options: [{ title: optionTitle, values: [v.title] }],
          variants: [
            {
              title: v.title,
              sku: v.sku || undefined,
              options: { [optionTitle]: v.title },
              manage_inventory: false,
              prices: [{ amount: v.price, currency_code: ctx.currency }],
            },
          ],
        },
      ],
    },
  });
  const product = (result as any[])[0];
  const variantId = product.variants[0].id as string;

  const portal = container.resolve<PortalModuleService>(PORTAL_MODULE);
  await portal.createVariantCosts({
    variant_id: variantId,
    original_price: v.original_price ?? null,
    original_cost: v.original_cost ?? null,
  });
  if (v.quantity !== null && v.quantity !== undefined) {
    await setQuantity(container, ctx, variantId, v.quantity);
  }
  await revalidateStorefront(container, ['products', 'collections', 'categories']);
  return { id: product.id as string, handle };
}

export type UpdateProductInput = {
  title?: string;
  description?: string | null;
  handle?: string;
  status?: 'draft' | 'published';
  category_ids?: string[];
  thumbnail?: string | null;
  variants?: {
    id: string;
    title?: string;
    sku?: string | null;
    price?: number;
    original_price?: number | null;
    original_cost?: number | null;
    quantity?: number | null;
  }[];
};

export async function updateStoreProduct(
  container: Container,
  storeId: string,
  productId: string,
  input: UpdateProductInput
) {
  const ctx = await assertProductInStore(container, storeId, productId);
  const { product: current } = await getAdminProduct(container, storeId, productId);
  const productModule = container.resolve(Modules.PRODUCT);

  const update: Record<string, unknown> = {};
  for (const k of ['title', 'description', 'status'] as const) {
    if (input[k] !== undefined) {
      update[k] = input[k];
    }
  }
  // Create takes category_ids; update takes categories: [{ id }].
  if (input.category_ids !== undefined) {
    update.categories = input.category_ids.map((id) => ({ id }));
  }
  if (input.handle && input.handle !== current.handle) {
    update.handle = await uniqueHandle(container, 'product', slugify(input.handle));
  }
  if (input.thumbnail !== undefined && input.thumbnail !== current.thumbnail) {
    update.thumbnail = input.thumbnail;
    // The new main image goes first; the other gallery images stay.
    update.images = input.thumbnail
      ? [
          { url: input.thumbnail },
          ...current.images
            .filter((u: string) => u !== current.thumbnail && u !== input.thumbnail)
            .map((url: string) => ({ url })),
        ]
      : current.images
          .filter((u: string) => u !== current.thumbnail)
          .map((url: string) => ({ url }));
  }
  if (Object.keys(update).length) {
    await updateProductsWorkflow(container as any).run({
      input: { selector: { id: productId }, update: update as any },
    });
  }

  const ownVariants = new Set(current.variants.map((v: any) => v.id));
  for (const v of input.variants ?? []) {
    if (!ownVariants.has(v.id)) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, 'Variant not found on this product');
    }
    const patch: Record<string, unknown> = {};
    if (v.title !== undefined) patch.title = v.title;
    if (v.sku !== undefined) patch.sku = v.sku || null;
    if (Object.keys(patch).length) {
      await productModule.updateProductVariants(v.id, patch);
    }
    if (v.price !== undefined || v.original_price !== undefined || v.original_cost !== undefined) {
      await setVariantPricing(container, storeId, v.id, {
        price: v.price,
        original_price: v.original_price,
        original_cost: v.original_cost,
      });
    }
    if (v.quantity !== undefined && v.quantity !== null) {
      await setQuantity(container, ctx, v.id, v.quantity);
    }
  }
  await revalidateStorefront(container, ['products', 'collections', 'categories']);
  return { id: productId };
}

export async function deleteStoreProduct(container: Container, storeId: string, productId: string) {
  await assertProductInStore(container, storeId, productId);
  const { product } = await getAdminProduct(container, storeId, productId);
  const portal = container.resolve<PortalModuleService>(PORTAL_MODULE);
  const open = await portal.listCollabRequests({
    variant_id: product.variants.map((v: any) => v.id),
    status: ['pending', 'approved'],
  });
  if (open.length) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      'Product has open collaborator requests. Resolve them before deleting it'
    );
  }
  await deleteProductsWorkflow(container as any).run({ input: { ids: [productId] } });
  await revalidateStorefront(container, ['products', 'collections', 'categories']);
  return { id: productId };
}

// ---- Categories -------------------------------------------------------------
// Categories are shared by every store in Medusa. A portal admin can assign any of
// them to their products, but only edits or deletes the ones their store created.

export async function listCategories(container: Container, storeId: string) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const { data } = await query.graph({
    entity: 'product_category',
    fields: ['id', 'name', 'handle', 'description', 'is_active', 'parent_category_id', 'metadata'],
    pagination: { take: 500 },
  });
  return (data as any[])
    .map((c) => ({
      id: c.id,
      name: c.name,
      handle: c.handle,
      description: c.description,
      is_active: c.is_active,
      parent_category_id: c.parent_category_id,
      owned: c.metadata?.portal_store_id === storeId,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

async function assertOwnedCategory(container: Container, storeId: string, id: string) {
  const owned = (await listCategories(container, storeId)).find((c) => c.id === id);
  if (!owned) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, 'Category not found');
  }
  if (!owned.owned) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      'This category is shared and can only be changed by the platform admin'
    );
  }
  return owned;
}

export async function createCategory(
  container: Container,
  storeId: string,
  input: { name: string; description?: string | null; is_active: boolean }
) {
  const handle = await uniqueHandle(container, 'product_category', slugify(input.name));
  const { result } = await createProductCategoriesWorkflow(container as any).run({
    input: {
      product_categories: [
        {
          name: input.name,
          handle,
          description: input.description ?? undefined,
          is_active: input.is_active,
          metadata: { portal_store_id: storeId },
        },
      ],
    },
  });
  await revalidateStorefront(container, ['categories']);
  return { id: (result as any[])[0].id as string };
}

export async function updateCategory(
  container: Container,
  storeId: string,
  id: string,
  input: { name?: string; description?: string | null; is_active?: boolean }
) {
  await assertOwnedCategory(container, storeId, id);
  await updateProductCategoriesWorkflow(container as any).run({
    input: { selector: { id }, update: input as any },
  });
  await revalidateStorefront(container, ['categories']);
  return { id };
}

export async function deleteCategory(container: Container, storeId: string, id: string) {
  await assertOwnedCategory(container, storeId, id);
  await deleteProductCategoriesWorkflow(container as any).run({ input: [id] });
  await revalidateStorefront(container, ['categories']);
  return { id };
}
