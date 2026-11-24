/**
 * Storefront themes, in the spirit of Shopify themes: a theme decides the STRUCTURE of the
 * shop (header, footer, listing page, product page, which sections the home page has) as
 * well as its look (colors, rounding, fonts). The owner then edits the content of the
 * sections in the portal. The backend stores only the choice and sanitizes it
 * ({ template_id, primary_color, home, header, footer }); this file turns it into what the
 * storefront renders.
 */

export type ThemeId = "classic" | "warm" | "modern" | "nature" | "boutique"
export type TemplateId = ThemeId

export type SectionType =
  | "hero"
  | "categories"
  | "featured"
  | "collections"
  | "reel"
  | "values"
  | "shop"
  | "image-with-text"
  | "rich-text"
  | "testimonials"

export type L10n = { vi?: string; en?: string }
export type SettingValue = string | number | boolean | L10n

export type SectionInstance = {
  id: string
  type: SectionType
  enabled: boolean
  settings: Record<string, SettingValue>
}

export type HeaderConfig = { announcement: { enabled: boolean; text: L10n; link: string } }
export type FooterConfig = {
  tagline: L10n
  contact: { label: string; href: string; kind?: "link" | "phone" | "email" | "address" | "zalo" }[]
  show_categories: boolean
  show_collections: boolean
}

/** Floating Call / Zalo buttons. */
export type ContactWidgetConfig = {
  enabled: boolean
  phone: string
  zalo: string
  position: "left" | "right"
  /** Only shoppers in the Vietnam region (/vn) see it. */
  vn_only: boolean
}

export const DEFAULT_CONTACT_WIDGET: ContactWidgetConfig = {
  enabled: false,
  phone: "",
  zalo: "",
  position: "right",
  vn_only: true,
}

export type BrandingConfig = {
  store_name: L10n
  logo: string
  logo_height: number
  show_name: boolean
  tagline: L10n
  favicon: string
}

export type HeaderVariant = "overlay" | "bar" | "centered"
export type FooterVariant = "columns" | "minimal"
export type ListingVariant = "sidebar" | "topbar"
export type ProductVariant = "split" | "stacked"
export type CardVariant = "plain" | "bordered" | "elevated"

export type ThemeLayout = {
  header: HeaderVariant
  footer: FooterVariant
  /** Store, category and collection pages. */
  listing: ListingVariant
  product: ProductVariant
  grid: 3 | 4
  card: CardVariant
}

export type Theme = {
  id: ThemeId
  name: { vi: string; en: string }
  description: { vi: string; en: string }
  /** shadcn tokens as "H S% L%" triples, plus --radius. */
  tokens: Record<string, string>
  fonts: { heading: string; body: string }
  layout: ThemeLayout
  home: SectionInstance[]
  header: HeaderConfig
  footer: FooterConfig
}

// ---------------------------------------------------------------------------
// Sections: schemas the portal editor renders and the storefront reads.
// ---------------------------------------------------------------------------

export type Field = {
  key: string
  type: "text" | "textarea" | "image" | "link" | "select" | "number"
  label: { vi: string; en: string }
  options?: { value: string; label: { vi: string; en: string } }[]
  min?: number
  max?: number
}

export type SectionDef = {
  label: { vi: string; en: string }
  description: { vi: string; en: string }
  fields: Field[]
  defaults: Record<string, SettingValue>
}

const L = (vi: string, en: string) => ({ vi, en })
const heading = (extra?: Partial<Field>): Field => ({ key: "heading", type: "text", label: L("Tiêu đề", "Heading"), ...extra })

