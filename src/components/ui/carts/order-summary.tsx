"use client";

import * as React from "react";
import { useCartStore } from "@/hooks";

import toast from "react-hot-toast";

import { CheckoutForm, CompleteStep, PaymentStep } from "@/components/ui/carts";

import { Modal } from "@/components";
import { guestCheckoutApi } from "@/utils";
import { CreateGuest, PaymentMethods } from "@/types";

type CheckoutStep = "summary" | "payment" | "complete";

interface FormData extends Omit<CreateGuest, "totalItemsSold" | "purchased"> {
  isUploading: boolean;
  uploadProgress: number;
}

const initFormData: FormData = {
  email: "",
  fullname: "",
  receiptImage: undefined,
  isUploading: false,
  uploadProgress: 0,
  paymentMethod: PaymentMethods.BANK_TRANSFER,
  address: "",
  isMember: false,
  isPurchased: false,
  items: [],
  postalCode: 0,
  shippingCost: 0,
  totalPurchased: 0,
  whatsappNumber: "",
  instagram: "",
  reference: "",
};

interface OrderSummaryProps {
  isVisible: boolean;
  onClose: () => void;
  price: number;
  totalItem: number;
}

export const OrderSummary = ({ isVisible, onClose, price, totalItem }: OrderSummaryProps) => {
  const { addSelectedItems, removeSelectedItems, getSelectedCount, getSelectedTotal } = useCartStore();

  const [currentStep, setCurrentStep] = React.useState<CheckoutStep>("summary");
  const [formData, setFormData] = React.useState<FormData>(initFormData);
  const [formErrors, setFormErrors] = React.useState<Record<string, string>>({});

  const createGuestsCheckout = guestCheckoutApi.useCreateGuestCheckouts({
    onSuccess: () => {
      setCurrentStep("complete");
    },
  });

  const handleClose = () => {
    setCurrentStep("summary");
    setFormData(initFormData);
    setFormErrors({});
    removeSelectedItems();
    onClose();
  };

  const handleFormSubmit = (data: FormData, errors: Record<string, string>) => {
    if (Object.keys(errors).length > 0) {
      toast.error("Please correct the errors in the form");
      return;
    }

    setFormData(data);
    setFormErrors(errors);
    setCurrentStep("payment");
  };

  const handlePaymentSubmit = async (paymentData: FormData) => {
    try {
      const submitData = {
        ...paymentData,
        isMember: false,
        isPurchased: false,
        postalCode: Number(paymentData.postalCode),
        items: addSelectedItems(),
        totalItemsSold: getSelectedCount(),
        purchased: getSelectedTotal(),
      };

      createGuestsCheckout.mutate(submitData);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to submit order. Please try again.";
      toast.error(errorMessage);
    }
  };

  return (
    <Modal
      isVisible={isVisible}
      onClose={() => {
        if (currentStep === "complete") {
          handleClose();
          return;
        }
        onClose();
      }}
    >
      <>
        {currentStep === "summary" && (
          <CheckoutForm
            formData={formData}
            formErrors={formErrors}
            price={price}
            totalItem={totalItem}
            onSubmit={handleFormSubmit}
            onCancel={onClose}
            getSelectedTotal={getSelectedTotal}
            cartItems={addSelectedItems()}
          />
        )}
        {currentStep === "payment" && (
          <PaymentStep
            formData={formData}
            setFormData={setFormData}
            price={formData.totalPurchased}
            onBack={() => setCurrentStep("summary")}
            onSubmit={handlePaymentSubmit}
            isLoading={createGuestsCheckout.isPending}
          />
        )}
        {currentStep === "complete" && <CompleteStep formData={formData} totalItem={totalItem} totalPurchased={formData.totalPurchased} onClose={handleClose} />}
      </>
    </Modal>
  );
};
