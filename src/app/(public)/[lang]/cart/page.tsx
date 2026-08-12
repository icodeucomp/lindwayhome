import { EverySnap } from "@/components/ui";
import { CartProduct } from "@/components/ui/carts";

import type { Metadata } from "next";

import { isLocale } from "@/i18n/config";

import { getDictionary } from "@/i18n/get-dictionary";

import { localizedMetadata } from "@/i18n/metadata";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  // The layout already 404s an unknown locale; metadata just declines to guess.
  if (!isLocale(lang)) return {};
  const t = await getDictionary(lang);
  return localizedMetadata(lang, "/cart", t.meta.cart);
}

export default function CartPage() {
  return (
    <>
      <div className="bg-muted">
        <CartProduct />
      </div>
      <EverySnap />
    </>
  );
}
