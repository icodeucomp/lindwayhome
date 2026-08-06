"use client";

import * as React from "react";

import { useRouter } from "next/navigation";

import { useQueryClient } from "@tanstack/react-query";

import { AUDIENCE, BRANDING, GARMENT } from "@/static/taxonomy";

import { calculateDiscountedPrice, formatIDR, productsApi } from "@/utils";

import { ApiResponse, AudienceType, BrandingType, CreateProduct, EditProduct, Files, GarmentType, Locale, Product } from "@/types";

import {
  CheckboxGroup,
  EMPTY_TRANSLATION,
  ErrorState,
  Field,
  FieldRow,
  FormActions,
  FormLayout,
  FormSection,
  LoadingState,
  PageHeader,
  ProductContent,
  ProductImages,
  ProductVariants,
  SelectInput,
  TextInput,
  Toggle,
  hasContent,
  type TranslationDraft,
  type VariantDraft,
} from "./slicing";

const LIST_HREF = "/admin/dashboard/products";

interface FormState {
  sku: string;
  slug: string;
  branding: BrandingType | "";
  garment: GarmentType | "";
  audiences: AudienceType[];
  price: string;
  discount: string;
  images: Files[];
  sizeGuideId: string | null;
  variants: VariantDraft[];
  translations: Record<Locale, TranslationDraft>;
  releasedAt: string;
  bestSellerRank: string;
  isPreOrder: boolean;
  isFavorite: boolean;
  isActive: boolean;
}

const EMPTY: FormState = {
  sku: "",
  slug: "",
  branding: "",
  garment: "",
  audiences: [],
  price: "",
  discount: "0",
  images: [],
  sizeGuideId: null,
  variants: [],
  translations: { EN: { ...EMPTY_TRANSLATION }, ID: { ...EMPTY_TRANSLATION } },
  releasedAt: "",
  bestSellerRank: "",
  isPreOrder: false,
  isFavorite: false,
  isActive: true,
};

/** Public URLs use a single non-localized slug (D4), so this runs off the EN name. */
const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip the accents NFD just split off
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

type FormErrors = Partial<Record<"sku" | "slug" | "branding" | "price" | "discount" | "images" | "variants" | "nameEN" | "nameID", string>>;

const validate = (form: FormState): FormErrors => {
  const errors: FormErrors = {};

  if (!form.sku.trim()) errors.sku = "SKU is required — it is also the image folder name";
  if (!form.slug.trim()) errors.slug = "Slug is required";
  if (!form.branding) errors.branding = "Branding is required (D5)";

  const price = Number(form.price);
  if (!form.price.trim()) errors.price = "Price is required";
  else if (Number.isNaN(price) || price <= 0) errors.price = "Price must be greater than zero";

  const discount = Number(form.discount || 0);
  if (Number.isNaN(discount) || discount < 0 || discount > 100) errors.discount = "Discount must be between 0 and 100";

  if (form.images.length === 0) errors.images = "At least one image is required";

  if (form.variants.length === 0) errors.variants = "Select at least one size";
  else if (form.variants.reduce((sum, variant) => sum + variant.quantity, 0) <= 0) errors.variants = "Total stock must be greater than zero";

  if (!form.translations.EN.name.trim()) errors.nameEN = "The English name is required — Product has no name column";

  // The API requires a name on every translation row it receives, so an Indonesian
  // row carrying only a description cannot be submitted. Copying the English name in
  // renders identically to the per-field fallback, so the ask is one keystroke.
  if (hasContent(form.translations.ID) && !form.translations.ID.name.trim()) errors.nameID = "Add an Indonesian name, or clear the other Indonesian fields";

  return errors;
};

