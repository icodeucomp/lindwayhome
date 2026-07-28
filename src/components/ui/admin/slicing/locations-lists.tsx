"use client";

import { Pagination } from "@/components";

import { FaEdit, FaMapPin, FaTrash } from "react-icons/fa";

import { EmptyState, ErrorState, LoadingState, Panel, TableShell, Td, Th } from "./ui";

import { ApiResponse, Location } from "@/types";

interface LocationListsProps {
  locationsData: ApiResponse<Location[]> | undefined;
  isLoading: boolean;
  isError: boolean;
  hasFilters: boolean;
  currentPage: number;
  handleEdit: (location: Location) => void;
  setDeleteConfirm: (location: Location) => void;
  handlePageChange: (newPage: number) => void;
}

export const LocationLists = ({ locationsData, isLoading, isError, hasFilters, currentPage, handleEdit, setDeleteConfirm, handlePageChange }: LocationListsProps) => {
  const locations = locationsData?.data || [];
  const pagination = locationsData?.pagination;

  if (isLoading) {
    return (
      <Panel>
        <LoadingState message="Loading locations..." />
      </Panel>
    );
  }

  if (isError) {
    return (
      <Panel>
        <ErrorState message="We couldn't load the location list. Please check your connection and try again." />
      </Panel>
    );
  }

  if (locations.length === 0) {
    return (
      <Panel>
        <EmptyState
          icon={<FaMapPin className="size-6" />}
          title={hasFilters ? "No locations match your search" : "No locations yet"}
          description={hasFilters ? "Try a different keyword, or clear the search to see every location." : "Add your first shipping destination to start calculating delivery."}
        />
      </Panel>
    );
  }

  return (
    <Panel className="overflow-hidden">
      {/* Table — large screens */}
      <div className="hidden lg:block">
        <TableShell>
          <thead className="border-b bg-gray/5 border-gray/15">
            <tr>
              <Th>Code</Th>
              <Th>Province</Th>
              <Th>District</Th>
              <Th>Sub-District</Th>
              <Th>Village</Th>
              <Th>Coordinates</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray/10">
            {locations.map((location) => (
              <tr key={location.id} className="duration-300 hover:bg-gray/5">
                <Td className="font-mono font-medium whitespace-nowrap text-darker-gray">{location.code}</Td>
                <Td className="font-medium whitespace-nowrap text-darker-gray">{location.province}</Td>
                <Td className="whitespace-nowrap">{location.district}</Td>
                <Td className="whitespace-nowrap">{location.sub_district}</Td>
                <Td className="whitespace-nowrap">{location.village}</Td>
                <Td className="font-mono text-xs whitespace-nowrap text-gray/70">
                  <span className="block">Lat: {location.approx_lat.toFixed(6)}</span>
                  <span className="block">Long: {location.approx_long.toFixed(6)}</span>
                </Td>
                <Td className="text-right whitespace-nowrap">
                  <div className="flex justify-end gap-1">
                    <button
                      onClick={() => handleEdit(location)}
                      title="Edit location"
                      aria-label={`Edit ${location.village}`}
                      className="p-2 text-blue-600 duration-300 rounded-lg cursor-pointer hover:text-blue-800 hover:bg-blue-50"
                    >
                      <FaEdit className="size-4" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(location)}
                      title="Delete location"
                      aria-label={`Delete ${location.village}`}
                      className="p-2 text-red-600 duration-300 rounded-lg cursor-pointer hover:text-red-800 hover:bg-red-50"
                    >
                      <FaTrash className="size-4" />
                    </button>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      </div>

      {/* Cards — small screens */}
      <div className="divide-y lg:hidden divide-gray/10">
        {locations.map((location) => (
          <div key={location.id} className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold truncate text-darker-gray">{location.village}</p>
                <p className="text-sm truncate text-gray/70">
                  {location.sub_district}, {location.district}
                </p>
                <p className="text-sm truncate text-gray/70">{location.province}</p>
              </div>
              <span className="px-2.5 py-1 font-mono text-xs font-semibold rounded-full shrink-0 bg-gray/10 text-gray">{location.code}</span>
            </div>

            <p className="font-mono text-xs text-gray/60">
              {location.approx_lat.toFixed(6)}, {location.approx_long.toFixed(6)}
            </p>

            <div className="flex gap-2">
              <button onClick={() => handleEdit(location)} className="flex items-center justify-center flex-1 gap-2 py-2 text-sm font-medium text-blue-600 duration-300 rounded-lg cursor-pointer bg-blue-50 hover:bg-blue-100">
                <FaEdit className="size-3.5" />
                Edit
              </button>
              <button onClick={() => setDeleteConfirm(location)} className="flex items-center justify-center flex-1 gap-2 py-2 text-sm font-medium text-red-600 duration-300 rounded-lg cursor-pointer bg-red-50 hover:bg-red-100">
                <FaTrash className="size-3.5" />
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {pagination && (
        <div className="flex flex-col items-center justify-between gap-4 px-4 py-4 border-t sm:px-6 border-gray/15 sm:flex-row">
          <p className="text-sm text-gray/70">
            Showing <span className="font-semibold text-darker-gray">{(pagination.page - 1) * pagination.limit + 1}</span> to{" "}
            <span className="font-semibold text-darker-gray">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of{" "}
            <span className="font-semibold text-darker-gray">{pagination.total}</span> results
          </p>
          <Pagination page={currentPage} setPage={handlePageChange} totalPage={pagination.totalPages || 0} isNumber />
        </div>
      )}
    </Panel>
  );
};
