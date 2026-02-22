"use client";

import { useAuthStore, useSearchPagination } from "@/hooks";

import { useQueryClient } from "@tanstack/react-query";

import { GuestsLists } from "./slicing";

import { Pagination } from "@/components";

import { guestsApi } from "@/utils";

import { ApiResponse, Guest, PaymentMethods } from "@/types";

export const GuestsDashboard = () => {
  const queryClient = useQueryClient();

  const { isAuthenticated } = useAuthStore();

  const { searchQuery, inputValue, setInputValue, handleSearch, currentPage, handlePageChange, handleCategoryChange, selectedCategory } = useSearchPagination({
    categoryParamName: "isPurchased",
  });

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
    },
  });

  const updatePurchase = (id: string, paymentMethod: PaymentMethods, isMember: boolean) => {
    if (window.confirm("Are you sure you want to update the purchase status?")) {
      updateGuests.mutate({ id, guests: { isPurchased: true, paymentMethod, isMember } });
    }
  };

  return (
    <>
      <div className="bg-light rounded-lg border border-gray/30 mb-6 px-6 py-4">
        <div className="text-gray space-y-1">
          <h1 className="heading">Guests and Carts Management</h1>
          <p>Manage transactions, track the number of carts per guest, and view guests who have completed their transactions.</p>
        </div>
      </div>

      <div className="p-4 mb-6 rounded-lg shadow bg-light flex flex-col gap-4 sm:flex-row">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search products..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch();
            }}
            className="w-full px-3 py-2 border rounded-lg border-gray/30 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => handleCategoryChange(e.target.value)}
          className="px-3 py-2 border rounded-lg border-gray/30 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">All Transaction</option>
          {["Purchased", "Pending"].map((category) => (
            <option key={category} value={category === "Purchased" ? "true" : "false"}>
              {category}
            </option>
          ))}
        </select>
      </div>

      <GuestsLists guests={guests?.data || []} isError={isError} isPending={updateGuests.isPending} isLoading={isLoading} updatePurchase={updatePurchase} />

      <Pagination page={currentPage} setPage={handlePageChange} totalPage={guests?.pagination.totalPages || 0} isNumber />
    </>
  );
};
