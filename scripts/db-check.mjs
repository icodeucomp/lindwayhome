/**
 * Reports violations of the four rules Prisma cannot express (CLAUDE.md §B4).
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
    name: "Every product has an EN translation",
    why: "Product has no name column — a product without an EN row renders nameless everywhere (D3)",
    sql: `SELECT p.sku AS detail
            FROM products p
           WHERE NOT EXISTS (SELECT 1 FROM product_translations t WHERE t."productId" = p.id AND t.locale = 'EN')
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
    name: "The stock trigger is installed",
    why: "Without it products.stock silently drifts on every variant write",
    sql: `SELECT 'product_variant_stock_sync is NOT installed — run npm run db:trigger' AS detail
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
