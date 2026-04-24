export type Role = 'CUSTOMER' | 'VENDOR' | 'ADMIN';
export type ProductStatus = 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
export type OrderStatus = 'PENDING' | 'ACCEPTED' | 'PARTIALLY_ACCEPTED' | 'REJECTED' | 'CONFIRMED' | 'CANCELLED';
export type ItemStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'ALTERED' | 'CONFIRMED';

export interface User {
  id: string;
  phone: string;
  name: string;
  role: Role;
  businessName?: string;
  address?: string;
  isActive: boolean;
  createdAt: string;
}

export interface CategoryAttribute {
  id: string;
  categoryId: string;
  name: string;
  sortOrder: number;
}

export interface Category {
  id: string;
  name: string;
  attributes?: CategoryAttribute[];
}

/** Admin list: categories with default attributes */
export interface AdminCategory extends Category {
  attributes: CategoryAttribute[];
}

/** Vendor catalog: defaults + this vendor's extras */
export interface VendorCatalogCategory {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  defaultAttributes: CategoryAttribute[];
  vendorAttributes: CategoryAttribute[];
}

export interface Brand {
  id: string;
  name: string;
  vendorId?: string;
  _count?: { products: number };
}

export interface Product {
  id: string;
  vendorId: string;
  brandId: string;
  brand: Brand;
  name: string;
  images: string[];
  categoryId: string;
  category: Category;
  pattern: string;
  fabric: string;
  color: string;
  attributeValues?: Record<string, string>;
  displayAttributes?: { label: string; value: string }[];
  price?: number;
  moq: number;
  status: ProductStatus;
  vendor: { id: string; name: string; businessName?: string };
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  vendorId: string;
  requestedQty: number;
  acceptedQty?: number;
  status: ItemStatus;
  vendorNote?: string;
  respondedAt?: string;
  createdAt?: string;
  product: Pick<Product, 'id' | 'name' | 'images' | 'price'> & { moq?: number };
  vendor: { id: string; name: string; businessName?: string };
  order?: {
    id: string;
    status: OrderStatus;
    createdAt: string;
    customer: { id: string; name: string; businessName?: string };
  };
}

export interface Order {
  id: string;
  customerId: string;
  status: OrderStatus;
  note?: string;
  createdAt: string;
  items: OrderItem[];
  customer: { id: string; name: string; businessName?: string; phone?: string };
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

export interface PaginatedResponse<T> {
  products: T[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

export interface FilterOptions {
  categories: Category[];
  brands: Brand[];
  patterns: string[];
  fabrics: string[];
  colors: string[];
}

export interface AdminStats {
  users: { total: number; vendors: number; customers: number };
  products: number;
  orders: { total: number; byStatus: Record<string, number> };
}

export interface AdminUser extends User {
  _count: { products: number; orders: number };
}
