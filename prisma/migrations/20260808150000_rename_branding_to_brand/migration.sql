-- Taxonomy axis "branding" renamed to "brand".
--
-- "Branding" is the activity of building a brand; the column holds the brand itself.
-- Written by hand for the same reason as the clothing rename: `migrate diff` renders a
-- rename as DROP plus ADD, which would discard the value on every product. RENAME keeps
-- the data and takes only a metadata lock.
ALTER TYPE "BrandingType" RENAME TO "BrandType";
ALTER TABLE "products" RENAME COLUMN "branding" TO "brand";
ALTER INDEX "products_branding_idx" RENAME TO "products_brand_idx";
