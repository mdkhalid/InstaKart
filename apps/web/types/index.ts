export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatarUrl?: string;
  role: string;
  isEmailVerified: boolean;
  defaultAddressId?: string;
  createdAt: string;
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
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  isActive: boolean;
  sortOrder: number;
  parentId?: string;
  children?: Category[];
  _count?: { products: number };
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
  price: number;
  salePrice?: number | null;
  discountPercent?: number;
  stock: number;
  lowStockAlert: number;
  unit: string;
  categoryId: string;
  category?: { id: string; name: string; slug: string };
  images: ProductImage[];
  tags: string[];
  attributes?: Record<string, any>;
  isActive: boolean;
  isFeatured: boolean;
  isAvailable: boolean;
  createdAt: string;
}

export interface CartItemType {
  id: string;
  productId: string;
  quantity: number;
  price: number;
  product: {
    id: string;
    name: string;
    slug: string;
    price: number;
    salePrice?: number | null;
    stock: number;
    unit: string;
    isAvailable: boolean;
    imageUrl?: string;
  };
}

export interface Cart {
  id: string;
  userId: string;
  items: CartItemType[];
  subtotal: number;
  itemCount: number;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  productImage?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface OrderStatusHistory {
  id: string;
  status: string;
  note?: string;
  createdAt: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: string;
  subtotal: number;
  deliveryFee: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  items: OrderItem[];
  address?: Address;
  statusHistory: OrderStatusHistory[];
  estimatedDelivery?: string;
  notes?: string;
  createdAt: string;
}
