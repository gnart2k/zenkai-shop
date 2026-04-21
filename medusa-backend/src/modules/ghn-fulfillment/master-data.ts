import { MedusaError } from '@medusajs/framework/utils';
import { DEFAULT_GHN_API_BASE_URL } from './types';

export type GhnProvinceRow = {
  ProvinceID: number;
  ProvinceName: string;
  Code?: string | number;
};

export type GhnDistrictRow = {
  DistrictID: number;
  ProvinceID: number;
  DistrictName: string;
};

export type GhnWardRow = {
  WardCode: number | string;
  DistrictID: number;
  WardName: string;
};

type GhnEnvelope<T> = {
  code: number;
  message: string;
  data: T | null;
};

function resolveGhnBaseUrl(): string {
  const raw = process.env.GHN_API_BASE_URL || process.env.GHN_API_BASE || DEFAULT_GHN_API_BASE_URL;
  return raw.replace(/\/$/, '');
}

function resolveGhnToken(): string | undefined {
  const token = process.env.GHN_API_TOKEN || process.env.GHN_API_KEY;
  return token?.trim() || undefined;
}

function unwrapList_<T>(data: T | T[] | null): T[] {
  if (data === null || data === undefined) {
    return [];
  }
  return Array.isArray(data) ? data : [data];
}

async function ghnJson_<T>(
  path: string,
  init: RequestInit & { jsonBody?: Record<string, unknown> }
): Promise<T> {
  const token = resolveGhnToken();
  if (!token) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      'GHN API token is not configured. Set GHN_API_TOKEN (or GHN_API_KEY).'
    );
  }

  const base = resolveGhnBaseUrl();
  const { jsonBody, ...rest } = init;
  const body = jsonBody !== undefined ? JSON.stringify(jsonBody) : (rest.body ?? undefined);

  const response = await fetch(`${base}${path}`, {
    ...rest,
    body,
    headers: {
      'Content-Type': 'application/json',
      Token: token,
      ...(rest.headers as Record<string, string> | undefined),
    },
    signal: AbortSignal.timeout(25_000),
  });

  const json = (await response.json()) as GhnEnvelope<T>;

  if (!response.ok || json.code !== 200) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      json.message || 'GHN master-data request failed.'
    );
  }

  if (json.data === null || json.data === undefined) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      'GHN master-data response is missing data.'
    );
  }

  return json.data;
}

export async function fetchGhnProvinces(): Promise<GhnProvinceRow[]> {
  const data = await ghnJson_<GhnProvinceRow | GhnProvinceRow[]>('/master-data/province', {
    method: 'GET',
  });
  return unwrapList_(data);
}

export async function fetchGhnDistricts(provinceId: number): Promise<GhnDistrictRow[]> {
  try {
    const data = await ghnJson_<GhnDistrictRow | GhnDistrictRow[]>('/master-data/district', {
      method: 'POST',
      jsonBody: { province_id: provinceId },
    });
    return unwrapList_(data);
  } catch {
    const data = await ghnJson_<GhnDistrictRow | GhnDistrictRow[]>(
      `/master-data/district?province_id=${encodeURIComponent(String(provinceId))}`,
      { method: 'GET' }
    );
    return unwrapList_(data);
  }
}

export async function fetchGhnWards(districtId: number): Promise<GhnWardRow[]> {
  const data = await ghnJson_<GhnWardRow | GhnWardRow[]>('/master-data/ward', {
    method: 'POST',
    jsonBody: { district_id: districtId },
  });
  return unwrapList_(data);
}
