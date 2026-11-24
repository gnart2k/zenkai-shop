# Collaborator Portal: implementation mapping

Maps the agreed flow (`flow-refined.excalidraw`) onto Medusa 2.13 in `medusa-backend`.
Status column: **done** = implemented and type-checked, **todo** = not built yet.

## 1. Roles and auth

| Role | Scope | Auth actor | Sign-in | Created by |
|---|---|---|---|---|
| Medusa admin (platform) | All stores | `user` (built-in) | `/auth/user/emailpass` | existing |
| Portal admin | **Exactly one store** | `portal_admin` | `/auth/portal_admin/emailpass` | Medusa admin |
| Collaborator | **Many stores** (membership per store) | `collaborator` | `/auth/collaborator/emailpass` | Portal admin (invite by email) |
| Customer | Pays via link | none (public signed link) | n/a | n/a |

- `authMethodsPerActor` in `medusa-config.ts` registers the two new actors (existing `user` / `customer` kept as emailpass).
- Portal admin's `store_id` always comes from their own record (`requirePortalAdmin` in `src/lib/portal/http.ts`), never from URL or body, so they cannot reach another store.
- Collaborator access to `/portal-api/collaborator/stores/:store_id/*` requires an **active** `store_collaborator` row (`requireStoreMembership`).
- Invite = HMAC token (`modules/portal/lib/token.ts`, 7 days). Accepting registers the emailpass identity and sets `app_metadata.{actor}_id`.
- **Session lifetime:** auth tokens last 7 days (`jwtExpiresIn`, override with `JWT_EXPIRES_IN`); the portal cookie matches. While a portal user is active, the storefront middleware refreshes the token (`POST /auth/token/refresh`) once less than 3 days remain, so only 7 days of inactivity signs you out. An expired or rejected session clears the cookies and shows the login page with a notice (`/api/portal/session-expired`); the signed-in layout is never drawn around a login form.
- One email = one login (auth identity), which can carry several actor types. If the email already has a login (storefront customer, Medusa admin), accepting an invite **links** the new actor to it. The person must enter that login's existing password, which stays unchanged. A new email gets a fresh login with the password they choose.

## 2. Data model (module `portal`, `src/modules/portal`)

| Model | Purpose | Key fields |
|---|---|---|
| `portal_setting` | Per-store config (Medusa admin) | `store_id` (unique), `deposit_percent` (default 20), `default_contact_email` |
| `portal_admin` | Single-store admin | `email` (unique), `store_id` |
| `collaborator` | External partner | `email` (unique), `name`, `phone`, `activated_at` |
| `store_collaborator` | Membership | `store_id`, `collaborator_id`, `status` invited/active/revoked; unique pair |
| `variant_cost` | **Original price + original cost** (kept outside the product module) | `variant_id` (unique), `original_price` (collaborator-facing, null = store price), `original_cost` (private, never returned to collaborators) |
| `collab_request` | The request | store, collaborator, variant, qty, **snapshots** of original/commercial price + deposit %, deposit amount, customer contact, `proof_url`, `status` pending/approved/rejected/paid/cancelled, `cart_id`, `order_id` |
| `earning_ledger_entry` | Append-only ledger | `type` earning/reversal, signed `amount`, `request_id`, `payout_id` (null = still owed) |
| `payout` | Monthly settlement | `collaborator_id`, `period` (YYYY-MM), `amount`, `status` pending/paid |

Hidden cost: `variant_cost` lives in the portal module, **not** in product metadata, so no product/store API can return it. Collaborator responses are built from explicit whitelists (`src/lib/portal/serializers.ts`) and the catalog helper never selects cost.

Migration: `src/modules/portal/migrations/Migration20261124090000.ts` (hand-written, see section 7).

## 3. Flow step → implementation

