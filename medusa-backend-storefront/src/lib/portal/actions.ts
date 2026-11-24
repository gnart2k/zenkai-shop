"use server"

import { getTranslations } from "next-intl/server"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { setCartId } from "@lib/data/cookies"
import {
  ACTOR_COOKIE,
  Actor,
  JWT_COOKIE,
  PortalError,
  loginDetectRole,
  portalFetch,
  portalLocale,
} from "./api"
import { buildStorefrontConfig } from "./storefront-save"

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim()
const num = (f: FormData, k: string) => Number(str(f, k).replace(/[, ]/g, ""))


/** Backend messages are English; map the ones users can hit to translated copy. */
const BACKEND_ERRORS: [RegExp, string][] = [
  [/Not a collaborator of this store/, "notCollaborator"],
  [/lower than the (suggested|original) price/, "priceTooLow"],
  [/not available in this store/, "productUnavailable"],
  [/has no .*price/, "noPrice"],
  [/^Request not found/, "requestNotFound"],
  [/Request is already/, "alreadyReviewed"],
  [/Invite link is invalid|Invite no longer exists/, "inviteInvalid"],
  [/already accepted/, "inviteUsed"],
  [/already exists/, "accountExists"],
  [/between 1 byte and 5 MB/, "fileSize"],
  [/Collaborator not found/, "collabNotFound"],
  [/Payout not found/, "payoutNotFound"],
  [/already marked paid/, "payoutPaid"],
  [/already a portal admin/, "adminElsewhere"],
  [/Original price cannot be higher/, "originalTooHigh"],
  [/Original cost cannot be higher/, "costTooHigh"],
  [/open collaborator requests/, "openRequests"],
  [/category is shared/, "categoryShared"],
  [/no stock location/, "noStockLocation"],
  [/Product not found/, "productNotFound"],
  [/Category not found/, "categoryNotFound"],
  [/Variant not found/, "variantNotFound"],
  [/sku/i, "skuTaken"],
]

async function messageFor(locale: string, e: PortalError): Promise<string> {
  const t = await getTranslations({ locale, namespace: "Portal" })
  if (e.key) {
    return t(e.key as never)
  }
  const hit = BACKEND_ERRORS.find(([re]) => re.test(e.message))
  return hit ? t(`errors.${hit[1]}` as never) : e.message
}

const withParam = (url: string, key: string, value: string) =>
  `${url}${url.includes("?") ? "&" : "?"}${key}=${encodeURIComponent(value)}`

/**
 * Runs a mutation, then redirects. On failure it redirects back with ?error=...
 * (redirect() throws, so it must stay outside the try/catch).
 */
async function run(
  f: FormData,
  work: () => Promise<string | void>,
  successTo?: string
): Promise<never> {
  const returnTo = str(f, "returnTo") || "/"
  let target = successTo ?? returnTo
  try {
    const next = await work()
    if (next) {
      target = next
    }
  } catch (e) {
    if (e instanceof PortalError) {
      redirect(withParam(returnTo, "error", await messageFor(await portalLocale(), e)))
    }
    throw e
  }
  redirect(target)
}

// ---- Auth ------------------------------------------------------------------

export async function login(f: FormData) {
  const base = str(f, "base")
  const loginUrl = `${base}/login`
  let result: { token: string; actor: Actor }
  try {
    result = await loginDetectRole(str(f, "email").toLowerCase(), str(f, "password"))
  } catch (e) {
    if (e instanceof PortalError) {
      redirect(withParam(loginUrl, "error", await messageFor(await portalLocale(), e)))
    }
    throw e
  }
  const jar = await cookies()
  const opts = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production" && process.env.COOKIE_SECURE !== "false",
    // Matches the backend token lifetime (JWT_EXPIRES_IN, 7d); the middleware keeps it fresh while in use.
    maxAge: 60 * 60 * 24 * 7,
  }
  jar.set(JWT_COOKIE, result.token, opts)
  jar.set(ACTOR_COOKIE, result.actor, opts)
  redirect(result.actor === "portal_admin" ? `${base}/admin` : `${base}/collaborator`)
}

export async function logout(f: FormData) {
  const jar = await cookies()
  jar.delete(JWT_COOKIE)
  jar.delete(ACTOR_COOKIE)
  redirect(`${str(f, "base")}/login`)
}

export async function acceptInvite(f: FormData) {
  const base = str(f, "base")
  return run(f, async () => {
    const res = await portalFetch<{ actor: Actor; linked_existing_login: boolean }>(
      "/portal-api/invites/accept",
      { auth: false, body: { token: str(f, "token"), password: str(f, "password") } }
    )
    return `${base}/login?accepted=${res.linked_existing_login ? "linked" : "new"}`
  })
}

