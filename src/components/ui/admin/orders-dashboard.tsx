"use client";

import * as React from "react";

import { useQueryClient } from "@tanstack/react-query";

import { useAuthStore, useSearchPagination } from "@/hooks";

import { orderStatusOptions } from "@/static/order";

import { ordersApi } from "@/utils";

import { ApiResponse, Order, OrderStatus } from "@/types";

import { AdminButton, ConfirmDialog, DataPagination, FilterDropdown, FilterRow, ListToolbar, OrdersLists, PageHeader, ResultCount, SearchBar, ToolbarRow, ViewToggle } from "./slicing";

const PURCHASE_OPTIONS = [
  { value: "", label: "All" },
  { value: "false", label: "Awaiting" },
  { value: "true", label: "Verified" },
];

const PAYMENT_OPTIONS = [
  { value: "", label: "All" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "QRIS", label: "QRIS" },
];

const FILTER_KEYS = ["isPurchased", "status", "paymentMethod"] as const;

export const OrdersDashboard = () => {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();

  const { searchQuery, inputValue, setInputValue, handleSearch, handleClearSearch, page, limit, handlePageChange, filters, setFilter, resetAll, hasFilters, view, setView } = useSearchPagination({
    filterKeys: FILTER_KEYS,
    defaultLimit: 12,
  });

  const [orderToVerify, setOrderToVerify] = React.useState<Order | null>(null);

  const { data, isLoading, isError } = ordersApi.useGetOrders<ApiResponse<Order[]>>({
    key: ["orders", searchQuery, page, limit, filters.isPurchased, filters.status, filters.paymentMethod],
    enabled: isAuthenticated,
    params: { search: searchQuery, limit, page, isPurchased: filters.isPurchased, status: filters.status, paymentMethod: filters.paymentMethod },
  });

  const updateOrder = ordersApi.useUpdateOrder({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["dashboards"] });
      setOrderToVerify(null);
    },
  });

  // Flipping isPurchased is what decrements the variant and raises soldCount, inside
  // one transaction on the server (§A5.3) — the status move is the visible half.
  const confirmVerification = () => {
    if (!orderToVerify) return;
    updateOrder.mutate({ id: orderToVerify.id, order: { isPurchased: true, status: OrderStatus.PAID } });
  };

  const orders = data?.data ?? [];
  const pagination = data?.pagination;

  return (
    <>
      <PageHeader
        eyebrow="Sales"
        title="Orders"
        description="Every checkout, and the receipts waiting to be verified. Verifying an order decrements stock and raises the product's sold count."
      />

      <ListToolbar>
        <SearchBar value={inputValue} onChange={setInputValue} onSearch={handleSearch} onClear={handleClearSearch} placeholder="Search name, email or tracking number…" />

        <ToolbarRow>
          <FilterRow>
            <FilterDropdown label="Payment state" value={filters.isPurchased} options={PURCHASE_OPTIONS} onChange={(value) => setFilter("isPurchased", value)} />
            <FilterDropdown label="Status" value={filters.status} options={orderStatusOptions} onChange={(value) => setFilter("status", value)} />
            <FilterDropdown label="Method" value={filters.paymentMethod} options={PAYMENT_OPTIONS} onChange={(value) => setFilter("paymentMethod", value)} />
            {hasFilters && (
              <AdminButton size="sm" variant="ghost" onClick={resetAll}>
                Clear
              </AdminButton>
            )}
          </FilterRow>

          <div className="flex items-center gap-4">
            {pagination && <ResultCount total={pagination.total} noun="order" filtered={hasFilters} />}
            <ViewToggle view={view} onChange={setView} />
          </div>
        </ToolbarRow>
      </ListToolbar>

      <OrdersLists
        orders={orders}
        view={view}
        isError={isError}
        isLoading={isLoading}
        hasFilters={hasFilters}
        pendingOrderId={updateOrder.isPending ? (orderToVerify?.id ?? null) : null}
        onRequestPurchase={setOrderToVerify}
      />

      {pagination && <DataPagination page={page} totalPages={pagination.totalPages} total={pagination.total} limit={pagination.limit} onPageChange={handlePageChange} />}

      <ConfirmDialog
        isVisible={orderToVerify !== null}
        tone="primary"
        title={`Verify ${orderToVerify?.fullname ?? "this order"}'s payment?`}
        description="This decrements stock for every item and marks the order paid. It cannot be undone — check the receipt first."
        confirmLabel="Verify payment"
        isPending={updateOrder.isPending}
        onConfirm={confirmVerification}
        onClose={() => setOrderToVerify(null)}
      />
    </>
  );
};
