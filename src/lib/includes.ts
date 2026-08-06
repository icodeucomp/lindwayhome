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

/** Rows ordered by `size.order` — SizeGuideRow deliberately has no order column (D21). */
export const sizeGuideInclude = {
  translations: true,
  rows: { include: { size: true }, orderBy: { size: { order: "asc" } } },
} satisfies Prisma.SizeGuideInclude;

/** Categories carry their name only in the translation, so it is always included. */
export const articleCategoryInclude = {
  translations: true,
  _count: { select: { articles: true } },
} satisfies Prisma.ArticleCategoryInclude;

export const articleInclude = {
  translations: true,
  category: { select: { id: true, slug: true, translations: true } },
  // Author is nullable so removing an admin does not remove their articles; the
  // password hash must never leave the server, hence the explicit select.
  author: { select: { id: true, username: true } },
} satisfies Prisma.ArticleInclude;

/** The question and answer live only in the translation, so it is always included. */
export const faqInclude = { translations: true } satisfies Prisma.FaqInclude;

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
          // A plain column since D26 — order screens and the confirmation email no
          // longer resolve a name through the translation table.
          name: true,
          images: true,
          branding: true,
        },
      },
    },
  },
} satisfies Prisma.OrderInclude;
