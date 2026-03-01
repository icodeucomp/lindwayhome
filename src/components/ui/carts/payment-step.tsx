"use client";

import * as React from "react";

import toast from "react-hot-toast";

import { FaArrowLeft, FaQrcode, FaCreditCard } from "react-icons/fa";

import { Button, Img, ProgressBar } from "@/components";

import { formatIDR, filesApi, configParametersApi } from "@/utils";

import { CreateGuest, PaymentMethods, ConfigParameterData, ApiResponse } from "@/types";

type FormData = Omit<CreateGuest, "purchased" | "totalItemsSold">;

interface PaymentStepProps {
  formData: FormData & { checkoutToken: string };
  setFormData: React.Dispatch<React.SetStateAction<FormData & { checkoutToken: string }>>;
  onBack: () => void;
  onSubmit: (data: FormData & { checkoutToken: string }) => void;
  isLoading: boolean;
}

interface Upload {
  isUploading: boolean;
  uploadProgress: number;
}

export const PaymentStep = ({ formData, setFormData, onBack, onSubmit, isLoading }: PaymentStepProps) => {
  const { data: parameter } = configParametersApi.useGetConfigParametersPublic<ApiResponse<ConfigParameterData>>({
    key: ["config-parameters-public"],
    keyParams: ["qris_image"],
  });

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

      const respImages = await filesApi.uploadImages(files, "receipt", (progress: number) => {
        setUpload((prev) => ({ ...prev, uploadProgress: progress }));
      });

      setFormData((prev) => ({ ...prev, receiptImage: respImages[0] }));
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
    <form className="space-y-4 sm:space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 transition-colors rounded hover:bg-gray/5" type="button">
          <FaArrowLeft size={16} />
        </button>
        <h2 className="text-xl font-bold sm:text-2xl text-gray">Payment Method</h2>
      </div>

      <div className="p-3 rounded-lg sm:p-4 bg-gray/5">
        <div className="flex items-center justify-between">
          <span className="text-sm sm:text-base text-gray">Total Amount</span>
          <span className="text-lg font-bold sm:text-xl text-gray">{formatIDR(formData.totalPurchased)}</span>
        </div>
      </div>

      <div className="space-y-3 sm:space-y-4">
        <div
          onClick={() => setFormData((prev) => ({ ...prev, paymentMethod: PaymentMethods.QRIS }))}
          className={`border rounded-lg p-3 sm:p-4 cursor-pointer transition-colors ${
            formData.paymentMethod === PaymentMethods.QRIS ? "border-blue-500 bg-blue-50" : "border-gray hover:border-darker-gray"
          }`}
        >
          <div className="flex items-center gap-3 sm:gap-4">
            <FaQrcode size={20} className="shrink-0 text-blue-500" />
            <div className="min-w-0">
              <div className="text-sm font-medium text-gray sm:text-base">QRIS Payment</div>
              <div className="text-xs sm:text-sm text-gray">Scan QR code with your mobile banking app</div>
            </div>
          </div>
        </div>

        <div
          onClick={() => setFormData((prev) => ({ ...prev, paymentMethod: PaymentMethods.BANK_TRANSFER }))}
          className={`border rounded-lg p-3 sm:p-4 cursor-pointer transition-colors ${
            formData.paymentMethod === PaymentMethods.BANK_TRANSFER ? "border-blue-500 bg-blue-50" : "border-gray hover:border-darker-gray"
          }`}
        >
          <div className="flex items-center gap-3 sm:gap-4">
            <FaCreditCard size={20} className="shrink-0 text-green-500" />
            <div className="min-w-0">
              <div className="text-sm font-medium text-gray sm:text-base">Bank Transfer</div>
              <div className="text-xs sm:text-sm text-gray">Transfer to our bank account</div>
            </div>
          </div>
        </div>
      </div>

      {formData.paymentMethod === PaymentMethods.QRIS && (
        <div className="p-4 text-center border-2 border-dashed rounded-lg sm:p-8 bg-light border-gray">
          <p className="mb-2 text-sm sm:text-base text-gray">Scan QR Code to Pay</p>
          <p className="mb-4 text-xs sm:text-sm text-gray">Use your banking app to scan and pay</p>
          {parameter?.data.qris_image && <Img src={parameter.data.qris_image.url} alt="QRIS Payment Code" className="w-full mx-auto rounded-lg aspect-square max-w-48 sm:max-w-64" cover />}
        </div>
      )}

      {formData.paymentMethod === PaymentMethods.BANK_TRANSFER && (
        <div className="overflow-hidden border rounded-lg border-gray text-gray">
          <div className="block divide-y sm:hidden divide-gray/30">
            <div className="p-4 space-y-3">
              <div className="space-y-1">
                <h3 className="text-base font-medium">BCA Bank</h3>
                <p className="text-sm font-light">NI KADEK LINDA WIRYANI</p>
                <p className="text-sm font-medium">7725164521</p>
              </div>
            </div>
            <div className="p-4 space-y-3">
              <div className="space-y-1">
                <h3 className="text-base font-medium">MANDIRI Bank</h3>
                <p className="text-sm font-light">NI KADEK LINDA WIRYANI</p>
                <p className="text-sm font-medium">145-00-1231250-6</p>
              </div>
              <div className="pt-2 border-t border-gray/20">
                <p className="text-xs font-light">
                  SWIFT: <span className="font-medium">BMRIIDJA</span>
                </p>
              </div>
            </div>
          </div>

          <div className="hidden sm:grid sm:grid-cols-2 sm:divide-x sm:divide-gray/30">
            <div className="p-4 divide-y divide-gray/30">
              <div className="pb-4 space-y-1">
                <h3 className="text-lg font-medium">BCA Bank</h3>
                <p className="text-sm font-light">NI KADEK LINDA WIRYANI</p>
                <p className="text-sm font-medium">7725164521</p>
              </div>
              <div className="pt-4 space-y-1">
                <h3 className="text-lg font-medium">MANDIRI Bank</h3>
                <p className="text-sm font-light">
                  SWIFT: <span className="font-medium">CENAIDJA</span>
                </p>
              </div>
            </div>
            <div className="p-4 divide-y divide-gray/30">
              <div className="pb-4 space-y-1">
                <h3 className="text-lg font-medium">MANDIRI Bank</h3>
                <p className="text-sm font-light">NI KADEK LINDA WIRYANI</p>
                <p className="text-sm font-medium">145-00-1231250-6</p>
              </div>
              <div className="pt-4 space-y-1">
                <h3 className="text-lg font-medium">MANDIRI Bank</h3>
                <p className="text-sm font-light">
                  SWIFT: <span className="font-medium">BMRIIDJA</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {(formData.paymentMethod === PaymentMethods.QRIS || formData.paymentMethod === PaymentMethods.BANK_TRANSFER) && (
        <div className="space-y-2">
          <label htmlFor="image" className="block text-sm font-medium text-gray">
            Upload Payment Receipt *
          </label>
          <div className="relative flex flex-row items-center overflow-hidden border rounded-lg border-gray/50">
            <input type="file" id="images" ref={imageInputRef} onChange={handleImagesChange} hidden accept="image/*" disabled={upload.isUploading} />
            <label
              htmlFor="images"
              className={`px-4 py-2 bg-gray/10 text-sm font-medium border-r border-gray/30 ${upload.isUploading ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-gray/20"}`}
            >
              {upload.isUploading ? "Uploading..." : "Choose Image"}
            </label>
            <label className="flex-1 px-3 py-2 text-sm truncate text-slate-500">{formData.receiptImage?.originalName || "No file selected"}</label>
            {!formData.receiptImage && !upload.isUploading && <small className="hidden pr-3 text-xs text-gray/70 sm:block">Max 5MB</small>}
            {formData.receiptImage && !upload.isUploading && (
              <button
                onClick={() => handleDeleteImages(formData.receiptImage?.path || "")}
                type="button"
                className="absolute p-1 text-white bg-red-500 rounded-full hover:bg-red-600 right-2 cursor-pointer"
                title="Delete image"
              >
                <svg className="size-3 sm:size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          {upload.isUploading && <ProgressBar uploadProgress={upload.uploadProgress} />}
        </div>
      )}

      <div className="flex flex-col-reverse items-center w-full gap-3 sm:flex-row sm:gap-4">
        <Button type="button" onClick={onBack} className="w-full btn-outline">
          Back
        </Button>
        <Button type="button" onClick={handlePaymentSubmit} disabled={isLoading || upload.isUploading} className={`w-full ${(isLoading || upload.isUploading) && "animate-pulse opacity-70"} btn-gray`}>
          {isLoading ? "Processing..." : "Complete Order"}
        </Button>
      </div>
    </form>
  );
};
