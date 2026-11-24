/**
 * Storefront theme choice stored in Store.metadata.storefront. Pure (no framework imports)
 * so it can be unit-tested. The theme catalog itself (tokens, layouts, section schemas)
 * lives in the storefront; the backend only whitelists ids and sanitizes what the owner
 * typed, because this data is rendered on a public site.
 */

export const TEMPLATE_IDS = ['classic', 'warm', 'modern', 'nature', 'boutique'] as const;
export const SECTION_TYPES = [
  'hero',
  'categories',
  'featured',
  'collections',
  'reel',
  'values',
  'shop',
  'image-with-text',
  'rich-text',
  'testimonials',
] as const;

export type TemplateId = (typeof TEMPLATE_IDS)[number];
export type SectionType = (typeof SECTION_TYPES)[number];
export type L10n = { vi?: string; en?: string };
export type SettingValue = string | number | boolean | L10n;

export type SectionInstance = {
  id: string;
  type: SectionType;
  enabled: boolean;
  settings: Record<string, SettingValue>;
};
export type HeaderConfig = { announcement: { enabled: boolean; text: L10n; link: string } };
export const CONTACT_KINDS = ['link', 'phone', 'email', 'address', 'zalo'] as const;
export type ContactKind = (typeof CONTACT_KINDS)[number];

export type FooterConfig = {
  tagline: L10n;
  /** Footer contact rows. href is optional: an address or plain text needs no link. */
  contact: { label: string; href: string; kind: ContactKind }[];
  show_categories: boolean;
  show_collections: boolean;
};

export type BrandingConfig = {
  /** Display name per language. Empty = the default store name. */
  store_name: L10n;
  /** /media/<id> logo shown in the header and footer. Empty = text name only. */
  logo: string;
  /** Logo height in px (header). */
  logo_height: number;
  /** Show the store name next to the logo. */
  show_name: boolean;
  tagline: L10n;
  favicon: string;
};

/** Floating Call / Zalo buttons. */
export type ContactWidgetConfig = {
  enabled: boolean;
  /** Phone number shown to call (digits, spaces, + - . ( ) only). */
  phone: string;
  /** Zalo phone number, or a https://zalo.me/... link. */
  zalo: string;
  position: 'left' | 'right';
  /** Only show for shoppers in Vietnam (the /vn storefront region). */
  vn_only: boolean;
};

export type StorefrontConfig = {
  template_id: TemplateId;
  /** #rrggbb accent override, null = the theme's own primary. */
  primary_color: string | null;
  /** Ordered home sections. null = the theme's default sections. */
  home: SectionInstance[] | null;
  header: HeaderConfig | null;
  footer: FooterConfig | null;
  branding: BrandingConfig | null;
  /**
   * Owner overrides of storefront texts, keyed by translation path (e.g. Home.valueTitle).
   * The storefront ignores keys that are not in its editable catalog.
   */
  texts: Record<string, L10n>;
  /** null = the theme default (see the storefront). */
  contact_widget: ContactWidgetConfig | null;
};

export const DEFAULT_STOREFRONT_CONFIG: StorefrontConfig = {
  template_id: 'classic',
  primary_color: null,
  home: null,
  header: null,
  footer: null,
  branding: null,
  texts: {},
  contact_widget: null,
};

export const MAX_TEXTS = 200;
export const MAX_SECTIONS = 30;
const MAX_TEXT = 2000;

const isObj = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);

const text = (v: unknown, max = MAX_TEXT): string => (typeof v === 'string' ? v.slice(0, max) : '');

/** Only site-relative paths, http(s), tel: and mailto: links. Anything else (javascript:, data:) is dropped. */
export function cleanLink(v: unknown): string {
  const s = text(v, 500).trim();
  return /^(\/(?!\/)|https?:\/\/|tel:|mailto:)/i.test(s) ? s : '';
}

/** Only images served by the backend (/media/<id>) or https URLs. */
export function cleanImage(v: unknown): string {
  const s = text(v, 500).trim();
  return /^\/media\/[A-Za-z0-9._-]+$/.test(s) || /^https:\/\//i.test(s) ? s : '';
}

function cleanL10n(v: unknown): L10n {
  const o = isObj(v) ? v : {};
  const out: L10n = {};
  if (typeof o.vi === 'string') out.vi = text(o.vi);
  if (typeof o.en === 'string') out.en = text(o.en);
  return out;
}

const IMAGE_KEY = /^(image|logo|favicon)$|_image$/;
const LINK_KEY = /^link$|_link$/;

function cleanSettings(raw: unknown): Record<string, SettingValue> {
  const out: Record<string, SettingValue> = {};
  if (!isObj(raw)) return out;
  for (const [key, v] of Object.entries(raw)) {
    if (!/^[a-z0-9_]{1,40}$/.test(key)) continue;
    if (typeof v === 'boolean') out[key] = v;
    else if (typeof v === 'number' && Number.isFinite(v))
      out[key] = Math.max(-1e6, Math.min(1e6, v));
    else if (typeof v === 'string') {
      // Only real image / link settings get URL treatment. Matching on a substring would
      // also catch plain options such as image_side and wipe their value.
      out[key] = IMAGE_KEY.test(key) ? cleanImage(v) : LINK_KEY.test(key) ? cleanLink(v) : text(v);
    } else if (isObj(v)) out[key] = cleanL10n(v);
  }
  return out;
}

