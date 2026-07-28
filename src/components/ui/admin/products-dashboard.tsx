"use client";

import * as React from "react";

import { useRouter } from "next/navigation";

import { useQueryClient } from "@tanstack/react-query";

import { useAuthStore, useSearchPagination } from "@/hooks";

import { Button, ImageSlider, Pagination } from "@/components";

import { IoIosStarOutline, IoIosStar } from "react-icons/io";
import { FaBoxOpen, FaCheckCircle, FaPlus, FaSearch, FaTimesCircle, FaTrash } from "react-icons/fa";

import { ConfirmDialog, EmptyState, ErrorState, LoadingState, Panel, SearchInput, Spinner, Toolbar } from "./slicing";

import { formatUnderscoreToSpace, formatIDR, productsApi } from "@/utils";

import { ApiResponse, Categories, Product } from "@/types";

import { categoryColors, categoryLabels } from "@/static/categories";

interface ProductsCardProps {
  products: Product[];
  deletingId: string | null;
  isLoading: boolean;
  isError: boolean;
  hasFilters: boolean;
  onDelete: (product: Product) => void;
}

const ProductsGrid = ({ products, deletingId, isLoading, isError, hasFilters, onDelete }: ProductsCardProps) => {
  const router = useRouter();

  if (isLoading) {
    return (
      <Panel>
        <LoadingState message="Loading products..." />
      </Panel>
    );
  }

  if (isError) {
    return (
      <Panel>
        <ErrorState message="We couldn't load your products. Please check your connection and try again." />
      </Panel>
    );
  }

  if (products.length === 0) {
    return (
      <Panel>
        <EmptyState
          icon={<FaBoxOpen className="size-6" />}
          title={hasFilters ? "No products match your filters" : "No products yet"}
          description={hasFilters ? "Try a different keyword or clear the category filter to see everything." : "Get started by adding your first product to the catalog."}
          action={
            !hasFilters && (
              <Button onClick={() => router.push("/admin/dashboard/products/create")} className="flex items-center gap-2 btn-blue">
                <FaPlus className="size-3.5" />
                Add New Product
              </Button>
            )
          }
        />
      </Panel>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 mb-6 sm:grid-cols-2 xl:grid-cols-3">
      {products.map((product) => {
        const isDeleting = deletingId === product.id;

        return (
          <Panel key={product.id} className="flex flex-col overflow-hidden duration-300 hover:shadow-md">
            <ImageSlider images={product.images.map((image) => image.url)} alt={product.name} showProgressBar={false} showCounter={false} autoPlay={false}>
              <div className="absolute left-0 flex items-start justify-between w-full gap-2 p-3 top-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  {product.category && <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${categoryColors[product.category]}`}>{categoryLabels[product.category]}</span>}
                  {product.isPreOrder && <span className="px-2.5 py-1 text-xs font-semibold rounded-full text-light bg-gray">Pre Order</span>}
                </div>
                <div className="flex items-center gap-1.5">
                  <span title={product.isFavorite ? "Favorite" : "Not favorite"} className="flex items-center justify-center rounded-full size-7 bg-light/90">
                    {product.isFavorite ? <IoIosStar className="text-yellow-500 size-5" /> : <IoIosStarOutline className="text-gray size-5" />}
                  </span>
                  <span title={product.isActive ? "Active" : "Inactive"} className="flex items-center justify-center rounded-full size-7 bg-light/90">
                    {product.isActive ? <FaCheckCircle className="text-green-500 size-4" /> : <FaTimesCircle className="text-red-500 size-4" />}
                  </span>
                </div>
              </div>
            </ImageSlider>

            <div className="flex flex-col flex-1 gap-3 p-4">
              <div className="space-y-1">
                <h3 className="text-lg font-semibold truncate text-darker-gray" title={product.name}>
                  {product.name}
                </h3>
                <p className="font-mono text-xs text-gray/60">{product.sku}</p>
              </div>

              <p className="flex-1 text-sm text-gray line-clamp-3">{product.description}</p>

              <div className="flex items-end justify-between gap-3 pt-1">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-bold text-dark">{formatIDR(product.discountedPrice)}</p>
                    {product.discount > 0 && <span className="px-1.5 py-0.5 text-xs font-semibold text-green-700 rounded bg-green-50">-{product.discount}%</span>}
                  </div>
                  {product.discount > 0 && <p className="text-xs line-through text-gray/50">{formatIDR(product.price)}</p>}
                </div>
                <span className={`px-2.5 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${product.stock > 0 ? "bg-gray/10 text-gray" : "bg-red-50 text-red-600"}`}>
                  Stock: {product.stock || 0}
                </span>
              </div>

              <div className="flex gap-2 pt-1 mt-auto">
                <Button onClick={() => router.push(`/admin/dashboard/products/${product.id}/edit`)} className="flex-1 btn-blue">
                  Edit
                </Button>
                <Button onClick={() => onDelete(product)} disabled={isDeleting} className="flex items-center justify-center flex-1 gap-2 btn-red">
                  {isDeleting ? <Spinner /> : <FaTrash className="size-3.5" />}
                  {isDeleting ? "Deleting..." : "Delete"}
                </Button>
              </div>
            </div>
          </Panel>
        );
      })}
    </div>
  );
};

export const DashboardProducts = () => {
  const queryClient = useQueryClient();

  const router = useRouter();

  const { isAuthenticated } = useAuthStore();

  const { searchQuery, inputValue, setInputValue, handleSearch, handleClearSearch, currentPage, handlePageChange, handleCategoryChange, selectedCategory } = useSearchPagination();

  const [productToDelete, setProductToDelete] = React.useState<Product | null>(null);

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
      queryClient.invalidateQueries({ queryKey: ["dashboards"] });
      setProductToDelete(null);
    },
  });

  const categoryOptions = [{ value: "", label: "All Categories" }, ...Object.values(Categories).map((category) => ({ value: category, label: formatUnderscoreToSpace(category) }))];

  const totalProducts = products?.pagination.total ?? 0;
  const hasFilters = !!searchQuery || !!selectedCategory;

  return (
    <>
      <Toolbar>
        <SearchInput value={inputValue} onChange={setInputValue} onSearch={handleSearch} onClear={handleClearSearch} placeholder="Search by product name or SKU..." />

        <div className="flex flex-col gap-2 sm:flex-row lg:shrink-0">
          <Button onClick={handleSearch} className="flex items-center justify-center gap-2 btn-gray">
            <FaSearch className="size-4" />
            Search
          </Button>

          <select value={selectedCategory} onChange={(e) => handleCategoryChange(e.target.value)} aria-label="Filter by category" className="cursor-pointer input-form sm:w-auto">
            {categoryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <Button onClick={() => router.push("/admin/dashboard/products/create")} className="flex items-center justify-center gap-2 btn-blue whitespace-nowrap">
            <FaPlus className="size-3.5" />
            Add New Product
          </Button>
        </div>
      </Toolbar>

      {!isLoading && !isError && totalProducts > 0 && (
        <p className="mb-4 text-sm text-gray/70">
          Showing <span className="font-semibold text-darker-gray">{products?.data.length}</span> of <span className="font-semibold text-darker-gray">{totalProducts}</span> products
          {hasFilters && " matching your filters"}
        </p>
      )}

      <ProductsGrid products={products?.data || []} isLoading={isLoading} isError={isError} hasFilters={hasFilters} deletingId={deleteProduct.isPending ? productToDelete?.id ?? null : null} onDelete={setProductToDelete} />

      <Pagination page={currentPage} setPage={handlePageChange} totalPage={products?.pagination.totalPages || 0} isNumber />

      <ConfirmDialog
        isVisible={productToDelete !== null}
        title="Delete this product?"
        description={`"${productToDelete?.name}" will be permanently removed from your catalog. This action cannot be undone.`}
        confirmLabel="Delete Product"
        isPending={deleteProduct.isPending}
        onConfirm={() => productToDelete && deleteProduct.mutate(productToDelete.id)}
        onClose={() => setProductToDelete(null)}
      />
    </>
  );
};
