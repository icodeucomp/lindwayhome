import { hashPassword, prisma } from "@/lib";

import { ConfigService } from "@/services";

import { SIZE_GUIDES } from "./seed-data/size-guides";

import type { Prisma } from "prisma-client/client";

// =============================================================================
// Helpers
// =============================================================================

/** Minimal Tiptap document. Every rich-text column stores this shape (D10). */
const doc = (...blocks: Prisma.InputJsonValue[]) => ({ type: "doc", content: blocks });
const p = (text: string) => ({ type: "paragraph", content: [{ type: "text", text }] });
const ul = (items: string[]) => ({
  type: "bulletList",
  content: items.map((text) => ({ type: "listItem", content: [p(text)] })),
});

const imageNode = (filename: string) => ({
  originalName: filename,
  filename,
  url: `/images/${filename}`,
  path: `/images/${filename}`,
  size: 120_000,
  mimeType: "image/webp",
  alt: filename.replace(/[-_]/g, " ").replace(/\.\w+$/, ""),
  isMoved: true,
});

// =============================================================================
// Sizes
//
// Size.code MUST match a package_dimensions config key exactly, or checkout
// returns 404 for that size (§B4.2). The kids codes come from the Baby & Kids
// size guide, which uses a completely different vocabulary from XS…XXXL — every
// one of them needs its own dimensions row below.
// =============================================================================

const ADULT_SIZES = [
  { code: "XS", label: "Extra Small", weight_g: 160, length_cm: 26, width_cm: 22, height_cm: 2 },
  { code: "S", label: "Small", weight_g: 180, length_cm: 28, width_cm: 24, height_cm: 2 },
  { code: "M", label: "Medium", weight_g: 200, length_cm: 30, width_cm: 25, height_cm: 2 },
  { code: "L", label: "Large", weight_g: 220, length_cm: 32, width_cm: 27, height_cm: 2 },
  { code: "XL", label: "Extra Large", weight_g: 240, length_cm: 34, width_cm: 29, height_cm: 2 },
  { code: "XXL", label: "2X Large", weight_g: 260, length_cm: 36, width_cm: 31, height_cm: 2 },
  { code: "XXXL", label: "3X Large", weight_g: 300, length_cm: 38, width_cm: 33, height_cm: 2 },
];

const KIDS_SIZES = [
  { code: "0000-NB", label: "Newborn", weight_g: 60, length_cm: 18, width_cm: 14, height_cm: 2 },
  { code: "000-0-3M", label: "0-3 months", weight_g: 70, length_cm: 19, width_cm: 15, height_cm: 2 },
  { code: "00-3-6M", label: "3-6 months", weight_g: 80, length_cm: 20, width_cm: 16, height_cm: 2 },
  { code: "0-6-12M", label: "6-12 months", weight_g: 90, length_cm: 21, width_cm: 17, height_cm: 2 },
  { code: "1Y", label: "1 year", weight_g: 100, length_cm: 22, width_cm: 18, height_cm: 2 },
  { code: "2Y", label: "2 years", weight_g: 110, length_cm: 23, width_cm: 19, height_cm: 2 },
  { code: "3Y", label: "3 years", weight_g: 120, length_cm: 24, width_cm: 19, height_cm: 2 },
  { code: "4Y", label: "4 years", weight_g: 130, length_cm: 24, width_cm: 20, height_cm: 2 },
  { code: "5Y", label: "5 years", weight_g: 140, length_cm: 25, width_cm: 20, height_cm: 2 },
  { code: "6Y", label: "6 years", weight_g: 150, length_cm: 25, width_cm: 21, height_cm: 2 },
  { code: "7Y", label: "7 years", weight_g: 160, length_cm: 26, width_cm: 21, height_cm: 2 },
  { code: "8Y", label: "8 years", weight_g: 170, length_cm: 26, width_cm: 22, height_cm: 2 },
  { code: "9Y", label: "9 years", weight_g: 180, length_cm: 27, width_cm: 22, height_cm: 2 },
  { code: "10Y", label: "10 years", weight_g: 190, length_cm: 27, width_cm: 23, height_cm: 2 },
  { code: "11Y", label: "11 years", weight_g: 200, length_cm: 28, width_cm: 23, height_cm: 2 },
  { code: "12Y", label: "12 years", weight_g: 210, length_cm: 28, width_cm: 24, height_cm: 2 },
];

