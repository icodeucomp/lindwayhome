"use client";

import { PiMapPinLine } from "react-icons/pi";

import type { ViewMode } from "@/hooks";

import { Location } from "@/types";

import { EmptyState, ErrorState, LoadingState, Panel, RowAction, RowActionLink, TableShell, Td, Th } from "./ui";

interface LocationListsProps {
  locations: Location[];
  view: ViewMode;
  isLoading: boolean;
  isError: boolean;
  hasFilters: boolean;
  onDelete: (location: Location) => void;
}

const coordinates = (location: Location) => `${location.approx_lat.toFixed(6)}, ${location.approx_long.toFixed(6)}`;

export const LocationLists = ({ locations, view, isLoading, isError, hasFilters, onDelete }: LocationListsProps) => {
  if (isLoading) return <LoadingState message="Loading locations" />;
  if (isError) return <ErrorState message="We couldn't load the location list. Please check your connection and try again." />;

  if (locations.length === 0) {
    return (
      <EmptyState
        icon={<PiMapPinLine className="size-6" />}
        title={hasFilters ? "No locations match your search" : "No locations yet"}
        description={hasFilters ? "Try a different keyword, or clear the search to see every location." : "Add a shipping destination so checkout can calculate delivery to it."}
      />
    );
  }

  if (view === "grid") {
    return (
      <div className="grid gap-x-6 gap-y-8 sm:grid-cols-2 xl:grid-cols-3">
        {locations.map((location) => (
          <article key={location.id} className="flex flex-col">
            <p className="font-mono text-xxs tracking-[0.12em] text-body/40">{location.code}</p>
            <h3 className="mt-1 text-lg font-normal font-heading text-body">{location.village}</h3>
            <p className="text-sm text-body/60">
              {location.sub_district}, {location.district}
            </p>
            <p className="text-sm text-body/60">{location.province}</p>
            <p className="mt-2 font-mono text-xs text-body/40">{coordinates(location)}</p>

            <div className="flex items-center justify-end gap-4 pt-3 mt-auto border-t border-border">
              <RowActionLink href={`/admin/dashboard/locations/${location.id}/edit`}>Edit</RowActionLink>
              <RowAction tone="danger" onClick={() => onDelete(location)}>
                Delete
              </RowAction>
            </div>
          </article>
        ))}
      </div>
    );
  }

  return (
    <Panel className="overflow-hidden">
      <TableShell>
        <thead className="border-b bg-muted/60 border-border">
          <tr>
            <Th>Code</Th>
            <Th>Village</Th>
            <Th>Sub-District</Th>
            <Th>District</Th>
            <Th>Province</Th>
            <Th>Coordinates</Th>
            <Th className="text-right">Actions</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/70">
          {locations.map((location) => (
            <tr key={location.id} className="duration-200 hover:bg-muted/40">
              <Td className="font-mono text-xs whitespace-nowrap text-body/60">{location.code}</Td>
              <Td className="whitespace-nowrap text-body">{location.village}</Td>
              <Td className="whitespace-nowrap">{location.sub_district}</Td>
              <Td className="whitespace-nowrap">{location.district}</Td>
              <Td className="whitespace-nowrap">{location.province}</Td>
              <Td className="font-mono text-xs whitespace-nowrap text-body/50">{coordinates(location)}</Td>
              <Td className="text-right whitespace-nowrap">
                <div className="flex justify-end gap-4">
                  <RowActionLink href={`/admin/dashboard/locations/${location.id}/edit`}>Edit</RowActionLink>
                  <RowAction tone="danger" onClick={() => onDelete(location)}>
                    Delete
                  </RowAction>
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </TableShell>
    </Panel>
  );
};
