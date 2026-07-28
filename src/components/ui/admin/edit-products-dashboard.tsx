"use client";

import * as React from "react";

import Link from "next/link";

import { useRouter } from "next/navigation";

import { useQueryClient } from "@tanstack/react-query";

import toast from "react-hot-toast";

import { FaArrowLeft } from "react-icons/fa";

import { ErrorState, LoadingState, Panel, InputForm, Helper } from "./slicing";

import { useAuthStore } from "@/hooks";

import { filesApi, productsApi } from "@/utils";

import { EditProduct, Categories, Product, ApiResponse } from "@/types";

export const EditProductDashboard = ({ id }: { id: string }) => {
  const queryClient = useQueryClient();

  const router = useRouter();

  const { isAuthenticated } = useAuthStore();

  const imagesInputRef = React.useRef<HTMLInputElement | null>(null);

  const [formData, setFormData] = React.useState<EditProduct>({
    name: "",
    description: "",
    notes: "",
    sizes: [],
    price: 0,
    discount: 0,
    category: Categories.MY_LINDWAY,
    sku: "",
    images: [],
    isPreOrder: false,
    isFavorite: false,
    isActive: true,
    productionNotes: "",
  });

  const [helper, setHelper] = React.useState<Helper>({
    sizeInput: "",
    isUploading: false,
    uploadProgress: 0,
    deletingProgress: 0,
    isDeleting: false,
  });

  const {
    data: product,
    isLoading,
    error,
  } = productsApi.useGetProduct<ApiResponse<Product>>({
    key: ["product", id],
    id,
    enabled: !!id && isAuthenticated,
  });

  const updateProduct = productsApi.useUpdateProduct({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product", id] });
      router.push("/admin/dashboard/products");
    },
  });

  // Hydrate the form once the product arrives. Adjusting state during render (rather than in an
  // effect) means the form never paints a frame with the empty defaults.
  const [hydratedId, setHydratedId] = React.useState<string | null>(null);

  if (product && hydratedId !== product.data.id) {
    setHydratedId(product.data.id);
    setFormData({
      name: product.data.name,
      description: product.data.description,
      notes: product.data.notes,
      sizes: product.data.sizes,
      price: Number(product.data.price),
      discount: Number(product.data.discount),
      category: product.data.category,
      sku: product.data.sku,
      images: product.data.images,
      isPreOrder: product.data.isPreOrder,
      isActive: product.data.isActive,
      isFavorite: product.data.isFavorite,
      productionNotes: product.data.productionNotes,
    });
  }

  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();

    updateProduct.mutate({ id, updatedItem: formData });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : type === "number" ? Number(value) : value,
    }));
  };

  const addSize = () => {
    if (helper.sizeInput.trim() && !formData.sizes?.find((s) => s.size === helper.sizeInput)) {
      setFormData((prev) => ({ ...prev, sizes: [...prev.sizes!, { quantity: 1, size: helper.sizeInput }] }));
      setHelper((prevValue) => ({ ...prevValue, sizeInput: "" }));
    }
  };

  const removeSize = (index: number) => {
    setFormData((prev) => ({ ...prev, sizes: prev.sizes?.filter((_, i) => index !== i) }));
  };

  const handleQuantityChange = (index: number, quantity: number) => {
    setFormData((prev) => ({
      ...prev,
      sizes: prev.sizes?.map((item, i) => (i === index ? { ...item, quantity } : item)),
    }));
  };

  const incrementQuantity = (index: number) => {
    setFormData((prev) => ({ ...prev, sizes: prev.sizes?.map((item, i) => (i === index ? { ...item, quantity: item.quantity + 1 } : item)) }));
  };

  const decrementQuantity = (index: number) => {
    setFormData((prev) => ({ ...prev, sizes: prev.sizes?.map((item, i) => (i === index ? { ...item, quantity: item.quantity - 1 } : item)) }));
  };

  const handleImagesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];

    if (!files.length) return;

    try {
      setHelper((prev) => ({ ...prev, isUploading: true, uploadProgress: 0 }));

      const respImages = await filesApi.uploadImages(files, (progress: number) => {
        setHelper((prev) => ({ ...prev, uploadProgress: progress }));
      });

      setFormData((prev) => ({ ...prev, images: [...(prev.images || []), ...respImages] }));
    } catch (error) {
      toast.error((error as string) || "Failed to upload images");
    } finally {
      setHelper((prev) => ({ ...prev, isUploading: false, uploadProgress: 0 }));
      if (imagesInputRef.current) imagesInputRef.current.value = "";
    }
  };

  const handleDeleteImages = (subPath: string) => {
    try {
      setHelper((prev) => ({ ...prev, isDeleting: true, deletingProgress: 0 }));

      setFormData((prev) => ({ ...prev, images: prev.images?.filter((image) => image.path !== subPath) }));
    } catch (error) {
      toast.error((error as string) || "Failed to delete image");
    } finally {
      setHelper((prev) => ({ ...prev, isDeleting: false, deletingProgress: 0 }));
      if (imagesInputRef.current) imagesInputRef.current.value = "";
    }
  };

  if (isLoading) {
    return (
      <Panel>
        <LoadingState message="Loading product..." />
      </Panel>
    );
  }

  if (error) {
    return (
      <Panel>
        <ErrorState message="We couldn't load this product. Please check your connection and try again." />
      </Panel>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <Link href="/admin/dashboard/products" className="inline-flex items-center gap-2 mb-3 text-sm font-medium duration-300 text-gray hover:text-dark">
          <FaArrowLeft className="size-3" />
          Back to products
        </Link>
        <h2 className="text-2xl font-bold text-darker-gray">Edit Product</h2>
        <p className="text-sm text-gray/70">Update the details of {product?.data.name ?? "this product"}.</p>
      </div>

      <InputForm
        imagesInputRef={imagesInputRef}
        addSize={addSize}
        formData={formData}
        handleChange={handleChange}
        handleDeleteImages={handleDeleteImages}
        handleImagesChange={handleImagesChange}
        handleSubmit={handleSubmit}
        isPending={updateProduct.isPending}
        removeSize={removeSize}
        setHelper={setHelper}
        helper={helper}
        incrementQuantity={incrementQuantity}
        decrementQuantity={decrementQuantity}
        handleQuantityChange={handleQuantityChange}
      />
    </div>
  );
};
