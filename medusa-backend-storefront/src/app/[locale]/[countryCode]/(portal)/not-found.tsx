import { Button } from "@/components/ui/button"
import { SearchX } from "lucide-react"
import { getTranslations } from "next-intl/server"

export default async function PortalNotFound() {
  const t = await getTranslations("Portal.errors")
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-20 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
        <SearchX className="size-6" />
      </span>
      <h1 className="text-lg font-semibold">{t("notFound")}</h1>
      <p className="text-sm text-muted-foreground">{t("notFoundHint")}</p>
      <Button asChild>
        <a href="/portal">{t("goHome")}</a>
      </Button>
    </div>
  )
}
