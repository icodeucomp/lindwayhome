export enum Categories {
  MY_LINDWAY = "MY_LINDWAY",
  SIMPLY_LINDWAY = "SIMPLY_LINDWAY",
  LURE_BY_LINDWAY = "LURE_BY_LINDWAY",
}

export enum PaymentMethods {
  BANK_TRANSFER = "BANK_TRANSFER",
  QRIS = "QRIS",
}

export enum DiscountType {
  PERCENTAGE = "PERCENTAGE",
  FIXED = "FIXED",
}

export interface ProductsQueryParams {
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
  order?: "asc" | "desc";
  isActive?: boolean;
  isFavorite?: boolean;
  isPurchased?: string;
  year?: string;
  month?: string;
  dateFrom?: string;
  dateTo?: string;
  province?: string;
  district?: string;
  sub_district?: string;
  village?: string;
  email?: string;
  items?: {
    selectedSize: string;
    quantity: number;
  }[];
  purchased?: number;
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

export interface Sizes {
  quantity: number;
  size: string;
}

export interface Files {
  filename: string;
  originalName: string;
  url: string;
  path: string;
  size: number;
  mimeType: string;
  alt: string;
}

export interface CartItem {
  productId: string;
  quantity: number;
  selectedSize: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  notes: string;
  sizes: Sizes[];
  stock: number;
  price: number;
  discount: number;
  discountedPrice: number;
  category: Categories;
  sku: string;
  images: Files[];
  productionNotes: string;
  isPreOrder: boolean;
  isFavorite: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProduct {
  name: string;
  description: string;
  notes: string;
  sizes: Sizes[];
  price: number;
  discount: number;
  category: Categories;
  sku: string;
  images: Files[];
  productionNotes: string;
  isPreOrder: boolean;
  isFavorite: boolean;
  isActive: boolean;
}

export interface EditProduct {
  name?: string;
  description?: string;
  notes?: string;
  sizes?: Sizes[];
  price?: number;
  discount?: number;
  category?: Categories;
  sku?: string;
  images?: Files[];
  productionNotes?: string;
  isPreOrder?: boolean;
  isFavorite?: boolean;
  isActive?: boolean;
}

export interface ProductCartItems extends Product, CartItem {
  isSelected: boolean;
}

export interface Guest {
  id: string;
  email: string;
  fullname: string;
  receiptImage: Files;
  whatsappNumber: string;
  address: string;
  totalPurchased: number;
  totalItemsSold: number;
  postalCode: number;
  isMember: boolean;
  instagram: string;
  reference: string;
  isPurchased: boolean;
  paymentMethod: PaymentMethods;
  cartItems: CartItem[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateGuest {
  email: string;
  fullname: string;
  receiptImage?: Files;
  whatsappNumber: string;
  address: string;
  postalCode: number;
  shippingCost: number;
  purchased: number;
  totalPurchased: number;
  totalItemsSold: number;
  isMember: boolean;
  instagram?: string;
  reference?: string;
  isPurchased: boolean;
  paymentMethod: PaymentMethods;
  items: CartItem[];
}

export interface EditGuest {
  email?: string;
  fullname?: string;
  receiptImage?: Files;
  whatsappNumber?: string;
  shippingCost?: number;
  purchased?: number;
  totalPurchased?: number;
  totalItemsSold?: number;
  address?: string;
  postalCode?: number;
  isMember?: boolean;
  instagram?: string;
  reference?: string;
  isPurchased?: boolean;
  paymentMethod?: PaymentMethods;
  items?: CartItem[];
}

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

export interface UpdateLocation {
  code?: string;
  province?: string;
  district?: string;
  sub_district?: string;
  village?: string;
  approx_lat?: number;
  approx_long?: number;
}

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

export type ConfigValue = string | number | boolean | Files | Files[] | undefined | null;

export interface Config {
  id: string;
  key: string;
  label: string;
  description: string;
  value: ConfigValue;
  type: "TEXT" | "NUMBER" | "DECIMAL" | "BOOLEAN" | "SELECT" | "TEXTAREA" | "IMAGE" | "IMAGES" | "VIDEO" | "VIDEOS";
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

export interface ConfigParameterData {
  member_discount: number;
  member_type: DiscountType;
  promo_type: DiscountType;
  promotion_discount: number;
  tax_rate: number;
  tax_type: DiscountType;
  qris_image: Files;
  videos_curated_collection: Files[];
}

export interface DashboardData {
  totalPendingOrders: number;
  totalPurchasedOrders: number;
  totalPurchasedAmount: number;
  totalItemsSold: number;
  totalGuests: number;
  totalProducts: number;
  totalMyLindwayStock: number;
  totalSimplyLindwayStock: number;
  totalLureByLindwayStock: number;
}

export interface RequestDataForEmail {
  guestId: string;
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