function cleanHome(raw: unknown): SectionInstance[] | null {
  if (!Array.isArray(raw)) return null;
  const seen = new Set<string>();
  const out: SectionInstance[] = [];
  for (const r of raw.slice(0, MAX_SECTIONS)) {
    if (!isObj(r)) continue;
    const id = text(r.id, 40);
    if (!/^[a-z0-9-]{1,40}$/.test(id) || seen.has(id)) continue;
    if (!(SECTION_TYPES as readonly string[]).includes(r.type as string)) continue;
    seen.add(id);
    out.push({
      id,
      type: r.type as SectionType,
      enabled: r.enabled !== false,
      settings: cleanSettings(r.settings),
    });
  }
  return out;
}

function cleanHeader(raw: unknown): HeaderConfig | null {
  if (!isObj(raw) || !isObj(raw.announcement)) return null;
  const a = raw.announcement;
  return {
    announcement: { enabled: a.enabled === true, text: cleanL10n(a.text), link: cleanLink(a.link) },
  };
}

function cleanFooter(raw: unknown): FooterConfig | null {
  if (!isObj(raw)) return null;
  // A row needs a label; the link is optional (an address is just text). A bad link is
  // dropped but the row is kept, so owner text is never silently lost.
  const contact = Array.isArray(raw.contact)
    ? raw.contact
        .slice(0, 10)
        .filter(isObj)
        .map((c) => ({
          label: text(c.label, 160).trim(),
          href: cleanLink(c.href),
          kind: ((CONTACT_KINDS as readonly string[]).includes(c.kind as string)
            ? c.kind
            : 'link') as ContactKind,
        }))
        .filter((c) => c.label)
    : [];
  return {
    tagline: cleanL10n(raw.tagline),
    contact,
    show_categories: raw.show_categories !== false,
    show_collections: raw.show_collections !== false,
  };
}

function cleanBranding(raw: unknown): BrandingConfig | null {
  if (!isObj(raw)) return null;
  const h =
    typeof raw.logo_height === 'number' && Number.isFinite(raw.logo_height) ? raw.logo_height : 32;
  return {
    store_name: cleanL10n(raw.store_name),
    logo: cleanImage(raw.logo),
    logo_height: Math.max(16, Math.min(96, Math.round(h))),
    show_name: raw.show_name !== false,
    tagline: cleanL10n(raw.tagline),
    favicon: cleanImage(raw.favicon),
  };
}

/**
 * Text overrides end up inside translation messages (ICU). Braces would be parsed as
 * placeholders and angle brackets as rich-text tags, either of which can break a page,
 * so they are removed.
 */
function cleanOverride(v: unknown, max = 500): string {
  return text(v, max)
    .replace(/[{}<>]/g, '')
    .trim();
}

function cleanTexts(raw: unknown): Record<string, L10n> {
  const out: Record<string, L10n> = {};
  if (!isObj(raw)) return out;
  for (const [key, v] of Object.entries(raw).slice(0, MAX_TEXTS)) {
    if (!/^[A-Za-z][A-Za-z0-9]{0,40}\.[A-Za-z0-9_]{1,60}$/.test(key) || !isObj(v)) continue;
    const l: L10n = {};
    const vi = cleanOverride(v.vi);
    const en = cleanOverride(v.en);
    if (vi) l.vi = vi;
    if (en) l.en = en;
    if (l.vi || l.en) out[key] = l;
  }
  return out;
}

/** A phone number as typed: digits plus the usual separators, never markup. */
export function cleanPhone(v: unknown): string {
  return text(v, 30)
    .replace(/[^\d+\-.() ]/g, '')
    .trim();
}

/** A Zalo phone number (digits) or a link on zalo.me / chat.zalo.me. Anything else is dropped. */
export function cleanZalo(v: unknown): string {
  const s = text(v, 200).trim();
  if (/^https:\/\/(zalo\.me|chat\.zalo\.me)\/[\w\-./?=&%+]*$/i.test(s)) return s;
  const digits = s.replace(/[^\d+]/g, '');
  return /^\+?\d{8,15}$/.test(digits) ? digits : '';
}

function cleanContactWidget(raw: unknown): ContactWidgetConfig | null {
  if (!isObj(raw)) return null;
  return {
    enabled: raw.enabled === true,
    phone: cleanPhone(raw.phone),
    zalo: cleanZalo(raw.zalo),
    position: raw.position === 'left' ? 'left' : 'right',
    vn_only: raw.vn_only !== false,
  };
}

/** Validates and sanitizes anything (stored metadata or a PUT body) into a safe config. */
export function sanitizeStorefrontConfig(raw: unknown): StorefrontConfig {
  const r = isObj(raw) ? raw : {};
  const template_id = (TEMPLATE_IDS as readonly string[]).includes(r.template_id as string)
    ? (r.template_id as TemplateId)
    : DEFAULT_STOREFRONT_CONFIG.template_id;
  const primary_color =
    typeof r.primary_color === 'string' && /^#[0-9a-fA-F]{6}$/.test(r.primary_color)
      ? r.primary_color
      : null;
  return {
    template_id,
    primary_color,
    home: cleanHome(r.home),
    header: cleanHeader(r.header),
    footer: cleanFooter(r.footer),
    branding: cleanBranding(r.branding),
    texts: cleanTexts(r.texts),
    contact_widget: cleanContactWidget(r.contact_widget),
  };
}

/** Reads Store.metadata.storefront, tolerating missing or malformed data. */
export function readStorefrontConfig(
  metadata: Record<string, unknown> | null | undefined
): StorefrontConfig {
  return sanitizeStorefrontConfig(metadata?.storefront);
}
