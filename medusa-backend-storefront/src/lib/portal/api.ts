import "server-only"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

export type Actor = "collaborator" | "portal_admin"

export const JWT_COOKIE = "_portal_jwt"
export const ACTOR_COOKIE = "_portal_actor"

const BACKEND = process.env.MEDUSA_BACKEND_URL || "http://localhost:4300"

/**
 * True while the JWT in the cookie has not expired. Only reads the `exp` claim (the backend
 * still verifies the signature on every call); this lets pages treat an expired session as
 * signed out instead of drawing the signed-in layout around a login form.
 */
export function tokenValid(token: string | undefined): boolean {
  if (!token) return false
  try {
    const { exp } = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"))
    return typeof exp !== "number" || exp * 1000 > Date.now() + 10_000
  } catch {
    return false
  }
}

/** Route handler that clears the portal cookies, then shows the login page (see api/portal/session-expired). */
export const SESSION_EXPIRED_PATH = "/api/portal/session-expired"

export class PortalError extends Error {
  /** `key` is a Portal.* message key for errors raised by the storefront itself. */
  constructor(message: string, public status: number, public key?: string) {
    super(message)
  }
}

/**
 * The portal lives on ONE fixed route, /portal/..., independent of any storefront, region or
 * country: a collaborator can work for several stores, and there will be several storefronts.
 * The UI language is a cookie (see PORTAL_LOCALE_COOKIE), not part of the URL.
 * (The middleware serves /portal/... from the internal [locale]/[countryCode]/(portal) pages.)
 */
export const PORTAL_BASE = "/portal"
/** The storefront region the portal links to (preview, "open store"). One today; per store later. */
export const STOREFRONT_REGION = process.env.PORTAL_STOREFRONT_REGION || "vn"
export const PORTAL_LOCALE_COOKIE = "portal_locale"
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const portalBase = (_p?: unknown) => PORTAL_BASE

/** The signed-in user's chosen UI language (default vi). */
export async function portalLocale(): Promise<"vi" | "en"> {
  const v = (await cookies()).get(PORTAL_LOCALE_COOKIE)?.value
  return v === "en" ? "en" : "vi"
}

/**
 * Calls the Medusa backend as the signed-in portal user (server-side only, so no
 * CORS and the JWT never reaches the browser). A 401 sends the user to sign in.
 */
export async function portalFetch<T = any>(
  path: string,
  opts: {
    method?: string
    body?: unknown
    auth?: boolean
    loginPath?: string
  } = {}
): Promise<T> {
  const jar = await cookies()
  const token = jar.get(JWT_COOKIE)?.value
  const auth = opts.auth ?? true

  if (auth && !tokenValid(token)) {
    // No session or an expired one: clear the stale cookies and ask the user to sign in.
    redirect(token ? SESSION_EXPIRED_PATH : (opts.loginPath ?? "/portal/login"))
  }

  const res = await fetch(`${BACKEND}${path}`, {
    method: opts.method ?? (opts.body ? "POST" : "GET"),
    headers: {
      "content-type": "application/json",
      ...(auth && token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    cache: "no-store",
  })

  const text = await res.text()
  const json = text ? JSON.parse(text) : {}

  if (res.status === 401 && auth) {
    // The backend rejected the token (expired elsewhere, revoked, wrong secret).
    redirect(SESSION_EXPIRED_PATH)
  }
  if (!res.ok) {
    throw new PortalError(json.message || `Request failed (${res.status})`, res.status)
  }
  return json as T
}

/** Page guard: must be signed in as the given actor, otherwise go to the login page. */
export async function requireActor(actor: Actor, base: string) {
  const jar = await cookies()
  const token = jar.get(JWT_COOKIE)?.value
  const current = jar.get(ACTOR_COOKIE)?.value
  if (!tokenValid(token) || current !== actor) {
    // Expired session: clear the stale cookies first, then land on this user's own
    // /portal/login with the expired notice.
    redirect(
      token && !tokenValid(token)
        ? `${SESSION_EXPIRED_PATH}?to=${encodeURIComponent(`${base}/login?expired=1`)}`
        : `${base}/login`
    )
  }
}

export async function currentActor(): Promise<Actor | null> {
  const jar = await cookies()
  if (!tokenValid(jar.get(JWT_COOKIE)?.value)) {
    return null
  }
  const a = jar.get(ACTOR_COOKIE)?.value
  return a === "collaborator" || a === "portal_admin" ? a : null
}

async function authLogin(actor: Actor, email: string, password: string) {
  const res = await fetch(`${BACKEND}/auth/${actor}/emailpass`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
    cache: "no-store",
  })
  const json = await res.json().catch(() => ({}))
  return res.ok && json.token ? (json.token as string) : null
}

/**
 * A Medusa auth token only carries the actor id for the actor type it was requested
 * for, so a token asked for the wrong role has an empty actor_id.
 */
function hasActor(token: string): boolean {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"))
    return !!payload.actor_id
  } catch {
    return false
  }
}

/**
 * One sign-in form for everyone. The role comes from the account itself, not from a
 * choice on the page: try store admin first (it wins if an email has both roles),
 * then collaborator, and keep the token whose actor id is set. Wrong credentials and
 * "no portal role" are told apart so the user gets the right message.
 */
export async function loginDetectRole(email: string, password: string) {
  const adminToken = await authLogin("portal_admin", email, password)
  if (!adminToken) {
    throw new PortalError("Invalid email or password", 401, "login.invalid")
  }
  if (hasActor(adminToken)) {
    return { token: adminToken, actor: "portal_admin" as Actor }
  }
  const collabToken = await authLogin("collaborator", email, password)
  if (collabToken && hasActor(collabToken)) {
    return { token: collabToken, actor: "collaborator" as Actor }
  }
  throw new PortalError("No portal access", 403, "login.noAccess")
}

export const BACKEND_URL = BACKEND
