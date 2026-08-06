"use client";

import * as React from "react";

import { PiReceipt } from "react-icons/pi";

import { Img, Modal } from "@/components";

import type { ViewMode } from "@/hooks";

import { orderStatusColors, orderStatusLabels } from "@/static/order";

import { paymentMethodColors, paymentMethodLabels } from "@/static/payment";

import { convertDate, formatIDR, ordersApi } from "@/utils";

import { ApiResponse, Order } from "@/types";

import { Badge, EmptyState, ErrorState, LoadingState, Panel, RowAction, TableShell, Td, Th } from "./ui";

interface OrdersListsProps {
  orders: Order[];
  view: ViewMode;
  isError: boolean;
  isLoading: boolean;
  hasFilters: boolean;
  pendingOrderId: string | null;
  onRequestPurchase: (order: Order) => void;
}

const StatusMarks = ({ order }: { order: Order }) => (
  <div className="flex flex-wrap items-center gap-1.5">
    <Badge className={orderStatusColors[order.status]}>{orderStatusLabels[order.status]}</Badge>
    <Badge className={paymentMethodColors[order.paymentMethod]}>{paymentMethodLabels[order.paymentMethod]}</Badge>
    {order.isMember && <Badge className="bg-primary/12 text-primary">Member</Badge>}
  </div>
);

const DetailRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="py-2.5 border-b border-border/70 last:border-b-0">
    <p className="admin-field-label">{label}</p>
    <div className="mt-1 text-sm text-body/80">{children || "—"}</div>
  </div>
);

/* -------------------------------------------------------------------------- */
/*                                Detail modal                                */
/* -------------------------------------------------------------------------- */

