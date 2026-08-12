"use client";

import { PiTShirt } from "react-icons/pi";

import { Img } from "@/components";

import type { ViewMode } from "@/hooks";

import { audienceByKey, brandByKey, clothingByKey } from "@/static/taxonomy";

import { formatIDR } from "@/utils";

import { Product } from "@/types";

import { Badge, Chip, EmptyState, ErrorState, LoadingState, Panel, RowAction, RowActionLink, TableShell, Td, Th } from "./ui";

interface ProductsListsProps {
  products: Product[];
  view: ViewMode;
  isLoading: boolean;
  isError: boolean;
  hasFilters: boolean;
  onDelete: (product: Product) => void;
}

const editHref = (product: Product) => `/admin/dashboard/products/${product.id}/edit`;

/**
 * Marks under the title. Since D26 the name is untranslated, so EN/ID here means
 * "has rich content in that locale" — a muted chip is missing content, not a
 * missing name.
 */
const TranslationChips = ({ product }: { product: Product }) => {
  const locales = new Set((product.translations ?? []).map((translation) => translation.locale));

  return (
    <span className="flex flex-wrap items-center gap-2">
      <Chip muted={!locales.has("EN")}>EN</Chip>
      <Chip muted={!locales.has("ID")}>ID</Chip>
      {product.isFavorite && <Chip>Featured</Chip>}
      {product.isPreOrder && <Chip>Pre-order</Chip>}
    </span>
  );
};

const Taxonomy = ({ product }: { product: Product }) => {
  const parts = [brandByKey(product.brand)?.label ?? product.brand, product.clothing ? (clothingByKey(product.clothing)?.label ?? product.clothing) : null, ...product.audiences.map((key) => audienceByKey(key)?.label ?? key)];

  return <span className="text-sm text-body/60">{parts.filter(Boolean).join(" · ")}</span>;
};

const StockBadge = ({ stock }: { stock: number }) =>
  stock === 0 ? <Badge className="bg-red-700/12 text-red-700">Out of stock</Badge> : stock <= 5 ? <Badge className="bg-amber-500/15 text-amber-700">{stock} left</Badge> : <span className="text-sm text-body/60 tabular-nums">{stock} in stock</span>;

export const ProductsLists = ({ products, view, isLoading, isError, hasFilters, onDelete }: ProductsListsProps) => {
  if (isLoading) return <LoadingState message="Loading products" />;
  if (isError) return <ErrorState message="We couldn't load the catalog. Please check your connection and try again." />;

  if (products.length === 0) {
    return (
      <EmptyState
        icon={<PiTShirt className="size-6" />}
        title={hasFilters ? "No products match your filters" : "No products yet"}
        description={hasFilters ? "Try a different keyword, or clear the filters to see the whole catalog." : "Add your first product to start building the catalog."}
      />
    );
  }

  if (view === "grid") {
    return (
      <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">
        {products.map((product) => (
          <article key={product.id} className="flex flex-col">
            <div className="relative overflow-hidden border rounded-sm border-border bg-muted">
              {product.images?.[0] ? (
                <Img src={product.images[0].url} alt={product.images[0].alt || product.name} className="w-full aspect-4/5" cover />
              ) : (
                <div className="grid w-full aspect-4/5 place-items-center text-body/25">
                  <PiTShirt className="size-8" />
                </div>
              )}

              <span className="absolute top-3 left-3">
                <Badge className={product.isActive ? "bg-body/85 text-light" : "bg-red-700/90 text-light"}>{product.isActive ? "Active" : "Inactive"}</Badge>
              </span>
            </div>

            <h3 className="mt-3 text-lg font-normal font-heading text-body">{product.name}</h3>
            <div className="mt-1">
              <TranslationChips product={product} />
            </div>
            <div className="mt-1">
              <Taxonomy product={product} />
            </div>

            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-sm text-body tabular-nums">{formatIDR(product.discountedPrice)}</span>
              {product.discount > 0 && <span className="text-xs line-through text-body/40 tabular-nums">{formatIDR(product.price)}</span>}
            </div>

            <div className="mt-1">
              <StockBadge stock={product.stock} />
            </div>

            <div className="flex items-center justify-end gap-4 pt-3 mt-auto border-t border-border">
              <RowActionLink href={editHref(product)}>Edit</RowActionLink>
              <RowAction tone="danger" onClick={() => onDelete(product)}>
                Delete
              </RowAction>
            </div>
          </article>
        ))}
      </div>
    );
  }

  return (
    <Panel className="overflow-hidden">
      <TableShell>
        <thead className="border-b bg-muted/60 border-border">
          <tr>
            <Th>Product</Th>
            <Th>Taxonomy</Th>
            <Th className="text-right">Price</Th>
            <Th className="text-right">Stock</Th>
            <Th className="text-right">Sold</Th>
            <Th>Status</Th>
            <Th className="text-right">Actions</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/70">
          {products.map((product) => (
            <tr key={product.id} className="duration-200 hover:bg-muted/40">
              <Td>
                <span className="flex items-center gap-3">
                  {product.images?.[0] ? (
                    <Img src={product.images[0].url} alt={product.images[0].alt || product.sku} className="rounded-sm size-11 shrink-0" cover />
                  ) : (
                    <span className="grid rounded-sm size-11 shrink-0 place-items-center bg-muted text-body/25">
                      <PiTShirt className="size-4" />
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className="block truncate text-body">{product.name}</span>
                    <span className="block font-mono text-xs text-body/45">{product.sku}</span>
                  </span>
                </span>
              </Td>
              <Td>
                <Taxonomy product={product} />
                <span className="block mt-1">
                  <TranslationChips product={product} />
                </span>
              </Td>
              <Td className="text-right whitespace-nowrap">
                <span className="block text-body tabular-nums">{formatIDR(product.discountedPrice)}</span>
                {product.discount > 0 && <span className="block text-xs line-through text-body/40 tabular-nums">{formatIDR(product.price)}</span>}
              </Td>
              <Td className="text-right whitespace-nowrap">
                <StockBadge stock={product.stock} />
              </Td>
              <Td className="text-right tabular-nums">{product.soldCount}</Td>
              <Td>
                <Badge className={product.isActive ? "bg-primary/12 text-primary" : "bg-body/6 text-body/50"}>{product.isActive ? "Active" : "Inactive"}</Badge>
              </Td>
              <Td className="text-right whitespace-nowrap">
                <div className="flex justify-end gap-4">
                  <RowActionLink href={editHref(product)}>Edit</RowActionLink>
                  <RowAction tone="danger" onClick={() => onDelete(product)}>
                    Delete
                  </RowAction>
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </TableShell>
    </Panel>
  );
};
