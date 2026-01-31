import { Suspense } from "react";

import { LayoutDashboard } from "@/components/ui/admin";

export default function DashboardApp({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <LayoutDashboard>
      <Suspense fallback={<div>Loading ...</div>}>{children}</Suspense>
    </LayoutDashboard>
  );
}
