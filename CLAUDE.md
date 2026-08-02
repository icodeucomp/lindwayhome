# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

It is written as a **PRD of the system as it actually exists today** — information architecture, functional requirements, flows, and database schema are all descriptions of shipped behavior, not aspirations. Where the implementation has a gap or a surprise, it is recorded in §9 rather than smoothed over.

---

## 1. Product overview

**Lindway Home** is an Indonesian fashion e-commerce storefront for the Lindway brand (Denpasar, Bali), built as a single Next.js 16 App Router application with its own admin dashboard.

Defining product decisions:

- **Guest-only checkout.** Customers never create accounts. Each completed checkout writes one `Guest` row — `Guest` *is* the order, not a customer profile. Repeat buyers are correlated only by email string.
- **Manual payment confirmation.** There is no payment gateway. The buyer transfers via bank or QRIS, uploads a receipt image, and an admin later verifies and flips the order to purchased.
- **Config-driven pricing.** Tax, promo, member discount, shipping rates, zone multipliers, and per-size parcel dimensions all live in database rows (`ConfigParameter`), editable from the admin Parameters page — not in code.
- **Distance-based shipping.** Cost is computed from a haversine distance between a configured origin and the buyer's village-level destination, combined with volumetric weight and a zone multiplier. There is no third-party courier API.
- **Three product lines**, modeled both as the `Categories` enum and as separate public routes: `MY_LINDWAY`, `LURE_BY_LINDWAY`, `SIMPLY_LINDWAY`.

### 1.1 Users

| Persona | Access | What they do |
| --- | --- | --- |
| Shopper (anonymous) | Public routes, no login, no account | Browse lines, view products, build a cart in `localStorage`, check out as guest, upload payment receipt, optionally activate membership |
| Admin (`ADMIN`) | `/admin/*` + admin APIs | Manage products, verify and fulfil orders, edit store parameters, manage shipping locations |
| Super admin (`SUPER_ADMIN`) | Same as admin | Role hierarchy exists (`SUPER_ADMIN > ADMIN`) but **no handler currently requires `SUPER_ADMIN`** — every `checkAuth` call uses the default `ADMIN` level |

---

## 2. Access model

JWT-based, 1-day expiry, stored in `localStorage` under `auth_token` and attached by an axios request interceptor as `Authorization: Bearer`.

- There is **no `middleware.ts`**. Route protection is **per-handler**: an admin route calls `checkAuth(request, pathAPI)` from `@/lib` as its first statement and returns early if the result is non-null (`null` means authorized).
- The dashboard's visual guard (`useAuthStore` in `layout-dashboard.tsx`) is **client-side only**. Real enforcement lives in the API handlers, so any new admin-only handler must call `checkAuth` itself or it is effectively public.
- `checkAuth` runs `authenticate` and `authorize` in parallel; both re-read the user from the database and reject inactive users.

---

## 3. Information architecture

### 3.1 Public site map

```
/                                   Home — hero, featured products, curated collection video carousel
├─ /my-lindway                      Product line landing + listing
├─ /simply-lindway                  Product line landing + listing
├─ /lure-by-lindway                 Product line landing + listing
├─ /product/[category]/[id]         Product detail — gallery, size picker, add to cart, related products
├─ /cart                            Cart + checkout wizard (summary → payment → complete)
├─ /order/payment/success/[id]      Post-order membership activation prompt (see §5.4)
└─ Content pages
   ├─ /about                        About us
   ├─ /contact-us
   ├─ /size-guide                   Size tables incl. baby/kids modals
   ├─ /return-exchanges
   ├─ /curated-collections
   ├─ /shop                         "How to Shop"
   ├─ /our-fabrics
   └─ /care-instructions
```

### 3.2 Public navigation

The header has **two nav bands**, sourced from two different places:

