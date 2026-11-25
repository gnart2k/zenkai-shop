# Server deployment (100.97.169.107, IP only)

Shared Ubuntu box (`zenkai-prod`, also runs the separate `zenkai-app`). Everything for this project lives in `/opt/zenkai-shop`; nothing system-wide was installed.

| Piece | How it runs |
|---|---|
| Postgres 16 | docker compose (`deploy/docker-compose.yml`), `127.0.0.1:5433`, volume `pgdata` |
| Caddy 2 | docker compose, host network, plain HTTP on :80 (`deploy/Caddyfile`) |
| Medusa backend | pm2 `zenkai-shop-api` (`pnpm exec medusa start`, :4300) |
| Storefront (Next) | pm2 `zenkai-shop-web` (`next start -p 4100`) |
| Files | Medusa local file provider (`medusa-backend/static`, served at `/static`, streamed at `/media`) |

Caddy sends `/app /admin /store /auth /portal-api /hooks /media /static` to the backend and everything else (storefront, `/portal`, `/preview`) to Next.

Env (not in git): `medusa-backend/.env`, `medusa-backend-storefront/.env.local`, `deploy/secrets.env`. IP-only HTTP needs `COOKIE_SECURE=false` on both apps. `PORTAL_HOST` is unset and `DEFAULT_STOREFRONT_HOSTS` includes the IP, so the IP serves both the storefront and the portal; once real domains exist set `PORTAL_HOST=<admin host>`, `STORE_BASE_DOMAIN=<wildcard base>`, `STORE_CNAME_TARGET` and turn TLS on in Caddy.

Update: `git archive HEAD | ssh ubuntu@100.97.169.107 'tar -x -C /opt/zenkai-shop'`, then on the server `pnpm install --frozen-lockfile`, `pnpm build` in `medusa-backend` (+ `npx medusa db:migrate`), `pnpm exec next build` in the storefront, `pm2 restart zenkai-shop-api zenkai-shop-web`. `medusa-backend/public` must be a symlink to `.medusa/server/public`.

## Domain: shop.zenkai.com.vn

zenkai.com.vn is on Cloudflare and the box is reached through the existing `services-tunnel` (cloudflared, shared with `zenkai-app`). `/etc/cloudflared/config.yml` got one ingress rule, `shop.zenkai.com.vn -> http://127.0.0.1:80` (Caddy); the previous file is kept as `config.yml.bak-<timestamp>`. DNS: `cloudflared tunnel route dns services-tunnel shop.zenkai.com.vn` created the proxied CNAME. Cloudflare terminates HTTPS; the origin stays plain HTTP, so `COOKIE_SECURE=false` is still set.

One domain serves everything for now: storefront `/`, portal `/portal`, Medusa admin `/app`. Env: `STORE_CORS/ADMIN_CORS/AUTH_CORS` include `https://shop.zenkai.com.vn`, `BACKEND_PUBLIC_URL=https://shop.zenkai.com.vn`, `PORTAL_URL=https://shop.zenkai.com.vn/portal`, and the storefront's `DEFAULT_STOREFRONT_HOSTS` includes the domain (rebuild the storefront after changing it, middleware env is baked in at build).

## Portal domain: collab.zenkai.com.vn

The partner portal (portal admins and collaborators) lives on its own host, `collab.zenkai.com.vn`, separate from the storefront. Cloudflare tunnel ingress + a CNAME (`cloudflared tunnel route dns`) point it at Caddy; a dedicated Caddy site block sends it only to the Next app (plus `/media`, `/static`), so the Medusa admin and API are not exposed on that host. Next: `PORTAL_HOST=collab.zenkai.com.vn` (storefront hosts return 404 for `/portal`; the portal host redirects everything except `/portal`, `/preview`, `/api`, `/_next` to `/portal/login`), `PORTAL_STOREFRONT_URL=https://shop.zenkai.com.vn` (the editor's "open store" link). Backend: `PORTAL_URL=https://collab.zenkai.com.vn/portal` (invite links). Rebuild the storefront after changing `PORTAL_HOST`.

## Store subdomains: <slug>.zenkai.com.vn

Backend env `STORE_BASE_DOMAIN=zenkai.com.vn`, `STORE_CNAME_TARGET=cname.zenkai.com.vn`. Cloudflare: wildcard CNAME `*.zenkai.com.vn` and `cname.zenkai.com.vn` to the tunnel; tunnel ingress `*.zenkai.com.vn -> Caddy :80` (after the specific hosts). Cloudflare Universal SSL covers one wildcard level, which is why stores sit directly under zenkai.com.vn. Caddy: `shop.zenkai.com.vn` and the IP get the full app (storefront, `/app`, API); every other host gets only the storefront plus `/media` and `/static`, so store subdomains never expose the Medusa admin or API, and `/portal` 404s there. Unknown subdomains 404 in the storefront middleware. Reserved slugs (shop, collab, app, www, s3, ...) are in `medusa-backend/src/lib/portal/domains.ts`.

Customer-owned domains that CNAME to `cname.zenkai.com.vn` need Cloudflare for SaaS (custom hostnames) to be served through this tunnel; a plain tunnel only serves hostnames of this zone.

## Email

Portal emails (invites, request approvals, ...) use `RESEND_API_KEY` or `SMTP_URL`, with `EMAIL_FROM` (`medusa-backend/.env`). With neither set nothing is sent and a warning is logged. Templates: `medusa-backend/src/lib/portal/email-templates.ts`.