export const ProductForm = ({ productId }: { productId?: string }) => {
  const router = useRouter();
  const queryClient = useQueryClient();

  const isEdit = Boolean(productId);

  const { data, isLoading, isError } = productsApi.useGetProduct<ApiResponse<Product>>({ key: ["product", productId], id: productId ?? "", enabled: isEdit });

  const [form, setForm] = React.useState<FormState>(EMPTY);
  const [errors, setErrors] = React.useState<FormErrors>({});
  const [activeLocale, setActiveLocale] = React.useState<Locale>("EN");
  const [isSlugTouched, setIsSlugTouched] = React.useState(false);
  const [loadedId, setLoadedId] = React.useState<string | null>(null);

  // Seeded during render the first time the record lands — an effect here would
  // re-run on every background refetch and discard whatever the admin had typed.
  const record = data?.data;
  if (record && loadedId !== record.id) {
    setLoadedId(record.id);
    setIsSlugTouched(true);

    const translations: Record<Locale, TranslationDraft> = { EN: { ...EMPTY_TRANSLATION }, ID: { ...EMPTY_TRANSLATION } };
    for (const row of record.translations ?? []) {
      translations[row.locale] = {
        name: row.name ?? "",
        description: row.description ?? null,
        notes: row.notes ?? null,
        fabricInformation: row.fabricInformation ?? null,
        shippingDelivery: row.shippingDelivery ?? null,
        returnPolicy: row.returnPolicy ?? null,
      };
    }

    setForm({
      sku: record.sku,
      slug: record.slug,
      branding: record.branding,
      garment: record.garment ?? "",
      audiences: record.audiences ?? [],
      price: String(record.price),
      discount: String(record.discount ?? 0),
      images: record.images ?? [],
      sizeGuideId: record.sizeGuideId,
      variants: (record.variants ?? []).map((variant) => ({ sizeId: variant.sizeId, quantity: variant.quantity, packageDimensions: variant.packageDimensions ?? null })),
      translations,
      releasedAt: record.releasedAt ? record.releasedAt.slice(0, 10) : "",
      bestSellerRank: record.bestSellerRank == null ? "" : String(record.bestSellerRank),
      isPreOrder: record.isPreOrder,
      isFavorite: record.isFavorite,
      isActive: record.isActive,
    });
  }

  const onSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["products"] });
    queryClient.invalidateQueries({ queryKey: ["dashboards"] });
    router.push(LIST_HREF);
  };

  const createProduct = productsApi.useCreateProducts({ onSuccess });
  const updateProduct = productsApi.useUpdateProduct({ onSuccess });

  const isPending = createProduct.isPending || updateProduct.isPending;

  const patch = (changes: Partial<FormState>) => setForm((previous) => ({ ...previous, ...changes }));

  const clearError = (key: keyof FormErrors) => setErrors((previous) => (previous[key] ? { ...previous, [key]: undefined } : previous));

  const setTranslation = (locale: Locale, changes: Partial<TranslationDraft>) => {
    setForm((previous) => {
      const next = { ...previous, translations: { ...previous.translations, [locale]: { ...previous.translations[locale], ...changes } } };
      // Creating a product derives the slug from the English name until the admin
      // edits it themselves; after that it is theirs and never moves under them.
      if (locale === "EN" && changes.name !== undefined && !isSlugTouched && !isEdit) next.slug = slugify(changes.name);
      return next;
    });
    if (locale === "EN") clearError("nameEN");
    else clearError("nameID");
  };

  const handleSizeGuideChange = (sizeGuideId: string | null, allowedSizeIds: string[] | null) => {
    setForm((previous) => ({
      ...previous,
      sizeGuideId,
      // Drop anything the new guide does not contain, or the product would carry
      // variants for sizes that never appear in its measurement table (§B4).
      variants: allowedSizeIds ? previous.variants.filter((variant) => allowedSizeIds.includes(variant.sizeId)) : previous.variants,
    }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const found = validate(form);
    setErrors(found);

    if (Object.keys(found).length > 0) {
      // Both name errors live behind the locale tabs, so jumping there is the only way
      // the admin sees why the save was refused.
      if (found.nameEN) setActiveLocale("EN");
      else if (found.nameID) setActiveLocale("ID");
      return;
    }

    const translations = (["EN", "ID"] as const)
      .filter((locale) => locale === "EN" || hasContent(form.translations[locale]))
      .map((locale) => ({ locale, ...form.translations[locale] }));

    // `discountedPrice`, `stock` and `soldCount` are absent on purpose: the server
    // derives the first, a trigger owns the second (D24), and the order transaction
    // owns the third.
    const payload: CreateProduct = {
      sku: form.sku.trim(),
      slug: form.slug.trim(),
      branding: form.branding as BrandingType,
      garment: form.garment || null,
      audiences: form.audiences,
      sizeGuideId: form.sizeGuideId,
      price: Number(form.price),
      discount: Number(form.discount || 0),
      images: form.images,
      releasedAt: form.releasedAt || null,
      bestSellerRank: form.bestSellerRank === "" ? null : Number(form.bestSellerRank),
      isPreOrder: form.isPreOrder,
      isFavorite: form.isFavorite,
      isActive: form.isActive,
      variants: form.variants.map((variant) => ({ sizeId: variant.sizeId, quantity: variant.quantity, packageDimensions: variant.packageDimensions })),
      translations,
    };

    if (isEdit && productId) updateProduct.mutate({ id: productId, updatedItem: payload as EditProduct });
    else createProduct.mutate(payload);
  };

  if (isEdit && isLoading) return <LoadingState message="Loading product" />;
  if (isEdit && isError) return <ErrorState message="We couldn't load this product." />;

  const price = Number(form.price) || 0;
  const discount = Number(form.discount) || 0;
  const sellingPrice = calculateDiscountedPrice(price, discount);

  return (
    <>
      <PageHeader
        back={{ href: LIST_HREF, label: "Products" }}
        title={isEdit ? form.translations.EN.name || "Edit product" : "New product"}
        description="English content is required; Indonesian can be added later."
      />

      <FormLayout onSubmit={handleSubmit}>
        <FormSection title="Details">
          <FieldRow>
            <Field label="SKU" htmlFor="sku" required error={errors.sku} hint="Also the image folder name">
              <TextInput
                id="sku"
                value={form.sku}
                onChange={(event) => {
                  patch({ sku: event.target.value.toUpperCase() });
                  clearError("sku");
                }}
                invalid={Boolean(errors.sku)}
                placeholder="MLW-DRS-001"
              />
            </Field>

            <Field label="Slug" htmlFor="slug" required error={errors.slug} hint="The public URL — one slug for both languages (D4)">
              <TextInput
                id="slug"
                value={form.slug}
                onChange={(event) => {
                  setIsSlugTouched(true);
                  patch({ slug: slugify(event.target.value) });
                  clearError("slug");
                }}
                invalid={Boolean(errors.slug)}
                placeholder="cotton-day-dress"
              />
            </Field>
          </FieldRow>

          <FieldRow>
            <Field label="Branding" htmlFor="branding" required error={errors.branding}>
              <SelectInput
                id="branding"
                value={form.branding}
                onChange={(event) => {
                  patch({ branding: event.target.value as BrandingType });
                  clearError("branding");
                }}
                invalid={Boolean(errors.branding)}
                placeholder="Select a branding"
                options={BRANDING.map((entry) => ({ value: entry.key, label: entry.isActive ? entry.label : `${entry.label} — hidden` }))}
              />
            </Field>

            <Field label="Garment" htmlFor="garment" hint="Optional — one garment type per product">
              <SelectInput
                id="garment"
                value={form.garment}
                onChange={(event) => patch({ garment: event.target.value as GarmentType })}
                options={[{ value: "", label: "No garment type" }, ...GARMENT.map((entry) => ({ value: entry.key, label: entry.label }))]}
              />
            </Field>
          </FieldRow>

          <Field label="Audience" hint="A product can belong to several — that is how unisex pieces are modelled (D5)">
            {/* taxonomy.ts types its keys off the Prisma enum ($Enums.AudienceType, a
                union of string literals) while the client contract uses a TS enum of
                the same members — structurally identical, nominally distinct. */}
            <CheckboxGroup
              name="audiences"
              value={form.audiences}
              onChange={(audiences) => patch({ audiences })}
              options={AUDIENCE.map((entry) => ({ value: entry.key as AudienceType, label: entry.label }))}
            />
          </Field>
        </FormSection>

        <FormSection title="Pricing">
          <FieldRow>
            <Field label="Price (IDR)" htmlFor="price" required error={errors.price}>
              <TextInput
                id="price"
                type="number"
                min={0}
                value={form.price}
                onChange={(event) => {
                  patch({ price: event.target.value });
                  clearError("price");
                }}
                invalid={Boolean(errors.price)}
                placeholder="640000"
              />
            </Field>

            <Field label="Discount (%)" htmlFor="discount" error={errors.discount} hint="Per-product markdown. The store-wide promo is separate and applies on top (D22).">
              <TextInput
                id="discount"
                type="number"
                min={0}
                max={100}
                value={form.discount}
                onChange={(event) => {
                  patch({ discount: event.target.value });
                  clearError("discount");
                }}
                invalid={Boolean(errors.discount)}
              />
            </Field>
          </FieldRow>

          <div className="flex items-baseline gap-3 px-4 py-3 rounded-sm bg-muted">
            <span className="admin-field-label">Sells at</span>
            <span className="text-lg font-heading text-body tabular-nums">{formatIDR(sellingPrice)}</span>
            {discount > 0 && <span className="text-sm line-through text-body/40 tabular-nums">{formatIDR(price)}</span>}
            {/* Recomputed by the server on save from price + discount — shown here so
                the number is not a surprise after saving. */}
            <span className="ml-auto text-xs text-body/45">Computed server-side on save</span>
          </div>
        </FormSection>

        <FormSection title="Media">
          <ProductImages value={form.images} onChange={(images) => { patch({ images }); clearError("images"); }} error={errors.images} />
        </FormSection>

        <FormSection title="Sizes & stock">
          <ProductVariants
            sizeGuideId={form.sizeGuideId}
            variants={form.variants}
            onSizeGuideChange={handleSizeGuideChange}
            onVariantsChange={(variants) => {
              patch({ variants });
              clearError("variants");
            }}
            error={errors.variants}
          />
        </FormSection>

        <FormSection title="Content">
          <ProductContent
            drafts={form.translations}
            activeLocale={activeLocale}
            onLocaleChange={setActiveLocale}
            onChange={setTranslation}
            nameError={activeLocale === "EN" ? errors.nameEN : errors.nameID}
          />
        </FormSection>

        <FormSection title="Publishing">
          <FieldRow>
            <Field label="Release date" htmlFor="releasedAt" hint="Drives New Arrivals — distinct from when the record was created (F-33)">
              <TextInput id="releasedAt" type="date" value={form.releasedAt} onChange={(event) => patch({ releasedAt: event.target.value })} />
            </Field>

            <Field label="Best seller rank" htmlFor="bestSellerRank" hint="Optional manual override. Empty means sort by units sold (F-34).">
              <TextInput id="bestSellerRank" type="number" min={1} value={form.bestSellerRank} onChange={(event) => patch({ bestSellerRank: event.target.value })} placeholder="—" />
            </Field>
          </FieldRow>

          <div>
            <Toggle id="isActive" label="Active" description="Inactive products disappear from the storefront but keep their order history." checked={form.isActive} onChange={(isActive) => patch({ isActive })} />
            <Toggle id="isFavorite" label="Featured" description="Surfaces on this product's branding page. Not the visitor wishlist (D11)." checked={form.isFavorite} onChange={(isFavorite) => patch({ isFavorite })} />
            <Toggle id="isPreOrder" label="Pre-order" description="Shows a pre-order badge on the listing and product page." checked={form.isPreOrder} onChange={(isPreOrder) => patch({ isPreOrder })} />
          </div>
        </FormSection>

        <FormActions
          isPending={isPending}
          submitLabel={isEdit ? "Save changes" : "Create product"}
          onCancel={() => router.push(LIST_HREF)}
          note={isEdit ? "Variants and translations are replaced with what is on this form." : "Images move out of temp storage when you save."}
        />
      </FormLayout>
    </>
  );
};
