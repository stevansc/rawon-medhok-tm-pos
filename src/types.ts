export type UserRole = "admin" | "cashier" | "employee";

export interface User {
  id: number;
  username: string;
  role: UserRole;
  branch_name: string | null;
}

export interface Branch {
  name: string;
  tax_rate: number;  // e.g. 0.10 for 10%
  color_theme: string;  // e.g. 'teal', 'indigo', 'stone'
}

export interface Ingredient {
  id?: number;
  name: string;
  stock_qty: number;
  unit: string;
  branch_name: string;
  sort_order?: number;
}

export interface MenuItemIngredient {
  id?: number;
  ingredient_id: number;
  required_qty: number;
  ingredient?: Ingredient;
}

export interface MenuItem {
  id: number;
  name: string;
  description: string;
  price_normal: number;
  price_gofood: number | null;
  price_grabfood: number | null;
  price_shopee: number | null;
  category: string;
  image_url: string;
  is_available: boolean;
  branch_name: string;
  stock_count?: number;
  cost?: number;
  addons?: string[];
  sort_order?: number;
  ingredients?: MenuItemIngredient[];
}

export interface OrderItemInput {
  menu_item_id: number;
  quantity: number;
  special_notes: string;
}

export interface OrderItemDetail extends OrderItemInput {
  id?: number;
  status?: string;
  menu_item: MenuItem;
}

export interface OrderInput {
  table_number: number;
  customer_name: string;
  phone_number: string;
  order_type: "dine-in" | "take-away";
  branch_name: string;
  items: OrderItemInput[];
}

export type OrderStatus = "cooking" | "cooked" | "on_table" | "completed" | "discounted";

export interface Order {
  id: number;
  table_number: number;
  customer_name: string;
  phone_number: string;
  order_type: "dine-in" | "take-away";
  branch_name: string;
  items: OrderItemDetail[];
  total_amount: number;
  tax_amount: number;
  status: OrderStatus;
  payment_method: "Cash" | "QRIS" | "Debit" | null;
  created_at: string;
  cooked_at?: string;
  served_at?: string;
  paid_at?: string;
  daily_order_number?: number;
  discount_amount?: number;
  discount_reason?: string | null;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface DashboardAnalytics {
  branch_name: string;
  total_revenue: number;
  total_profit: number;
  order_count: number;
}

export interface Promotion {
  id: number;
  title: string;
  description: string | null;
  image_url: string | null;
  branch_name: string | null;
  is_active: boolean;
  created_at: string;
}

export const FALLBACK_IMAGE_URL = "https://images.unsplash.com/photo-1601050690597-df056fb4ce78?w=500&auto=format&fit=crop&q=60";
