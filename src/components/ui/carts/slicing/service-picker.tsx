"use client";

import * as React from "react";

import { PiCheckCircleFill, PiTruck } from "react-icons/pi";

import { formatIDR } from "@/utils";

import { ServiceQuote, ShippingServiceType } from "@/types";

/**
 * The courier options, priced.
 *
 * Every option carries its own signed checkout token, so switching between them
 * costs no round trip and whichever one the buyer lands on is already price-locked
 * for that service and that address.
 *
 * Unavailable services are shown rather than hidden, with the reason. A buyer whose
 * cart is too heavy for same-day should be told that — silently dropping the option
 * reads as the site being broken, and they cannot act on what they cannot see.
 */

const SERVICE_LABELS: Record<ShippingServiceType, string> = {
  INSTANT: "Instant",
  SAMEDAY: "Same Day",
  NEXTDAY: "Next Day",
  REGULAR: "Regular",
};

const SERVICE_BLURBS: Record<ShippingServiceType, string> = {
  INSTANT: "Courier goes straight to you",
  SAMEDAY: "Picked up and delivered today",
  NEXTDAY: "Arrives tomorrow",
  REGULAR: "Our standard service",
};

interface ServicePickerProps {
  services: ServiceQuote[];
  selected: ShippingServiceType | null;
  onSelect: (serviceType: ShippingServiceType) => void;
}

export const ServicePicker = ({ services, selected, onSelect }: ServicePickerProps) => {
  if (services.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="font-heading text-xxs uppercase tracking-[0.16em] text-body/55">Delivery Service</p>

      <div className="space-y-2">
        {services.map((service) => {
          const isSelected = service.available && selected === service.serviceType;

          if (!service.available) {
            return (
              <div key={service.serviceType} className="flex items-start gap-3 px-4 py-3 border cursor-not-allowed border-border/60 bg-muted/40">
                <PiTruck className="mt-0.5 size-4 shrink-0 text-body/30" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-body/45">{SERVICE_LABELS[service.serviceType]}</p>
                  <p className="mt-0.5 text-xxs text-body/40">{service.reason}</p>
                </div>
                <span className="text-xxs uppercase tracking-[0.12em] text-body/35">Unavailable</span>
              </div>
            );
          }

          return (
            <button
              key={service.serviceType}
              type="button"
              onClick={() => onSelect(service.serviceType)}
              aria-pressed={isSelected}
              className={`flex w-full items-start gap-3 border px-4 py-3 text-left transition-colors ${isSelected ? "border-primary bg-primary/5" : "border-border bg-light hover:border-primary/50"}`}
            >
              {isSelected ? <PiCheckCircleFill className="mt-0.5 size-4 shrink-0 text-primary" /> : <PiTruck className="mt-0.5 size-4 shrink-0 text-body/40" />}

              <div className="flex-1 min-w-0">
                <p className="text-sm text-body">
                  {SERVICE_LABELS[service.serviceType]}
                  {service.isMock && <span className="ml-2 border border-primary/40 px-1 py-px align-middle text-[9px] uppercase tracking-[0.12em] text-primary">Mock</span>}
                </p>
                <p className="mt-0.5 text-xxs text-body/55">{service.etaLabel ?? SERVICE_BLURBS[service.serviceType]}</p>
              </div>

              <span className="text-sm shrink-0 text-body">{service.cost === 0 ? "Free" : formatIDR(service.cost)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
