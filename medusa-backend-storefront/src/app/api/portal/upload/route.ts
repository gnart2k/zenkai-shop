import { JWT_COOKIE, PortalError, tokenValid } from "@lib/portal/api"
import { uploadImageFile } from "@lib/portal/storefront-save"
import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

/**
 * Uploads one image the moment the owner picks it in the storefront editor, so the live
 * preview can show it right away. Returns the /media URL to store in the config.
 */
export async function POST(request: NextRequest) {
  if (!tokenValid((await cookies()).get(JWT_COOKIE)?.value)) {
    return NextResponse.json({ error: "session_expired" }, { status: 401 })
  }
  const f = await request.formData()
  const file = f.get("file")
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "No file" }, { status: 400 })
  }
  try {
    return NextResponse.json({ url: await uploadImageFile(file) })
  } catch (e) {
    if (e instanceof PortalError) {
      return NextResponse.json({ error: e.message }, { status: e.status === 401 ? 401 : 400 })
    }
    throw e
  }
}
