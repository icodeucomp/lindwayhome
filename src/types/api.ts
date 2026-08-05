// =============================================================================
// Enums — mirror the Prisma enums (§B4.9)
// =============================================================================

export type Locale = "EN" | "ID";

export enum BrandingType {
  MY_LINDWAY = "MY_LINDWAY",
  SIMPLY_LINDWAY = "SIMPLY_LINDWAY",
  LURE_BY_LINDWAY = "LURE_BY_LINDWAY",
  STUDIO_BY_LINDWAY = "STUDIO_BY_LINDWAY",
  LINDWAY_AWP = "LINDWAY_AWP",
}

export enum AudienceType {
  WOMEN = "WOMEN",
  MEN = "MEN",
  KIDS = "KIDS",
}

export enum GarmentType {
  DRESSES = "DRESSES",
  TOPS = "TOPS",
  SKIRTS = "SKIRTS",
}

export enum PaymentMethods {
  BANK_TRANSFER = "BANK_TRANSFER",
  QRIS = "QRIS",
}

export enum DiscountType {
  PERCENTAGE = "PERCENTAGE",
  FIXED = "FIXED",
}

export enum OrderStatus {
  AWAITING_PAYMENT = "AWAITING_PAYMENT",
  PAID = "PAID",
  SHIPPED = "SHIPPED",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

export enum InquiryType {
  PRODUCT_INQUIRY = "PRODUCT_INQUIRY",
  ORDER_SUPPORT = "ORDER_SUPPORT",
  CUSTOM_ORDER = "CUSTOM_ORDER",
  WHOLESALE_B2B = "WHOLESALE_B2B",
  PARTNERSHIP = "PARTNERSHIP",
  OTHER = "OTHER",
}

export enum InquiryStatus {
  NEW = "NEW",
  IN_PROGRESS = "IN_PROGRESS",
  HANDLED = "HANDLED",
  ARCHIVED = "ARCHIVED",
}

// =============================================================================
// Shared
// =============================================================================

export interface SelectOption {
  label: string;
  value: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface Files {
  filename: string;
  originalName: string;
  url: string;
  path: string;
  size: number;
  mimeType: string;
  alt: string;
  isMoved: boolean;
}

/** A Tiptap document. Opaque here — only the editor and the renderer inspect it. */
export type RichText = Record<string, unknown>;

export interface QueryParams {
  page?: number;
  limit?: number;
  search?: string;
  order?: "asc" | "desc";
  locale?: Locale;
  branding?: string;
  garment?: string;
  audience?: string;
  sort?: "latest" | "new-arrivals" | "best-sellers" | "price-asc" | "price-desc";
  isActive?: boolean;
  isFavorite?: boolean;
  isPurchased?: string;
  status?: OrderStatus;
  year?: string;
  month?: string;
  dateFrom?: string;
  dateTo?: string;
  province?: string;
  district?: string;
  sub_district?: string;
  village?: string;
  email?: string;
  type?: string;
  items?: {
    productId: string;
    selectedSize: string;
    quantity: number;
  }[];
}

/** Kept under the old name so existing call sites need no churn. */
export type ProductsQueryParams = QueryParams;

// =============================================================================
// Access
// =============================================================================

export interface User {
  id: string;
  email: string;
  username: string;
  role: "ADMIN" | "SUPER_ADMIN";
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    token: string;
    user: User;
  };
}

// =============================================================================
// Sizing
// =============================================================================

export interface Size {
  id: string;
  code: string;
  label: string;
  order: number;
  isActive: boolean;
}

export interface SizeGuideRow {
  id: string;
  sizeId: string;
  size?: Size;
  measurements: Record<string, number>;
}

export interface SizeGuideTranslation {
  locale: Locale;
  title: string;
  description?: string | null;
  parameterLabels?: Record<string, string> | null;
}

export interface SizeGuide {
  id: string;
  order: number;
  publishedAt: string | null;
  rows: SizeGuideRow[];
  translations: SizeGuideTranslation[];
  /** Present when the API resolved translations for a locale. */
  title?: string;
  description?: string | null;
}

// =============================================================================
// Product
// =============================================================================

export interface ProductVariant {
  id: string;
  sizeId: string;
  size?: Size;
  quantity: number;
  packageDimensions?: {
    weight_g: number;
    length_cm: number;
    width_cm: number;
    height_cm: number;
  } | null;
}

export interface ProductTranslation {
  locale: Locale;
  name: string;
  description?: RichText | null;
  notes?: RichText | null;
  fabricInformation?: RichText | null;
  shippingDelivery?: RichText | null;
  returnPolicy?: RichText | null;
}

export interface Product {
  id: string;
  sku: string;
  slug: string;

