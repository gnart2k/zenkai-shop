"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import {
  DEFAULT_BRANDING,
  SECTION_DEFS,
  SECTION_TYPES,
  THEMES,
  getTheme,
  newSectionId,
  type BrandingConfig,
  type Field,
  type FooterConfig,
  type HeaderConfig,
  type L10n,
  type SectionInstance,
  type SectionType,
  type SettingValue,
  type StorefrontChoice,
  type ThemeId,
} from "@lib/storefront/templates"
import type { EditableText } from "@lib/storefront/texts"
import { ArrowDown, ArrowUp, Check, ChevronDown, Eye, ImageIcon, Loader2, Monitor, Plus, RotateCcw, Rocket, Save, Smartphone, Trash2 } from "lucide-react"
import { useState } from "react"
import { useFormStatus } from "react-dom"
import { TemplatePreview, type PreviewPage } from "./template-preview"

type Cfg = {
  template_id: ThemeId
  primary_color: string | null
  home: SectionInstance[]
  header: HeaderConfig
  footer: FooterConfig
  branding: BrandingConfig
  texts: Record<string, L10n>
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Labels = Record<string, any>

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v))
const asL10n = (v: SettingValue | undefined): L10n =>
  typeof v === "string" ? { vi: v } : v && typeof v === "object" ? (v as L10n) : {}

/** Vietnamese and English inputs side by side (the storefront has both languages). */
function L10nInput({
  value,
  onChange,
  long,
  placeholder,
  idBase,
}: {
  value: L10n
  onChange: (v: L10n) => void
  long?: boolean
  placeholder?: L10n
  idBase: string
}) {
  const Control = long ? Textarea : Input
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {(["vi", "en"] as const).map((lang) => (
        <div key={lang} className="relative">
          <span className="pointer-events-none absolute left-2 top-2 z-10 rounded bg-muted px-1 text-[10px] font-semibold uppercase text-muted-foreground">
            {lang}
          </span>
          <Control
            id={`${idBase}-${lang}`}
            value={value[lang] ?? ""}
            placeholder={placeholder?.[lang]}
            onChange={(e) => onChange({ ...value, [lang]: e.target.value })}
            className={cn("pl-9", long && "min-h-20")}
            {...(long ? { rows: 3 } : {})}
          />
        </div>
      ))}
    </div>
  )
}