// ---- Collaborator ----------------------------------------------------------

export async function createRequest(f: FormData) {
  const store = str(f, "storeId")
  const base = str(f, "base")
  return run(
    f,
    async () => {
      const file = f.get("proof")
      if (!(file instanceof File) || file.size === 0) {
        throw new PortalError("Proof of deposit is required", 400, "newRequest.proofRequired")
      }
      const { file: uploaded } = await portalFetch<{ file: { id: string; url: string } }>(
        "/portal-api/collaborator/uploads",
        {
          body: {
            filename: file.name,
            mime_type: file.type,
            content_base64: Buffer.from(await file.arrayBuffer()).toString("base64"),
          },
        }
      )
      await portalFetch(`/portal-api/collaborator/stores/${store}/requests`, {
        body: {
          variant_id: str(f, "variant_id"),
          quantity: num(f, "quantity"),
          commercial_price: num(f, "commercial_price"),
          customer_name: str(f, "customer_name"),
          customer_email: str(f, "customer_email"),
          customer_phone: str(f, "customer_phone") || null,
          proof_url: uploaded.url,
          proof_file_id: uploaded.id,
        },
      })
    },
    `${base}/collaborator/${store}/requests?created=1`
  )
}

// ---- Portal admin ----------------------------------------------------------

export async function approveRequest(f: FormData) {
  const id = str(f, "id")
  return run(f, async () => {
    await portalFetch(`/portal-api/admin/requests/${id}/approve`, { method: "POST", body: {} })
  })
}

export async function rejectRequest(f: FormData) {
  const id = str(f, "id")
  return run(f, async () => {
    await portalFetch(`/portal-api/admin/requests/${id}/reject`, {
      body: { reason: str(f, "reason") },
    })
  })
}

export async function reverseRequest(f: FormData) {
  const id = str(f, "id")
  return run(f, async () => {
    await portalFetch(`/portal-api/admin/requests/${id}/reverse`, {
      body: { reason: str(f, "reason") || undefined },
    })
  })
}

export async function inviteCollaborator(f: FormData) {
  return run(f, async () => {
    const res = await portalFetch<{ invite_link: string | null }>(
      "/portal-api/admin/collaborators",
      { body: { email: str(f, "email"), name: str(f, "name") || null } }
    )
    return res.invite_link
      ? withParam(str(f, "returnTo"), "invite_link", res.invite_link)
      : withParam(str(f, "returnTo"), "added", "1")
  })
}

export async function revokeCollaborator(f: FormData) {
  const id = str(f, "id")
  return run(f, async () => {
    await portalFetch(`/portal-api/admin/collaborators/${id}`, { method: "DELETE" })
  })
}

export async function createPayouts(f: FormData) {
  return run(f, async () => {
    await portalFetch("/portal-api/admin/payouts", {
      body: str(f, "period") ? { period: str(f, "period") } : {},
    })
  })
}

export async function markPayoutPaid(f: FormData) {
  const id = str(f, "id")
  return run(f, async () => {
    await portalFetch(`/portal-api/admin/payouts/${id}/paid`, {
      body: { note: str(f, "note") || undefined },
    })
  })
}

// ---- Products and categories (portal admin) --------------------------------

/** Blank -> null, otherwise the number (commas and spaces tolerated). */
const optNum = (f: FormData, k: string) => {
  const v = str(f, k)
  return v === "" ? null : Number(v.replace(/[, ]/g, ""))
}

/** Uploads the chosen image (if any) and returns its relative /media URL. */
async function uploadProductImage(f: FormData): Promise<string | undefined> {
  const file = f.get("image")
  if (!(file instanceof File) || file.size === 0) {
    return undefined
  }
  const { file: uploaded } = await portalFetch<{ file: { url: string } }>(
    "/portal-api/admin/uploads",
    {
      body: {
        filename: file.name,
        mime_type: file.type,
        content_base64: Buffer.from(await file.arrayBuffer()).toString("base64"),
      },
    }
  )
  return uploaded.url
}