export const SECTION_DEFS: Record<SectionType, SectionDef> = {
  hero: {
    label: L("Ảnh đầu trang", "Hero"),
    description: L("Khu vực lớn đầu trang chủ.", "The large opening area of the home page."),
    fields: [
      {
        key: "style",
        type: "select",
        label: L("Kiểu hiển thị", "Style"),
        options: [
          { value: "carousel", label: L("Ảnh/video toàn khung (trình chiếu)", "Full-width slideshow") },
          { value: "split", label: L("Chia đôi: chữ và ảnh", "Split: text and image") },
          { value: "text", label: L("Chỉ chữ", "Text only") },
        ],
      },
      heading(),
      { key: "subheading", type: "textarea", label: L("Mô tả ngắn", "Subheading") },
      { key: "button_label", type: "text", label: L("Chữ trên nút", "Button label") },
      { key: "button_link", type: "link", label: L("Liên kết của nút", "Button link") },
      { key: "image", type: "image", label: L("Ảnh (kiểu chia đôi)", "Image (split style)") },
    ],
    defaults: { style: "carousel", heading: "", subheading: "", button_label: "", button_link: "", image: "" },
  },
  categories: {
    label: L("Danh mục", "Categories"),
    description: L("Lối vào các danh mục sản phẩm.", "Entry points to your product categories."),
    fields: [
      {
        key: "style",
        type: "select",
        label: L("Kiểu hiển thị", "Style"),
        options: [
          { value: "cards", label: L("Thẻ ảnh lớn", "Image cards") },
          { value: "pills", label: L("Nhãn gọn", "Compact pills") },
        ],
      },
      heading({ label: L("Tiêu đề (kiểu nhãn)", "Heading (pills style)") }),
    ],
    defaults: { style: "cards", heading: "" },
  },
  featured: {
    label: L("Sản phẩm nổi bật", "Featured products"),
    description: L("Lưới các sản phẩm mới nhất.", "A grid of your latest products."),
    fields: [
      heading(),
      { key: "subheading", type: "text", label: L("Mô tả ngắn", "Subheading") },
      { key: "count", type: "number", label: L("Số sản phẩm", "Number of products"), min: 4, max: 12 },
    ],
    defaults: { heading: "", subheading: "", count: 8 },
  },
  collections: {
    label: L("Bộ sưu tập", "Collections"),
    description: L("Nổi bật các bộ sưu tập.", "Highlights your collections."),
    fields: [],
    defaults: {},
  },
  reel: {
    label: L("Video ngắn", "Video reel"),
    description: L("Dải video ngắn từ mạng xã hội.", "A strip of short videos."),
    fields: [],
    defaults: {},
  },
  values: {
    label: L("Cam kết của cửa hàng", "Why shop with us"),
    description: L("Ba điểm mạnh của cửa hàng.", "Three reasons to buy from you."),
    fields: [],
    defaults: {},
  },
  shop: {
    label: L("Mua theo bộ sưu tập", "Shop by collection"),
    description: L("Các hàng sản phẩm theo từng bộ sưu tập.", "Product rows for each collection."),
    fields: [],
    defaults: {},
  },
  "image-with-text": {
    label: L("Ảnh kèm chữ", "Image with text"),
    description: L("Ảnh bên cạnh một đoạn giới thiệu. Ẩn cho đến khi bạn nhập nội dung.", "An image beside a story or promo. Hidden until you add content."),
    fields: [
      { key: "image", type: "image", label: L("Ảnh", "Image") },
      {
        key: "image_side",
        type: "select",
        label: L("Vị trí ảnh", "Image position"),
        options: [
          { value: "left", label: L("Bên trái", "Left") },
          { value: "right", label: L("Bên phải", "Right") },
        ],
      },
      { key: "eyebrow", type: "text", label: L("Dòng nhỏ phía trên", "Eyebrow") },
      heading(),
      { key: "text", type: "textarea", label: L("Nội dung", "Text") },
      { key: "button_label", type: "text", label: L("Chữ trên nút", "Button label") },
      { key: "button_link", type: "link", label: L("Liên kết của nút", "Button link") },
    ],
    defaults: { image: "", image_side: "left", eyebrow: "", heading: "", text: "", button_label: "", button_link: "" },
  },
  "rich-text": {
    label: L("Đoạn văn", "Rich text"),
    description: L("Tiêu đề và đoạn văn căn giữa. Ẩn cho đến khi bạn nhập nội dung.", "A centered heading and paragraph. Hidden until you add content."),
    fields: [heading(), { key: "text", type: "textarea", label: L("Nội dung", "Text") }],
    defaults: { heading: "", text: "" },
  },
  testimonials: {
    label: L("Đánh giá khách hàng", "Testimonials"),
    description: L("Tối đa ba lời nhận xét thật từ khách hàng. Ẩn cho đến khi bạn nhập.", "Up to three real customer quotes. Hidden until you add some."),
    fields: [
      heading(),
      ...[1, 2, 3].flatMap((n): Field[] => [
        { key: `quote${n}_text`, type: "textarea", label: L(`Nhận xét ${n}`, `Quote ${n}`) },
        { key: `quote${n}_name`, type: "text", label: L(`Tên khách ${n}`, `Customer ${n}`) },
      ]),
    ],
    defaults: { heading: "", quote1_text: "", quote1_name: "", quote2_text: "", quote2_name: "", quote3_text: "", quote3_name: "" },
  },
}