- **Brand band** — `navFeatureLists` (hardcoded in `header.tsx`): My Lindway, Simply Lindway, Lure by Lindway.
- **Content band** — `navLists` (`src/static/navigation.ts`): About us, Contact us, Size Guide, Return & Exchanges, Curated Collections, How to Shop, Our Fabrics, Care Instructions.

Also in the header: logo → `/`, social/contact links (Google Maps, WhatsApp, Instagram, Facebook), and a cart icon with a badge showing **distinct products** (`getCartItemByProduct`), not total quantity. The header switches between light and dark logo/text variants via an `isDark` prop. On mobile both bands collapse into one dropdown.

The footer repeats both lists plus a `featureLists` block ("Discover the Brand" per line) and the same social links. Note the footer's brand block renders `item.href` for every menu entry, so all entries under a line point to that line's page.

### 3.3 Admin site map

```
/admin/login                            Login form
/admin/dashboard                        Metrics overview
├─ /admin/dashboard/products            Product list (search, filter, paginate)
│  ├─ /admin/dashboard/products/create
│  └─ /admin/dashboard/products/[id]/edit
├─ /admin/dashboard/guests              Orders/transactions list + detail + verification
├─ /admin/dashboard/parameters          Store configuration (dynamic form)
└─ /admin/dashboard/locations           Shipping destination master data
```

Sidebar items are defined by `NAV_ITEMS` in `layout-dashboard.tsx` (Dashboard, Products, Guests, Parameters, Locations); the active item is resolved by longest matching prefix, with `/admin/dashboard` matched exactly.

---

## 4. Functional requirements

### 4.1 Storefront

- **F-1 Product listing per line** — `GET /api/products?category=…` with `page`, `limit`, `search`, `order`, `isActive`, `isFavorite`, and date filters (`year`, `month`, `dateFrom`, `dateTo`). Search matches id, name, description, and SKU.
- **F-2 Product detail** — gallery, description, notes, size selection from the `sizes` JSON, pre-order badge (`isPreOrder`), discounted price display, and a related-products section.
- **F-3 Favorites/featured** — `isFavorite` flags products surfaced on the home page.
- **F-4 Curated collections** — a video carousel driven by the `videos_curated_collection` config key, fetched through the public parameters endpoint.
- **F-5 Static content pages** — about, contact, size guide, returns, fabrics, care instructions, how-to-shop.

### 4.2 Cart

- **F-6 Client-side cart** — a hand-rolled subscribe/`forceUpdate` store (`useCart`) persisted to `localStorage` with a TTL wrapper: keys `lindway_cart` and `lindway_cart_selection`, 1-day expiry. Nothing about the cart is stored server-side before checkout.
- **F-7 Size-aware line items** — items are keyed `${id}-${selectedSize}`, so the same product in two sizes is two independent lines.
- **F-8 Selection model** — the cart is grouped by product line, and only *selected* items are checked out. Supports per-item toggle, per-category toggle (with partial-selection state), select/deselect all, and bulk removal of selected items.

### 4.3 Checkout

- **F-9 Cascading destination picker** — province → district → sub-district → village, each level fetched from `GET /api/locations/checkout?type=…` (distinct values from the `Location` table).
- **F-10 Shipping & price calculation** — `GET /api/guests/checkout`; see §5.1.
- **F-11 Server-authoritative pricing** — prices are locked into a signed `checkoutToken`; see §5.2. This is the single most important invariant in the codebase.
- **F-12 Payment step** — choose QRIS (renders the `qris_image` config value) or bank transfer (renders account details), then upload a receipt image. A receipt is required for **both** methods.
- **F-13 Order creation** — `POST /api/guests/checkout` validates stock, creates the `Guest` + one `Cart` row per item in a transaction, then sends a confirmation email.
- **F-14 Order confirmation email** — via Resend, rendered from `order-confirmation-template.tsx`, sent after the transaction commits.

### 4.4 Membership

