// Enums
export enum Role {
  CUSTOMER = 'CUSTOMER',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
  STORE_ADMIN = 'STORE_ADMIN',
  DELIVERY_AGENT = 'DELIVERY_AGENT',
}

export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PREPARING = 'PREPARING',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

export enum PaymentStatus {
  UNPAID = 'UNPAID',
  PAID = 'PAID',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

export enum PaymentMethod {
  COD = 'COD',
  RAZORPAY = 'RAZORPAY',
  STRIPE = 'STRIPE',
  UPI = 'UPI',
}

// Product Units
// Canonical unit list for the catalogue. The product name should always
// include the actual quantity (e.g. "Fresh Milk (1 L)") so the UI can render
// "<name> / <unit>" without duplication. Do NOT add quantity-bearing values
// like "2 L" or "500 g" here — the unit field is the base unit only.
export enum ProductUnit {
  PCS = 'pcs',
  PACK = 'pack',
  KG = 'kg',
  G = 'g',
  L = 'L',
  ML = 'ml',
  DOZEN = 'dozen',
}

export const PRODUCT_UNITS: readonly ProductUnit[] = [
  ProductUnit.PCS,
  ProductUnit.PACK,
  ProductUnit.KG,
  ProductUnit.G,
  ProductUnit.L,
  ProductUnit.ML,
  ProductUnit.DOZEN,
] as const;

// User Types
// `role` is typed as a loose string because the API serializes the
// Prisma enum to a string at the JSON boundary. Consumers can narrow
// with `Role` if they need type-safety on the literal values.
// Dates are ISO strings (JSON), not Date objects.
export interface User {
  id: string;
  email: string;
  phone?: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  role: string;
  isEmailVerified: boolean;
  isActive: boolean;
  defaultAddressId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Address {
  id: string;
  userId: string;
  label: string;
  street: string;
  city: string;
  state: string;
  pincode: string;
  landmark?: string;
  lat?: number;
  lng?: number;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Store Types
export interface Store {
  id: string;
  name: string;
  slug: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  lat: number;
  lng: number;
  phone?: string;
  email?: string;
  isActive: boolean;
  openingTime?: string;
  closingTime?: string;
  deliveryRadiusKm: number;
  deliveryFee: number;
  minOrderAmount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface StoreProduct {
  id: string;
  storeId: string;
  productId: string;
  price: number;
  salePrice?: number;
  costPrice?: number;
  stock: number;
  lowStockAlert: number;
  isAvailable: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Product Types
export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  isActive: boolean;
  sortOrder: number;
  parentId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductImage {
  id: string;
  url: string;
  altText?: string;
  isPrimary: boolean;
  sortOrder: number;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description?: string;
  shortDesc?: string;
  sku: string;
  barcode?: string;
  price?: number;
  salePrice?: number;
  costPrice?: number;
  stock?: number;
  lowStockAlert?: number;
  unit: string;
  categoryId: string;
  category?: Category;
  images: ProductImage[];
  tags: string[];
  attributes?: Record<string, any>;
  isActive: boolean;
  isFeatured: boolean;
  isAvailable?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Cart Types
export interface CartItem {
  id: string;
  cartId: string;
  productId: string;
  product?: Product;
  quantity: number;
  price: number;
}

export interface Cart {
  id: string;
  userId: string;
  storeId?: string;
  store?: Store;
  items: CartItem[];
  createdAt: Date;
  updatedAt: Date;
}

// Order Types
export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  productImage?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface OrderStatusHistory {
  id: string;
  orderId: string;
  status: OrderStatus;
  note?: string;
  createdAt: Date;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  user?: User;
  addressId: string;
  address?: Address;
  storeId?: string;
  store?: Store;
  items: OrderItem[];
  status: OrderStatus;
  subtotal: number;
  deliveryFee: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentId?: string;
  couponCode?: string;
  notes?: string;
  estimatedDelivery?: Date;
  deliveredAt?: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
  statusHistory: OrderStatusHistory[];
  createdAt: Date;
  updatedAt: Date;
}

// API Request/Response Types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Query Params
export interface ProductQueryParams {
  page?: number;
  limit?: number;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  sort?: 'price_asc' | 'price_desc' | 'newest' | 'popular';
  featured?: boolean;
  inStock?: boolean;
  storeId?: string;
  lat?: number;
  lng?: number;
}

export interface OrderQueryParams {
  page?: number;
  limit?: number;
  status?: OrderStatus;
  startDate?: string;
  endDate?: string;
}
