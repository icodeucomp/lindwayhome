"use client";

import * as React from "react";

import { useAuthStore, useSearchPagination } from "@/hooks";

import { useQueryClient } from "@tanstack/react-query";

import { FaSearch } from "react-icons/fa";

import { ConfirmDialog, FilterSelect, OrdersLists, SearchInput, Toolbar } from "./slicing";

import { Button, Pagination } from "@/components";

import { ordersApi } from "@/utils";

import { ApiResponse, Order, OrderStatus } from "@/types";

const TRANSACTION_OPTIONS = [
  { value: "", label: "All Transactions" },
  { value: "true", label: "Purchased" },
  { value: "false", label: "Pending" },
];

export const OrdersDashboard = () => {
  const queryClient = useQueryClient();

  const { isAuthenticated } = useAuthStore();

  const { searchQuery, inputValue, setInputValue, handleSearch, handleClearSearch, currentPage, handlePageChange, handleCategoryChange, selectedCategory } = useSearchPagination({
    categoryParamName: "isPurchased",
  });

  const [orderToConfirm, setOrderToConfirm] = React.useState<Order | null>(null);

  const {
    data: orders,
    isLoading,
    isError,
  } = ordersApi.useGetOrders<ApiResponse<Order[]>>({
    key: ["orders", searchQuery, currentPage, selectedCategory],
    enabled: isAuthenticated,
    params: { search: searchQuery, limit: 9, page: currentPage, isPurchased: selectedCategory },
  });

  const updateOrder = ordersApi.useUpdateOrder({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["dashboards"] });
      setOrderToConfirm(null);
    },
  });

  const confirmPurchase = () => {
    if (!orderToConfirm) return;
    updateOrder.mutate({
      id: orderToConfirm.id,
      order: { isPurchased: true, status: OrderStatus.PAID },
    });
  };

  const totalOrders = orders?.pagination.total ?? 0;
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

      {!isLoading && !isError && totalOrders > 0 && (
        <p className="mb-4 text-sm text-gray/70">
          Showing <span className="font-semibold text-darker-gray">{orders?.data.length}</span> of <span className="font-semibold text-darker-gray">{totalOrders}</span> orders
          {hasFilters && " matching your filters"}
        </p>
      )}

      <OrdersLists orders={orders?.data || []} isError={isError} isLoading={isLoading} hasFilters={hasFilters} pendingOrderId={updateOrder.isPending ? orderToConfirm?.id ?? null : null} onRequestPurchase={setOrderToConfirm} />

      <Pagination page={currentPage} setPage={handlePageChange} totalPage={orders?.pagination.totalPages || 0} isNumber />

      <ConfirmDialog
        isVisible={orderToConfirm !== null}
        tone="primary"
        title="Mark as purchased?"
        description={`This will mark ${orderToConfirm?.fullname}'s order as purchased. This status cannot be reverted.`}
        confirmLabel="Mark as Purchased"
        isPending={updateOrder.isPending}
        onConfirm={confirmPurchase}
        onClose={() => setOrderToConfirm(null)}
      />
    </>
  );
};
