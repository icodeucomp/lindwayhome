import { ConfigService } from "@/services";
import { hashPassword, prisma } from "@/lib";
import { faker } from "@faker-js/faker";

const categories = ["MY_LINDWAY", "LURE_BY_LINDWAY", "SIMPLY_LINDWAY"] as const;
const availableSizes = ["XS", "S", "M", "L", "XL", "XXL"];
const API_BASE_URL = process.env.NODE_ENV === "production" ? process.env.NEXT_PUBLIC_BASE_URL : "";

function generateProductImages(count: number = 2) {
  return Array.from({ length: count }).map(() => {
    const imageNumber = faker.number.int({ min: 1, max: 8 });
    const filename = `customer-moment-photo-${imageNumber}.webp`;
    return {
      originalName: filename,
      filename,
      url: `${API_BASE_URL}/images/${filename}`,
      path: `/images/${filename}`,
      size: faker.number.int({ min: 50000, max: 500000 }),
      mimeType: "image/png",
      alt: faker.commerce.productDescription(),
    };
  });
}

function generateSizes() {
  const numberOfSizes = faker.number.int({ min: 3, max: 5 });
  const selectedSizes = faker.helpers.arrayElements(availableSizes, numberOfSizes);
  const sizeOrder = ["XS", "S", "M", "L", "XL", "XXL"];
  selectedSizes.sort((a, b) => sizeOrder.indexOf(a) - sizeOrder.indexOf(b));
  return selectedSizes.map((size) => ({
    size,
    quantity: faker.number.int({ min: 0, max: 50 }),
  }));
}

async function seedUsers() {
  console.log("👥 Creating admin and super admin users...");
  const passwordAdmin = await hashPassword("!Admin123");
  const passwordLindway = await hashPassword("!Lindway@123");
  await prisma.user.createMany({
    data: [
      { email: "admin@gmail.com", username: "admin", password: passwordAdmin, role: "ADMIN" },
      { email: "mylindway@gmail.com", username: "lindway", password: passwordLindway, role: "SUPER_ADMIN" },
    ],
    skipDuplicates: true,
  });
}

async function seedProducts() {
  console.log(`👔 Creating products ...`);
  for (const category of categories) {
    console.log(`🏷️  Creating products for category: ${category}...`);
    const products = Array.from({ length: 20 }).map(() => {
      const price = parseFloat(faker.commerce.price({ min: 100000, max: 300000 }));
      const discount = faker.number.int({ min: 0, max: 100 });
      const discountedPrice = parseFloat((price - (price * discount) / 100).toFixed(2));
      const sizes = generateSizes();
      const totalStock = sizes.reduce((sum, sizeObj) => sum + sizeObj.quantity, 0);
      return {
        name: faker.commerce.productName(),
        description: faker.commerce.productDescription(),
        notes: faker.lorem.sentence(),
        sizes,
        price,
        discount,
        discountedPrice,
        category,
        images: generateProductImages(faker.number.int({ min: 5, max: 7 })),
        stock: totalStock,
        sku: faker.string.alphanumeric(10).toUpperCase(),
        productionNotes: faker.lorem.words(6),
        isPreOrder: faker.datatype.boolean(),
        isFavorite: faker.datatype.boolean(),
        isActive: true,
      };
    });
    await prisma.product.createMany({ data: products });
  }
}