- **F-15 Membership activation** — after checkout the buyer lands on `/order/payment/success/[id]`, which prompts "Activate Membership?" and calls `PATCH /api/guests/membership/[id]` to set `isMember = true` on that order row.
- **F-16 Member discount** — at calculation time the checkout GET looks up *any* prior `Guest` row with the same email and `isMember: true`; if found, the `member_discount` / `member_type` config values apply.

### 4.5 Admin

- **F-17 Login** — `POST /api/auth/login`, stores JWT + user in `localStorage`.
- **F-18 Dashboard metrics** — `GET /api/dashboard`, filterable by year/month/date range: pending orders, purchased orders, purchased amount, items sold, total guests, total products, and total stock per product line (computed with a raw SQL `unnest(sizes)` aggregation).
- **F-19 Product CRUD** — create/edit/delete with multi-image upload, per-size quantity rows, discount, SKU, category, and the `isPreOrder` / `isFavorite` / `isActive` flags. Deleting a product also deletes its entire image folder.
- **F-20 Derived stock** — `stock` is always recomputed as the sum of `sizes[].quantity` on create and update; a total of zero is rejected.
- **F-21 SKU uniqueness** — enforced on create, and on update when the SKU changes.
- **F-22 Order management** — list/filter orders (`search`, `isPurchased`, date filters, pagination), view detail with cart items and receipt image.
- **F-23 Order verification → stock decrement** — flipping `isPurchased` to true via `PUT /api/guests/[id]` re-validates product availability and **decrements per-size quantities and `stock`** inside a transaction. See §5.3.
- **F-24 Parameter management** — `GET`/`PUT /api/config/parameters`; the form renders dynamically from each parameter's `ParameterType`, including image/video parameters that go through the same temp-upload pipeline.
- **F-25 Location master data** — full CRUD over `Location` rows (code, administrative levels, approximate lat/long), which is what makes the destination picker and distance calculation work.

### 4.6 Files & operations

- **F-26 Two-phase upload** — images (5MB cap, jpeg/jpg/png/webp/gif) and videos upload to a temp folder first; see §5.5.
- **F-27 Explicit delete** — `POST /api/files/deletes` removes a file by sub-path.
- **F-28 Temp sweep** — `POST /api/files/cleanup` deletes temp files older than the TTL (default 1 hour), gated by an `x-cron-secret` header matching `CRON_SECRET`. Requires an external scheduler; nothing in the app triggers it.
- **F-29 Audit logging** — Winston daily-rotating files under `logs/` (`application-`, `error-`, `calculation-`; 30 days, 20MB). `logCalculation` is reserved for the shipping/pricing pipeline so pricing disputes can be traced end to end.

---

## 5. Key flows

### 5.1 Shipping & price calculation (`GET /api/guests/checkout`)

Inputs: destination (province/district/sub_district/village), `email`, cart `items`, `purchased` subtotal, `totalItemsSold`.

