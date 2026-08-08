import type { Metadata } from "next";

import { notFound } from "next/navigation";

import { Inter, Raleway } from "next/font/google";

import "../../globals.css";

import { QueryClientWrapper, ScrollToTop } from "@/components";

import { Footer, Header } from "@/components/ui";

import { CartDrawer } from "@/components/ui/storefront";

import { isLocale, locales } from "@/i18n/config";

import { Toaster } from "react-hot-toast";

const raleway = Raleway({ subsets: ["latin"], variable: "--font-raleway", display: "swap" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "Lindway Home",
  description: "Indonesian fashion, handcrafted in Bali.",
  icons: { icon: "/favicon.ico" },
};

export const generateStaticParams = () => locales.map((lang) => ({ lang }));

export default async function PublicLayout({ children, params }: Readonly<{ children: React.ReactNode; params: Promise<{ lang: string }> }>) {
  const { lang } = await params;

  if (!isLocale(lang)) notFound();

  return (
    <html lang={lang} className={`${raleway.variable} ${inter.variable}`}>
      <body className="flex flex-col min-h-screen overflow-x-hidden">
        <Toaster position="bottom-center" reverseOrder={false} toastOptions={{ duration: 5000 }} />
        <QueryClientWrapper>
          {/* The shell is identical on every public page (reference/*.png), so it lives
              here rather than being repeated per route — which is how v1 let them drift. */}
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
          <CartDrawer />
        </QueryClientWrapper>
        <ScrollToTop />
      </body>
    </html>
  );
}
