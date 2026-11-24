import { Logger } from '@medusajs/framework/types';
import { MedusaError } from '@medusajs/framework/utils';
import { GhnApiResponse, GhnCalculateFeePayload, GhnFee, GhnService } from './types';

type GhnClientOptions = {
  apiBaseUrl: string;
  token?: string;
  shopId?: number;
  requestTimeoutMs: number;
  logger: Logger;
};

type RequestOptions = {
  method?: 'GET' | 'POST';
  payload?: Record<string, unknown>;
  includeShopIdHeader?: boolean;
};

class GhnClient {
  protected readonly apiBaseUrl_: string;
  protected readonly token_?: string;
  protected readonly shopId_?: number;
  protected readonly requestTimeoutMs_: number;
  protected readonly logger_: Logger;

  constructor(options: GhnClientOptions) {
    this.apiBaseUrl_ = options.apiBaseUrl.replace(/\/$/, '');
    this.token_ = options.token;
    this.shopId_ = options.shopId;
    this.requestTimeoutMs_ = options.requestTimeoutMs;
    this.logger_ = options.logger;
  }

  async listAvailableServices({
    fromDistrictId,
    toDistrictId,
  }: {
    fromDistrictId: number;
    toDistrictId: number;
  }): Promise<GhnService[]> {
    const data = await this.request<GhnService[] | GhnService>(
      '/v2/shipping-order/available-services',
      {
        method: 'POST',
        payload: {
          shop_id: this.getShopId_(),
          from_district: fromDistrictId,
          to_district: toDistrictId,
        },
      }
    );

    return this.unwrapArray_(data);
  }

  async calculateFee(payload: GhnCalculateFeePayload): Promise<GhnFee> {
    return await this.request<GhnFee>('/v2/shipping-order/fee', {
      method: 'POST',
      payload,
      includeShopIdHeader: true,
    });
  }

  protected getShopId_() {
    if (!this.shopId_) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'Missing GHN shop ID. Set GHN_SHOP_ID in environment.'
      );
    }

    return this.shopId_;
  }

  protected getToken_() {
    if (!this.token_) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'Missing GHN API token. Set GHN_API_TOKEN in environment.'
      );
    }

    return this.token_;
  }

  protected unwrapArray_<T>(data: T[] | T | null) {
    if (!data) {
      return [];
    }

    return Array.isArray(data) ? data : [data];
  }

  protected async request<T>(path: string, options?: RequestOptions): Promise<T> {
    const method = options?.method || 'GET';
    const payload = options?.payload;
    const includeShopIdHeader = options?.includeShopIdHeader || false;
    const traceId = `ghn_provider_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    this.logger_.info(
      `[GHN][provider][request:start] ${JSON.stringify({
        traceId,
        method,
        path,
        payload,
        includeShopIdHeader,
      })}`
    );

    const response = await fetch(`${this.apiBaseUrl_}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Token: this.getToken_(),
        ...(includeShopIdHeader ? { ShopId: String(this.getShopId_()) } : {}),
      },
      body: payload ? JSON.stringify(payload) : undefined,
      signal: AbortSignal.timeout(this.requestTimeoutMs_),
    });

    const json = (await response.json()) as GhnApiResponse<T>;

    this.logger_.info(
      `[GHN][provider][request:response] ${JSON.stringify({
        traceId,
        method,
        path,
        httpStatus: response.status,
        ghnCode: json?.code,
        ghnMessage: json?.message,
        hasData: json?.data !== null,
      })}`
    );

    if (!response.ok || json?.code !== 200) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, json?.message || 'GHN request failed.');
    }

    if (!json?.data) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, 'GHN response is missing data.');
    }

    return json.data;
  }
}

export default GhnClient;
