"use client";

import * as React from "react";

import { PiArrowClockwise, PiTruck } from "react-icons/pi";

import { convertDate, formatIDR, shipmentsApi } from "@/utils";

import { isCancellableShipment, shipmentStatusColors, shipmentStatusLabels, shippingServiceLabels, shippingServiceOptions } from "@/static/shipment";

import { Order, Shipment, ShippingServiceType } from "@/types";

import { AdminButton, Badge, ConfirmDialog, Spinner } from "./ui";
import { Field, SelectInput, TextInput } from "./form";

/**
 * The courier half of the order detail.
 *
 * Booking is a deliberate, separate action from verifying the payment. Verification
 * runs the transaction that moves stock; a courier call folded into it could roll
 * that back on a timeout. Keeping them apart also means a booking that fails is
 * simply retried, and the admin chooses the pickup window rather than having one
 * guessed for them.
 */

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-baseline justify-between gap-4 py-1.5">
    <span className="admin-field-label">{label}</span>
    <span className="text-sm text-right text-body/80">{children || "—"}</span>
  </div>
);

/** `datetime-local`-friendly "today" in the browser's zone; the server re-reads it in the store's. */
const todayIso = (): string => {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

/* -------------------------------------------------------------------------- */
/*                                Booking form                                */
/* -------------------------------------------------------------------------- */

const BookingForm = ({ order, onBooked }: { order: Order; onBooked: () => void }) => {
  const [pickupDate, setPickupDate] = React.useState(todayIso());
  const [pickupTime, setPickupTime] = React.useState("14:00");
  const [serviceType, setServiceType] = React.useState<ShippingServiceType>(order.shippingServiceType);
  const [note, setNote] = React.useState("");

  const book = shipmentsApi.useBookShipment({ onSuccess: onBooked });

  const isOverride = serviceType !== order.shippingServiceType;

  return (
    <div className="space-y-4">
      <p className="text-sm text-body/65">
        The buyer paid for <span className="text-body">{shippingServiceLabels[order.shippingServiceType]}</span>. Choose a pickup window and book the courier.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Pickup date" htmlFor="pickupDate" required>
          <TextInput id="pickupDate" type="date" value={pickupDate} min={todayIso()} onChange={(event) => setPickupDate(event.target.value)} />
        </Field>

        <Field label="Pickup time" htmlFor="pickupTime" required hint="Local store time">
          <TextInput id="pickupTime" type="time" value={pickupTime} onChange={(event) => setPickupTime(event.target.value)} />
        </Field>
      </div>

      <Field
        label="Service"
        htmlFor="serviceType"
        required
        // An override is allowed but never silent: booking a dearer service eats the
        // margin, a cheaper one arrives later than the buyer was told.
        hint={isOverride ? `Overriding what the buyer paid for (${shippingServiceLabels[order.shippingServiceType]}).` : undefined}
      >
        <SelectInput id="serviceType" options={shippingServiceOptions} value={serviceType} onChange={(event) => setServiceType(event.target.value as ShippingServiceType)} />
      </Field>

      <Field label="Note for the courier" htmlFor="courierNote" hint="Optional, 150 characters max">
        <TextInput id="courierNote" value={note} maxLength={150} placeholder="Fragile — do not stack" onChange={(event) => setNote(event.target.value)} />
      </Field>

      <AdminButton
        variant="solid"
        onClick={() => book.mutate({ orderId: order.id, payload: { pickupDate, pickupTime, serviceType, note: note.trim() || undefined } })}
        disabled={book.isPending || !pickupDate || !pickupTime}
      >
        {book.isPending ? "Booking…" : "Book Pickup"}
      </AdminButton>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                              Booked shipment                               */
/* -------------------------------------------------------------------------- */

const BookedShipment = ({ shipment, onChanged }: { shipment: Shipment; onChanged: () => void }) => {
  const [confirmCancel, setConfirmCancel] = React.useState(false);
  const [reason, setReason] = React.useState("");

  const refresh = shipmentsApi.useRefreshTracking({ onSuccess: onChanged });
  const cancel = shipmentsApi.useCancelShipment({
    onSuccess: () => {
      setConfirmCancel(false);
      setReason("");
      onChanged();
    },
  });

  const logs = shipment.logs ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge className={shipmentStatusColors[shipment.status]}>{shipmentStatusLabels[shipment.status]}</Badge>
        <Badge className="bg-body/8 text-body/70">{shippingServiceLabels[shipment.serviceType]}</Badge>
        {/* A mock airwaybill is otherwise indistinguishable from a real one, and an
            admin waiting on a courier that was never called is a bad afternoon. */}
        {shipment.isMock && <Badge className="text-primary bg-primary/12">Mock — no courier was called</Badge>}
      </div>

      <div className="divide-y divide-border/70">
        <Row label="Airwaybill">
          <span className="font-mono text-xs">{shipment.airwaybillCode}</span>
        </Row>
        <Row label="Courier charge">{formatIDR(shipment.shippingCost)}</Row>
        <Row label="Pickup">{convertDate(shipment.pickupDatetime)}</Row>
        <Row label="Pickup window">{shipment.estimatedPickupDate ? `${shipment.estimatedPickupDate} · ${shipment.estimatedPickupMinTime}–${shipment.estimatedPickupMaxTime}` : null}</Row>
        <Row label="Estimated arrival">{shipment.estimatedArrivalDate ? `${shipment.estimatedArrivalDate} · ${shipment.estimatedArrivalMinTime}–${shipment.estimatedArrivalMaxTime}` : null}</Row>
        <Row label="Last checked">{shipment.lastTrackedAt ? convertDate(shipment.lastTrackedAt) : "Never"}</Row>
        {shipment.cancelledAt && <Row label="Cancelled">{convertDate(shipment.cancelledAt)}</Row>}
        {shipment.cancellationReason && <Row label="Reason">{shipment.cancellationReason}</Row>}
      </div>

      {logs.length > 0 && (
        <div>
          <p className="mb-2 admin-field-label">Courier history</p>
          <ol className="space-y-2 border-l border-border pl-3.5">
            {logs.map((log, index) => (
              <li key={`${log.status}-${log.created_datetime}-${index}`} className="relative">
                <span className="absolute left-[-1.19rem] top-1.5 size-1.5 rounded-full bg-primary" />
                <p className="text-sm text-body/80">{log.note || log.status}</p>
                <p className="text-xs text-body/45">{log.created_datetime}</p>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <AdminButton onClick={() => refresh.mutate(shipment.airwaybillCode)} disabled={refresh.isPending}>
          {refresh.isPending ? <Spinner className="border-body/30 border-t-body" /> : <PiArrowClockwise className="size-3.5" />}
          {refresh.isPending ? "Checking…" : "Refresh tracking"}
        </AdminButton>

        {isCancellableShipment(shipment.status) && (
          <AdminButton variant="ghost" onClick={() => setConfirmCancel(true)}>
            Cancel pickup
          </AdminButton>
        )}
      </div>

      <ConfirmDialog
        isVisible={confirmCancel}
        title="Cancel this pickup?"
        description="The courier booking is cancelled with Paxel. The order stays paid and the stock stays deducted — you can book a new pickup afterwards."
        confirmLabel="Cancel pickup"
        isPending={cancel.isPending}
        confirmDisabled={reason.trim().length === 0}
        onConfirm={() => cancel.mutate({ airwaybillCode: shipment.airwaybillCode, cancellationReason: reason.trim() })}
        onClose={() => setConfirmCancel(false)}
      >
        <Field label="Reason" htmlFor="cancellationReason" required hint="Sent to the courier, 150 characters max">
          <TextInput id="cancellationReason" value={reason} maxLength={150} placeholder="Out of stock" onChange={(event) => setReason(event.target.value)} autoFocus />
        </Field>
      </ConfirmDialog>
    </div>
  );
};

/* -------------------------------------------------------------------------- */

export const ShipmentPanel = ({ order, onChanged }: { order: Order; onChanged: () => void }) => {
  // Newest first from `orderInclude`, so a re-booked order shows the live one. A
  // cancelled booking is kept in history rather than replaced.
  const active = order.shipments?.find((shipment) => shipment.status !== "CANCELLED" && shipment.status !== "FAILED");
  const history = (order.shipments ?? []).filter((shipment) => shipment !== active);

  return (
    <div className="space-y-5">
      <div className="flex items-baseline justify-between gap-3 pb-3 border-b border-border">
        <h4 className="admin-section-label">Shipment</h4>
      </div>

      {!order.isPurchased ? (
        <p className="flex items-start gap-2 px-4 py-3 text-sm border rounded-sm border-border bg-muted text-body/65">
          <PiTruck className="mt-0.5 size-4 shrink-0 text-body/40" />
          Verify the payment first — a courier should not collect goods that have not been paid for.
        </p>
      ) : active ? (
        <BookedShipment shipment={active} onChanged={onChanged} />
      ) : (
        <BookingForm order={order} onBooked={onChanged} />
      )}

      {history.length > 0 && (
        <details className="pt-2 border-t border-border/70">
          <summary className="text-xs cursor-pointer text-body/55">
            {history.length} earlier booking{history.length === 1 ? "" : "s"}
          </summary>
          <div className="mt-3 space-y-3">
            {history.map((shipment) => (
              <div key={shipment.id} className="text-xs text-body/55">
                <Badge className={shipmentStatusColors[shipment.status]}>{shipmentStatusLabels[shipment.status]}</Badge>
                <span className="ml-2 font-mono">{shipment.airwaybillCode}</span>
                {shipment.cancellationReason && <span className="block mt-1">{shipment.cancellationReason}</span>}
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
};
