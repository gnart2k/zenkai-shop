import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"

const EmptyCartMessage = () => {
  const t = useTranslations("ShopCart")
  return (
    <div
      className="flex flex-col items-start justify-center px-2 py-24 small:py-48"
      data-testid="empty-cart-message"
    >
      <h1 className="font-serif text-3xl font-light tracking-tight text-foreground">
        {t("title")}
      </h1>
      <p className="mt-4 max-w-md text-sm text-muted-foreground">
        {t("emptyDescription")}
      </p>
      <Link
        href="/store"
        className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-foreground transition-colors hover:text-foreground/60"
      >
        {t("explore")} &rarr;
      </Link>
    </div>
  )
}

export default EmptyCartMessage
