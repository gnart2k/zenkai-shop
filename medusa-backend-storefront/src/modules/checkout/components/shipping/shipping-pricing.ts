import { calculatePriceForShippingOption } from '@lib/data/fulfillment';
import { resolveCalculatedAmountFromCalculateResponse } from '@lib/util/shipping-calculated-amount';
import { HttpTypes } from '@medusajs/types';
import { useEffect, useMemo, useState } from 'react';

type ShippingOptionZone = {
  service_zone?: {
    fulfillment_set?: {
      type?: string;
      location?: {
        address?: HttpTypes.StoreCartAddress;
      };
    };
  };
};

export type ShippingOptionWithZone = HttpTypes.StoreCartShippingOption &
  ShippingOptionZone;

export { resolveCalculatedAmountFromCalculateResponse };

export function getDisplayAmountForShippingOption(
  option: ShippingOptionWithZone,
  calculatedPricesMap: Record<string, number>
): number | null {
  const fromMap = calculatedPricesMap[option.id];

  if (typeof fromMap === 'number' && Number.isFinite(fromMap)) {
    return fromMap;
  }

  if (option.price_type === 'flat' && typeof option.amount === 'number') {
    return option.amount;
  }

  const cap = option.calculated_price?.calculated_amount;

  if (typeof cap === 'number' && Number.isFinite(cap)) {
    return cap;
  }

  return null;
}

type QuotePackageMetrics = {
  weight: number;
  length: number;
  width: number;
  height: number;
};

const DEFAULT_PACKAGE_WEIGHT = 200;
const DEFAULT_PACKAGE_DIMENSION = 20;
const SHIPPING_TRACE_PREFIX = '[GHN][checkout/shipping]';
const TRACE = '[GHN][trace]';

const getAddressMetadataString = (
  metadata: Record<string, unknown> | null | undefined,
  key: string
) => {
  const value = metadata?.[key];

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number') {
    return String(value);
  }

  return '';
};

const parsePositiveNumber = (value: unknown, fallback: number) => {
  const parsed = Number(value);

  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
};

const getGhnPackageMetrics = (cart: HttpTypes.StoreCart): QuotePackageMetrics => {
  if (!cart.items?.length) {
    return {
      weight: DEFAULT_PACKAGE_WEIGHT,
      length: DEFAULT_PACKAGE_DIMENSION,
      width: DEFAULT_PACKAGE_DIMENSION,
      height: DEFAULT_PACKAGE_DIMENSION,
    };
  }

  const metrics = cart.items.reduce(
    (acc, item) => {
      const variant = item.variant as Record<string, unknown> | undefined;
      const product = item.product as Record<string, unknown> | undefined;
      const quantity = item.quantity || 1;

      const weight = parsePositiveNumber(
        variant?.weight ?? product?.weight,
        DEFAULT_PACKAGE_WEIGHT
      );
      const length = parsePositiveNumber(
        variant?.length ?? product?.length,
        DEFAULT_PACKAGE_DIMENSION
      );
      const width = parsePositiveNumber(
        variant?.width ?? product?.width,
        DEFAULT_PACKAGE_DIMENSION
      );
      const height = parsePositiveNumber(
        variant?.height ?? product?.height,
        DEFAULT_PACKAGE_DIMENSION
      );

      acc.weight += weight * quantity;
      acc.length = Math.max(acc.length, length);
      acc.width = Math.max(acc.width, width);
      acc.height = Math.max(acc.height, height);

      return acc;
    },
    {
      weight: 0,
      length: 0,
      width: 0,
      height: 0,
    }
  );

  return {
    weight: Math.min(Math.max(Math.round(metrics.weight), 1), 50000),
    length: Math.min(Math.max(Math.round(metrics.length), 1), 200),
    width: Math.min(Math.max(Math.round(metrics.width), 1), 200),
    height: Math.min(Math.max(Math.round(metrics.height), 1), 200),
  };
};

export const splitShippingOptions = (options: ShippingOptionWithZone[]) => {
  const shippingMethods = options.filter(
    (option) => option.service_zone?.fulfillment_set?.type !== 'pickup'
  );
  const pickupMethods = options.filter(
    (option) => option.service_zone?.fulfillment_set?.type === 'pickup'
  );

  return {
    shippingMethods,
    pickupMethods,
  };
};

