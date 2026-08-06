# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 0. How to read this document

The project is mid-way through a major revision ("v2"). This document therefore describes **two systems**, and every section is tagged:

- **`[SHIPPED]`** — exists in the codebase right now. Safe to reference, call, and modify.
- **`[TARGET]`** — the agreed v2 design. **Does not exist yet.** Never import, query, or call anything marked `[TARGET]` until Part C says that phase is done.
- **`[OPEN]`** — deliberately undecided. Do not invent an answer; ask.

Part A is the current system. Part B is the target. Part C is the migration order. Part D holds the locked decisions with their rationale, so they are not relitigated. Part E is shared conventions that apply to both.

When a phase in Part C completes, move the affected subsections from `[TARGET]` to `[SHIPPED]` and delete the superseded Part A text. Keeping stale `[SHIPPED]` text is worse than having no document.

---

# PART A — System as shipped today (v1)

## A1. Product overview `[SHIPPED]`

**Lindway Home** is an Indonesian fashion e-commerce storefront for the Lindway brand (Denpasar, Bali) — a single Next.js 16 App Router application with its own admin dashboard.

Defining decisions:

- **Guest-only checkout.** No customer accounts. Each completed checkout writes one `Guest` row — `Guest` *is* the order. Repeat buyers correlate only by email string.
- **Manual payment confirmation.** No payment gateway. Buyer transfers via bank or QRIS, uploads a receipt, an admin later verifies and flips the order to purchased.
- **Config-driven pricing.** Tax, promo, member discount, shipping rates, zone multipliers, per-size parcel dimensions live in `ConfigParameter` rows, editable from the admin Parameters page.
- **Distance-based shipping.** Haversine distance from a configured origin to the buyer's village, combined with volumetric weight and a zone multiplier. No courier API.
- **Three product lines** as the `Categories` enum and as separate routes.

### A1.1 Users

| Persona | Access | What they do |
| --- | --- | --- |
| Shopper (anonymous) | Public routes, no login | Browse, build a `localStorage` cart, check out as guest, upload receipt, optionally activate membership |
| Admin (`ADMIN`) | `/admin/*` + admin APIs | Products, order verification, store parameters, shipping locations |
| Super admin (`SUPER_ADMIN`) | Same as admin | Hierarchy exists (`SUPER_ADMIN > ADMIN`) but **no handler requires it** — every `checkAuth` uses the default `ADMIN` level |

## A2. Access model `[SHIPPED]`

JWT, 1-day expiry, stored in `localStorage` under `auth_token`, attached by an axios request interceptor as `Authorization: Bearer`.

