import { Button } from "@/components";

import { FaCheckCircle } from "react-icons/fa";

import { formatUnderscoreToSpace, formatIDR } from "@/utils";

import { CreateGuest } from "@/types";

interface FormData extends Omit<CreateGuest, "purchased" | "totalItemsSold"> {
  isUploading: boolean;
  uploadProgress: number;
}

interface CompleteStepProps {
  formData: FormData;
  totalItem: number;
  onClose: () => void;
  totalPurchased: number;
}

export const CompleteStep = ({ formData, totalItem, onClose, totalPurchased }: CompleteStepProps) => {
  return (
    <div className="text-center">
      <div className="mb-6">
        <FaCheckCircle size={48} className="mx-auto mb-4 text-green-500 sm:w-16 sm:h-16" />
        <h2 className="mb-2 text-xl font-bold sm:text-2xl text-gray">Order Complete!</h2>
        <p className="text-sm sm:text-base text-gray">
          Thank you for your purchase! You&apos;ve successfully ordered {totalItem} item{totalItem > 1 ? "s" : ""}.
        </p>
      </div>

      <div className="p-3 mb-6 border border-green-200 rounded-lg sm:p-4 bg-green-50">
        <div className="space-y-2 text-sm text-left sm:text-base">
          <div className="flex items-start justify-between">
            <span className="text-gray">Order Total:</span>
            <span className="font-semibold text-right">{formatIDR(totalPurchased)}</span>
          </div>
          <div className="flex items-start justify-between">
            <span className="text-gray">Payment Method:</span>
            <span className="font-semibold text-right">{formatUnderscoreToSpace(formData.paymentMethod)}</span>
          </div>
          <div className="flex items-start justify-between">
            <span className="text-gray">Customer:</span>
            <span className="font-semibold text-right wrap-break-words">{formData.fullname}</span>
          </div>
        </div>
      </div>

      <div className="mb-6 space-y-2">
        <p className="text-xs sm:text-sm text-gray">
          A confirmation email has been sent to <strong className="wrap-break-words">{formData.email}</strong>
        </p>
        <p className="text-xs sm:text-sm text-gray">Thank you for choosing us! 🙏</p>
      </div>

      <div className="mt-6">
        <Button type="button" onClick={onClose} className="w-full btn-gray">
          Continue Shopping
        </Button>
      </div>
    </div>
  );
};
