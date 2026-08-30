"use client";

import * as React from "react";

import Link from "next/link";

import { usePathname, useRouter } from "next/navigation";

import { PiSquaresFour, PiEnvelopeSimple, PiTShirt, PiRuler, PiTable, PiReceipt, PiTruck, PiUsers, PiNewspaper, PiTag, PiQuestion, PiSlidersHorizontal, PiMapPinLine, PiSignOut, PiList, PiX } from "react-icons/pi";

import { useAuthStore } from "@/hooks";

import { contactInquiriesApi } from "@/utils";

import { ContactInquiryListResponse } from "@/types";

import { Spinner } from "./slicing";

interface NavItem {
  group: string;
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

// Grouped per §B2.3. Contact Inbox, Members, Articles and FAQ arrive with their
// phases; there is no Taxonomy section because brand, audience and clothing are
// enums edited in code (D25).
const NAV_ITEMS: NavItem[] = [
  { group: "Overview", href: "/admin/dashboard", label: "Dashboard", icon: PiSquaresFour },
  // Standalone rather than under Content (D15): a daily work queue, not authored content.
  { group: "Overview", href: "/admin/dashboard/inbox", label: "Contact Inbox", icon: PiEnvelopeSimple },
  { group: "Catalog", href: "/admin/dashboard/products", label: "Products", icon: PiTShirt },
  { group: "Catalog", href: "/admin/dashboard/sizes", label: "Sizes", icon: PiRuler },
  { group: "Catalog", href: "/admin/dashboard/size-guides", label: "Size Guides", icon: PiTable },
  { group: "Sales", href: "/admin/dashboard/orders", label: "Orders", icon: PiReceipt },
  { group: "Sales", href: "/admin/dashboard/pickups", label: "Pickups", icon: PiTruck },
  { group: "Sales", href: "/admin/dashboard/members", label: "Members", icon: PiUsers },
  { group: "Content", href: "/admin/dashboard/articles", label: "Articles", icon: PiNewspaper },
  { group: "Content", href: "/admin/dashboard/article-categories", label: "Article Categories", icon: PiTag },
  { group: "Content", href: "/admin/dashboard/faqs", label: "FAQ", icon: PiQuestion },
  { group: "Settings", href: "/admin/dashboard/parameters", label: "Parameters", icon: PiSlidersHorizontal },
  { group: "Settings", href: "/admin/dashboard/locations", label: "Locations", icon: PiMapPinLine },
];

const NAV_GROUPS = [...new Set(NAV_ITEMS.map((item) => item.group))];

const isNavActive = (href: string, pathname: string) => (href === "/admin/dashboard" ? pathname === href : pathname.startsWith(href));

const PageLoader = ({ message }: { message: string }) => (
  <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-light">
    <Spinner className="size-6 border-border border-t-primary" />
    <p className="font-heading text-xxs font-semibold uppercase tracking-[0.16em] text-body/50">{message}</p>
  </div>
);

const Sidebar = ({ pathname, badges, onNavigate }: { pathname: string; badges: Record<string, number>; onNavigate?: () => void }) => (
  <>
    <div className="flex items-start justify-between h-24 px-6 pt-6 shrink-0">
      <Link href="/admin/dashboard" onClick={onNavigate} className="block group">
        <span className="block font-heading text-xxs font-semibold uppercase tracking-[0.2em] text-body/40">Dashboard</span>
        <span className="block mt-1 text-xl font-normal duration-200 font-heading text-body group-hover:text-primary">Lindway Home</span>
      </Link>
      {onNavigate && (
        <button onClick={onNavigate} aria-label="Close menu" className="pt-1 cursor-pointer text-body/50 hover:text-body lg:hidden">
          <PiX className="size-5" />
        </button>
      )}
    </div>

    <nav className="flex-1 pb-6 overflow-y-auto scrollbar">
      {NAV_GROUPS.map((group) => (
        <div key={group} className="mb-6 last:mb-0">
          <p className="px-6 pb-2 font-heading text-xxs font-semibold uppercase tracking-[0.16em] text-body/30">{group}</p>

          {NAV_ITEMS.filter((item) => item.group === group).map((item) => {
            const isActive = isNavActive(item.href, pathname);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={isActive ? "page" : undefined}
                className={`flex items-center gap-3 px-6 py-3 font-heading text-xs font-semibold uppercase tracking-[0.14em] duration-200 ${isActive ? "bg-body text-light" : "text-body/65 hover:bg-sidebar-hover hover:text-body"}`}
              >
                <Icon className={`size-4.5 shrink-0 ${isActive ? "text-light" : "text-body/45"}`} />
                <span className="flex-1 truncate">{item.label}</span>
                {badges[item.href] ? (
                  <span className={`grid px-1.5 min-w-5 h-5 text-xxs rounded-full place-items-center ${isActive ? "bg-light text-body" : "bg-primary text-light"}`}>{badges[item.href]}</span>
                ) : null}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  </>
);

export const LayoutDashboard = ({ children }: { children: React.ReactNode }) => {
  const { user, isAuthenticated, isInitialized, logout, initialize } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  const [isSidebarOpen, setIsSidebarOpen] = React.useState<boolean>(false);

  // The unread count for the sidebar badge (F-47). `limit: 1` because only
  // `statusCounts` is wanted — and those are counted across the whole inbox on the
  // server, so the badge means "this many are waiting" regardless of any filter.
  const { data: inbox } = contactInquiriesApi.useGetContactInquiries<ContactInquiryListResponse>({
    key: ["contact-inquiries", "badge"],
    enabled: isAuthenticated,
    params: { limit: 1 },
    staleTime: 60_000,
  });

  const badges: Record<string, number> = { "/admin/dashboard/inbox": inbox?.statusCounts?.NEW ?? 0 };

  React.useEffect(() => {
    initialize();
  }, [initialize]);

  React.useEffect(() => {
    if (isInitialized && !isAuthenticated) router.push("/admin/login");
  }, [isInitialized, isAuthenticated, router]);

  const handleLogout = () => {
    logout();
    router.push("/admin/login");
  };

  if (!isInitialized) return <PageLoader message="Preparing your dashboard" />;
  if (!isAuthenticated) return <PageLoader message="Redirecting to login" />;

  return (
    <div className="min-h-screen bg-light">
      {isSidebarOpen && <div onClick={() => setIsSidebarOpen(false)} aria-hidden className="fixed inset-0 bg-body/40 z-100 lg:hidden" />}

      <aside className={`fixed inset-y-0 left-0 flex flex-col w-64 duration-300 border-r bg-sidebar border-border z-100 lg:translate-x-0 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <Sidebar pathname={pathname} badges={badges} onNavigate={() => setIsSidebarOpen(false)} />
      </aside>

      <div className="lg:pl-64">
        {/* The page title lives in the content, not here (see PageHeader) — the topbar
            carries identity and sign-out only. */}
        <header className="sticky top-0 z-50 border-b bg-light/95 backdrop-blur border-border">
          <div className="flex items-center justify-between h-20 gap-4 px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
            <button onClick={() => setIsSidebarOpen(true)} aria-label="Open menu" className="cursor-pointer text-body/60 hover:text-body lg:hidden">
              <PiList className="size-5" />
            </button>

            <div className="flex items-center gap-4 ml-auto">
              <div className="text-right">
                <p className="text-sm truncate text-body">{user?.email ?? user?.username ?? "Admin"}</p>
                <p className="font-heading text-xxs font-semibold uppercase tracking-[0.16em] text-body/45">{user?.role === "SUPER_ADMIN" ? "Super Admin" : "Admin"}</p>
              </div>

              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-2 px-4 py-2.5 font-heading text-xxs font-semibold uppercase tracking-[0.14em] border rounded-sm cursor-pointer border-border text-body/70 hover:text-primary hover:border-primary duration-200"
              >
                <PiSignOut className="size-4" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </div>
          </div>
        </header>

        <main className="w-full px-4 py-10 mx-auto max-w-7xl sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
};
