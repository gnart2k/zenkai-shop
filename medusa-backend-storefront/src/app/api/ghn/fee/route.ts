import {
  calculateGhnShippingFee,
  type GhnCalculateFeePayload,
} from "@lib/data/ghn"
import { NextRequest, NextResponse } from "next/server"

type FeeRequestBody = Partial<GhnCalculateFeePayload>

const parseNumber = (value: unknown) => {
  if (typeof value === "number") {
    return value
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value)

    return Number.isNaN(parsed) ? null : parsed
  }

  return null
}

const parseString = (value: unknown) => {
  if (typeof value !== "string") {
    return null
  }

  const trimmed = value.trim()

  return trimmed.length ? trimmed : null
}

const getDefaultFromDistrictId = () => {
  const value = process.env.GHN_FROM_DISTRICT_ID

  return parseNumber(value)
}

const getDefaultFromWardCode = () => {
  return parseString(process.env.GHN_FROM_WARD_CODE)
}

export async function POST(request: NextRequest) {
  const traceId = `ghn_fee_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 8)}`
  let body: FeeRequestBody

  try {
    body = (await request.json()) as FeeRequestBody
  } catch {
    console.warn("[GHN][api/fee] invalid json body", { traceId })
    return NextResponse.json(
      { message: "Invalid JSON body for GHN fee request." },
      { status: 400 }
    )
  }

  const toDistrictId = parseNumber(body.to_district_id)
  const toWardCode = parseString(body.to_ward_code)

  const weight = parseNumber(body.weight)
  const length = parseNumber(body.length)
  const width = parseNumber(body.width)
  const height = parseNumber(body.height)

  console.info("[GHN][api/fee] request", {
    traceId,
    body,
    parsed: {
      toDistrictId,
      toWardCode,
      weight,
      length,
      width,
      height,
    },
  })

  if (
    !toDistrictId ||
    !toWardCode ||
    !weight ||
    !length ||
    !width ||
    !height
  ) {
    console.warn("[GHN][api/fee] missing required fields", {
      traceId,
      toDistrictId,
      toWardCode,
      weight,
      length,
      width,
      height,
    })
    return NextResponse.json(
      {
        message:
          "Missing required GHN fee fields: to_district_id, to_ward_code, weight, length, width, height.",
      },
      { status: 400 }
    )
  }

  const payload: GhnCalculateFeePayload = {
    to_district_id: toDistrictId,
    to_ward_code: toWardCode,
    weight,
    length,
    width,
    height,
  }

  const fromDistrictId =
    parseNumber(body.from_district_id) || getDefaultFromDistrictId()
  const fromWardCode = parseString(body.from_ward_code) || getDefaultFromWardCode()
  const serviceId = parseNumber(body.service_id)
  const serviceTypeId = parseNumber(body.service_type_id)
  const insuranceValue = parseNumber(body.insurance_value)
  const codValue = parseNumber(body.cod_value)

  if (fromDistrictId) {
    payload.from_district_id = fromDistrictId
  }

  if (fromWardCode) {
    payload.from_ward_code = fromWardCode
  }

  if (serviceId) {
    payload.service_id = serviceId
  } else if (serviceTypeId) {
    payload.service_type_id = serviceTypeId
  } else {
    payload.service_type_id = 2
  }

  if (insuranceValue !== null) {
    payload.insurance_value = insuranceValue
  }

  if (codValue !== null) {
    payload.cod_value = codValue
  }

  console.info("[GHN][api/fee] payload", { traceId, payload })

  try {
    const fee = await calculateGhnShippingFee(payload)

    console.info("[GHN][api/fee] success", {
      traceId,
      fee_total: fee.total,
      fee,
    })

    return NextResponse.json({ data: fee })
  } catch (error) {
    console.error("[GHN][api/fee] error", {
      traceId,
      error: error instanceof Error ? error.message : error,
    })
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Unable to calculate GHN shipping fee.",
      },
      { status: 500 }
    )
  }
}
