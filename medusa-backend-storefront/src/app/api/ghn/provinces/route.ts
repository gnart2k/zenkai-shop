import { listGhnProvinces } from "@lib/data/ghn"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const provinces = await listGhnProvinces()

    return NextResponse.json({ data: provinces })
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Unable to load GHN provinces.",
      },
      { status: 500 }
    )
  }
}
