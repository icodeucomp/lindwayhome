import { createHmac } from "crypto";

const SECRET = process.env.NEXT_PUBLIC_CHECKOUT_TOKEN || "default_secret_for_checkout_token";

/**
 * What the server locks for 15 minutes so the client cannot name its own price.
 *
 * `serviceType` joined the payload when shipping moved to Paxel, and it belongs
 * here for the same reason every other field does. The buyer is quoted four prices,
 * one per courier service. Signing only the amount would leave the service itself
 * free: a buyer could take the REGULAR quote and submit the order asking for
 * INSTANT, and we would book — and be billed for — a service nobody paid for.
 * Binding the two together means the signed price is a price *for something*.
 *
 * `destinationHash` closes the matching hole on the address. The quote is priced for
 * one destination; without binding it, the same signed cost could be replayed
 * against an address on another island.
 *
 * Everything else about the token is unchanged (D8): same HMAC, same 15-minute
 * window, same base64url envelope, same verification order in the POST handler.
 */
export interface CheckoutTokenPayload {
  shippingCost: number;
  totalPurchased: number;
  purchased: number;
  totalItemsSold: number;
  itemsHash: string;
  serviceType: string;
  destinationHash: string;
  expiresAt: number;
}

export const signCheckoutToken = (payload: CheckoutTokenPayload): string => {
  const data = JSON.stringify(payload);
  const sig = createHmac("sha256", SECRET).update(data).digest("hex");
  return Buffer.from(JSON.stringify({ data, sig })).toString("base64url");
};

export const verifyCheckoutToken = (token: string): CheckoutTokenPayload => {
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
};

export const hashItems = (items: { productId: string; selectedSize: string; quantity: number }[]): string => {
  const normalized = [...items]
    .sort((a, b) => a.productId.localeCompare(b.productId))
    .map((i) => `${i.productId}:${i.selectedSize}:${i.quantity}`)
    .join("|");
  return createHmac("sha256", SECRET).update(normalized).digest("hex");
};

export interface DestinationFingerprint {
  province: string;
  district: string;
  sub_district: string;
  village: string;
  postalCode: number | string;
}

/**
 * Binds a quote to the address it was quoted for.
 *
 * Only the administrative levels and the postcode are hashed — the four fields the
 * courier actually prices on. The street line and the map pin are deliberately left
 * out: a buyer correcting "No. 6" to "No. 6C", or nudging the pin down the street,
 * has not changed what the shipment costs and should not be told to start again.
 */
export const hashDestination = (destination: DestinationFingerprint): string => {
  // `String()` rather than a bare `.trim()`: the POST handler hashes the raw request
  // body to compare against the token, and it does so *before* the body has been
  // validated. A missing field must produce a mismatch, not a TypeError.
  const normalized = [destination.province, destination.district, destination.sub_district, destination.village, destination.postalCode]
    .map((part) => String(part ?? "").trim().toUpperCase())
    .join("|");
  return createHmac("sha256", SECRET).update(normalized).digest("hex");
};
