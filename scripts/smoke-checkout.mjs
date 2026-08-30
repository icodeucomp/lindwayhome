/**
 * End-to-end checkout + shipping smoke test.
 *
 * This repo has no test framework, so this script is the only automated coverage of
 * the pricing path — and now of the courier path too. Point it at a running dev
 * server (`npm run dev`, then `npm run smoke:checkout`).
 *
 * It asserts, in order:
 *   · the subtotal is derived from database prices, and an injected `purchased=1` is ignored (A9.1)
 *   · every courier service comes back with its own signed token (D28)
 *   · the token binds the service and the destination, so neither can be swapped after pricing
 *   · the total stored on `Order` equals the total signed into the token
 *   · `OrderItem` carries a unitPrice/lineTotal snapshot
 *   · verification decrements the variant, `products.stock` follows via the trigger, `soldCount` rises
 *   · status moves AWAITING_PAYMENT → PAID
 *   · a pickup books, tracks, appears in the day's list, and cancels — returning the order to PAID
 */
const BASE = "http://localhost:3000/api";

let failures = 0;

const j = async (res) => {
  const body = await res.json();
  if (!res.ok) throw new Error(`${res.status} ${JSON.stringify(body).slice(0, 400)}`);
  return body;
};

/** Same, but hands back the status instead of throwing — for the paths we expect to fail. */
const raw = async (res) => ({ status: res.status, body: await res.json() });

const step = (n, msg) => console.log(`\n${n}. ${msg}`);

const check = (label, ok, detail = "") => {
  if (!ok) failures++;
  console.log(`   ${ok ? "✓" : "✗"} ${label}${detail ? ` — ${detail}` : ""}`);
};

// 1 — pick a seeded product
step(1, "GET /products");
const products = await j(await fetch(`${BASE}/products?limit=1&isActive=true&locale=EN`));
const product = products.data[0];
const variant = product.variants[0];
console.log(`   ${product.sku} "${product.name}" — stock ${product.stock}, soldCount ${product.soldCount}`);
console.log(`   size ${variant.size.code} qty ${variant.quantity} · unit ${product.discountedPrice}`);

const items = [{ productId: product.id, selectedSize: variant.size.code, quantity: 2 }];
const expectedSubtotal = Number(product.discountedPrice) * 2;

const destination = {
  province: "Bali",
  district: "Kota Denpasar",
  sub_district: "Denpasar Timur",
  village: "Sumerta",
};

// 2 — quote every courier service, WITHOUT sending any price
step(2, "GET /orders/checkout (no purchased/totalItemsSold sent)");
const q = new URLSearchParams({ ...destination, email: "smoke@example.com", postalCode: "80239", items: JSON.stringify(items) });
const calc = await j(await fetch(`${BASE}/orders/checkout?${q}`));

check("subtotal derived from database prices", calc.data.purchased === expectedSubtotal, `${calc.data.purchased} vs expected ${expectedSubtotal}`);
check("totalItemsSold derived server-side", calc.data.totalItemsSold === 2, String(calc.data.totalItemsSold));
console.log(`   parcel ${calc.data.parcel.dimension} cm @ ${calc.data.parcel.weightG} g`);

for (const service of calc.data.services) {
  if (service.available) console.log(`   · ${service.serviceType.padEnd(8)} ${String(service.cost).padStart(7)}  total ${service.totalPurchased}  ${service.isMock ? "[mock]" : ""}`);
  else console.log(`   · ${service.serviceType.padEnd(8)} unavailable — ${service.reason}`);
}

const offered = calc.data.services.filter((service) => service.available);
check("at least one courier service is available", offered.length > 0);
check("every available service carries its own token", offered.every((service) => typeof service.checkoutToken === "string" && service.checkoutToken.length > 0));
check("tokens are distinct per service", new Set(offered.map((service) => service.checkoutToken)).size === offered.length);

const chosen = offered[0];

// 3 — a tampered subtotal must not be honoured (A9.1)
step(3, "GET /orders/checkout with purchased=1 injected");
const tampered = await j(await fetch(`${BASE}/orders/checkout?${q}&purchased=1&totalItemsSold=1`));
check("client-supplied purchased is ignored", tampered.data.purchased === expectedSubtotal, String(tampered.data.purchased));

// 4 — the token must not survive a changed destination (D28)
step(4, "POST /orders/checkout with the token replayed against a different address");
const receipt = { filename: "r.webp", originalName: "r.webp", url: "/images/qris.jpeg", path: "/images/qris.jpeg", size: 1234, mimeType: "image/webp", alt: "receipt", isMoved: true };

const buyer = {
  email: "smoke@example.com",
  fullname: "Smoke Test",
  whatsappNumber: "6281234567890",
  address: "Jl. Test 1",
  postalCode: 80239,
  latitude: -8.65,
  longitude: 115.24,
  isPinned: true,
  paymentMethod: "BANK_TRANSFER",
  receiptImage: receipt,
  items,
};

const replayed = await raw(
  await fetch(`${BASE}/orders/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...buyer, ...destination, village: "Kesiman", checkoutToken: chosen.checkoutToken }),
  }),
);
check("a quote cannot be replayed against another address", replayed.status === 400, `got ${replayed.status}`);

// 5 — create the order for real
step(5, "POST /orders/checkout");
const created = await j(
  await fetch(`${BASE}/orders/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...buyer,
      ...destination,
      checkoutToken: chosen.checkoutToken,
      // deliberately lying about the price and the service — the server must ignore both
      purchased: 1,
      totalPurchased: 1,
      shippingCost: 0,
      shippingServiceType: "INSTANT",
    }),
  }),
);
const orderId = created.data.id;
console.log(`   ${created.message}  id=${orderId}`);

