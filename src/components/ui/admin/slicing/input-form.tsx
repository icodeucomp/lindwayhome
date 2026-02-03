import * as React from "react";

import { useRouter } from "next/navigation";

import { Button, CircularProgress, Img, NumberInput, ProgressBar } from "@/components";

import { FaMinus, FaPlus } from "react-icons/fa";

import { calculateDiscountedPrice } from "@/utils";

import { Categories, CreateProduct, EditProduct } from "@/types";

interface InputFormProps {
  formData: CreateProduct | EditProduct;
  helper: Helper;
  isPending: boolean;
  imagesInputRef: React.RefObject<HTMLInputElement | null>;
  setHelper: React.Dispatch<React.SetStateAction<Helper>>;
  handleSubmit: (E: React.FormEvent) => void;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  addSize: () => void;
  handleImagesChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleDeleteImages: (subPath: string) => void;
  removeSize: (index: number) => void;
  handleQuantityChange: (index: number, quantity: number) => void;
  incrementQuantity: (index: number) => void;
  decrementQuantity: (index: number) => void;
}

export interface Helper {
  sizeInput: string;
  isUploading: boolean;
  uploadProgress: number;
  isDeleting: boolean;
  deletingProgress: number;
}

export const InputForm = ({
  formData,
  helper,
  isPending,
  imagesInputRef,
  setHelper,
  addSize,
  handleChange,
  handleDeleteImages,
  handleImagesChange,
  handleSubmit,
  removeSize,
  decrementQuantity,
  incrementQuantity,
  handleQuantityChange,
}: InputFormProps) => {
  const router = useRouter();

  return (
    <div className="rounded-lg shadow bg-light">
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="space-y-1">
            <label htmlFor="name" className="block text-sm font-medium text-gray">
              Product Name *
            </label>
            <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} className="input-form" placeholder="Enter product name" />
          </div>

          <div className="space-y-1">
            <label htmlFor="sku" className="block text-sm font-medium text-gray">
              SKU *
            </label>
            <input type="text" id="sku" name="sku" value={formData.sku} onChange={handleChange} className="input-form" placeholder="Enter SKU" />
          </div>
        </div>

        <div className="space-y-1">
          <label htmlFor="description" className="block text-sm font-medium text-gray">
            Description *
          </label>
          <textarea id="description" name="description" rows={3} value={formData.description} onChange={handleChange} className="input-form" placeholder="Enter product description" />
        </div>

        <div className="space-y-1">
          <label htmlFor="notes" className="block text-sm font-medium text-gray">
            Notes *
          </label>
          <textarea id="notes" name="notes" rows={2} value={formData.notes} onChange={handleChange} className="input-form" placeholder="Additional notes" />
        </div>

        <div className="space-y-1">
          <label htmlFor="productionNotes" className="block text-sm font-medium text-gray">
            Production Days
          </label>
          <input
            type="text"
            id="productionNotes"
            name="productionNotes"
            value={formData.productionNotes}
            onChange={handleChange}
            className="input-form"
            placeholder="Enter notes for production days"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="sizes" className="block mb-2 text-sm font-medium text-gray">
            Sizes *
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              id="sizes"
              value={helper.sizeInput}
              onChange={(e) => setHelper((prevValue) => ({ ...prevValue, sizeInput: e.target.value }))}
              className="flex-1 input-form"
              placeholder="Enter size (e.g., S, M, L, XL)"
            />
            <Button type="button" onClick={addSize} className="btn-blue">
              Add
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {formData.sizes?.map((item, index) => (
              <div key={index} className="flex items-center gap-4 px-4 py-2 transition-shadow border rounded-lg border-gray/30">
                <span className="flex items-center justify-center text-xs font-bold text-blue-800 bg-blue-100 rounded-lg size-8">{item.size}</span>
                <span className="block text-sm font-medium text-gray">Quantity:</span>
                <div className="flex items-center flex-1 gap-2">
                  <button
                    type="button"
                    onClick={() => decrementQuantity(index)}
                    className="flex items-center justify-center transition-colors rounded-lg size-6 bg-gray hover:bg-darker-gray text-light disabled:opacity-50"
                    disabled={item.quantity <= 0}
                  >
                    <FaMinus size={10} />
                  </button>
                  <NumberInput
                    value={item.quantity === 0 ? "" : item.quantity}
                    onChange={(e) => handleQuantityChange(index, parseInt(e.target.value) || 0)}
                    className="w-12 p-1 text-xs text-center input-form"
                    placeholder="0"
                  />
                  <button
                    type="button"
                    onClick={() => incrementQuantity(index)}
                    className="flex items-center justify-center transition-colors rounded-lg size-6 bg-gray hover:bg-darker-gray text-light disabled:opacity-50"
                  >
                    <FaPlus size={10} />
                  </button>
                </div>
                <button type="button" onClick={() => removeSize(index)} className="text-red-500 transition-colors rounded-lg hover:text-red-600">
                  <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="space-y-1">
            <label htmlFor="price" className="block text-sm font-medium text-gray">
              Price * (IDR)
            </label>
            <NumberInput
              type="number"
              id="price"
              name="price"
              value={formData.price === 0 ? "" : formData.price}
              onChange={(e) => {
                const value = e.target.value;
                if (+value > 999999999999 || +value < 0) return;
                handleChange(e);
              }}
              className="input-form"
              placeholder="0"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="discount" className="block text-sm font-medium text-gray">
              Discount (%)
            </label>
            <NumberInput
              type="number"
              id="discount"
              name="discount"
              value={formData.discount === 0 ? "" : formData.discount}
              onChange={(e) => {
                const value = e.target.value;
                if (+value > 100 || +value < 0) return;
                handleChange(e);
              }}
              className="input-form"
              placeholder="0"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="discountedPrice" className="block text-sm font-medium text-gray">
              Discounted Price (IDR)
            </label>
            <input type="number" id="discountedPrice" value={formData.price && formData.discount ? calculateDiscountedPrice(formData.price!, formData.discount!) : 0} className="input-form" readOnly />
          </div>
        </div>

        <div className="space-y-1">
          <label htmlFor="category" className="block text-sm font-medium text-gray">
            Category *
          </label>
          <select name="category" id="category" value={formData.category} onChange={handleChange} className="input-form">
            {Object.values(Categories).map((category) => (
              <option key={category} value={category}>
                {category.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label htmlFor="images" className="block text-sm font-medium text-gray">
            Images *
          </label>
          <div className="relative flex flex-row items-center overflow-hidden border rounded-lg border-gray/50">
            <input type="file" id="images" ref={imagesInputRef} onChange={handleImagesChange} hidden accept="image/*" multiple />
            <label htmlFor="images" className="file-label">
              Choose file
            </label>
            <label className="text-sm text-slate-500 whitespace-nowrap">{formData.images?.length} Images</label>
            <small className="pr-2 ms-auto text-gray/70">Max 5mb. (aspect ratio of 1:1)</small>
          </div>
          {helper.isUploading && <ProgressBar uploadProgress={helper.uploadProgress} />}
        </div>

        {formData && formData.images && formData.images?.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {formData.images.map((image, index) => (
              <div key={index} className="relative">
                <button onClick={() => handleDeleteImages(image.path)} type="button" className="absolute flex items-center justify-center w-5 h-5 rounded-full -top-2 -right-2 z-1 bg-secondary">
                  <svg className="size-4 text-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                <div className="relative overflow-hidden rounded-lg shadow-lg">
                  <Img src={image.url} alt={`Selected image ${index + 1}`} className="w-full rounded-lg aspect-square" cover />
                  {helper.isDeleting && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                      <div className="flex flex-col items-center space-y-4">
                        <CircularProgress progress={helper.deletingProgress} />
                        <div className="text-sm font-medium text-white">Deleting...</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <input name="isActive" id="isActive" type="checkbox" checked={formData.isActive} onChange={handleChange} className="rounded accent-gray size-4" />
            <label htmlFor="isActive" className="block text-sm text-gray w-max">
              Active product
            </label>
          </div>

          <div className="flex items-center gap-2">
            <input name="isFavorite" id="isFavorite" type="checkbox" checked={formData.isFavorite} onChange={handleChange} className="rounded accent-gray size-4" />
            <label htmlFor="isFavorite" className="block text-sm text-gray w-max">
              Make as favorite
            </label>
          </div>

          <div className="flex items-center gap-2">
            <input name="isPreOrder" id="isPreOrder" type="checkbox" checked={formData.isPreOrder} onChange={handleChange} className="rounded accent-gray size-4" />
            <label htmlFor="isPreOrder" className="block text-sm text-gray w-max">
              Available for pre-order
            </label>
          </div>
        </div>

        <div className="flex justify-end space-x-4">
          <Button type="button" onClick={() => router.push("/admin/dashboard/products")} className="btn-outline">
            Cancel
          </Button>
          <Button type="submit" disabled={isPending} className={`btn-blue ${isPending && "animate-pulse"}`}>
            {isPending ? "Saving..." : "Save Product"}
          </Button>
        </div>
      </form>
    </div>
  );
};
