"use client";

import * as React from "react";

import { PiTruck } from "react-icons/pi";

import { convertDate, formatIDR } from "@/utils";

import { shipmentStatusColors, shipmentStatusLabels, shippingServiceLabels } from "@/static/shipment";

import { PickupListEntry } from "@/types";

import { Badge, EmptyState, ErrorState, LoadingState, Panel, TableShell, Td, Th } from "./ui";

interface PickupsListsProps {
  shipments: PickupListEntry[];
  isLoading: boolean;
  isError: boolean;
  date: string;
}

export const PickupsLists = ({ shipments, isLoading, isError, date }: PickupsListsProps) => {
  if (isLoading) return <LoadingState message="Loading pickups" />;
  if (isError) return <ErrorState message="We couldn't load the pickup list. Please check your connection and try again." />;

  if (shipments.length === 0) {
    return <EmptyState icon={<PiTruck className="size-6" />} title={`No pickups on ${date}`} description="Book a pickup from an order to see it here." />;
  }

  return (
    <Panel className="overflow-hidden">
      <TableShell>
        <thead className="border-b bg-muted/60 border-border">
          <tr>
            <Th>Airwaybill</Th>
            <Th>Customer</Th>
            <Th>Destination</Th>
            <Th>Service</Th>
            <Th>Status</Th>
            <Th className="text-right">Charge</Th>
            <Th className="text-right">Pickup</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/70">
          {shipments.map((shipment) => (
            <tr key={shipment.id} className="duration-200 hover:bg-muted/40">
              <Td>
                <span className="font-mono text-xs text-body">{shipment.airwaybillCode}</span>
                {shipment.isMock && <Badge className="ml-2 text-primary bg-primary/12">Mock</Badge>}
              </Td>
              <Td>
                <span className="text-body">{shipment.order.fullname}</span>
                <span className="block text-xs text-body/50">{shipment.order.email}</span>
              </Td>
              <Td className="text-body/70">
                {shipment.order.village}
                <span className="block text-xs text-body/45">
                  {shipment.order.sub_district}, {shipment.order.district}
                </span>
              </Td>
              <Td className="whitespace-nowrap text-body/70">{shippingServiceLabels[shipment.serviceType]}</Td>
              <Td>
                <Badge className={shipmentStatusColors[shipment.status]}>{shipmentStatusLabels[shipment.status]}</Badge>
                {/* Paxel's own wording, which is finer-grained than our lifecycle —
                    "Courier has arrived at pickup location" is far more useful to
                    someone waiting by the door than "Booked". */}
                {shipment.liveStatusLabel && <span className="block mt-1 text-xs text-body/45">{shipment.liveStatusLabel}</span>}
              </Td>
              <Td className="text-right text-body tabular-nums whitespace-nowrap">{formatIDR(shipment.shippingCost)}</Td>
              <Td className="text-right whitespace-nowrap text-body/50">{convertDate(shipment.pickupDatetime)}</Td>
            </tr>
          ))}
        </tbody>
      </TableShell>
    </Panel>
  );
};