1. Validate params via `ShippingCalculateSchema`.
2. In parallel: look up member status by email, load pricing config (`tax_rate`, `tax_type`, `promotion_discount`, `promo_type`, `member_discount`, `member_type`), load shipping config, load shipping zones.
3. Resolve destination coordinates from `Location` (404 if the village isn't in the table).
4. Haversine distance from `origin_lat`/`origin_long` using `earth_radius_km`.
5. For each item, resolve parcel dimensions by size from the `product_dimensions` config group (404 if that size has no dimensions row).
6. `calculateShippingCost` — compare actual vs volumetric weight (`volume_divider`), apply `price_per_kg`, `price_per_km`, `base_price`, the zone multiplier or `price_override`, and floor at `min_shipping`.
7. `calculateTotalPrice` — apply member discount, promo, tax (each `PERCENTAGE` or `FIXED`), then add shipping.
8. Sign a `checkoutToken` and return it alongside the full breakdown.

Every step emits `logCalculation` entries.

### 5.2 Price integrity — the checkout token

`src/utils/checkout-token.ts`. The token is base64url of `{ data, sig }` where `sig` is HMAC-SHA256 over the JSON payload:

```ts
{ shippingCost, totalPurchased, purchased, totalItemsSold, itemsHash, expiresAt }  // 15-minute window
```

`hashItems` normalizes items to a sorted `productId:size:quantity` string and HMACs it.

`POST /api/guests/checkout` then:

1. Requires `checkoutToken` in the body.
2. Verifies signature and expiry.
3. Recomputes `hashItems(items)` and rejects if it differs from `payload.itemsHash` ("cart items changed").
4. Builds the `Guest` record with prices taken **only** from the token payload — client-supplied price fields are overwritten before `CreateGuestSchema.parse`.

> **Invariant:** prices must never flow from the request body into the `Guest` record. Any new priced field must be signed into the token in the GET and read back from the payload in the POST.

### 5.3 Order lifecycle & stock

```
cart (localStorage)
  → GET /guests/checkout            calculate + sign token
  → POST /guests/checkout           stock CHECKED (not decremented), Guest + Cart rows created,
                                    receipt moved out of temp, confirmation email sent
  → admin PUT /guests/[id]          isPurchased: false → true
                                    re-validate, then DECREMENT sizes[].quantity and stock
```

Stock is verified at order creation but only *reserved* by convention — the actual decrement happens when an admin confirms payment. Two orders placed against the last unit will both succeed at creation; the second fails at admin verification.

### 5.4 Post-order page

`/order/payment/success/[id]` is not an order-receipt page — it renders `MembershipConfirm`, an "Activate Membership?" prompt for that guest id. Confirming calls `PATCH /api/guests/membership/[id]`; declining redirects to `/`.

### 5.5 File upload — temp → permanent

1. Client uploads to `POST /api/files/uploads/images|videos`; `FileUploader` writes to `<baseUploadPath>/temp/` and returns a file node with `isMoved: false`.
2. The node travels inside the entity payload (product images, receipt image, image/video config values).
3. On save, `resolveFiles(existingData, incomingData, folder)` recursively walks arbitrary JSON, moves every node with `isMoved: false` into `folder`, and **deletes files present in `existingData` but absent from `incomingData`** — this is how image removal on edit works.

Pass the real previous value as `existingData` on updates (`[]` / `{}` on create), or orphans accumulate. Product images land in `<uploads>/<category>/<sku>/`; receipts in `<uploads>/receipts/`.

`baseUploadPath` defaults to `process.env.NEXT_PUBLIC_UPLOADS_PATH || "uploads"`, resolved relative to the process cwd, while URLs are always `/uploads/<...>`. It is **not** `public/uploads` by default, so serving those URLs is the deployment's responsibility (reverse proxy or a symlink into `public/`).

---

## 6. Database schema

PostgreSQL via Prisma 7. Generated client is imported as `prisma-client/client` (a `file:generated/prisma` dependency), **not** `@prisma/client`.

### 6.1 Entity relationships

```
User                        (standalone — admin accounts only)

Product 1 ──< Cart >── 1 Guest      Cart is the order-line join table
Guest    (one row per checkout = one order)

ConfigParameterGroup 1 ──< ConfigParameter    (cascade delete)

Location                    (standalone master data for the destination picker)
```

### 6.2 Tables

**`users`** — admin accounts.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | cuid | PK |
| `email` | String | unique |
| `username` | String | unique |
| `password` | String | bcrypt, 12 rounds |
| `role` | `Role` | default `ADMIN` |
| `isActive` | Boolean | default true; inactive users are rejected at auth |

**`products`**

| Field | Type | Notes |
| --- | --- | --- |
| `id` | cuid | PK |
| `name`, `description`, `notes` | String | all required |
| `sizes` | `Json[]` | `{ size, quantity }[]` — **not** a relation |
| `price` | `Decimal(12,2)` | |
| `discount` | Int | |
| `discountedPrice` | `Decimal(12,2)` | computed server-side by `calculateDiscountedPrice`, never trusted from the client |
| `category` | `Categories` | default `MY_LINDWAY` |
| `images` | `Json[]` | file nodes — **not** a relation |
| `stock` | Int | derived: sum of `sizes[].quantity` |
| `sku` | String | unique; also the image folder name |
| `productionNotes` | String? | |
| `isPreOrder`, `isFavorite`, `isActive` | Boolean | |

**`guests`** — one row per order.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | cuid | PK; also the membership-activation link id |
| `email` | String | **not unique** — repeat buyers create new rows |
| `fullname`, `whatsappNumber`, `address` | String | |
| `postalCode` | Int | |
| `isMember` | Boolean | set by the membership endpoint, read back by email on future checkouts |
| `shippingCost`, `totalPurchased`, `purchased` | `Decimal(12,2)` | token-derived only |
| `totalItemsSold` | Int | |
| `isPurchased` | Boolean | admin verification flag; flipping it decrements stock |
| `paymentMethod` | `PaymentMethod` | default `BANK_TRANSFER` |
| `receiptImage` | `Json` | single file node |
| `instagram`, `reference` | String? | optional attribution |

**`carts`** — order lines.

| Field | Type | Notes |
| --- | --- | --- |
| `quantity` | Int | |
| `selectedSize` | String | |
| `productId` / `guestId` | FK | no cascade configured |

Price is **not** snapshotted on the line — historical order totals live on `Guest`, while per-line price is read live from the related product.

**`config_parameter_groups`** — `name` (unique), `label`, `description?`, `order`, `isActive`.

**`config_parameters`** — `key` (unique), `label`, `description`, `value` (`Json`), `type` (`ParameterType`, drives admin form rendering), `validation` (`Json?`), `order`, `isActive`, `groupId` (cascade delete).

**`locations`** — `code` (unique), `province`, `district`, `sub_district`, `village`, `approx_lat`/`approx_long` (`Decimal`). Indexed on all four administrative levels.

### 6.3 Enums

- `Role` — `SUPER_ADMIN`, `ADMIN`
- `Categories` — `MY_LINDWAY`, `LURE_BY_LINDWAY`, `SIMPLY_LINDWAY`
- `PaymentMethod` — `BANK_TRANSFER`, `QRIS`
- `DiscountType` — `PERCENTAGE`, `FIXED` (used as *config values* for `tax_type`/`promo_type`/`member_type`, not as a column type)
- `ParameterType` — `TEXT`, `NUMBER`, `DECIMAL`, `BOOLEAN`, `SELECT`, `MULTI_SELECT`, `IMAGE`, `IMAGES`, `VIDEO`, `VIDEOS`, `JSON`, `TEXTAREA`, `COLOR`, `DATE`, `DATETIME`

### 6.4 Seeded configuration (`prisma/seed.ts`)

Groups and keys created by the seed — these are the store's business tunables:

| Group | Keys |
| --- | --- |
| `shipping` | `volume_divider`, `price_per_kg`, `price_per_km`, `base_price`, `min_shipping`, `origin_lat`, `origin_long`, `earth_radius_km`, `shipping_zones` |
| `product_dimensions` | `XS`, `S`, `M`, `L`, `XL`, `XXL`, `XXXL` — each `{ weight_g, length_cm, width_cm, height_cm }` |
| `tax` | `tax_rate`, `tax_type` |
| `member` | `member_discount`, `member_type` |
| `promotion` | `promotion_discount`, `promo_type` |
| `images` | `qris_image` |
| `videos` | `videos_curated_collection` |

Adding a new tunable means adding it to the seed and re-seeding — the Parameters page renders whatever rows exist, driven by `type`. Always read values through `ConfigService` (`@/services`), never with raw Prisma queries.

`ShippingService.getShippingConfig()` applies hardcoded fallbacks per key, and `getShippingZones()` falls back to `DEFAULT_SHIPPING_ZONES`, so a missing row silently yields a default rather than an error.

---

## 7. API surface

All responses are `{ success, message?, data?, pagination? }`. "Admin" means the handler calls `checkAuth`.

| Endpoint | Auth | Purpose |
| --- | --- | --- |
| `GET /api` · `POST /api` | public | health check / echo |
| `POST /api/auth/login` | public | issue JWT |
| `POST /api/auth/register` | **public** | create admin user — see §9 |
| `GET /api/products` | public | list + filter |
| `POST /api/products` | admin | create |
| `GET /api/products/[id]` | public | detail |
| `PUT` · `DELETE /api/products/[id]` | admin | update / delete (+ image folder) |
| `GET /api/guests/checkout` | public | calculate shipping + total, issue `checkoutToken` |
| `POST /api/guests/checkout` | public | create order (token-verified) |
| `GET /api/guests` | admin | list orders |
| `GET` · `PUT /api/guests/[id]` | admin | detail / update (+ stock decrement) |
| `PATCH /api/guests/membership/[id]` | **public** | activate membership — driven by the post-order link |
| `GET /api/locations/checkout` | public | cascading dropdown options |
| `GET` · `POST /api/locations` | admin | list / create |
| `GET` · `PUT` · `DELETE /api/locations/[id]` | admin | detail / update / delete |
| `GET` · `PUT /api/config/parameters` | admin | full parameter tree / bulk update |
| `GET /api/config/parameters/public` | public | `?keyParams=` allowlist, one request per key set |
| `GET /api/dashboard` | admin | metrics |
| `POST /api/files/uploads/images` · `/videos` | **public** | upload to temp (5MB images) |
| `POST /api/files/deletes` | **public** | delete by sub-path |
| `POST /api/files/cleanup` | `x-cron-secret` | sweep expired temp files |

### 7.1 Handler shape

Match this when adding routes:

```ts
const pathAPI = "POST /products";
const authError = await checkAuth(request, pathAPI);   // admin routes only
if (authError) return authError;
const startTime = Date.now();
try {
  const body = await request.json();
  logRequest(pathAPI, request, body, getClientIp(request));
  const data = SomeZodSchema.parse(body);
  ...
  logResponse(pathAPI, Date.now() - startTime, { message, data });
  return NextResponse.json({ success: true, message }, { status: 201 });
} catch (error) {
  if (error instanceof z.ZodError) { logError(...); return NextResponse.json({ success: false, message: "Validation error", errors: ... }, { status: 400 }); }
  logError(`${pathAPI} error`, Date.now() - startTime, error);
  return NextResponse.json({ success: false, message: error }, { status: 500 });
}
```

List endpoints share a query convention (`page`, `limit`, `search`, `order`, `year`, `month`, `dateFrom`, `dateTo`) parsed by a `*QuerySchema`.

---

## 8. Technical reference

### 8.1 Commands

```bash
npm run dev            # dev server (localhost:3000)
npm run build          # production build
npm run start          # serve production build
npm run lint           # eslint (flat config, next/core-web-vitals + next/typescript)
npx tsc --noEmit       # typecheck — no npm script for this

npm run db:generate    # regenerate Prisma client into generated/prisma
npm run db:migrate     # prisma migrate dev
npm run db:seed        # tsx prisma/seed.ts — seeds admin user + all ConfigParameter rows
npm run db:studio      # prisma studio
npm run db:reset       # migrate reset --force (destructive)
```

**There is no test framework installed** — no runner, no test files. Verification is `npx tsc --noEmit` + `npm run lint` + manually exercising the flow.

Prisma is configured via `prisma.config.ts` (not `package.json`); the schema's `datasource` block has no `url`, so `DATABASE_URL` is injected from that config file. After changing `prisma/schema.prisma` you must run `db:generate` or type errors will be stale and misleading.

### 8.2 Environment variables

`DATABASE_URL`, `NEXT_PUBLIC_BASE_URL`, `NEXT_PUBLIC_JWT_SECRET`, `NEXT_PUBLIC_CHECKOUT_TOKEN`, `NEXT_PUBLIC_UPLOADS_PATH`, `RESEND_API_KEY`, `RESEND_EMAIL_FROM`, `CRON_SECRET`.

### 8.3 Client data layer

`src/utils/api.ts` is the single axios + TanStack Query layer — grouped objects (`productsApi`, `guestsApi`, `guestCheckoutApi`, `configParametersApi`, `locationsApi`, `dashboardApi`, `filesApi`) exporting hooks. Mutations already surface `react-hot-toast` success/error and unwrap array-shaped Zod error responses into a newline-joined message; **don't re-toast at the call site**. Default `staleTime`/`gcTime` are 6 hours; queries retry 3×.

Two state stores, deliberately different: `useAuth` is Zustand; `useCart` is the hand-rolled store described in F-6. `src/lib/redis.ts` is entirely commented out and `ioredis` is an unused dependency — there is no server-side caching layer.

### 8.4 Imports & types

Barrel exports throughout — import from `@/lib`, `@/utils`, `@/types`, `@/services`, `@/components`, `@/hooks` rather than deep paths, and add new files to the corresponding `index.ts`. Zod schemas and their inferred types all live in `src/types/zod.ts`; `Create*` / `Update*` variants are derived from a base schema via `.omit()` / `.partial()`.

### 8.5 Conventions

- Prettier-less but consistent: ~200-char lines, double quotes, semicolons, blank line between import groups (framework → third-party → `@/` aliases).
- Tailwind v4 (`@tailwindcss/postcss`, no `tailwind.config`); theme tokens live in `src/app/globals.css`. Names like `text-gray`, `text-dark`, `text-darker-gray` are project tokens, not Tailwind defaults.
- `react-icons` for icons; `framer-motion` via the `motion` wrapper in `src/components/motion.tsx`.
- Larger UI is a container in `src/components/ui/<feature>/` plus a `slicing/` subfolder for its parts.
- `next.config.ts` has `output: "standalone"` deliberately commented out — leave it unless deployment changes.

---

## 9. Known gaps and constraints

Documented so they are decisions, not surprises. None of these are fixed as of this writing.

1. **`POST /api/auth/register` is unauthenticated and accepts `role`** — anyone who can reach the API can create a `SUPER_ADMIN` account. This is the most severe open issue.
2. **Secrets in the client bundle** — `NEXT_PUBLIC_JWT_SECRET` and `NEXT_PUBLIC_CHECKOUT_TOKEN` are used only for server-side HMAC/JWT signing, but the `NEXT_PUBLIC_` prefix inlines them into the browser bundle. Both also fall back to hardcoded defaults (`"lindway"`, `"default_secret_for_checkout_token"`). Don't propagate this pattern to new secrets.
3. **Upload and delete endpoints are unauthenticated** — `POST /api/files/uploads/images|videos` and `POST /api/files/deletes` have no `checkAuth`; the delete path is only constrained by an upload-directory containment check.
4. **`GET /api/dashboard` interpolates `year`/`month` into `$queryRawUnsafe`** — admin-gated, but still raw string interpolation of user input into SQL.
5. **`guestsApi.useDeleteGuests` calls `DELETE /api/guests/[id]`, which does not exist** — that route only implements `GET` and `PUT`, so the call returns 405.
6. **Overselling window** — stock is checked at order creation but decremented only at admin verification (§5.3).
7. **Admin dashboard guard is client-side only** — bypassing it exposes the UI shell, though APIs still reject unauthenticated calls.
8. **Uploads are served outside Next's static pipeline by default** (§5.5); a misconfigured deployment yields broken image URLs rather than an error.
9. **No `SUPER_ADMIN`-gated route exists** despite the role hierarchy being implemented.
10. **Missing shipping config rows fail silently** into hardcoded defaults (§6.4), so a partially-seeded database produces plausible but wrong prices.
