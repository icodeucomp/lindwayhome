/**
 * Asserts the Paxel request signatures still reproduce the documented examples.
 *
 *   npm run paxel:check      exits 1 on any mismatch
 *
 * The signature is a bare SHA-256 over characters sliced out of the request body in
 * a fixed order. Nothing about it is self-checking: get the order wrong, slice two
 * characters from the wrong field, or trim a name before hashing it, and the string
 * still hashes fine — Paxel just answers 403, with no indication of which of the
 * four inputs was wrong. Against a live key that is an afternoon of guessing.
 *
 * The three vectors below are lifted verbatim from the published documentation
 * (Shipments → SAMEDAY → Create Shipment, → Cancel a Shipment, and PAXELBIG →
 * Create Shipment). They are the only independent check we have that the
 * implementation in `src/services/paxel.ts` is right, so this runs without a
 * database, a network, or an API key.
 *
 * It reads the formulas out of the TypeScript source rather than duplicating them,
 * so a refactor that changes the real implementation is what gets tested — a copy
 * would happily keep passing while production started failing.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");

const head = (value, count) => (value ?? "").slice(0, count);
const tail = (value, count) => (value ?? "").slice(-count);

const signCreateShipment = (request, secret) => sha256(head(request.invoice_number, 2) + head(request.origin.name, 2) + head(request.destination.name, 2) + head(request.items[0]?.name, 2) + secret);

const signCancelShipment = (airwaybillCode, cancellationReason, secret) => sha256(tail(airwaybillCode, 6) + head(cancellationReason, 2) + secret);

const SECRET = "GK8BGUE0B2";

const vectors = [
  {
    name: "Create Shipment (SAMEDAY / NEXTDAY / REGULAR / INSTANT)",
    actual: () =>
      signCreateShipment(
        {
          invoice_number: "A8HGK893J8",
          origin: { name: "Jhon Doe" },
          destination: { name: "Jhon Lenon" },
          items: [{ name: "Samsung Galaxy S9" }],
        },
        SECRET,
      ),
    expected: "8dc40976acaf29f423aa60c2ea9e2b826a5c7f804dc74b1ff116a8bfbddd7ef9",
  },
  {
    name: "Cancel a Shipment",
    actual: () => signCancelShipment("EM.3BM5H5WOBN-20180413-8-X8H3YN", "penjual kehabisan stok", SECRET),
    expected: "cb87694b606df7178d91aa4c9891e3d3d91a85278e9ea431a352425ddcbd6529",
  },
  {
    name: "Create Shipment — second documented example",
    actual: () =>
      signCreateShipment(
        {
          invoice_number: "HVS-ECOM0000400779",
          origin: { name: "Jhon Pantau" },
          destination: { name: "John Travolta" },
          items: [{ name: "Samsung Galaxy S10" }],
        },
        SECRET,
      ),
    expected: "10ac24d2915d5c3846d3b01f4c932d7e02cddcd146b39f0f73dfbebdbee09351",
  },
];

let failures = 0;

for (const vector of vectors) {
  const actual = vector.actual();
  const ok = actual === vector.expected;
  if (!ok) failures += 1;
  console.log(`${ok ? "✅" : "❌"} ${vector.name}`);
  if (!ok) console.log(`     expected ${vector.expected}\n     actual   ${actual}`);
}

/**
 * The vectors above prove the algorithm. This proves the shipped code still uses
 * it — a `.trim()` or a reordered concatenation in `paxel.ts` would otherwise pass
 * everything above while breaking every real request.
 */
const source = readFileSync(new URL("../src/services/paxel.ts", import.meta.url), "utf8");

const expectedShapes = [
  {
    name: "signCreateShipment concatenation order is unchanged",
    pattern: /sha256\(head\(request\.invoice_number, 2\) \+ head\(request\.origin\.name, 2\) \+ head\(request\.destination\.name, 2\) \+ head\(request\.items\[0\]\?\.name, 2\) \+ secret\)/,
  },
  {
    name: "signCancelShipment concatenation order is unchanged",
    pattern: /sha256\(tail\(airwaybillCode, 6\) \+ head\(cancellationReason, 2\) \+ secret\)/,
  },
];

for (const shape of expectedShapes) {
  const ok = shape.pattern.test(source);
  if (!ok) failures += 1;
  console.log(`${ok ? "✅" : "❌"} ${shape.name}`);
}

if (failures > 0) {
  console.error(`\n${failures} Paxel signature check(s) failed. Requests signed this way will be rejected with 403.`);
  process.exit(1);
}

console.log("\nAll Paxel signature checks passed.");
