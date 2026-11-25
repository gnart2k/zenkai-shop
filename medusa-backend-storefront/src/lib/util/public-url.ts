/**
 * The URL the visitor actually used. Behind Caddy and the Cloudflare tunnel, `request.url` in a
 * route handler is the internal http://localhost:4100, so redirects built from it would send the
 * browser to localhost. Hosts that are a plain IP or localhost are plain HTTP; real domains are
 * served over HTTPS by Cloudflare.
 */
export function publicOrigin(headers: Headers, fallback: string): string {
  const host = headers.get("x-forwarded-host") || headers.get("host")
  if (!host) return new URL(fallback).origin
  const bare = host.split(",")[0].trim()
  const plain = /^(localhost|127\.|\d{1,3}(\.\d{1,3}){3})(:\d+)?$/i.test(bare) || /\.localhost(:\d+)?$/i.test(bare)
  return `${plain ? "http" : "https"}://${bare}`
}

export function publicUrl(request: Request, path: string): URL {
  return new URL(path, publicOrigin(request.headers, request.url))
}