  branding: BrandingType;
  garment: GarmentType | null;
  audiences: AudienceType[];
  sizeGuideId: string | null;
  sizeGuide?: SizeGuide | null;

  price: number;
  discount: number;
  discountedPrice: number;

  images: Files[];
  /** Maintained by a database trigger (D24) — read-only from the application. */
  stock: number;

  releasedAt: string | null;
  soldCount: number;
  bestSellerRank: number | null;

  isPreOrder: boolean;
  isFavorite: boolean;
  isActive: boolean;

  variants: ProductVariant[];
  translations: ProductTranslation[];

  /** Flattened by `resolveTranslation` for the requested locale (§B3.2). */
  name?: string;
  description?: RichText | null;
  notes?: RichText | null;
  fabricInformation?: RichText | null;
  shippingDelivery?: RichText | null;
  returnPolicy?: RichText | null;

  createdAt: string;
  updatedAt: string;
}

export interface CreateProduct {
  sku: string;
  slug: string;
  branding: BrandingType;
  garment?: GarmentType | null;
  audiences: AudienceType[];
  sizeGuideId?: string | null;
  price: number;
  discount: number;
  images: Files[];
  releasedAt?: string | null;
  bestSellerRank?: number | null;
  isPreOrder: boolean;
  isFavorite: boolean;
  isActive: boolean;
  variants: { sizeId: string; quantity: number; packageDimensions?: ProductVariant["packageDimensions"] }[];
  translations: ProductTranslation[];
}

export type EditProduct = Partial<CreateProduct>;

// =============================================================================
// Cart — client-side only, never persisted server-side before checkout (F-6)
// =============================================================================

export interface CartItem {
  productId: string;
  quantity: number;
  selectedSize: string;
}

/**
 * What the cart keeps in localStorage. Deliberately a flat subset of `Product`:
 * `name` is already resolved for the locale that was active when the item was
 * added, and translations/variants are not carried around.
 */
export interface CartProduct {
  id: string;
  sku: string;
  slug: string;
  name: string;
  price: number;
  discountedPrice: number;
  images: Files[];
  branding: BrandingType;
  isPreOrder: boolean;
}

export interface ProductCartItems extends CartProduct, CartItem {
  isSelected: boolean;
}

// =============================================================================
// Order
// =============================================================================

export interface OrderItem {
  id: string;
  productId: string;
  product?: Pick<Product, "id" | "sku" | "slug" | "images"> & { name?: string };
  quantity: number;
  selectedSize: string;
  /** Snapshot taken at order time — not the product's current price. */
  unitPrice: number;
  lineTotal: number;
}

export interface Order {
  id: string;
  email: string;
  fullname: string;
  whatsappNumber: string;
  address: string;
  postalCode: number;

  memberId: string | null;
  isMember: boolean;

  shippingCost: number;
  purchased: number;
  totalPurchased: number;
  totalItemsSold: number;

  status: OrderStatus;
  isPurchased: boolean;
  trackingNumber: string | null;
  cancelledAt: string | null;