export const SECTION_TYPES = Object.keys(SECTION_DEFS) as SectionType[]

// ---------------------------------------------------------------------------
// Themes
// ---------------------------------------------------------------------------

/** The look the storefront had before themes existed. */
const CLASSIC_TOKENS: Record<string, string> = {
  "--background": "0 0% 100%",
  "--foreground": "0 0% 3.9%",
  "--card": "0 0% 100%",
  "--card-foreground": "0 0% 3.9%",
  "--primary": "0 0% 9%",
  "--primary-foreground": "0 0% 98%",
  "--secondary": "0 0% 96.1%",
  "--secondary-foreground": "0 0% 9%",
  "--muted": "0 0% 96.1%",
  "--muted-foreground": "0 0% 45.1%",
  "--accent": "0 0% 96.1%",
  "--accent-foreground": "0 0% 9%",
  "--border": "0 0% 89.8%",
  "--input": "0 0% 89.8%",
  "--ring": "0 0% 3.9%",
  "--radius": "0.75rem",
}

const SERIF = 'ui-serif, Georgia, Cambria, "Times New Roman", serif'
const SANS = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif'
const ROUNDED = 'ui-rounded, "SF Pro Rounded", "Hiragino Maru Gothic ProN", system-ui, sans-serif'
const BOOKISH = '"Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif'

/** Section instance with the theme's own settings. */
const S = (
  type: SectionType,
  settings: Record<string, SettingValue> = {},
  id: string = type
): SectionInstance => ({ id, type, enabled: true, settings })

const NO_ANNOUNCEMENT: HeaderConfig = { announcement: { enabled: false, text: {}, link: "" } }

/** What the footer showed before it became editable. */
const DEFAULT_FOOTER: FooterConfig = {
  tagline: {},
  // No store-specific contact details here: every store (tenant) starts neutral and fills this
  // in the editor. The first store's contacts are stored in its own config.
  contact: [],
  show_categories: true,
  show_collections: true,
}

