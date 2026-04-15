import { listGhnAvailableServices } from "@lib/data/ghn"
import { NextRequest, NextResponse } from "next/server"

const parseDistrictId = (value: string | null) => {
  if (!value) {
    return null
  }

  const parsed = Number(value)

  return Number.isNaN(parsed) ? null : parsed
}

const getDefaultFromDistrictId = () => {
  const value = process.env.GHN_FROM_DISTRICT_ID

  if (!value) {
    return null
  }

  const parsed = Number(value)

  return Number.isNaN(parsed) ? null : parsed
}

export async function GET(request: NextRequest) {
  const traceId = `ghn_services_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 8)}`
  const toDistrictId = parseDistrictId(
    request.nextUrl.searchParams.get("to_district_id")
  )
  const fromDistrictId =
    parseDistrictId(request.nextUrl.searchParams.get("from_district_id")) ||
    getDefaultFromDistrictId()

  console.info("[GHN][api/services] request", {
    traceId,
    toDistrictId,
    fromDistrictId,
  })

  if (!toDistrictId || !fromDistrictId) {
    console.warn("[GHN][api/services] invalid input", {
      traceId,
      toDistrictId,
      fromDistrictId,
    })
    return NextResponse.json(
      {
        message:
          "Missing or invalid district IDs. Provide to_district_id and from_district_id (or set GHN_FROM_DISTRICT_ID).",
      },
      { status: 400 }
    )
  }

  try {
    const services = await listGhnAvailableServices({
      fromDistrictId,
      toDistrictId,
    })

    console.info("[GHN][api/services] success", {
      traceId,
      count: services.length,
    })

    return NextResponse.json({ data: services })
  } catch (error) {
    console.error("[GHN][api/services] error", {
      traceId,
      error: error instanceof Error ? error.message : error,
    })
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Unable to load GHN available services.",
      },
      { status: 500 }
    )
  }
}
