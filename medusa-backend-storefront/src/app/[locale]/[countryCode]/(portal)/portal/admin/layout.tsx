import { portalBase, requireActor } from "@lib/portal/api"

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string; countryCode: string }>
}) {
  await requireActor("portal_admin", portalBase(await params))
  return <>{children}</>
}
