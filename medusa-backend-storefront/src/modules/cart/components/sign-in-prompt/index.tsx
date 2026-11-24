import { useTranslations } from "next-intl"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

const SignInPrompt = () => {
  const t = useTranslations("ShopCart")
  return (
    <div className="flex items-center justify-between rounded-lg border border-border/40 bg-neutral-50 p-4">
      <div>
        <h3 className="text-sm font-medium text-foreground">
          {t("signInTitle")}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("signInSubtitle")}
        </p>
      </div>
      <LocalizedClientLink href="/account">
        <button className="h-10 rounded-none border border-border px-6 text-sm text-foreground transition-colors hover:bg-neutral-100">
          {t("signIn")}
        </button>
      </LocalizedClientLink>
    </div>
  )
}

export default SignInPrompt
