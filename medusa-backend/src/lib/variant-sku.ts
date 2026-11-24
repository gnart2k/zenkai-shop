import { Modules } from '@medusajs/framework/utils';
import { generateSku } from './sku';

export type VariantRow = {
  id: string;
  sku?: string | null;
  title?: string | null;
  product_id?: string;
};

/** Flattens the products a workflow just created into variant rows with their product title. */
export function variantsFromProducts(products: any[]) {
  const titles = new Map<string, string>();
  const variants: VariantRow[] = [];
  for (const p of products ?? []) {
    titles.set(p.id, p.title);
    for (const v of p.variants ?? []) {
      variants.push({ ...v, product_id: v.product_id ?? p.id });
    }
  }
  return { titles, variants };
}

/** Gives every variant without a SKU an auto-generated one. Never overwrites a SKU. */
export async function fillMissingSkus(
  container: { resolve: (k: string) => any },
  variants: VariantRow[],
  productTitles: Map<string, string> = new Map()
) {
  const missing = variants.filter((v) => !v.sku);
  if (!missing.length) {
    return;
  }
  const productModule = container.resolve(Modules.PRODUCT);

  const unknownIds = [
    ...new Set(
      missing.map((v) => v.product_id).filter((id): id is string => !!id && !productTitles.has(id))
    ),
  ];
  if (unknownIds.length) {
    const found = await productModule.listProducts({ id: unknownIds }, { select: ['id', 'title'] });
    for (const p of found) {
      productTitles.set(p.id, p.title);
    }
  }

  for (const v of missing) {
    const title = (v.product_id && productTitles.get(v.product_id)) || v.title || 'SKU';
    await productModule.updateProductVariants(v.id, { sku: generateSku(title, v.id) });
  }
}
