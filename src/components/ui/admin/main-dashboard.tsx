"use client";

import * as React from "react";

import Link from "next/link";

import { PiArrowUpRight } from "react-icons/pi";

import { useAuthStore } from "@/hooks";

import { brandByKey, isBrandActive } from "@/static/taxonomy";

import { orderStatusBars, orderStatusLabels } from "@/static/order";

import { paymentMethodLabels } from "@/static/payment";

import { formatIDR, dashboardApi } from "@/utils";

import { ApiResponse, DashboardData } from "@/types";

import { AdminButton, Badge, BlockHeading, ErrorState, FilterDropdown, LoadingState, PageHeader, Panel, Stat, StatGrid, TableShell, Td, Th } from "./slicing";

const MONTHS = [
  { value: "", label: "All Months" },
  ...["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map((label, index) => ({ value: String(index + 1), label })),
];

// A fixed list beats new Date().getFullYear() here: the store has orders seeded in
// past years, and a window that silently starts "this year" hides them.
const YEARS = [{ value: "", label: "All Years" }, ...[2025, 2026, 2027, 2028, 2029, 2030].map((year) => ({ value: String(year), label: String(year) }))];

/**
 * The trend buckets arrive as bare "YYYY-MM-DD" local days. `new Date("2026-08-06")`
 * would parse that as UTC midnight and render the day before in any western zone, so
 * the time is appended to force local parsing. Full timestamps pass through unchanged.
 */
const shortDate = (value: string) => new Date(value.length === 10 ? `${value}T00:00:00` : value).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

/* -------------------------------------------------------------------------- */
/*                              Orders trend chart                            */
/*                                                                            */
/* Hand-drawn with divs rather than a charting dependency: it is 30 stacked    */
/* columns, and no library earns its bundle size for that.                     */
/* -------------------------------------------------------------------------- */

const TrendChart = ({ days }: { days: DashboardData["ordersByDay"] }) => {
  const peak = Math.max(1, ...days.map((day) => day.bankTransfer + day.qris));
  const ticks = [...new Set([0, Math.ceil(peak / 2), peak])].sort((a, b) => a - b);
  const total = days.reduce((sum, day) => sum + day.bankTransfer + day.qris, 0);

  return (
    <div>
      <BlockHeading title="Orders · last 30 days" aside={`${total} total`} />

      <div className="flex flex-wrap items-center gap-5 mb-5">
        {[
          { label: paymentMethodLabels.BANK_TRANSFER, dot: "bg-primary", count: days.reduce((sum, day) => sum + day.bankTransfer, 0) },
          { label: paymentMethodLabels.QRIS, dot: "bg-body", count: days.reduce((sum, day) => sum + day.qris, 0) },
        ].map((series) => (
          <span key={series.label} className="flex items-center gap-2 text-xs text-body/60">
            <span className={`rounded-full size-2 ${series.dot}`} />
            {series.label}
            <span className="text-body">{series.count}</span>
          </span>
        ))}
      </div>

      <div className="flex gap-3">
        <div className="flex flex-col justify-between h-40 text-xxs text-body/40 tabular-nums">
          {[...ticks].reverse().map((tick) => (
            <span key={tick}>{tick}</span>
          ))}
        </div>

        <div className="flex-1 min-w-0">
          <div className="relative h-40">
            {ticks.map((tick) => (
              <span key={tick} aria-hidden className="absolute inset-x-0 border-t border-border/70" style={{ bottom: `${(tick / peak) * 100}%` }} />
            ))}

            <div className="relative flex items-end h-full gap-px">
              {days.map((day) => {
                const dayTotal = day.bankTransfer + day.qris;
                return (
                  <div key={day.date} title={`${shortDate(day.date)} — ${dayTotal} order${dayTotal === 1 ? "" : "s"}`} className="flex flex-col justify-end flex-1 h-full">
                    {day.qris > 0 && <div className="bg-body" style={{ height: `${(day.qris / peak) * 100}%` }} />}
                    {day.bankTransfer > 0 && <div className="bg-primary" style={{ height: `${(day.bankTransfer / peak) * 100}%` }} />}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-between pt-2 mt-1 border-t text-xxs border-border text-body/40">
            <span>{days.length > 0 && shortDate(days[0].date)}</span>
            <span>{days.length > 0 && shortDate(days[Math.floor(days.length / 2)].date)}</span>
            <span>{days.length > 0 && shortDate(days[days.length - 1].date)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                              Status pipeline                               */
/* -------------------------------------------------------------------------- */

const StatusPipeline = ({ pipeline }: { pipeline: DashboardData["statusPipeline"] }) => {
  const peak = Math.max(1, ...pipeline.map((stage) => stage.count));

  return (
    <div>
      <BlockHeading title="Pipeline by status" aside="D23 lifecycle" />

      <div className="space-y-3">
        {pipeline.map((stage) => (
          <div key={stage.status} className="flex items-center gap-4">
            <span className="w-32 font-heading text-xxs font-semibold uppercase tracking-[0.14em] text-body/55 shrink-0">{orderStatusLabels[stage.status]}</span>
            <span className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
              <span className={`block h-full rounded-full duration-500 ${orderStatusBars[stage.status]}`} style={{ width: `${(stage.count / peak) * 100}%` }} />
            </span>
            <span className="w-8 text-sm text-right text-body tabular-nums shrink-0">{stage.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                                  Dashboard                                 */
/* -------------------------------------------------------------------------- */

export const MainDashboard = () => {
  const { isAuthenticated } = useAuthStore();

  const [month, setMonth] = React.useState<string>("");
  const [year, setYear] = React.useState<string>("");

  const { data, isLoading, isError, refetch, isFetching } = dashboardApi.useGetDashboard<ApiResponse<DashboardData>>({
    key: ["dashboards", month, year],
    enabled: isAuthenticated,
    params: { month: month || undefined, year: year || undefined },
  });

  const metrics = data?.data;

  const periodLabel = !month && !year ? "All time" : [MONTHS.find((entry) => entry.value === month)?.label, year].filter(Boolean).join(" ") || "All time";

  return (
    <>
      <PageHeader
        eyebrow="Overview"
        title="Dashboard"
        description="Activity across the store — orders awaiting verification, catalog depth and the member registry."
        actions={
          <>
            <FilterDropdown label="Month" value={month} options={MONTHS} onChange={setMonth} />
            <FilterDropdown label="Year" value={year} options={YEARS} onChange={setYear} />
            <AdminButton size="sm" onClick={() => refetch()} disabled={isFetching}>
              {isFetching ? "Refreshing…" : "Refresh"}
            </AdminButton>
          </>
        }
      />

      {isLoading ? (
        <LoadingState message="Loading metrics" />
      ) : isError || !metrics ? (
        <ErrorState onRetry={refetch} />
      ) : (
        <div className="space-y-12">
          <StatGrid>
            <Stat label="Orders" value={metrics.totalOrders} caption={periodLabel} />
            <Stat
              label="Awaiting verification"
              value={metrics.totalPendingOrders}
              caption={metrics.totalPendingOrders > 0 ? "Receipts to check" : "Nothing waiting"}
              footnote={
                metrics.totalPendingOrders > 0 ? (
                  <Link href="/admin/dashboard/orders?isPurchased=false" className="inline-flex items-center gap-1 duration-200 text-primary hover:text-body">
                    Review now <PiArrowUpRight className="size-3" />
                  </Link>
                ) : undefined
              }
            />
            <Stat label="Revenue" value={formatIDR(metrics.totalPurchasedAmount)} caption={`${metrics.totalItemsSold} items sold`} />
            <Stat label="Members" value={metrics.totalMembers} caption="Registered for the member rate" />
          </StatGrid>

          <div className="grid gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:gap-12">
            <TrendChart days={metrics.ordersByDay} />
            <StatusPipeline pipeline={metrics.statusPipeline} />
          </div>

          <div>
            <BlockHeading
              title="Latest orders"
              aside={
                <Link href="/admin/dashboard/orders" className="inline-flex items-center gap-1 duration-200 hover:text-primary">
                  View all <PiArrowUpRight className="size-3" />
                </Link>
              }
            />

            {metrics.latestOrders.length === 0 ? (
              <Panel className="px-6 py-10 text-sm text-center text-body/50">No orders in this period.</Panel>
            ) : (
              <Panel className="overflow-hidden">
                <TableShell>
                  <thead className="border-b bg-muted/60 border-border">
                    <tr>
                      <Th>Status</Th>
                      <Th>Customer</Th>
                      <Th>Payment</Th>
                      <Th className="text-right">Total</Th>
                      <Th className="text-right">Received</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/70">
                    {metrics.latestOrders.map((order) => (
                      <tr key={order.id} className="duration-200 hover:bg-muted/40">
                        <Td>
                          <span className="flex items-center gap-2">
                            <span className={`rounded-full size-1.5 ${orderStatusBars[order.status]}`} />
                            <span className="font-heading text-xxs font-semibold uppercase tracking-[0.12em] text-body/70">{orderStatusLabels[order.status]}</span>
                          </span>
                        </Td>
                        <Td>
                          <span className="block text-body">{order.fullname}</span>
                          <span className="block text-xs text-body/50">{order.email}</span>
                        </Td>
                        <Td>{paymentMethodLabels[order.paymentMethod]}</Td>
                        <Td className="text-right text-body tabular-nums">{formatIDR(order.totalPurchased)}</Td>
                        <Td className="text-right whitespace-nowrap text-body/50">{shortDate(order.createdAt)}</Td>
                      </tr>
                    ))}
                  </tbody>
                </TableShell>
              </Panel>
            )}
          </div>

          <div>
            <BlockHeading title="Catalog" aside={`${metrics.totalProducts} products · ${metrics.inactiveProducts} inactive`} />

            {metrics.stockByBrand.length === 0 ? (
              <Panel className="px-6 py-10 text-sm text-center text-body/50">No products yet.</Panel>
            ) : (
              <StatGrid columns={3}>
                {metrics.stockByBrand.map((row) => (
                  <Stat
                    key={row.brand}
                    // A brand present in the database but missing from taxonomy.ts cannot
                    // happen — the drift guard makes it a compile error — but the fallback
                    // keeps the panel readable rather than blank if it ever did.
                    label={brandByKey(row.brand)?.label ?? row.brand}
                    value={row.stock}
                    caption={`in stock · ${row.products} product${row.products === 1 ? "" : "s"}`}
                    footnote={
                      !isBrandActive(row.brand) ? (
                        <Badge className="bg-body/6 text-body/50">Hidden from storefront</Badge>
                      ) : undefined
                    }
                  />
                ))}
              </StatGrid>
            )}
          </div>
        </div>
      )}
    </>
  );
};
