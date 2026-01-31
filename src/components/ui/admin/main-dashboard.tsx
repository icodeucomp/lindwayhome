"use client";

import * as React from "react";

import { useRouter } from "next/navigation";

import { useAuthStore } from "@/hooks";

import { Button } from "@/components";

import { formatIDR, dashboardApi } from "@/utils";

import { ApiResponse, DashboardData } from "@/types";

// Constants
const MONTHS = [
  { value: "all", label: "All Months" },
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
] as const;

const YEARS = [
  { value: "all", label: "All Years" },
  { value: "2025", label: "2025" },
  { value: "2026", label: "2026" },
  { value: "2027", label: "2027" },
  { value: "2028", label: "2028" },
  { value: "2029", label: "2029" },
  { value: "2030", label: "2030" },
] as const;

interface SelectOption {
  value: string;
  label: string;
}

interface DashboardCard {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  bgColor: string;
}

const RefreshIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const ClockIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const CheckIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2l4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const UsersIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
    />
  </svg>
);

const CurrencyIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
    />
  </svg>
);

const BoxIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
    />
  </svg>
);

const TrendingUpIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

const StockIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
  </svg>
);

const SelectField = ({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: readonly SelectOption[] }) => (
  <div className="flex items-center gap-2">
    <label className="text-sm font-medium text-gray">{label}:</label>
    <select value={value} onChange={(e) => onChange(e.target.value)} className="input-form">
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </div>
);

const DashboardCard = ({ card }: { card: DashboardCard }) => (
  <div className="overflow-hidden rounded-lg shadow bg-light">
    <div className="p-5">
      <div className="flex items-center">
        <div className="shrink-0">
          <div className={`flex items-center justify-center size-12 rounded-lg ${card.bgColor}`}>{card.icon}</div>
        </div>
        <div className="flex-1 w-0 ml-5">
          <dl>
            <dt className="font-semibold truncate text-gray">{card.title}</dt>
            <dd className="text-xl font-medium text-gray">{card.value}</dd>
          </dl>
        </div>
      </div>
    </div>
  </div>
);

const FilterSection = ({
  selectedMonth,
  selectedYear,
  onMonthChange,
  onYearChange,
  onClearFilters,
  onRefresh,
  getDateRangeText,
  isRefreshing,
}: {
  selectedMonth: string;
  selectedYear: string;
  onMonthChange: (month: string) => void;
  onYearChange: (year: string) => void;
  onClearFilters: () => void;
  onRefresh: () => void;
  getDateRangeText: () => string;
  isRefreshing: boolean;
}) => (
  <div className="space-y-3">
    <div className="flex items-center gap-4">
      <SelectField label="Month" value={selectedMonth} onChange={onMonthChange} options={MONTHS} />
      <SelectField label="Year" value={selectedYear} onChange={onYearChange} options={YEARS} />
      <Button onClick={onRefresh} className="flex items-center gap-2 disabled:opacity-50 btn-blue" disabled={isRefreshing}>
        <RefreshIcon className={`size-4 ${isRefreshing ? "animate-spin" : ""}`} />
        {isRefreshing ? "Refreshing..." : "Refresh"}
      </Button>
    </div>

    <div className="flex items-center gap-2 py-1.5 text-sm text-gray">
      <span className="font-medium">Current Period:</span>
      <span>{getDateRangeText()}</span>
      {(selectedMonth !== "all" || selectedYear !== "all") && (
        <button onClick={onClearFilters} className="ml-2 text-xs text-blue-600 underline hover:text-blue-800 transition-colors">
          Clear Filters
        </button>
      )}
    </div>
  </div>
);

const QuickActions = ({ router }: { router: ReturnType<typeof useRouter> }) => (
  <div className="rounded-lg shadow bg-light">
    <div className="px-4 py-5 sm:p-6">
      <h3 className="mb-4 text-lg font-medium leading-6 text-gray">Quick Actions</h3>
      <div className="flex gap-4 text-light">
        <Button onClick={() => router.push("/admin/dashboard/products")} className="btn-blue">
          Manage Products
        </Button>
        <Button onClick={() => router.push("/admin/dashboard/products/create")} className="btn-green">
          Add New Product
        </Button>
      </div>
    </div>
  </div>
);

