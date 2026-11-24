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
  DEFAULT_CONTACT_WIDGET,
  type ContactWidgetConfig,
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
import { contactKind, type ContactKind } from "@lib/storefront/contact"
import { ArrowDown, ArrowUp, Check, ChevronDown, Eye, Globe, ImageIcon, Loader2, Mail, MapPin, MessageCircle, Monitor, Phone, Plus, RotateCcw, Rocket, Save, Smartphone, Trash2 } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
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
  contact_widget: ContactWidgetConfig
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

/**
 * File chooser that uploads the image as soon as it is picked (POST /api/portal/upload), so
 * the live preview can show it immediately. The stored value is the returned /media URL.
 */
function ImageField({
  value,
  accept,
  labels,
  onUploaded,
  onClear,
}: {
  value: string
  accept: string
  labels: Labels
  onUploaded: (url: string) => void
  onClear: () => void
}) {
  const [nonce, setNonce] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pick = async (file: File | undefined) => {
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      const body = new FormData()
      body.append("file", file)
      const res = await fetch("/api/portal/upload", { method: "POST", body })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.url) {
        throw new Error(res.status === 401 ? labels.sessionExpired : json.error || labels.uploadFailed)
      }
      onUploaded(json.url)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
      setNonce((n) => n + 1)
    }
  }

  return (
    <div className="flex items-center gap-3">
      <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-md border bg-muted">
        {busy ? (
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        ) : value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="size-full object-contain" />
        ) : (
          <ImageIcon className="size-5 text-muted-foreground" />
        )}
      </div>
      <div className="min-w-0 space-y-1">
        <input
          key={nonce}
          type="file"
          accept={accept}
          disabled={busy}
          onChange={(e) => pick(e.target.files?.[0])}
          className="block w-full max-w-xs cursor-pointer rounded-md border border-input bg-background text-xs file:mr-2 file:cursor-pointer file:border-0 file:bg-muted file:px-2 file:py-1.5 file:text-xs file:font-medium"
        />
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {busy ? <span>{labels.uploading}</span> : null}
          {error ? <span className="text-destructive">{error}</span> : null}
          {value && !busy ? (
            <button type="button" className="inline-flex items-center gap-1 hover:text-destructive" onClick={onClear}>
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
      {...(newTabUrl ? { formAction: newTabUrl, formMethod: "post", formTarget: "_blank", formEncType: "multipart/form-data" } : {})}
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

/** Setting fields that hold what the owner WROTE (kept across themes), as opposed to design options. */
const CONTENT_FIELD_TYPES = new Set(["text", "textarea", "image", "link"])

const hasValue = (v: SettingValue | undefined) =>
  typeof v === "string" ? v.trim() !== "" : !!v && typeof v === "object" && Object.values(v as L10n).some((x) => (x ?? "").trim() !== "")

/** The content settings (text, images, links) of a section; options like style or count are excluded. */
function contentOf(section: SectionInstance): Record<string, SettingValue> {
  const out: Record<string, SettingValue> = {}
  for (const f of SECTION_DEFS[section.type].fields) {
    if (CONTENT_FIELD_TYPES.has(f.type) && hasValue(section.settings[f.key])) out[f.key] = section.settings[f.key]
  }
  return out
}

/**
 * Switching theme gives the new theme's sections, but nothing the owner typed is thrown away:
 *  - each new section takes over the content of the first unused section of the same type
 *    (the design options, e.g. hero style or image side, follow the new theme);
 *  - sections with content that have no counterpart in the new theme are kept at the end.
 */
function carryOverSections(current: SectionInstance[], defaults: SectionInstance[]): SectionInstance[] {
  const used = new Set<string>()
  const next = defaults.map((d) => {
    const match = current.find((c) => c.type === d.type && !used.has(c.id) && Object.keys(contentOf(c)).length > 0)
    if (!match) return d
    used.add(match.id)
    return { ...d, settings: { ...d.settings, ...contentOf(match) } }
  })
  const taken = new Set(next.map((n) => n.id))
  const leftovers = current
    .filter((c) => !used.has(c.id) && Object.keys(contentOf(c)).length > 0)
    .map((c) => {
      const id = taken.has(c.id) ? newSectionId(c.type, [...next, ...current]) : c.id
      taken.add(id)
      return { ...c, id }
    })
  return [...next, ...leftovers]
}

/**
 * The real storefront in an iframe at a TRUE device width, scaled down to fit the card.
 * Rendering it at the card's own (narrow) width would make the storefront switch to its
 * mobile layout, so desktop and mobile would look the same. Instead the frame is a 1280px
 * (desktop) or 390px (mobile) viewport and CSS scale() shrinks it, like a device preview.
 */
function ScaledFrame({
  src,
  device,
  frameRef,
  title,
}: {
  src: string
  device: "desktop" | "mobile"
  frameRef: React.MutableRefObject<HTMLIFrameElement | null>
  title: string
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    setWidth(el.clientWidth)
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const viewportW = device === "mobile" ? 390 : 1280
  const viewportH = device === "mobile" ? 800 : 860
  const scale = width ? Math.min(1, width / viewportW) : 1

  return (
    <div ref={wrapRef} className="overflow-hidden rounded-lg border bg-muted/30">
      <div className="relative mx-auto" style={{ width: viewportW * scale, height: viewportH * scale }}>
        <iframe
          ref={frameRef}
          title={title}
          src={src}
          className="absolute left-0 top-0 border-0 bg-background"
          style={{ width: viewportW, height: viewportH, transform: `scale(${scale})`, transformOrigin: "top left" }}
        />
      </div>
    </div>
  )
}

export function StorefrontEditor({
  action,
  returnTo,
  initial,
  labels,
  lang,
  textCatalog,
  textGroups,
  textDefaults,
  hasDraft: hasDraftInitial,
  draftUpdatedAt: draftUpdatedInitial,
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
    contact_widget: { ...DEFAULT_CONTACT_WIDGET, ...(initial.contact_widget ?? {}) },
  })
  const [open, setOpen] = useState<string | null>(null)
  const [previewPage, setPreviewPage] = useState<PreviewPage>("home")
  const [previewMode, setPreviewMode] = useState<"live" | "sketch">("live")
  const [hasDraft, setHasDraft] = useState(hasDraftInitial)
  const [draftUpdatedAt, setDraftUpdatedAt] = useState<string | null>(draftUpdatedInitial)
  const [autosave, setAutosave] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [autosaveError, setAutosaveError] = useState<string | null>(null)
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop")
  const [addType, setAddType] = useState<SectionType>("image-with-text")
  const theme = getTheme(cfg.template_id)

  const frameRef = useRef<HTMLIFrameElement | null>(null)
  const saveSeq = useRef(0)
  // The content the server already has. Autosave only runs when the editor state differs from
  // it, so opening the editor (or React re-running effects in dev) never creates a draft.
  const lastSaved = useRef<string>(JSON.stringify(cfg))

  // Live preview: a moment after the last edit, autosave the draft and tell the preview frame
  // to re-render with it (a soft refresh inside the frame: no reload, scroll position kept).
  useEffect(() => {
    const body = JSON.stringify(cfg)
    if (body === lastSaved.current) return
    setAutosave("saving")
    const seq = ++saveSeq.current
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch("/api/portal/storefront-draft", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body,
        })
        const json = await res.json().catch(() => ({}))
        if (seq !== saveSeq.current) return // a newer edit is already on its way
        if (!res.ok) throw new Error(res.status === 401 ? labels.sessionExpired : json.error || labels.autosaveFailed)
        lastSaved.current = body
        setHasDraft(true)
        setDraftUpdatedAt(json.updated_at ?? new Date().toISOString())
        setAutosave("saved")
        setAutosaveError(null)
        frameRef.current?.contentWindow?.postMessage({ type: "sf-refresh" }, window.location.origin)
      } catch (e) {
        if (seq !== saveSeq.current) return
        setAutosave("error")
        setAutosaveError((e as Error).message)
      }
    }, 800)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg])

  const patch = (p: Partial<Cfg>) => setCfg((c) => ({ ...c, ...p }))
  const patchWidget = (p: Partial<ContactWidgetConfig>) => setCfg((c) => ({ ...c, contact_widget: { ...c.contact_widget, ...p } }))
  const patchBranding = (p: Partial<BrandingConfig>) => setCfg((c) => ({ ...c, branding: { ...c.branding, ...p } }))

  const chooseTheme = (id: ThemeId) => {
    const next = getTheme(id)
    const current = getTheme(cfg.template_id)
    const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)
    setCfg((c) => ({
      ...c,
      template_id: id,
      // Layout comes from the theme; what the owner wrote in sections is carried over.
      home: carryOverSections(c.home, clone(next.home)),
      // The announcement and footer are the owner's content. They only follow the theme while
      // they are still the previous theme's untouched defaults.
      header: same(c.header, current.header) ? clone(next.header) : c.header,
      footer: same(c.footer, current.footer) ? clone(next.footer) : c.footer,
    }))
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
  const previewChoice: StorefrontChoice = cfg

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
              value={typeof value === "string" ? value : ""}
              accept="image/png,image/jpeg,image/webp"
              labels={labels}
              onUploaded={(url) => setSetting(section.id, f.key, url)}
              onClear={() => setSetting(section.id, f.key, "")}
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
      <input type="hidden" name="site" value={previewBase} />
      <input
        type="hidden"
        name="previewPath"
        value={previewPage === "home" ? "" : previewPage === "collection" ? "/store" : productHandle ? `/products/${productHandle}` : ""}
      />
      <input type="hidden" name="config" value={JSON.stringify(cfg)} />

      <div className="grid gap-6 xl:grid-cols-12">
        <Tabs defaultValue="theme" className="min-w-0 xl:col-span-5">
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
                    value={cfg.branding.logo}
                    accept="image/png,image/jpeg,image/webp"
                    labels={labels}
                    onUploaded={(url) => patchBranding({ logo: url })}
                    onClear={() => patchBranding({ logo: "" })}
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
                    value={cfg.branding.favicon}
                    accept="image/png,image/x-icon,image/vnd.microsoft.icon"
                    labels={labels}
                    onUploaded={(url) => patchBranding({ favicon: url })}
                    onClear={() => patchBranding({ favicon: "" })}
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
                  <div className="space-y-3">
                    {cfg.footer.contact.map((c, i) => {
                      const kind = contactKind(c)
                      const setRow = (p: Partial<typeof c>) =>
                        patch({ footer: { ...cfg.footer, contact: cfg.footer.contact.map((x, j) => (j === i ? { ...x, ...p } : x)) } })
                      return (
                        <div key={i} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[9rem_1fr_auto]">
                          <select
                            value={kind}
                            aria-label={labels.contactKind}
                            onChange={(e) => setRow({ kind: e.target.value as ContactKind })}
                            className="h-9 rounded-md border border-input bg-background px-2 text-sm shadow-sm"
                          >
                            {(["phone", "zalo", "email", "address", "link"] as const).map((k) => (
                              <option key={k} value={k}>
                                {labels.contactKinds[k]}
                              </option>
                            ))}
                          </select>
                          <Input
                            value={c.label}
                            placeholder={labels.contactPlaceholders[kind]}
                            aria-label={labels.contactLabel}
                            onChange={(e) => setRow({ label: e.target.value })}
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
                          <Input
                            className="sm:col-start-2"
                            value={c.href}
                            placeholder={labels.contactLinkPlaceholders[kind]}
                            aria-label={labels.contactLink}
                            onChange={(e) => setRow({ href: e.target.value })}
                          />
                        </div>
                      )
                    })}
                    {cfg.footer.contact.length < 10 ? (
                      <div className="flex flex-wrap gap-2">
                        {(
                          [
                            ["phone", Phone],
                            ["zalo", MessageCircle],
                            ["email", Mail],
                            ["address", MapPin],
                            ["link", Globe],
                          ] as const
                        ).map(([k, Icon]) => (
                          <Button
                            key={k}
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => patch({ footer: { ...cfg.footer, contact: [...cfg.footer.contact, { label: "", href: "", kind: k }] } })}
                          >
                            <Icon />
                            {labels.contactKinds[k]}
                          </Button>
                        ))}
                      </div>
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
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{labels.widgetTitle}</CardTitle>
                <CardDescription>{labels.widgetHint}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Switch id="w-on" checked={cfg.contact_widget.enabled} onCheckedChange={(v) => patchWidget({ enabled: v })} />
                  <Label htmlFor="w-on">{labels.widgetEnabled}</Label>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FieldRow label={labels.widgetPhone}>
                    <Input id="w-phone" value={cfg.contact_widget.phone} placeholder="0900 000 000" onChange={(e) => patchWidget({ phone: e.target.value })} />
                  </FieldRow>
                  <FieldRow label={labels.widgetZalo}>
                    <Input id="w-zalo" value={cfg.contact_widget.zalo} placeholder="0900000000" onChange={(e) => patchWidget({ zalo: e.target.value })} />
                  </FieldRow>
                </div>
                <p className="text-xs text-muted-foreground">{labels.widgetZaloHint}</p>
                <FieldRow label={labels.widgetPosition}>
                  <div className="flex gap-2">
                    {(["left", "right"] as const).map((pos) => (
                      <Button
                        key={pos}
                        type="button"
                        size="sm"
                        variant={cfg.contact_widget.position === pos ? "default" : "outline"}
                        aria-pressed={cfg.contact_widget.position === pos}
                        onClick={() => patchWidget({ position: pos })}
                      >
                        {labels.widgetPositions[pos]}
                      </Button>
                    ))}
                  </div>
                </FieldRow>
                <div className="flex items-center gap-3">
                  <Switch id="w-vn" checked={cfg.contact_widget.vn_only} onCheckedChange={(v) => patchWidget({ vn_only: v })} />
                  <Label htmlFor="w-vn">{labels.widgetVnOnly}</Label>
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

        <div className="min-w-0 xl:col-span-7">
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
                previewPage !== "product" || productHandle ? (
                  <ScaledFrame
                    frameRef={frameRef}
                    device={device}
                    title={labels.previewModes.live}
                    src={`/preview${previewBase}${
                      previewPage === "home" ? "" : previewPage === "collection" ? "/store" : `/products/${productHandle}`
                    }?_preview=${encodeURIComponent(previewToken)}`}
                  />
                ) : (
                  <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                    {labels.noProductForPreview}
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
        <span className="ml-auto max-w-sm text-right text-xs text-muted-foreground" aria-live="polite">
          {autosave === "saving" ? (
            <span className="inline-flex items-center gap-1">
              <Loader2 className="size-3 animate-spin" />
              {labels.autosaving}
            </span>
          ) : autosave === "error" ? (
            <span className="text-destructive">{autosaveError}</span>
          ) : hasDraft ? (
            <span className="font-medium text-amber-700">
              {autosave === "saved" ? labels.autosaved : labels.statusDraft}
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