async function seedConfigurations() {
  console.log(`🍙 Creating parameters ...`);

  // ── Groups ────────────────────────────────────────────────────────────────

  const shippingCalcGroup = await ConfigService.createConfigGroup({
    name: "shipping",
    label: "Shipping Calculation Settings",
    description: "Configure parameters for shipping cost calculation including weight, distance, and zone-based pricing",
    order: 1,
  });

  const productDimensionsGroup = await ConfigService.createConfigGroup({
    name: "product_dimensions",
    label: "Product Dimensions Settings",
    description: "Configure product dimensions (weight, length, width, height) for each size used in shipping calculations",
    order: 2,
  });

  const taxGroup = await ConfigService.createConfigGroup({
    name: "tax",
    label: "Tax Settings",
    description: "Configure tax rates and types",
    order: 3,
  });

  const memberGroup = await ConfigService.createConfigGroup({
    name: "members",
    label: "Member Settings",
    description: "Configure membership discount and types",
    order: 4,
  });

  const promotionGroup = await ConfigService.createConfigGroup({
    name: "promotions",
    label: "Promotion Settings",
    description: "Configure discounts and types",
    order: 5,
  });

  const imageGroup = await ConfigService.createConfigGroup({
    name: "images",
    label: "Image Settings",
    description: "Configure hero image, qris image, and other images for displayed on the website",
    order: 6,
  });

  const videoGroup = await ConfigService.createConfigGroup({
    name: "videos",
    label: "Video Settings",
    description: "Configure videos for displayed on the website",
    order: 7,
  });

  // ── Tax ───────────────────────────────────────────────────────────────────

  await ConfigService.createConfig({
    key: "tax_rate",
    label: "Tax Rate",
    description: "Base tax rate when buy a product in percentage or fixed amount",
    value: 8.5,
    type: "DECIMAL",
    groupId: taxGroup.id,
    order: 1,
  });

  await ConfigService.createConfig({
    key: "tax_type",
    label: "Tax Type",
    description: "How tax is calculated in percentage or fixed amount",
    value: "PERCENTAGE",
    type: "SELECT",
    groupId: taxGroup.id,
    validation: {
      options: [
        { label: "Percentage", value: "PERCENTAGE" },
        { label: "Fixed Amount", value: "FIXED" },
      ],
    },
    order: 2,
  });

  // ── Promotions ────────────────────────────────────────────────────────────

  await ConfigService.createConfig({
    key: "promotion_discount",
    label: "Promotion Discount",
    description: "Base promotion discount when buy a product in percentage or fixed amount",
    value: 4.5,
    type: "DECIMAL",
    groupId: promotionGroup.id,
    order: 1,
  });

  await ConfigService.createConfig({
    key: "promo_type",
    label: "Promo Type",
    description: "How promotion is calculated in percentage or fixed amount",
    value: "PERCENTAGE",
    type: "SELECT",
    groupId: promotionGroup.id,
    validation: {
      options: [
        { label: "Percentage", value: "PERCENTAGE" },
        { label: "Fixed Amount", value: "FIXED" },
      ],
    },
    order: 2,
  });

  // ── Members ───────────────────────────────────────────────────────────────

  await ConfigService.createConfig({
    key: "member_discount",
    label: "Member Discount",
    description: "Base member discount when buy a product in percentage or fixed amount",
    value: 6.1,
    type: "DECIMAL",
    groupId: memberGroup.id,
    order: 1,
  });

  await ConfigService.createConfig({
    key: "member_type",
    label: "Member Type",
    description: "How member is calculated in percentage or fixed amount",
    value: "PERCENTAGE",
    type: "SELECT",
    groupId: memberGroup.id,
    validation: {
      options: [
        { label: "Percentage", value: "PERCENTAGE" },
        { label: "Fixed Amount", value: "FIXED" },
      ],
    },
    order: 2,
  });

  // ── Images ────────────────────────────────────────────────────────────────

  await ConfigService.createConfig({
    key: "qris_image",
    label: "Default Qris Image",
    description: "Base qris image to displayed on the payment screen",
    value: {
      originalName: "qris.jpeg",
      filename: "qris.jpeg",
      url: `${API_BASE_URL}/images/qris.jpeg`,
      path: `/images/qris.jpeg`,
      size: faker.number.int({ min: 50000, max: 500000 }),
      mimeType: "image/png",
      alt: faker.commerce.productDescription(),
    },
    type: "IMAGE",
    groupId: imageGroup.id,
    order: 1,
  });

  // ── Videos ────────────────────────────────────────────────────────────────

  await ConfigService.createConfig({
    key: "videos_curated_collection",
    label: "Default Videos Curated Collection",
    description: "Base videos to displayed on curated collections page",
    value: [
      {
        originalName: "samplevideo-1.mp4",
        filename: "samplevideo-1.mp4",
        url: `${API_BASE_URL}/images/samplevideo-1.mp4`,
        path: `/images/samplevideo-1.mp4`,
        size: faker.number.int({ min: 50000, max: 500000 }),
        mimeType: "video/mp4",
        alt: faker.commerce.productDescription(),
      },
    ],
    type: "VIDEOS",
    groupId: videoGroup.id,
    order: 1,
  });

  // ── Shipping Calculation ──────────────────────────────────────────────────

  console.log("📦 Creating shipping calculation parameters...");

  await ConfigService.createConfig({
    key: "volume_divider",
    label: "Volume Divider",
    description: "Divider used to calculate volumetric weight from dimensions (L x W x H / volume_divider). Standard: 6000 for domestic shipping",
    value: 6000,
    type: "NUMBER",
    groupId: shippingCalcGroup.id,
    validation: { min: 1000, max: 10000, required: true },
    order: 1,
  });

  await ConfigService.createConfig({
    key: "price_per_kg",
    label: "Price Per Kilogram",
    description: "Shipping cost per kilogram of weight (in IDR)",
    value: 5000,
    type: "DECIMAL",
    groupId: shippingCalcGroup.id,
    validation: { min: 0, required: true },
    order: 2,
  });

  await ConfigService.createConfig({
    key: "price_per_km",
    label: "Price Per Kilometer",
    description: "Shipping cost per kilometer of distance (in IDR)",
    value: 1000,
    type: "DECIMAL",
    groupId: shippingCalcGroup.id,
    validation: { min: 0, required: true },
    order: 3,
  });

  await ConfigService.createConfig({
    key: "base_price",
    label: "Base Shipping Price",
    description: "Base shipping cost before weight and distance calculations (in IDR)",
    value: 10000,
    type: "DECIMAL",
    groupId: shippingCalcGroup.id,
    validation: { min: 0, required: true },
    order: 4,
  });

  await ConfigService.createConfig({
    key: "min_shipping",
    label: "Minimum Shipping Cost",
    description: "Minimum shipping cost regardless of calculation (in IDR)",
    value: 15000,
    type: "DECIMAL",
    groupId: shippingCalcGroup.id,
    validation: { min: 0, required: true },
    order: 5,
  });

  await ConfigService.createConfig({
    key: "origin_lat",
    label: "Origin Latitude",
    description: "Latitude coordinate of shipping origin/warehouse location. Example: Jakarta = -6.2088",
    value: -6.2088,
    type: "DECIMAL",
    groupId: shippingCalcGroup.id,
    validation: { min: -90, max: 90, required: true },
    order: 6,
  });

  await ConfigService.createConfig({
    key: "origin_long",
    label: "Origin Longitude",
    description: "Longitude coordinate of shipping origin/warehouse location. Example: Jakarta = 106.8456",
    value: 106.8456,
    type: "DECIMAL",
    groupId: shippingCalcGroup.id,
    validation: { min: -180, max: 180, required: true },
    order: 7,
  });

  await ConfigService.createConfig({
    key: "earth_radius_km",
    label: "Earth Radius (km)",
    description: "Earth radius in kilometers for Haversine formula. Standard value: 6371 km",
    value: 6371,
    type: "DECIMAL",
    groupId: shippingCalcGroup.id,
    validation: { min: 6000, max: 7000, required: true },
    order: 8,
  });

  // ── Shipping Zones ────────────────────────────────────────────────────────
  // Each zone has:
  //   max_km        — upper distance bound (null = catch-all final zone)
  //   multiplier    — applied to the formula result (null when price_override is set)
  //   price_override — flat price in IDR, bypasses formula entirely (null = use multiplier)

  await ConfigService.createConfig({
    key: "shipping_zones",
    label: "Shipping Zones",
    description: "Zone tiers by distance. Set multiplier to scale formula cost, or price_override for a flat rate (IDR). max_km: null means the zone applies to all remaining distances.",
    value: [
      { zone: "Z1", label: "Local", max_km: 10, multiplier: 1.0, price_override: null },
      { zone: "Z2", label: "Nearby", max_km: 30, multiplier: 1.2, price_override: null },
      { zone: "Z3", label: "Regional", max_km: 100, multiplier: 1.5, price_override: null },
      { zone: "Z4", label: "Long Distance", max_km: null, multiplier: 2.0, price_override: null },
    ],
    type: "JSON",
    groupId: shippingCalcGroup.id,
    validation: { required: true },
    order: 9,
  });

  console.log("✅ Shipping calculation parameters created successfully");

  // ── Product Dimensions ────────────────────────────────────────────────────

  console.log("📐 Creating product dimensions parameters...");

  const sizeConfigs = [
    { key: "XS", label: "Size XS", weight_g: 160, length_cm: 26, width_cm: 22, height_cm: 2, order: 1 },
    { key: "S", label: "Size S", weight_g: 180, length_cm: 28, width_cm: 24, height_cm: 2, order: 2 },
    { key: "M", label: "Size M", weight_g: 200, length_cm: 30, width_cm: 25, height_cm: 2, order: 3 },
    { key: "L", label: "Size L", weight_g: 220, length_cm: 32, width_cm: 27, height_cm: 2, order: 4 },
    { key: "XL", label: "Size XL", weight_g: 240, length_cm: 34, width_cm: 29, height_cm: 2, order: 5 },
    { key: "XXL", label: "Size XXL", weight_g: 260, length_cm: 36, width_cm: 31, height_cm: 2, order: 6 },
    { key: "XXXL", label: "Size XXXL", weight_g: 300, length_cm: 38, width_cm: 33, height_cm: 2, order: 7 },
  ];

  for (const { key, label, order, ...dimensions } of sizeConfigs) {
    await ConfigService.createConfig({
      key,
      label: `${label} Dimensions`,
      description: `Product dimensions for ${label} (Weight: ${dimensions.weight_g}g, Dimensions: ${dimensions.length_cm}x${dimensions.width_cm}x${dimensions.height_cm} cm)`,
      value: dimensions,
      type: "JSON",
      groupId: productDimensionsGroup.id,
      order,
    });
  }

  console.log("✅ Product dimensions parameters created successfully");
}

async function main() {
  console.log("🌱 Starting seeding process...");

  await seedUsers();
  await seedConfigurations();
  await seedProducts();

  console.log("\n🎉 Seeding complete!");
  console.log(`📈 Total products created: ${categories.length * 20}`);
  console.log("👥 Admin and super admin users created successfully");
  console.log("✨ Config parameters created successfully");
  console.log("📦 Shipping calculation parameters created successfully");
  console.log("📐 Product dimensions parameters created successfully");
}

main()
  .catch((e) => {
    console.error("❌ Error during seeding:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
