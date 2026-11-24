import { createProductVariantsWorkflow } from '@medusajs/medusa/core-flows';
import { fillMissingSkus, type VariantRow } from '../../lib/variant-sku';

// Variants added to an existing product. Products created with their variants are
// handled inside product-physical-created.ts: Medusa allows one handler per hook, and
// that file already owns `productsCreated`.
createProductVariantsWorkflow.hooks.productVariantsCreated(
  async ({ product_variants }, { container }) => {
    await fillMissingSkus(container, (product_variants ?? []) as VariantRow[]);
  }
);
