"use client";

import * as React from "react";

import { useAuthStore, useSearchPagination } from "@/hooks";

import { useQueryClient } from "@tanstack/react-query";

import { FaSearch } from "react-icons/fa";

import { ConfirmDialog, FilterSelect, GuestsLists, SearchInput, Toolbar } from "./slicing";

import { Button, Pagination } from "@/components";

import { guestsApi } from "@/utils";

import { ApiResponse, Guest } from "@/types";

const TRANSACTION_OPTIONS = [
  { value: "", label: "All Transactions" },
  { value: "true", label: "Purchased" },
  { value: "false", label: "Pending" },
];

export const GuestsDashboard = () => {
  const queryClient = useQueryClient();

  const { isAuthenticated } = useAuthStore();

  const { searchQuery, inputValue, setInputValue, handleSearch, handleClearSearch, currentPage, handlePageChange, handleCategoryChange, selectedCategory } = useSearchPagination({
    categoryParamName: "isPurchased",
  });

  const [guestToConfirm, setGuestToConfirm] = React.useState<Guest | null>(null);

  const {
    data: guests,
    isLoading,
    isError,
  } = guestsApi.useGetGuests<ApiResponse<Guest[]>>({
    key: ["guests", searchQuery, currentPage, selectedCategory],
    enabled: isAuthenticated,
    params: { search: searchQuery, limit: 9, page: currentPage, isPurchased: selectedCategory },
  });

  const updateGuests = guestsApi.useUpdateGuests({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guests"] });
      queryClient.invalidateQueries({ queryKey: ["dashboards"] });
      setGuestToConfirm(null);
    },
  });

  const confirmPurchase = () => {
    if (!guestToConfirm) return;
    updateGuests.mutate({
      id: guestToConfirm.id,
      guests: { isPurchased: true, paymentMethod: guestToConfirm.paymentMethod, isMember: guestToConfirm.isMember },
    });
  };

  const totalGuests = guests?.pagination.total ?? 0;
  const hasFilters = !!searchQuery || !!selectedCategory;

  return (
    <>
      <Toolbar>
        <SearchInput value={inputValue} onChange={setInputValue} onSearch={handleSearch} onClear={handleClearSearch} placeholder="Search by name, email or WhatsApp number..." />

        <div className="flex flex-col gap-2 sm:flex-row lg:shrink-0">
          <Button onClick={handleSearch} className="flex items-center justify-center gap-2 btn-gray">
            <FaSearch className="size-4" />
            Search
          </Button>

          <FilterSelect label="Filter by transaction status" value={selectedCategory} onChange={handleCategoryChange} options={TRANSACTION_OPTIONS} />
        </div>
      </Toolbar>

      {!isLoading && !isError && totalGuests > 0 && (
        <p className="mb-4 text-sm text-gray/70">
          Showing <span className="font-semibold text-darker-gray">{guests?.data.length}</span> of <span className="font-semibold text-darker-gray">{totalGuests}</span> guests
          {hasFilters && " matching your filters"}
        </p>
      )}

      <GuestsLists guests={guests?.data || []} isError={isError} isLoading={isLoading} hasFilters={hasFilters} pendingGuestId={updateGuests.isPending ? guestToConfirm?.id ?? null : null} onRequestPurchase={setGuestToConfirm} />

      <Pagination page={currentPage} setPage={handlePageChange} totalPage={guests?.pagination.totalPages || 0} isNumber />

      <ConfirmDialog
        isVisible={guestToConfirm !== null}
        tone="primary"
        title="Mark as purchased?"
        description={`This will mark ${guestToConfirm?.fullname}'s order as purchased. This status cannot be reverted.`}
        confirmLabel="Mark as Purchased"
        isPending={updateGuests.isPending}
        onConfirm={confirmPurchase}
        onClose={() => setGuestToConfirm(null)}
      />
    </>
  );
};
