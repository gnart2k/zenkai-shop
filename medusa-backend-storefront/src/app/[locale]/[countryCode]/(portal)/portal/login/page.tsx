import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { login } from "@lib/portal/actions"
import { currentActor, portalBase } from "@lib/portal/api"
import { Field, Hidden, Notice } from "@modules/portal/ui"
import { SubmitButton } from "@modules/portal/submit-button"
import { getTranslations } from "next-intl/server"
import { redirect } from "next/navigation"

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; countryCode: string }>
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const p = await params
  const base = portalBase(p)
  const sp = await searchParams
  const t = await getTranslations({ locale: p.locale, namespace: "Portal.login" })

  // Already signed in with a valid session: no reason to show the form.
  const actor = await currentActor()
  if (actor && !sp.error) {
    redirect(actor === "portal_admin" ? `${base}/admin` : `${base}/collaborator`)
  }

  return (
    <div className="mx-auto mt-8 max-w-sm sm:mt-16">
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">{t("title")}</CardTitle>
          <CardDescription>{t("subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Notice
            error={sp.error ?? (sp.expired ? t("expired") : undefined)}
            ok={sp.accepted === "linked" ? t("linked") : sp.accepted ? t("created") : undefined}
          />
          <form action={login} className="space-y-4">
            <Hidden name="base" value={base} />
            <Field label={t("email")} name="email" type="email" autoComplete="email" required />
            <Field
              label={t("password")}
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
            <SubmitButton className="w-full">{t("signIn")}</SubmitButton>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
