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

Ordered by severity. Items marked **→ fixed in v2** are addressed by the revision; the rest remain open.

1. **Client-supplied subtotal is signed unchecked** — `GET /api/guests/checkout` takes `purchased` from the query string and signs it into the token without comparing it to database prices. A buyer can pay an arbitrary total. `itemsHash` does not cover price. **→ fixed in v2 (§B6.3).**
2. **`POST /api/auth/register` is unauthenticated and accepts `role`** — anyone reaching the API can create a `SUPER_ADMIN`. **→ fixed in v2 (§B5.6).**
3. **Secrets in the client bundle** — `NEXT_PUBLIC_JWT_SECRET` and `NEXT_PUBLIC_CHECKOUT_TOKEN` are server-side signing secrets, but the `NEXT_PUBLIC_` prefix inlines them into the browser bundle. Both fall back to hardcoded defaults (`"lindway"`, `"default_secret_for_checkout_token"`). **→ fixed in v2 (§B5.6).**
4. **Upload and delete endpoints are unauthenticated** — no `checkAuth`; delete is constrained only by an upload-directory containment check. **→ fixed in v2 (§B5.6).**
5. **`GET /api/dashboard` interpolates `year`/`month` into `$queryRawUnsafe`** — admin-gated but still raw interpolation. **→ removed in v2 (§B4.4).**
6. **`guestsApi.useDeleteGuests` calls `DELETE /api/guests/[id]`, which does not exist** — returns 405.
7. **Overselling window** — stock checked at creation, decremented only at verification (§A5.3).
8. **Admin dashboard guard is client-side only.**
9. **Uploads served outside Next's static pipeline by default** — a misconfigured deployment yields broken image URLs rather than an error.
10. **No `SUPER_ADMIN`-gated route exists** despite the hierarchy.
11. **Missing shipping config rows fail silently** into hardcoded defaults, so a partially-seeded database produces plausible but wrong prices.
12. **Bank account details are hardcoded** in `payment-step.tsx` instead of living in config. **→ fixed in v2 (§B4.7).**

---

# PART B — Target design (v2)

## B1. What v2 changes

Five shifts, in order of blast radius:

1. **Bilingual (EN/ID)** — every public route moves under `/[lang]/`, and translatable content moves into per-entity translation tables.
2. **Taxonomy replaces the category enum** — three independent admin-managed axes (branding, audience, garment) instead of one enum.
3. **Sizes become relational** — a `Size` master plus `ProductVariant` per product×size, with reusable size guides.
4. **Pricing gains real promotion and member-discount entities** — multiple concurrent promotions, product targeting, member targeting. This forces the price pipeline to become per-line.
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

**Collections is a three-column mega-menu** driven entirely by the taxonomy tables (D16) — no hardcoded lists:

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

Each column renders `isActive` rows ordered by `order`, so adding a branding or garment type appears in the nav without a deploy. This is also how garment and audience listings become reachable from the header, not just the footer.

**Footer** — four columns: Collections (5 brandings) · Shop (New Arrivals, Best Sellers, Dresses, Tops, Skirts, Kids, Men) · Customer Care (Size Guide, How to Shop, Shipping & Delivery, Return & Exchanges, Care Instructions, Contact Us, FAQ) · About (Our Story, Our Production, Our Artisan, Sustainability, Our Fabrics, Journal).

Both content pages moved home relative to v1: `/contact-us` now lives under Customer Care, and `/our-fabrics` under About.

> **`[OPEN]`** Garment and audience listings are reachable only from the footer. For a fashion store that is usually the primary shopping path. Confirm whether the header needs a Shop entry.

### B2.3 Admin navigation

The sidebar grows past a flat list and is grouped:

```
Overview   Dashboard
           Contact Inbox        ← standalone top-level item, badge = count of status NEW
Catalog    Products · Branding Types · Audience Types · Garment Types · Sizes · Size Guides
Sales      Orders · Members · Promotions · Member Discounts
Content    Articles · Article Categories · FAQ
Settings   Parameters · Locations
```

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

**One invariant Prisma cannot express:** every translatable entity must always have an `EN` translation row; `ID` is optional (D3). Enforce this in the service layer on create — the whole fallback chain assumes EN exists.