const ALL_SIZES = [...ADULT_SIZES, ...KIDS_SIZES];

// =============================================================================
// Seeders
// =============================================================================

async function seedUsers() {
  console.log("👥 users…");
  await prisma.user.createMany({
    data: [
      { email: "admin@gmail.com", username: "admin", password: await hashPassword("!Admin123"), role: "ADMIN" },
      { email: "mylindway@gmail.com", username: "lindway", password: await hashPassword("!Lindway@123"), role: "SUPER_ADMIN" },
    ],
    skipDuplicates: true,
  });
}

async function seedSizes() {
  console.log("📏 sizes…");
  await prisma.size.createMany({
    data: ALL_SIZES.map((size, index) => ({ code: size.code, label: size.label, order: index + 1 })),
    skipDuplicates: true,
  });
}

async function seedConfig() {
  console.log("⚙️  config parameters…");

  const shipping = await ConfigService.createConfigGroup({ name: "shipping", label: "Shipping Calculation", description: "Rates, origin and zone multipliers used by the checkout", order: 1 });
  const dimensions = await ConfigService.createConfigGroup({ name: "package_dimensions", label: "Package Dimensions", description: "Default parcel dimensions per size, overridable per product variant", order: 2 });
  const tax = await ConfigService.createConfigGroup({ name: "tax", label: "Tax", description: "Store-wide tax rate", order: 3 });
  const promotions = await ConfigService.createConfigGroup({ name: "promotions", label: "Promotion", description: "One store-wide promotional discount", order: 4 });
  const members = await ConfigService.createConfigGroup({ name: "members", label: "Member", description: "Discount rate applied to registered members", order: 5 });
  const defaults = await ConfigService.createConfigGroup({ name: "product_defaults", label: "Product Content Defaults", description: "Fallback copy for products that do not override it", order: 6 });
  const store = await ConfigService.createConfigGroup({ name: "store_profile", label: "Store Profile", description: "Bank accounts and contact details shown to buyers", order: 7 });
  const media = await ConfigService.createConfigGroup({ name: "media", label: "Media", description: "Images shown on the storefront", order: 8 });

  // ── Shipping ──────────────────────────────────────────────────────────────
  const shippingKeys: { key: string; label: string; description: string; value: Prisma.InputJsonValue; type: "NUMBER" | "DECIMAL" | "JSON" }[] = [
    { key: "volume_divider", label: "Volume Divider", description: "Divisor converting cm³ to volumetric kg", value: 6000, type: "NUMBER" },
    { key: "price_per_kg", label: "Price per Kg", description: "Charge per rounded kilogram", value: 5000, type: "DECIMAL" },
    { key: "price_per_km", label: "Price per Km", description: "Charge per kilometre of haversine distance", value: 1000, type: "DECIMAL" },
    { key: "base_price", label: "Base Price", description: "Flat amount added to every shipment", value: 10000, type: "DECIMAL" },
    { key: "min_shipping", label: "Minimum Shipping", description: "Floor applied after all multipliers", value: 15000, type: "DECIMAL" },
    // Denpasar, where the brand actually operates. v1 shipped with Jakarta here,
    // which silently mispriced every order (A9.11).
    { key: "origin_lat", label: "Origin Latitude", description: "Latitude the distance is measured from", value: -8.6705, type: "DECIMAL" },
    { key: "origin_long", label: "Origin Longitude", description: "Longitude the distance is measured from", value: 115.2126, type: "DECIMAL" },
    { key: "earth_radius_km", label: "Earth Radius (km)", description: "Constant used by the haversine formula", value: 6371, type: "DECIMAL" },
    {
      key: "shipping_zones",
      label: "Shipping Zones",
      description: "Distance bands and their multipliers",
      value: [
        { zone: "Z1", label: "Local", max_km: 10, multiplier: 1, price_override: null },
        { zone: "Z2", label: "Nearby", max_km: 30, multiplier: 1.2, price_override: null },
        { zone: "Z3", label: "Regional", max_km: 100, multiplier: 1.5, price_override: null },
        { zone: "Z4", label: "Long Distance", max_km: null, multiplier: 2, price_override: null },
      ],
      type: "JSON",
    },
  ];

  for (const [index, config] of shippingKeys.entries()) {
    await ConfigService.createConfig({ ...config, groupId: shipping.id, order: index + 1 });
  }

  // ── Package dimensions — one key per Size.code ─────────────────────────────
  for (const [index, size] of ALL_SIZES.entries()) {
    await ConfigService.createConfig({
      key: size.code,
      label: `Size ${size.code}`,
      description: `Default parcel dimensions for size ${size.code}`,
      value: { weight_g: size.weight_g, length_cm: size.length_cm, width_cm: size.width_cm, height_cm: size.height_cm },
      type: "JSON",
      groupId: dimensions.id,
      order: index + 1,
    });
  }

  // ── Tax, promotion, member rate ───────────────────────────────────────────
  await ConfigService.createConfig({ key: "tax_rate", label: "Tax Rate", description: "Applied after discounts", value: 8.5, type: "DECIMAL", groupId: tax.id, order: 1 });
  await ConfigService.createConfig({
    key: "tax_type",
    label: "Tax Type",
    description: "Percentage of the subtotal, or a fixed amount",
    value: "PERCENTAGE",
    type: "SELECT",
    validation: { options: [{ label: "Percentage", value: "PERCENTAGE" }, { label: "Fixed", value: "FIXED" }] },
    groupId: tax.id,
    order: 2,
  });

  await ConfigService.createConfig({ key: "promotion_discount", label: "Promotion Discount", description: "Store-wide discount on every product", value: 0, type: "DECIMAL", groupId: promotions.id, order: 1 });
  await ConfigService.createConfig({
    key: "promo_type",
    label: "Promotion Type",
    description: "Percentage or fixed amount",
    value: "PERCENTAGE",
    type: "SELECT",
    validation: { options: [{ label: "Percentage", value: "PERCENTAGE" }, { label: "Fixed", value: "FIXED" }] },
    groupId: promotions.id,
    order: 2,
  });

  await ConfigService.createConfig({ key: "member_discount", label: "Member Discount", description: "Discount for buyers with an active membership", value: 6.1, type: "DECIMAL", groupId: members.id, order: 1 });
  await ConfigService.createConfig({
    key: "member_type",
    label: "Member Discount Type",
    description: "Percentage or fixed amount",
    value: "PERCENTAGE",
    type: "SELECT",
    validation: { options: [{ label: "Percentage", value: "PERCENTAGE" }, { label: "Fixed", value: "FIXED" }] },
    groupId: members.id,
    order: 2,
  });

  // ── Product content defaults — { en, id } Tiptap (D9) ─────────────────────
  const productDefaults: { key: string; label: string; en: Prisma.InputJsonValue; id: Prisma.InputJsonValue }[] = [
    {
      key: "default_notes",
      label: "Default Notes",
      en: doc(p("This item is made-to-order and handcrafted specially for you. Please allow 21-25 days for production.")),
      id: doc(p("Produk ini dibuat berdasarkan pesanan dan dikerjakan khusus untuk Anda. Mohon menunggu 21-25 hari untuk proses produksi.")),
    },
    {
      key: "default_fabric_information",
      label: "Default Fabric Information",
      en: doc(
        ul([
          "230 GSM Jersey (50% Recycled Cotton / 50% cotton sourced from sustainable farming practices)",
          "280 GSM 1x1 Rib (50% Recycled Cotton / 50% cotton sourced from sustainable farming practices)",
          "Canadian Milled and Dyed Fabric",
        ]),
      ),
      id: doc(
        ul([
          "Jersey 230 GSM (50% katun daur ulang / 50% katun dari pertanian berkelanjutan)",
          "Rib 1x1 280 GSM (50% katun daur ulang / 50% katun dari pertanian berkelanjutan)",
          "Kain tenun dan pewarnaan Kanada",
        ]),
      ),
    },
    {
      key: "default_shipping_delivery",
      label: "Default Shipping & Delivery",
      en: doc(
        p("Orders are processed within 1-3 business days. Custom-made items may take 21-30 working days, depending on the complexity."),
        ul(["We ship across Indonesia and offer international delivery upon request.", "You'll receive a tracking number once your order is on its way."]),
      ),
      id: doc(
        p("Pesanan diproses dalam 1-3 hari kerja. Produk custom dapat memakan waktu 21-30 hari kerja, tergantung tingkat kerumitannya."),
        ul(["Kami mengirim ke seluruh Indonesia dan melayani pengiriman internasional atas permintaan.", "Anda akan menerima nomor resi begitu pesanan dikirim."]),
      ),
    },
    {
      key: "default_return_policy",
      label: "Default Return & Exchange Policy",
      en: doc(
        p("All items are final sale, not eligible for return."),
        p("Non-refundable · Non-modifiable · Non-cashable · Non-exchangeable · Non-transferable"),
        p("Special conditions: returns or exchanges may be provided; items have to be in the same condition as when purchased. Items that include a bag must be returned with it."),
      ),
      id: doc(
        p("Semua produk merupakan penjualan final dan tidak dapat dikembalikan."),
        p("Tidak dapat direfund · Tidak dapat diubah · Tidak dapat diuangkan · Tidak dapat ditukar · Tidak dapat dipindahtangankan"),
        p("Ketentuan khusus: pengembalian atau penukaran dapat diberikan dengan syarat kondisi barang sama seperti saat dibeli. Produk yang disertai tas harus dikembalikan beserta tasnya."),
      ),
    },
  ];

  for (const [index, entry] of productDefaults.entries()) {
    await ConfigService.createConfig({
      key: entry.key,
      label: entry.label,
      description: "Used by every product that does not override this field",
      value: { en: entry.en, id: entry.id },
      type: "JSON",
      groupId: defaults.id,
      order: index + 1,
    });
  }

  // ── Store profile — moves the hardcoded bank details out of payment-step ───
  await ConfigService.createConfig({
    key: "bank_accounts",
    label: "Bank Accounts",
    description: "Shown to the buyer on the bank transfer step",
    value: [
      { bank: "BCA Bank", holder: "NI KADEK LINDA WIRYANI", number: "7725164521", branch: "BCA BANK KCP RENON", swift: "CENAIDJA" },
      { bank: "MANDIRI Bank", holder: "NI KADEK LINDA WIRYANI", number: "145-00-1231250-6", branch: "MANDIRI KCP RENON", swift: "BMRIIDJA" },
    ],
    type: "JSON",
    groupId: store.id,
    order: 1,
  });

  await ConfigService.createConfig({
    key: "contact_links",
    label: "Contact & Social Links",
    description: "Header and footer links",
    value: {
      address: "Jalan Hayam Wuruk Gang XVII No. 36 Denpasar Timur, Bali 80239, Indonesia",
      maps: "https://maps.app.goo.gl/2pUxXSh99bSCWTtd6",
      whatsapp: "https://api.whatsapp.com/send?phone=6282339936682",
      instagram: "https://www.instagram.com/mylindway",
      facebook: "https://www.facebook.com/mylindwaybrand",
    },
    type: "JSON",
    groupId: store.id,
    order: 2,
  });

  // ── Media ─────────────────────────────────────────────────────────────────
  await ConfigService.createConfig({
    key: "qris_image",
    label: "QRIS Image",
    description: "QR code shown on the QRIS payment step",
    value: imageNode("qris.jpeg"),
    type: "IMAGE",
    groupId: media.id,
    order: 1,
  });
}