export async function createProduct(f: FormData) {
  const base = str(f, "base")
  return run(
    f,
    async () => {
      const thumbnail = await uploadProductImage(f)
      await portalFetch("/portal-api/admin/products", {
        body: {
          title: str(f, "title"),
          description: str(f, "description") || null,
          handle: str(f, "handle") || null,
          status: f.get("published") ? "published" : "draft",
          category_ids: f.getAll("category_ids").map(String),
          thumbnail: thumbnail ?? null,
          variant: {
            title: str(f, "variant_title") || "Tiêu chuẩn",
            sku: str(f, "sku") || null,
            price: num(f, "price"),
            original_price: optNum(f, "original_price"),
            original_cost: optNum(f, "original_cost"),
            quantity: optNum(f, "quantity"),
          },
        },
      })
    },
    `${base}/admin/products?ok=created`
  )
}

export async function updateProduct(f: FormData) {
  const id = str(f, "product_id")
  const base = str(f, "base")
  return run(
    f,
    async () => {
      const thumbnail = await uploadProductImage(f)
      const variants = str(f, "variant_ids")
        .split(",")
        .filter(Boolean)
        .map((vid) => ({
          id: vid,
          title: str(f, `variant_title_${vid}`) || undefined,
          sku: str(f, `sku_${vid}`) || null,
          price: num(f, `price_${vid}`),
          original_price: optNum(f, `original_price_${vid}`),
          original_cost: optNum(f, `original_cost_${vid}`),
          // Blank means "leave stock as it is".
          quantity: optNum(f, `quantity_${vid}`) ?? undefined,
        }))
      await portalFetch(`/portal-api/admin/products/${id}`, {
        method: "PUT",
        body: {
          title: str(f, "title"),
          description: str(f, "description") || null,
          handle: str(f, "handle") || undefined,
          status: f.get("published") ? "published" : "draft",
          category_ids: f.getAll("category_ids").map(String),
          ...(thumbnail ? { thumbnail } : {}),
          variants,
        },
      })
    },
    `${base}/admin/products/${id}?ok=saved`
  )
}

export async function deleteProduct(f: FormData) {
  const id = str(f, "id")
  const base = str(f, "base")
  return run(
    f,
    async () => {
      await portalFetch(`/portal-api/admin/products/${id}`, { method: "DELETE" })
    },
    `${base}/admin/products?ok=deleted`
  )
}

export async function saveCategory(f: FormData) {
  const id = str(f, "id")
  const base = str(f, "base")
  return run(
    f,
    async () => {
      const body = {
        name: str(f, "name"),
        description: str(f, "description") || null,
        is_active: !!f.get("is_active"),
      }
      if (id) {
        await portalFetch(`/portal-api/admin/categories/${id}`, { method: "PUT", body })
      } else {
        await portalFetch("/portal-api/admin/categories", { body })
      }
    },
    `${base}/admin/categories?ok=${id ? "saved" : "created"}`
  )
}

export async function deleteCategory(f: FormData) {
  const id = str(f, "id")
  const base = str(f, "base")
  return run(
    f,
    async () => {
      await portalFetch(`/portal-api/admin/categories/${id}`, { method: "DELETE" })
    },
    `${base}/admin/categories?ok=deleted`
  )
}

// ---- Storefront editor (portal admin) ---------------------------------------

/**
 * Storefront editor actions, chosen by the pressed button (`intent`):
 *  draft    save as an unpublished draft (visitors are unaffected)
 *  (preview is not an action: the button posts to /api/portal/storefront-preview in a new tab)
 *  publish  make this the live storefront
 *  discard  throw the draft away
 * Images chosen in the editor arrive as files named `file:<path>`; they are uploaded first
 * and their URLs written into the config. The backend sanitizes everything again.
 */
export async function saveAppearance(f: FormData) {
  const returnTo = str(f, "returnTo")
  const base = returnTo.replace(/\/admin\/appearance.*$/, "")
  const intent = str(f, "intent") || "draft"

  return run(f, async () => {
    if (intent === "discard") {
      await portalFetch("/portal-api/admin/storefront/draft", { method: "DELETE" })
      return `${returnTo}?ok=discarded`
    }

    const cfg = await buildStorefrontConfig(f)

    if (intent === "publish") {
      await portalFetch("/portal-api/admin/storefront/publish", { body: cfg })
      return `${returnTo}?ok=published`
    }

    await portalFetch("/portal-api/admin/storefront/draft", { method: "PUT", body: cfg })
    return `${returnTo}?ok=draft`
  })
}

// ---- Customer payment link -------------------------------------------------

/** Puts the approved request's cart in the shopper's cookie and opens normal checkout. */
export async function continueToPayment(f: FormData) {
  const cartId = str(f, "cart_id")
  if (!cartId) {
    redirect(str(f, "returnTo"))
  }
  await setCartId(cartId)
  redirect(`/${str(f, "locale")}/${str(f, "countryCode")}/checkout`)
}
