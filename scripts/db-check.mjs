/**
 * Reports violations of the rules Prisma cannot express (CLAUDE.md §B4).
 *
 * This repo has no test framework, so this script is the only automated guard on
 * data integrity. Each rule is a class of silent bug: nothing errors when it is
 * broken, the damage just surfaces later as a nameless product, a 404 at
 * checkout, or stock the store does not actually have.
 *
 *   npm run db:check      exits 1 if anything is violated, so it can gate a deploy
 */
import "dotenv/config";
import pg from "pg";

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const checks = [
  {
    // Products no longer need an EN row at all: `name` is a column (D26) and every
    // remaining translated field is either nullable or config-defaulted. What is
    // still wrong is ID without EN, because the fallback runs ID → EN per field —
    // an ID-only row hides that text from English visitors with no way to reach it.
    name: "No product has an ID translation without an EN one",
    why: "The per-field fallback runs ID → EN, so an ID-only row is invisible to English visitors (§B3.2)",
    sql: `SELECT p.sku AS detail
            FROM products p
           WHERE EXISTS (SELECT 1 FROM product_translations t WHERE t."productId" = p.id AND t.locale = 'ID')
             AND NOT EXISTS (SELECT 1 FROM product_translations t WHERE t."productId" = p.id AND t.locale = 'EN')
           ORDER BY p.sku`,
  },
  {
    name: "Every article has an EN translation",
    why: "Same reason as products: the fallback chain assumes EN exists",
    sql: `SELECT a.slug AS detail
            FROM articles a
           WHERE NOT EXISTS (SELECT 1 FROM article_translations t WHERE t."articleId" = a.id AND t.locale = 'EN')
           ORDER BY a.slug`,
  },
  {
    name: "Every published size guide has an EN translation",
    why: "The public size guide page would render a titleless table",
    sql: `SELECT g.id AS detail
            FROM size_guides g
           WHERE g."publishedAt" IS NOT NULL
             AND NOT EXISTS (SELECT 1 FROM size_guide_translations t WHERE t."sizeGuideId" = g.id AND t.locale = 'EN')`,
  },
  {
    name: "Every Size.code has a package_dimensions config key",
    why: "Checkout returns 404 for that size — discovered by the buyer, not the admin (§B4.2)",
    sql: `SELECT s.code AS detail
            FROM sizes s
           WHERE s."isActive"
             AND NOT EXISTS (
               SELECT 1 FROM config_parameters cp
                 JOIN config_parameter_groups g ON g.id = cp."groupId"
                WHERE g.name = 'package_dimensions' AND cp.key = s.code)
           ORDER BY s.code`,
  },
  {
    name: "Every ProductVariant uses a size from its product's size guide",
    why: "Orphan variants never appear in the size table the buyer sees",
    sql: `SELECT p.sku || ' / ' || s.code AS detail
            FROM product_variants v
            JOIN products p ON p.id = v."productId"
            JOIN sizes s ON s.id = v."sizeId"
           WHERE p."sizeGuideId" IS NOT NULL
             AND NOT EXISTS (
               SELECT 1 FROM size_guide_rows r
                WHERE r."sizeGuideId" = p."sizeGuideId" AND r."sizeId" = v."sizeId")
           ORDER BY 1`,
  },
  {
    name: "products.stock equals SUM(product_variants.quantity)",
    why: "Stock gates overselling. The trigger should make this impossible — a hit here means the trigger is missing (D24)",
    sql: `SELECT p.sku || ': stock ' || p.stock || ' vs variants ' ||
                 COALESCE((SELECT SUM(v.quantity) FROM product_variants v WHERE v."productId" = p.id), 0) AS detail
            FROM products p
           WHERE p.stock <> COALESCE((SELECT SUM(v.quantity) FROM product_variants v WHERE v."productId" = p.id), 0)
           ORDER BY p.sku`,
  },
  {
    // The origin is the address a courier is sent to collect from, and every field
    // of it is required by Paxel. v1's shipping service filled gaps from hardcoded
    // defaults, which is how it shipped with Jakarta coordinates while the brand
    // operates from Denpasar (A9.11). `getShippingOrigin` now throws instead — this
    // finds the same problem before a buyer does.
    name: "The Paxel pickup origin is fully configured",
    why: "A missing key makes every checkout quote fail with 'Shipping origin is not configured'",
    sql: `SELECT required.key AS detail
            FROM (VALUES ('origin_name'),('origin_phone'),('origin_address'),('origin_province'),('origin_city'),
                         ('origin_district'),('origin_village'),('origin_zip_code'),('origin_lat'),('origin_long'),
                         ('enabled_services'),('shipping_timezone')) AS required(key)
           WHERE NOT EXISTS (
             SELECT 1 FROM config_parameters cp
               JOIN config_parameter_groups g ON g.id = cp."groupId"
              WHERE g.name = 'shipping' AND cp.key = required.key AND cp."isActive"
                AND cp.value IS NOT NULL AND cp.value::text NOT IN ('""', 'null'))
           ORDER BY 1`,
  },
  {
    // `enabled_services` is what the checkout iterates. A value Paxel does not
    // publish is dropped silently at quote time, so the option simply never appears
    // and nobody can tell whether that is a config typo or a coverage gap.
    name: "Every enabled_services entry is a real Paxel service",
    why: "An unrecognised service is dropped at quote time, so the option silently never appears at checkout",
    sql: `SELECT service AS detail
            FROM config_parameters cp
            JOIN config_parameter_groups g ON g.id = cp."groupId"
            CROSS JOIN LATERAL jsonb_array_elements_text(cp.value::jsonb) AS service
           WHERE g.name = 'shipping' AND cp.key = 'enabled_services'
             AND jsonb_typeof(cp.value::jsonb) = 'array'
             AND service NOT IN ('SAMEDAY','NEXTDAY','REGULAR','INSTANT')
           ORDER BY 1`,
  },
  {
    // An order with no coordinates cannot be booked: Paxel takes lat/long on the
    // destination, and a courier navigating by the text address alone in Indonesia
    // is how parcels end up at the kelurahan office.
    name: "Every order carries a destination the courier can be sent to",
    why: "Booking a pickup needs province/city/district/village and coordinates — an order missing them can never ship",
    sql: `SELECT o.id AS detail
            FROM orders o
           WHERE o.province = '' OR o.district = '' OR o.sub_district = '' OR o.village = ''
              OR o.latitude = 0 OR o.longitude = 0
           ORDER BY o."createdAt" DESC`,
  },
  {
    // Two live bookings for one order means two couriers arrive and we are billed
    // twice. The book endpoint refuses it; this catches anything that got past it.
    name: "No order has more than one active shipment",
    why: "Two live bookings means two couriers dispatched, and two charges, for one parcel",
    sql: `SELECT s."orderId" || ' (' || COUNT(*) || ' active)' AS detail
            FROM shipments s
           WHERE s.status NOT IN ('CANCELLED', 'FAILED')
           GROUP BY s."orderId"
          HAVING COUNT(*) > 1
           ORDER BY 1`,
  },
  {
    name: "The stock trigger is installed",
    why: "Without it products.stock silently drifts on every variant write",
    sql: `SELECT 'product_variant_stock_sync is NOT installed — run npm run db:migrate' AS detail
           WHERE NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'product_variant_stock_sync')`,
  },
];

let failed = 0;

for (const check of checks) {
  const { rows } = await client.query(check.sql);
  if (rows.length === 0) {
    console.log(`✓ ${check.name}`);
    continue;
  }

  failed++;
  console.log(`\n✗ ${check.name}`);
  console.log(`  ${check.why}`);
  for (const row of rows.slice(0, 20)) console.log(`    · ${row.detail}`);
  if (rows.length > 20) console.log(`    … and ${rows.length - 20} more`);
  console.log("");
}

await client.end();

if (failed > 0) {
  console.log(`\n${failed} invariant${failed > 1 ? "s" : ""} violated.`);
  process.exit(1);
}

console.log("\nAll invariants hold.");
