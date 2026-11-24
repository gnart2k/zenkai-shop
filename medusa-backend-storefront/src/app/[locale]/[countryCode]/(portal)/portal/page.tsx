import { currentActor, portalBase } from "@lib/portal/api"
import { redirect } from "next/navigation"

export default async function PortalHome({
  params,
}: {
  params: Promise<{ locale: string; countryCode: string }>
}) {
  const base = portalBase(await params)
  const actor = await currentActor()
  redirect(
    actor === "portal_admin"
      ? `${base}/admin`
      : actor === "collaborator"
        ? `${base}/collaborator`
        : `${base}/login`
  )
}
