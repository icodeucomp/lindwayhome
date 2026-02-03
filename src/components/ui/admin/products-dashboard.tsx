"use client";

import * as React from "react";

import { useRouter } from "next/navigation";

import { useQueryClient } from "@tanstack/react-query";

import { useAuthStore, useSearchPagination } from "@/hooks";

import { Button, ImageSlider, Pagination } from "@/components";

import { IoIosStarOutline, IoIosStar } from "react-icons/io";
import { FaCheckCircle, FaSearch, FaTimesCircle } from "react-icons/fa";

import { formatUnderscoreToSpace, formatIDR, productsApi } from "@/utils";

import { ApiResponse, Categories, Product } from "@/types";

import { categoryColors, categoryLabels } from "@/static/categories";

interface ProductsCardProps {
  products: Product[];
  handleDelete: (id: string) => void;
  isPending: boolean;
  isLoading: boolean;
  isError: boolean;
}

const ProductsCard = ({ products, handleDelete, isPending, isLoading, isError }: ProductsCardProps) => {
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="loader"></div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="py-12 text-center">
        <svg className="w-12 h-12 mx-auto text-darker-gray" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray">No products</h3>
        <p className="mt-1 text-sm text-gray">Get started by creating a new product.</p>
        <div className="mt-6">
          <Button onClick={() => router.push("/admin/dashboard/products/create")} className="font-medium bg-blue-600 rounded-lg text-light hover:bg-blue-700">
            Add New Product
          </Button>
        </div>
      </div>
    );
  }

  if (isError) {
    return <div className="px-4 py-3 text-red-700 border border-red-200 rounded-lg bg-red-50">Error loading products. Please try again.</div>;
  }

  return (
    <div className="grid grid-cols-1 gap-6 mb-6 md:grid-cols-2 lg:grid-cols-3">
      {products.map((product) => {
        return (
          <div key={product.id} className="relative w-full mx-auto overflow-hidden rounded-lg shadow bg-light max-w-96">
            <ImageSlider images={product.images.map((image) => image.url)} alt={product.name} showProgressBar={false} showCounter={false} autoPlay={false}>
              <div className="absolute left-0 flex items-center justify-between w-full p-2 top-2">
                <div className="flex items-center gap-2">
                  {product.category && <div className={`px-2 py-1.5 text-xs rounded-full ${categoryColors[product.category]}`}>{categoryLabels[product.category]}</div>}
                  {product.isPreOrder && <div className="px-2 py-1.5 text-xs text-light rounded-full bg-gray">Pre Order</div>}
                </div>
                <div className="flex items-center gap-2">
                  <div>{product.isFavorite ? <IoIosStar size={28} className="text-yellow-500" /> : <IoIosStarOutline size={28} />}</div>
                  <div>{product.isActive ? <FaCheckCircle className="text-green-500" size={22} /> : <FaTimesCircle className="text-red-500" size={22} />}</div>
                </div>
              </div>
            </ImageSlider>
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-semibold truncate text-gray">{product.name}</h3>
              </div>

              <p className="text-sm text-justify text-gray line-clamp-4">{product.description}</p>

              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <p className="text-lg font-bold text-dark">{formatIDR(product.discountedPrice)}</p>
                  {product.discount > 0 && <p className="text-sm text-green-600">-{product.discount}%</p>}
                </div>
                <p className="text-sm text-gray whitespace-nowrap">Stock: {product.stock || 0}</p>
              </div>

              <div className="flex gap-2">
                <Button onClick={() => router.push(`/admin/dashboard/products/${product.id}/edit`)} className="flex-1 btn-blue disabled:opacity-50">
                  Edit
                </Button>
                <Button onClick={() => handleDelete(product.id)} disabled={isPending} className={`flex-1 btn-red disabled:opacity-50 ${isPending && "animate-pulse"}`}>
                  {isPending ? "Deleting..." : "Delete"}
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const DashboardProducts = () => {
  const queryClient = useQueryClient();

  const router = useRouter();

  const { isAuthenticated } = useAuthStore();

  const { searchQuery, inputValue, setInputValue, handleSearch, currentPage, handlePageChange, handleCategoryChange, selectedCategory } = useSearchPagination();

  const {
    data: products,
    isLoading,
    isError,
  } = productsApi.useGetProducts<ApiResponse<Product[]>>({
    key: ["products", searchQuery, selectedCategory, currentPage],
    enabled: isAuthenticated,
    params: { search: searchQuery, limit: 9, category: selectedCategory, page: currentPage, order: "desc" },
  });

  const deleteProduct = productsApi.useDeleteProduct({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this product?")) {
      deleteProduct.mutate(id);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between px-6 py-4 mb-6 border rounded-lg bg-light border-gray/30">
        <div className="space-y-1 text-gray">
          <h1 className="heading">Products Management</h1>
          <p>Manage product listings, including creating, editing, and removing items from your inventory.</p>
        </div>
        <Button onClick={() => router.push("/admin/dashboard/products/create")} className="btn-blue">
          Add New Product
        </Button>
      </div>

      <div className="p-4 mb-6 rounded-lg shadow bg-light">
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search products..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch();
              }}
              className="w-full px-3 py-2 border rounded-lg border-gray/30 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button onClick={handleSearch} className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors">
              <FaSearch className="w-5 h-5" />
              Search
            </button>

            <select
              value={selectedCategory}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="px-3 py-2 border rounded-lg border-gray/30 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Categories</option>
              {Object.values(Categories).map((category) => (
                <option key={category} value={category}>
                  {formatUnderscoreToSpace(category)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <ProductsCard handleDelete={handleDelete} isLoading={isLoading} isPending={deleteProduct.isPending} products={products?.data || []} isError={isError} />

      <Pagination page={currentPage} setPage={handlePageChange} totalPage={products?.pagination.totalPages || 0} isNumber />
    </>
  );
};
