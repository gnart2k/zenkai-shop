import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { deleteCategory, saveCategory } from "@lib/portal/actions"
import { portalBase, portalFetch } from "@lib/portal/api"
import { CategoryDialog } from "@modules/portal/category-dialog"
import { ConfirmDelete } from "@modules/portal/confirm-delete"
import { Empty, Notice, PageHeader, StatusBadge } from "@modules/portal/ui"
import { Lock, Tags } from "lucide-react"
import { getTranslations } from "next-intl/server"

type Cat = {
  id: string
  name: string
  handle: string
  description: string | null
  is_active: boolean
  owned: boolean
}

export default async function CategoriesPage({
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
  const { categories } = await portalFetch<{ categories: Cat[] }>("/portal/admin/categories")
  const returnTo = `${base}/admin/categories`
  const okMsg =
    sp.ok === "created" ? t("categories.created") : sp.ok === "deleted" ? t("categories.deleted") : sp.ok === "saved" ? t("common.saved") : undefined
  const labels = (title: string, trigger: string) => ({
    trigger,
    title,
    name: t("categories.name"),
    description: t("categories.description"),
    visible: t("categories.visible"),
    save: t("categories.save"),
    cancel: t("common.cancel"),
  })

  return (
    <>
      <PageHeader title={t("categories.title")} description={t("categories.subtitle")}>
        <CategoryDialog
          action={saveCategory}
          base={base}
          labels={labels(t("categories.newTitle"), t("categories.new"))}
        />
      </PageHeader>
      <Notice error={sp.error} ok={okMsg} />
      {categories.length === 0 ? (
        <Empty icon={Tags} title={t("categories.empty")} hint={t("categories.emptyHint")} />
      ) : (
        <>
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("categories.name")}</TableHead>
                  <TableHead>{t("categories.handle")}</TableHead>
                  <TableHead>{t("categories.status")}</TableHead>
                  <TableHead>{t("categories.owner")}</TableHead>
                  <TableHead className="w-28" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="font-medium">{c.name}</div>
                      {c.description ? (
                        <div className="max-w-md truncate text-xs text-muted-foreground">{c.description}</div>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{c.handle}</TableCell>
                    <TableCell>
                      <StatusBadge
                        status={c.is_active ? "published" : "draft"}
                        label={c.is_active ? t("status.activeCat") : t("status.hiddenCat")}
                      />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={c.owned ? "yours" : "shared"} label={c.owned ? t("status.yours") : t("status.shared")} />
                    </TableCell>
                    <TableCell>
                      {c.owned ? (
                        <div className="flex justify-end gap-2">
                          <CategoryDialog
                            action={saveCategory}
                            base={base}
                            category={c}
                            labels={labels(t("categories.editTitle"), t("common.edit"))}
                          />
                          <ConfirmDelete
                            iconOnly
                            action={deleteCategory}
                            fields={{ id: c.id, base, returnTo }}
                            title={t("categories.deleteTitle")}
                            text={t("categories.deleteText", { name: c.name })}
                            triggerLabel={t("common.delete")}
                            confirmLabel={t("common.delete")}
                            cancelLabel={t("common.cancel")}
                          />
                        </div>
                      ) : (
                        <div className="flex justify-end text-muted-foreground">
                          <Lock className="size-4" />
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
          <p className="mt-3 text-xs text-muted-foreground">{t("categories.sharedHint")}</p>
        </>
      )}
    </>
  )
}
