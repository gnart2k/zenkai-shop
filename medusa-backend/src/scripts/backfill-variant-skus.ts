import type { ExecArgs } from '@medusajs/framework/types';
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils';
import { generateSku } from '../lib/sku';

/**
 * Gives existing variants without a SKU a generated one (same format as the
 * auto-create hook). Dry run by default; pass APPLY=1 to write.
 *   pnpm medusa exec ./src/scripts/backfill-variant-skus.ts        (dry run)
 *   APPLY=1 pnpm medusa exec ./src/scripts/backfill-variant-skus.ts
 */
export default async function backfillVariantSkus({ container }: ExecArgs) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const productModule = container.resolve(Modules.PRODUCT);
  const apply = process.env.APPLY === '1';

  const { data } = await query.graph({
    entity: 'product_variant',
    fields: ['id', 'sku', 'title', 'product.title'],
  });
  const missing = (data as any[]).filter((v) => !v.sku);
  console.log(`${missing.length} of ${data.length} variants have no SKU`);

  for (const v of missing) {
    const sku = generateSku(v.product?.title ?? v.title ?? 'SKU', v.id);
    console.log(`${apply ? 'SET ' : 'DRY '} ${v.id} -> ${sku}  (${v.product?.title})`);
    if (apply) {
      await productModule.updateProductVariants(v.id, { sku });
    }
  }
  console.log(apply ? 'Done.' : 'Dry run only. Re-run with APPLY=1 to write.');
}