async function seedSizeGuides() {
  console.log("📐 size guides…");

  const sizes = await prisma.size.findMany({ select: { id: true, code: true } });
  const sizeIdByCode = new Map(sizes.map((size) => [size.code, size.id]));

  for (const [index, guide] of SIZE_GUIDES.entries()) {
    const missing = guide.rows.filter((row) => !sizeIdByCode.has(row.size));
    if (missing.length > 0) {
      throw new Error(`Size guide "${guide.title}" references sizes with no Size row: ${missing.map((row) => row.size).join(", ")}`);
    }

    await prisma.sizeGuide.create({
      data: {
        order: index + 1,
        publishedAt: new Date(),
        translations: {
          create: [
            { locale: "EN", title: guide.title, description: guide.description, parameterLabels: guide.parameterLabels.en },
            { locale: "ID", title: guide.title, description: guide.description, parameterLabels: guide.parameterLabels.id },
          ],
        },
        rows: {
          create: guide.rows.map((row) => ({ sizeId: sizeIdByCode.get(row.size)!, measurements: row.measurements })),
        },
      },
    });
  }
}

// =============================================================================
// Products
//
// Six on purpose, not sixty. They exist so the translation fallback chain and the
// checkout/stock path can be exercised by hand — the only verification this repo
// has. Translation coverage is deliberately uneven: two full EN+ID, two with an
// ID name only, two EN-only.
// =============================================================================

