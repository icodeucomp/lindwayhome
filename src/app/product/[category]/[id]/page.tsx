import { EverySnap, Footer, Header, ProductDetail } from "@/components/ui";

export default async function ProductsPage({ params }: { params: Promise<{ id: string; category: string }> }) {
  const { id, category } = await params;
  return (
    <>
      <Header isDark />
      <ProductDetail category={category} id={id} />
      <EverySnap />
      <Footer />
    </>
  );
}
