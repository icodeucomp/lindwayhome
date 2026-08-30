import { ShipmentStatus, ShippingServiceType } from "@/types";

/**
 * Display maps for the courier layer, mirroring `static/order.ts`.
 *
 * Every screen that renders a shipment reads from here, so the wording and colour
 * stay identical between the order detail, the pickup list and the badge in the
 * sidebar. `PAXEL_STATUS_LABELS` in `types/paxel.ts` is a different thing and
 * deliberately separate: that translates Paxel's own fine-grained codes, this
 * labels our coarse lifecycle.
 */

export const shipmentStatusLabels: Record<ShipmentStatus, string> = {
  BOOKED: "Booked",
  PICKED_UP: "Picked Up",
  IN_TRANSIT: "In Transit",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  FAILED: "Failed",
};

export const shipmentStatusColors: Record<ShipmentStatus, string> = {
  BOOKED: "bg-amber-500/15 text-amber-700",
  PICKED_UP: "bg-primary/15 text-primary",
  IN_TRANSIT: "bg-sky-500/15 text-sky-700",
  DELIVERED: "bg-emerald-500/15 text-emerald-700",
  CANCELLED: "bg-red-500/12 text-red-700",
  FAILED: "bg-red-500/12 text-red-700",
};

/** Lifecycle order, not alphabetical. */
export const SHIPMENT_STATUS_SEQUENCE: ShipmentStatus[] = ["BOOKED", "PICKED_UP", "IN_TRANSIT", "DELIVERED", "CANCELLED", "FAILED"];

export const shipmentStatusOptions = [{ value: "", label: "All" }, ...SHIPMENT_STATUS_SEQUENCE.map((status) => ({ value: status, label: shipmentStatusLabels[status] }))];

export const shippingServiceLabels: Record<ShippingServiceType, string> = {
  SAMEDAY: "Same Day",
  NEXTDAY: "Next Day",
  REGULAR: "Regular",
  INSTANT: "Instant",
};

/** Fastest first — the order the checkout offers them in, so the two screens agree. */
export const SHIPPING_SERVICE_SEQUENCE: ShippingServiceType[] = ["SAMEDAY", "NEXTDAY", "REGULAR", "INSTANT"];

export const shippingServiceOptions = SHIPPING_SERVICE_SEQUENCE.map((service) => ({ value: service, label: shippingServiceLabels[service] }));

/**
 * A shipment can only be cancelled before the courier has it. Once the parcel is
 * picked up Paxel answers 410 Gone, so offering the button would be offering a
 * failure.
 */
export const isCancellableShipment = (status: ShipmentStatus): boolean => status === "BOOKED";
