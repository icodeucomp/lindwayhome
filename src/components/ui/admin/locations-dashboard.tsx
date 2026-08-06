"use client";

import * as React from "react";

import { useQueryClient } from "@tanstack/react-query";

import { useSearchPagination } from "@/hooks";

import { locationsApi } from "@/utils";

import { Location, ApiResponse } from "@/types";

import { AdminLinkButton, ConfirmDialog, DataPagination, ListToolbar, LocationLists, PageHeader, ResultCount, SearchBar, ToolbarRow, ViewToggle } from "./slicing";

export const LocationsDashboard = () => {
  const queryClient = useQueryClient();

  const { searchQuery, inputValue, setInputValue, handleSearch, handleClearSearch, page, limit, handlePageChange, hasFilters, view, setView } = useSearchPagination({ defaultLimit: 12 });

  const [toDelete, setToDelete] = React.useState<Location | null>(null);

  const { data, isLoading, isError } = locationsApi.useGetLocations<ApiResponse<Location[]>>({
    key: ["locations", searchQuery, page, limit],
    params: { page, limit, search: searchQuery },
  });

  const deleteLocation = locationsApi.useDeleteLocation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      setToDelete(null);
    },
  });

  const pagination = data?.pagination;

  return (
    <>
      <PageHeader
        eyebrow="Settings"
        title="Locations"
        description="Shipping destinations. Checkout measures the distance from the store origin to these coordinates, so an inaccurate pin misprices every order to that village."
        actions={<AdminLinkButton href="/admin/dashboard/locations/create" variant="solid">New location</AdminLinkButton>}
      />

      <ListToolbar>
        <SearchBar value={inputValue} onChange={setInputValue} onSearch={handleSearch} onClear={handleClearSearch} placeholder="Search code, province, district or village…" />

        <ToolbarRow>
          {pagination ? <ResultCount total={pagination.total} noun="location" filtered={hasFilters} /> : <span />}
          <ViewToggle view={view} onChange={setView} />
        </ToolbarRow>
      </ListToolbar>

      <LocationLists locations={data?.data ?? []} view={view} isLoading={isLoading} isError={isError} hasFilters={hasFilters} onDelete={setToDelete} />

      {pagination && <DataPagination page={page} totalPages={pagination.totalPages} total={pagination.total} limit={pagination.limit} onPageChange={handlePageChange} />}

      <ConfirmDialog
        isVisible={toDelete !== null}
        title={`Delete ${toDelete?.village ?? "this location"}?`}
        description={`"${toDelete?.village}, ${toDelete?.district}" will be permanently removed, and checkout will no longer offer it as a destination.`}
        confirmLabel="Delete location"
        isPending={deleteLocation.isPending}
        onConfirm={() => toDelete && deleteLocation.mutate(toDelete.id)}
        onClose={() => setToDelete(null)}
      />
    </>
  );
};