/** Seed `ghn-standard` — GHN Standard (service_type_id 2) */
export const VN_DEFAULT_GHN_SHIPPING_TYPE_CODE = 'ghn-standard' as const;

/**
 * For Vietnam ship-to-address, only expose GHN Standard so checkout defaults to that tier.
 * If Standard is not in the list, fall back to all options so checkout still works.
 */
export const filterVnStandardShippingMethods = (
  shippingMethods: ShippingOptionWithZone[],
  vnShipToAddress: boolean
): ShippingOptionWithZone[] => {
  if (!vnShipToAddress) {
    return shippingMethods;
  }

  const standardOnly = shippingMethods.filter(
    (option) =>
      option.type?.code === VN_DEFAULT_GHN_SHIPPING_TYPE_CODE ||
      option.name === 'GHN Standard'
  );

  return standardOnly.length > 0 ? standardOnly : shippingMethods;
};

export const useShippingPricing = ({
  cart,
  shippingMethods,
}: {
  cart: HttpTypes.StoreCart;
  shippingMethods: ShippingOptionWithZone[];
}) => {
  const [isLoadingPrices, setIsLoadingPrices] = useState(true);
  const [calculatedPricesMap, setCalculatedPricesMap] = useState<
    Record<string, number>
  >({});
  const [calculatePriceErrorsByOptionId, setCalculatePriceErrorsByOptionId] =
    useState<Record<string, string>>({});

  const shippingAddressMetadata = cart.shipping_address?.metadata as
    | Record<string, unknown>
    | undefined;
  const ghnDistrictRaw = getAddressMetadataString(
    shippingAddressMetadata,
    'ghn_district_id'
  );
  const ghnDistrictId = Number(ghnDistrictRaw);
  const ghnWardCode = getAddressMetadataString(
    shippingAddressMetadata,
    'ghn_ward_code'
  );
  const isVietnamShippingAddress =
    cart.shipping_address?.country_code?.toLowerCase() === 'vn';
  const hasValidGhnDistrict =
    ghnDistrictRaw !== '' &&
    Number.isFinite(ghnDistrictId) &&
    ghnDistrictId > 0;
  const shouldUseGhnQuotes =
    isVietnamShippingAddress &&
    hasValidGhnDistrict &&
    ghnWardCode.trim().length > 0;
  const packageMetrics = useMemo(() => getGhnPackageMetrics(cart), [cart]);

  useEffect(() => {
    let isMounted = true;

    const loadShippingPrices = async () => {
      setIsLoadingPrices(true);
      setCalculatedPricesMap({});
      setCalculatePriceErrorsByOptionId({});

      console.info(`${TRACE} useShippingPricing:start`, {
        cartId: cart.id,
        isVietnamShippingAddress,
        hasValidGhnDistrict,
        ghnDistrictRaw:
          ghnDistrictRaw !== '' ? ghnDistrictRaw : '(empty)',
        ghnDistrictIdParsed: Number.isFinite(ghnDistrictId)
          ? ghnDistrictId
          : null,
        ghnWardCodePresent: ghnWardCode.trim().length > 0,
        shouldUseGhnQuotes,
        shippingMethodCount: shippingMethods.length,
        calculatedCount: shippingMethods.filter(
          (o) => o.price_type === 'calculated'
        ).length,
        packageMetrics,
      })

      if (!shippingMethods.length) {
        console.info(`${TRACE} useShippingPricing:no shipping methods`, {
          cartId: cart.id,
        })
        if (isMounted) {
          setIsLoadingPrices(false);
        }

        return;
      }

      const calculatedShippingMethods = shippingMethods.filter((shippingMethod) => {
        return shippingMethod.price_type === 'calculated';
      });

      if (!calculatedShippingMethods.length) {
        console.info(`${TRACE} useShippingPricing:no calculated options`, {
          cartId: cart.id,
          optionPriceTypes: shippingMethods.map((o) => ({
            id: o.id,
            price_type: o.price_type,
          })),
        })
        if (isMounted) {
          setIsLoadingPrices(false);
        }

        return;
      }

      const calculationData =
        shouldUseGhnQuotes && ghnDistrictId && ghnWardCode
          ? {
              to_district_id: ghnDistrictId,
              to_ward_code: ghnWardCode,
              package_weight: packageMetrics.weight,
              package_length: packageMetrics.length,
              package_width: packageMetrics.width,
              package_height: packageMetrics.height,
            }
          : undefined;

      console.info(`${SHIPPING_TRACE_PREFIX} prices:using Medusa calculate`, {
        cartId: cart.id,
        shouldUseGhnQuotes,
        calculationData: calculationData || null,
      });

      const outcomes = await Promise.all(
        calculatedShippingMethods.map((shippingMethod) => {
          return calculatePriceForShippingOption(
            shippingMethod.id,
            cart.id,
            calculationData
          );
        })
      );

      if (!isMounted) {
        return;
      }

      const pricesMap: Record<string, number> = {};
      const errorsMap: Record<string, string> = {};

      calculatedShippingMethods.forEach((shippingMethod, index) => {
        const outcome = outcomes[index];
        if (!outcome) {
          return;
        }

        if (outcome.error) {
          errorsMap[shippingMethod.id] = outcome.error;
          console.warn(`${TRACE} useShippingPricing:calculate error for option`, {
            cartId: cart.id,
            optionId: shippingMethod.id,
            optionName: shippingMethod.name,
            error: outcome.error,
          });
          return;
        }

        if (!outcome.shipping_option?.id) {
          errorsMap[shippingMethod.id] =
            'No shipping option in calculate response.';
          return;
        }

        const resolved = resolveCalculatedAmountFromCalculateResponse(
          outcome.shipping_option
        );

        if (typeof resolved === 'number') {
          pricesMap[shippingMethod.id] = resolved;
        } else {
          errorsMap[shippingMethod.id] =
            outcome.error ||
            'Medusa returned no price for this option after calculate.';
        }
      });

      console.info(`${SHIPPING_TRACE_PREFIX} prices:medusa resolved`, {
        pricesMap,
        errorsMap,
      });
      console.info(`${TRACE} useShippingPricing:resolved map`, {
        cartId: cart.id,
        pricesMap,
        errorOptionIds: Object.keys(errorsMap),
      });

      setCalculatedPricesMap(pricesMap);
      setCalculatePriceErrorsByOptionId(errorsMap);
      setIsLoadingPrices(false);
    };

    loadShippingPrices().catch((error) => {
      console.error(`${SHIPPING_TRACE_PREFIX} prices:unexpected error`, {
        error: error instanceof Error ? error.message : String(error),
      });

      if (isMounted) {
        setIsLoadingPrices(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [
    cart.id,
    shippingAddressMetadata,
    shippingMethods,
    shouldUseGhnQuotes,
    ghnDistrictId,
    ghnWardCode,
    packageMetrics,
  ]);

  const vnNeedsGhnAddressMetadata =
    isVietnamShippingAddress && !shouldUseGhnQuotes;

  return {
    isLoadingPrices,
    calculatedPricesMap,
    calculatePriceErrorsByOptionId,
    packageMetrics,
    shouldUseGhnQuotes,
    ghnDistrictId,
    ghnWardCode,
    vnNeedsGhnAddressMetadata,
  };
};

export const buildShippingMethodData = ({
  shouldUseGhnQuotes,
  ghnDistrictId,
  ghnWardCode,
  packageMetrics,
}: {
  shouldUseGhnQuotes: boolean;
  ghnDistrictId: number;
  ghnWardCode: string;
  packageMetrics: QuotePackageMetrics;
}) => {
  const ward = ghnWardCode.trim();
  if (!shouldUseGhnQuotes || !ghnDistrictId || !ward) {
    return undefined;
  }

  return {
    carrier: 'ghn',
    to_district_id: ghnDistrictId,
    to_ward_code: ward,
    package_weight: packageMetrics.weight,
    package_length: packageMetrics.length,
    package_width: packageMetrics.width,
    package_height: packageMetrics.height,
  };
};
