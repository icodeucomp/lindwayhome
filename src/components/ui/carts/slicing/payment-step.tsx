"use client";

import * as React from "react";

import toast from "react-hot-toast";

import { Img, ProgressBar } from "@/components";

import { StoreButton, useStoreProfile } from "@/components/ui/storefront";

import { formatIDR, filesApi, configParametersApi } from "@/utils";

import { CheckoutFormData, PaymentMethods, ConfigParameterData, ApiResponse } from "@/types";

import { PiArrowLeft, PiBank, PiQrCode, PiUploadSimple, PiX } from "react-icons/pi";

/**
 * Step 2 — how the buyer pays, and the receipt that proves they did.
 *
 * There is no payment gateway: both methods are manual, an admin verifies the receipt
 * afterwards, and that is why a receipt is required for *both* (F-12).
 *
 * Bank details come from the `store_profile` config group, not from this file. They were
 * hardcoded here in v1 (A9.12), and the hardcoded desktop table had drifted: it printed
 * BCA's SWIFT code (CENAIDJA) under a "MANDIRI Bank" heading, so anyone sending an
 * international transfer read the wrong code off the screen. Reading config also means
 * How to Shop and this step cannot disagree.
 */

interface PaymentStepProps {
  formData: CheckoutFormData;
  setFormData: React.Dispatch<React.SetStateAction<CheckoutFormData>>;
  onBack: () => void;
  onSubmit: (data: CheckoutFormData) => void;
  isLoading: boolean;
}

interface Upload {
  isUploading: boolean;
  uploadProgress: number;
}

const METHODS = [
  { value: PaymentMethods.BANK_TRANSFER, icon: PiBank, label: "Bank Transfer", hint: "Transfer to one of our accounts, then upload the receipt." },
  { value: PaymentMethods.QRIS, icon: PiQrCode, label: "QRIS", hint: "Scan the code with any banking or e-wallet app." },
];

