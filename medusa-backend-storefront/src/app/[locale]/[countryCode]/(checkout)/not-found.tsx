import InteractiveLink from "@modules/common/components/interactive-link"
import { Metadata } from "next"
import { getTranslations } from "next-intl/server"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("CheckoutFlowNotFound")
  return { title: "404", description: t("metaDescription") }
}

export default async function NotFound() {
  const t = await getTranslations("CheckoutFlowNotFound")
  return (
    <div className="flex flex-col gap-4 items-center justify-center min-h-[calc(100vh-64px)]">
      <h1 className="text-2xl-semi text-ui-fg-base">{t("title")}</h1>
      <p className="text-small-regular text-ui-fg-base">
        {t("body")}
      </p>
      <InteractiveLink href="/">{t("home")}</InteractiveLink>
    </div>
  )
}
