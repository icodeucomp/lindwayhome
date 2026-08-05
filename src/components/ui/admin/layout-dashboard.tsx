"use client";

import * as React from "react";

import Link from "next/link";

import { usePathname, useRouter } from "next/navigation";

import { FaBars, FaBoxOpen, FaMapMarkerAlt, FaSignOutAlt, FaSlidersH, FaThLarge, FaTimes, FaUsers } from "react-icons/fa";
import { PiCaretDownBold } from "react-icons/pi";

import { Img } from "@/components";

import { useAuthStore, useToggleState } from "@/hooks";

interface NavItem {
  href: string;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", description: "Overview of your store", icon: <FaThLarge className="size-4" /> },
  { href: "/admin/dashboard/products", label: "Products", description: "Manage catalog and stock", icon: <FaBoxOpen className="size-4" /> },
  { href: "/admin/dashboard/orders", label: "Orders", description: "Transactions and fulfilment", icon: <FaUsers className="size-4" /> },
  { href: "/admin/dashboard/parameters", label: "Parameters", description: "Store configuration", icon: <FaSlidersH className="size-4" /> },
  { href: "/admin/dashboard/locations", label: "Locations", description: "Shipping destinations", icon: <FaMapMarkerAlt className="size-4" /> },
];

const isNavActive = (href: string, pathname: string) => (href === "/admin/dashboard" ? pathname === href : pathname.startsWith(href));

const getActiveNav = (pathname: string) => NAV_ITEMS.filter((item) => isNavActive(item.href, pathname)).sort((a, b) => b.href.length - a.href.length)[0];

const PageLoader = ({ message }: { message: string }) => (
  <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-gray/10">
    <span className="loader" />
    <p className="text-sm text-gray">{message}</p>
  </div>
);

const SidebarContent = ({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) => (
  <>
    <div className="flex items-center justify-between h-20 px-6 border-b shrink-0 border-gray/15">
      <Link href="/admin/dashboard" onClick={onNavigate} aria-label="Go to dashboard">
        <Img src="/icons/dark-logo.png" alt="lindway logo" className="w-28 h-10" cover />
      </Link>
      {onNavigate && (
        <button onClick={onNavigate} aria-label="Close menu" className="cursor-pointer text-gray hover:text-dark lg:hidden">
          <FaTimes className="size-5" />
        </button>
      )}
    </div>

    <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto scrollbar">
      <p className="px-3 pb-2 text-xxs font-semibold tracking-[0.15em] uppercase text-gray/50">Menu</p>
      {NAV_ITEMS.map((item) => {
        const isActive = isNavActive(item.href, pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={isActive ? "page" : undefined}
            className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium duration-300 rounded-lg ${isActive ? "bg-gray text-light shadow-sm" : "text-gray hover:bg-gray/10 hover:text-dark"}`}
          >
            <span className={isActive ? "text-light" : "text-gray/70"}>{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  </>
);

const UserMenu = ({ username, onLogout }: { username?: string; onLogout: () => void }) => {
  const { ref, state: isOpen, toggleState } = useToggleState(false);

  return (
    <div ref={ref} className="relative">
      <button onClick={toggleState} aria-expanded={isOpen} className="flex items-center gap-3 px-2 py-1.5 duration-300 rounded-lg cursor-pointer hover:bg-gray/10">
        <span className="flex items-center justify-center text-sm font-semibold uppercase rounded-full size-9 bg-gray text-light shrink-0">{username?.charAt(0) ?? "A"}</span>
        <span className="hidden text-left sm:block">
          <span className="block text-sm font-semibold text-darker-gray">{username ?? "Admin"}</span>
          <span className="block text-xs text-gray/70">Administrator</span>
        </span>
        <PiCaretDownBold className={`duration-300 size-3.5 fill-gray ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 w-56 py-2 mt-2 border rounded-lg shadow-lg border-gray/20 bg-light z-100">
          <div className="px-4 py-2 border-b border-gray/15 sm:hidden">
            <p className="text-sm font-semibold text-darker-gray">{username ?? "Admin"}</p>
            <p className="text-xs text-gray/70">Administrator</p>
          </div>
          <button onClick={onLogout} className="flex items-center w-full gap-2 px-4 py-2 text-sm font-medium text-red-600 duration-300 cursor-pointer hover:bg-red-50">
            <FaSignOutAlt className="size-4" />
            Logout
          </button>
        </div>
      )}
    </div>
  );
};

export const LayoutDashboard = ({ children }: { children: React.ReactNode }) => {
  const { user, isAuthenticated, isInitialized, logout, initialize } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  const [isSidebarOpen, setIsSidebarOpen] = React.useState<boolean>(false);

  React.useEffect(() => {
    initialize();
  }, [initialize]);

  React.useEffect(() => {
    if (isInitialized && !isAuthenticated) {
      router.push("/admin/login");
    }
  }, [isInitialized, isAuthenticated, router]);

  const handleLogout = () => {
    logout();
    router.push("/admin/login");
  };

  if (!isInitialized) {
    return <PageLoader message="Preparing your dashboard..." />;
  }

  if (!isAuthenticated) {
    return <PageLoader message="Redirecting to login..." />;
  }

  const activeNav = getActiveNav(pathname);

  return (
    <div className="min-h-screen bg-gray/10">
      {/* Mobile overlay */}
      {isSidebarOpen && <div onClick={() => setIsSidebarOpen(false)} aria-hidden className="fixed inset-0 bg-dark/40 z-100 lg:hidden" />}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 flex flex-col w-64 duration-300 border-r bg-light border-gray/15 z-100 lg:translate-x-0 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <SidebarContent pathname={pathname} onNavigate={() => setIsSidebarOpen(false)} />
      </aside>

      <div className="lg:pl-64">
        {/* Topbar */}
        <header className="sticky top-0 border-b shadow-sm bg-light border-gray/15 z-50">
          <div className="flex items-center justify-between h-20 gap-4 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3 min-w-0">
              <button onClick={() => setIsSidebarOpen(true)} aria-label="Open menu" className="cursor-pointer text-gray hover:text-dark lg:hidden">
                <FaBars className="size-5" />
              </button>
              <div className="min-w-0">
                <h1 className="text-lg font-bold truncate sm:text-xl text-darker-gray">{activeNav?.label ?? "Dashboard"}</h1>
                <p className="hidden text-sm truncate text-gray/70 sm:block">{activeNav?.description ?? "Overview of your store"}</p>
              </div>
            </div>

            <UserMenu username={user?.username} onLogout={handleLogout} />
          </div>
        </header>

        {/* Main Content */}
        <main className="w-full px-4 py-6 mx-auto max-w-7xl sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
};