export const PaymentStep = ({ formData, setFormData, onBack, onSubmit, isLoading }: PaymentStepProps) => {
  const { data: parameter } = configParametersApi.useGetConfigParametersPublic<ApiResponse<ConfigParameterData>>({
    key: ["config-parameters-public"],
    keyParams: ["qris_image"],
  });

  const { bankAccounts } = useStoreProfile();

  const [upload, setUpload] = React.useState<Upload>({ isUploading: false, uploadProgress: 0 });

  const imageInputRef = React.useRef<HTMLInputElement | null>(null);

  const handleImagesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (!files.length) return;

    const file = files[0];
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file");
      return;
    }

    try {
      setUpload((prev) => ({ ...prev, isUploading: true, uploadProgress: 0 }));

      const respImages = await filesApi.uploadImages(files, (progress: number) => {
        setUpload((prev) => ({ ...prev, uploadProgress: progress }));
      });

      setFormData((prev) => ({ ...prev, receiptImage: respImages[0] }));
      toast.success("Image uploaded successfully");
    } catch (error) {
      toast.error((error as string) || "Failed to upload image");
    } finally {
      setUpload((prev) => ({ ...prev, isUploading: false, uploadProgress: 0 }));
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  };

  const handleDeleteImages = async (subPath: string) => {
    try {
      await filesApi.delete(subPath);
      setFormData((prev) => ({ ...prev, receiptImage: undefined }));
      toast.success("Image deleted successfully");
      if (imageInputRef.current) imageInputRef.current.value = "";
    } catch (error) {
      toast.error((error as string) || "Failed to delete image");
    }
  };

  const handlePaymentSubmit = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!formData.paymentMethod) {
      toast.error("Please select a payment method");
      return;
    }

    const requiresReceipt = formData.paymentMethod === PaymentMethods.QRIS || formData.paymentMethod === PaymentMethods.BANK_TRANSFER;

    if (requiresReceipt && !formData.receiptImage) {
      toast.error("Please upload payment receipt");
      return;
    }

    onSubmit(formData);
  };

  return (
    <form className="space-y-6">
      <div className="flex items-center gap-4">
        <button type="button" onClick={onBack} aria-label="Back to details" className="grid border size-9 place-items-center border-border text-body hover:border-primary hover:text-primary">
          <PiArrowLeft className="size-4" />
        </button>
        <h2 className="text-xl uppercase font-heading text-primary tracking-[0.06em]">Payment</h2>
      </div>

      <div className="flex items-baseline justify-between gap-4 py-4 border-y border-border">
        <span className="font-heading text-xxs uppercase tracking-[0.16em] text-body/55">Total Due</span>
        <span className="text-2xl font-heading text-body">{formatIDR(formData.totalPurchased)}</span>
      </div>

      <fieldset className="space-y-3">
        <legend className="pb-3 font-heading text-xxs uppercase tracking-[0.16em] text-body/55">Payment Method</legend>

        {METHODS.map(({ value, icon: Icon, label, hint }) => {
          const isActive = formData.paymentMethod === value;
          return (
            <label
              key={value}
              className={`flex cursor-pointer items-start gap-4 border p-4 transition-colors ${isActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
            >
              <input
                type="radio"
                name="paymentMethod"
                value={value}
                checked={isActive}
                onChange={() => setFormData((prev) => ({ ...prev, paymentMethod: value }))}
                className="mt-1 accent-primary"
              />
              <Icon className={`mt-0.5 size-5 shrink-0 ${isActive ? "text-primary" : "text-body/50"}`} />
              <span className="space-y-1">
                <span className="block text-sm uppercase font-heading text-body tracking-[0.04em]">{label}</span>
                <span className="block text-xs text-body/70">{hint}</span>
              </span>
            </label>
          );
        })}
      </fieldset>

      {formData.paymentMethod === PaymentMethods.QRIS && (
        <div className="p-6 space-y-3 text-center border border-border bg-muted">
          <p className="font-heading text-xxs uppercase tracking-[0.16em] text-body/55">Scan to Pay</p>
          {parameter?.data.qris_image && <Img src={parameter.data.qris_image.url} alt="QRIS payment code" className="w-full mx-auto aspect-square max-w-56 bg-footer/30" cover />}
          <p className="text-xs text-body/60">Open your banking or e-wallet app and scan the code above.</p>
        </div>
      )}

      {formData.paymentMethod === PaymentMethods.BANK_TRANSFER && (
        <div className="border divide-y border-border divide-border">
          {bankAccounts.length === 0 ? (
            <p className="p-4 text-xs text-body/60">Bank details are not configured yet — please message us for the account number.</p>
          ) : (
            bankAccounts.map((account) => (
              <div key={account.number} className="p-4 space-y-1">
                <p className="text-sm uppercase font-heading text-primary tracking-[0.06em]">{account.bank}</p>
                <p className="text-sm text-body tabular-nums">{account.number}</p>
                <p className="text-xs text-body/70">{account.holder}</p>
                {(account.branch || account.swift) && (
                  <p className="text-xs text-body/55">
                    {account.branch}
                    {account.branch && account.swift ? " · " : ""}
                    {account.swift && `SWIFT ${account.swift}`}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      )}

      <div className="space-y-2">
        <p className="font-heading text-xxs uppercase tracking-[0.16em] text-body/55">Payment Receipt *</p>

        <div className="flex items-center border border-border">
          <input type="file" id="receipt" ref={imageInputRef} onChange={handleImagesChange} hidden accept="image/*" disabled={upload.isUploading} />
          <label
            htmlFor="receipt"
            className={`flex items-center gap-2 border-r border-border px-4 py-2.5 font-heading text-xxs uppercase tracking-[0.14em] ${
              upload.isUploading ? "cursor-not-allowed text-body/40" : "cursor-pointer text-body hover:text-primary"
            }`}
          >
            <PiUploadSimple className="size-4" />
            {upload.isUploading ? "Uploading…" : "Choose Image"}
          </label>

          <span className="flex-1 px-3 text-xs truncate text-body/70">{formData.receiptImage?.originalName || "No file selected"}</span>

          {!formData.receiptImage && !upload.isUploading && <span className="hidden pr-3 text-xxs text-body/45 sm:block">Max 5MB</span>}

          {formData.receiptImage && !upload.isUploading && (
            <button type="button" onClick={() => handleDeleteImages(formData.receiptImage?.path || "")} aria-label="Remove receipt" className="px-3 text-body/60 hover:text-primary">
              <PiX className="size-4" />
            </button>
          )}
        </div>

        <p className="text-xxs text-body/50">Both methods are verified by hand, so a readable screenshot of the transfer is required either way.</p>

        {upload.isUploading && <ProgressBar uploadProgress={upload.uploadProgress} />}
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row">
        <StoreButton type="button" variant="outline" onClick={onBack} className="w-full">
          Back
        </StoreButton>
        <StoreButton type="button" onClick={handlePaymentSubmit} disabled={isLoading || upload.isUploading} className="w-full">
          {isLoading ? "Processing…" : "Complete Order"}
        </StoreButton>
      </div>
    </form>
  );
};
