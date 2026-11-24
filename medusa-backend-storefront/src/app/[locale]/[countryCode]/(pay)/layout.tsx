import { getTranslations } from "next-intl/server"

export const dynamic = "force-dynamic"

/** Customer-facing payment page: store branding only, no portal navigation. */
export default async function PayLayout({ children }: { children: React.ReactNode }) {
  const tNav = await getTranslations("Nav")
  return (
    <div className="min-h-screen bg-gray-50 text-ui-fg-base">
      <header className="border-b bg-white">
        <div className="content-container flex h-14 items-center">
          <span className="txt-compact-xlarge-plus">{tNav("storeName")}</span>
        </div>
      </header>
      <div className="content-container py-8">{children}</div>
    </div>
  )
}
