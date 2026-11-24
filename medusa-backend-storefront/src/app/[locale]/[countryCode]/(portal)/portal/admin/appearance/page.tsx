import { Button } from "@/components/ui/button"
import { saveAppearance } from "@lib/portal/actions"
import { portalBase, portalFetch } from "@lib/portal/api"
import { loadRawMessages } from "@lib/storefront/messages"
import { DEFAULT_CHOICE, type L10n, type StorefrontChoice } from "@lib/storefront/templates"
import { EDITABLE_TEXTS, TEXT_GROUPS } from "@lib/storefront/texts"
import { StorefrontEditor } from "@modules/portal/storefront-editor"
import { Notice, PageHeader } from "@modules/portal/ui"
import { ExternalLink } from "lucide-react"
import { getMessages, getTranslations } from "next-intl/server"

const lookup = (m: Record<string, any>, key: string): string => {
  const [ns, name] = key.split(".")
  const v = m?.[ns]?.[name]
  return typeof v === "string" ? v : ""
}

export default async function AppearancePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; countryCode: string }>
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const p = await params
  const base = portalBase(p)
  const sp = await searchParams
  const t = await getTranslations({ locale: p.locale, namespace: "Portal.appearance" })
  const messages = (await getMessages({ locale: p.locale })) as Record<string, any>
  const labels = messages.Portal.appearance
  const lang = p.locale === "vi" ? "vi" : "en"

  const state = await portalFetch<{
    store_name: string
    config: StorefrontChoice
    draft: StorefrontChoice | null
    draft_updated_at: string | null
  }>("/portal/admin/storefront")
  // The editor opens the unpublished draft when there is one, otherwise the live config.
  const initial = state.draft ?? state.config

  // Short-lived signed link so the editor can show the real draft pages in an iframe.
  const { token } = await portalFetch<{ token: string }>("/portal/admin/storefront/preview", { body: {} })
  const { products } = await portalFetch<{ products: { handle: string; status: string }[] }>(
    "/portal/admin/products?limit=10"
  )
  const productHandle = products.find((x) => x.status === "published")?.handle ?? products[0]?.handle ?? null

  // Placeholders show the untouched default text, so the owner sees what they are replacing.
  const [vi, en] = await Promise.all([loadRawMessages("vi"), loadRawMessages("en")])
  const textDefaults: Record<string, L10n> = Object.fromEntries(
    EDITABLE_TEXTS.map((x) => [x.key, { vi: lookup(vi, x.key), en: lookup(en, x.key) }])
  )

  return (
    <>
      <PageHeader title={t("title")} description={t("subtitle")}>
        <Button asChild variant="outline">
          <a href={`/api/preview-exit?to=${encodeURIComponent(`/${p.locale}/${p.countryCode}`)}`} target="_blank" rel="noreferrer">
            <ExternalLink />
            {t("openStore")}
          </a>
        </Button>
      </PageHeader>
      <Notice
        error={sp.error}
        ok={
          sp.ok === "published"
            ? t("published")
            : sp.ok === "discarded"
              ? t("discarded")
              : sp.ok
                ? t("savedDraft")
                : undefined
        }
      />
      <StorefrontEditor
        action={saveAppearance}
        returnTo={`${base}/admin/appearance`}
        initial={{ ...DEFAULT_CHOICE, ...initial }}
        labels={labels}
        lang={lang}
        textCatalog={EDITABLE_TEXTS}
        textGroups={TEXT_GROUPS}
        textDefaults={textDefaults}
        hasDraft={!!state.draft}
        draftUpdatedAt={state.draft_updated_at}
        previewBase={`/${p.locale}/${p.countryCode}`}
        previewToken={token}
        productHandle={productHandle}
      />
    </>
  )
}
