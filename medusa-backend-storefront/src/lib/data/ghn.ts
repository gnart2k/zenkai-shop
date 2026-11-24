import "server-only"

const DEFAULT_GHN_API_BASE_URL =
  "https://online-gateway.ghn.vn/shiip/public-api"

const GHN_API_BASE_URL = (
  process.env.GHN_API_BASE_URL || DEFAULT_GHN_API_BASE_URL
).replace(/\/$/, "")

type GhnResponse<T> = {
  code: number
  message: string
  data: T | null
}

export type GhnProvince = {
  ProvinceID: number
  ProvinceName: string
  Status?: number
}

export type GhnDistrict = {
  DistrictID: number
  ProvinceID: number
  DistrictName: string
  Status?: number
}

export type GhnWard = {
  WardCode: string
  DistrictID: number
  WardName: string
  Status?: number
}

export type GhnService = {
  service_id: number
  short_name: string
  service_type_id: number
}

export type GhnFee = {
  total: number
  service_fee: number
  insurance_fee: number
  pick_station_fee: number
  coupon_value: number
  r2s_fee: number
  document_return: number
  double_check: number
  cod_fee: number
  pick_remote_areas_fee: number
  deliver_remote_areas_fee: number
  cod_failed_fee: number
}

export type GhnCalculateFeePayload = {
  from_district_id?: number
  from_ward_code?: string
  to_district_id: number
  to_ward_code: string
  service_id?: number
  service_type_id?: number
  weight: number
  length: number
  width: number
  height: number
  insurance_value?: number
  cod_value?: number
  coupon?: string
  cod_failed_amount?: number
  items?: {
    name: string
    quantity: number
    weight: number
    length: number
    width: number
    height: number
  }[]
}

const getGhnToken = () => {
  const token = process.env.GHN_API_TOKEN

  if (!token) {
    throw new Error("Missing GHN_API_TOKEN environment variable.")
  }

  return token
}

const getGhnShopId = () => {
  const shopId = process.env.GHN_SHOP_ID

  if (!shopId) {
    throw new Error("Missing GHN_SHOP_ID environment variable.")
  }

  const parsed = Number(shopId)

  if (Number.isNaN(parsed)) {
    throw new Error("Invalid GHN_SHOP_ID environment variable.")
  }

  return parsed
}

const unwrapData = <T>(data: T | T[] | null): T[] => {
  if (!data) {
    return []
  }

  return Array.isArray(data) ? data : [data]
}

const fetchGhnData = async <T>(
  path: string,
  options?: {
    method?: "GET" | "POST"
    payload?: Record<string, unknown>
    includeShopIdHeader?: boolean
  }
) => {
  const token = getGhnToken()
  const method = options?.method || "GET"
  const payload = options?.payload
  const includeShopIdHeader = options?.includeShopIdHeader
  const shopId = includeShopIdHeader ? getGhnShopId() : null
  const traceId = `ghn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

  console.info("[GHN][fetch:start]", {
    traceId,
    method,
    path,
    includeShopIdHeader,
    shopId,
    payload,
  })

  const response = await fetch(`${GHN_API_BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Token: token,
      ...(shopId ? { ShopId: String(shopId) } : {}),
    },
    body: payload ? JSON.stringify(payload) : undefined,
    cache: "no-store",
  })

  const json = (await response.json()) as GhnResponse<T>

  console.info("[GHN][fetch:response]", {
    traceId,
    method,
    path,
    httpStatus: response.status,
    ghnCode: json?.code,
    ghnMessage: json?.message,
    hasData: json?.data !== null,
  })

  if (!response.ok || json.code !== 200) {
    console.error("[GHN][fetch:error]", {
      traceId,
      method,
      path,
      httpStatus: response.status,
      ghnCode: json?.code,
      ghnMessage: json?.message,
    })
    throw new Error(json?.message || "GHN request failed.")
  }

  if (!json.data) {
    console.error("[GHN][fetch:error] missing data", {
      traceId,
      method,
      path,
      httpStatus: response.status,
      ghnCode: json?.code,
    })
    throw new Error("GHN response is missing data.")
  }

  return json.data
}

export async function listGhnProvinces() {
  const data = await fetchGhnData<GhnProvince[] | GhnProvince>(
    "/master-data/province"
  )

  return unwrapData(data)
}

export async function listGhnDistricts(provinceId: number) {
  const data = await fetchGhnData<GhnDistrict[] | GhnDistrict>(
    "/master-data/district",
    {
      method: "POST",
      payload: {
        province_id: provinceId,
      },
    }
  )

  return unwrapData(data)
}

export async function listGhnWards(districtId: number) {
  const data = await fetchGhnData<GhnWard[] | GhnWard>("/master-data/ward", {
    method: "POST",
    payload: {
      district_id: districtId,
    },
  })

  return unwrapData(data)
}

export async function listGhnAvailableServices(params: {
  fromDistrictId: number
  toDistrictId: number
}) {
  console.info("[GHN][services] request", params)
  const data = await fetchGhnData<GhnService[] | GhnService>(
    "/v2/shipping-order/available-services",
    {
      method: "POST",
      payload: {
        shop_id: getGhnShopId(),
        from_district: params.fromDistrictId,
        to_district: params.toDistrictId,
      },
    }
  )

  const services = unwrapData(data)
  console.info("[GHN][services] resolved", {
    count: services.length,
    services,
  })

  return services
}

export async function calculateGhnShippingFee(payload: GhnCalculateFeePayload) {
  console.info("[GHN][fee] request", payload)
  const fee = await fetchGhnData<GhnFee>("/v2/shipping-order/fee", {
    method: "POST",
    payload,
    includeShopIdHeader: true,
  })

  console.info("[GHN][fee] resolved", fee)

  return fee
}
