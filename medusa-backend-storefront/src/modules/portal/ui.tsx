import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { AlertCircle, CheckCircle2, type LucideIcon } from "lucide-react"
import type { ComponentProps, ReactNode } from "react"

const intlLocale = (locale: string) => (locale === "vi" ? "vi-VN" : "en-GB")

export const money = (
  amount: number | null | undefined,
  currency: string,
  locale = "vi"
) =>
  amount === null || amount === undefined
    ? "-"
    : new Intl.NumberFormat(intlLocale(locale), {
        style: "currency",
        currency: currency.toUpperCase(),
        maximumFractionDigits: currency.toLowerCase() === "vnd" ? 0 : 2,
      }).format(amount)

export const date = (d: string | Date | null | undefined, locale = "vi") =>
  d ? new Date(d).toLocaleDateString(intlLocale(locale)) : "-"

export function PageHeader({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? (
          <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
    </div>
  )
}

/** Error (from ?error=) or success banner. Renders nothing when there is nothing to say. */
export function Notice({ error, ok }: { error?: string | string[]; ok?: string }) {
  const msg = Array.isArray(error) ? error[0] : error
  if (msg) {
    return (
      <Alert variant="destructive" className="mb-4" role="alert">
        <AlertCircle className="size-4" />
        <AlertDescription>{msg}</AlertDescription>
      </Alert>
    )
  }
  return ok ? (
    <Alert className="mb-4 border-emerald-300 bg-emerald-50 text-emerald-900 [&>svg]:text-emerald-600">
      <CheckCircle2 className="size-4" />
      <AlertDescription>{ok}</AlertDescription>
    </Alert>
  ) : null
}

const BADGE: Record<string, string> = {
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  approved: "border-blue-200 bg-blue-50 text-blue-700",
  rejected: "border-red-200 bg-red-50 text-red-700",
  paid: "border-emerald-200 bg-emerald-50 text-emerald-700",
  cancelled: "border-zinc-200 bg-zinc-100 text-zinc-600",
  active: "border-emerald-200 bg-emerald-50 text-emerald-700",
  invited: "border-amber-200 bg-amber-50 text-amber-700",
  revoked: "border-zinc-200 bg-zinc-100 text-zinc-600",
  published: "border-emerald-200 bg-emerald-50 text-emerald-700",
  draft: "border-zinc-200 bg-zinc-100 text-zinc-600",
  shared: "border-violet-200 bg-violet-50 text-violet-700",
  yours: "border-sky-200 bg-sky-50 text-sky-700",
}

export const StatusBadge = ({ status, label }: { status: string; label?: string }) => (
  <Badge variant="outline" className={cn("font-medium", BADGE[status])}>
    {label ?? status}
  </Badge>
)

export function Empty({
  icon: Icon,
  title,
  hint,
  children,
}: {
  icon?: LucideIcon
  title: string
  hint?: string
  children?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-background px-6 py-14 text-center">
      {Icon ? (
        <div className="mb-3 rounded-full bg-muted p-3">
          <Icon className="size-6 text-muted-foreground" />
        </div>
      ) : null}
      <p className="font-medium">{title}</p>
      {hint ? <p className="mt-1 max-w-sm text-sm text-muted-foreground">{hint}</p> : null}
      {children ? <div className="mt-4">{children}</div> : null}
    </div>
  )
}

export function Field({
  label,
  name,
  hint,
  className,
  ...rest
}: { label: string; name: string; hint?: string } & ComponentProps<typeof Input>) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} {...rest} />
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

export const Hidden = ({ name, value }: { name: string; value: string }) => (
  <input type="hidden" name={name} value={value} />
)

export function Pager({
  page,
  pages,
  previous,
  next,
  label,
}: {
  page: number
  pages: number
  previous: string
  next: string
  label: string
}) {
  if (pages <= 1) {
    return null
  }
  const link = "rounded-md border px-3 py-1.5 hover:bg-accent"
  return (
    <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
      <span>{label}</span>
      <div className="flex gap-2">
        {page > 1 ? (
          <a className={link} href={`?page=${page - 1}`}>
            {previous}
          </a>
        ) : null}
        {page < pages ? (
          <a className={link} href={`?page=${page + 1}`}>
            {next}
          </a>
        ) : null}
      </div>
    </div>
  )
}
