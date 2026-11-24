import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { createProduct, deleteProduct, updateProduct } from "@lib/portal/actions"
import { ImageIcon } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { ConfirmDelete } from "./confirm-delete"
import { PricingFields } from "./pricing-fields"
import { SubmitButton } from "./submit-button"
import { Field, Hidden } from "./ui"

export type AdminProduct = {
  id: string
  title: string
  handle: string
  description: string | null
  status: string
  thumbnail: string | null
  categories: { id: string; name: string }[]
  variants: {
    id: string
    sku: string | null
    title: string | null
    suggested_price: number | null
    original_price: number | null
    original_cost: number | null
    quantity: number | null
  }[]
}

export type CategoryOption = { id: string; name: string }

/** Create and edit share this form so both stay in sync. */
export async function ProductForm({
  product,
  categories,
  currency,
  locale,
  base,
  returnTo,
}: {
  product?: AdminProduct
  categories: CategoryOption[]
  currency: string
  locale: string
  base: string
  returnTo: string
}) {
  const t = await getTranslations({ locale, namespace: "Portal" })
  const f = (k: string, v?: Record<string, string>) => t(`productForm.${k}` as never, v as never)
  const editing = !!product
  const chosen = new Set(product?.categories.map((c) => c.id) ?? [])

  const labels = {
    suggestedPrice: f("suggestedPrice"),
    suggestedHint: f("suggestedHint"),
    originalPrice: f("originalPrice"),
    originalHint: f("originalHint"),
    originalCost: f("originalCost"),
    costHint: f("costHint"),
    stockLabel: f("stockLabel"),
    stockHint: f("stockHint"),
    previewCollab: f("previewCollab", { amount: "{amount}" }),
    previewStore: f("previewStore", { amount: "{amount}" }),
    invalid: f("previewInvalid"),
  }

  return (
    <div className="space-y-6">
      <form
        action={editing ? updateProduct : createProduct}
        encType="multipart/form-data"
        className="grid gap-6 lg:grid-cols-3"
      >
        <Hidden name="base" value={base} />
        <Hidden name="returnTo" value={returnTo} />
        {product ? <Hidden name="product_id" value={product.id} /> : null}
        {product ? <Hidden name="variant_ids" value={product.variants.map((v) => v.id).join(",")} /> : null}

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{f("basic")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label={f("name")} name="title" required defaultValue={product?.title} />
              <div className="space-y-1.5">
                <Label htmlFor="description">{f("description")}</Label>
                <Textarea id="description" name="description" rows={5} defaultValue={product?.description ?? ""} />
              </div>
              <Field
                label={f("handle")}
                name="handle"
                defaultValue={product?.handle}
                hint={f("handleHint")}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{f("pricing")}</CardTitle>
              <CardDescription>
                {f("pricingIntro")} {f("chain")}.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {product ? (
                product.variants.map((v) => (
                  <div key={v.id} className="space-y-4 rounded-lg border p-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label={f("variantName")} name={`variant_title_${v.id}`} defaultValue={v.title ?? ""} />
                      <Field label={f("sku")} name={`sku_${v.id}`} defaultValue={v.sku ?? ""} hint={f("skuHint")} />
                    </div>
                    <PricingFields
                      suffix={`_${v.id}`}
                      currency={currency}
                      locale={locale}
                      labels={labels}
                      initial={{
                        price: v.suggested_price,
                        original: v.original_price,
                        cost: v.original_cost,
                        quantity: v.quantity,
                      }}
                    />
                  </div>
                ))
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label={f("variantName")} name="variant_title" defaultValue="Tiêu chuẩn" />
                    <Field label={f("sku")} name="sku" hint={f("skuHint")} />
                  </div>
                  <PricingFields currency={currency} locale={locale} labels={labels} initial={{}} />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{f("published")}</CardTitle>
              <CardDescription>{f("publishedHint")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Switch id="published" name="published" defaultChecked={!product || product.status === "published"} />
                <Label htmlFor="published">{f("published")}</Label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{f("image")}</CardTitle>
              <CardDescription>{f("imageHint")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative grid aspect-square w-full place-items-center overflow-hidden rounded-lg border bg-muted">
                {product?.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={product.thumbnail} alt={product.title} className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <ImageIcon className="size-10 text-muted-foreground" />
                )}
              </div>
              <input
                name="image"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="block w-full cursor-pointer rounded-md border border-input bg-background text-sm file:mr-3 file:cursor-pointer file:border-0 file:bg-muted file:px-3 file:py-2 file:text-sm file:font-medium"
              />
              {product?.thumbnail ? <p className="text-xs text-muted-foreground">{f("imageChange")}</p> : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{f("categories")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {categories.length === 0 ? (
                <p className="text-sm text-muted-foreground">{f("noCategories")}</p>
              ) : (
                categories.map((c) => (
                  <div key={c.id} className="flex items-center gap-2">
                    <Checkbox id={`cat-${c.id}`} name="category_ids" value={c.id} defaultChecked={chosen.has(c.id)} />
                    <Label htmlFor={`cat-${c.id}`} className="font-normal">
                      {c.name}
                    </Label>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center gap-3 lg:col-span-3">
          <SubmitButton>{editing ? f("save") : f("create")}</SubmitButton>
          <Button asChild variant="ghost">
            <a href={`${base}/admin/products`}>{f("cancel")}</a>
          </Button>
        </div>
      </form>

      {product ? (
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-base text-destructive">{f("danger")}</CardTitle>
            <CardDescription>{f("dangerText")}</CardDescription>
          </CardHeader>
          <CardContent>
            <ConfirmDelete
              action={deleteProduct}
              fields={{ id: product.id, base, returnTo }}
              title={t("adminProducts.deleteTitle")}
              text={t("adminProducts.deleteText", { title: product.title })}
              triggerLabel={t("adminProducts.delete")}
              confirmLabel={t("adminProducts.delete")}
              cancelLabel={t("common.cancel")}
            />
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