/** File chooser with preview. The file is uploaded by the server action when saving. */
function ImageField({
  path,
  value,
  preview,
  accept,
  labels,
  onPick,
  onClear,
}: {
  path: string
  value: string
  preview?: string
  accept: string
  labels: Labels
  onPick: (file: File | undefined) => void
  onClear: () => void
}) {
  const [nonce, setNonce] = useState(0)
  const shown = preview || value
  return (
    <div className="flex items-center gap-3">
      <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-md border bg-muted">
        {shown ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shown} alt="" className="size-full object-contain" />
        ) : (
          <ImageIcon className="size-5 text-muted-foreground" />
        )}
      </div>
      <div className="min-w-0 space-y-1">
        <input
          key={nonce}
          type="file"
          name={`file:${path}`}
          accept={accept}
          onChange={(e) => onPick(e.target.files?.[0])}
          className="block w-full max-w-xs cursor-pointer rounded-md border border-input bg-background text-xs file:mr-2 file:cursor-pointer file:border-0 file:bg-muted file:px-2 file:py-1.5 file:text-xs file:font-medium"
        />
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {preview ? <span className="text-emerald-700">{labels.willUpload}</span> : null}
          {shown ? (
            <button
              type="button"
              className="inline-flex items-center gap-1 hover:text-destructive"
              onClick={() => {
                setNonce((n) => n + 1)
                onClear()
              }}
            >
              <Trash2 className="size-3" />
              {labels.remove}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

/** Submit button that tells the server action which button was pressed (draft/preview/publish/discard). */
function IntentButton({
  intent,
  variant,
  className,
  children,
  newTabUrl,
}: {
  intent: string
  variant?: "default" | "outline" | "ghost" | "secondary"
  className?: string
  children: React.ReactNode
  /** Post natively to this URL in a new tab instead of running the form's server action. */
  newTabUrl?: string
}) {
  const { pending, data } = useFormStatus()
  const active = pending && data?.get("intent") === intent
  return (
    <Button
      type="submit"
      name="intent"
      value={intent}
      variant={variant}
      // A server action always redirects the tab that submitted it. A plain URL with
      // formTarget="_blank" is a normal form post, so the result opens in a new tab and the
      // editor (with its unsaved edits) stays as it is.
      {...(newTabUrl ? { formAction: newTabUrl, formTarget: "_blank", formEncType: "multipart/form-data" } : {})}
      disabled={pending && !newTabUrl}
      className={className}
    >
      {active ? <Loader2 className="animate-spin" /> : null}
      {children}
    </Button>
  )
}

const FieldRow = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <Label>{label}</Label>
    {children}
    {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
  </div>
)

export function StorefrontEditor({
  action,
  returnTo,
  initial,
  labels,
  lang,
  textCatalog,
  textGroups,
  textDefaults,
  hasDraft,
  draftUpdatedAt,
  previewBase,
  previewToken,
  productHandle,
}: {
  action: (formData: FormData) => void | Promise<void>
  returnTo: string
  initial: StorefrontChoice
  labels: Labels
  lang: "vi" | "en"
  textCatalog: EditableText[]
  textGroups: { id: string; label: { vi: string; en: string } }[]
  textDefaults: Record<string, L10n>
  hasDraft: boolean
  draftUpdatedAt: string | null
  /** /{locale}/{country}: where the storefront lives. */
  previewBase: string
  previewToken: string
  productHandle: string | null
}) {
  const theme0 = getTheme(initial.template_id)
  const [cfg, setCfg] = useState<Cfg>({
    template_id: initial.template_id,
    primary_color: initial.primary_color,
    home: clone(initial.home ?? theme0.home),
    header: clone(initial.header ?? theme0.header),
    footer: clone(initial.footer ?? theme0.footer),
    branding: { ...DEFAULT_BRANDING, ...(initial.branding ?? {}) },
    texts: clone(initial.texts ?? {}),
  })
  const [previews, setPreviews] = useState<Record<string, string>>({})
  const [open, setOpen] = useState<string | null>(null)
  const [previewPage, setPreviewPage] = useState<PreviewPage>("home")
  const [previewMode, setPreviewMode] = useState<"live" | "sketch">(hasDraft ? "live" : "sketch")
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop")
  const [addType, setAddType] = useState<SectionType>("image-with-text")
  const theme = getTheme(cfg.template_id)

  const patch = (p: Partial<Cfg>) => setCfg((c) => ({ ...c, ...p }))
  const patchBranding = (p: Partial<BrandingConfig>) => setCfg((c) => ({ ...c, branding: { ...c.branding, ...p } }))
  const setPreview = (path: string, file: File | undefined) =>
    setPreviews((p) => {
      const n = { ...p }
      if (n[path]) URL.revokeObjectURL(n[path])
      if (file) n[path] = URL.createObjectURL(file)
      else delete n[path]
      return n
    })
  const clearPreview = (path: string) => setPreview(path, undefined)

  const chooseTheme = (id: ThemeId) => {
    const t = getTheme(id)
    // A new theme brings its own structure and starting sections; branding, texts and
    // the accent color stay.
    setCfg((c) => ({ ...c, template_id: id, home: clone(t.home), header: clone(t.header), footer: clone(t.footer) }))
    setOpen(null)
  }

  const updateSection = (id: string, fn: (s: SectionInstance) => SectionInstance) =>
    setCfg((c) => ({ ...c, home: c.home.map((s) => (s.id === id ? fn(s) : s)) }))
  const setSetting = (id: string, key: string, value: SettingValue) =>
    updateSection(id, (s) => ({ ...s, settings: { ...s.settings, [key]: value } }))
  const move = (i: number, d: -1 | 1) =>
    setCfg((c) => {
      const j = i + d
      if (j < 0 || j >= c.home.length) return c
      const home = [...c.home]
      ;[home[i], home[j]] = [home[j], home[i]]
      return { ...c, home }
    })
  const addSection = () =>
    setCfg((c) => {
      const id = newSectionId(addType, c.home)
      setOpen(id)
      return { ...c, home: [...c.home, { id, type: addType, enabled: true, settings: {} }] }
    })

  // What the preview and the saved config use: pending logo shows before it is uploaded.
  const previewChoice: StorefrontChoice = {
    ...cfg,
    branding: { ...cfg.branding, logo: previews["branding.logo"] || cfg.branding.logo },
  }

  const logoLabel = (t: { vi: string; en: string }) => t[lang]

  const renderField = (section: SectionInstance, f: Field) => {
    const path = `home.${section.id}.${f.key}`
    const value = section.settings[f.key]
    const idBase = `${section.id}-${f.key}`
    const def = SECTION_DEFS[section.type].defaults[f.key]
    switch (f.type) {
      case "text":
      case "textarea":
        return (
          <FieldRow key={f.key} label={logoLabel(f.label)}>
            <L10nInput idBase={idBase} long={f.type === "textarea"} value={asL10n(value)} onChange={(v) => setSetting(section.id, f.key, v)} />
          </FieldRow>
        )
      case "link":
        return (
          <FieldRow key={f.key} label={logoLabel(f.label)} hint={labels.linkHint}>
            <Input id={idBase} value={typeof value === "string" ? value : ""} placeholder="/store" onChange={(e) => setSetting(section.id, f.key, e.target.value)} />
          </FieldRow>
        )
      case "image":
        return (
          <FieldRow key={f.key} label={logoLabel(f.label)} hint={labels.imageHint}>
            <ImageField
              path={path}
              value={typeof value === "string" ? value : ""}
              preview={previews[path]}
              accept="image/png,image/jpeg,image/webp"
              labels={labels}
              onPick={(file) => setPreview(path, file)}
              onClear={() => {
                clearPreview(path)
                setSetting(section.id, f.key, "")
              }}
            />
          </FieldRow>
        )
      case "select":
        return (
          <FieldRow key={f.key} label={logoLabel(f.label)}>
            <select
              id={idBase}
              value={typeof value === "string" ? value : String(def ?? "")}
              onChange={(e) => setSetting(section.id, f.key, e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm"
            >
              {f.options?.map((o) => (
                <option key={o.value} value={o.value}>
                  {logoLabel(o.label)}
                </option>
              ))}
            </select>
          </FieldRow>
        )
      case "number":
        return (
          <FieldRow key={f.key} label={logoLabel(f.label)}>
            <Input
              id={idBase}
              type="number"
              min={f.min}
              max={f.max}
              className="w-28"
              value={typeof value === "number" ? value : typeof def === "number" ? def : ""}
              onChange={(e) => setSetting(section.id, f.key, Number(e.target.value))}
            />
          </FieldRow>
        )
    }
  }

  const changedTexts = Object.keys(cfg.texts).length

  return (
    <form action={action} className="space-y-6" encType="multipart/form-data">
      <input type="hidden" name="returnTo" value={returnTo} />
      <input type="hidden" name="config" value={JSON.stringify(cfg)} />

      <div className="grid gap-6 xl:grid-cols-5">
        <Tabs defaultValue="theme" className="xl:col-span-3">
          <TabsList className="flex h-auto flex-wrap justify-start">
            {(["theme", "branding", "home", "layout", "texts"] as const).map((t) => (
              <TabsTrigger key={t} value={t}>
                {labels.tabs[t]}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* forceMount + hidden keeps every file input in the form while another tab is shown. */}
          <TabsContent value="theme" forceMount className="mt-4 space-y-4 data-[state=inactive]:hidden">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{labels.templates}</CardTitle>
                <CardDescription>{labels.templatesHint}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2" role="radiogroup" aria-label={labels.templates}>
                  {THEMES.map((t) => {
                    const active = t.id === cfg.template_id
                    return (
                      <button
                        key={t.id}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => chooseTheme(t.id)}
                        className={cn(
                          "rounded-xl border bg-background p-3 text-left transition",
                          active ? "border-primary ring-2 ring-primary/30" : "hover:border-foreground/30"
                        )}
                      >
                        <TemplatePreview choice={{ template_id: t.id, primary_color: cfg.primary_color }} compact />
                        <div className="mt-3 flex items-center justify-between gap-2">
                          <span className="font-medium">{t.name[lang]}</span>
                          {active ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                              <Check className="size-3" />
                              {labels.selected}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{t.description[lang]}</p>
                        <div className="mt-2 flex flex-wrap gap-1 text-[11px] text-muted-foreground">
                          {[
                            labels.chip.header[t.layout.header],
                            labels.chip.listing[t.layout.listing],
                            labels.chip.product[t.layout.product],
                            labels.chip.footer[t.layout.footer],
                            labels.chip.card[t.layout.card],
                          ].map((c: string) => (
                            <span key={c} className="rounded border px-1.5 py-0.5">
                              {c}
                            </span>
                          ))}
                        </div>
                      </button>
                    )
                  })}
                </div>
                <p className="mt-3 text-xs text-muted-foreground">{labels.themeResets}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{labels.primaryColor}</CardTitle>
                <CardDescription>{labels.primaryHint}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-3">
                <input
                  type="color"
                  aria-label={labels.primaryColor}
                  value={cfg.primary_color ?? "#111111"}
                  onChange={(e) => patch({ primary_color: e.target.value })}
                  className="h-9 w-14 cursor-pointer rounded-md border bg-background p-1"
                />
                <span className="font-mono text-sm">{cfg.primary_color ?? labels.templateColor}</span>
                {cfg.primary_color ? (
                  <Button type="button" variant="ghost" size="sm" onClick={() => patch({ primary_color: null })}>
                    <RotateCcw />
                    {labels.useTemplateColor}
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="branding" forceMount className="mt-4 space-y-4 data-[state=inactive]:hidden">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{labels.brandingTitle}</CardTitle>
                <CardDescription>{labels.brandingHint}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <FieldRow label={labels.logo} hint={labels.logoHint}>
                  <ImageField
                    path="branding.logo"
                    value={cfg.branding.logo}
                    preview={previews["branding.logo"]}
                    accept="image/png,image/jpeg,image/webp"
                    labels={labels}
                    onPick={(f) => setPreview("branding.logo", f)}
                    onClear={() => {
                      clearPreview("branding.logo")
                      patchBranding({ logo: "" })
                    }}
                  />
                </FieldRow>
                <div className="grid gap-6 sm:grid-cols-2">
                  <FieldRow label={`${labels.logoHeight}: ${cfg.branding.logo_height}px`}>
                    <input
                      type="range"
                      min={16}
                      max={96}
                      value={cfg.branding.logo_height}
                      onChange={(e) => patchBranding({ logo_height: Number(e.target.value) })}
                      className="w-full"
                    />
                  </FieldRow>
                  <div className="flex items-center gap-3 self-end">
                    <Switch id="show-name" checked={cfg.branding.show_name} onCheckedChange={(v) => patchBranding({ show_name: v })} />
                    <Label htmlFor="show-name">{labels.showName}</Label>
                  </div>
                </div>
                <FieldRow label={labels.storeName} hint={labels.storeNameHint}>
                  <L10nInput idBase="brand-name" value={cfg.branding.store_name} onChange={(v) => patchBranding({ store_name: v })} />
                </FieldRow>
                <FieldRow label={labels.tagline} hint={labels.taglineHint}>
                  <L10nInput idBase="brand-tagline" long value={cfg.branding.tagline} onChange={(v) => patchBranding({ tagline: v })} />
                </FieldRow>
                <FieldRow label={labels.favicon} hint={labels.faviconHint}>
                  <ImageField
                    path="branding.favicon"
                    value={cfg.branding.favicon}
                    preview={previews["branding.favicon"]}
                    accept="image/png,image/x-icon,image/vnd.microsoft.icon"
                    labels={labels}
                    onPick={(f) => setPreview("branding.favicon", f)}
                    onClear={() => {
                      clearPreview("branding.favicon")
                      patchBranding({ favicon: "" })
                    }}
                  />
                </FieldRow>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="home" forceMount className="mt-4 space-y-4 data-[state=inactive]:hidden">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{labels.homeTitle}</CardTitle>
                <CardDescription>{labels.homeHint}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <ul className="space-y-2">
                  {cfg.home.map((s, i) => {
                    const def = SECTION_DEFS[s.type]
                    const isOpen = open === s.id
                    return (
                      <li key={s.id} className="rounded-lg border bg-background">
                        <div className="flex items-center gap-2 px-3 py-2">
                          <Switch
                            checked={s.enabled}
                            onCheckedChange={(v) => updateSection(s.id, (x) => ({ ...x, enabled: v }))}
                            aria-label={def.label[lang]}
                          />
                          <button
                            type="button"
                            onClick={() => setOpen(isOpen ? null : s.id)}
                            className="flex min-w-0 flex-1 items-center gap-2 text-left"
                            aria-expanded={isOpen}
                          >
                            <span className={cn("truncate text-sm font-medium", !s.enabled && "text-muted-foreground line-through")}>
                              {def.label[lang]}
                            </span>
                            <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition", isOpen && "rotate-180")} />
                          </button>
                          <Button type="button" variant="ghost" size="icon" disabled={i === 0} onClick={() => move(i, -1)} aria-label={labels.moveUp}>
                            <ArrowUp />
                          </Button>
                          <Button type="button" variant="ghost" size="icon" disabled={i === cfg.home.length - 1} onClick={() => move(i, 1)} aria-label={labels.moveDown}>
                            <ArrowDown />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setCfg((c) => ({ ...c, home: c.home.filter((x) => x.id !== s.id) }))}
                            aria-label={labels.remove}
                          >
                            <Trash2 />
                          </Button>
                        </div>
                        {/* Always mounted (just hidden) so chosen image files stay in the form. */}
                        <div className={cn("space-y-4 border-t px-4 py-4", !isOpen && "hidden")}>
                          <p className="text-xs text-muted-foreground">{def.description[lang]}</p>
                          {def.fields.length ? def.fields.map((f) => renderField(s, f)) : <p className="text-sm text-muted-foreground">{labels.noSettings}</p>}
                        </div>
                      </li>
                    )
                  })}
                </ul>

                <div className="flex flex-wrap items-center gap-2 border-t pt-4">
                  <select
                    value={addType}
                    onChange={(e) => setAddType(e.target.value as SectionType)}
                    aria-label={labels.addSection}
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm"
                  >
                    {SECTION_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {SECTION_DEFS[t].label[lang]}
                      </option>
                    ))}
                  </select>
                  <Button type="button" variant="outline" onClick={addSection}>
                    <Plus />
                    {labels.addSection}
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setCfg((c) => ({ ...c, home: clone(theme.home) }))}>
                    <RotateCcw />
                    {labels.resetHome}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="layout" forceMount className="mt-4 space-y-4 data-[state=inactive]:hidden">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{labels.announcementTitle}</CardTitle>
                <CardDescription>{labels.announcementHint}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Switch
                    id="ann-on"
                    checked={cfg.header.announcement.enabled}
                    onCheckedChange={(v) => patch({ header: { announcement: { ...cfg.header.announcement, enabled: v } } })}
                  />
                  <Label htmlFor="ann-on">{labels.announcementEnable}</Label>
                </div>
                <FieldRow label={labels.announcementText}>
                  <L10nInput
                    idBase="ann-text"
                    value={cfg.header.announcement.text}
                    onChange={(v) => patch({ header: { announcement: { ...cfg.header.announcement, text: v } } })}
                  />
                </FieldRow>
                <FieldRow label={labels.announcementLink} hint={labels.linkHint}>
                  <Input
                    value={cfg.header.announcement.link}
                    placeholder="/store"
                    onChange={(e) => patch({ header: { announcement: { ...cfg.header.announcement, link: e.target.value } } })}
                  />
                </FieldRow>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{labels.footerTitle}</CardTitle>
                <CardDescription>{labels.footerHint}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FieldRow label={labels.footerTagline}>
                  <L10nInput idBase="footer-tagline" long value={cfg.footer.tagline} onChange={(v) => patch({ footer: { ...cfg.footer, tagline: v } })} />
                </FieldRow>
                <FieldRow label={labels.footerContact}>
                  <div className="space-y-2">
                    {cfg.footer.contact.map((c, i) => (
                      <div key={i} className="flex gap-2">
                        <Input
                          value={c.label}
                          placeholder={labels.contactLabel}
                          onChange={(e) =>
                            patch({ footer: { ...cfg.footer, contact: cfg.footer.contact.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) } })
                          }
                        />
                        <Input
                          value={c.href}
                          placeholder="tel:0900000000"
                          onChange={(e) =>
                            patch({ footer: { ...cfg.footer, contact: cfg.footer.contact.map((x, j) => (j === i ? { ...x, href: e.target.value } : x)) } })
                          }
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={labels.remove}
                          onClick={() => patch({ footer: { ...cfg.footer, contact: cfg.footer.contact.filter((_, j) => j !== i) } })}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    ))}
                    {cfg.footer.contact.length < 8 ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => patch({ footer: { ...cfg.footer, contact: [...cfg.footer.contact, { label: "", href: "" }] } })}
                      >
                        <Plus />
                        {labels.addContact}
                      </Button>
                    ) : null}
                    <p className="text-xs text-muted-foreground">{labels.contactHint}</p>
                  </div>
                </FieldRow>
                <div className="flex flex-wrap gap-6">
                  <div className="flex items-center gap-3">
                    <Switch id="f-cat" checked={cfg.footer.show_categories} onCheckedChange={(v) => patch({ footer: { ...cfg.footer, show_categories: v } })} />
                    <Label htmlFor="f-cat">{labels.showCategories}</Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch id="f-col" checked={cfg.footer.show_collections} onCheckedChange={(v) => patch({ footer: { ...cfg.footer, show_collections: v } })} />
                    <Label htmlFor="f-col">{labels.showCollections}</Label>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="texts" forceMount className="mt-4 space-y-4 data-[state=inactive]:hidden">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {labels.textsTitle}
                  {changedTexts ? <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">{changedTexts}</span> : null}
                </CardTitle>
                <CardDescription>{labels.textsHint}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                {textGroups.map((g) => (
                  <div key={g.id} className="space-y-4">
                    <h3 className="text-sm font-semibold">{g.label[lang]}</h3>
                    {textCatalog
                      .filter((t) => t.group === g.id)
                      .map((t) => (
                        <FieldRow key={t.key} label={t.label[lang]}>
                          <L10nInput
                            idBase={`text-${t.key}`}
                            long={t.long}
                            value={cfg.texts[t.key] ?? {}}
                            placeholder={textDefaults[t.key]}
                            onChange={(v) =>
                              setCfg((c) => {
                                const texts = { ...c.texts }
                                if (!v.vi && !v.en) delete texts[t.key]
                                else texts[t.key] = v
                                return { ...c, texts }
                              })
                            }
                          />
                        </FieldRow>
                      ))}
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="xl:col-span-2">
          <Card className="sticky top-20">
            <CardHeader className="space-y-3">
              <CardTitle className="text-base">{labels.preview}</CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex rounded-full border p-0.5 text-xs">
                  {(["live", "sketch"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPreviewMode(m)}
                      className={cn("rounded-full px-3 py-1", previewMode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
                    >
                      {labels.previewModes[m]}
                    </button>
                  ))}
                </div>
                <div className="flex gap-1">
                  {(["home", "collection", "product"] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPreviewPage(p)}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs",
                        previewPage === p ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent"
                      )}
                    >
                      {labels.previewPages[p]}
                    </button>
                  ))}
                </div>
                {previewMode === "live" ? (
                  <div className="ml-auto flex gap-1">
                    {(["desktop", "mobile"] as const).map((d) => (
                      <Button
                        key={d}
                        type="button"
                        size="icon"
                        variant={device === d ? "default" : "ghost"}
                        aria-label={labels.devices[d]}
                        onClick={() => setDevice(d)}
                      >
                        {d === "desktop" ? <Monitor /> : <Smartphone />}
                      </Button>
                    ))}
                  </div>
                ) : null}
              </div>
            </CardHeader>
            <CardContent>
              {previewMode === "live" ? (
                hasDraft && (previewPage !== "product" || productHandle) ? (
                  <div className="overflow-hidden rounded-lg border bg-muted/30">
                    <div className="mx-auto" style={{ width: device === "mobile" ? 390 : "100%", maxWidth: "100%" }}>
                      <iframe
                        key={`${previewPage}-${draftUpdatedAt}`}
                        title={labels.previewModes.live}
                        src={`${previewBase}${
                          previewPage === "home" ? "" : previewPage === "collection" ? "/store" : `/products/${productHandle}`
                        }?_preview=${encodeURIComponent(previewToken)}`}
                        className="block h-[560px] w-full bg-background"
                      />
                    </div>
                  </div>
                ) : (
                  <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                    {hasDraft ? labels.noProductForPreview : labels.liveNeedsDraft}
                  </p>
                )
              ) : (
                <TemplatePreview choice={previewChoice} page={previewPage} />
              )}
              <p className="mt-3 text-xs text-muted-foreground">
                {previewMode === "live" ? labels.liveNote : labels.previewNote}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="sticky bottom-4 z-20 flex flex-wrap items-center gap-3 rounded-lg border bg-background/95 p-3 shadow-lg backdrop-blur">
        <IntentButton intent="publish">
          <Rocket />
          {labels.publish}
        </IntentButton>
        <IntentButton intent="draft" variant="outline">
          <Save />
          {labels.saveDraft}
        </IntentButton>
        <IntentButton intent="preview" variant="outline" newTabUrl="/api/portal/storefront-preview">
          <Eye />
          {labels.previewBtn}
        </IntentButton>
        {hasDraft ? (
          <IntentButton intent="discard" variant="ghost" className="text-destructive hover:text-destructive">
            <Trash2 />
            {labels.discard}
          </IntentButton>
        ) : null}
        <span className="ml-auto max-w-sm text-xs text-muted-foreground">
          {hasDraft ? (
            <span className="font-medium text-amber-700">
              {labels.statusDraft}
              {draftUpdatedAt ? ` · ${new Date(draftUpdatedAt).toLocaleString(lang === "vi" ? "vi-VN" : "en-GB")}` : ""}
            </span>
          ) : (
            labels.statusLive
          )}
        </span>
      </div>
    </form>
  )
}