### B4.1 Taxonomy

```prisma
model BrandingType {
  id          String    @id @default(cuid())
  code        String    @unique
  name        String
  slug        String    @unique
  description String?
  image       Json?
  order       Int       @default(0)
  isActive    Boolean   @default(true)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  products    Product[]

  @@map("branding_types")
}

model AudienceType {
  id        String            @id @default(cuid())
  code      String            @unique
  name      String
  slug      String            @unique
  order     Int               @default(0)
  isActive  Boolean           @default(true)
  createdAt DateTime          @default(now())
  updatedAt DateTime          @updatedAt

  products  ProductAudience[]

  @@map("audience_types")
}

model GarmentType {
  id        String    @id @default(cuid())
  code      String    @unique
  name      String
  slug      String    @unique
  order     Int       @default(0)
  isActive  Boolean   @default(true)
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  products  Product[]

  @@map("garment_types")
}
```

Admin-managed; adding a sixth branding is a row, not a deploy. `name` is not translated (D2). These three tables also drive the Collections mega-menu (D16), so `order` and `isActive` are what an admin uses to arrange the header.

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
  publishedAt  DateTime?              // null = draft
  isActive     Boolean                @default(true)
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
  order        Int       @default(0)

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

- `publishedAt = null` means draft; the public Size Guide page lists only published guides (D1).
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

  brandingTypeId  String                        // required (D5)
  garmentTypeId   String?                       // single
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
  productionNotes String?

  createdAt       DateTime             @default(now())
  updatedAt       DateTime             @updatedAt

  brandingType    BrandingType         @relation(fields: [brandingTypeId], references: [id])
  garmentType     GarmentType?         @relation(fields: [garmentTypeId], references: [id])
  sizeGuide       SizeGuide?           @relation(fields: [sizeGuideId], references: [id])
  audiences       ProductAudience[]
  variants        ProductVariant[]
  translations    ProductTranslation[]
  promotions      PromotionProduct[]
  cartItems       Cart[]

  @@index([brandingTypeId])
  @@index([garmentTypeId])
  @@index([releasedAt])
  @@index([soldCount])
  @@index([bestSellerRank])
  @@index([isActive, isFavorite])
  @@map("products")
}

