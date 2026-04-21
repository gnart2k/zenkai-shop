import {
  CalculateShippingOptionPriceDTO,
  CreateFulfillmentResult,
  CreateShippingOptionDTO,
  FulfillmentDTO,
  FulfillmentItemDTO,
  FulfillmentOption,
  FulfillmentOrderDTO,
  Logger,
  ValidateFulfillmentDataContext,
} from '@medusajs/framework/types';
import {
  AbstractFulfillmentProviderService,
  MedusaError,
} from '@medusajs/framework/utils';
import GhnClient from './client';
import {
  DEFAULT_GHN_API_BASE_URL,
  DEFAULT_PACKAGE_DIMENSION,
  DEFAULT_PACKAGE_WEIGHT,
  GHN_SERVICE_TYPE_OPTIONS,
} from './types';

type InjectedDependencies = {
  logger: Logger;
};

type GhnFulfillmentOptions = {
  api_base_url?: string;
  api_token?: string;
  shop_id?: string | number;
  from_district_id?: string | number;
  from_ward_code?: string;
  service_discovery_district_id?: string | number;
  default_weight?: string | number;
  default_length?: string | number;
  default_width?: string | number;
  default_height?: string | number;
  request_timeout_ms?: string | number;
};

type ResolvedGhnFulfillmentOptions = {
  apiBaseUrl: string;
  token?: string;
  shopId?: number;
  fromDistrictId?: number;
  fromWardCode?: string;
  serviceDiscoveryDistrictId?: number;
  defaultWeight: number;
  defaultLength: number;
  defaultWidth: number;
  defaultHeight: number;
  requestTimeoutMs: number;
};

type PackageMetrics = {
  weight: number;
  length: number;
  width: number;
  height: number;
};

/** Subset of stock location shape Medusa passes on calculatePrice `context.from_location`. */
type FulfillmentFromLocation = {
  id?: string;
  metadata?: Record<string, unknown> | null;
  address?: {
    metadata?: Record<string, unknown> | null;
  };
};

const getStringValue = (
  source: Record<string, unknown> | null | undefined,
  key: string
) => {
  if (!source) {
    return undefined;
  }

  const value = source[key];

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
  }

  if (typeof value === 'number') {
    return String(value);
  }

  return undefined;
};

const getNumberValue = (
  source: Record<string, unknown> | null | undefined,
  key: string
) => {
  const value = getStringValue(source, key);

  if (!value) {
    return undefined;
  }

  const parsed = Number(value);

  if (Number.isNaN(parsed)) {
    return undefined;
  }

  return parsed;
};

const parseOptionalNumber = (value: string | number | undefined) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const parsePositiveNumber = (
  value: string | number | undefined,
  fallback: number
) => {
  const parsed = parseOptionalNumber(value);

  if (!parsed || parsed <= 0) {
    return fallback;
  }

  return parsed;
};

const clamp = (value: number, min: number, max: number) => {
  return Math.min(Math.max(Math.round(value), min), max);
};

class GhnFulfillmentProviderService extends AbstractFulfillmentProviderService {
  static identifier = 'ghn';

  protected readonly logger_: Logger;
  protected readonly options_: ResolvedGhnFulfillmentOptions;
  protected readonly client_: GhnClient;

  constructor(
    { logger }: InjectedDependencies,
    options: GhnFulfillmentOptions = {}
  ) {
    super();

    this.logger_ = logger;
    this.options_ = this.resolveOptions_(options);
    this.client_ = new GhnClient({
      apiBaseUrl: this.options_.apiBaseUrl,
      token: this.options_.token,
      shopId: this.options_.shopId,
      requestTimeoutMs: this.options_.requestTimeoutMs,
      logger: this.logger_,
    });
  }

  async getFulfillmentOptions(): Promise<FulfillmentOption[]> {
    const fromDistrictId = this.options_.fromDistrictId;
    const discoveryToDistrictId =
      this.options_.serviceDiscoveryDistrictId || fromDistrictId;

    if (fromDistrictId && discoveryToDistrictId) {
      try {
        const services = await this.client_.listAvailableServices({
          fromDistrictId,
          toDistrictId: discoveryToDistrictId,
        });
        const uniqueByType = new Map<number, string>();

        for (const service of services) {
          if (!uniqueByType.has(service.service_type_id)) {
            uniqueByType.set(service.service_type_id, service.short_name);
          }
        }

        if (uniqueByType.size) {
          const options = [...uniqueByType.entries()].map(
            ([serviceTypeId, shortName]) => {
              return {
                id: `ghn-service-type-${serviceTypeId}`,
                name: `GHN ${shortName}`,
                service_type_id: serviceTypeId,
                short_name: shortName,
              };
            }
          );

          this.logger_.info(
            `[GHN][provider] fulfillment options resolved from API ${JSON.stringify({
              count: options.length,
            })}`
          );

          return options;
        }
      } catch (error) {
        this.logger_.warn(
          `[GHN][provider] failed to load services from API, using defaults ${JSON.stringify({
            error: error instanceof Error ? error.message : String(error),
          })}`
        );
      }
    }

    return GHN_SERVICE_TYPE_OPTIONS.map((service) => {
      return {
        id: service.id,
        name: service.name,
        service_type_id: service.service_type_id,
      };
    });
  }