| Flow step | Lane | Implementation | Status |
|---|---|---|---|
| Medusa admin creates store + portal, sets deposit % and default contact | Platform | `GET/POST /admin/portal/settings`, `POST /admin/portal/admins` (returns invite link) | done (API + Medusa admin "Portals" page) |
| Portal admin invites collaborator by email | Admin | `POST /portal-api/admin/collaborators` → `inviteCollaborator`. Existing activated email is added directly to the store | done |
| Collaborator accepts invite, logs in with email | Collaborator | `POST /portal-api/invites/accept` then `/auth/collaborator/emailpass` | done |
| Pick store (can join several) | Collaborator | `GET /portal-api/collaborator/stores` | done |
| Manage products: three prices, qty, info, image, categories | Admin | Full product and category CRUD in the portal, scoped to the admin's own store (`/portal-api/admin/products`, `/categories`, `/uploads`). Prices via `PUT /portal-api/admin/variants/:id/pricing` or the product form | done |
| Browse products (SKU, suggested price, original price; no cost) | Collaborator | `GET /portal-api/collaborator/stores/:store_id/products` returns `suggested_price` and `original_price`; cost is never selected | done (stock not shown) |
| Create request + proof of deposit | Collaborator | `POST .../requests` → `createCollabRequestWorkflow`: membership check, store/sales-channel check, price snapshot, rule `commercial >= original`, deposit = commercial × qty × deposit % | done |
| Validate, save as pending, email admin | Portal | same workflow (`portal-new-request` email; falls back to `default_contact_email`) | done |
| Review manually (deposit proof, pricing vs cost) | Admin | `GET /portal-api/admin/requests/:id` returns request + original cost + collaborator earning + store margin | done |
| Reject (reason, email) → collaborator edits and resubmits | Admin/Portal | `POST .../reject`. Resubmit = a new request | done |
| Approve → draft order + payment link, email both | Admin/Portal | `POST .../approve` → `approveCollabRequestWorkflow`: creates a **cart** with `unit_price` = commercial price (`createCartWorkflow`), marks approved, emails collaborator + customer a signed `/pay/:token` link | done |
| Customer opens payment page (collaborator info, else default contact) | Customer | `GET /portal-api/pay/:token` + storefront `/pay/[token]` page | done |
| Pay | Customer | Existing storefront checkout + PayOS provider on that cart | existing |
| Order paid → stock − , sale credited, email | Portal | `order.placed` subscriber → `recordOrderPaidWorkflow`: request `paid`, ledger earning = (commercial − original) × qty. Idempotent | done (email to collaborator todo) |
| Fulfil via GHN | Portal | Existing `ghn-fulfillment` provider | existing |
| Refund / cancel after payment | Admin | `order.canceled` subscriber and `POST .../reverse` → `reverseEarningWorkflow` appends a **negative** entry. Original never edited | done (refund event auto-hook todo) |
| Month-end: pay all collaborators, net of reversals | Admin | `POST /portal-api/admin/payouts` → `createPayoutsWorkflow`; `POST .../payouts/:id/paid` marks transferred | done |
| Collaborator sees what is owed / paid | Collaborator | `GET .../earnings` | done |

## 4. API surface

