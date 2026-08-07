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

export enum ClothingType {
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
  clothing?: string;
  audience?: string;
  sort?: "latest" | "new-arrivals" | "best-sellers" | "price-asc" | "price-desc";
  /** String form carries the tri-state a list screen needs: "" (both), "true", "false". */
  isActive?: boolean | string;
  isFavorite?: boolean;
  isPurchased?: string;
  status?: OrderStatus | string;
  paymentMethod?: PaymentMethods | string;
  categoryId?: string;
  featured?: string;
  published?: string;
  topic?: string;
  inquiryType?: InquiryType | string;
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
  publishedAt: string | null;
  rows: SizeGuideRow[];
  translations: SizeGuideTranslation[];
  /** Present when the API resolved translations for a locale. */
  title?: string;
  description?: string | null;
  parameterLabels?: Record<string, string> | null;
}

export interface CreateSize {
  code: string;
  label: string;
  order?: number;
  isActive?: boolean;
}

export type UpdateSize = Partial<CreateSize>;

export interface CreateSizeGuide {
  /** null keeps it a draft — this is the on/off switch (D1). */
  publishedAt?: string | null;
  rows: { sizeId: string; measurements: Record<string, number> }[];
  translations: SizeGuideTranslation[];
}

export type UpdateSizeGuide = Partial<CreateSizeGuide>;

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

/** No `name` — it is a plain column on Product (D26). Every field here is optional. */
export interface ProductTranslation {
  locale: Locale;
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
  /** Single name for both languages (D26) — never resolved through a fallback. */
  name: string;

  branding: BrandingType;
  clothing: ClothingType | null;
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
  name: string;
  branding: BrandingType;
  clothing?: ClothingType | null;
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
  /** Optional — a product with no rich content at all is valid (D26). */
  translations?: ProductTranslation[];
}

export type EditProduct = Partial<CreateProduct>;

// =============================================================================
// Content — Journal
// =============================================================================

export interface ArticleCategoryTranslation {
  locale: Locale;
  name: string;
  description?: string | null;
}

export interface ArticleCategory {
  id: string;
  slug: string;
  isActive: boolean;
  translations: ArticleCategoryTranslation[];
  /** Resolved for the requested locale (§B3.2). The name lives only here. */
  name?: string;
  description?: string | null;
  /** How many articles point at this category — a category in use cannot be deleted. */
  articleCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateArticleCategory {
  slug: string;
  isActive?: boolean;
  translations: ArticleCategoryTranslation[];
}

export type UpdateArticleCategory = Partial<CreateArticleCategory>;

export interface ArticleTranslation {
  locale: Locale;
  title: string;
  excerpt?: string | null;
  content: RichText;
}

export interface Article {
  id: string;
  slug: string;
  categoryId: string;
  category?: Pick<ArticleCategory, "id" | "slug" | "translations"> & { name?: string };
  authorId: string | null;
  author?: Pick<User, "id" | "username"> | null;
  image: Files;
  imageAlt: string | null;
  featured: boolean;
  /** null = draft. This IS the on/off switch, as on SizeGuide (D1). */
  publishedAt: string | null;
  translations: ArticleTranslation[];
  /** Resolved for the requested locale (§B3.2). */
  title?: string;
  excerpt?: string | null;
  content?: RichText;
  createdAt: string;
  updatedAt: string;
}

export interface CreateArticle {
  slug: string;
  categoryId: string;
  authorId?: string | null;
  image: Files;
  imageAlt?: string | null;
  featured?: boolean;
  publishedAt?: string | null;
  translations: ArticleTranslation[];
}

export type UpdateArticle = Partial<CreateArticle>;

export interface FaqTranslation {
  locale: Locale;
  question: string;
  answer: RichText;
}

export interface Faq {
  id: string;
  /** Free-text grouping key so one component can serve several pages. */
  topic: string;
  isActive: boolean;
  translations: FaqTranslation[];
  /** Resolved for the requested locale (§B3.2). The question lives only here. */
  question?: string;
  answer?: RichText;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFaq {
  topic: string;
  isActive?: boolean;
  translations: FaqTranslation[];
}

export type UpdateFaq = Partial<CreateFaq>;

/** The list endpoint also returns every distinct topic, for the filter and suggestions. */
export interface FaqListResponse extends ApiResponse<Faq[]> {
  topics: string[];
}

// =============================================================================
// Contact inbox
// =============================================================================

export interface ContactInquiry {
  id: string;
  fullname: string;
  email: string;
  phone: string | null;
  inquiryType: InquiryType;
  /** Only meaningful when inquiryType is OTHER. */
  otherDetail: string | null;
  message: string;
  status: InquiryStatus;
  /** What the admin actually did — HANDLED alone does not record how (D23). */
  handlingNote: string | null;
  handledAt: string | null;
  handledById: string | null;
  handledBy?: Pick<User, "id" | "username"> | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateContactInquiry {
  fullname: string;
  email: string;
  phone?: string | null;
  inquiryType: InquiryType;
  otherDetail?: string | null;
  message: string;
}

/** The only two fields an admin authors — the rest is the customer's record. */
export interface UpdateContactInquiry {
  status?: InquiryStatus;
  handlingNote?: string | null;
}

/** The list also carries counts per status: the tab row and the sidebar badge. */
export interface ContactInquiryListResponse extends ApiResponse<ContactInquiry[]> {
  statusCounts: Record<InquiryStatus, number>;
}

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
  product?: Pick<Product, "id" | "sku" | "slug" | "name" | "images">;
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
  /** false = revoked. Past orders keep their frozen `isMember` either way (D19). */
  isActive: boolean;
  /** This IS the join date — there is no separate joinedAt (D21). */
  createdAt: string;
  updatedAt?: string;
  /** Attached by the list and detail endpoints, not stored. */
  orderCount?: number;
  /** Sum of `totalPurchased` across their verified orders. */
  totalSpent?: number;
  lastOrderAt?: string | null;
}

export interface CreateMember {
  email: string;
  fullname?: string | null;
  isActive?: boolean;
}

/** Email is absent on purpose — it is the key checkout matches on. */
export interface UpdateMember {
  fullname?: string | null;
  isActive?: boolean;
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
  inactiveProducts: number;
  /** One entry per BrandingType present in the catalog — no longer three fixed fields. */
  stockByBranding: { branding: BrandingType; stock: number; products: number }[];
  /** Every OrderStatus, lifecycle-ordered, including the stages sitting at zero. */
  statusPipeline: { status: OrderStatus; count: number }[];
  /** Fixed 30-day window — independent of the month/year filter. */
  ordersByDay: { date: string; bankTransfer: number; qris: number }[];
  latestOrders: {
    id: string;
    fullname: string;
    email: string;
    totalPurchased: number;
    status: OrderStatus;
    isPurchased: boolean;
    paymentMethod: PaymentMethods;
    createdAt: string;
  }[];
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
