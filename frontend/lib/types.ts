// Shapes returned by the Laravel API. Money values are strings like "12.34".

export type Money = string;

export interface Category {
  id: number;
  name: string;
  slug: string;
  parent_id: number | null;
  image: string | null;
  children?: Category[];
}

export interface SiteContent {
  name: string;
  announcement: { text: string; link_label: string; link_url: string } | null;
  hero: {
    title: string;
    text: string;
    button_label: string;
    button_url: string;
    image: string | null;
    image_alt: string;
    stats: { value: number; label: string }[];
  };
  brands: { name: string; font: "serif" | "sans"; weight: number; spacing: string }[];
  testimonials: { name: string; rating: number; text: string }[];
  newsletter: { title: string } | null;
  footer: {
    about: string;
    columns: { title: string; links: { label: string; href?: string }[] }[];
    socials: string[];
  };
  payments: string[];
  filters: { sizes: string[]; colors: { name: string; hex: string }[]; price_max: number };
}

export interface ProductSummary {
  id: number;
  name: string;
  slug: string;
  sku: string;
  price: Money;
  discount_price: Money | null;
  current_price: Money;
  stock: number;
  in_stock: boolean;
  is_featured: boolean;
  rating: string | null;
  sizes: string[];
  colors: string[];
  image: string | null;
  category?: { id: number; name: string; slug: string };
}

export interface ProductDetail extends ProductSummary {
  description: string | null;
  images: { id: number; url: string; is_primary: boolean }[];
}

export interface CartItem {
  id: number;
  quantity: number;
  size: string | null;
  color: string | null;
  unit_price: Money;
  line_total: Money;
  issue: string | null;
  product: ProductSummary | null;
}

export interface Cart {
  guest_token: string | null;
  items: CartItem[];
  item_count: number;
  subtotal: Money;
  discount: Money;
  shipping: Money;
  total: Money;
  coupon: { code: string; type: "percentage" | "fixed"; value: Money; error: string | null } | null;
  has_issues: boolean;
}

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  is_staff: boolean;
  roles?: string[];
  permissions?: string[];
}

export type OrderStatus = "pending" | "paid" | "processing" | "shipped" | "delivered" | "cancelled";

export interface Order {
  order_number: string;
  status: OrderStatus;
  subtotal: Money;
  discount_total: Money;
  shipping_total: Money;
  total: Money;
  coupon_code: string | null;
  items_count?: number;
  created_at: string;
  paid_at: string | null;
}

export interface ShippingAddress {
  name: string;
  phone: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string | null;
  postal_code: string;
  country: string;
}

export interface OrderDetail extends Order {
  shipping_address: ShippingAddress;
  items: {
    product_name: string;
    sku: string;
    size: string | null;
    color: string | null;
    slug: string | null;
    image: string | null;
    unit_price: Money;
    quantity: number;
    line_total: Money;
  }[];
  payment_status: string | null;
  cancelled_at: string | null;
}

// ---- Admin ----

export interface AdminOrder {
  id: number;
  order_number: string;
  status: OrderStatus;
  total: Money;
  items_count?: number;
  customer?: { id: number; name: string; email: string };
  created_at: string;
  paid_at: string | null;
}

export interface AdminOrderDetail extends AdminOrder {
  subtotal: Money;
  discount_total: Money;
  shipping_total: Money;
  coupon_code: string | null;
  cancelled_at: string | null;
  allowed_next_statuses: OrderStatus[];
  shipping_address: ShippingAddress;
  items: { id: number; product_name: string; sku: string; size: string | null; color: string | null; unit_price: Money; quantity: number; line_total: Money }[];
  payments: { provider: string; status: string; amount: Money; currency: string; failure_message: string | null; created_at: string }[];
}

export interface AdminProduct {
  id: number;
  name: string;
  slug: string;
  sku: string;
  description: string | null;
  price: Money;
  discount_price: Money | null;
  stock: number;
  low_stock_threshold: number;
  is_low_stock: boolean;
  is_active: boolean;
  is_featured: boolean;
  sizes: string[];
  colors: string[];
  rating: string | null;
  category?: { id: number; name: string };
  image: string | null;
  images?: { id: number; url: string; is_primary: boolean }[];
}

export interface AdminCategory {
  id: number;
  name: string;
  slug: string;
  parent_id: number | null;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  products_count?: number;
  children?: AdminCategory[];
}

export interface AdminCoupon {
  id: number;
  code: string;
  type: "percentage" | "fixed";
  value: Money;
  min_order_amount: Money;
  usage_limit: number | null;
  used_count: number;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  is_expired: boolean;
}

export interface AdminCustomer {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  is_active: boolean;
  orders_count?: number;
  total_spent: Money;
  joined_at: string;
}

export interface Role {
  id: number;
  name: string;
  is_protected: boolean;
  users_count?: number;
  permissions: string[];
}

export interface PermissionGroup {
  group: string;
  permissions: { id: number; name: string }[];
}

export interface Dashboard {
  stats: { todays_orders: number; todays_revenue: Money; total_customers: number; low_stock_count: number };
  sales_chart: { date: string; orders: number; revenue: Money }[];
  recent_orders: AdminOrder[];
}
