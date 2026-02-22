import { createHmac } from "crypto";

const SECRET = process.env.CHECKOUT_TOKEN_SECRET || "default_secret_for_dev_only";

export interface CheckoutTokenPayload {
  shippingCost: number;
  totalPurchased: number;
  purchased: number;
  totalItemsSold: number;
  itemsHash: string;
  expiresAt: number;
}

export function signCheckoutToken(payload: CheckoutTokenPayload): string {
  const data = JSON.stringify(payload);
  const sig = createHmac("sha256", SECRET).update(data).digest("hex");
  return Buffer.from(JSON.stringify({ data, sig })).toString("base64url");
}

export function verifyCheckoutToken(token: string): CheckoutTokenPayload {
  let parsed: { data: string; sig: string };

  try {
    parsed = JSON.parse(Buffer.from(token, "base64url").toString());
  } catch {
    throw new Error("Malformed checkout token");
  }

  const { data, sig } = parsed;
  const expected = createHmac("sha256", SECRET).update(data).digest("hex");

  if (sig !== expected) {
    throw new Error("Invalid checkout token signature");
  }

  const payload: CheckoutTokenPayload = JSON.parse(data);

  if (Date.now() > payload.expiresAt) {
    throw new Error("Checkout session expired. Please recalculate your order.");
  }

  return payload;
}

export function hashItems(items: { productId: string; selectedSize: string; quantity: number }[]): string {
  const normalized = [...items]
    .sort((a, b) => a.productId.localeCompare(b.productId))
    .map((i) => `${i.productId}:${i.selectedSize}:${i.quantity}`)
    .join("|");
  return createHmac("sha256", SECRET).update(normalized).digest("hex");
}
