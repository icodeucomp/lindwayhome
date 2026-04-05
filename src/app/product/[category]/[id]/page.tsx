import { EverySnap, Footer, Header } from "@/components/ui";

import { DetailProduct } from "@/components/ui/products";

export default async function ProductsPage({ params }: { params: Promise<{ id: string; category: string }> }) {
  const { id, category } = await params;
  return (
    <>
      <Header isDark />
      <DetailProduct category={category} id={id} />
      <EverySnap />
      <Footer />
    </>
  );
}
