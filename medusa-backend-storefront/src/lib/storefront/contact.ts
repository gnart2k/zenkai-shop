export type ContactKind = "link" | "phone" | "email" | "address" | "zalo" | "zalo"
export type ContactRow = { label: string; href: string; kind?: ContactKind }

/** Rows saved before kinds existed are recognised by their link. */
export function contactKind(c: ContactRow): ContactKind {
  if (c.kind && c.kind !== "link") return c.kind
  if (/^tel:/i.test(c.href)) return "phone"
  if (/^mailto:/i.test(c.href)) return "email"
  return c.kind ?? "link"
}

/**
 * Where a contact row points. An explicit link wins; a phone number or email address gets
 * its tel:/mailto: link automatically; an address or plain text has no link (null).
 */
export function contactHref(c: ContactRow): string | null {
  if (c.href) return c.href
  const kind = contactKind(c)
  if (kind === "phone") {
    const digits = c.label.replace(/[^\d+]/g, "")
    return digits ? `tel:${digits}` : null
  }
  if (kind === "zalo") return zaloHref(c.label)
  if (kind === "email" && /^[^\s@]+@[^\s@]+$/.test(c.label.trim())) return `mailto:${c.label.trim()}`
  return null
}

/** A Zalo chat link from a phone number or an existing zalo.me link. */
export function zaloHref(value: string): string | null {
  const v = value.trim()
  if (/^https:\/\/(zalo\.me|chat\.zalo\.me)\//i.test(v)) return v
  const digits = v.replace(/[^\d]/g, "")
  if (digits.length < 8) return null
  // zalo.me wants the national format (0866...), not +84
  const national = digits.startsWith("84") && v.trim().startsWith("+") ? `0${digits.slice(2)}` : digits
  return `https://zalo.me/${national}`
}

/** tel: link from a display phone number. */
export function telHref(value: string): string | null {
  const digits = value.replace(/[^\d+]/g, "")
  return digits ? `tel:${digits}` : null
}
