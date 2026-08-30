"use client";

import * as React from "react";

import { useAuthStore } from "@/hooks";

import { shipmentsApi } from "@/utils";

import { ApiResponse, PickupList } from "@/types";

import { AdminButton, PageHeader, Panel, PickupsLists, ResultCount, TextInput } from "./slicing";

/**
 * Get All Shipment By Pickup Date — the courier's day, as one screen.
 *
 * The list is built from our own `Shipment` rows and merely *enriched* with Paxel's
 * live answer, rather than the other way round. This screen exists to answer "is
 * the courier coming today", and a blank page during a courier-side hiccup is
 * exactly the wrong answer to that question. When their list endpoint is
 * unreachable the bookings still show, with a note saying the live status is stale.
 */

const pad = (value: number): string => String(value).padStart(2, "0");

const todayIso = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

const shiftDate = (date: string, days: number): string => {
  const next = new Date(`${date}T12:00:00`);
  next.setDate(next.getDate() + days);
  return `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}`;
};

export const PickupsDashboard = () => {
  const { isAuthenticated } = useAuthStore();
  const [date, setDate] = React.useState(todayIso());

  const { data, isLoading, isError } = shipmentsApi.useGetPickups<ApiResponse<PickupList>>({
    key: ["pickups", date],
    enabled: isAuthenticated,
    params: { date },
  });

  const pickups = data?.data;
  const shipments = pickups?.shipments ?? [];

  return (
    <section className="space-y-8">
      <PageHeader
        eyebrow="Sales"
        title="Pickups"
        description="Every courier pickup booked for a given day. Book one from an order, then track it here."
        actions={
          <div className="flex items-center gap-2">
            <AdminButton onClick={() => setDate((current) => shiftDate(current, -1))}>Previous</AdminButton>
            <AdminButton onClick={() => setDate(todayIso())}>Today</AdminButton>
            <AdminButton onClick={() => setDate((current) => shiftDate(current, 1))}>Next</AdminButton>
          </div>
        }
      />

      <Panel className="p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="w-48">
            <label htmlFor="pickupDate" className="mb-1.5 block admin-field-label">
              Pickup date
            </label>
            <TextInput id="pickupDate" type="date" value={date} onChange={(event) => setDate(event.target.value || todayIso())} />
          </div>

          <div className="pb-2">
            <ResultCount total={shipments.length} noun="pickup" />
          </div>

          {pickups?.isMock && (
            <p className="pb-2 text-xs text-primary">
              Mock courier mode — no PAXEL_API_KEY is set, so these bookings were never sent to Paxel.
            </p>
          )}
        </div>
      </Panel>

      {/* Distinct from `isError`: the bookings below are real and current, only the
          live courier status beside them is not. Collapsing the two would either
          hide working data or overstate what we know. */}
      {pickups?.remoteError && <p className="px-4 py-3 text-sm border rounded-sm border-amber-500/40 bg-amber-500/5 text-amber-700">{pickups.remoteError}</p>}

      <PickupsLists shipments={shipments} isLoading={isLoading} isError={isError} date={date} />
    </section>
  );
};
