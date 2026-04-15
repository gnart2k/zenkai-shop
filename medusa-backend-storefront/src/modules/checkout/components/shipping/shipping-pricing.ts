import { calculatePriceForShippingOption } from '@lib/data/fulfillment';
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

type QuotePackageMetrics = {
  weight: number;
  length: number;
  width: number;
  height: number;
};

const DEFAULT_PACKAGE_WEIGHT = 200;
const DEFAULT_PACKAGE_DIMENSION = 20;
const SHIPPING_TRACE_PREFIX = '[GHN][checkout/shipping]';

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

  const shippingAddressMetadata = cart.shipping_address?.metadata as
    | Record<string, unknown>
    | undefined;
  const ghnDistrictId = Number(
    getAddressMetadataString(shippingAddressMetadata, 'ghn_district_id')
  );
  const ghnWardCode = getAddressMetadataString(
    shippingAddressMetadata,
    'ghn_ward_code'
  );
  const isVietnamShippingAddress =
    cart.shipping_address?.country_code?.toLowerCase() === 'vn';
  const shouldUseGhnQuotes =
    isVietnamShippingAddress && !Number.isNaN(ghnDistrictId) && !!ghnWardCode;
  const packageMetrics = useMemo(() => getGhnPackageMetrics(cart), [cart]);

  useEffect(() => {
    let isMounted = true;

    const loadShippingPrices = async () => {
      setIsLoadingPrices(true);
      setCalculatedPricesMap({});

      if (!shippingMethods.length) {
        if (isMounted) {
          setIsLoadingPrices(false);
        }

        return;
      }

      const calculatedShippingMethods = shippingMethods.filter((shippingMethod) => {
        return shippingMethod.price_type === 'calculated';
      });

      if (!calculatedShippingMethods.length) {
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

      const results = await Promise.allSettled(
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

      results
        .filter((result) => result.status === 'fulfilled')
        .forEach((result) => {
          if (!result.value?.id || typeof result.value.amount !== 'number') {
            return;
          }

          pricesMap[result.value.id] = result.value.amount;
        });

      console.info(`${SHIPPING_TRACE_PREFIX} prices:medusa resolved`, {
        pricesMap,
      });

      setCalculatedPricesMap(pricesMap);
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

  return {
    isLoadingPrices,
    calculatedPricesMap,
    packageMetrics,
    shouldUseGhnQuotes,
    ghnDistrictId,
    ghnWardCode,
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
  if (!shouldUseGhnQuotes || !ghnDistrictId || !ghnWardCode) {
    return undefined;
  }

  return {
    carrier: 'ghn',
    to_district_id: ghnDistrictId,
    to_ward_code: ghnWardCode,
    package_weight: packageMetrics.weight,
    package_length: packageMetrics.length,
    package_width: packageMetrics.width,
    package_height: packageMetrics.height,
  };
};