- `src/proxy.ts` (Next 16's replacement for `middleware.ts`) exists but does **locale routing only** — it never authenticates. Protection is **per-handler**: an admin route calls `checkAuth(request, pathAPI)` from `@/lib` first and returns early if the result is non-null (`null` means authorized).
- The dashboard guard (`useAuthStore` in `layout-dashboard.tsx`) is **client-side only**. Real enforcement is in the API handlers, so a new admin handler that forgets `checkAuth` is effectively public.
- `checkAuth` runs `authenticate` and `authorize` in parallel; both re-read the user from the database and reject inactive users.

## A3. Information architecture `[SHIPPED]`

```
/                                   Home — hero, featured products, curated collection video carousel
├─ /my-lindway  /simply-lindway  /lure-by-lindway     Product line landing + listing
├─ /product/[category]/[id]         Product detail
├─ /cart                            Cart + checkout wizard (summary → payment → complete)
├─ /order/payment/success/[id]      Membership activation prompt (NOT a receipt page)
└─ /about  /contact-us  /size-guide  /return-exchanges
   /curated-collections  /shop  /our-fabrics  /care-instructions

/admin/login
/admin/dashboard  ├─ /products (+/create, /[id]/edit)  ├─ /guests  ├─ /parameters  └─ /locations
```

Header has two nav bands: `navFeatureLists` (hardcoded in `header.tsx`, the 3 brands) and `navLists` (`src/static/navigation.ts`, the 8 content pages). Cart badge counts **distinct products**, not total quantity.

## A4. Functional requirements `[SHIPPED]`

**Storefront** — F-1 product listing per line (`GET /api/products` with page/limit/search/order/isActive/isFavorite + date filters; search matches id, name, description, SKU) · F-2 product detail with size picker and pre-order badge · F-3 `isFavorite` featured products on home · F-4 curated-collection video carousel from `videos_curated_collection` · F-5 static content pages.

**Cart** — F-6 hand-rolled subscribe/`forceUpdate` store persisted to `localStorage` with a TTL wrapper (`lindway_cart`, `lindway_cart_selection`, 1-day); nothing is stored server-side before checkout · F-7 items keyed `${id}-${selectedSize}` · F-8 grouped by product line, only *selected* items check out, with per-item / per-category / select-all toggles and bulk removal.

**Checkout** — F-9 cascading province → district → sub-district → village picker · F-10 shipping and price calculation (§A5.1) · F-11 server-signed `checkoutToken` (§A5.2) · F-12 QRIS or bank transfer, receipt required for **both** · F-13 order creation in a transaction · F-14 Resend confirmation email.

**Membership** — F-15 activation via `PATCH /api/guests/membership/[id]` from the post-order page · F-16 member discount applies if *any* prior `Guest` with the same email has `isMember: true`.

**Admin** — F-17 login · F-18 dashboard metrics (raw SQL `unnest(sizes)` per line) · F-19 product CRUD with multi-image upload · F-20 `stock` recomputed as the sum of `sizes[].quantity`, zero rejected · F-21 SKU uniqueness · F-22 order list/filter/detail · F-23 flipping `isPurchased` re-validates and **decrements** stock (§A5.3) · F-24 parameter management rendered from `ParameterType` · F-25 location CRUD.

**Files & ops** — F-26 two-phase upload (§A5.5) · F-27 explicit delete · F-28 temp sweep gated by `x-cron-secret`, needs an external scheduler · F-29 Winston daily-rotating logs (`application-`, `error-`, `calculation-`; 30d/20MB), `logCalculation` reserved for the pricing pipeline.

## A5. Key flows `[SHIPPED]`

### A5.1 Shipping & price calculation — `GET /api/guests/checkout`

Inputs: destination, `email`, `items`, `purchased` subtotal, `totalItemsSold`.

1. Validate via `ShippingCalculateSchema`.
2. In parallel: member lookup by email; pricing config (`tax_rate`, `tax_type`, `promotion_discount`, `promo_type`, `member_discount`, `member_type`); shipping config; shipping zones.
3. Destination coordinates from `Location` (404 if the village is absent).
4. Haversine distance from `origin_lat`/`origin_long` using `earth_radius_km`.
5. Per item, parcel dimensions by size from the `product_dimensions` config group (404 if that size has no row).
6. `calculateShippingCost` — actual vs volumetric weight (`volume_divider`), then `price_per_kg`, `price_per_km`, `base_price`, zone multiplier or `price_override`, floored at `min_shipping`.
7. `calculateTotalPrice` — member discount, promo, tax (each `PERCENTAGE` or `FIXED`), then add shipping.
8. Sign a `checkoutToken` and return it with the breakdown.

Every step emits `logCalculation`.

### A5.2 Price integrity — the checkout token

`src/utils/checkout-token.ts`. Base64url of `{ data, sig }` where `sig` is HMAC-SHA256 over:

```ts
{ shippingCost, totalPurchased, purchased, totalItemsSold, itemsHash, expiresAt }  // 15-minute window
```

`hashItems` normalizes to a sorted `productId:size:quantity` string and HMACs it. `POST /api/guests/checkout` requires the token, verifies signature and expiry, recomputes `hashItems(items)` and rejects on mismatch, then builds `Guest` with prices taken **only** from the payload.

> **KNOWN DEFECT — see A9.1.** The `purchased` subtotal is supplied by the client and signed without being checked against database prices. The token is authoritative but its input is not. Fixed in v2 (§B6.3).

### A5.3 Order lifecycle & stock

```
cart (localStorage)
  → GET  /guests/checkout    calculate + sign token
  → POST /guests/checkout    stock CHECKED (not decremented), Guest + Cart rows created,
                             receipt moved out of temp, confirmation email sent
  → admin PUT /guests/[id]   isPurchased false → true: re-validate, then DECREMENT
                             sizes[].quantity and stock
```

Stock is reserved only by convention. Two orders against the last unit both succeed at creation; the second fails at admin verification.

### A5.4 Post-order page

`/order/payment/success/[id]` renders `MembershipConfirm` — an "Activate Membership?" prompt, not a receipt. Confirming calls `PATCH /api/guests/membership/[id]`; declining redirects to `/`.

### A5.5 File upload — temp → permanent

1. Client uploads to `POST /api/files/uploads/images|videos`; `FileUploader` writes to `<baseUploadPath>/temp/` and returns a node with `isMoved: false`.
2. The node travels inside the entity payload.
3. On save, `resolveFiles(existingData, incomingData, folder)` walks arbitrary JSON, moves every `isMoved: false` node into `folder`, and **deletes files present in `existingData` but absent from `incomingData`** — this is how image removal works.

Pass the real previous value as `existingData` on updates (`[]`/`{}` on create), or orphans accumulate. Product images: `<uploads>/<category>/<sku>/`. Receipts: `<uploads>/receipts/`.

`baseUploadPath` defaults to `NEXT_PUBLIC_UPLOADS_PATH || "uploads"` relative to cwd, while URLs are always `/uploads/<...>`. It is **not** `public/uploads`, so serving those URLs is the deployment's job.

## A6. Database schema `[SHIPPED]`

PostgreSQL via Prisma 7. Client imported as `prisma-client/client` (a `file:generated/prisma` dependency), **not** `@prisma/client`.

```
User                                    (standalone, admin accounts)
Product 1 ──< Cart >── 1 Guest          Cart is the order-line join table
ConfigParameterGroup 1 ──< ConfigParameter   (cascade delete)
Location                                (standalone master data)
```

| Table | Notable fields |
| --- | --- |
| `users` | `email`/`username` unique, bcrypt(12) `password`, `role`, `isActive` |
| `products` | `sizes Json[]` (`{size, quantity}[]`), `images Json[]`, `price`/`discountedPrice` `Decimal(12,2)`, `category` enum, `stock` derived, `sku` unique (also the image folder), `isPreOrder`/`isFavorite`/`isActive` |
| `guests` | one row per order; `email` **not unique**; `shippingCost`/`totalPurchased`/`purchased` token-derived; `isPurchased` drives the stock decrement; `receiptImage Json` |
| `carts` | `quantity`, `selectedSize` String, FKs to product and guest, **no price snapshot** |
| `config_parameter_groups` | `name` unique, `label`, `order`, `isActive` |
| `config_parameters` | `key` unique, `value Json`, `type ParameterType`, `validation Json?`, `groupId` cascade |
| `locations` | `code` unique, four administrative levels (all indexed), `approx_lat`/`approx_long` |

**Enums** — `Role` (SUPER_ADMIN, ADMIN) · `Categories` (MY_LINDWAY, LURE_BY_LINDWAY, SIMPLY_LINDWAY) · `PaymentMethod` (BANK_TRANSFER, QRIS) · `DiscountType` (PERCENTAGE, FIXED — used as *config values*, not as a column type) · `ParameterType` (TEXT, NUMBER, DECIMAL, BOOLEAN, SELECT, MULTI_SELECT, IMAGE, IMAGES, VIDEO, VIDEOS, JSON, TEXTAREA, COLOR, DATE, DATETIME).

**Seeded config** — `shipping` (9 keys) · `product_dimensions` (XS…XXXL) · `tax` · `members` · `promotions` · `images` (`qris_image`) · `videos` (`videos_curated_collection`).

`ShippingService.getShippingConfig()` applies hardcoded per-key fallbacks and `getShippingZones()` falls back to `DEFAULT_SHIPPING_ZONES`, so a missing row silently yields a default instead of an error.

## A7. API surface `[SHIPPED]`

All responses are `{ success, message?, data?, pagination? }`. "Admin" means the handler calls `checkAuth`.

| Endpoint | Auth | Purpose |
| --- | --- | --- |
| `GET`·`POST /api` | public | health check / echo |
| `POST /api/auth/login` | public | issue JWT |
| `POST /api/auth/register` | **public** | create admin user — see A9.2 |
| `GET /api/products` · `GET /api/products/[id]` | public | list / detail |
| `POST /api/products` · `PUT`·`DELETE /api/products/[id]` | admin | create / update / delete (+ image folder) |
| `GET /api/guests/checkout` | public | calculate + issue `checkoutToken` |
| `POST /api/guests/checkout` | public | create order (token-verified) |
| `GET /api/guests` · `GET`·`PUT /api/guests/[id]` | admin | list / detail / update (+ stock decrement) |
| `PATCH /api/guests/membership/[id]` | **public** | activate membership |
| `GET /api/locations/checkout` | public | cascading dropdown options |
| `GET`·`POST /api/locations` · `GET`·`PUT`·`DELETE /api/locations/[id]` | admin | location CRUD |
| `GET`·`PUT /api/config/parameters` | admin | full tree / bulk update |
| `GET /api/config/parameters/public` | public | `?keyParams=` allowlist |
| `GET /api/dashboard` | admin | metrics |
| `POST /api/files/uploads/images`·`/videos` | **public** | upload to temp (5MB images) |
| `POST /api/files/deletes` | **public** | delete by sub-path |
| `POST /api/files/cleanup` | `x-cron-secret` | sweep expired temp files |

## A9. Known gaps in v1 `[SHIPPED]`

### Closed by phase 1

| Gap | How |
| --- | --- |
| **Client-supplied subtotal was signed unchecked** — a buyer could name their own total | Checkout GET derives `purchased` and `totalItemsSold` from database prices and no longer reads them from the query string. `smoke:checkout` asserts an injected `purchased=1` is ignored |
| **`$queryRawUnsafe` in `/api/dashboard`** interpolated `year`/`month` | Replaced by a Prisma `groupBy` over variants |
| **`DELETE /api/orders/[id]` did not exist** while the client called it (405) | Added; refuses to delete a verified order, since that would strand stock and `soldCount` |
| **`DELETE /api/products/[id]` hard-deleted** and returned a raw foreign-key 500 once a product had orders | Soft delete: deactivates instead, with a message that says so |
| **`Order` had no lifecycle beyond `isPurchased`**, and nowhere for the tracking number the storefront promises | `OrderStatus`, `trackingNumber`, `cancelledAt` (D23) |
| **Bank details hardcoded** in `payment-step.tsx` | `store_profile` config group |
| **Shipping origin was Jakarta** while the brand ships from Denpasar, silently mispricing every order | Corrected in the seed. The hardcoded fallbacks in `ShippingService` still need the same fix — see below |

Two further defects were found by `smoke:checkout` during the phase, both invisible to the type checker: `resolveTranslation` overwrote the product id, and Zod's `.partial()` does not strip `.default()`, so partial updates silently reset fields. Details in §C1.

### Still open

1. **`POST /api/auth/register` is unauthenticated and accepts `role`** — anyone reaching the API can create a `SUPER_ADMIN`. **→ phase 5 (F-52).**
2. **Secrets in the client bundle** — `NEXT_PUBLIC_JWT_SECRET` and `NEXT_PUBLIC_CHECKOUT_TOKEN` are server-side signing secrets, but the prefix inlines them into the browser bundle, and both fall back to hardcoded defaults. **→ phase 5 (F-54).**
3. **Upload and delete endpoints are unauthenticated** — no `checkAuth`; delete is constrained only by a directory containment check. **→ phase 5 (F-53).**
4. **Overselling window** — stock is checked at order creation but decremented only at verification (§A5.3). Two orders against the last unit both succeed; the second fails when the admin verifies it.
5. **Admin dashboard guard is client-side only.**
6. **Uploads served outside Next's static pipeline by default** — a misconfigured deployment yields broken image URLs rather than an error.
7. **No `SUPER_ADMIN`-gated route exists** despite the hierarchy.
8. **Missing shipping config rows fail silently** into hardcoded defaults in `ShippingService`, so a partially-seeded database produces plausible but wrong prices. The Jakarta coordinates still live there as the fallback. **→ phase 5.**

---

# PART B — Target design (v2)

## B1. What v2 changes

Five shifts, in order of blast radius:

1. **Bilingual (EN/ID)** — every public route moves under `/[lang]/`, and translatable content moves into per-entity translation tables.
2. **Taxonomy replaces the category enum** — three independent admin-managed axes (branding, audience, garment) instead of one enum.
3. **Sizes become relational** — a `Size` master plus `ProductVariant` per product×size, with reusable size guides.
4. **Orders gain a real lifecycle** — `Order` replaces `Guest`, `OrderItem` replaces `Cart`, an `OrderStatus` enum replaces a lone boolean, and each line snapshots the price it sold at (D17, D23). Discounting itself is unchanged from v1 (D22).
5. **New content subsystems** — Journal, FAQ, Contact inquiries, plus richer product content via Tiptap.

The checkout token, shipping/zone calculation, order lifecycle, upload pipeline, guest checkout, membership, logging, auth, and handler conventions are **preserved**. See §B6.3 for the two unavoidable exceptions.

## B2. Target information architecture `[TARGET]`

### B2.1 Public routes

All public routes are prefixed with `/[lang]` where lang ∈ `en` | `id`. `/admin/*` is **not** localized.

```
/[lang]/                                   Home
/[lang]/new-arrivals                       Sorted by releasedAt
/[lang]/best-sellers                       Sorted by bestSellerRank, then soldCount
/[lang]/collections/[brandingSlug]         Branding landing + listing + its favorite products
/[lang]/shop/[garmentSlug]                 Garment listing (Dresses, Tops, Skirts …)
/[lang]/shop/for/[audienceSlug]            Audience listing (Women, Men, Kids)
/[lang]/product/[slug]                     Product detail
/[lang]/cart                               Cart + checkout wizard
/[lang]/order/payment/success/[id]         Membership activation prompt
/[lang]/journal                            Article list
/[lang]/journal/[slug]                     Article detail
/[lang]/our-world                          [OPEN] content undecided — placeholder
/[lang]/about/our-story
/[lang]/about/our-production
/[lang]/about/our-artisan
/[lang]/about/sustainability
/[lang]/about/our-fabrics                  Stays static (decision D11)
/[lang]/customer-care/size-guide           Published SizeGuide records
/[lang]/customer-care/how-to-shop
/[lang]/customer-care/shipping-delivery
/[lang]/customer-care/return-exchanges
/[lang]/customer-care/care-instructions
/[lang]/customer-care/faq
/[lang]/customer-care/contact-us
```

Product and article URLs use `slug`, not `id`. **Slug is single, not per-locale** — switching language keeps the same URL (D4). Admin routes keep using `id`.

### B2.2 Navigation

**Header** — New Arrivals · Collections · Our World · Journal · About (Our Story, Our Production, Our Artisan, Sustainability, Our Fabrics, Journal — the duplicate Journal entry is intentional, D13) · Wishlist counter · Bag counter · EN/ID switch.

**Collections is a three-column mega-menu** rendered from [`src/static/taxonomy.ts`](src/static/taxonomy.ts) (D16, D25):

```
Collections ▾
  Branding              Audience              Garment
  My Lindway            Women                 Dresses
  Simply Lindway        Men                   Tops
  Lure by Lindway       Kids                  Skirts
  Studio by Lindway                           …
  Lindway × AWP
  → /collections/[slug]  → /shop/for/[slug]    → /shop/[slug]
```

Each column renders the `isActive` entries ordered by `order`. Since the taxonomy is enums (D25), a new branding or garment reaches the menu through a deploy, not a database row — `isActive` is what an admin-free change can toggle in the meantime. This is also how garment and audience listings become reachable from the header, not just the footer.

**Footer** — four columns: Collections (5 brandings) · Shop (New Arrivals, Best Sellers, Dresses, Tops, Skirts, Kids, Men) · Customer Care (Size Guide, How to Shop, Shipping & Delivery, Return & Exchanges, Care Instructions, Contact Us, FAQ) · About (Our Story, Our Production, Our Artisan, Sustainability, Our Fabrics, Journal).

Both content pages moved home relative to v1: `/contact-us` now lives under Customer Care, and `/our-fabrics` under About.


### B2.3 Admin navigation

The sidebar grows past a flat list and is grouped:

```
Overview   Dashboard
           Contact Inbox        ← standalone top-level item, badge = count of status NEW
Catalog    Products · Sizes · Size Guides
Sales      Orders · Members
Content    Articles · Article Categories · FAQ
Settings   Parameters · Locations
```

There is no Taxonomy section: branding, audience and garment are enums edited in code (D25). There are no Promotions or Member Discounts sections either — discounting is `Product.discount` plus two config values (D22), so it lives on the product form and the Parameters page.

Contact Inbox is a menu of its own rather than a Content sub-item (D15) — it is a work queue an admin returns to daily, not content to author.

## B3. Localization `[TARGET]`

### B3.1 Scope

| Content | Translated | Mechanism |
| --- | --- | --- |
| Static UI copy | Yes | `en.json` / `id.json` via `get-dictionary.ts` |
| Article | Yes | `ArticleTranslation` |
| FAQ | Yes | `FaqTranslation` |
| Product (name + 5 rich-text fields) | Yes, **ID optional** | `ProductTranslation` |
| Branding / Audience / Garment labels | **No** | single label column |
| Size guide title, description, measurement labels | Yes | `SizeGuideTranslation` |
| Public-facing config values (`product_defaults`, media alt) | Yes | value shape `{ en, id }` |
| Server-side config values (rates, coordinates, zones) | No | scalar as today |
| Config parameter **labels** (admin UI) | No | EN only |
| Admin dashboard UI | No | EN only, outside `[lang]` |
| Order confirmation email | No | EN only (D3) |

### B3.2 Fallback is per-field, never per-record

If an admin fills the ID name but not the ID description, the page shows **ID name + EN description**. A record-level fallback would drop the whole record to EN and is wrong.

One helper owns this so the behavior is identical everywhere:

```ts
resolveTranslation(translations, locale)   // → merged object, field-by-field, ID over EN
```

For the four product content fields the chain has four levels (D9):

```
product override (active locale)
  → product override (EN)
    → global default (active locale)
      → global default (EN)
```

### B3.3 Consequences that must not be forgotten

- **Product search must join translations.** `GET /api/products` currently searches `name`/`description` on the product table. It must search the active locale **plus EN**, or untranslated products become invisible in ID.
- **Admin forms use an EN | ID tab**, not both languages side by side. A product form otherwise carries 5 rich-text editors × 2 locales on one screen.
- **`generateStaticParams`** for the `[lang]` segment, plus `hreflang` tags on public pages.

## B4. Target data model `[TARGET]`

All ids are `cuid()` (D7). All tables follow the existing `@@map("snake_case")` convention. Sections B4.1 → B4.9 read top-to-bottom as the complete target `schema.prisma`.

**Four invariants Prisma cannot express.** Each is a class of silent bug, so each is enforced in the service layer on write *and* checked by `npm run db:check` (F-56) — the repo has no test framework, so that script is the only automated guard.

| Invariant | What breaks without it |
| --- | --- |
| Every translatable entity has an `EN` translation row (`ID` optional, D3) | A product with no translation rows is creatable and renders **nameless** everywhere, because `Product` has no `name` column |
| `Size.code` matches a `package_dimensions` config key exactly | Checkout returns 404 for that size — discovered by the buyer, not the admin |
| `ProductVariant.sizeId` is one of the sizes in the product's `sizeGuide` | Orphan variants that never appear in the size table |
| `products.stock` equals `SUM(product_variants.quantity)` | Overselling. This one is additionally enforced by a database trigger (D24), so the check is a backstop rather than the only line of defence |

### B4.1 Taxonomy

**Three enums, not three tables** (D25).

```prisma
enum BrandingType { MY_LINDWAY  SIMPLY_LINDWAY  LURE_BY_LINDWAY  STUDIO_BY_LINDWAY  LINDWAY_AWP }
enum AudienceType { WOMEN  MEN  KIDS }
enum GarmentType  { DRESSES  TOPS  SKIRTS }
```

The database stores only the key. Everything a page needs to render it — label, URL slug, hero copy, hero image, menu order, and an `isActive` flag — lives in [`src/static/taxonomy.ts`](src/static/taxonomy.ts), which is the single source for all three axes. Labels are not translated (D2).

**What this costs.** Adding a branding, audience or garment means editing the Prisma enum, running a migration, editing `taxonomy.ts`, and deploying. There is no admin screen, and no `[OPEN]` about it — the trade was made deliberately in exchange for three tables, one join table, and three CRUD screens.

`isActive: false` hides an entry from the navigation and its listing without removing the enum value, so products already tagged with it are never orphaned. `STUDIO_BY_LINDWAY` and `LINDWAY_AWP` ship inactive until their copy and artwork arrive.

**One coupling to watch.** `taxonomy.ts` declares its key types locally rather than importing them from the generated Prisma client, so the file compiles before the phase-1 migration exists. Phase 1 must add a compile-time assertion that the two agree — silent drift would mean a product tagged with a key that no page can render.

### B4.2 Size, size guide, and package dimensions

```prisma
model Size {
  id        String           @id @default(cuid())
  code      String           @unique  // XS, S, M … MUST match a package_dimensions config key
  label     String
  order     Int              @default(0)
  isActive  Boolean          @default(true)
  createdAt DateTime         @default(now())
  updatedAt DateTime         @updatedAt

  variants  ProductVariant[]
  guideRows SizeGuideRow[]

  @@map("sizes")
}

model SizeGuide {
  id           String                 @id @default(cuid())
  order        Int                    @default(0)
  publishedAt  DateTime?              // null = draft; this IS the on/off switch
  createdAt    DateTime               @default(now())
  updatedAt    DateTime               @updatedAt

  rows         SizeGuideRow[]
  translations SizeGuideTranslation[]
  products     Product[]

  @@index([publishedAt])
  @@map("size_guides")
}

model SizeGuideRow {
  id           String    @id @default(cuid())
  sizeGuideId  String
  sizeId       String
  measurements Json      // { length: 98, waist: 62, bottom_width: 140 }

  sizeGuide    SizeGuide @relation(fields: [sizeGuideId], references: [id], onDelete: Cascade)
  size         Size      @relation(fields: [sizeId], references: [id])

  @@unique([sizeGuideId, sizeId])
  @@map("size_guide_rows")
}

model SizeGuideTranslation {
  id              String    @id @default(cuid())
  sizeGuideId     String
  locale          Locale
  title           String
  description     String?
  parameterLabels Json?     // { length: "Panjang", waist: "Lingkar Pinggang" }

  sizeGuide       SizeGuide @relation(fields: [sizeGuideId], references: [id], onDelete: Cascade)

  @@unique([sizeGuideId, locale])
  @@map("size_guide_translations")
}
```

- `publishedAt = null` means draft; the public Size Guide page lists only published guides (D1). **There is no `isActive` beside it** — "inactive but published" would have no defined meaning (D21).
- **Rows have no `order` column.** They are ordered by `size.order`, so there is only ever one ordering source (D21).
- **No grouping field.** The public page renders published guides as a flat list ordered by `order`. v1's hardcoded Women / Men / Baby split with Kebaya / Batik tabs is not reproduced — the translated `title` carries that meaning instead (e.g. "Women — Batik"), so admins can introduce new groupings without a schema change (D1).
- **Title and description live only in the translation**, matching the Article and FAQ pattern. Admin lists join the EN row.
- `measurements` keys are stable identifiers; their **display labels** are per-locale in `SizeGuideTranslation.parameterLabels`. Translating JSON keys directly would be unworkable.
- **Package dimensions do not live here.** They live on `ProductVariant` — see D6 for why.
- `Size.code` must match a `package_dimensions` config key exactly, or checkout returns 404 for that size. Warn in the admin form when a new Size has no matching dimensions row.

### B4.3 Product

```prisma
model Product {
  id              String               @id @default(cuid())
  sku             String               @unique  // also the image folder name
  slug            String               @unique  // public URL, single locale (D4)

  branding        BrandingType                  // required (D5)
  garment         GarmentType?                  // single
  audiences       AudienceType[]                // many, so a product can be unisex
  sizeGuideId     String?

  price           Decimal              @db.Decimal(12, 2)
  discount        Int                  @default(0)
  discountedPrice Decimal              @db.Decimal(12, 2)

  images          Json[]                        // file nodes
  stock           Int                  @default(0)  // derived: sum(variants.quantity)

  releasedAt      DateTime?                     // drives New Arrivals
  soldCount       Int                  @default(0)  // += on order verification
  bestSellerRank  Int?                          // manual override

  isPreOrder      Boolean              @default(false)
  isFavorite      Boolean              @default(false)
  isActive        Boolean              @default(true)

  createdAt       DateTime             @default(now())
  updatedAt       DateTime             @updatedAt

  sizeGuide       SizeGuide?           @relation(fields: [sizeGuideId], references: [id])
  variants        ProductVariant[]
  translations    ProductTranslation[]
  orderItems      OrderItem[]

  @@index([branding])
  @@index([garment])
  @@index([audiences], type: Gin)      // array containment: "products for Women"
  @@index([releasedAt])
  @@index([soldCount])
  @@index([bestSellerRank])
  @@index([isActive, isFavorite])
  @@map("products")
}


model ProductVariant {
  id                String   @id @default(cuid())
  productId         String
  sizeId            String
  quantity          Int      @default(0)
  packageDimensions Json?    // { weight_g, length_cm, width_cm, height_cm } — else config default
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  product           Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  size              Size     @relation(fields: [sizeId], references: [id])

  @@unique([productId, sizeId])
  @@map("product_variants")
}

model ProductTranslation {
  id                String  @id @default(cuid())
  productId         String
  locale            Locale
  name              String
  description       Json?   // Tiptap
  notes             Json?   // Tiptap — falls back to config product_defaults
  fabricInformation Json?   // Tiptap — falls back to config
  shippingDelivery  Json?   // Tiptap — falls back to config
  returnPolicy      Json?   // Tiptap — falls back to config

  product           Product @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@unique([productId, locale])
  @@map("product_translations")
}
```

- **One branding (required), one garment, many audiences** (D5) — so a product can be unisex.
- `Product` no longer carries `name`, `description`, `notes`, `category`, `sizes`, or `productionNotes`. Name and content moved to `ProductTranslation`; category became three relations; sizes became `ProductVariant`. `productionNotes` held the customer-facing "made-to-order, allow 21-25 days" line in v1 — untranslatable and duplicating what `notes` now covers with a global default (D9, D21).
- `isFavorite` keeps its v1 meaning: an admin flag for featured products, now surfaced on that product's branding page (D11). It is **not** the wishlist.
- The five translated content fields hold Tiptap JSON (D10). All are nullable; empty falls back per §B6.1.
- Product search filters on `ProductTranslation.name`/`description` with `contains`. A plain btree index does not help `contains`, so none is declared — add a `pg_trgm` GIN index later if search gets slow.

### B4.4 Stock and metrics

`Product.stock` stays derived — recomputed as `sum(ProductVariant.quantity)` on every write, still rejecting a total of zero. The dashboard's `$queryRawUnsafe unnest(sizes)` is deleted and replaced with a normal Prisma `groupBy` over variants joined to branding, which closes gap A9.5.

`soldCount` increments when an admin flips `isPurchased` to true, inside the same transaction as the stock decrement. `bestSellerRank` is a nullable manual override; Best Sellers sorts by rank first, then `soldCount` (D13).

### B4.5 Content

```prisma
model ArticleCategory {
  id           String                       @id @default(cuid())
  slug         String                       @unique
  order        Int                          @default(0)
  isActive     Boolean                      @default(true)
  createdAt    DateTime                     @default(now())
  updatedAt    DateTime                     @updatedAt

  articles     Article[]
  translations ArticleCategoryTranslation[]

  @@map("article_categories")
}

model ArticleCategoryTranslation {
  id          String          @id @default(cuid())
  categoryId  String
  locale      Locale
  name        String
  description String?

  category    ArticleCategory @relation(fields: [categoryId], references: [id], onDelete: Cascade)

  @@unique([categoryId, locale])
  @@map("article_category_translations")
}

model Article {
  id           String               @id @default(cuid())
  slug         String               @unique
  categoryId   String
  image        Json                 // file node — same pipeline as product images
  imageAlt     String?
  featured     Boolean              @default(false)
  publishedAt  DateTime?            // null = draft
  createdAt    DateTime             @default(now())
  updatedAt    DateTime             @updatedAt

  category     ArticleCategory      @relation(fields: [categoryId], references: [id])
  translations ArticleTranslation[]

  @@index([categoryId])
  @@index([publishedAt])
  @@index([featured])
  @@map("articles")
}

model ArticleTranslation {
  id        String  @id @default(cuid())
  articleId String
  locale    Locale
  title     String
  excerpt   String?
  content   Json    // Tiptap

  article   Article @relation(fields: [articleId], references: [id], onDelete: Cascade)

  @@unique([articleId, locale])
  @@map("article_translations")
}

model Faq {
  id           String           @id @default(cuid())
  topic        String           // groups FAQs so one component serves several pages
  order        Int              @default(0)
  isActive     Boolean          @default(true)
  createdAt    DateTime         @default(now())
  updatedAt    DateTime         @updatedAt

  translations FaqTranslation[]

  @@index([topic])
  @@map("faqs")
}

model FaqTranslation {
  id       String @id @default(cuid())
  faqId    String
  locale   Locale
  question String
  answer   Json   // Tiptap — answers usually need lists and links
  faq      Faq    @relation(fields: [faqId], references: [id], onDelete: Cascade)

  @@unique([faqId, locale])
  @@map("faq_translations")
}

model ContactInquiry {
  id          String        @id @default(cuid())
  fullname    String
  email       String
  phone       String?
  inquiryType InquiryType
  otherDetail String?       // only when inquiryType = OTHER
  message     String
  status      InquiryStatus @default(NEW)
  handledAt   DateTime?
  handledById String?
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  handledBy   User?         @relation(fields: [handledById], references: [id])

  @@index([status])
  @@index([inquiryType])
  @@index([createdAt])
  @@map("contact_inquiries")
}
```

`Article.image` is a **file node** (`Json`), matching the `resolveFiles` pipeline used everywhere else — not a bare String as in the source notes.

`FaqTranslation.answer` is Tiptap JSON rather than plain text, since FAQ answers routinely need lists and links. Say so if a plain string is preferred — it is a one-line change while the schema is still on paper.

### B4.6 Members and discounts

**There is no discount entity** (D22). Discounting is exactly what v1 already did:

| Layer | Where | Scope |
| --- | --- | --- |
| Per-product markdown | `Product.discount` → `discountedPrice` (stored column) | one product |
| Store-wide promo | config `promotion_discount`, `promo_type` | every product |
| Member rate | config `member_discount`, `member_type` | every member |

An earlier draft modelled promotions and member discounts as tables so they could target a subset of products or members and carry a validity window. That was dropped: targeted and scheduled campaigns are not something Lindway runs, and the tables brought three problems that vanish with them — the effective price had to be resolved at read time in two separate places (so the price shown could differ from the price charged), the checkout token could not keep per-line snapshots consistent with the signed total, and layered `FIXED` discounts could drive a line negative.

With `discountedPrice` back to being a stored column, listings can sort and filter on the price a buyer actually pays, and the pricing pipeline is v1's again.

`Member` remains, for one reason only:

```prisma
model Member {
  id        String   @id @default(cuid())
  email     String   @unique  // upserted on membership activation (§B6.4)
  fullname  String?
  isActive  Boolean  @default(true)  // false = revoked, without touching order history
  createdAt DateTime @default(now())  // this IS the join date — no separate joinedAt (D21)
  updatedAt DateTime @updatedAt

  orders    Order[]

  @@map("members")
}
```

**`Member` is kept, and `Order.isMember` stays alongside it** (D19) — they answer different questions:

| Question | Answered by | Nature |
| --- | --- | --- |
| Is this person a member **now**? | `Member.isActive` | mutable, revocable |
| Was this order **priced** as a member? | `Order.isMember` | frozen, never rewritten |

Revoking membership by flipping `Order.isMember` across every past order would rewrite history: orders genuinely charged the member price would start claiming otherwise, while `Order.totalPurchased` still holds the discounted figure. `Member` exists so current state and historical record never share a column. `Order.memberId` links the two, so an admin can open a member and see their orders.

The member rate itself is a config value, so `Member` carries no discount fields — it is a registry and a revocation switch, nothing more.

### B4.7 Config parameters after the split

The rule that decides where a setting lives:

> **ConfigParameter** = exactly one value per store, scalar or small JSON, no relations, no lifecycle.
> **Table** = many rows, has relations, targeting, dates, or its own status.

| Group | Keys | Note |
| --- | --- | --- |
| `shipping` | `volume_divider`, `price_per_kg`, `price_per_km`, `base_price`, `min_shipping`, `origin_lat`, `origin_long`, `earth_radius_km`, `shipping_zones` | unchanged |
| `package_dimensions` | `XS`…`XXXL` | **renamed** from `product_dimensions` (D6); now a *default*, overridable per variant |
| `tax` | `tax_rate`, `tax_type` | unchanged |
| `promotions` | `promotion_discount`, `promo_type` | unchanged from v1 — one store-wide promo (D22) |
| `members` | `member_discount`, `member_type` | unchanged from v1 — one member rate (D22) |
| `product_defaults` | `default_notes`, `default_fabric_information`, `default_shipping_delivery`, `default_return_policy` | **new**, each `{ en, id }` Tiptap JSON |
| `store_profile` | `bank_accounts`, contact/social links | **new** — moves the hardcoded bank details out of `payment-step.tsx` (A9.12) |
| `media` | `qris_image` | replaces the old `images` group |

Nothing moves out of config. An earlier draft turned `promotions` and `members` into a `Discount` table; that was reversed (D22).

**Deleted outright:** the `videos` group and its `videos_curated_collection` key, together with the `/curated-collections` page, `video-carousel.tsx`, and the carousel section on the v1 home page (D16). Nothing replaces them. The `VIDEO`/`VIDEOS` `ParameterType` values and the video upload endpoint stay — they are generic and cost nothing to keep.

`origin_lat`/`origin_long` are seeded to Jakarta (`-6.2088`, `106.8456`) while the brand operates from Denpasar. The v2 seed must correct this, **and** the hardcoded fallbacks in `ShippingService` (A9.11).

### B4.8 Orders — renamed from Guest / Cart

**`Guest` becomes `Order`, `Cart` becomes `OrderItem`** (D17). The old names described neither table: `Guest` held the transaction, `Cart` held its line items, and the real shopping cart never touches the database at all — it lives in `localStorage` (F-6). CLAUDE.md previously needed the sentence "Guest *is* the order" to explain itself, which is the tell.

This is safe under D8 because **D8 protects behaviour, not identifiers**: `hashItems`, the 15-minute window, the signing payload, the POST verification order and the stock transaction are all unchanged.

```prisma
model Order {
  id             String @id @default(cuid())
  // Buyer details are a SNAPSHOT of where this order shipped, deliberately not
  // normalised onto Member — the same buyer can ship somewhere else next time.
  email          String
  fullname       String
  whatsappNumber String
  address        String
  postalCode     Int

  memberId String?                       // set when the buyer was a registered member
  isMember Boolean @default(false)       // frozen: this order was priced as a member

  shippingCost   Decimal @db.Decimal(12, 2)
  purchased      Decimal @db.Decimal(12, 2)  // subtotal after per-line discounts
  totalPurchased Decimal @db.Decimal(12, 2)  // grand total, incl. tax and shipping
  totalItemsSold Int

  isPurchased   Boolean       @default(false)  // flipping true decrements stock + soldCount
  paymentMethod PaymentMethod @default(BANK_TRANSFER)
  receiptImage  Json
  instagram     String?
  reference     String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  member Member?     @relation(fields: [memberId], references: [id])
  items  OrderItem[]

  @@index([email])        // member lookup by email runs on every checkout
  @@index([isPurchased])
  @@index([memberId])
  @@index([createdAt])
  @@map("orders")
}

model OrderItem {
  id           String @id @default(cuid())
  orderId      String
  productId    String
  quantity     Int
  selectedSize String  // String, not a FK — feeds hashItems (productId:size:quantity)

  // Price snapshot (D20). Without it a line's price cannot be reconstructed once
  // the discount that produced it expires or is deleted.
  unitPrice Decimal @db.Decimal(12, 2)  // discountedPrice at order time
  lineTotal Decimal @db.Decimal(12, 2)  // unitPrice * quantity

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  order   Order   @relation(fields: [orderId], references: [id], onDelete: Cascade)
  product Product @relation(fields: [productId], references: [id])

  @@index([orderId])
  @@index([productId])
  @@map("order_items")
}
```

Three notes:

- `selectedSize` stays a **String**, not a FK to `Size`. It feeds `hashItems` inside the checkout token, so changing it would alter the signature shape of the one invariant that must not move (D8). Variants are resolved by `(productId, size.code)`.
- The price snapshot exists because `Product.discountedPrice` is mutable — an admin re-pricing a product would otherwise silently rewrite what past orders appear to have charged.
- `Order` gains four indexes it never had. The email one matters most — member lookup by email runs on every single checkout.

`User`, `ConfigParameterGroup`, `ConfigParameter`, and `Location` keep their v1 shape (§A6), with one addition:

```prisma
model User {
  // … unchanged v1 fields …
  handledInquiries ContactInquiry[]   // NEW back-relation (F-47)
}
```

### B4.9 Enums

```prisma
enum Locale        { EN  ID }
enum Role          { SUPER_ADMIN  ADMIN }
enum PaymentMethod { BANK_TRANSFER  QRIS }
enum DiscountType  { PERCENTAGE  FIXED }
enum OrderStatus   { AWAITING_PAYMENT  PAID  SHIPPED  COMPLETED  CANCELLED }
enum InquiryType   { PRODUCT_INQUIRY  ORDER_SUPPORT  CUSTOM_ORDER  WHOLESALE_B2B  PARTNERSHIP  OTHER }
enum InquiryStatus { NEW  IN_PROGRESS  HANDLED  ARCHIVED }
enum ParameterType { TEXT  NUMBER  DECIMAL  BOOLEAN  SELECT  MULTI_SELECT  IMAGE  IMAGES
                     VIDEO  VIDEOS  JSON  TEXTAREA  COLOR  DATE  DATETIME }
```

`Categories` is deleted — replaced by the three taxonomy tables. `PromotionScope`, `MemberScope` and `DiscountKind` appeared in an earlier draft and went with the `Discount` tables (D22).

`DiscountType` keeps exactly its v1 job: it is the shape of the `tax_type`, `promo_type` and `member_type` config values, not a column on any model.

`OrderStatus` is new (D23) — v1 expressed the whole order lifecycle as one boolean.

### B4.10 Table count

**21 models**, up from 7. Five are translation tables — the cost of bilingual content.

| Group | Models |
| --- | --- |
| Access | `User` |
| Taxonomy | *(none — three enums, D25)* |
| Sizing | `Size`, `SizeGuide`, `SizeGuideRow`, `SizeGuideTranslation` |
| Catalog | `Product`, `ProductVariant`, `ProductTranslation` |
| Orders | `Order`, `OrderItem` *(renamed from Guest / Cart)* |
| Members | `Member` |
| Content | `ArticleCategory`, `ArticleCategoryTranslation`, `Article`, `ArticleTranslation`, `Faq`, `FaqTranslation`, `ContactInquiry` |
| Settings | `ConfigParameterGroup`, `ConfigParameter`, `Location` *(unchanged)* |

The full file is assembled and validated at [`docs/schema.v2.prisma`](docs/schema.v2.prisma) — a review copy, kept outside `prisma/` because the Prisma editor extension merges every `.prisma` file in that folder and would report the v1 and v2 models as duplicates. `prisma/schema.prisma` still holds v1 until phase 1 runs.

## B5. Target functional requirements `[TARGET]`

Numbering continues from v1. F-1…F-29 remain unless superseded.

### B5.1 Catalog & discovery
- **F-30 Localized routing** — `/[lang]/…`, dictionary-driven static copy, language switch preserving the current path.
- **F-31 Taxonomy filtering** — branding, audience and garment come from enums and `taxonomy.ts`; there is no admin CRUD for them (D25).
- **F-32 Multi-axis product filtering** — listings filter by branding, audience, garment, and combinations.
- **F-33 New Arrivals** — `releasedAt` descending, distinct from `createdAt`.
- **F-34 Best Sellers** — `bestSellerRank` ascending, then `soldCount` descending.
- **F-35 Wishlist** — `localStorage` only, mirroring the `useCart` store; header counter; no backend (D11).
- **F-36 Branding page favorites** — products with `isFavorite` surface on their branding page.

### B5.2 Product content
- **F-37 Size & variant management** — pick a size guide, then set quantity and package dimensions per size in that guide.
- **F-38 Size guide reuse & fork** — reuse an existing guide, or edit the measurements and save as a new guide.
- **F-39 Tiptap content fields** — description, notes, fabric information, shipping & delivery, return policy, all per locale.
- **F-40 Global content defaults** — the four defaults live in `product_defaults`; a product only stores overrides (D9).
- **F-41 Public size guide page** — lists published guides.

### B5.3 Journal & FAQ
- **F-42 Article CRUD** with categories, draft/publish via `publishedAt`, featured flag, and translations.
- **F-43 Journal listing & detail** at `/[lang]/journal`.
- **F-44 FAQ CRUD** grouped by `topic` so one component serves several pages.

### B5.4 Contact
- **F-45 Contact form** — full name, email, phone (optional), inquiry type (6 radio options: Product Inquiry, Order Support, Custom Order, Wholesale/B2B, Partnership, Other), a textarea revealed when Other is chosen, and a message. The v1 tab concept (General / Partnership / Career) is dropped.
- **F-46 Dual notification** — Resend email to the customer (acknowledgement) and to the admin (new inquiry).
- **F-47 Contact inbox** — a dedicated admin section (`/admin/dashboard/inquiries`) for managing incoming inquiries, not just an email relay. It lists inquiries with pagination and the shared list-query convention, filters by `status` and `inquiryType` plus the usual date filters, searches name/email/message, opens a detail view with the full message, and transitions `status` (`NEW → IN_PROGRESS → HANDLED`, or `ARCHIVED`). Moving to `HANDLED` stamps `handledAt` and `handledById` from the authenticated admin. Unread count (`status = NEW`) shows as a sidebar badge.

### B5.5 Pricing
- **F-48 Member registry** — `Member` rows created on membership activation, listable and searchable by admin, revocable via `isActive` without touching order history (D19).
- **F-49 Single pricing helper** — one `resolveUnitPrice` used by listings, product detail, cart and checkout. Two implementations would let the price shown drift from the price charged.
- **F-50 Order lifecycle** — admin drives `OrderStatus` and records a tracking number; cancelling stamps `cancelledAt` (D23).
- **F-51 Server-computed subtotal** — the checkout GET derives the subtotal from database prices instead of trusting the client (fixes A9.1).
- **F-55 Line-level price snapshot** — every `OrderItem` records `unitPrice` and `lineTotal` at order time, so an order stays explainable after the product is re-priced.
- **F-56 Invariant check script** — `npm run db:check` reports violations of the four rules Prisma cannot express (§B4 preamble). With no test framework in the repo, this is the only automated guard.

### B5.6 Security fixes carried by v2
- **F-52** `POST /api/auth/register` requires `SUPER_ADMIN` and ignores a client-supplied `role` escalation.
- **F-53** File upload and delete endpoints require `checkAuth`.
- **F-54** Signing secrets move off the `NEXT_PUBLIC_` prefix, with no hardcoded fallback — startup fails loudly if unset.

## B6. Target flows `[TARGET]`

### B6.1 Product content resolution

```
render field (locale L)
  → ProductTranslation[L].field            if present
  → ProductTranslation[en].field           if present
  → config product_defaults[field][L]      if present
  → config product_defaults[field].en
```

One helper implements this for all four content fields. `name` and `description` have no global default, so their chain stops at EN.

### B6.2 Package dimension resolution

```
ProductVariant.packageDimensions                    per product × size
  → config package_dimensions[size.code]            store-wide default
    → 404 "Dimensions for size X not found"
```

`ShippingService.getProductDimensionsBySize(size)` becomes `getPackageDimensions(productId, sizeCode)`.

### B6.3 Price pipeline — the two frozen-zone exceptions

The token invariant is unchanged and strengthened: **prices reach `Order` only from the signed token.** What changes is how the signed numbers are produced.

```
for each cart line:
    unit = product.discountedPrice     ← stored column, the product's own markdown
    line = unit × quantity
subtotal = Σ line                      ← computed server-side from the DB (F-51)
         − member_discount             ← config rate, if the buyer is an active Member
         + tax                         ← config rate
         + shippingCost
sign token { shippingCost, totalPurchased, purchased, totalItemsSold, itemsHash, expiresAt }
```

This is v1's arithmetic (§A5.1 step 7). Only **one** thing changes, and it is the fix for gap A9.1:

> `GET /api/orders/checkout` stops accepting `purchased` and `totalItemsSold` from the client and derives them from database prices. Everything else — `hashItems`, the 15-minute window, HMAC signing, the POST verification order, the stock transaction — stays byte-identical.

Because `discountedPrice` is a stored column rather than something resolved per request, there is no second place where a price could be computed differently, and no way for a line snapshot to disagree with the signed total. Both of those were real risks in the `Discount`-table draft; dropping it removed them (D22).

`logCalculation` keeps its v1 coverage.

### B6.4 Membership

Unchanged from v1 in behaviour, with the endpoint renamed alongside the model (`PATCH /api/orders/membership/[id]`) and one addition: activation upserts a `Member` row by email and links it back via `Order.memberId`, so admins can target that member later and see their order history.

## B7. Open questions `[OPEN]`

Do not guess these; ask.

1. **`/our-world` content** — deferred pending client confirmation (D13). The route exists as a placeholder; do not design its data model until the answer arrives.
2. **`Order.instagram` / `Order.reference`** — two optional v1 attribution columns ("how did you hear about us"). Still collected, or dropped? Cosmetic either way; decide before the seed is written.
3. **`ConfigParameter.validation`** — only `validation.options` is ever read (it fills SELECT dropdowns). The min/max/required rules stored there are never enforced anywhere. Keep the loose `Json`, or narrow it to an `options` column?
4. **`User.username`** — `email` and `username` are both unique and login accepts either. Two identity columns for one person.
5. **Who designs the public v2 pages** — the admin has its own design system now (§C2), but the storefront does not. Three readings of "semua UI page nyaa dari saya", and they lead to different work: (a) designs already exist and should be implemented as given; (b) designs are coming later, so build the pages structurally correct and visually plain; (c) design them here from the palette and type scale. **Phase 2b is blocked on this** — building a visual treatment that is then replaced is the one genuinely wasted outcome.

---

# PART C — Migration plan

Each phase ends with `npx tsc --noEmit` clean, `npm run build` clean, and the affected flow exercised by hand. Move the phase's sections from `[TARGET]` to `[SHIPPED]` and delete the superseded Part A text before starting the next one.

**Lint has a pre-existing baseline that v2 did not create.** `npm run lint` reported 10 `react-hooks/set-state-in-effect` errors on the pre-v2 commit. None were introduced since; deleting v1 files removed 7, and the admin rewrite fixed `config-field.tsx` and `useSearchPagination.ts` by deriving during render instead of syncing in an effect. **1 remains** — `carts/cart.tsx`, which phase 2/3 rewrites. Restore "lint clean" as the gate once it goes.

**The database is dropped and rebuilt, not migrated (D-note).** There is no production data to preserve, so phase 1 runs `npm run db:reset` and reseeds. Confirm before running it — it is destructive and irreversible.

| Phase | Scope | Rationale |
| --- | --- | --- |
| **0b — Teardown** ✅ **DONE** | Delete the v1 UI the new model cannot feed: per-brand listings, product detail and card, hardcoded size guide, admin product forms, the static contact page, `static/categories.ts`, and the dead `lib/redis.ts` · size-guide measurements lifted to `prisma/seed-data/size-guides.ts` before deletion · deleted routes replaced with placeholders | 27 files removed. Everything kept is either frozen-zone code or schema-neutral |
| **0 — Foundation** ✅ **DONE** | `[lang]` routing + dictionaries · design tokens (`#BA8164`, `#39322C`, `#FAF6F5`, `#F7F3F0`, `#D2D2CA`) · Raleway + Inter via `next/font/google` · new header/footer shell · `tiptap-editor.tsx` shared component · delete `/curated-collections` and `video-carousel.tsx` (D16) | Touches every file. Doing it later means redoing every other phase |
| **1 — Data model** ✅ **DONE** | Drop and rebuild the schema: taxonomy enums, Size/SizeGuide/Variant, Product + translations, Order/OrderItem, Member, content models · apply `product-stock.sql` · new seed · `resolveTranslation` + `resolveUnitPrice` helpers · `db:check` · assert `taxonomy.ts` keys match the Prisma enums · admin CRUD for sizes and size guides | Everything downstream depends on these tables |
| **2a — Admin catalog** ✅ **DONE** | Admin design system (§C2) · product list with search, taxonomy filters, grid/list and paging · product form: size guide → variants → package dimensions, images, 5 Tiptap fields behind an EN\|ID tab · product **soft delete** (A9.13) | No dependency on the public design, and nothing else can be built against an empty catalog |
| **2b — Public catalog** | Listings per axis, product detail, New Arrivals, Best Sellers, wishlist | **Blocked on the v2 visual design** — see §B7.5 |
| **3 — Orders & pricing** | Member registry, `OrderStatus` + tracking number in the admin order screen, server-computed subtotal (F-51), line snapshot (F-55) | Touches the checkout path, so it runs alone |
| **4 — Content** | Journal, FAQ, Contact form + inbox, public size guide page | Independent of 2 and 3; can run in parallel if needed |
| **5 — Hardening** | F-52…F-54 security fixes, `DELETE /api/orders/[id]` (A9.6), Denpasar origin coordinates, seed corrections | Deliberately last so it is not lost in the churn |

Phase 1 also carries the D17 rename (`Guest`→`Order`, `Cart`→`OrderItem`, `/api/guests/*`→`/api/orders/*`, `guestsApi`→`ordersApi`). It touches ~15 files, all mechanical, and most of them are being rewritten in that phase anyway for the variant-stock change.

Phases 0 and 1 must not be split — both touch the whole tree, and a half-migrated schema means doing the work twice.

## C1. Phase 1 work order

Phase 1 has to flip the schema, three type files, six API routes and one admin screen **in one go**. There is no test framework, so a route that gets missed is only discovered when someone exercises that flow by hand — possibly weeks later. This is the checklist; work it in order.

`prisma/schema.prisma`, `src/types/zod.ts`, `src/types/api.ts` and `src/utils/api.ts` are deliberately still v1 at the start of this phase. They are not leftovers: they define the contract that the running system speaks, and 16 files depend on them, including the whole checkout subsystem. They cannot move before the schema does.

**1 — Database** ✅ **DONE**

Schema applied, database rebuilt, trigger installed, seed rewritten. Current contents: 2 users · 23 sizes · 45 config parameters in 8 groups · 4 published size guides (37 rows) · 6 products with 27 variants and 10 translation rows.

All four §B4 invariants verified clean against the live database, and the stock trigger confirmed working — `products.stock` matched `SUM(variants.quantity)` for every row without the seed ever writing that column.

Translation coverage is deliberately uneven so the per-field fallback chain (§B3.2) can actually be exercised rather than assumed: two products full EN+ID, two with an ID name but no ID description, two EN-only.

**2 — Contract**

| File | Change |
| --- | --- |
| `types/zod.ts` | Drop `CategoriesEnum`. `ProductSchema` loses `name`/`description`/`notes`/`sizes`/`category`/`productionNotes`, gains `branding`/`garment`/`audiences`/`slug`/`releasedAt`/variants/translations. `GuestSchema` → `OrderSchema` + `status`/`trackingNumber`. `ShippingCalculateSchema` stops accepting `purchased` and `totalItemsSold` (F-51). New: `SizeSchema`, `SizeGuideSchema`, `ArticleSchema`, `FaqSchema`, `ContactInquirySchema` |
| `types/api.ts` | Drop the `Categories` enum. `Product` carries translations + variants. `Guest`/`CreateGuest`/`EditGuest` → `Order`/`CreateOrder`/`EditOrder`. `DashboardData` becomes per-branding instead of three hardcoded fields |
| `utils/api.ts` | `guestsApi` → `ordersApi`, `guestCheckoutApi` → `orderCheckoutApi`, paths `/guests/*` → `/orders/*` |

**3 — Server**

| File | Change |
| --- | --- |
| `api/products/route.ts`, `[id]/route.ts` | Filter by `branding`/`garment`/`audiences`; search joins `ProductTranslation` on the active locale **plus EN** (§B3.3); write variants + translations; never write `stock` (D24) |
| `api/dashboard/route.ts` | Delete `$queryRawUnsafe`; Prisma `groupBy` over variants by branding (closes A9.5) |
| `api/guests/*` → `api/orders/*` | Rename. Stock check and decrement read `ProductVariant`. `soldCount` increments in the same transaction. `OrderItem` gets `unitPrice`/`lineTotal`. Checkout GET derives the subtotal server-side |
| `services/shipping.ts` | `getProductDimensionsBySize(size)` → `getPackageDimensions(productId, sizeCode)` (§B6.2) |

Untouched: `api/auth/*`, `api/locations/*`, `api/config/*`, `api/files/*`.

**4 — Client**

| File | Change |
| --- | --- |
| `hooks/useCart.ts` | Group by `branding` instead of `category`; the cart item shape follows `ProductTranslation` |
| `components/ui/carts/*` | `CreateGuest` → `CreateOrder` in `order-summary`, `checkout-form`, `payment-step`, `complete-step` |
| `admin/guests-dashboard.tsx` + `slicing/guests-lists.tsx` | Become the Order screen: `status`, `trackingNumber`, `OrderItem` snapshots |

**5 — New in this phase** ✅ **DONE**

- `resolveTranslation` (§B3.2) and `resolveUnitPrice` (F-49) — one implementation each, before anything computes a price or a label twice.
- **`npm run db:check`** (F-56) — seven checks over the §B4 invariants, exiting non-zero so it can gate a deploy. Each one names the failure it prevents rather than just the rule it enforces.
- **Taxonomy drift guard.** `src/static/taxonomy.ts` now imports its key types from `$Enums` and const-asserts its arrays, so a value added to a Prisma enum but forgotten here is a compile error naming the missing key (`MISSING_FROM_TAXONOMY_TS: "LINDWAY_AWP"`). The first attempt used `Object.fromEntries(...) as Record<T, …>`, which silently type-asserted its way past the very drift it was meant to catch — verified by deleting an entry and watching it still compile.
- **Admin CRUD** for `Size` (`/admin/dashboard/sizes`) and `SizeGuide` (`/admin/dashboard/size-guides`), with the sidebar regrouped per §B2.3.

Two guards in the size API worth knowing about, because both prevent a failure the admin would otherwise only see from a buyer:

- Creating a size whose `code` has no `package_dimensions` entry **succeeds with a warning** rather than failing. Refusing would block a legitimate workflow; staying silent would mean checkout 404s for that size later.
- Renaming a size code is **refused** once variants use it. The code is stored as a string on `OrderItem.selectedSize` and is the key into `package_dimensions`, so renaming breaks both retroactively.

The size guide screen lists, publishes and deletes but does not create. Authoring belongs on the product form (F-38: pick a guide, adjust it, save as new), which is phase 2 — duplicating that editor here would give two places to maintain.

**Green checkpoint** ✅ **MET.** `npx tsc --noEmit` clean, `npm run build` clean, lint back to its 3-error baseline, and a checkout driven end to end: calculate → order → admin verifies → stock and `soldCount` both moved.

`npm run smoke:checkout` (`scripts/smoke-checkout.mjs`) is that run, kept because it is the only automated coverage of the pricing path this repo has. Point it at a running dev server. It asserts:

- the subtotal is derived from database prices, and an injected `purchased=1` is ignored (A9.1);
- the total stored on `Order` equals the total signed into the token;
- `OrderItem` carries a `unitPrice`/`lineTotal` snapshot;
- verification decrements the variant, `products.stock` follows via the trigger, and `soldCount` rises;
- `status` moves `AWAITING_PAYMENT → PAID`.

**It earned its keep immediately by catching two bugs that typechecked cleanly:**

1. `resolveTranslation` spread the translation row's own `id` over the product's, so every product came back carrying its EN translation's id. Checkout then rejected every cart with "product no longer available". Identity fields (`id`, `locale`, `*Id`) are now stripped before merging.
2. **Zod's `.partial()` does not remove `.default()`** — a latent v1 defect, inherited. `UpdateOrderSchema.parse({ isPurchased: true })` returned `{ isPurchased, isMember: false, status: "AWAITING_PAYMENT", paymentMethod: "BANK_TRANSFER" }`, so verifying a QRIS order silently reset it to bank transfer and cleared the member flag. `UpdateProductSchema.parse({ price })` likewise wiped `audiences` and `isFavorite`. Defaults are gone from the base schemas; Prisma's `@default` already covers create.

A third fix came out of the same run: money is rounded with `toRupiah` before signing. The shipping formula produced `18101.6500411588`, which the token signed in full while `Decimal(12,2)` stored `18101.65` — the signed and stored totals disagreed.

The Collections mega-menu was built in phase 0 against a placeholder list, on the assumption that phase 1 would swap it for a database query. That swap will never happen — D25 made the taxonomy static, so `src/static/taxonomy.ts` **is** the final source, and the menu is already complete.

## C2. Admin design system `[SHIPPED]`

Every admin screen composes from one kit rather than inventing its own chrome. Build new screens out of these; do not hand-roll a table, a filter bar or a form control.

| File | Provides |
| --- | --- |
| `slicing/ui.tsx` | `PageHeader`, `SectionHeading`, `BlockHeading`, `Panel`, `StatGrid`/`Stat`, `TableShell`/`Th`/`Td`, `Badge`, `Chip`, `RowAction`, `AdminButton`, `AdminLinkButton`, `ConfirmDialog`, loading/error/empty states |
| `slicing/form.tsx` | `FormLayout`, `FormSection`, `FieldRow`, `FormActions`, `Field`, `TextInput`, `TextArea`, `SelectInput`, `CheckboxGroup`, `RadioGroup`, `Toggle`, `RichTextField`, `LocaleTabs` |
| `slicing/toolbar.tsx` | `ListToolbar`, `SearchBar`, `FilterDropdown`, `ViewToggle`, `DataPagination`, `ResultCount` |

**The language.** Uppercase letterspaced micro-labels, hairline rules instead of card borders, square corners (`rounded-sm`), Raleway for headings and labels. `body` (#39322C) carries solid fills — the active nav item, the primary button; `primary` (#BA8164) is the accent only — eyebrows, links, active marks, chart series. Blue and slate are gone; the legacy `btn-blue`/`btn-gray` aliases in `globals.css` now render on-palette so untouched v1 components do not look foreign.

`--color-sidebar` is the one derived value: `#f7f3f0` against `#faf6f5` is too close to read as a separate surface, so the sidebar blends `footer` toward `light`.

**List screens** put search, filters, view mode and page in the URL via `useSearchPagination`, so a filtered view is shareable and survives a refresh. Pass `filterKeys` for the params that screen filters on.

**Create/edit are pages, not modals** — `…/create` and `…/[id]/edit`, with a `FormActions` bar pinned to the viewport. `LocationForm` and `ProductForm` are the two worked examples.

**Loading a record into form state happens during render**, guarded by a `loadedId` comparison — never in an effect. An effect re-runs on every background refetch and discards whatever the admin has typed.

## C3. Phase 2a work order `[SHIPPED]`

The admin catalog, built on §C2. Verified by driving the real API: create → read back → edit → delete, with the image moving out of temp, the stock trigger recomputing after a variant was dropped, `discountedPrice` recomputed server-side, and the ID locale falling back to EN field by field.

- **Product list** — search over name/SKU/slug, filters for branding, garment, audience, status and sort, grid/list, paging. `isActive` is only sent when the admin filters on it: the admin list must show inactive products, so an unfiltered list is the whole catalog.
- **Product form** — `ProductImages` (temp upload, reorder, first is primary), `ProductVariants` (size guide → offered sizes → quantity + optional per-variant packaging), `ProductContent` (EN\|ID tabs, name + 5 Tiptap fields).
- **The size guide constrains the variant list.** With a guide selected, only its rows' sizes are offered, which is how the §B4 invariant is enforced — by not offering anything else. Changing the guide drops variants the new one does not contain. Without a guide the invariant does not apply and the full active size list is offered.
- **A size whose `code` has no `package_dimensions` entry is flagged inline**, because that is a checkout 404 the buyer would otherwise discover.
- **`stock` is never submitted** (D24), and neither is `discountedPrice` — the server derives it from `price` and `discount`.

One contract limit worth knowing: `ProductTranslationSchema` requires `name` on every translation row, so an ID row carrying only a description cannot be submitted. The form asks for an ID name whenever any other ID field is filled. Copying the EN name in renders identically to the per-field fallback, so nothing is lost — but if per-field ID-without-name is wanted, the schema is where it would change.

**One defect fixed across the whole API.** Handlers end `catch (error) { … message: error }` (§E3). An `Error` has no enumerable own properties, so it serialized to `{}` — every 500 reached the admin as an empty toast while the log held the real cause. `errorMessage(error)` from `@/lib` now wraps those 38 sites. The response shape is unchanged.

---

# PART D — Locked decisions

Agreed in discussion. Do not reopen without a new decision recorded here.

| # | Decision | Rationale |
| --- | --- | --- |
| **D1** | Size guide is one model with title, description, per-size rows, flexible JSON parameters, and draft/publish via `publishedAt`. The public page is a **flat list** — no grouping field | Same entity serves the public page and per-product assignment. A flat list keeps grouping a matter of naming and ordering, so new categories need no schema change |
| **D2** | i18n covers static UI, Article, FAQ, Product, and size guides. Branding/audience/garment labels are **not** translated | Brand and category names read the same in both languages |
| **D3** | Product ID translations are optional with **per-field** fallback to EN. Admin UI is EN-only and outside `[lang]`. Order emails are EN-only | Admin can publish in EN and translate later without blocking |
| **D4** | Public URLs use a single non-localized `slug`; admin URLs use `id` | Better SEO, and the URL survives a language switch |
| **D5** | One branding (required), one garment, many audiences | Supports unisex products without over-modeling |
| **D6** | `product_dimensions` → `package_dimensions`. Body measurements live on `SizeGuideRow`; package dimensions live on `ProductVariant`, defaulting to config | Measurements belong to the pattern and are shared; packing belongs to the individual product. Storing packing on the guide would force a fork of the whole guide on every dimension tweak and fill the database with near-duplicates |
| **D7** | All models use `cuid()` | Matches the existing codebase; overrides the `uuid()` in the source notes |
| **D8** | Checkout token, shipping/zone calculation, order lifecycle, upload pipeline, config parameters, guest checkout, membership, logging, auth, and handler conventions are preserved — except the two exceptions in §B6.3 | The pricing path is the most delicate code in the repo |
| **D9** | Four content fields have global `{ en, id }` defaults in config; products store only overrides, resolved through a four-level chain | Admin edits the default once instead of filling every product |
| **D10** | Tiptap stores **JSON**, through one shared `tiptap-editor.tsx` | Structured storage; one component keeps behavior consistent |
| **D11** | `isFavorite` keeps its v1 meaning (admin-featured, shown on the branding page). Wishlist is `localStorage`-only. Our Fabrics stays static, moving to `/about/our-fabrics` | Wishlist is per-visitor and cannot reuse a shared product flag |
| **D12** | Config holds singleton settings only; anything with relations, targeting, dates, or status becomes a table | Multiple promotions and targeted member discounts cannot be modeled as key-value pairs |
| **D13** | Journal appears both as a top-level menu and under About (intentional). `/our-world` is a placeholder. New Arrivals uses `releasedAt`; Best Sellers uses automatic `soldCount` plus a manual `bestSellerRank` | Confirmed with the client |
| **D14** | Raleway + Inter via `next/font/google`; the full palette is replaced. Alethia Next OTF files stay in `public/fonts` but are unused | v2 is an intentional visual overhaul; keeping the old font files is cheaper than restoring them |
| **D15** | Contact Inbox is a standalone top-level admin menu with full inquiry management (filter, search, detail, status transitions), not an email relay and not a Content sub-item | It is a daily work queue, not authored content; status tracking is what makes an inquiry not get dropped |
| **D16** | The Collections header menu is a three-column mega-menu over branding, audience and garment. Curated Collections is deleted — page, component, home-page section, and the `videos_curated_collection` config key | It gives garment and audience listings a header entry point instead of footer-only. *(The original rationale — "a new branding appears without a deploy" — no longer holds: D25 made the taxonomy static.)* |
| **D17** | `Guest` → `Order`, `Cart` → `OrderItem`, and the endpoints follow (`/api/guests/*` → `/api/orders/*`) | Neither name described its table. The real shopping cart is `localStorage` and never reaches the database, so a table called `Cart` holding order lines actively misleads. Renaming is safe because D8 protects behaviour, not identifiers — and doing it during the phase-1 rewrite costs nothing extra |
| ~~**D18**~~ | ~~`Promotion` and `MemberDiscount` collapse into one `Discount` table~~ | **Superseded by D22** — the tables themselves were dropped |
| **D19** | `Member` is kept alongside `Order.isMember`, linked by `Order.memberId` | They answer different questions. Revoking membership by flipping `isMember` across past orders would rewrite history — orders genuinely charged the member price would start claiming otherwise while their stored totals said the opposite. Current state and historical record must never share a column |
| ~~**D20**~~ | ~~Discounts layer, with clamps and a ceiling~~ | **Superseded by D22.** The layering it guarded against no longer exists. The `OrderItem` price snapshot survives, simplified to `unitPrice` + `lineTotal` |
| **D22** | **No `Discount` entity.** Discounting is `Product.discount` → `discountedPrice`, plus the v1 config groups `promotions` (store-wide) and `members` (member rate). Targeted and scheduled campaigns are out of scope | The tables bought targeting and validity windows that Lindway does not run, and cost three real risks: the effective price had to be resolved at read time in two places, so the price shown could differ from the price charged; the token carried only aggregates, so per-line snapshots could contradict the signed total; and layered `FIXED` discounts could drive a line negative, surfacing as a meaningless validation error after the buyer had already uploaded a receipt. Keeping `discountedPrice` a stored column also keeps price sorting and filtering in SQL |
| **D23** | `Order` gains `status` (`OrderStatus`), `trackingNumber` and `cancelledAt`. `isPurchased` stays beside `status`. `ContactInquiry` gains `handlingNote`; `Article` gains `authorId` | v1 expressed the whole order lifecycle as one boolean — no way to say cancelled or shipped, and nowhere to put the tracking number the storefront already promises buyers. `isPurchased` is kept because it is what triggers the stock and `soldCount` transaction, and moving that would touch the frozen zone. `handlingNote` records *how* an inquiry was resolved, which `HANDLED` alone does not |
| **D25** | Branding, audience and garment are **Prisma enums**, not tables. Display data (label, slug, description, hero image, order, `isActive`) lives in `src/static/taxonomy.ts`. `ProductAudience` is replaced by an `AudienceType[]` array on `Product` | Removes three tables, one join table, and three admin CRUD screens. The cost is real and accepted: adding a value needs a migration plus a deploy, and per-branding hero copy is no longer editable by an admin. Justified because the axes are stable — the two brandings still to come are already in the enum, and Lindway does not add garment types often |
| **D24** | `Product.stock` is maintained by a Postgres trigger (`prisma/triggers/product-stock.sql`), not by application code | It is the number that gates overselling. A trigger makes drift structurally impossible rather than merely unlikely — any write path that forgot to recompute would otherwise let the store sell stock it does not have, silently. Consequence: application code must never write `stock` |
| **D21** | Field audit removed seven columns that produced nothing: `code` on the three taxonomy tables *(since superseded — the tables themselves are gone, D25)*, `SizeGuide.isActive`, `SizeGuideRow.order`, `Product.productionNotes`, `Member.joinedAt`. Ruling principle: **`isActive` is a manual switch, `publishedAt` / date windows are a schedule** — a model needs both only when it needs both behaviours | Each removal deleted a second source of truth: `code` duplicated `slug`, `isActive` beside `publishedAt` had no defined combination, a row `order` could contradict `size.order`, `productionNotes` duplicated the translated `notes`, and `joinedAt` duplicated `createdAt` |

---

# PART E — Conventions (apply to both versions)

## E1. Commands

```bash
npm run dev            # dev server (localhost:3000)
npm run build          # production build
npm run lint           # eslint (flat config, next/core-web-vitals + next/typescript)
npx tsc --noEmit       # typecheck — no npm script for this

npm run db:generate    # regenerate Prisma client into generated/prisma
npm run db:migrate     # prisma migrate dev
npm run db:seed        # tsx prisma/seed.ts
npm run db:studio      # prisma studio
npm run db:reset       # migrate reset --force (DESTRUCTIVE — confirm first)
npm run db:trigger     # apply prisma/triggers/product-stock.sql
npm run smoke:checkout # drive a real checkout against a running dev server
npm run db:check       # report violations of the §B4 invariants (exits 1 on failure)
```

**`prisma/migrations/` is gitignored**, so migration history does not survive a fresh clone and a hand-edited migration would be lost. Anything the schema cannot express therefore lives in a tracked file and is applied explicitly after migrating — `npm run db:trigger`, which is idempotent and also backfills existing rows, so the order it runs in does not matter.

It goes through `prisma/apply-sql.mjs` rather than `psql`, which is not installed in every environment this repo is developed in; `pg` already is.

**Prisma 7 blocks destructive commands run by an AI agent.** `migrate reset` and `migrate dev` require `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION` set to the exact text of the user's consent, and Prisma explicitly does not accept earlier messages as consent. Ask for a fresh confirmation each time.

**Full rebuild sequence:**

```bash
npm run db:reset      # drops everything
npm run db:migrate    # recreates the schema
npm run db:trigger    # stock trigger + backfill
npm run db:seed
```

**There is no test framework installed** — no runner, no test files. Verification is `npx tsc --noEmit` + `npm run lint` + exercising the flow by hand.

`generated/prisma` is gitignored, so a fresh clone must run `npm install` → `npm run db:generate` before `npm run dev`, or `prisma-client/client` will not resolve. Prisma is configured via `prisma.config.ts` (not `package.json`); the schema's `datasource` has no `url`, so `DATABASE_URL` is injected from that file. After editing `prisma/schema.prisma`, run `db:generate` or type errors will be stale and misleading.

## E2. Environment variables

`DATABASE_URL`, `NEXT_PUBLIC_BASE_URL`, `NEXT_PUBLIC_JWT_SECRET`, `NEXT_PUBLIC_CHECKOUT_TOKEN`, `NEXT_PUBLIC_UPLOADS_PATH`, `RESEND_API_KEY`, `RESEND_EMAIL_FROM`, `CRON_SECRET`.

The two signing secrets lose their `NEXT_PUBLIC_` prefix in phase 5 (F-54). Do not add new secrets with that prefix.

## E3. API handler shape

Match this in every route:

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

Responses are always `{ success, message?, data?, pagination? }`. List endpoints share the query convention `page`, `limit`, `search`, `order`, `year`, `month`, `dateFrom`, `dateTo`, parsed by a `*QuerySchema`.

**Always pass a caught error through `errorMessage()` from `@/lib`** rather than putting it in the body directly. `JSON.stringify(new Error("…"))` is `{}`, so `message: error` reaches the client empty and the admin sees a toast with nothing in it.

## E4. Client data layer

`src/utils/api.ts` is the single axios + TanStack Query layer — grouped objects (`productsApi`, `guestsApi`, `guestCheckoutApi`, `configParametersApi`, `locationsApi`, `dashboardApi`, `filesApi`) exporting hooks. Mutations already raise `react-hot-toast` on success and error and unwrap array-shaped Zod responses into a newline-joined message; **do not re-toast at the call site**. Default `staleTime`/`gcTime` are 6 hours; queries retry 3×.

Two state stores, deliberately different: `useAuth` is Zustand; `useCart` is the hand-rolled subscribe store (F-6), and `useWishlist` will mirror it. `src/lib/redis.ts` is entirely commented out and `ioredis` is unused — there is no server-side caching layer.

## E5. Imports & types

Barrel exports throughout — import from `@/lib`, `@/utils`, `@/types`, `@/services`, `@/components`, `@/hooks` rather than deep paths, and add new files to the matching `index.ts`. Zod schemas and their inferred types live in `src/types/zod.ts`; `Create*` / `Update*` variants derive from a base schema via `.omit()` / `.partial()`.

Always read configuration through `ConfigService` (`@/services`), never with raw Prisma queries.

## E6. Style

- No Prettier, but consistent: ~200-char lines, double quotes, semicolons, a blank line between import groups (framework → third-party → `@/` aliases).
- Tailwind v4 (`@tailwindcss/postcss`, no `tailwind.config`); theme tokens live in `src/app/globals.css` under `@theme inline`.
- `react-icons` for icons; `framer-motion` through the `motion` wrapper in `src/components/motion.tsx`.
- Larger UI is a container in `src/components/ui/<feature>/` plus a `slicing/` subfolder for its parts.
- Admin screens compose from the kit in §C2 — do not hand-roll tables, filter bars, buttons or form controls there.
- `next.config.ts` has `output: "standalone"` deliberately commented out — leave it unless deployment changes.
- Tiptap content is admin-authored HTML/JSON rendered into public pages: **sanitize on render**. A compromised admin account otherwise executes script in every visitor's browser.
