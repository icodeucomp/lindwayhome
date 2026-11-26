"use client";

import * as React from "react";

import { useCartStore } from "@/hooks";

import toast from "react-hot-toast";

import { CheckoutForm, CheckoutSteps, CompleteStep, PaymentStep, type CheckoutStep } from "./slicing";

import { Modal } from "@/components";
import { orderCheckoutApi } from "@/utils";
import { CheckoutFormData } from "@/types";

const initFormData: CheckoutFormData = {
  email: "",
  fullname: "",
  address: "",
  isMember: false,
  items: [],
  postalCode: 0,
  totalPurchased: 0,
  checkoutToken: "",
  whatsappNumber: "",
  instagram: "",
  reference: "",
  province: "",
  district: "",
  sub_district: "",
  village: "",
  addressNote: "",
  latitude: 0,
  longitude: 0,
  isPinned: false,
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
    onSuccess: (data) => {
      setFormData((prev) => ({ ...prev, invoiceUrl: data.invoiceUrl }));
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
    if (Object.values(errors).some(Boolean)) {
      toast.error("Please correct the errors in the form");
      return;
    }

    setFormData(data);
    setFormErrors(errors);
    setCurrentStep("payment");
  };

  const handlePayNow = () => {
    if (!formData.checkoutToken) {
      toast.error("Checkout session expired. Please go back and recalculate.");
      setCurrentStep("summary");
      return;
    }

    const submitData = {
      ...formData,
      postalCode: Number(formData.postalCode),
      checkoutToken: formData.checkoutToken,
      items: addSelectedItems(),
    };

    createOrder.mutate(submitData);
  };

  const handlePaid = () => setCurrentStep("complete");

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
          <PaymentStep
            formData={formData}
            onBack={() => setCurrentStep("summary")}
            onPayNow={handlePayNow}
            onPaid={handlePaid}
            isCreatingOrder={createOrder.isPending}
          />
        )}
        {currentStep === "complete" && (
          <CompleteStep formData={formData} totalItem={totalItem} totalPurchased={formData.totalPurchased} onClose={handleClose} />
        )}
      </div>
    </Modal>
  );
};
