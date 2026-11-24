import "server-only"

import { PortalError, portalFetch } from "./api"

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim()

export async function uploadImageFile(file: File): Promise<string> {
  const { file: uploaded } = await portalFetch<{ file: { url: string } }>("/portal/admin/uploads", {
    body: {
      filename: file.name,
      mime_type: file.type,
      content_base64: Buffer.from(await file.arrayBuffer()).toString("base64"),
    },
  })
  return uploaded.url
}

/** branding.logo | branding.favicon | home.<sectionId>.<settingKey> */
function setAtPath(cfg: any, path: string, value: string) {
  const [root, a, b] = path.split(".")
  if (root === "branding" && a) {
    cfg.branding = { ...(cfg.branding ?? {}), [a]: value }
  } else if (root === "home" && a && b && Array.isArray(cfg.home)) {
    const section = cfg.home.find((s: any) => s.id === a)
    if (section) {
      section.settings = { ...(section.settings ?? {}), [b]: value }
    }
  }
}

/**
 * The storefront editor's state from its form: the JSON `config` plus any images chosen in
 * the editor (files named `file:<path>`), uploaded and written into the config. Shared by the
 * save actions and the new-tab preview route. The backend sanitizes everything again.
 */
export async function buildStorefrontConfig(f: FormData): Promise<any> {
  let cfg: any
  try {
    cfg = JSON.parse(str(f, "config"))
  } catch {
    throw new PortalError("Invalid storefront data", 400)
  }
  for (const [key, value] of Array.from(f.entries())) {
    if (key.startsWith("file:") && value instanceof File && value.size > 0) {
      setAtPath(cfg, key.slice(5), await uploadImageFile(value))
    }
  }
  return cfg
}
