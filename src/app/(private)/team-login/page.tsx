import type { Metadata } from "next";

import { TeamLogin } from "@/components/ui/admin";

export const metadata: Metadata = {
  title: "Team access · Lindway Home",
  robots: { index: false, follow: false },
};

export default function TeamLoginPage() {
  return <TeamLogin />;
}