model ProductAudience {
  productId      String
  audienceTypeId String

  product        Product      @relation(fields: [productId], references: [id], onDelete: Cascade)
  audienceType   AudienceType @relation(fields: [audienceTypeId], references: [id], onDelete: Cascade)

  @@id([productId, audienceTypeId])
  @@map("product_audiences")
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
- `Product` no longer carries `name`, `description`, `notes`, `category`, or `sizes`. Name and content moved to `ProductTranslation`; category became three relations; sizes became `ProductVariant`.
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

### B4.6 Pricing entities

Multiple concurrent promotions and targeted member discounts cannot be expressed as key-value config, so they become tables:

```prisma
model Promotion {
  id           String             @id @default(cuid())
  name         String
  discountType DiscountType
  value        Decimal            @db.Decimal(12, 2)  // percent if PERCENTAGE, rupiah if FIXED
  scope        PromotionScope     @default(ALL_PRODUCTS)
  priority     Int                @default(0)         // higher wins; no stacking
  startsAt     DateTime?
  endsAt       DateTime?
  isActive     Boolean            @default(true)
  createdAt    DateTime           @default(now())
  updatedAt    DateTime           @updatedAt

  products     PromotionProduct[]

  @@index([isActive, startsAt, endsAt])
  @@map("promotions")
}

model PromotionProduct {
  promotionId String
  productId   String

  promotion   Promotion @relation(fields: [promotionId], references: [id], onDelete: Cascade)
  product     Product   @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@id([promotionId, productId])
  @@map("promotion_products")
}

model Member {
  id        String                 @id @default(cuid())
  email     String                 @unique
  fullname  String?
  joinedAt  DateTime               @default(now())
  isActive  Boolean                @default(true)
  createdAt DateTime               @default(now())
  updatedAt DateTime               @updatedAt

  discounts MemberDiscountMember[]

  @@map("members")
}

model MemberDiscount {
  id           String                 @id @default(cuid())
  name         String
  discountType DiscountType
  value        Decimal                @db.Decimal(12, 2)
  scope        MemberScope            @default(ALL_MEMBERS)
  priority     Int                    @default(0)
  startsAt     DateTime?
  endsAt       DateTime?
  isActive     Boolean                @default(true)
  createdAt    DateTime               @default(now())
  updatedAt    DateTime               @updatedAt

  members      MemberDiscountMember[]

  @@index([isActive, startsAt, endsAt])
  @@map("member_discounts")
}

model MemberDiscountMember {
  memberDiscountId String
  memberId         String

  memberDiscount   MemberDiscount @relation(fields: [memberDiscountId], references: [id], onDelete: Cascade)
  member           Member         @relation(fields: [memberId], references: [id], onDelete: Cascade)

  @@id([memberDiscountId, memberId])
  @@map("member_discount_members")
}
```

`Member` is new and necessary: targeting "these specific members" requires a member list, which v1 does not have (membership is only a boolean on order rows). Membership activation upserts a `Member` by email; `Guest.isMember` remains as the historical snapshot on the order.

> **`[OPEN]` Stacking rule.** When two promotions match one product, the proposal is **no stacking — highest `priority` wins**, because it is predictable and traceable in a pricing dispute. Confirm, or specify stacking with a cap.

### B4.7 Config parameters after the split

The rule that decides where a setting lives:

> **ConfigParameter** = exactly one value per store, scalar or small JSON, no relations, no lifecycle.
> **Table** = many rows, has relations, targeting, dates, or its own status.

| Group | Keys | Note |
| --- | --- | --- |
| `shipping` | `volume_divider`, `price_per_kg`, `price_per_km`, `base_price`, `min_shipping`, `origin_lat`, `origin_long`, `earth_radius_km`, `shipping_zones` | unchanged |
| `package_dimensions` | `XS`…`XXXL` | **renamed** from `product_dimensions` (D6); now a *default*, overridable per variant |
| `tax` | `tax_rate`, `tax_type` | unchanged |
| `product_defaults` | `default_notes`, `default_fabric_information`, `default_shipping_delivery`, `default_return_policy` | **new**, each `{ en, id }` Tiptap JSON |
| `store_profile` | `bank_accounts`, contact/social links | **new** — moves the hardcoded bank details out of `payment-step.tsx` (A9.12) |
| `media` | `qris_image` | replaces the old `images` group |

Removed from config, now tables: `promotions` → `Promotion`, `members` → `MemberDiscount`.

**Deleted outright:** the `videos` group and its `videos_curated_collection` key, together with the `/curated-collections` page, `video-carousel.tsx`, and the carousel section on the v1 home page (D16). Nothing replaces them. The `VIDEO`/`VIDEOS` `ParameterType` values and the video upload endpoint stay — they are generic and cost nothing to keep.

`origin_lat`/`origin_long` are seeded to Jakarta (`-6.2088`, `106.8456`) while the brand operates from Denpasar. The v2 seed must correct this, **and** the hardcoded fallbacks in `ShippingService` (A9.11).

### B4.8 Models carried over from v1

Unchanged except where noted. `Guest`, `Cart`, `ConfigParameterGroup`, `ConfigParameter`, and `Location` keep their v1 shape exactly (§A6) — `Guest` and `Cart` in particular must not drift, because the checkout token and the order transaction depend on them (D8).

```prisma
model User {
  id        String           @id @default(cuid())
  email     String           @unique
  username  String           @unique
  password  String                          // bcrypt, 12 rounds
  role      Role             @default(ADMIN)
  isActive  Boolean          @default(true)
  createdAt DateTime         @default(now())
  updatedAt DateTime         @updatedAt

  handledInquiries ContactInquiry[]         // NEW back-relation (F-47)

  @@map("users")
}
```

Two notes on `Cart`:

- `selectedSize` stays a **String**, not a FK to `Size`. It feeds `hashItems` (`productId:size:quantity`) inside the checkout token, so changing it would alter the signature shape of the one invariant that must not move (D8). Variants are resolved by `(productId, size.code)`.
- Still no price snapshot on the line. Historical totals live on `Guest`.

### B4.9 Enums

```prisma
enum Locale         { EN  ID }
enum Role           { SUPER_ADMIN  ADMIN }
enum PaymentMethod  { BANK_TRANSFER  QRIS }
enum DiscountType   { PERCENTAGE  FIXED }
enum PromotionScope { ALL_PRODUCTS  SPECIFIC_PRODUCTS }
enum MemberScope    { ALL_MEMBERS  SPECIFIC_MEMBERS }
enum InquiryType    { PRODUCT_INQUIRY  ORDER_SUPPORT  CUSTOM_ORDER  WHOLESALE_B2B  PARTNERSHIP  OTHER }
enum InquiryStatus  { NEW  IN_PROGRESS  HANDLED  ARCHIVED }
enum ParameterType  { TEXT  NUMBER  DECIMAL  BOOLEAN  SELECT  MULTI_SELECT  IMAGE  IMAGES
                      VIDEO  VIDEOS  JSON  TEXTAREA  COLOR  DATE  DATETIME }
```

`Categories` is **deleted** — replaced by the three taxonomy tables. `DiscountType` gains a second job: it was only ever a config *value* in v1 (`tax_type`, `promo_type`, `member_type`), and now it is also a real column on `Promotion` and `MemberDiscount`.

### B4.10 Table count

29 models, up from 7. Eight are translation or join tables — the cost of bilingual content plus many-to-many taxonomy. Sections B4.1–B4.9 spell out 24 of them; the five marked *unchanged* below are copied verbatim from §A6.

| Group | Models |
| --- | --- |
| Access | `User` |
| Taxonomy | `BrandingType`, `AudienceType`, `GarmentType` |
| Sizing | `Size`, `SizeGuide`, `SizeGuideRow`, `SizeGuideTranslation` |
| Catalog | `Product`, `ProductAudience`, `ProductVariant`, `ProductTranslation` |
| Orders | `Guest`, `Cart` *(unchanged)* |
| Pricing | `Promotion`, `PromotionProduct`, `Member`, `MemberDiscount`, `MemberDiscountMember` |
| Content | `ArticleCategory`, `ArticleCategoryTranslation`, `Article`, `ArticleTranslation`, `Faq`, `FaqTranslation`, `ContactInquiry` |
| Settings | `ConfigParameterGroup`, `ConfigParameter`, `Location` *(unchanged)* |

## B5. Target functional requirements `[TARGET]`

Numbering continues from v1. F-1…F-29 remain unless superseded.

### B5.1 Catalog & discovery
- **F-30 Localized routing** — `/[lang]/…`, dictionary-driven static copy, language switch preserving the current path.
- **F-31 Taxonomy CRUD** — admin manages branding, audience, and garment types.
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
- **F-48 Promotion management** — several concurrent promotions, each targeting all products or a chosen set, with a validity window.
- **F-49 Member registry** — `Member` rows created on membership activation, listable and searchable by admin.
- **F-50 Targeted member discounts** — apply to all members or a chosen set, with a validity window.
- **F-51 Server-computed subtotal** — the checkout GET derives the subtotal from database prices instead of trusting the client (fixes A9.1).

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

The token invariant is unchanged and strengthened: **prices reach `Guest` only from the signed token.** What changes is how the signed numbers are produced.

```
for each cart line:
    unit  = product.discountedPrice
    promo = best applicable Promotion (targeted or global, in window, highest priority)
    line  = (unit − promo) × quantity
subtotal = Σ line                                  ← computed server-side from the DB (F-51)
memberDiscount = best applicable MemberDiscount for this email
taxed    = (subtotal − memberDiscount) + tax
total    = taxed + shippingCost
sign token { shippingCost, totalPurchased, purchased, totalItemsSold, itemsHash, expiresAt }
```

Two departures from "freeze the checkout subsystem", both forced by the decisions above and both intentional:

1. `GET /api/guests/checkout` stops accepting `purchased` and `totalItemsSold` from the client and derives them.
2. `calculateTotalPrice` becomes per-line rather than a single global percentage.

Everything else — `hashItems`, the 15-minute window, HMAC signing, the POST verification order, the stock transaction — stays byte-identical. `logCalculation` gains per-line entries so a pricing dispute can still be traced end to end.

### B6.4 Membership

Unchanged from v1 (`PATCH /api/guests/membership/[id]`) with one addition: activation upserts a `Member` row by email, so admins can target that member later.

## B7. Open questions `[OPEN]`

Do not guess these; ask.

1. **`/our-world` content** — deferred pending client confirmation (D13). The route exists as a placeholder; do not design its data model until the answer arrives.
2. **Promotion stacking rule** — proposal is highest-priority-wins, no stacking (§B4.6). This one blocks phase 3.

---

# PART C — Migration plan

Each phase ends with `npx tsc --noEmit` clean, `npm run build` clean, and the affected flow exercised by hand. Move the phase's sections from `[TARGET]` to `[SHIPPED]` and delete the superseded Part A text before starting the next one.

**Lint has a pre-existing baseline that phase 0 did not create.** `npm run lint` reported 10 `react-hooks/set-state-in-effect` errors on the pre-v2 commit; phase 0 removed 3 (with the deleted Curated Collections files) and added none, leaving 7. Each survivor sits in a file a later phase rewrites — `my-lindway`/`simply-lindway`/`lure-by-lindway` and `detail-product` in phase 2, `cart` in phase 2/3, `config-field` in phase 1, `useSearchPagination` whenever a listing touches it. Treat "no new lint errors" as the gate until those rewrites land, then restore "lint clean".

**The database is dropped and rebuilt, not migrated (D-note).** There is no production data to preserve, so phase 1 runs `npm run db:reset` and reseeds. Confirm before running it — it is destructive and irreversible.

| Phase | Scope | Rationale |
| --- | --- | --- |
| **0 — Foundation** ✅ **DONE** | `[lang]` routing + dictionaries · design tokens (`#BA8164`, `#39322C`, `#FAF6F5`, `#F7F3F0`, `#D2D2CA`) · Raleway + Inter via `next/font/google` · new header/footer shell · `tiptap-editor.tsx` shared component · delete `/curated-collections` and `video-carousel.tsx` (D16) | Touches every file. Doing it later means redoing every other phase |
| **1 — Data model** | Drop and rebuild the schema: taxonomy, Size/SizeGuide/Variant, Product + translations, pricing entities, content models · new seed (without `videos_curated_collection`) · admin CRUD for taxonomy, sizes, size guides · wire the Collections mega-menu to the taxonomy tables | Everything downstream depends on these tables |
| **2 — Catalog** | Product form (size guide → variants → package dimensions), listings per axis, product detail, New Arrivals, Best Sellers, wishlist | Consumes phase 1 |
| **3 — Pricing** | Promotion + member discount entities and admin, per-line price pipeline, server-computed subtotal (F-51) | Isolated; the most delicate, so it runs alone |
| **4 — Content** | Journal, FAQ, Contact form + inbox, public size guide page | Independent of 2 and 3; can run in parallel if needed |
| **5 — Hardening** | F-52…F-54 security fixes, `DELETE /api/guests/[id]` (A9.6), Denpasar origin coordinates, seed corrections | Deliberately last so it is not lost in the churn |

Phases 0 and 1 must not be split — both touch the whole tree, and a half-migrated schema means doing the work twice.

One ordering caveat: the header shell is built in phase 0, but the Collections mega-menu reads taxonomy tables that only exist after phase 1. Build the menu against a hardcoded placeholder list in phase 0 and swap it for the real query in phase 1 — do not defer the whole header, since every page depends on it.

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
| **D16** | The Collections header menu is a three-column mega-menu rendered from `BrandingType`, `AudienceType`, and `GarmentType`. Curated Collections is deleted — page, component, home-page section, and the `videos_curated_collection` config key | Driving the nav from the taxonomy tables means a new branding or garment appears in the menu without a deploy, and it gives garment/audience listings a header entry point |

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
- `next.config.ts` has `output: "standalone"` deliberately commented out — leave it unless deployment changes.
- Tiptap content is admin-authored HTML/JSON rendered into public pages: **sanitize on render**. A compromised admin account otherwise executes script in every visitor's browser.
