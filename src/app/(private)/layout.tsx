import type { Metadata } from "next";

import { Inter, Raleway } from "next/font/google";

import "../globals.css";

import { QueryClientWrapper } from "@/components";

import { Toaster } from "react-hot-toast";

const raleway = Raleway({ subsets: ["latin"], variable: "--font-raleway", display: "swap" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "Lindway Admin",
  description: "Lindway Home admin dashboard",
  icons: { icon: "/favicon.ico" },
};

// The admin dashboard is deliberately EN-only and outside the [lang] segment (D3),
// so this is a second root layout rather than a nested one.
export default function PrivateLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${raleway.variable} ${inter.variable}`}>
      <body className="flex flex-col min-h-screen overflow-x-hidden">
        <Toaster position="bottom-center" reverseOrder={false} toastOptions={{ duration: 5000 }} />
        <QueryClientWrapper>{children}</QueryClientWrapper>
      </body>
    </html>
  );
}