Public: `POST /portal-api/invites/accept`, `GET /portal-api/pay/:token`.
Collaborator (`authenticate("collaborator")`): `/portal-api/collaborator/stores`, `/stores/:store_id/{products,requests,requests/:id,earnings}`.
Portal admin (`authenticate("portal_admin")`): `/portal-api/admin/{me,collaborators,collaborators/:id,requests,requests/:id,requests/:id/{approve,reject,reverse},products,products/:id,categories,categories/:id,uploads,storefront,variants/:variant_id/pricing,earnings,payouts,payouts/:id/paid}`.
Medusa admin: `/admin/portal/{settings,admins}`.
Public storefront: `GET /store/storefront-config` (the store's template choice).

`/portal/*` sits outside Medusa's CORS scopes, so `portalCors` allows origins from `PORTAL_CORS` (falls back to `STORE_CORS`).

## 5. Rules and assumptions (please confirm)

1. **Three prices per variant:** *suggested price* = the store price (editing it in the portal updates the shop and purges the storefront cache); *original price* = what collaborators pay, defaults to the suggested price; *original cost* = private. The portal enforces cost ≤ original price ≤ suggested price. A collaborator's profit = (selling price − original price) × qty; deposit = selling price × qty × deposit %. No commission rate.
2. **Requests never expire.**
3. **Earnings are logged at payment, paid monthly in one batch.** A negative net is carried to the next month (no payout created). A refund after payout stays unsettled and nets off the next payout.
4. **Selling price must be ≥ the original price** (confirmed). The suggested price is only a guide for collaborators.
5. **Pricing:** the storefront shows the suggested (list) price. A cart created from an approved request overrides it with the collaborator's commercial price. The cart charges the full commercial total; the deposit is recorded and checked manually, not deducted.
6. **Stock:** standard Medusa behaviour. Inventory is reserved when the cart completes into an order. Approval does no stock check.
7. The suggested price is the variant's store-wide price in the store's default currency (no price rules). Request prices are snapshots, so later price edits never change existing requests.
9. **Categories are shared by every store in Medusa.** A portal admin can assign any category to their products but can only edit or delete the ones their store created (`metadata.portal_store_id`). Products can only be deleted when they have no pending or approved collaborator requests.
10. **Stock** is optional per variant: leave the quantity empty to keep today's behaviour (not tracked); a number creates inventory at the store's stock location.
8. Reversal on refund is full-amount only (no partial refunds).

## 6. Frontend (storefront app, `medusa-backend-storefront`)

Server-rendered Next.js pages under `src/app/[locale]/[countryCode]/(portal)/`. The browser never talks to the portal API: pages and server actions call the backend server-side with the JWT held in an httpOnly cookie (`_portal_jwt`, `_portal_actor`), so no CORS is needed. Fully translated (vi / en) through next-intl (`messages/parts/portal.*.json`); the language follows the URL.

| URL (after `/{locale}/{country}`) | Who | Does |
|---|---|---|
| `/portal/login?role=collaborator\|portal_admin` | all | Sign in |
| `/portal/accept-invite?token=` | invitees | Set password, or enter existing password to link an existing login |
| `/portal-api/collaborator` , `/[storeId]` | collaborator | Store picker, read-only product list |
| `/portal-api/collaborator/[storeId]/requests` , `/new` | collaborator | Requests with status, new request form with proof upload |
| `/portal-api/collaborator/[storeId]/earnings` | collaborator | Owed amount, ledger, payouts |
| `/portal-api/admin` | portal admin | Dashboard |
| `/portal-api/admin/requests` , `/[id]` | portal admin | Review with cost and margin; approve, reject, reverse earning |
| `/portal-api/admin/products` , `/new` , `/[id]` | portal admin | Product list with image, status, the three prices and stock; create and edit form (image upload, categories, live price check and profit preview); delete with confirmation |
| `/portal-api/admin/appearance` | portal admin | Storefront template gallery with live miniature previews, accent color, home section toggle and order |
| `/portal-api/admin/categories` | portal admin | Create, edit and delete your own categories (dialogs); shared ones are locked |
| `/portal-api/admin/collaborators` | portal admin | Invite by email (shows invite link), revoke |
| `/portal-api/admin/payouts` | portal admin | Owed per collaborator, month-end payout, mark paid |
| `/pay/[token]` | customer | Order summary, contact, "Continue to payment" which loads the cart into the normal checkout (own layout, store name only) |

Decisions made while building:
- **Proof upload** is a JSON base64 endpoint (`POST /portal-api/collaborator/uploads`, 5 MB, png/jpg/webp/pdf) through the file module. Files are private; the store admin opens them through an authenticated proxy (`GET /portal-api/admin/requests/:id/proof`).
- **UI kit:** shadcn/ui (new-york style, already configured in the storefront) with a sidebar for the store admin, tabs for collaborators, a language switch (vi/en), delete confirmations and submit spinners.
- **Dev ports:** storefront `4100`, backend `4300`. Payment and invite links default to `http://localhost:4100`.


## 6b. Storefront themes and editor

A **theme** (Shopify-style) decides the *structure* of the shop, not just colors. The store owner picks one in **Portal admin → Storefront editor** and then edits content. Everything is saved on the store (`Store.metadata.storefront`) and applied by the storefront server-side.

| Layer | What the owner controls | Where |
|---|---|---|
| Theme | Header (`overlay` / `bar` / `centered`), footer (`columns` / `minimal`), listing layout (`sidebar` / `topbar`), product page (`split` / `stacked`), grid (3/4), card style, colors, fonts, default home sections | `medusa-backend-storefront/src/lib/storefront/templates.ts` |
| Branding | Logo (+ height, show name), store name and tagline in vi/en, favicon, accent color | editor tab *Branding* |
| Home sections | Add / remove / reorder / toggle. Types: hero (carousel, split, text), categories (cards, pills), featured, collections, reel, values, shop, image-with-text, rich-text, testimonials. Each has editable settings (vi/en text, image, link, select, number) defined by `SECTION_DEFS` | `src/modules/home/sections`, editor tab *Home page* |
| Header and footer | Announcement bar (text, link), footer text, contact links, show categories/collections | editor tab *Header & footer* |
| Texts | ~28 curated storefront strings (headings, buttons, the three promise cards, SEO title/description) overridden per language | `src/lib/storefront/texts.ts`, editor tab *Texts* |

How it reaches the page: `GET /store/storefront-config` → `getStorefront()` resolves theme + choices. Design tokens go on `:root` for storefront pages only (`ThemeStyle`, so the portal keeps its own look). Text overrides are merged into the next-intl messages in `src/i18n/request.ts`, so every component using a key picks them up with no per-component code.

Safety: the config is rendered on a public site, so `sanitizeStorefrontConfig` (backend, unit-tested) whitelists theme ids and section types, limits keys and lengths, only allows `/media/<id>` or https images and `/path`, `https:`, `tel:`, `mailto:` links, and strips `{ } < >` from text overrides (they land in ICU messages). The storefront ignores override keys that are not in its catalog. Sections like testimonials and image-with-text stay hidden until the owner enters content, so a theme never ships made-up reviews.

Uploads: images go through `POST /portal-api/admin/uploads` (png/jpg/webp, ico for favicons, 5 MB). The file module takes **base64** content in Medusa 2.13; sending `binary` corrupts the file (this was a bug in the first upload routes and is fixed). Files are served at `/media/<id>`.

Themes shipped: **Classic** (the previous look), **Editorial** (id `warm`), **Modern**, **Nature**, **Boutique**. All are light, because cart/account/checkout use Medusa UI colors.

To add a theme: add an entry to `THEMES` (tokens, fonts, layout, default home/header/footer) and its id to `TEMPLATE_IDS` in `medusa-backend/src/lib/portal/storefront-config.ts`. To add a section type: add a component, an entry in `SECTION_DEFS`, a case in `modules/home/sections/index.tsx`, and the type in `SECTION_TYPES` (backend). To make another string editable, add it to `EDITABLE_TEXTS` (plain text, no `{placeholders}`).


### Draft and preview

The editor never changes the live shop until you press **Publish**.

| Button | Does |
|---|---|
| Save draft | Stores the editor state in `Store.metadata.storefront_draft` (`PUT /portal-api/admin/storefront/draft`). Visitors still see the published `storefront` config. |
| Preview | Saves the draft, then opens the real storefront in preview mode (same tab). A floating banner offers **Back to editor** and **Exit preview**. |
| Publish | Makes the editor state live (`POST /portal-api/admin/storefront/publish`), clears the draft and purges the storefront cache. |
| Discard draft | `DELETE /portal-api/admin/storefront/draft`; the editor goes back to the live version. |

The editor also shows the saved draft on the **real** home, listing and product pages in an iframe (desktop/mobile width), next to the instant wireframe sketch of unsaved edits.

How preview mode is secured: `POST /portal-api/admin/storefront/preview` returns an HMAC-signed token (`kind: sf-preview`, scoped to one store, valid 1 hour). Opening `/{locale}/{country}?_preview=<token>` makes the storefront middleware store it in an httpOnly cookie (`_sf_preview`) and redirect to the same URL without it. `GET /store/storefront-config?preview=<token>` verifies the token on every request and returns that store's draft with `preview: true`; an invalid, tampered or expired token silently falls back to the published config, so visitors can never see a draft. `/api/preview-exit?to=/path` clears the cookie (same-site targets only). **Open storefront** in the editor goes through that exit route so it always shows the published shop.


### Call and Zalo buttons (Vietnam)

Floating **Call** and **Zalo** buttons (`modules/storefront/contact-widget.tsx`, rendered in the `(main)` layout). The owner edits them in the editor under *Header & footer → Call & Zalo buttons*: on/off, phone, Zalo number or `zalo.me` link, left/right side, and **Vietnam only** (default on: shown only on the `/vn` region). An empty field hides that button. Stored as `contact_widget` in the storefront config (so it goes through draft, preview and publish like everything else) and sanitized by the backend (`cleanPhone`, `cleanZalo`: only digits or `https://zalo.me|chat.zalo.me/...`). With no saved value the default is on, using the store's existing number. The footer contact list also has a **Zalo** row type.

### Fixed portal route and tenants (multi-store)

- **One fixed portal address on the Medusa admin host: `/portal/...`** (login, `/portal-api/admin/...`, `/portal-api/collaborator/<storeId>/...`, invite links). It does not depend on any storefront, region or language, because collaborators work for several stores and there will be several storefronts. The UI language is the `portal_locale` cookie (switcher in the header). The middleware serves `/portal/...` from the internal `[locale]/[countryCode]/(portal)` pages and redirects the old `/{locale}/{country}/portal/...` URLs (308). The storefront the editor previews comes from `PORTAL_STOREFRONT_REGION` (default `vn`).
- **Same host as the Medusa admin.** Store domains are dynamic (one per store), so the portal does not live on them. The backend's portal API moved from `/portal/*` to **`/portal-api/*`** so the UI can use `/portal` on the admin host. A reverse proxy for `admin.example.com` sends `/app`, `/admin`, `/store`, `/auth`, `/portal-api` to Medusa, and `/portal`, `/api/portal`, `/preview`, `/_next` to the Next app. Set `PORTAL_HOST=admin.example.com` on the Next app (store domains then answer 404 for `/portal`, and the portal host redirects everything else to `/portal/login`) and `PORTAL_URL=https://admin.example.com/portal` on the backend (invite links). Unset in development: every host serves both.
- **Medusa admin, sidebar "Portals"** (`src/admin/routes/portals`): every store is a tenant with its own default sales channel, publishable storefront key, portal settings (deposit %) and one portal admin. From there the platform admin can create a store (store + sales channel + publishable key + settings + optional portal admin invite), invite or resend the portal admin, and edit the deposit % and default contact email. API: `GET/POST /admin/portal/stores`, plus `/admin/portal/admins` and `/admin/portal/settings`. A new store's portal admin sees only that store's products and settings (checked: a second tenant sees 0 products while the first sees 12). Collaborators are shared across tenants through store memberships.

- **Multi-store (tenants) end to end: one subdomain per store, plus verified CNAME domains.**
  - *Store address:* every store gets a slug and answers at `<slug>.<STORE_BASE_DOMAIN>` (wildcard DNS + wildcard TLS to the storefront; `*.localhost` in development). The slug is derived from the name and editable (unique, reserved words like `admin`/`portal` refused).
  - *Custom domains:* the owner points `shop.theirdomain.com` with a **CNAME** to `STORE_CNAME_TARGET` (default `cname.<base domain>`), adds it in Medusa admin → Portals → Settings and presses *Check DNS*. Only a domain whose CNAME resolves to the target is marked verified and served; pending domains serve nothing. A domain can belong to one store only and cannot sit under our own base domain. (In development, with no base domain configured, DNS is not checked.) HTTPS for custom domains is the proxy's job (on-demand TLS after verification, e.g. Caddy or Cloudflare for SaaS).
  - *Request → store:* the Next app resolves the request host through `GET /portal-api/tenant?host=` (cached 30 s) to the store's publishable key and sends it on every Medusa call (`lib/config.ts`), so products, prices, carts and orders are scoped by the store's sales channel. Each store host has its own cookies (cart, login). Hosts that are neither a store address, a verified domain, nor in `DEFAULT_STOREFRONT_HOSTS` (default `localhost,127.0.0.1`) get a 404 in the middleware; the portal host never serves a storefront and store hosts never serve `/portal`. The editor's `/preview` pages use the key of the store being previewed.
  - *Public `/store` routes* (`branding`, `hero`, `tiktok-reel`, `storefront-config`) resolve the store from the publishable key; with several stores an unknown key never falls back to "the first store". Categories are shared in Medusa, so the storefront lists only the ones holding products of its own sales channel (`GET /store/visible-categories`). A new store starts with no footer contacts or floating buttons.
  - *Platform admin (Medusa admin → Portals):* create (store + sales channel + key + stock-location links + slug + settings + portal admin invite), edit (name, address, deposit, contact email), custom domains (add / check DNS / remove), delete (refused for the only store and while it has requests or payouts), invite/remove the portal admin. API: `/admin/portal/stores[/:id[/domains]]`, `/admin/portal/admins[/:id]`.
  - *Env:* `STORE_BASE_DOMAIN`, `STORE_CNAME_TARGET` (backend); `PORTAL_HOST`, `DEFAULT_STOREFRONT_HOSTS`, `PORTAL_STOREFRONT_REGION` (storefront).
  - *Limits:* regions, tax, shipping setup, payment providers, customers and Medusa admin users are still global in Medusa; only catalog (via sales channel), portal data and storefront config are per store. Hard-coded copy in the storefront messages (e.g. the shipping/returns text) is shared until a store overrides it in the Texts tab.

## 7. Not built yet

- Medusa admin UI for settings and portal admins (APIs exist: `/admin/portal/settings`, `/admin/portal/admins`).
- Email provider (emails are logged and skipped; invite links are shown in the UI and API).
- Automatic reversal on `payment.refunded`; "order paid" email to the collaborator; stock column in the catalog.
- Draft history / scheduled publishing, per-section color schemes, custom web fonts, a menu editor, a newsletter section (needs a subscriber store).
- Multi-image galleries and multi-variant creation in the product form (existing multi-variant products can be edited; new products start with one variant).
- Integration tests (need a database); no browser end-to-end test has been run.

## 8. Run it

```bash
cd medusa-backend
pnpm medusa db:migrate          # creates the 8 portal tables
pnpm test:unit                  # money + token tests
```

Env (optional): `STOREFRONT_URL` (payment links, default `http://localhost:4100`), `PORTAL_URL` (invite links, default `http://localhost:4100/portal`; include the locale and country in production, e.g. `https://shop.example/vi/vn/portal`), `PORTAL_CORS` (only for direct browser calls to `/portal`).

The migration was written by hand to avoid touching the shared database from this session. After migrating, run `pnpm medusa db:generate portal`; it should report no changes. If it produces a diff, the hand-written migration drifted from the models and should be reconciled.

Bootstrap: Medusa admin calls `POST /admin/portal/settings` and `POST /admin/portal/admins` for a store, sends the invite link to the portal admin, who accepts it and then invites collaborators.
