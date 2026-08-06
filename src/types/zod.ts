import { z } from "zod";

// =============================================================================
// Enums — mirror the Prisma enums
// =============================================================================

export const LocaleEnum = z.enum(["EN", "ID"]);
export const BrandingEnum = z.enum(["MY_LINDWAY", "SIMPLY_LINDWAY", "LURE_BY_LINDWAY", "STUDIO_BY_LINDWAY", "LINDWAY_AWP"]);
export const AudienceEnum = z.enum(["WOMEN", "MEN", "KIDS"]);
export const GarmentEnum = z.enum(["DRESSES", "TOPS", "SKIRTS"]);
export const PaymentMethodEnum = z.enum(["BANK_TRANSFER", "QRIS"]);
export const DiscountEnum = z.enum(["PERCENTAGE", "FIXED"]);
export const OrderStatusEnum = z.enum(["AWAITING_PAYMENT", "PAID", "SHIPPED", "COMPLETED", "CANCELLED"]);
export const InquiryTypeEnum = z.enum(["PRODUCT_INQUIRY", "ORDER_SUPPORT", "CUSTOM_ORDER", "WHOLESALE_B2B", "PARTNERSHIP", "OTHER"]);
export const InquiryStatusEnum = z.enum(["NEW", "IN_PROGRESS", "HANDLED", "ARCHIVED"]);

// =============================================================================
// Shared
// =============================================================================

