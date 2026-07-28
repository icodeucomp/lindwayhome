"use client";

import * as React from "react";

import { useRouter } from "next/navigation";

import { Button, CircularProgress, Img, NumberInput, ProgressBar } from "@/components";

import { FaImage, FaMinus, FaPlus, FaTimes } from "react-icons/fa";

import { Checkbox, Field, FormSection, Panel, Spinner } from "./ui";

import { calculateDiscountedPrice, formatIDR, formatUnderscoreToSpace } from "@/utils";

import { Categories, CreateProduct, EditProduct } from "@/types";

interface InputFormProps {
  formData: CreateProduct | EditProduct;
  helper: Helper;
  isPending: boolean;
  imagesInputRef: React.RefObject<HTMLInputElement | null>;
  setHelper: React.Dispatch<React.SetStateAction<Helper>>;
  handleSubmit: (E: React.SubmitEvent<HTMLFormElement>) => void;
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

  const totalStock = formData.sizes?.reduce((sum, item) => sum + (item.quantity || 0), 0) ?? 0;
  const discountedPrice = formData.price && formData.discount ? calculateDiscountedPrice(formData.price, formData.discount) : formData.price || 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Panel className="p-5 space-y-8 sm:p-6">
        <FormSection title="Basic Information" description="How this product is identified across the store.">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Product Name" htmlFor="name" required>
              <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} className="input-form" placeholder="Enter product name" />
            </Field>

            <Field label="SKU" htmlFor="sku" required hint="Unique stock keeping unit code.">
              <input type="text" id="sku" name="sku" value={formData.sku} onChange={handleChange} className="input-form" placeholder="Enter SKU" />
            </Field>
          </div>

          <Field label="Category" htmlFor="category" required>
            <select name="category" id="category" value={formData.category} onChange={handleChange} className="cursor-pointer input-form">
              {Object.values(Categories).map((category) => (
                <option key={category} value={category}>
                  {formatUnderscoreToSpace(category)}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Description" htmlFor="description" required>
            <textarea id="description" name="description" rows={4} value={formData.description} onChange={handleChange} className="input-form" placeholder="Enter product description" />
          </Field>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Notes" htmlFor="notes" required hint="Shown to customers on the product page.">
              <textarea id="notes" name="notes" rows={3} value={formData.notes} onChange={handleChange} className="input-form" placeholder="Additional notes" />
            </Field>

            <Field label="Production Days" htmlFor="productionNotes" hint="Leave empty if the item ships immediately.">
              <input type="text" id="productionNotes" name="productionNotes" value={formData.productionNotes} onChange={handleChange} className="input-form" placeholder="e.g. 7-14 working days" />
            </Field>
          </div>
        </FormSection>

        <FormSection title="Pricing" description="Discounted price is calculated automatically.">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Field label="Price (IDR)" htmlFor="price" required>
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
            </Field>

            <Field label="Discount (%)" htmlFor="discount">
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
            </Field>

            <Field label="Final Price" hint="Read-only preview.">
              <div className="flex items-center h-10.5 px-3 font-semibold border rounded-lg border-gray/20 bg-gray/5 text-darker-gray">{formatIDR(discountedPrice)}</div>
            </Field>
          </div>
        </FormSection>

        <FormSection title="Sizes & Stock" description={`Total stock across all sizes: ${totalStock}`}>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              id="sizes"
              value={helper.sizeInput}
              onChange={(e) => setHelper((prevValue) => ({ ...prevValue, sizeInput: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addSize();
                }
              }}
              className="flex-1 input-form"
              placeholder="Enter size (e.g., S, M, L, XL)"
            />
            <Button type="button" onClick={addSize} disabled={!helper.sizeInput.trim()} className="flex items-center justify-center gap-2 btn-blue sm:w-auto">
              <FaPlus className="size-3.5" />
              Add Size
            </Button>
          </div>

          {formData.sizes && formData.sizes.length > 0 ? (
            <div className="grid grid-cols-1 gap-2 xl:grid-cols-2">
              {formData.sizes.map((item, index) => (
                <div key={index} className="flex items-center gap-3 px-3 py-2 border rounded-lg border-gray/20 bg-gray/5">
                  <span className="flex items-center justify-center text-xs font-bold uppercase rounded-lg shrink-0 size-9 bg-gray text-light">{item.size}</span>

                  <span className="text-sm text-gray/70 shrink-0">Qty</span>

                  <div className="flex items-center flex-1 gap-1.5">
                    <button
                      type="button"
                      onClick={() => decrementQuantity(index)}
                      aria-label={`Decrease quantity for size ${item.size}`}
                      className="flex items-center justify-center duration-300 rounded-lg cursor-pointer shrink-0 size-7 bg-gray hover:bg-darker-gray text-light disabled:opacity-40"
                      disabled={item.quantity <= 0}
                    >
                      <FaMinus size={10} />
                    </button>
                    <NumberInput
                      value={item.quantity === 0 ? "" : item.quantity}
                      onChange={(e) => handleQuantityChange(index, parseInt(e.target.value) || 0)}
                      aria-label={`Quantity for size ${item.size}`}
                      className="w-16 px-1 py-1 text-sm text-center input-form"
                      placeholder="0"
                    />
                    <button
                      type="button"
                      onClick={() => incrementQuantity(index)}
                      aria-label={`Increase quantity for size ${item.size}`}
                      className="flex items-center justify-center duration-300 rounded-lg cursor-pointer shrink-0 size-7 bg-gray hover:bg-darker-gray text-light"
                    >
                      <FaPlus size={10} />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeSize(index)}
                    aria-label={`Remove size ${item.size}`}
                    className="p-2 text-red-500 duration-300 rounded-lg cursor-pointer shrink-0 hover:text-red-700 hover:bg-red-50"
                  >
                    <FaTimes className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="px-4 py-6 text-sm text-center border border-dashed rounded-lg text-gray/60 border-gray/25">No sizes added yet. Add at least one size so customers can order this product.</p>
          )}
        </FormSection>

        <FormSection title="Images" description="The first image is used as the product thumbnail. Max 5MB each, 1:1 aspect ratio.">
          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <input type="file" id="images" ref={imagesInputRef} onChange={handleImagesChange} hidden accept="image/*" multiple />
            <label htmlFor="images" className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold duration-300 rounded-lg cursor-pointer bg-blue-600 text-light hover:bg-blue-700">
              <FaImage className="size-4" />
              Choose Images
            </label>
            <span className="text-sm text-gray/70">{formData.images?.length ?? 0} image(s) selected</span>
          </div>

          {helper.isUploading && <ProgressBar uploadProgress={helper.uploadProgress} />}

          {formData.images && formData.images.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {formData.images.map((image, index) => (
                <div key={index} className="relative group">
                  <button
                    onClick={() => handleDeleteImages(image.path)}
                    type="button"
                    aria-label={`Remove image ${index + 1}`}
                    className="absolute z-1 flex items-center justify-center duration-300 rounded-full shadow-md cursor-pointer -top-2 -right-2 size-6 bg-secondary text-light hover:bg-red-700"
                  >
                    <FaTimes className="size-3" />
                  </button>

                  <div className="relative overflow-hidden border rounded-lg border-gray/15">
                    <Img src={image.url} alt={`Selected image ${index + 1}`} className="w-full aspect-square" cover />
                    {index === 0 && <span className="absolute px-2 py-0.5 text-xxs font-bold rounded-full bottom-2 left-2 bg-dark/70 text-light">Thumbnail</span>}
                    {helper.isDeleting && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-dark/60">
                        <CircularProgress progress={helper.deletingProgress} />
                        <span className="text-sm font-medium text-light">Deleting...</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="px-4 py-6 text-sm text-center border border-dashed rounded-lg text-gray/60 border-gray/25">No images uploaded yet.</p>
          )}
        </FormSection>

        <FormSection title="Visibility" description="Control where and how this product appears.">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Checkbox id="isActive" name="isActive" label="Active product" description="Visible in the storefront" checked={formData.isActive} onChange={handleChange} />
            <Checkbox id="isFavorite" name="isFavorite" label="Mark as favorite" description="Highlighted in featured lists" checked={formData.isFavorite} onChange={handleChange} />
            <Checkbox id="isPreOrder" name="isPreOrder" label="Available for pre-order" description="Orderable before stock arrives" checked={formData.isPreOrder} onChange={handleChange} />
          </div>
        </FormSection>
      </Panel>

      {/* Sticky action bar */}
      <div className="sticky bottom-0 flex flex-col-reverse gap-3 px-4 py-3 border shadow-lg rounded-lg sm:flex-row sm:justify-end border-gray/15 bg-light">
        <Button type="button" onClick={() => router.push("/admin/dashboard/products")} disabled={isPending} className="btn-outline">
          Cancel
        </Button>
        <Button type="submit" disabled={isPending || helper.isUploading} className="flex items-center justify-center gap-2 btn-blue">
          {isPending && <Spinner />}
          {isPending ? "Saving..." : "Save Product"}
        </Button>
      </div>
    </form>
  );
};
