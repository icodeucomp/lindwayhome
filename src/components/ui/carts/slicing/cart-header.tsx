import { ProductCartItems } from "@/types";

interface CartHeaderProps {
  cart: ProductCartItems[];
  isAllSelected: boolean;
  onSelectAll: () => void;
}

export const CartHeader = ({ cart, isAllSelected, onSelectAll }: CartHeaderProps) => {
  return (
    <>
      <div className="hidden p-4 mb-4 rounded-lg bg-light lg:block">
        <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray">
          <div className="col-span-1">
            <input type="checkbox" className="rounded size-4 accent-primary" checked={isAllSelected} onChange={onSelectAll} />
          </div>
          <div className="col-span-4">Product</div>
          <div className="col-span-2 text-center">Price</div>
          <div className="col-span-2 text-center">Quantity</div>
          <div className="col-span-2 text-center">Total Price</div>
          <div className="col-span-1 text-center">Action</div>
        </div>
      </div>
      <div className="block p-4 mb-4 rounded-lg lg:hidden bg-light">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <input type="checkbox" className="rounded size-4 accent-primary" checked={isAllSelected} onChange={onSelectAll} />
            <span className="text-sm font-medium text-gray">Select All</span>
          </div>
          <span className="text-sm text-gray">{cart.length} items</span>
        </div>
      </div>
    </>
  );
};