const useDashboard = () => {
  const [selectedMonth, setSelectedMonth] = React.useState<string>("all");
  const [selectedYear, setSelectedYear] = React.useState<string>("all");
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();

  const { data: dashboards, refetch } = dashboardApi.useGetDashboard<ApiResponse<DashboardData>>({
    key: ["dashboards", selectedMonth, selectedYear],
    enabled: isAuthenticated,
    params: { month: selectedMonth, year: selectedYear },
  });

  const getDateRangeText = React.useCallback((): string => {
    if (selectedMonth === "all" && selectedYear === "all") return "All Time";
    if (selectedMonth === "all") return selectedYear;
    if (selectedYear === "all") {
      return MONTHS.find((m) => m.value === selectedMonth)?.label || "";
    }
    const monthLabel = MONTHS.find((m) => m.value === selectedMonth)?.label || "";
    return `${monthLabel} ${selectedYear}`;
  }, [selectedMonth, selectedYear]);

  const handleClearFilters = React.useCallback(() => {
    setSelectedMonth("all");
    setSelectedYear("all");
  }, []);

  const handleRefresh = React.useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  }, [refetch]);

  const getDashboardCards = React.useCallback(
    (): DashboardCard[] => [
      {
        title: "Pending Orders",
        value: dashboards?.data.totalPendingOrders ?? "...",
        icon: <ClockIcon className="size-8 text-light" />,
        bgColor: "bg-orange-500",
      },
      {
        title: "Purchased Orders",
        value: dashboards?.data.totalPurchasedOrders ?? "...",
        icon: <CheckIcon className="size-8 text-light" />,
        bgColor: "bg-green-500",
      },
      {
        title: "Total Guests",
        value: dashboards?.data.totalGuests ?? "...",
        icon: <UsersIcon className="size-8 text-light" />,
        bgColor: "bg-pink-500",
      },
      {
        title: "Total Revenue",
        value: formatIDR(dashboards?.data.totalPurchasedAmount || 0) ?? "...",
        icon: <CurrencyIcon className="size-8 text-light" />,
        bgColor: "bg-green-500",
      },
      {
        title: "Total Products",
        value: dashboards?.data.totalProducts ?? "...",
        icon: <BoxIcon className="size-8 text-light" />,
        bgColor: "bg-purple-500",
      },
      {
        title: "Items Sold",
        value: dashboards?.data.totalItemsSold ?? "...",
        icon: <TrendingUpIcon className="size-8 text-light" />,
        bgColor: "bg-yellow-500",
      },
      {
        title: "My Lindway Stock",
        value: dashboards?.data.totalMyLindwayStock ?? "...",
        icon: <StockIcon className="size-8 text-light" />,
        bgColor: "bg-cyan-500",
      },
      {
        title: "Simply Lindway Stock",
        value: dashboards?.data.totalSimplyLindwayStock ?? "...",
        icon: <StockIcon className="size-8 text-light" />,
        bgColor: "bg-sky-500",
      },
      {
        title: "Lure by Lindway Stock",
        value: dashboards?.data.totalLureByLindwayStock ?? "...",
        icon: <StockIcon className="size-8 text-light" />,
        bgColor: "bg-teal-500",
      },
    ],
    [dashboards]
  );

  return {
    selectedMonth,
    selectedYear,
    isRefreshing,
    router,
    user,
    dashboards,
    setSelectedMonth,
    setSelectedYear,
    getDateRangeText,
    handleClearFilters,
    handleRefresh,
    getDashboardCards,
  };
};

export const MainDashboard = () => {
  const { selectedMonth, selectedYear, isRefreshing, router, user, setSelectedMonth, setSelectedYear, getDateRangeText, handleClearFilters, handleRefresh, getDashboardCards } = useDashboard();

  const cards = getDashboardCards();

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between px-6 py-6 overflow-hidden rounded-lg shadow bg-light">
        <div className="space-y-2 mb-4 lg:mb-0">
          <h1 className="text-3xl font-bold text-darker-gray">Welcome back, {user?.username}!</h1>
          <p className="text-darker-gray">Here&apos;s an overview dashboard of Lindway.</p>
        </div>

        <div className="lg:ml-6">
          <FilterSection
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            onMonthChange={setSelectedMonth}
            onYearChange={setSelectedYear}
            onClearFilters={handleClearFilters}
            onRefresh={handleRefresh}
            getDateRangeText={getDateRangeText}
            isRefreshing={isRefreshing}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card, index) => (
          <DashboardCard key={`${card.title}-${index}`} card={card} />
        ))}
      </div>

      <QuickActions router={router} />
    </div>
  );
};