export const THEMES: Theme[] = [
  {
    id: "classic",
    name: L("Cổ điển", "Classic"),
    description: L(
      "Đen trắng thanh lịch. Thanh menu trong suốt phủ lên ảnh lớn đầu trang, danh mục dạng thẻ ảnh, bộ lọc bên cạnh.",
      "Elegant black and white. A transparent header over a full-width hero, image category cards and a filter sidebar."
    ),
    tokens: CLASSIC_TOKENS,
    fonts: { heading: SERIF, body: SANS },
    layout: { header: "overlay", footer: "columns", listing: "sidebar", product: "split", grid: 4, card: "plain" },
    home: [
      S("hero", { style: "carousel" }),
      S("categories", { style: "cards" }),
      S("featured"),
      S("reel"),
      S("collections"),
      S("values"),
      S("shop"),
    ],
    header: NO_ANNOUNCEMENT,
    footer: DEFAULT_FOOTER,
  },
  {
    id: "warm",
    name: L("Biên tập", "Editorial"),
    description: L(
      "Nền kem, màu đất nung, chữ có chân. Logo ở giữa kèm dải thông báo, đầu trang chia đôi, trang sản phẩm xếp dọc.",
      "Cream and terracotta with serif type. Centered logo with an announcement bar, a split hero and a stacked product page."
    ),
    tokens: {
      ...CLASSIC_TOKENS,
      "--background": "36 40% 97%",
      "--foreground": "20 25% 14%",
      "--card": "36 45% 99%",
      "--card-foreground": "20 25% 14%",
      "--primary": "14 62% 45%",
      "--primary-foreground": "36 40% 98%",
      "--secondary": "33 30% 92%",
      "--secondary-foreground": "20 25% 14%",
      "--muted": "33 25% 93%",
      "--muted-foreground": "25 15% 40%",
      "--accent": "33 30% 90%",
      "--accent-foreground": "20 25% 14%",
      "--border": "30 20% 85%",
      "--input": "30 20% 85%",
      "--ring": "14 62% 45%",
      "--radius": "0.5rem",
    },
    fonts: { heading: BOOKISH, body: SANS },
    layout: { header: "centered", footer: "columns", listing: "topbar", product: "stacked", grid: 3, card: "bordered" },
    home: [
      S("hero", { style: "split" }),
      S("categories", { style: "cards" }),
      S("featured", { count: 6 }),
      S("image-with-text", { image_side: "left" }),
      S("testimonials"),
      S("collections"),
      S("reel"),
      S("values"),
    ],
    header: {
      announcement: {
        enabled: true,
        text: { vi: "Giao hàng toàn quốc · Đổi trả trong 7 ngày", en: "Nationwide delivery · 7-day returns" },
        link: "",
      },
    },
    footer: DEFAULT_FOOTER,
  },
  {
    id: "modern",
    name: L("Hiện đại", "Modern"),
    description: L(
      "Trắng tinh, nhấn chàm, góc vuông. Thanh menu gọn có sẵn danh mục, đầu trang chỉ chữ, bộ lọc ngang, chân trang tối giản.",
      "Crisp white with indigo and sharp corners. A compact header with inline categories, a text hero, a top filter bar and a minimal footer."
    ),
    tokens: {
      ...CLASSIC_TOKENS,
      "--background": "0 0% 100%",
      "--foreground": "222 47% 8%",
      "--card": "0 0% 100%",
      "--card-foreground": "222 47% 8%",
      "--primary": "243 75% 52%",
      "--primary-foreground": "0 0% 100%",
      "--secondary": "240 5% 96%",
      "--secondary-foreground": "222 47% 8%",
      "--muted": "240 5% 96%",
      "--muted-foreground": "240 4% 40%",
      "--accent": "240 5% 94%",
      "--accent-foreground": "222 47% 8%",
      "--border": "240 6% 88%",
      "--input": "240 6% 88%",
      "--ring": "243 75% 52%",
      "--radius": "0.25rem",
    },
    fonts: { heading: SANS, body: SANS },
    layout: { header: "bar", footer: "minimal", listing: "topbar", product: "split", grid: 4, card: "plain" },
    home: [
      S("hero", { style: "text" }),
      S("categories", { style: "pills" }),
      S("featured", { count: 8 }),
      S("rich-text"),
      S("shop"),
      S("values"),
    ],
    header: NO_ANNOUNCEMENT,
    footer: DEFAULT_FOOTER,
  },
  {
    id: "nature",
    name: L("Tự nhiên", "Nature"),
    description: L(
      "Xanh lá dịu, bo tròn, thẻ nổi. Thanh menu gọn, ảnh đầu trang cỡ lớn, trang sản phẩm xếp dọc.",
      "Soft green, rounded and lifted cards. A compact header, a full-width hero and a stacked product page."
    ),
    tokens: {
      ...CLASSIC_TOKENS,
      "--background": "120 20% 98%",
      "--foreground": "150 30% 10%",
      "--card": "120 25% 99%",
      "--card-foreground": "150 30% 10%",
      "--primary": "152 45% 28%",
      "--primary-foreground": "0 0% 100%",
      "--secondary": "120 15% 94%",
      "--secondary-foreground": "150 30% 10%",
      "--muted": "120 15% 94%",
      "--muted-foreground": "150 10% 38%",
      "--accent": "120 20% 91%",
      "--accent-foreground": "150 30% 10%",
      "--border": "130 15% 86%",
      "--input": "130 15% 86%",
      "--ring": "152 45% 28%",
      "--radius": "1rem",
    },
    fonts: { heading: ROUNDED, body: ROUNDED },
    layout: { header: "bar", footer: "columns", listing: "sidebar", product: "stacked", grid: 3, card: "elevated" },
    home: [
      S("hero", { style: "carousel" }),
      S("categories", { style: "cards" }),
      S("featured", { count: 6 }),
      S("image-with-text", { image_side: "right" }),
      S("values"),
      S("collections"),
      S("reel"),
      S("shop"),
    ],
    header: NO_ANNOUNCEMENT,
    footer: DEFAULT_FOOTER,
  },
  {
    id: "boutique",
    name: L("Boutique", "Boutique"),
    description: L(
      "Hồng phấn nhẹ nhàng, bo góc lớn. Logo ở giữa, đầu trang chia đôi, danh mục dạng nhãn, chân trang tối giản.",
      "Gentle rose with generous rounding. Centered logo, split hero, category pills and a minimal footer."
    ),
    tokens: {
      ...CLASSIC_TOKENS,
      "--background": "345 40% 98%",
      "--foreground": "340 25% 14%",
      "--card": "345 45% 99%",
      "--card-foreground": "340 25% 14%",
      "--primary": "340 65% 48%",
      "--primary-foreground": "0 0% 100%",
      "--secondary": "345 30% 95%",
      "--secondary-foreground": "340 25% 14%",
      "--muted": "345 30% 95%",
      "--muted-foreground": "340 10% 42%",
      "--accent": "345 40% 93%",
      "--accent-foreground": "340 25% 14%",
      "--border": "345 20% 88%",
      "--input": "345 20% 88%",
      "--ring": "340 65% 48%",
      "--radius": "1.25rem",
    },
    fonts: { heading: BOOKISH, body: ROUNDED },
    layout: { header: "centered", footer: "minimal", listing: "sidebar", product: "split", grid: 4, card: "elevated" },
    home: [
      S("hero", { style: "split" }),
      S("featured", { count: 8 }),
      S("categories", { style: "pills" }),
      S("testimonials"),
      S("collections"),
      S("values"),
      S("shop"),
    ],
    header: NO_ANNOUNCEMENT,
    footer: DEFAULT_FOOTER,
  },
]

