import { Prisma } from "prisma-client/client";

/**
 * Standard shape for reading a product. Variants come back ordered by `size.order`
 * — `SizeGuideRow` has no order column of its own precisely so that there is only
 * one ordering source (D21), and the same rule applies here.
 */
export const productInclude = {
  translations: true,
  variants: { include: { size: true }, orderBy: { size: { order: "asc" } } },
  sizeGuide: { include: { translations: true, rows: { include: { size: true }, orderBy: { size: { order: "asc" } } } } },
} satisfies Prisma.ProductInclude;

/** Standard shape for reading an order with its lines. */
export const orderInclude = {
  member: true,
  items: {
    include: {
      product: {
        select: {
          id: true,
          sku: true,
          slug: true,
          images: true,
          branding: true,
          translations: true,
        },
      },
    },
  },
} satisfies Prisma.OrderInclude;
