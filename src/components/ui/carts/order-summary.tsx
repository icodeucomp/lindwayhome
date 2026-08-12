"use client";

import * as React from "react";

import { useCartStore } from "@/hooks";

import toast from "react-hot-toast";

import { CheckoutForm, CheckoutSteps, CompleteStep, PaymentStep, type CheckoutStep } from "./slicing";

import { Modal } from "@/components";
import { orderCheckoutApi } from "@/utils";
import { CheckoutFormData, PaymentMethods } from "@/types";

const initFormData: CheckoutFormData = {
  email: "",
  fullname: "",
  receiptImage: undefined,
  paymentMethod: PaymentMethods.BANK_TRANSFER,
  address: "",
  isMember: false,
  items: [],
  postalCode: 0,
  totalPurchased: 0,
  checkoutToken: "",
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
  const { addSelectedItems, removeSelectedItems } = useCartStore();

  const [currentStep, setCurrentStep] = React.useState<CheckoutStep>("summary");
  const [formData, setFormData] = React.useState<CheckoutFormData>(initFormData);
  const [formErrors, setFormErrors] = React.useState<Record<string, string>>({});

  const createOrder = orderCheckoutApi.useCreateOrder({
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

  const handleFormSubmit = (data: CheckoutFormData, errors: Record<string, string>) => {
    if (Object.keys(errors).length > 0) {
      toast.error("Please correct the errors in the form");
      return;
    }

    setFormData(data);
    setFormErrors(errors);
    setCurrentStep("payment");
  };

  const handlePaymentSubmit = async (paymentData: CheckoutFormData) => {
    try {
      if (!paymentData.checkoutToken) {
        toast.error("Checkout session expired. Please go back and recalculate.");
        setCurrentStep("summary");
        return;
      }

      const submitData = {
        ...paymentData,
        isPurchased: false,
        postalCode: Number(paymentData.postalCode),
        checkoutToken: paymentData.checkoutToken,
        items: addSelectedItems(),
      };

      createOrder.mutate(submitData);
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
      <div className="space-y-6">
        <CheckoutSteps current={currentStep} />

        {currentStep === "summary" && (
          <CheckoutForm
            formData={formData}
            formErrors={formErrors}
            price={price}
            totalItem={totalItem}
            onSubmit={handleFormSubmit}
            onCancel={onClose}
            cartItems={addSelectedItems()}
          />
        )}
        {currentStep === "payment" && (
          <PaymentStep formData={formData} setFormData={setFormData} onBack={() => setCurrentStep("summary")} onSubmit={handlePaymentSubmit} isLoading={createOrder.isPending} />
        )}
        {currentStep === "complete" && <CompleteStep formData={formData} totalItem={totalItem} totalPurchased={formData.totalPurchased} onClose={handleClose} />}
      </div>
    </Modal>
  );
};