export const DEFAULT_THEME_ID: ThemeId = "classic"
/** @deprecated kept so older imports keep working. */
export const TEMPLATES = THEMES

export const getTheme = (id: string | null | undefined): Theme => THEMES.find((t) => t.id === id) ?? THEMES[0]
export const getTemplate = getTheme

export type StorefrontChoice = {
  template_id: ThemeId
  primary_color: string | null
  home: SectionInstance[] | null
  header: HeaderConfig | null
  footer: FooterConfig | null
  branding: BrandingConfig | null
  texts: Record<string, L10n>
  contact_widget?: ContactWidgetConfig | null
  /** True when this is the owner's unpublished draft shown through a preview link. */
  preview?: boolean
}

export const DEFAULT_BRANDING: BrandingConfig = {
  store_name: {},
  logo: "",
  logo_height: 32,
  show_name: true,
  tagline: {},
  favicon: "",
}

export const DEFAULT_CHOICE: StorefrontChoice = {
  template_id: DEFAULT_THEME_ID,
  primary_color: null,
  home: null,
  header: null,
  footer: null,
  branding: null,
  texts: {},
}

// ---------------------------------------------------------------------------
// Reading settings
// ---------------------------------------------------------------------------

/** vi/en text with fallbacks: the requested language, then Vietnamese, then English. */
export function pickText(v: SettingValue | undefined, locale: string): string {
  if (typeof v === "string") return v.trim()
  if (v && typeof v === "object") {
    const o = v as L10n
    return ((locale === "en" ? o.en : o.vi) ?? o.vi ?? o.en ?? "").trim()
  }
  return ""
}