const PRODUCTS = [
  {
    sku: "MLW-KEB-001",
    slug: "kebaya-bordir-melati",
    branding: "MY_LINDWAY" as const,
    garment: "TOPS" as const,
    audiences: ["WOMEN" as const],
    price: 1_250_000,
    discount: 0,
    guide: "Women — Kebaya",
    sizes: ["XS", "S", "M", "L", "XL"],
    isFavorite: true,
    en: { name: "Melati Embroidered Kebaya", description: "Hand-embroidered kebaya with jasmine motifs along the placket and cuffs." },
    id: { name: "Kebaya Bordir Melati", description: "Kebaya bordir tangan dengan motif melati di sepanjang plaket dan ujung lengan." },
  },
  {
    sku: "MLW-BTK-002",
    slug: "rok-batik-parang-seling",
    branding: "MY_LINDWAY" as const,
    garment: "SKIRTS" as const,
    audiences: ["WOMEN" as const],
    price: 890_000,
    discount: 15,
    guide: "Women — Batik",
    sizes: ["S", "M", "L", "XL", "XXL"],
    isFavorite: true,
    en: { name: "Parang Seling Batik Skirt", description: "Wrapped batik skirt in the parang seling pattern, hand-drawn on cotton." },
    id: { name: "Rok Batik Parang Seling", description: "Rok lilit batik motif parang seling, ditulis tangan di atas katun." },
  },
  {
    sku: "SLW-DRS-003",
    slug: "cotton-day-dress",
    branding: "SIMPLY_LINDWAY" as const,
    garment: "DRESSES" as const,
    audiences: ["WOMEN" as const],
    price: 640_000,
    discount: 0,
    guide: "Women — Kebaya",
    sizes: ["XS", "S", "M", "L"],
    isFavorite: false,
    en: { name: "Cotton Day Dress", description: "An everyday dress in breathable cotton, cut for Bali's humidity." },
    id: { name: "Gaun Katun Harian", description: null },
  },
  {
    sku: "SLW-TOP-004",
    slug: "relaxed-linen-top",
    branding: "SIMPLY_LINDWAY" as const,
    garment: "TOPS" as const,
    audiences: ["WOMEN" as const, "MEN" as const],
    price: 480_000,
    discount: 10,
    guide: "Men — Shirt & Everyday Wear",
    sizes: ["S", "M", "L", "XL"],
    isFavorite: false,
    en: { name: "Relaxed Linen Top", description: "A unisex linen top with a dropped shoulder and a straight hem." },
    id: { name: "Atasan Linen Longgar", description: null },
  },
  {
    sku: "LBL-DRS-005",
    slug: "modern-batik-slip-dress",
    branding: "LURE_BY_LINDWAY" as const,
    garment: "DRESSES" as const,
    audiences: ["WOMEN" as const],
    price: 1_480_000,
    discount: 0,
    guide: "Women — Batik",
    sizes: ["S", "M", "L"],
    isFavorite: true,
    en: { name: "Modern Batik Slip Dress", description: "A bias-cut slip dress carrying a reinterpreted traditional motif." },
    id: null,
  },
  {
    sku: "SLW-KID-006",
    slug: "kids-cotton-tee",
    branding: "SIMPLY_LINDWAY" as const,
    garment: "TOPS" as const,
    audiences: ["KIDS" as const],
    price: 210_000,
    discount: 0,
    guide: "Baby & Kids",
    sizes: ["1Y", "2Y", "3Y", "4Y", "5Y", "6Y"],
    isFavorite: false,
    en: { name: "Kids Cotton Tee", description: "Soft, breathable cotton tee designed for our littlest customers." },
    id: null,
  },
];

