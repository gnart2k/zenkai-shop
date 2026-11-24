export const DEFAULT_GHN_API_BASE_URL = 'https://online-gateway.ghn.vn/shiip/public-api';

export const DEFAULT_PACKAGE_WEIGHT = 200;
export const DEFAULT_PACKAGE_DIMENSION = 20;

export type GhnApiResponse<T> = {
  code: number;
  message: string;
  data: T | null;
};

export type GhnService = {
  service_id: number;
  short_name: string;
  service_type_id: number;
};

export type GhnFee = {
  total: number;
  service_fee: number;
  insurance_fee: number;
  pick_station_fee: number;
  coupon_value: number;
  r2s_fee: number;
  document_return: number;
  double_check: number;
  cod_fee: number;
  pick_remote_areas_fee: number;
  deliver_remote_areas_fee: number;
  cod_failed_fee: number;
};

export type GhnCalculateFeePayload = {
  from_district_id?: number;
  from_ward_code?: string;
  to_district_id: number;
  to_ward_code: string;
  service_id?: number;
  service_type_id?: number;
  weight: number;
  length: number;
  width: number;
  height: number;
  insurance_value?: number;
  cod_value?: number;
};

export type GhnServiceTypeOption = {
  id: string;
  name: string;
  service_type_id: number;
};

export const GHN_SERVICE_TYPE_OPTIONS: GhnServiceTypeOption[] = [
  {
    id: 'ghn-service-fast',
    name: 'GHN Fast',
    service_type_id: 1,
  },
  {
    id: 'ghn-service-standard',
    name: 'GHN Standard',
    service_type_id: 2,
  },
  {
    id: 'ghn-service-economy',
    name: 'GHN Economy',
    service_type_id: 3,
  },
];
