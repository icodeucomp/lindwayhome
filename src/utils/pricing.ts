/**
 * The single source of a product's selling price (F-49).
 *
 * It looks trivial, and that is the point. The price a buyer sees on a card, on
 * the detail page, in the cart, and the price the checkout signs into the token
 * must come from one function. When two places computed it independently — one
 * reading `price`, another `discountedPrice`, or one rounding differently — the
 * quoted price and the charged price drift apart, and the only person who notices
 * is the buyer.
 *
 * `discountedPrice` is a stored column, recomputed whenever a product is written
 * (D22). Never derive it at read time from `price` and `discount`.
 */
export interface PricedProduct {
  price: unknown;
  discountedPrice: unknown;
}

/** Prisma returns Decimal; the client returns string or number. Normalise once. */
const toNumber = (value: unknown): number => {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value) || 0;
  if (value && typeof value === "object" && "toNumber" in value) return (value as { toNumber: () => number }).toNumber();
  return 0;
};

/** What one unit actually costs the buyer. */
export const resolveUnitPrice = (product: PricedProduct): number => toNumber(product.discountedPrice);

/** List price, for the struck-through figure beside the selling price. */
export const resolveListPrice = (product: PricedProduct): number => toNumber(product.price);

/** True when the product carries a markdown worth showing. */
export const hasDiscount = (product: PricedProduct): boolean => resolveUnitPrice(product) < resolveListPrice(product);

export const resolveLineTotal = (product: PricedProduct, quantity: number): number => resolveUnitPrice(product) * quantity;
