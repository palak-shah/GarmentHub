export type Role = 'CUSTOMER' | 'VENDOR' | 'TRADER' | 'ADMIN';
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
  priceMax?: number;
  /** From curated share: trader's offered unit price for this product line. */
  traderOfferUnitPrice?: number | null;
  moq: number;
  status: ProductStatus;
  traderId?: string;
  trader?: { id: string; name: string; businessName?: string } | null;
  vendor: { id: string; name: string; businessName?: string; phone?: string };
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
  offeredUnitPrice?: number | null;
  /** Trader's favored unit price for the line (before/alongside vendor responses). */
  traderTargetUnitPrice?: number | null;
  traderCounterUnitPrice?: number | null;
  agreedUnitPrice?: number | null;
  createdAt?: string;
  product: Pick<Product, 'id' | 'name' | 'images' | 'price' | 'priceMax'> & { moq?: number };
  vendor: { id: string; name: string; businessName?: string };
  order?: {
    id: string;
    status: OrderStatus;
    createdAt: string;
    orderMode?: OrderMode;
    customerNeedBy?: string | null;
    customer: { id: string; name: string; businessName?: string };
    trader?: { id: string; name: string; businessName?: string } | null;
  };
}

export type OrderMode = 'DIRECT' | 'MANAGED';
export type WorkflowState = 'UNSEEN' | 'SEEN' | 'SHARED' | 'ORDERED' | 'SKIPPED';

export interface Order {
  id: string;
  customerId: string;
  traderId?: string;
  orderMode?: OrderMode;
  status: OrderStatus;
  note?: string;
  /** End of chosen need-by calendar day (UTC); optional. */
  customerNeedBy?: string | null;
  /** Managed: set when trader forwards to vendors; null means vendors do not see the order yet. */
  releasedToVendorsAt?: string | null;
  createdAt: string;
  items: OrderItem[];
  customer: { id: string; name: string; businessName?: string; phone?: string };
  trader?: { id: string; name: string; businessName?: string } | null;
}

export interface CuratedShare {
  id: string;
  trader: { id: string; name: string; businessName?: string };
  note?: string;
  orderMode: OrderMode;
  createdAt: string;
  isRead: boolean;
  /** Products may include `traderOfferUnitPrice` from the share line. */
  products: Product[];
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  referenceId?: string;
  isRead: boolean;
  createdAt: string;
}

export interface FeedResponse {
  newProducts: Product[];
  pendingProducts: Product[];
  doneProducts: Product[];
  nextCursor: string | null;
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