export const FileSchema = z.object({
  filename: z.string().min(1, "Filename is required"),
  originalName: z.string().min(1, "Original Filename is required"),
  url: z.string().min(1, "Url is required"),
  path: z.string().min(1, "Path is required"),
  size: z.number().int().positive("Size must be positive"),
  mimeType: z.string().regex(/^(image|video)\//, "Must be a valid image or video mime type"),
  alt: z.string().min(1, "Alt text is required for accessibility"),
  isMoved: z.boolean().default(false),
});

/**
 * A Tiptap document (D10). Its internal shape is the editor's contract, not ours,
 * so this only asserts "an object" — validating the node tree here would break
 * every time Tiptap adds a mark.
 */
export const TiptapSchema = z.record(z.string(), z.unknown());

const CartItemSchema = z.object({
  quantity: z.number().int().nonnegative(),
  selectedSize: z.string(),
  productId: z.string(),
});

export const CartSchema = z.object({
  items: z.array(CartItemSchema).min(1, "At least one item is required"),
});

// =============================================================================
// Sizing
// =============================================================================

export const SizeSchema = z.object({
  id: z.string().optional(),
  // Must match a package_dimensions config key exactly, or checkout 404s for this
  // size. Enforced in the service layer and by db:check (§B4).
  code: z.string().min(1, "Size code is required"),
  label: z.string().min(1, "Size label is required"),
  order: z.number().int().nonnegative().optional(),
  isActive: z.boolean().optional(),
});

export const CreateSizeSchema = SizeSchema.omit({ id: true });
export const UpdateSizeSchema = SizeSchema.partial();

export const SizeGuideRowSchema = z.object({
  sizeId: z.string().min(1, "Size is required"),
  measurements: z.record(z.string(), z.number()),
});

export const SizeGuideTranslationSchema = z.object({
  locale: LocaleEnum,
  title: z.string().min(1, "Title is required"),
  description: z.string().nullish(),
  parameterLabels: z.record(z.string(), z.string()).nullish(),
});

export const SizeGuideSchema = z.object({
  id: z.string().optional(),
  order: z.number().int().nonnegative().optional(),
  publishedAt: z.coerce.date().nullish(), // null = draft; this IS the on/off switch (D1)
  rows: z.array(SizeGuideRowSchema).min(1, "A size guide needs at least one row"),
  translations: z.array(SizeGuideTranslationSchema).min(1, "An EN translation is required"),
});

export const CreateSizeGuideSchema = SizeGuideSchema.omit({ id: true });
export const UpdateSizeGuideSchema = SizeGuideSchema.partial();

// =============================================================================
// Product
// =============================================================================

export const ProductVariantSchema = z.object({
  sizeId: z.string().min(1, "Size is required"),
  quantity: z.number().int().nonnegative(),
  packageDimensions: z
    .object({
      weight_g: z.number().nonnegative(),
      length_cm: z.number().nonnegative(),
      width_cm: z.number().nonnegative(),
      height_cm: z.number().nonnegative(),
    })
    .nullish(),
});

// `name` is not here — it is a plain column on Product (D26). Every remaining field
// is nullable, so a product may carry no translation rows at all.
export const ProductTranslationSchema = z.object({
  locale: LocaleEnum,
  description: TiptapSchema.nullish(),
  notes: TiptapSchema.nullish(),
  fabricInformation: TiptapSchema.nullish(),
  shippingDelivery: TiptapSchema.nullish(),
  returnPolicy: TiptapSchema.nullish(),
});

export const ProductSchema = z.object({
  id: z.string().optional(),
  sku: z.string().min(1, "Product SKU is required"),
  slug: z.string().min(1, "Product slug is required"),
  name: z.string().min(1, "Product name is required"),

  branding: BrandingEnum,
  garment: GarmentEnum.nullish(),
  audiences: z.array(AudienceEnum).optional(),
  sizeGuideId: z.string().nullish(),

  price: z.number().positive("Price must be positive"),
  discount: z.number().int().min(0).max(100).optional(),
  discountedPrice: z.number().positive("Discounted price must be positive"),

  images: z.array(FileSchema).min(1, "At least one image is required"),

  releasedAt: z.coerce.date().nullish(),
  bestSellerRank: z.number().int().nullish(),

  isPreOrder: z.boolean().optional(),
  isFavorite: z.boolean().optional(),
  isActive: z.boolean().optional(),

  variants: z.array(ProductVariantSchema).min(1, "At least one size is required"),
  // Optional entirely, now that `name` is a column (D26): the four defaulted fields
  // fall back to config with or without a row, so requiring an EN row would only
  // force an all-null one. The handler still refuses ID-without-EN, since ID falls
  // back to EN per field and an EN visitor would otherwise see nothing.
  translations: z.array(ProductTranslationSchema).optional(),
});

// `stock` and `soldCount` are absent on purpose: stock belongs to the database
// trigger (D24) and soldCount moves only inside the order transaction.
export const CreateProductSchema = ProductSchema.omit({ id: true });
export const UpdateProductSchema = ProductSchema.partial();

// =============================================================================
// Order
// =============================================================================

export const OrderSchema = z.object({
  id: z.string().optional(),
  email: z.string().min(1, "Email is required"),
  fullname: z.string().min(1, "Fullname is required"),
  whatsappNumber: z.string().min(1, "Whatsapp number is required"),
  address: z.string().min(1, "Address is required"),
  postalCode: z.number().int().min(1, "Postal code is required"),

  memberId: z.string().nullish(),
  isMember: z.boolean().optional(),

  shippingCost: z.number().min(0).positive("Shipping cost must be positive"),
  purchased: z.number().min(0).positive("Purchased must be positive"),
  totalPurchased: z.number().min(0).positive("Total purchased must be positive"),
  totalItemsSold: z.number().min(0).positive("Total items sold must be positive"),

  status: OrderStatusEnum.optional(),
  isPurchased: z.boolean().optional(),
  trackingNumber: z.string().nullish(),
  cancelledAt: z.coerce.date().nullish(),

  paymentMethod: PaymentMethodEnum.optional(),
  receiptImage: FileSchema,
  instagram: z.string().optional(),
  reference: z.string().optional(),
});

export const CreateOrderSchema = OrderSchema.omit({ id: true });
export const UpdateOrderSchema = OrderSchema.partial();

// =============================================================================
// Content
// =============================================================================

export const ContactInquirySchema = z.object({
  id: z.string().optional(),
  fullname: z.string().min(1, "Full name is required"),
  email: z.string().email("A valid email is required"),
  phone: z.string().nullish(),
  inquiryType: InquiryTypeEnum,
  otherDetail: z.string().nullish(), // only when inquiryType = OTHER
  message: z.string().min(1, "Message is required"),
  status: InquiryStatusEnum.optional(),
  handlingNote: z.string().nullish(),
});

export const CreateContactInquirySchema = ContactInquirySchema.omit({ id: true, status: true, handlingNote: true });
export const UpdateContactInquirySchema = ContactInquirySchema.partial();

export const FaqTranslationSchema = z.object({
  locale: LocaleEnum,
  question: z.string().min(1, "Question is required"),
  answer: TiptapSchema,
});

export const FaqSchema = z.object({
  id: z.string().optional(),
  topic: z.string().min(1, "Topic is required"),
  order: z.number().int().nonnegative().optional(),
  isActive: z.boolean().optional(),
  translations: z.array(FaqTranslationSchema).min(1, "An EN translation is required"),
});

export const ArticleTranslationSchema = z.object({
  locale: LocaleEnum,
  title: z.string().min(1, "Title is required"),
  excerpt: z.string().nullish(),
  content: TiptapSchema,
});

export const ArticleSchema = z.object({
  id: z.string().optional(),
  slug: z.string().min(1, "Slug is required"),
  categoryId: z.string().min(1, "Category is required"),
  authorId: z.string().nullish(),
  image: FileSchema,
  imageAlt: z.string().nullish(),
  featured: z.boolean().optional(),
  publishedAt: z.coerce.date().nullish(),
  translations: z.array(ArticleTranslationSchema).min(1, "An EN translation is required"),
});

// =============================================================================
// Location — unchanged from v1
// =============================================================================

export const LocationSchema = z.object({
  id: z.string().optional(),
  code: z.string().min(1, "Code is required"),
  province: z.string().min(1, "Province is required"),
  district: z.string().min(1, "District is required"),
  sub_district: z.string().min(1, "Sub-district is required"),
  village: z.string().min(1, "Village is required"),
  approx_lat: z.number().min(-90, "Latitude must be between -90 and 90").max(90, "Latitude must be between -90 and 90"),
  approx_long: z.number().min(-180, "Longitude must be between -180 and 180").max(180, "Longitude must be between -180 and 180"),
  createdAt: z
    .date()
    .default(() => new Date())
    .optional(),
  updatedAt: z.date().optional(),
});

export const CreateLocationSchema = LocationSchema.omit({ id: true, createdAt: true, updatedAt: true });
export const UpdateLocationSchema = LocationSchema.partial();

// =============================================================================
// List queries — shared convention (§E3)
// =============================================================================

const baseQuery = {
  page: z.string().optional().default("1"),
  limit: z.string().optional().default("10"),
  search: z.string().optional(),
  order: z.enum(["asc", "desc"]).optional().default("asc"),
  year: z.string().optional(),
  month: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
};

export const ProductQuerySchema = z.object({
  ...baseQuery,
  locale: LocaleEnum.optional().default("EN"),
  branding: z.string().optional(),
  garment: z.string().optional(),
  audience: z.string().optional(),
  isActive: z.string().optional(),
  isFavorite: z.string().optional(),
  sort: z.enum(["latest", "new-arrivals", "best-sellers", "price-asc", "price-desc"]).optional().default("latest"),
});

export const OrderQuerySchema = z.object({
  ...baseQuery,
  isPurchased: z.string().optional(),
  status: OrderStatusEnum.optional(),
  paymentMethod: PaymentMethodEnum.optional(),
});

export const LocationQuerySchema = z.object({
  page: z.string().optional().default("1"),
  limit: z.string().optional().default("10"),
  search: z.string().optional(),
  province: z.string().optional(),
  district: z.string().optional(),
  sub_district: z.string().optional(),
});

// =============================================================================
// Checkout
//
// `purchased` and `totalItemsSold` are NOT accepted from the client any more — the
// server derives both from database prices (F-51). That was gap A9.1: a buyer
// could name their own subtotal and the server would sign it.
// =============================================================================

export const ShippingCalculateSchema = z.object({
  province: z.string().min(1, "Province is required"),
  district: z.string().min(1, "District is required"),
  sub_district: z.string().min(1, "Sub-district is required"),
  village: z.string().min(1, "Village is required"),
  items: z
    .array(
      z.object({
        productId: z.string().min(1, "Product ID is required"),
        selectedSize: z.string().min(1, "Size is required"),
        quantity: z.number().int().positive("Quantity must be positive"),
      }),
    )
    .min(1, "At least one item is required"),
});

// =============================================================================
// Email
// =============================================================================

export const EmailContextSchema = z.object({
  orderId: z.string(),
  email: z.string(),
  fullname: z.string(),
  whatsappNumber: z.string().regex(/^\d{10,15}$/, "Invalid WhatsApp number format"),
  address: z.string(),
  postalCode: z.number().int().positive(),
  totalPurchased: z.number().nonnegative(),
  totalItemsSold: z.number().int().nonnegative(),
  paymentMethod: z.string(),
  isMember: z.boolean(),
  items: z.array(CartItemSchema),
  baseUrl: z.string(),
  createdAt: z
    .date()
    .default(() => new Date())
    .optional(),
});

export const EmailRequestSchema = z.object({
  to: z.string(),
  subject: z.string(),
  template: z.string(),
  context: EmailContextSchema,
});
