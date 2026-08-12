"use client";

import * as React from "react";

import { useRouter } from "next/navigation";

import { useQueryClient } from "@tanstack/react-query";

import { AUDIENCE, BRAND, CLOTHING } from "@/static/taxonomy";

import { calculateDiscountedPrice, formatIDR, productsApi } from "@/utils";

import { ApiResponse, AudienceType, BrandType, CreateProduct, EditProduct, Files, ClothingType, Locale, Product } from "@/types";

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
  name: string;
  brand: BrandType | "";
  clothing: ClothingType | "";
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
  name: "",
  brand: "",
  clothing: "",
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

type FormErrors = Partial<Record<"sku" | "slug" | "name" | "brand" | "price" | "discount" | "images" | "variants", string>>;

const validate = (form: FormState): FormErrors => {
  const errors: FormErrors = {};

  if (!form.sku.trim()) errors.sku = "SKU is required — it is also the image folder name";
  if (!form.slug.trim()) errors.slug = "Slug is required";
  if (!form.name.trim()) errors.name = "Name is required";
  if (!form.brand) errors.brand = "Pick which Lindway line this belongs to";

  const price = Number(form.price);
  if (!form.price.trim()) errors.price = "Price is required";
  else if (Number.isNaN(price) || price <= 0) errors.price = "Price must be greater than zero";

  const discount = Number(form.discount || 0);
  if (Number.isNaN(discount) || discount < 0 || discount > 100) errors.discount = "Discount must be between 0 and 100";

  if (form.images.length === 0) errors.images = "At least one image is required";

  if (form.variants.length === 0) errors.variants = "Select at least one size";
  else if (form.variants.reduce((sum, variant) => sum + variant.quantity, 0) <= 0) errors.variants = "Total stock must be greater than zero";

  // Nothing to validate under the locale tabs any more. Since D26 moved `name` out
  // of the translations, every field there is optional rich content — a product with
  // no translation rows at all is valid and still renders.
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
      name: record.name,
      brand: record.brand,
      clothing: record.clothing ?? "",
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

  const setTranslation = (locale: Locale, changes: Partial<TranslationDraft>) =>
    setForm((previous) => ({ ...previous, translations: { ...previous.translations, [locale]: { ...previous.translations[locale], ...changes } } }));

  // Creating a product derives the slug from the name until the admin edits the slug
  // themselves; after that it is theirs and never moves under them.
  const setName = (name: string) => {
    setForm((previous) => ({ ...previous, name, ...(!isSlugTouched && !isEdit ? { slug: slugify(name) } : {}) }));
    clearError("name");
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

    if (Object.keys(found).length > 0) return;

    // Only locales that actually carry content get a row. An EN row is included
    // whenever ID has one, because the fallback runs ID → EN and the server refuses
    // ID-without-EN — but neither is required on its own (D26).
    const filled = (["EN", "ID"] as const).filter((locale) => hasContent(form.translations[locale]));
    const locales: Locale[] = filled.includes("ID") && !filled.includes("EN") ? ["EN", ...filled] : [...filled];
    const translations = locales.map((locale) => ({ locale, ...form.translations[locale] }));

    // `discountedPrice`, `stock` and `soldCount` are absent on purpose: the server
    // derives the first, a trigger owns the second (D24), and the order transaction
    // owns the third.
    const payload: CreateProduct = {
      sku: form.sku.trim(),
      slug: form.slug.trim(),
      name: form.name.trim(),
      brand: form.brand as BrandType,
      clothing: form.clothing || null,
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
        narrow
        back={{ href: LIST_HREF, label: "Products" }}
        title={isEdit ? form.name || "Edit product" : "New product"}
        description="The product name is shown exactly as you type it, in both languages. Descriptions are optional — you can publish now and write them later."
      />

      <FormLayout onSubmit={handleSubmit}>
        <FormSection title="Details">
          <Field label="Name" htmlFor="name" required error={errors.name} hint="One name for both languages — never translated, like the slug">
            <TextInput id="name" value={form.name} onChange={(event) => setName(event.target.value)} invalid={Boolean(errors.name)} placeholder="Cotton Day Dress" />
          </Field>

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

            <Field label="Slug" htmlFor="slug" required error={errors.slug} hint="The short name used in the web address. The same one is used for both languages.">
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
            <Field label="Brand" htmlFor="brand" required error={errors.brand}>
              <SelectInput
                id="brand"
                value={form.brand}
                onChange={(event) => {
                  patch({ brand: event.target.value as BrandType });
                  clearError("brand");
                }}
                invalid={Boolean(errors.brand)}
                placeholder="Select a brand"
                options={BRAND.map((entry) => ({ value: entry.key, label: entry.isActive ? entry.label : `${entry.label} — hidden` }))}
              />
            </Field>

            <Field label="Clothing" htmlFor="clothing" hint="Optional — one clothing type per product">
              <SelectInput
                id="clothing"
                value={form.clothing}
                onChange={(event) => patch({ clothing: event.target.value as ClothingType })}
                options={[{ value: "", label: "No clothing type" }, ...CLOTHING.map((entry) => ({ value: entry.key, label: entry.label }))]}
              />
            </Field>
          </FieldRow>

          <Field label="Audience" hint="Tick more than one for unisex pieces">
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

            <Field label="Discount (%)" htmlFor="discount" error={errors.discount} hint="A discount just for this product. Any store-wide promotion is separate and applies on top of it.">
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
          <ProductContent drafts={form.translations} activeLocale={activeLocale} onLocaleChange={setActiveLocale} onChange={setTranslation} />
        </FormSection>

        <FormSection title="Publishing">
          <FieldRow>
            <Field label="Release date" htmlFor="releasedAt" hint="Decides where it appears under New Arrivals. Leave blank if it is not a new release.">
              <TextInput id="releasedAt" type="date" value={form.releasedAt} onChange={(event) => patch({ releasedAt: event.target.value })} />
            </Field>

            <Field label="Best seller rank" htmlFor="bestSellerRank" hint="Force a position in Best Sellers. Leave blank to let actual sales decide.">
              <TextInput id="bestSellerRank" type="number" min={1} value={form.bestSellerRank} onChange={(event) => patch({ bestSellerRank: event.target.value })} placeholder="—" />
            </Field>
          </FieldRow>

          <div>
            <Toggle id="isActive" label="Active" description="Inactive products disappear from the storefront but keep their order history." checked={form.isActive} onChange={(isActive) => patch({ isActive })} />
            <Toggle id="isFavorite" label="Featured" description="Highlights this product on its collection page. This is not the customer's wishlist." checked={form.isFavorite} onChange={(isFavorite) => patch({ isFavorite })} />
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
