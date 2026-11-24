import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { acceptInvite } from "@lib/portal/actions"
import { portalBase } from "@lib/portal/api"
import { SubmitButton } from "@modules/portal/submit-button"
import { Field, Hidden, Notice } from "@modules/portal/ui"
import { getTranslations } from "next-intl/server"

export default async function AcceptInvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; countryCode: string }>
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const p = await params
  const base = portalBase(p)
  const sp = await searchParams
  const t = await getTranslations({ locale: p.locale, namespace: "Portal.accept" })
  const returnTo = `${base}/accept-invite?token=${encodeURIComponent(sp.token ?? "")}`

  if (!sp.token) {
    return (
      <div className="mx-auto mt-8 max-w-md">
        <Notice error={t("missingToken")} />
      </div>
    )
  }

  return (
    <div className="mx-auto mt-8 max-w-md sm:mt-16">
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">{t("title")}</CardTitle>
          <CardDescription>{t("intro")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Notice error={sp.error} />
          <form action={acceptInvite} className="space-y-4">
            <Hidden name="base" value={base} />
            <Hidden name="token" value={sp.token} />
            <Hidden name="returnTo" value={returnTo} />
            <Field
              label={t("password")}
              name="password"
              type="password"
              minLength={8}
              autoComplete="new-password"
              required
              hint={t("hint")}
            />
            <SubmitButton className="w-full">{t("continue")}</SubmitButton>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
