import { promises as dns } from 'node:dns';
import { MedusaError } from '@medusajs/framework/utils';
import type PortalModuleService from '../../modules/portal/service';
import { normalizeHost } from './store-context';

/** Apex under which every store gets <slug>.<BASE>. Wildcard DNS + wildcard TLS point at the storefront. */
export const BASE_DOMAIN = (process.env.STORE_BASE_DOMAIN || 'localhost').toLowerCase();
/** What a customer's custom domain must CNAME to. */
export const CNAME_TARGET = (
  process.env.STORE_CNAME_TARGET || `cname.${BASE_DOMAIN}`
).toLowerCase();

const RESERVED = new Set([
  'www',
  'admin',
  'app',
  'api',
  'portal',
  'preview',
  'cname',
  'mail',
  'static',
  'assets',
  'media',
  'store',
  'stores',
  'shop',
  'collab',
  's3',
  'drive',
  'ao',
  'dev',
  'test',
  'staging',
  'smtp',
  'ns1',
  'ns2',
]);

export type CustomDomain = { host: string; verified_at: string | null };

export function slugify(text: string): string {
  const s = text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '');
  return s || 'store';
}

export function validateSlug(raw: string): string {
  const slug = raw.trim().toLowerCase();
  if (!/^[a-z0-9]([a-z0-9-]{0,38}[a-z0-9])$/.test(slug)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      'Address must be 2-40 characters: lowercase letters, digits and hyphens, not starting or ending with a hyphen'
    );
  }
  if (RESERVED.has(slug)) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, `"${slug}" is reserved`);
  }
  return slug;
}

export const storeAddress = (slug: string | null | undefined) =>
  slug ? `${slug}.${BASE_DOMAIN}` : null;

export function readDomains(raw: unknown): CustomDomain[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((d: any) => (typeof d === 'string' ? { host: d, verified_at: null } : d))
    .filter((d: any) => d && typeof d.host === 'string')
    .map((d: any) => ({
      host: d.host as string,
      verified_at: (d.verified_at ?? null) as string | null,
    }));
}

/** A slug that no other store uses (appends -2, -3 ... when taken). */
export async function freeSlug(
  portal: PortalModuleService,
  wanted: string,
  exceptStoreId?: string
) {
  const base = validateSlug(
    slugify(wanted).length < 2 ? `${slugify(wanted)}-store` : slugify(wanted)
  );
  const taken = new Set(
    (await portal.listPortalSettings({}))
      .filter((s) => s.store_id !== exceptStoreId)
      .map((s) => s.slug)
      .filter(Boolean) as string[]
  );
  let slug = base;
  for (let i = 2; taken.has(slug); i++) slug = `${base.slice(0, 36)}-${i}`;
  return slug;
}

export async function assertSlugFree(portal: PortalModuleService, slug: string, storeId: string) {
  const [other] = await portal.listPortalSettings({ slug }, { take: 1 });
  if (other && other.store_id !== storeId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `${slug}.${BASE_DOMAIN} is already used by another store`
    );
  }
}

/** Custom domains must be real hosts, not under our own base domain, and unique across stores. */
export async function assertDomainFree(portal: PortalModuleService, host: string, storeId: string) {
  if (host === BASE_DOMAIN || host.endsWith(`.${BASE_DOMAIN}`) || host === CNAME_TARGET) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Use the store address (<name>.${BASE_DOMAIN}) for that; custom domains must be your own`
    );
  }
  for (const s of await portal.listPortalSettings({})) {
    if (s.store_id === storeId) continue;
    if (readDomains(s.domains).some((d) => d.host === host)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `${host} is already used by another store`
      );
    }
  }
}

export function cleanHost(raw: string): string {
  const host = normalizeHost(raw.replace(/^https?:\/\//i, '').split('/')[0] ?? '');
  if (!host || !host.includes('.')) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, `"${raw}" is not a valid domain`);
  }
  return host;
}

/**
 * Proves the owner controls the domain: it must CNAME to CNAME_TARGET. (Skipped in development.)
 */
export async function checkCname(host: string): Promise<{ ok: boolean; found: string[] }> {
  // Development (STORE_BASE_DOMAIN unset = localhost): no real DNS to check, so accept the domain.
  if (BASE_DOMAIN === 'localhost' && process.env.NODE_ENV !== 'production') {
    return { ok: true, found: [CNAME_TARGET] };
  }
  try {
    const found = (await dns.resolveCname(host)).map((c) => c.toLowerCase().replace(/\.$/, ''));
    return { ok: found.includes(CNAME_TARGET), found };
  } catch {
    return { ok: false, found: [] };
  }
}

/** Which store a request host belongs to: <slug>.<BASE> or a VERIFIED custom domain. */
export async function storeIdForHost(
  portal: PortalModuleService,
  host: string
): Promise<string | null> {
  const settings = await portal.listPortalSettings({});
  if (host.endsWith(`.${BASE_DOMAIN}`)) {
    const label = host.slice(0, -(BASE_DOMAIN.length + 1));
    return settings.find((s) => s.slug === label)?.store_id ?? null;
  }
  return (
    settings.find((s) => readDomains(s.domains).some((d) => d.host === host && d.verified_at))
      ?.store_id ?? null
  );
}
