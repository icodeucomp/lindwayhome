-- =============================================================================
-- product_variant_stock_sync — keeps products.stock equal to the sum of its
-- variants (CLAUDE.md D24).
--
-- WHY A TRIGGER AND NOT APPLICATION CODE
-- `stock` is the number the checkout reads to decide whether an item can still
-- be sold. If any write path ever forgets to recompute it, the column drifts
-- silently and the store oversells — with no error anywhere. A trigger makes the
-- drift structurally impossible instead of merely unlikely.
--
-- CONSEQUENCE: application code must NEVER write products.stock. Write
-- product_variants.quantity and let the database follow.
--
-- HOW TO APPLY
-- prisma/migrations/ is gitignored in this repo, so a hand-edited migration
-- would not survive a fresh clone. Run this file explicitly after migrating:
--
--   psql "$DATABASE_URL" -f prisma/triggers/product-stock.sql
--
-- It is idempotent — safe to re-run after every db:reset.
-- =============================================================================

CREATE OR REPLACE FUNCTION recompute_product_stock() RETURNS TRIGGER AS $$
BEGIN
  -- On UPDATE the variant may have moved between products, so both sides are
  -- recomputed. COALESCE covers the case where the last variant was deleted.
  IF (TG_OP = 'DELETE' OR TG_OP = 'UPDATE') THEN
    UPDATE "products"
       SET "stock" = COALESCE(
             (SELECT SUM("quantity") FROM "product_variants" WHERE "productId" = OLD."productId"), 0)
     WHERE "id" = OLD."productId";
  END IF;

  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    UPDATE "products"
       SET "stock" = COALESCE(
             (SELECT SUM("quantity") FROM "product_variants" WHERE "productId" = NEW."productId"), 0)
     WHERE "id" = NEW."productId";
  END IF;

  RETURN NULL; -- AFTER trigger; the return value is ignored
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS product_variant_stock_sync ON "product_variants";

CREATE TRIGGER product_variant_stock_sync
AFTER INSERT OR DELETE OR UPDATE OF "quantity", "productId"
ON "product_variants"
FOR EACH ROW
EXECUTE FUNCTION recompute_product_stock();