async function seedProducts() {
  console.log("👔 products…");

  const sizes = await prisma.size.findMany({ select: { id: true, code: true } });
  const sizeIdByCode = new Map(sizes.map((size) => [size.code, size.id]));

  const guides = await prisma.sizeGuide.findMany({ include: { translations: { where: { locale: "EN" }, select: { title: true } } } });
  const guideIdByTitle = new Map(guides.map((guide) => [guide.translations[0]?.title ?? "", guide.id]));

  for (const [index, product] of PRODUCTS.entries()) {
    const discountedPrice = Math.round(product.price - (product.price * product.discount) / 100);

    // Every translatable entity must have an EN row; ID is optional (D3).
    const translations: Prisma.ProductTranslationCreateWithoutProductInput[] = [
      { locale: "EN", name: product.en.name, description: product.en.description ? doc(p(product.en.description)) : undefined },
    ];
    if (product.id) {
      translations.push({ locale: "ID", name: product.id.name, description: product.id.description ? doc(p(product.id.description)) : undefined });
    }

    await prisma.product.create({
      data: {
        sku: product.sku,
        slug: product.slug,
        branding: product.branding,
        garment: product.garment,
        audiences: product.audiences,
        sizeGuideId: guideIdByTitle.get(product.guide),
        price: product.price,
        discount: product.discount,
        discountedPrice,
        images: [imageNode(`customer-moment-photo-${(index % 8) + 1}.webp`), imageNode(`customer-moment-photo-${((index + 3) % 8) + 1}.webp`)],
        // `stock` is deliberately not set — the product_variant_stock_sync trigger
        // maintains it from the variants created below (D24).
        releasedAt: new Date(Date.now() - index * 7 * 24 * 60 * 60 * 1000),
        isFavorite: product.isFavorite,
        variants: {
          create: product.sizes.map((code, position) => ({ sizeId: sizeIdByCode.get(code)!, quantity: 5 + position * 3 })),
        },
        translations: { create: translations },
      },
    });
  }
}

