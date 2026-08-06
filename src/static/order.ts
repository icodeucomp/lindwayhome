import { OrderStatus } from "@/types";

/**
 * Display maps for `OrderStatus` (D23). v1 had no lifecycle beyond a boolean, so
 * there was nothing to label; every screen that shows a status reads from here so
 * the wording and the colour stay the same in the list, the detail and the pipeline.
 */

export const orderStatusLabels: Record<OrderStatus, string> = {
  AWAITING_PAYMENT: "Awaiting Payment",
  PAID: "Paid",
  SHIPPED: "Shipped",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const orderStatusColors: Record<OrderStatus, string> = {
  AWAITING_PAYMENT: "bg-amber-500/15 text-amber-700",
  PAID: "bg-primary/15 text-primary",
  SHIPPED: "bg-sky-500/15 text-sky-700",
  COMPLETED: "bg-emerald-500/15 text-emerald-700",
  CANCELLED: "bg-red-500/12 text-red-700",
};

/** Bar fill for the dashboard pipeline — solid, so it reads at 4px tall. */
export const orderStatusBars: Record<OrderStatus, string> = {
  AWAITING_PAYMENT: "bg-amber-500",
  PAID: "bg-primary",
  SHIPPED: "bg-sky-600",
  COMPLETED: "bg-emerald-600",
  CANCELLED: "bg-red-600",
};

/** Lifecycle order, not alphabetical — used wherever the statuses are listed. */
export const ORDER_STATUS_SEQUENCE: OrderStatus[] = [OrderStatus.AWAITING_PAYMENT, OrderStatus.PAID, OrderStatus.SHIPPED, OrderStatus.COMPLETED, OrderStatus.CANCELLED];

export const orderStatusOptions = [{ value: "", label: "All" }, ...ORDER_STATUS_SEQUENCE.map((status) => ({ value: status, label: orderStatusLabels[status] }))];
