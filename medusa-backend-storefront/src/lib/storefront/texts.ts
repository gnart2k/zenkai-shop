import type { L10n } from "./templates"

/**
 * Storefront texts the owner may change. Each entry is a translation key; an override
 * replaces the default text for that language everywhere the key is used. Keep this list to
 * plain texts: no {placeholders}, because the override is dropped into an ICU message.
 */
export type EditableText = {
  key: string
  group: "brand" | "home" | "values" | "store" | "footer"
  label: { vi: string; en: string }
  /** Long text: edit in a textarea. */
  long?: boolean
}

const T = (key: string, group: EditableText["group"], vi: string, en: string, long = false): EditableText => ({
  key,
  group,
  label: { vi, en },
  long,
})

export const TEXT_GROUPS: { id: EditableText["group"]; label: { vi: string; en: string } }[] = [
  { id: "brand", label: { vi: "Tên và tiêu đề cửa hàng", en: "Store name and title" } },
  { id: "home", label: { vi: "Trang chủ", en: "Home page" } },
  { id: "values", label: { vi: "Cam kết của cửa hàng (3 thẻ)", en: "Store promises (3 cards)" } },
  { id: "store", label: { vi: "Trang danh sách sản phẩm", en: "Product listing page" } },
  { id: "footer", label: { vi: "Chân trang", en: "Footer" } },
]

export const EDITABLE_TEXTS: EditableText[] = [
  T("Metadata.defaultTitle", "brand", "Tiêu đề trang (tab trình duyệt, Google)", "Page title (browser tab, Google)"),
  T("Metadata.defaultDescription", "brand", "Mô tả trang (Google)", "Page description (Google)", true),

  T("Home.heroBadge", "home", "Dòng nhỏ trên đầu trang chủ", "Small line above the hero"),
  T("Home.heroCtaShop", "home", "Chữ trên nút mua sắm", "Shop button label"),
  T("Home.subtitleFallback", "home", "Mô tả ngắn đầu trang (khi chưa có khẩu hiệu)", "Hero description (when there is no tagline)", true),
  T("Home.categoryEyebrowLive", "home", "Tiêu đề khu danh mục", "Categories heading"),
  T("Home.exploreLink", "home", "Chữ “Khám phá” trên thẻ danh mục", "“Explore” link on category cards"),
  T("Home.featuredTitle", "home", "Tiêu đề sản phẩm nổi bật", "Featured products heading"),
  T("Home.collectionsEyebrow", "home", "Dòng nhỏ trên sản phẩm nổi bật", "Small line above featured products"),
  T("Home.viewAllProducts", "home", "Chữ “Xem tất cả sản phẩm”", "“View all products” link"),
  T("Home.collectionsTitle", "home", "Tiêu đề khu bộ sưu tập", "Collections heading"),
  T("Home.reelEyebrow", "home", "Dòng nhỏ khu video", "Video section small line"),
  T("Home.reelTitle", "home", "Tiêu đề khu video", "Video section heading"),
  T("Home.reelSubtitle", "home", "Mô tả khu video", "Video section description", true),

  T("Home.valueEyebrow", "values", "Dòng nhỏ phía trên", "Small line above"),
  T("Home.valueTitle", "values", "Tiêu đề", "Heading"),
  T("Home.valueCard1Title", "values", "Thẻ 1: tiêu đề", "Card 1: title"),
  T("Home.valueCard1Desc", "values", "Thẻ 1: mô tả", "Card 1: description", true),
  T("Home.valueCard2Title", "values", "Thẻ 2: tiêu đề", "Card 2: title"),
  T("Home.valueCard2Desc", "values", "Thẻ 2: mô tả", "Card 2: description", true),
  T("Home.valueCard3Title", "values", "Thẻ 3: tiêu đề", "Card 3: title"),
  T("Home.valueCard3Desc", "values", "Thẻ 3: mô tả", "Card 3: description", true),

  T("ShopStore.heading", "store", "Tiêu đề trang sản phẩm", "Listing page heading"),
  T("ShopStore.subheading", "store", "Mô tả trang sản phẩm", "Listing page description", true),
  T("ShopStore.sortBy", "store", "Chữ “Sắp xếp theo”", "“Sort by” label"),

  T("Footer.categories", "footer", "Tiêu đề cột danh mục", "Categories column title"),
  T("Footer.collections", "footer", "Tiêu đề cột bộ sưu tập", "Collections column title"),
  T("Footer.contact", "footer", "Tiêu đề cột liên hệ", "Contact column title"),
]

// Nav.storeName comes from the branding block (store name), not from the texts list.
const ALLOWED = new Set([...EDITABLE_TEXTS.map((t) => t.key), "Nav.storeName"])

const pick = (v: L10n | undefined, locale: string) =>
  ((locale === "en" ? v?.en : v?.vi) ?? v?.vi ?? v?.en ?? "").trim()

/** Sets an override at "A.b" without mutating the original catalog. */
function setPath(messages: Record<string, any>, key: string, value: string) {
  const [ns, name] = key.split(".")
  if (typeof messages[ns] === "object" && messages[ns] && name in messages[ns]) {
    messages[ns] = { ...messages[ns], [name]: value }
  }
}

/**
 * Returns the translation catalog with the owner's text overrides applied. Only keys from
 * the editable catalog are honored, and only when the key already exists in the catalog.
 */
export function applyTextOverrides(
  messages: Record<string, any>,
  texts: Record<string, L10n> | undefined,
  locale: string
): Record<string, any> {
  if (!texts) return messages
  const out = { ...messages }
  for (const [key, value] of Object.entries(texts)) {
    if (!ALLOWED.has(key)) continue
    const text = pick(value, locale)
    if (text) setPath(out, key, text)
  }
  return out
}
