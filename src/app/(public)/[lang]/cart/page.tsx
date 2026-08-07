import { EverySnap } from "@/components/ui";
import { CartProduct } from "@/components/ui/carts";

export default function CartPage() {
  return (
    <>
      <div className="bg-gray/5">
        <CartProduct />
      </div>
      <EverySnap />
    </>
  );
}