  async validateFulfillmentData(
    optionData: Record<string, unknown>,
    data: Record<string, unknown>,
    context: ValidateFulfillmentDataContext
  ): Promise<Record<string, unknown>> {
    const metadata = context.shipping_address?.metadata as
      | Record<string, unknown>
      | undefined;
    const toDistrictId =
      getNumberValue(data, 'to_district_id') ||
      getNumberValue(metadata, 'ghn_district_id');
    const toWardCode =
      getStringValue(data, 'to_ward_code') ||
      getStringValue(metadata, 'ghn_ward_code');

    if (!toDistrictId || !toWardCode) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'GHN shipping requires ghn_district_id and ghn_ward_code in shipping address metadata.'
      );
    }

    return {
      ...data,
      to_district_id: toDistrictId,
      to_ward_code: toWardCode,
      service_type_id:
        getNumberValue(data, 'service_type_id') ||
        getNumberValue(optionData, 'service_type_id') ||
        undefined,
      service_id:
        getNumberValue(data, 'service_id') ||
        getNumberValue(optionData, 'service_id') ||
        undefined,
    };
  }

  async validateOption(data: Record<string, unknown>): Promise<boolean> {
    const serviceTypeId = getNumberValue(data, 'service_type_id');
    const serviceId = getNumberValue(data, 'service_id');

    return Boolean(serviceTypeId || serviceId);
  }

  async canCalculate(_data: CreateShippingOptionDTO): Promise<boolean> {
    return true;
  }

  async calculatePrice(
    optionData: CalculateShippingOptionPriceDTO['optionData'],
    data: CalculateShippingOptionPriceDTO['data'],
    context: CalculateShippingOptionPriceDTO['context']
  ) {
    const traceId = `ghn_calc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    try {
      const shippingMetadata = context.shipping_address?.metadata as
        | Record<string, unknown>
        | undefined;
      const toDistrictId =
        getNumberValue(data, 'to_district_id') ||
        getNumberValue(shippingMetadata, 'ghn_district_id');
      const toWardCode =
        getStringValue(data, 'to_ward_code') ||
        getStringValue(shippingMetadata, 'ghn_ward_code');

      this.logger_.info(
        `[GHN][provider][calculate:start] ${JSON.stringify({
          traceId,
          optionData,
          data,
          shippingMetadata: shippingMetadata || null,
          hasShippingAddress: Boolean(context.shipping_address),
          itemCount: context.items?.length || 0,
        })}`
      );

      if (!toDistrictId || !toWardCode) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          'Unable to calculate GHN fee without ghn_district_id and ghn_ward_code.'
        );
      }

      const packageMetrics = this.getPackageMetrics_(context, data);
      const warehouseOrigin = this.resolveOriginFromWarehouse_(context);
      const fromDistrictId =
        getNumberValue(data, 'from_district_id') ||
        this.options_.fromDistrictId ||
        warehouseOrigin.fromDistrictId;
      const fromWardCode =
        getStringValue(data, 'from_ward_code') ||
        this.options_.fromWardCode ||
        warehouseOrigin.fromWardCode;

      const service = await this.resolveService_(optionData, data, {
        toDistrictId,
        fromDistrictId,
      });

      const fee = await this.client_.calculateFee({
        to_district_id: toDistrictId,
        to_ward_code: toWardCode,
        ...(fromDistrictId ? { from_district_id: fromDistrictId } : {}),
        ...(fromWardCode ? { from_ward_code: fromWardCode } : {}),
        ...(service.serviceId ? { service_id: service.serviceId } : {}),
        ...(service.serviceTypeId ? { service_type_id: service.serviceTypeId } : {}),
        weight: packageMetrics.weight,
        length: packageMetrics.length,
        width: packageMetrics.width,
        height: packageMetrics.height,
      });

      if (!fee || typeof fee.total !== 'number') {
        this.logger_.error(
          `[GHN][provider][calculate:invalid-fee] ${JSON.stringify({
            traceId,
            fee,
          })}`
        );
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          'GHN provider returned invalid fee payload.'
        );
      }

      const result = {
        calculated_amount: fee.total,
        is_calculated_price_tax_inclusive: false,
      };

      this.logger_.info(
        `[GHN][provider][calculate:success] ${JSON.stringify({
          traceId,
          toDistrictId,
          toWardCode,
          fromDistrictId: fromDistrictId || null,
          fromWardCode: fromWardCode || null,
          serviceId: service.serviceId || null,
          serviceTypeId: service.serviceTypeId || null,
          packageMetrics,
          feeTotal: fee.total,
          result,
        })}`
      );

      return result;
    } catch (error) {
      this.logger_.error(
        `[GHN][provider][calculate:error] ${JSON.stringify({
          traceId,
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : null,
        })}`
      );
      throw error;
    }
  }

  async createFulfillment(
    data: Record<string, unknown>,
    _items: Partial<Omit<FulfillmentItemDTO, 'fulfillment'>>[],
    _order: Partial<FulfillmentOrderDTO> | undefined,
    _fulfillment: Partial<Omit<FulfillmentDTO, 'provider_id' | 'data' | 'items'>>
  ): Promise<CreateFulfillmentResult> {
    this.logger_.warn(
      '[GHN][provider] createFulfillment is not implemented yet. Returning Medusa fulfillment data only.'
    );

    return {
      data,
      labels: [],
    };
  }

  async cancelFulfillment(_data: Record<string, unknown>) {
    return {};
  }

  async getFulfillmentDocuments(_data: Record<string, unknown>) {
    return [];
  }

  async createReturnFulfillment(
    fulfillment: Record<string, unknown>
  ): Promise<CreateFulfillmentResult> {
    return {
      data: fulfillment,
      labels: [],
    };
  }

  async retrieveDocuments(
    _fulfillmentData: Record<string, unknown>,
    _documentType: string
  ): Promise<void> {
    return;
  }

  async getReturnDocuments(_data: Record<string, unknown>) {
    return [];
  }

  async getShipmentDocuments(_data: Record<string, unknown>) {
    return [];
  }

  /**
   * Reads GHN "from" (warehouse) district/ward saved on the stock location in Admin
   * (Settings → Shipping → warehouse address). Address metadata wins over location metadata.
   */
  protected resolveOriginFromWarehouse_(
    context: CalculateShippingOptionPriceDTO['context']
  ): { fromDistrictId?: number; fromWardCode?: string } {
    const fromLocation = (context as { from_location?: FulfillmentFromLocation })
      .from_location;

    if (!fromLocation) {
      this.logger_.info(
        '[GHN][provider] calculatePrice: no context.from_location — cannot use warehouse GHN metadata (Medusa should pass the stock location for this shipping option).'
      );
      return {};
    }

    const locMeta = fromLocation.metadata ?? {};
    const addrMeta = fromLocation.address?.metadata ?? {};
    const merged: Record<string, unknown> = {
      ...locMeta,
      ...addrMeta,
    };

    const fromDistrictId = getNumberValue(merged, 'ghn_district_id');
    const fromWardCode = getStringValue(merged, 'ghn_ward_code');

    this.logger_.info(
      `[GHN][provider] warehouse origin ${JSON.stringify({
        stockLocationId: fromLocation.id ?? null,
        fromDistrictId: fromDistrictId ?? null,
        fromWardCode: fromWardCode ?? null,
      })}`
    );

    return {
      fromDistrictId: fromDistrictId ?? undefined,
      fromWardCode: fromWardCode ?? undefined,
    };
  }

  protected resolveOptions_(options: GhnFulfillmentOptions): ResolvedGhnFulfillmentOptions {
    const apiBaseUrl =
      options.api_base_url ||
      process.env.GHN_API_BASE_URL ||
      DEFAULT_GHN_API_BASE_URL;
    const token =
      options.api_token || process.env.GHN_API_TOKEN || process.env.GHN_API_KEY;
    const shopId = parseOptionalNumber(
      options.shop_id || process.env.GHN_SHOP_ID || process.env.GHN_SHOPID
    );
    const fromDistrictId = parseOptionalNumber(
      options.from_district_id ||
        process.env.GHN_FROM_DISTRICT_ID ||
        process.env.GHN_FROM_DISTRICT
    );
    const fromWardCode =
      options.from_ward_code || process.env.GHN_FROM_WARD_CODE || undefined;
    const serviceDiscoveryDistrictId = parseOptionalNumber(
      options.service_discovery_district_id ||
        process.env.GHN_SERVICE_DISCOVERY_DISTRICT_ID
    );

    return {
      apiBaseUrl,
      token: token || undefined,
      shopId,
      fromDistrictId,
      fromWardCode,
      serviceDiscoveryDistrictId,
      defaultWeight: parsePositiveNumber(
        options.default_weight,
        DEFAULT_PACKAGE_WEIGHT
      ),
      defaultLength: parsePositiveNumber(
        options.default_length,
        DEFAULT_PACKAGE_DIMENSION
      ),
      defaultWidth: parsePositiveNumber(
        options.default_width,
        DEFAULT_PACKAGE_DIMENSION
      ),
      defaultHeight: parsePositiveNumber(
        options.default_height,
        DEFAULT_PACKAGE_DIMENSION
      ),
      requestTimeoutMs: parsePositiveNumber(options.request_timeout_ms, 10000),
    };
  }

  protected getPackageMetrics_(
    context: CalculateShippingOptionPriceDTO['context'],
    data: CalculateShippingOptionPriceDTO['data']
  ): PackageMetrics {
    const packageWeight =
      getNumberValue(data, 'package_weight') || getNumberValue(data, 'weight');
    const packageLength =
      getNumberValue(data, 'package_length') || getNumberValue(data, 'length');
    const packageWidth =
      getNumberValue(data, 'package_width') || getNumberValue(data, 'width');
    const packageHeight =
      getNumberValue(data, 'package_height') || getNumberValue(data, 'height');

    if (packageWeight && packageLength && packageWidth && packageHeight) {
      return {
        weight: clamp(packageWeight, 1, 50000),
        length: clamp(packageLength, 1, 200),
        width: clamp(packageWidth, 1, 200),
        height: clamp(packageHeight, 1, 200),
      };
    }

    const baseMetrics = {
      weight: 0,
      length: 0,
      width: 0,
      height: 0,
    };

    const itemMetrics = (context.items || []).reduce((acc, item) => {
      const variant = item.variant as Record<string, unknown> | undefined;
      const quantity = Number(item.quantity) > 0 ? Number(item.quantity) : 1;
      const weight =
        getNumberValue(variant, 'weight') || this.options_.defaultWeight;
      const length =
        getNumberValue(variant, 'length') || this.options_.defaultLength;
      const width = getNumberValue(variant, 'width') || this.options_.defaultWidth;
      const height =
        getNumberValue(variant, 'height') || this.options_.defaultHeight;

      acc.weight += weight * quantity;
      acc.length = Math.max(acc.length, length);
      acc.width = Math.max(acc.width, width);
      acc.height = Math.max(acc.height, height);

      return acc;
    }, baseMetrics);

    return {
      weight: clamp(itemMetrics.weight || this.options_.defaultWeight, 1, 50000),
      length: clamp(itemMetrics.length || this.options_.defaultLength, 1, 200),
      width: clamp(itemMetrics.width || this.options_.defaultWidth, 1, 200),
      height: clamp(itemMetrics.height || this.options_.defaultHeight, 1, 200),
    };
  }

  protected async resolveService_(
    optionData: CalculateShippingOptionPriceDTO['optionData'],
    data: CalculateShippingOptionPriceDTO['data'],
    input: {
      toDistrictId: number;
      fromDistrictId?: number;
    }
  ) {
    const explicitServiceId =
      getNumberValue(data, 'service_id') || getNumberValue(optionData, 'service_id');

    if (explicitServiceId) {
      return {
        serviceId: explicitServiceId,
        serviceTypeId:
          getNumberValue(data, 'service_type_id') ||
          getNumberValue(optionData, 'service_type_id'),
      };
    }

    const serviceTypeId =
      getNumberValue(data, 'service_type_id') ||
      getNumberValue(optionData, 'service_type_id');

    if (!input.fromDistrictId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'Missing GHN origin district. Set GHN_FROM_DISTRICT_ID / GHN_FROM_WARD_CODE, or add ghn_district_id and ghn_ward_code to the warehouse (stock location) address metadata in Admin.'
      );
    }

    const services = await this.client_.listAvailableServices({
      fromDistrictId: input.fromDistrictId,
      toDistrictId: input.toDistrictId,
    });

    if (!services.length) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'GHN has no available services for this address.'
      );
    }

    if (!serviceTypeId) {
      return {
        serviceId: services[0].service_id,
        serviceTypeId: services[0].service_type_id,
      };
    }

    const matchedService = services.find(
      (service) => service.service_type_id === serviceTypeId
    );

    if (!matchedService) {
      return {
        serviceId: services[0].service_id,
        serviceTypeId: services[0].service_type_id,
      };
    }

    return {
      serviceId: matchedService.service_id,
      serviceTypeId: matchedService.service_type_id,
    };
  }
}

export default GhnFulfillmentProviderService;
