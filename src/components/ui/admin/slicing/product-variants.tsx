"use client";

import * as React from "react";

import { PiCaretDown, PiWarningCircle } from "react-icons/pi";

import { ApiResponse, ConfigGroup, ProductVariant, Size, SizeGuide } from "@/types";

import { configParametersApi, sizeGuidesApi, sizesApi } from "@/utils";

import { Field, SelectInput, TextInput } from "./form";
import { Badge } from "./ui";

export type PackageDimensions = NonNullable<ProductVariant["packageDimensions"]>;

export interface VariantDraft {
  sizeId: string;
  quantity: number;
  packageDimensions: PackageDimensions | null;
}

const DIMENSION_FIELDS = [
  { key: "weight_g", label: "Weight (g)" },
  { key: "length_cm", label: "Length (cm)" },
  { key: "width_cm", label: "Width (cm)" },
  { key: "height_cm", label: "Height (cm)" },
] as const;

const EMPTY_DIMENSIONS: PackageDimensions = { weight_g: 0, length_cm: 0, width_cm: 0, height_cm: 0 };

/* -------------------------------------------------------------------------- */
/*                                 Single row                                 */
/* -------------------------------------------------------------------------- */

const VariantRow = ({ size, variant, hasDefaultDimensions, onToggle, onQuantity, onDimensions }: {
  size: Size;
  variant: VariantDraft | undefined;
  hasDefaultDimensions: boolean;
  onToggle: (enabled: boolean) => void;
  onQuantity: (quantity: number) => void;
  onDimensions: (dimensions: PackageDimensions | null) => void;
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const isEnabled = Boolean(variant);
  const hasOverride = Boolean(variant?.packageDimensions);

  return (
    <div className="py-3 border-b border-border/70 last:border-b-0">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <label className="flex items-center gap-2.5 cursor-pointer min-w-32">
          <input type="checkbox" checked={isEnabled} onChange={(event) => onToggle(event.target.checked)} className="checkbox-form" />
          <span className={`font-mono text-sm ${isEnabled ? "text-body" : "text-body/40"}`}>{size.code}</span>
          <span className={`text-xs truncate ${isEnabled ? "text-body/50" : "text-body/30"}`}>{size.label}</span>
        </label>

        <div className="flex items-center gap-2">
          <span className="font-heading text-xxs font-semibold uppercase tracking-[0.14em] text-body/45">Qty</span>
          <TextInput
            type="number"
            min={0}
            value={variant?.quantity ?? ""}
            disabled={!isEnabled}
            onChange={(event) => onQuantity(Math.max(0, Number(event.target.value) || 0))}
            aria-label={`Quantity for size ${size.code}`}
            className="w-24 py-1.5"
          />
        </div>

        {isEnabled && (
          <button
            type="button"
            onClick={() => setIsOpen((open) => !open)}
            className="flex items-center gap-1.5 font-heading text-xxs font-semibold uppercase tracking-[0.14em] duration-200 cursor-pointer text-body/50 hover:text-primary"
          >
            {hasOverride ? "Custom packaging" : "Store default packaging"}
            <PiCaretDown className={`size-3 duration-200 ${isOpen ? "rotate-180" : ""}`} />
          </button>
        )}

        {isEnabled && !hasOverride && !hasDefaultDimensions && (
          <span className="flex items-center gap-1.5 text-xs text-amber-700">
            <PiWarningCircle className="size-3.5 shrink-0" />
            No package_dimensions entry for {size.code}
          </span>
        )}
      </div>

      {isEnabled && isOpen && (
        <div className="pl-8 mt-3">
          <label className="flex items-center gap-2.5 mb-3 cursor-pointer">
            <input type="checkbox" checked={hasOverride} onChange={(event) => onDimensions(event.target.checked ? { ...EMPTY_DIMENSIONS } : null)} className="checkbox-form" />
            <span className="text-sm text-body/70">Override the store default for this size</span>
          </label>

          {hasOverride ? (
            <div className="grid gap-3 sm:grid-cols-4">
              {DIMENSION_FIELDS.map((field) => (
                <label key={field.key} className="block">
                  <span className="block mb-1 admin-field-label">{field.label}</span>
                  <TextInput
                    type="number"
                    min={0}
                    value={variant?.packageDimensions?.[field.key] ?? 0}
                    onChange={(event) => onDimensions({ ...(variant?.packageDimensions ?? EMPTY_DIMENSIONS), [field.key]: Math.max(0, Number(event.target.value) || 0) })}
                    className="py-1.5"
                  />
                </label>
              ))}
            </div>
          ) : (
            <p className="text-xs text-body/50">
              {hasDefaultDimensions
                ? `Shipping uses the package_dimensions entry for ${size.code}. Override only when this product packs differently from others of the same size.`
                : `There is no package_dimensions entry for ${size.code}, so checkout will fail for it. Add one on the Parameters page, or set a custom size here.`}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                                   Editor                                   */
/* -------------------------------------------------------------------------- */

interface ProductVariantsProps {
  sizeGuideId: string | null;
  variants: VariantDraft[];
  onSizeGuideChange: (sizeGuideId: string | null, allowedSizeIds: string[] | null) => void;
  onVariantsChange: (variants: VariantDraft[]) => void;
  error?: string;
}

export const ProductVariants = ({ sizeGuideId, variants, onSizeGuideChange, onVariantsChange, error }: ProductVariantsProps) => {
  const { data: sizesData } = sizesApi.useGetSizes<ApiResponse<Size[]>>({ key: ["sizes", "active"], params: { isActive: true } });
  const { data: guidesData } = sizeGuidesApi.useGetSizeGuides<ApiResponse<SizeGuide[]>>({ key: ["size-guides", "EN"], params: { locale: "EN" } });
  const { data: configData } = configParametersApi.useGetConfigParameters<ApiResponse<ConfigGroup[]>>({ key: ["config-parameters"] });

  const allSizes = React.useMemo(() => sizesData?.data ?? [], [sizesData]);
  const guides = guidesData?.data ?? [];

  // Which size codes actually have a shipping package defined. A size without one
  // returns 404 at checkout for that size, and the buyer is the one who finds out.
  const dimensionKeys = React.useMemo(() => {
    const group = configData?.data.find((entry) => entry.name === "package_dimensions");
    return new Set((group?.configs ?? []).map((config) => config.key));
  }, [configData]);

  const selectedGuide = guides.find((guide) => guide.id === sizeGuideId);

  // With a guide, the offered sizes are exactly its rows — that is the §B4 invariant
  // "ProductVariant.sizeId is one of the sizes in the product's sizeGuide", enforced
  // by not offering anything else. Without a guide the invariant does not apply, so
  // the full master list is fair game.
  const offeredSizes: Size[] = React.useMemo(() => {
    if (!selectedGuide) return allSizes;

    return selectedGuide.rows
      .map((row) => row.size ?? allSizes.find((size) => size.id === row.sizeId))
      .filter((size): size is Size => Boolean(size))
      .sort((a, b) => a.order - b.order);
  }, [selectedGuide, allSizes]);

  const byId = new Map(variants.map((variant) => [variant.sizeId, variant]));
  const totalStock = variants.reduce((sum, variant) => sum + variant.quantity, 0);

  const updateVariant = (sizeId: string, patch: Partial<VariantDraft>) => onVariantsChange(variants.map((variant) => (variant.sizeId === sizeId ? { ...variant, ...patch } : variant)));

  const toggleSize = (sizeId: string, enabled: boolean) => {
    if (enabled) onVariantsChange([...variants, { sizeId, quantity: 0, packageDimensions: null }]);
    else onVariantsChange(variants.filter((variant) => variant.sizeId !== sizeId));
  };

  const handleGuideChange = (nextId: string) => {
    const guide = guides.find((entry) => entry.id === nextId);
    const allowed = guide ? guide.rows.map((row) => row.sizeId) : null;
    onSizeGuideChange(nextId || null, allowed);
  };

  return (
    <div className="space-y-6">
      <Field
        label="Size guide"
        htmlFor="sizeGuideId"
        hint={
          selectedGuide
            ? "Only the sizes in this guide can be stocked. Changing the guide drops any size the new one does not contain."
            : "Optional. Without a guide the product offers the full size list and no measurement table appears on its page."
        }
      >
        <SelectInput
          id="sizeGuideId"
          value={sizeGuideId ?? ""}
          onChange={(event) => handleGuideChange(event.target.value)}
          options={[
            { value: "", label: "No size guide" },
            ...guides.map((guide) => ({ value: guide.id, label: `${guide.title ?? "(untitled)"}${guide.publishedAt ? "" : " — draft"}` })),
          ]}
        />
      </Field>

      <div>
        <div className="flex items-baseline justify-between gap-3 mb-1">
          <span className="admin-field-label">
            Sizes & stock <span className="text-primary">*</span>
          </span>
          <span className="text-xs text-body/50">
            Total stock <span className="text-body tabular-nums">{totalStock}</span>
          </span>
        </div>

        {error && <p className="mb-2 text-xs text-red-700">{error}</p>}

        <p className="mb-3 text-xs text-body/50">
          Stock is per size. <span className="text-body/70">products.stock</span> is derived from these by a database trigger, so it is never entered directly (D24).
        </p>

        <div className="px-4 border rounded-sm border-border">
          {offeredSizes.length === 0 ? (
            <p className="py-6 text-sm text-center text-body/50">{selectedGuide ? "This size guide has no rows." : "No active sizes. Add some on the Sizes page first."}</p>
          ) : (
            offeredSizes.map((size) => (
              <VariantRow
                key={size.id}
                size={size}
                variant={byId.get(size.id)}
                hasDefaultDimensions={dimensionKeys.has(size.code)}
                onToggle={(enabled) => toggleSize(size.id, enabled)}
                onQuantity={(quantity) => updateVariant(size.id, { quantity })}
                onDimensions={(packageDimensions) => updateVariant(size.id, { packageDimensions })}
              />
            ))
          )}
        </div>

        {variants.length > 0 && totalStock === 0 && (
          <p className="flex items-center gap-1.5 mt-2 text-xs text-amber-700">
            <PiWarningCircle className="size-3.5 shrink-0" />
            Every selected size is at zero. The server rejects a product with no stock at all.
          </p>
        )}

        {selectedGuide && (
          <p className="mt-3 text-xs text-body/45">
            Measurements come from the guide itself — edit them on{" "}
            <Badge className="bg-body/6 text-body/60">Size Guides</Badge>, not here. This section is stock and packing only (D6).
          </p>
        )}
      </div>
    </div>
  );
};
