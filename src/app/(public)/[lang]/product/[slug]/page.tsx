import { ProductDetail } from "@/components/ui/catalog";

/**
 * Products are addressed by slug on public routes and by id in admin (D4). The slug is
 * single, not per-locale, so switching language keeps the visitor on the same URL.
 */
export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ProductDetail slug={slug} />;
}