// 6 — admin verifies
step(6, "POST /auth/login → PUT /orders/[id] { isPurchased: true }");
const auth = await j(await fetch(`${BASE}/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: "admin", password: "!Admin123" }) }));
const token = auth.data.token;
const authed = { Authorization: `Bearer ${token}` };

const before = await j(await fetch(`${BASE}/orders/${orderId}`, { headers: authed }));
check("stored total matches the signed total", Number(before.data.totalPurchased) === chosen.totalPurchased, `${before.data.totalPurchased} vs ${chosen.totalPurchased}`);
check("stored shipping matches the signed shipping", Number(before.data.shippingCost) === chosen.cost, `${before.data.shippingCost} vs ${chosen.cost}`);
check("service came from the token, not the request body", before.data.shippingServiceType === chosen.serviceType, `${before.data.shippingServiceType} vs claimed INSTANT`);
check("line snapshot recorded", Number(before.data.items[0].unitPrice) === Number(product.discountedPrice));
check("destination persisted", before.data.village === destination.village && before.data.district === destination.district);

await j(await fetch(`${BASE}/orders/${orderId}`, { method: "PUT", headers: { "Content-Type": "application/json", ...authed }, body: JSON.stringify({ isPurchased: true }) }));

// 7 — stock and soldCount must both have moved, via the trigger
step(7, "GET /products/[id] — stock + soldCount after verification");
const after = await j(await fetch(`${BASE}/products/${product.id}`));
const afterVariant = after.data.variants.find((v) => v.size.code === variant.size.code);
check("variant decremented", afterVariant.quantity === variant.quantity - 2, `${variant.quantity} → ${afterVariant.quantity}`);
check("products.stock followed via the trigger", after.data.stock === product.stock - 2, `${product.stock} → ${after.data.stock}`);
check("soldCount incremented", after.data.soldCount === product.soldCount + 2, `${product.soldCount} → ${after.data.soldCount}`);

const verified = await j(await fetch(`${BASE}/orders/${orderId}`, { headers: authed }));
check("status moved to PAID", verified.data.status === "PAID", verified.data.status);

// 8 — book a courier pickup
step(8, "POST /orders/[id]/shipment");
const pad = (value) => String(value).padStart(2, "0");
const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
const pickupDate = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`;

const booked = await j(
  await fetch(`${BASE}/orders/${orderId}/shipment`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authed },
    body: JSON.stringify({ pickupDate, pickupTime: "10:00", note: "smoke test" }),
  }),
);
const airwaybill = booked.data.airwaybillCode;
console.log(`   airwaybill ${airwaybill}${booked.data.isMock ? " [mock]" : ""} · charge ${booked.data.shippingCost}`);
check("booked with the service the buyer paid for", booked.data.serviceType === chosen.serviceType, booked.data.serviceType);

const shipped = await j(await fetch(`${BASE}/orders/${orderId}`, { headers: authed }));
check("airwaybill became the order's tracking number", shipped.data.trackingNumber === airwaybill);
check("order status moved to SHIPPED", shipped.data.status === "SHIPPED", shipped.data.status);

// A second booking must be refused, or two couriers are dispatched for one parcel.
const doubleBooked = await raw(
  await fetch(`${BASE}/orders/${orderId}/shipment`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authed },
    body: JSON.stringify({ pickupDate, pickupTime: "11:00" }),
  }),
);
check("a second active booking is refused", doubleBooked.status === 409, `got ${doubleBooked.status}`);

// 9 — track it
step(9, "GET /shipments/[airwaybill]");
const tracked = await j(await fetch(`${BASE}/shipments/${encodeURIComponent(airwaybill)}`, { headers: authed }));
console.log(`   status ${tracked.data.latestStatus} (${tracked.data.statusLabel}) · ${tracked.data.logs?.length ?? 0} log entr${(tracked.data.logs?.length ?? 0) === 1 ? "y" : "ies"}`);
check("tracking recorded a courier status", Boolean(tracked.data.latestStatus));
check("lastTrackedAt was stamped", Boolean(tracked.data.lastTrackedAt));

// 10 — it shows up in the day's pickup list
step(10, "GET /shipments/pickups?date=");
const pickups = await j(await fetch(`${BASE}/shipments/pickups?date=${pickupDate}`, { headers: authed }));
check("the booking appears in the pickup list", pickups.data.shipments.some((s) => s.airwaybillCode === airwaybill), `${pickups.data.shipments.length} on ${pickupDate}`);

// 11 — cancel it
step(11, "POST /shipments/[airwaybill]/cancel");
const cancelled = await j(
  await fetch(`${BASE}/shipments/${encodeURIComponent(airwaybill)}/cancel`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authed },
    body: JSON.stringify({ cancellationReason: "smoke test cleanup" }),
  }),
);
check("shipment marked cancelled", cancelled.data.status === "CANCELLED", cancelled.data.status);

const afterCancel = await j(await fetch(`${BASE}/orders/${orderId}`, { headers: authed }));
// Back to PAID, not CANCELLED: the buyer has paid and the stock has moved, only the
// courier booking was undone.
check("order returned to PAID, ready to re-book", afterCancel.data.status === "PAID", afterCancel.data.status);
check("tracking number cleared", afterCancel.data.trackingNumber === null, String(afterCancel.data.trackingNumber));

const reasonless = await raw(
  await fetch(`${BASE}/shipments/${encodeURIComponent(airwaybill)}/cancel`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authed },
    body: JSON.stringify({ cancellationReason: "" }),
  }),
);
check("cancelling without a reason is refused", reasonless.status === 400, `got ${reasonless.status}`);

if (failures > 0) {
  console.error(`\n❌ ${failures} check${failures === 1 ? "" : "s"} failed`);
  process.exit(1);
}

console.log("\n✅ checkout and shipping drive end to end");
