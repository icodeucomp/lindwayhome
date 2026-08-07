import type { Metadata } from "next";

import { notFound } from "next/navigation";

import { Inter, Raleway } from "next/font/google";

import "../../globals.css";

import { QueryClientWrapper, ScrollToTop } from "@/components";

import { Footer, Header } from "@/components/ui";

import { isLocale, locales } from "@/i18n/config";

import { getDictionary } from "@/i18n/get-dictionary";

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

  // Loaded here, on the server, and handed to the header as plain strings — the
  // dictionaries must never end up in a client bundle (see get-dictionary.ts).
  const dictionary = await getDictionary(lang);

  return (
    <html lang={lang} className={`${raleway.variable} ${inter.variable}`}>
      <body className="flex flex-col min-h-screen overflow-x-hidden">
        <Toaster position="bottom-center" reverseOrder={false} toastOptions={{ duration: 5000 }} />
        <QueryClientWrapper>
          {/* Header and footer live here rather than in each page. They used to be
              rendered per page — and inside the hero on six of them, because the old
              header floated over the background image. The v2 header is a solid band,
              so that arrangement is gone and one placement serves every route. */}
          <Header labels={{ ...dictionary.nav, tagline: dictionary.brand.tagline }} />
          <main className="flex-1">{children}</main>
          <Footer />
        </QueryClientWrapper>
        <ScrollToTop />
      </body>
    </html>
  );
}
