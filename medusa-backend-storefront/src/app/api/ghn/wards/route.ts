import { listGhnWards } from "@lib/data/ghn"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const districtIdParam = request.nextUrl.searchParams.get("district_id")
  const districtId = Number(districtIdParam)

  if (!districtIdParam || Number.isNaN(districtId)) {
    return NextResponse.json(
      { message: "Missing or invalid district_id." },
      { status: 400 }
    )
  }

  try {
    const wards = await listGhnWards(districtId)

    return NextResponse.json({ data: wards })
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Unable to load GHN wards.",
      },
      { status: 500 }
    )
  }
}
