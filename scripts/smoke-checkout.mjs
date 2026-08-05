/** End-to-end checkout smoke test — the C1 green checkpoint for phase 1. */
const BASE = "http://localhost:3000/api";
const j = async (res) => {
  const body = await res.json();
  if (!res.ok) throw new Error(`${res.status} ${JSON.stringify(body).slice(0, 300)}`);
  return body;
};
const step = (n, msg) => console.log(`\n${n}. ${msg}`);

// 1 — pick a seeded product
step(1, "GET /products");
const products = await j(await fetch(`${BASE}/products?limit=1&isActive=true&locale=EN`));
const product = products.data[0];
const variant = product.variants[0];
console.log(`   ${product.sku} "${product.name}" — stock ${product.stock}, soldCount ${product.soldCount}`);
console.log(`   size ${variant.size.code} qty ${variant.quantity} · unit ${product.discountedPrice}`);

const items = [{ productId: product.id, selectedSize: variant.size.code, quantity: 2 }];
const expectedSubtotal = Number(product.discountedPrice) * 2;

// 2 — calculate + get a signed token, WITHOUT sending any price
step(2, "GET /orders/checkout (no purchased/totalItemsSold sent)");
const q = new URLSearchParams({
  province: "Bali",
  district: "Kota Denpasar",
  sub_district: "Denpasar Timur",
  village: "Sumerta",
  email: "smoke@example.com",
  items: JSON.stringify(items),
});
const calc = await j(await fetch(`${BASE}/orders/checkout?${q}`));
console.log(`   server-derived purchased ${calc.data.purchased} (expected ${expectedSubtotal}) ${calc.data.purchased === expectedSubtotal ? "✓" : "✗"}`);
console.log(`   totalItemsSold ${calc.data.totalItemsSold} · shipping ${calc.data.shipping.cost} (${calc.data.shipping.zone}, ${calc.data.shipping.distance_km} km)`);
console.log(`   total ${calc.data.totalPurchased} · token ${calc.data.checkoutToken.slice(0, 24)}…`);

// 3 — a tampered subtotal must not be honoured (A9.1)
step(3, "GET /orders/checkout with purchased=1 injected");
const tampered = await j(await fetch(`${BASE}/orders/checkout?${q}&purchased=1&totalItemsSold=1`));
console.log(`   purchased still ${tampered.data.purchased} — client value ignored ${tampered.data.purchased === expectedSubtotal ? "✓" : "✗"}`);

// 4 — create the order
step(4, "POST /orders/checkout");
const receipt = { filename: "r.webp", originalName: "r.webp", url: "/images/qris.jpeg", path: "/images/qris.jpeg", size: 1234, mimeType: "image/webp", alt: "receipt", isMoved: true };
const created = await j(
  await fetch(`${BASE}/orders/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "smoke@example.com",
      fullname: "Smoke Test",
      whatsappNumber: "6281234567890",
      address: "Jl. Test 1",
      postalCode: 80239,
      paymentMethod: "BANK_TRANSFER",
      receiptImage: receipt,
      items,
      checkoutToken: calc.data.checkoutToken,
      // deliberately lying about the price — the server must ignore these
      purchased: 1,
      totalPurchased: 1,
      shippingCost: 0,
    }),
  }),
);
const orderId = created.data.id;
console.log(`   ${created.message}  id=${orderId}`);

// 5 — admin verifies
step(5, "POST /auth/login → PUT /orders/[id] { isPurchased: true }");
const auth = await j(await fetch(`${BASE}/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: "admin", password: "!Admin123" }) }));
const token = auth.data.token;
const before = await j(await fetch(`${BASE}/orders/${orderId}`, { headers: { Authorization: `Bearer ${token}` } }));
console.log(`   order total ${before.data.totalPurchased} · status ${before.data.status} · isPurchased ${before.data.isPurchased}`);
console.log(`   line snapshot: unitPrice ${before.data.items[0].unitPrice} lineTotal ${before.data.items[0].lineTotal}`);
console.log(`   stored total matches signed total ${Number(before.data.totalPurchased) === calc.data.totalPurchased ? "✓" : "✗"}`);

await j(await fetch(`${BASE}/orders/${orderId}`, { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ isPurchased: true }) }));

// 6 — stock and soldCount must both have moved, via the trigger
step(6, "GET /products/[id] — stock + soldCount after verification");
const after = await j(await fetch(`${BASE}/products/${product.id}`));
const afterVariant = after.data.variants.find((v) => v.size.code === variant.size.code);
console.log(`   variant ${variant.size.code}: ${variant.quantity} → ${afterVariant.quantity} ${afterVariant.quantity === variant.quantity - 2 ? "✓" : "✗"}`);
console.log(`   product stock: ${product.stock} → ${after.data.stock} ${after.data.stock === product.stock - 2 ? "✓ (trigger)" : "✗"}`);
console.log(`   soldCount: ${product.soldCount} → ${after.data.soldCount} ${after.data.soldCount === product.soldCount + 2 ? "✓" : "✗"}`);

const verified = await j(await fetch(`${BASE}/orders/${orderId}`, { headers: { Authorization: `Bearer ${token}` } }));
console.log(`   order status now ${verified.data.status} ${verified.data.status === "PAID" ? "✓" : "✗"}`);

console.log("\n✅ checkout drives end to end");
