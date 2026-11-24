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
