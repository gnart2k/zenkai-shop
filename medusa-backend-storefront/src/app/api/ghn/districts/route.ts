import { listGhnDistricts } from "@lib/data/ghn"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const provinceIdParam = request.nextUrl.searchParams.get("province_id")
  const provinceId = Number(provinceIdParam)

  if (!provinceIdParam || Number.isNaN(provinceId)) {
    return NextResponse.json(
      { message: "Missing or invalid province_id." },
      { status: 400 }
    )
  }

  try {
    const districts = await listGhnDistricts(provinceId)

    return NextResponse.json({ data: districts })
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Unable to load GHN districts.",
      },
      { status: 500 }
    )
  }
}
