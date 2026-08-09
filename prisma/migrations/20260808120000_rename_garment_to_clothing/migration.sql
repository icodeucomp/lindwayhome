-- Taxonomy axis "garment" renamed to "clothing".
--
-- Written by hand rather than generated: `migrate diff` expresses a rename as a DROP
-- plus an ADD, which would discard the value on every product. RENAME keeps the data
-- and takes only a metadata lock.
ALTER TYPE "GarmentType" RENAME TO "ClothingType";
ALTER TABLE "products" RENAME COLUMN "garment" TO "clothing";
ALTER INDEX "products_garment_idx" RENAME TO "products_clothing_idx";