// =============================================================================

async function main() {
  console.log("🌱 seeding…\n");

  await seedUsers();
  await seedSizes();
  await seedConfig();
  await seedSizeGuides();
  await seedProducts();

  const [users, sizeCount, guideCount, productCount, variantCount, configCount] = await Promise.all([
    prisma.user.count(),
    prisma.size.count(),
    prisma.sizeGuide.count(),
    prisma.product.count(),
    prisma.productVariant.count(),
    prisma.configParameter.count(),
  ]);

  const stockSynced = await prisma.product.findMany({ select: { sku: true, stock: true } });

  console.log("\n✅ done");
  console.log(`   users ${users} · sizes ${sizeCount} · size guides ${guideCount} · config ${configCount}`);
  console.log(`   products ${productCount} · variants ${variantCount}`);
  console.log(`   stock from trigger: ${stockSynced.map((product) => `${product.sku}=${product.stock}`).join(" ")}`);
  if (stockSynced.every((product) => product.stock === 0)) {
    console.warn("\n⚠️  every product has stock 0 — the trigger was probably not applied.");
    console.warn('   Run: psql "$DATABASE_URL" -f prisma/triggers/product-stock.sql, then re-seed.');
  }
}

main()
  .catch((error) => {
    console.error("❌ seeding failed:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
