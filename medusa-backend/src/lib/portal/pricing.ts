import type { MedusaContainer } from '@medusajs/framework/types';
import { MedusaError } from '@medusajs/framework/utils';
import { PORTAL_MODULE } from '../../modules/portal';
import type PortalModuleService from '../../modules/portal/service';
import { resolveVariantForStore, revalidateStorefront, updateSuggestedPrice } from './catalog';

type Container = Pick<MedusaContainer, 'resolve'>;

export type PricingInput = {
  /** Suggested price = the store price. */
  price?: number;
  /** Collaborator-facing base price. null resets it to "same as the store price". */
  original_price?: number | null;
  /** Private cost. null clears it. */
  original_cost?: number | null;
};

/** cost <= original price <= suggested price. */
export function validatePricing(price: number, originalPrice: number, cost: number | null) {
  if (originalPrice > price) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      'Original price cannot be higher than the suggested price'
    );
  }
  if (cost !== null && cost > originalPrice) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      'Original cost cannot be higher than the original price'
    );
  }
}

/**
 * Sets the three prices of one variant atomically (validated together). Changing the
 * suggested price changes the store price too. Fields left undefined keep their value.
 */
export async function setVariantPricing(
  container: Container,
  storeId: string,
  variantId: string,
  input: PricingInput
) {
  const resolved = await resolveVariantForStore(container, storeId, variantId, {
    requirePublished: false,
  });
  const portal = container.resolve<PortalModuleService>(PORTAL_MODULE);
  const [row] = await portal.listVariantCosts({ variant_id: variantId }, { take: 1 });

  const price = input.price ?? resolved.suggested_price;
  const explicitOriginal =
    input.original_price !== undefined
      ? input.original_price
      : row?.original_price != null
        ? Number(row.original_price)
        : null;
  const cost =
    input.original_cost !== undefined
      ? input.original_cost
      : row?.original_cost != null
        ? Number(row.original_cost)
        : null;

  validatePricing(price, explicitOriginal ?? price, cost);

  const priceChanged = price !== resolved.suggested_price;
  if (priceChanged) {
    await updateSuggestedPrice(container, storeId, variantId, price);
  }
  if (row) {
    await portal.updateVariantCosts({
      id: row.id,
      original_price: explicitOriginal,
      original_cost: cost,
    });
  } else {
    await portal.createVariantCosts({
      variant_id: variantId,
      original_price: explicitOriginal,
      original_cost: cost,
    });
  }
  if (priceChanged) {
    await revalidateStorefront(container, ['products', 'collections', 'categories']);
  }
  return {
    variant_id: variantId,
    suggested_price: price,
    original_price: explicitOriginal ?? price,
    original_cost: cost,
  };
}