/** A section's setting as text; empty falls back to the schema default. */
export function readText(section: SectionInstance, key: string, locale: string): string {
  return pickText(section.settings[key], locale) || pickText(SECTION_DEFS[section.type].defaults[key], locale)
}

export function readNumber(section: SectionInstance, key: string, fallback: number): number {
  const v = section.settings[key] ?? SECTION_DEFS[section.type].defaults[key]
  return typeof v === "number" && Number.isFinite(v) ? v : fallback
}

export function readSelect<T extends string>(section: SectionInstance, key: string, allowed: readonly T[], fallback: T): T {
  const v = section.settings[key] ?? SECTION_DEFS[section.type].defaults[key]
  return typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : fallback
}

// ---------------------------------------------------------------------------
// Color helpers
// ---------------------------------------------------------------------------

/** "#rrggbb" -> "H S% L%" (the format shadcn tokens use). */
export function hexToHsl(hex: string): string | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return null
  const n = parseInt(m[1], 16)
  const r = ((n >> 16) & 255) / 255
  const g = ((n >> 8) & 255) / 255
  const b = (n & 255) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  const d = max - min
  let h = 0
  let s = 0
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1))
    if (max === r) h = ((g - b) / d) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h = Math.round(h * 60)
    if (h < 0) h += 360
  }
  return `${h} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`
}

/** Readable text color on top of a custom primary. */
function onColor(hex: string): string {
  const n = parseInt(hex.replace("#", ""), 16)
  const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255
  return lum > 0.6 ? "0 0% 9%" : "0 0% 100%"
}

// ---------------------------------------------------------------------------
// Resolve
// ---------------------------------------------------------------------------

export type ResolvedStorefront = {
  theme: Theme
  /** @deprecated alias of theme */
  template: Theme
  /** CSS custom properties to put on :root. */
  cssVars: Record<string, string>
  layout: ThemeLayout
  /** Enabled home sections, in order. */
  home: SectionInstance[]
  header: HeaderConfig
  footer: FooterConfig
  branding: BrandingConfig
  contactWidget: ContactWidgetConfig
}

/** Theme defaults + the owner's choices -> what the storefront renders. */
export function resolveStorefront(choice: Partial<StorefrontChoice> | null | undefined): ResolvedStorefront {
  const theme = getTheme(choice?.template_id)
  const cssVars: Record<string, string> = {
    ...theme.tokens,
    "--font-heading": theme.fonts.heading,
    "--font-body": theme.fonts.body,
  }
  const hsl = choice?.primary_color ? hexToHsl(choice.primary_color) : null
  if (hsl && choice?.primary_color) {
    cssVars["--primary"] = hsl
    cssVars["--ring"] = hsl
    cssVars["--primary-foreground"] = onColor(choice.primary_color)
  }
  const home = (choice?.home ?? theme.home).filter((s) => s.enabled && s.type in SECTION_DEFS)
  return {
    theme,
    template: theme,
    cssVars,
    layout: theme.layout,
    home,
    header: choice?.header ?? theme.header,
    footer: choice?.footer ?? theme.footer,
    branding: choice?.branding ?? DEFAULT_BRANDING,
    contactWidget: choice?.contact_widget ?? DEFAULT_CONTACT_WIDGET,
  }
}

/** :root { --x: y; } */
export const cssText = (vars: Record<string, string>) =>
  `:root{${Object.entries(vars)
    .map(([k, v]) => `${k}:${v}`)
    .join(";")}}`

/** A fresh, unique id for a new section of this type. */
export function newSectionId(type: SectionType, existing: SectionInstance[]): string {
  const taken = new Set(existing.map((s) => s.id))
  for (let i = 1; i < 100; i++) {
    const id = `${type}-${i}`
    if (!taken.has(id)) return id
  }
  return `${type}-${Date.now()}`
}
