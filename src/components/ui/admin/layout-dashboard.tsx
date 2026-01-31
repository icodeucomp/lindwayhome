"use client";

import * as React from "react";

import Link from "next/link";

import { usePathname, useRouter } from "next/navigation";

import { Button, Container, Img } from "@/components";

import { useAuthStore } from "@/hooks";

export const LayoutDashboard = ({ children }: { children: React.ReactNode }) => {
  const { user, isAuthenticated, logout, initialize } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    initialize();
  }, [initialize]);

  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (!isAuthenticated) {
        router.push("/admin/login");
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [isAuthenticated, router]);

  const handleLogout = () => {
    logout();
    router.push("/admin/login");
  };

  if (!isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray/10">
      {/* Navigation */}
      <nav className="sticky top-0 border-b border-b-gray/20 shadow-sm bg-light z-100">
        <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <div className="flex justify-between h-20">
            <Link href="/admin/dashboard" className="text-xl font-bold">
              <Img src="/icons/dark-logo.png" alt="lindway logo" className="h-full min-w-28 max-w-28" cover />
            </Link>
            <div className="flex items-center gap-8 list-none">
              {["products", "guests", "parameters", "locations"].map((path, index) => (
                <li key={index} className="relative">
                  <Link href={`/admin/dashboard/${path}`} className="font-medium rounded-lg text-gray hover:text-dark">
                    {path.charAt(0).toUpperCase() + path.slice(1)}
                  </Link>
                  {path === pathname.split("/")[3] && (
                    <>
                      <span className={`absolute h-0.5 transition-all -bottom-1.5 left-1/2 bg-dark w-8`}></span>
                      <span className={`absolute h-0.5 transition-all -bottom-1.5 right-1/2 bg-dark w-8`}></span>
                    </>
                  )}
                </li>
              ))}
            </div>

            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Welcome, {user?.username}</span>
              <Button onClick={handleLogout} className="text-sm font-medium transition-colors bg-red-600 rounded-lg text-light hover:bg-red-700">
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <Container className="py-6">{children}</Container>
    </div>
  );
};
