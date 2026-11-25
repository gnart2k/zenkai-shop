import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { deleteCollaborator, inviteCollaborator, revokeCollaborator } from "@lib/portal/actions"
import { portalBase, portalFetch } from "@lib/portal/api"
import { ConfirmDelete } from "@modules/portal/confirm-delete"
import { SubmitButton } from "@modules/portal/submit-button"
import { Empty, Field, Hidden, Notice, PageHeader, StatusBadge } from "@modules/portal/ui"
import { Users } from "lucide-react"
import { getTranslations } from "next-intl/server"

export default async function CollaboratorsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; countryCode: string }>
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const p = await params
  const base = portalBase(p)
  const t = await getTranslations({ locale: p.locale, namespace: "Portal" })
  const sp = await searchParams
  const returnTo = `${base}/admin/collaborators`
  const { collaborators } = await portalFetch<{
    collaborators: { id: string; email: string; name: string | null; status: string }[]
  }>("/portal-api/admin/collaborators")

  return (
    <>
      <PageHeader title={t("collabs.title")} />
      <Notice error={sp.error} ok={sp.added ? t("collabs.added") : sp.deleted ? t("collabs.deleted") : undefined} />
      {sp.invite_link ? (
        <Card className="mb-4 border-emerald-300 bg-emerald-50">
          <CardContent className="space-y-2 p-4">
            <p className="text-sm text-emerald-900">{t("collabs.inviteCreated")}</p>
            <Input readOnly value={sp.invite_link} className="bg-background text-xs" />
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="h-fit lg:order-2">
          <CardHeader>
            <CardTitle className="text-base">{t("collabs.inviteByEmail")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={inviteCollaborator} className="space-y-3">
              <Hidden name="returnTo" value={returnTo} />
              <Field label={t("collabs.email")} name="email" type="email" required />
              <Field label={`${t("collabs.name")} (${t("common.optional")})`} name="name" />
              <SubmitButton className="w-full">{t("collabs.sendInvite")}</SubmitButton>
            </form>
          </CardContent>
        </Card>

        <div className="lg:col-span-2 lg:order-1">
          {collaborators.length === 0 ? (
            <Empty icon={Users} title={t("collabs.empty")} />
          ) : (
            <Card className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("collabs.email")}</TableHead>
                    <TableHead>{t("collabs.name")}</TableHead>
                    <TableHead>{t("collabs.status")}</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {collaborators.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.email}</TableCell>
                      <TableCell>{c.name ?? "-"}</TableCell>
                      <TableCell>
                        <StatusBadge status={c.status} label={t(`status.${c.status}` as never)} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {c.status !== "revoked" ? (
                            <form action={revokeCollaborator}>
                              <Hidden name="id" value={c.id} />
                              <Hidden name="returnTo" value={returnTo} />
                              <Button size="sm" variant="outline" className="text-destructive hover:text-destructive">
                                {t("collabs.revoke")}
                              </Button>
                            </form>
                          ) : null}
                          <ConfirmDelete
                            iconOnly
                            action={deleteCollaborator}
                            fields={{ id: c.id, returnTo }}
                            title={t("collabs.deleteTitle")}
                            text={t("collabs.deleteText", { email: c.email })}
                            triggerLabel={t("collabs.delete")}
                            confirmLabel={t("collabs.delete")}
                            cancelLabel={t("common.cancel")}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </div>
      </div>
    </>
  )
}
