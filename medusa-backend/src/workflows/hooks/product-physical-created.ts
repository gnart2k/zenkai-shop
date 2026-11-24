import { Modules } from '@medusajs/framework/utils';
import { createProductsWorkflow } from '@medusajs/medusa/core-flows';
import { fillMissingSkus, variantsFromProducts } from '../../lib/variant-sku';

type ProductLike = {
  id: string;
  metadata?: Record<string, unknown> | null;
};

function readIsPhysical(additionalData: Record<string, unknown> | undefined): boolean | undefined {
  const raw = additionalData?.is_physical;
  if (raw === true || raw === false) {
    return raw;
  }
  if (raw === 'true') {
    return true;
  }
  if (raw === 'false') {
    return false;
  }
  return undefined;
}

async function applyDigitalVariantPolicy(
  container: { resolve: (name: string) => any },
  productIds: string[]
) {
  if (!productIds.length) {
    return;
  }

  const productModuleService = container.resolve(Modules.PRODUCT);
  await productModuleService.updateProductVariants(
    { product_id: productIds },
    {
      manage_inventory: false,
      allow_backorder: true,
    }
  );
}

createProductsWorkflow.hooks.productsCreated(
  async ({ products, additional_data }, { container }) => {
    // Every new product gets SKUs on its variants, whether or not is_physical was sent.
    const { titles, variants } = variantsFromProducts((products ?? []) as any[]);
    await fillMissingSkus(container, variants, titles);

    const isPhysical = readIsPhysical(additional_data as Record<string, unknown> | undefined);
    if (isPhysical === undefined) {
      return;
    }

    const productModuleService = container.resolve(Modules.PRODUCT);
    const productRows = (products ?? []) as ProductLike[];

    await productModuleService.upsertProducts(
      productRows.map((product) => ({
        id: product.id,
        metadata: {
          ...(product.metadata ?? {}),
          is_physical: isPhysical,
        },
      }))
    );

    if (!isPhysical) {
      await applyDigitalVariantPolicy(
        container,
        productRows.map((p) => p.id)
      );
    }
  }
);