  paymentMethod: PaymentMethods;
  receiptImage: Files;
  instagram: string | null;
  reference: string | null;

  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Prices are absent on purpose. The server takes `shippingCost`, `purchased`,
 * `totalPurchased` and `totalItemsSold` from the signed checkout token and ignores
 * anything the client sends for them (§A5.2).
 */
export interface CreateOrder {
  email: string;
  fullname: string;
  whatsappNumber: string;
  address: string;
  postalCode: number;
  receiptImage?: Files;
  isMember: boolean;
  instagram?: string;
  reference?: string;
  paymentMethod: PaymentMethods;
  items: CartItem[];
  checkoutToken: string;
}

/**
 * State shared by the three checkout steps. It was declared separately in each of
 * them, so the four copies drifted and TypeScript treated them as unrelated types.
 */
export interface CheckoutFormData extends CreateOrder {
  /** Display only — the server takes the authoritative total from the signed token. */
  totalPurchased: number;
}

export interface EditOrder {
  status?: OrderStatus;
  isPurchased?: boolean;
  trackingNumber?: string | null;
  fullname?: string;
  whatsappNumber?: string;
  address?: string;
  postalCode?: number;
  instagram?: string;
  reference?: string;
  paymentMethod?: PaymentMethods;
  receiptImage?: Files;
}

export interface Member {
  id: string;
  email: string;
  fullname: string | null;
  isActive: boolean;
  createdAt: string;
}

// =============================================================================
// Location
// =============================================================================

export interface Location {
  id: string;
  code: string;
  province: string;
  district: string;
  sub_district: string;
  village: string;
  approx_lat: number;
  approx_long: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateLocation {
  code: string;
  province: string;
  district: string;
  sub_district: string;
  village: string;
  approx_lat: number;
  approx_long: number;
}

export type UpdateLocation = Partial<CreateLocation>;

// =============================================================================
// Config
// =============================================================================

export interface ValidationRule {
  min?: number;
  max?: number;
  precision?: number;
  step?: number;

  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: "email" | "url" | "phone" | "date" | "time" | "datetime" | "color" | "password";

  required?: boolean;
  unique?: boolean;

  maxSize?: string;
  minSize?: string;
  maxCount?: number;
  minCount?: number;
  allowedTypes?: string[];
  allowedExtensions?: string[];

  options?: Array<{ label: string; value: string; disabled?: boolean }>;
  multiSelect?: boolean;

  customValidator?: string;
  customMessage?: string;

  dependsOn?: string;
  condition?: "equals" | "not_equals" | "greater_than" | "less_than" | "contains";

  disabled?: boolean;
  readonly?: boolean;
  placeholder?: string;

  minDate?: string;
  maxDate?: string;
  excludeDates?: string[];

  integer?: boolean;
  positive?: boolean;
  negative?: boolean;
  nonZero?: boolean;
}

export type JsonRow = Record<string, unknown>;

export type ConfigValue = string | number | boolean | Files | Files[] | JsonRow | JsonRow[] | undefined | null;

export interface Config {
  id: string;
  key: string;
  label: string;
  description: string;
  value: ConfigValue;
  type: "TEXT" | "NUMBER" | "DECIMAL" | "BOOLEAN" | "SELECT" | "TEXTAREA" | "IMAGE" | "IMAGES" | "VIDEO" | "VIDEOS" | "JSON";
  validation: ValidationRule;
  order: number;
  isActive: boolean;
}

export interface ConfigGroup {
  id: string;
  name: string;
  label: string;
  description: string;
  order: number;
  isActive: boolean;
  configs: Config[];
}

export interface EditConfigParameter {
  [key: string]: ConfigValue;
}

export interface BankAccount {
  bank: string;
  holder: string;
  number: string;
  branch?: string;
  swift?: string;
}

export interface ConfigParameterData {
  member_discount: number;
  member_type: DiscountType;
  promo_type: DiscountType;
  promotion_discount: number;
  tax_rate: number;
  tax_type: DiscountType;
  qris_image: Files;
  bank_accounts: BankAccount[];
}

// =============================================================================
// Dashboard
// =============================================================================

export interface DashboardData {
  totalPendingOrders: number;
  totalPurchasedOrders: number;
  totalPurchasedAmount: number;
  totalItemsSold: number;
  totalOrders: number;
  totalProducts: number;
  totalMembers: number;
  /** One entry per BrandingType present in the catalog — no longer three fixed fields. */
  stockByBranding: { branding: BrandingType; stock: number; products: number }[];
}

// =============================================================================
// Email
// =============================================================================

export interface RequestDataForEmail {
  orderId: string;
  email: string;
  fullname: string;
  whatsappNumber: string;
  address: string;
  postalCode: number;
  totalPurchased: number;
  totalItemsSold: number;
  shippingCost: number;
  paymentMethod: string;
  isMember: boolean;
  items: {
    product: {
      id: string;
      name: string;
      price: number;
    };
    selectedSize: string;
    quantity: number;
  }[];
  baseUrl: string;
  createdAt: Date;
}