const OrderDetail = ({ orderId, onClose }: { orderId: string | null; onClose: () => void }) => {
  const { data, isLoading, isError } = ordersApi.useGetOrder<ApiResponse<Order>>({ key: ["order", orderId], id: orderId ?? "", enabled: orderId !== null });

  const order = data?.data;

  return (
    <Modal isVisible={orderId !== null} onClose={onClose}>
      <div className="pr-10">
        <p className="admin-eyebrow">Order</p>
        <h3 className="mt-2 text-2xl font-normal font-heading text-body">{order?.fullname ?? "Loading…"}</h3>
      </div>

      {isLoading ? (
        <LoadingState message="Loading order" />
      ) : isError || !order ? (
        <ErrorState message="We couldn't load this order. Please try again." />
      ) : (
        <div className="grid gap-8 mt-6 md:grid-cols-[minmax(0,17rem)_1fr]">
          <div className="space-y-5">
            <StatusMarks order={order} />

            <div>
              <DetailRow label="Email">{order.email}</DetailRow>
              <DetailRow label="WhatsApp">{order.whatsappNumber}</DetailRow>
              <DetailRow label="Address">
                {order.address}
                <span className="block text-body/50">{order.postalCode}</span>
              </DetailRow>
              <DetailRow label="Tracking number">{order.trackingNumber}</DetailRow>
              <DetailRow label="Instagram">{order.instagram}</DetailRow>
              <DetailRow label="Heard about us">{order.reference}</DetailRow>
              <DetailRow label="Placed">{convertDate(order.createdAt)}</DetailRow>
              {order.cancelledAt && <DetailRow label="Cancelled">{convertDate(order.cancelledAt)}</DetailRow>}
            </div>

            {order.receiptImage && (
              <div>
                <p className="mb-2 admin-field-label">Payment receipt</p>
                <Img src={order.receiptImage.url} alt={order.receiptImage.alt} className="w-full border rounded-sm border-border" width={400} height={400} />
              </div>
            )}
          </div>

          <div>
            <div className="flex items-baseline justify-between gap-3 pb-3 mb-3 border-b border-border">
              <h4 className="admin-section-label">Items · {order.totalItemsSold}</h4>
            </div>

            <div className="divide-y divide-border/70">
              {order.items?.map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm truncate text-body">{item.product?.name ?? item.product?.sku ?? item.productId}</p>
                    <p className="text-xs text-body/50">
                      Size {item.selectedSize} · {item.quantity} × {formatIDR(item.unitPrice)}
                    </p>
                  </div>
                  <p className="text-sm shrink-0 text-body tabular-nums">{formatIDR(item.lineTotal)}</p>
                </div>
              ))}
            </div>

            {/* Every figure here is the snapshot the token signed, not a recomputation —
                re-deriving it would let the screen disagree with what was charged. */}
            <div className="pt-4 mt-4 space-y-2 text-sm border-t border-border">
              <div className="flex justify-between text-body/60">
                <span>Subtotal</span>
                <span className="tabular-nums">{formatIDR(order.purchased)}</span>
              </div>
              <div className="flex justify-between text-body/60">
                <span>Shipping</span>
                <span className="tabular-nums">{formatIDR(order.shippingCost)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-border/70">
                <span className="admin-section-label">Total</span>
                <span className="text-base text-body tabular-nums">{formatIDR(order.totalPurchased)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};

/* -------------------------------------------------------------------------- */
/*                                    List                                    */
/* -------------------------------------------------------------------------- */

export const OrdersLists = ({ orders, view, isLoading, isError, hasFilters, pendingOrderId, onRequestPurchase }: OrdersListsProps) => {
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  if (isLoading) return <LoadingState message="Loading orders" />;
  if (isError) return <ErrorState message="We couldn't load the order list. Please check your connection and try again." />;

  if (orders.length === 0) {
    return (
      <EmptyState
        icon={<PiReceipt className="size-6" />}
        title={hasFilters ? "No orders match your filters" : "No orders yet"}
        description={hasFilters ? "Try a different keyword, or clear the filters to see every order." : "Orders appear here the moment a buyer completes checkout."}
      />
    );
  }

  const detail = <OrderDetail orderId={selectedId} onClose={() => setSelectedId(null)} />;

  if (view === "grid") {
    return (
      <>
        <div className="grid gap-x-6 gap-y-8 sm:grid-cols-2 xl:grid-cols-3">
          {orders.map((order) => (
            <article key={order.id} className="flex flex-col">
              <StatusMarks order={order} />

              <h3 className="mt-3 text-lg font-normal font-heading text-body">{order.fullname}</h3>
              <p className="text-sm truncate text-body/60">{order.email}</p>
              <p className="mt-1 text-sm text-body/60">{order.whatsappNumber}</p>

              <p className="mt-3 text-sm text-body tabular-nums">
                {formatIDR(order.totalPurchased)}
                <span className="ml-2 text-xs text-body/45">
                  {order.totalItemsSold} item{order.totalItemsSold === 1 ? "" : "s"}
                </span>
              </p>
              <p className="mt-1 text-xs text-body/40">{convertDate(order.createdAt)}</p>

              <div className="flex items-center justify-end gap-4 pt-3 mt-auto border-t border-border">
                {!order.isPurchased && (
                  <RowAction onClick={() => onRequestPurchase(order)} disabled={pendingOrderId === order.id}>
                    {pendingOrderId === order.id ? "Verifying…" : "Verify"}
                  </RowAction>
                )}
                <RowAction onClick={() => setSelectedId(order.id)}>View</RowAction>
              </div>
            </article>
          ))}
        </div>
        {detail}
      </>
    );
  }

  return (
    <>
      <Panel className="overflow-hidden">
        <TableShell>
          <thead className="border-b bg-muted/60 border-border">
            <tr>
              <Th>Customer</Th>
              <Th>Status</Th>
              <Th>Payment</Th>
              <Th className="text-right">Total</Th>
              <Th className="text-right">Placed</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70">
            {orders.map((order) => (
              <tr key={order.id} className="duration-200 hover:bg-muted/40">
                <Td>
                  <span className="flex items-center gap-2">
                    <span className="text-body">{order.fullname}</span>
                    {order.isMember && <Badge className="bg-primary/12 text-primary">Member</Badge>}
                  </span>
                  <span className="block text-xs text-body/50">{order.email}</span>
                </Td>
                <Td>
                  <Badge className={orderStatusColors[order.status]}>{orderStatusLabels[order.status]}</Badge>
                </Td>
                <Td>
                  <Badge className={paymentMethodColors[order.paymentMethod]}>{paymentMethodLabels[order.paymentMethod]}</Badge>
                </Td>
                <Td className="text-right text-body tabular-nums whitespace-nowrap">{formatIDR(order.totalPurchased)}</Td>
                <Td className="text-right whitespace-nowrap text-body/50">{convertDate(order.createdAt)}</Td>
                <Td className="text-right whitespace-nowrap">
                  <div className="flex justify-end gap-4">
                    {!order.isPurchased && (
                      <RowAction onClick={() => onRequestPurchase(order)} disabled={pendingOrderId === order.id}>
                        {pendingOrderId === order.id ? "Verifying…" : "Verify"}
                      </RowAction>
                    )}
                    <RowAction onClick={() => setSelectedId(order.id)}>View</RowAction>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      </Panel>
      {detail}
    </>
  );
};
