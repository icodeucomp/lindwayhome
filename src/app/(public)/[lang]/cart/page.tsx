import { EverySnap, Footer, Header } from "@/components/ui";
import { CartProduct } from "@/components/ui/carts";

export default function CartPage() {
  return (
    <>
      <Header isDark />
      <div className="bg-gray/5">
        <CartProduct />
      </div>
      <EverySnap />
      <Footer />
    </>
  );
}
