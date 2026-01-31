import { z } from "zod";

export const CategoriesEnum = z.enum(["MY_LINDWAY", "LURE_BY_LINDWAY", "SIMPLY_LINDWAY"]);

export const PaymentMethodEnum = z.enum(["BANK_TRANSFER", "QRIS"]);

export const DiscountEnum = z.enum(["PERCENTAGE", "FIXED"]);

export const FileSchema = z.object({
  filename: z.string().min(1, "Filename is required"),
  url: z.string().min(1, "Url is required"),
  path: z.string().min(1, "Path is required"),
  size: z.number().int().positive("Size must be positive").nullable().optional(),
  mimeType: z
    .string()
    .regex(/^(image|video)\//, "Must be a valid image or video mime type")
    .nullable()
    .optional(),
  alt: z.string().min(1, "Alt text is required for accessibility"),
});

const CartItemSchema = z.object({
  quantity: z.number().int().nonnegative(),
  selectedSize: z.string(),
  productId: z.string(),
});

export const CartSchema = z.object({
  items: z.array(CartItemSchema).min(1, "Product images is required, minimal 1 image"),
});

export const SizesSchema = z.object({
  quantity: z.number().min(1, "Quantity is required"),
  size: z.string().min(1, "Size is required"),
});

export const ProductSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Product name is required"),
  description: z.string().min(1, "Product description is required"),
  notes: z.string().min(1, "Product notes is required"),
  sizes: z.array(SizesSchema).min(1, "Product sizes is required, minimal 1 size"),
  price: z.number().min(1, "Product price is required").positive("Price must be positive"),
  category: CategoriesEnum.default("MY_LINDWAY"),
  sku: z.string().min(1, "Product sku is required"),
  images: z.array(FileSchema).min(1, "Product images is required, minimal 1 image"),
  discount: z.number().min(0).positive("Discount must be positive"),
  discountedPrice: z.number().min(1).positive("Discounted Price must be positive").optional(),
  productionNotes: z.string().default("").optional(),
  isPreOrder: z.boolean().default(false),
  isFavorite: z.boolean().default(false),
  isActive: z.boolean().default(true),
  createdAt: z
    .date()
    .default(() => new Date())
    .optional(),
  updatedAt: z.date().optional(),
});

export const GuestSchema = z.object({
  id: z.string().optional(),
  email: z.string().min(1, "Email name is required"),
  fullname: z.string().min(1, "Fullname is required"),
  whatsappNumber: z.string().min(1, "Whatsapp number is required"),
  address: z.string().min(1, "Address is required"),
  postalCode: z.number().int().min(1, "Postal code is required"),
  isMember: z.boolean().default(false),
  shippingCost: z.number().min(0).positive("Shipping cost must be positive"),
  totalItemsSold: z.number().min(0).positive("Total items sold must be positive"),
  totalPurchased: z.number().min(0).positive("Total purchased must be positive"),
  purchased: z.number().min(0).positive("Purchased must be positive"),
  receiptImage: FileSchema,
  instagram: z.string().optional(),
  reference: z.string().optional(),
  isPurchased: z.boolean().default(false),
  paymentMethod: PaymentMethodEnum.default("BANK_TRANSFER"),
  createdAt: z
    .date()
    .default(() => new Date())
    .optional(),
  updatedAt: z.date().optional(),
});

export const CreateProductSchema = ProductSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const UpdateProductSchema = ProductSchema.partial();

export const CreateGuestSchema = GuestSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const UpdateGuestSchema = GuestSchema.partial();

export const LocationSchema = z.object({
  id: z.string().optional(),
  code: z.string().min(1, "Code is required"),
  province: z.string().min(1, "Province is required"),
  district: z.string().min(1, "District is required"),
  sub_district: z.string().min(1, "Sub-district is required"),
  village: z.string().min(1, "Village is required"),
  approx_lat: z.number().min(-90, "Latitude is required and must be between -90 and 90").max(90, "Latitude must be between -90 and 90"),
  approx_long: z.number().min(-180, "Longitude is required and must be between -180 and 180").max(180, "Longitude must be between -180 and 180"),
  createdAt: z
    .date()
    .default(() => new Date())
    .optional(),
  updatedAt: z.date().optional(),
});

export const CreateLocationSchema = LocationSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const LocationQuerySchema = z.object({
  page: z.string().optional().default("1"),
  limit: z.string().optional().default("10"),
  search: z.string().optional(),
  province: z.string().optional(),
  district: z.string().optional(),
  sub_district: z.string().optional(),
});

export const UpdateLocationSchema = LocationSchema.partial();

export const ShippingCalculateSchema = z.object({
  province: z.string().min(1, "Province is required"),
  district: z.string().min(1, "District is required"),
  sub_district: z.string().min(1, "Sub-district is required"),
  village: z.string().min(1, "Village is required"),
  items: z
    .array(
      z.object({
        selectedSize: z.string().min(1, "Size is required"),
        quantity: z.number().int().positive("Quantity must be positive"),
      }),
    )
    .min(1, "At least one item is required"),
});

export const EmailContextSchema = z.object({
  guestId: z.string(),
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
