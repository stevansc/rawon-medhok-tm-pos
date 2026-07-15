export type UserRole = "admin" | "cashier" | "kitchen";

export interface User {
  id: number;
  username: string;
  role: UserRole;
  branch_name: string;
}

export interface Branch {
  name: string;
  tax_rate: number; // e.g. 0.10 for 10%
}

export interface MenuItem {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url: string;
  is_available: boolean;
  branch_name: string;
  stock_count?: number;
  cost?: number;
  addons?: string[];
}

export interface OrderItemInput {
  menu_item_id: number;
  quantity: number;
  special_notes: string;
}

export interface OrderItemDetail extends OrderItemInput {
  id?: number;
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

export type OrderStatus = "pending" | "accepted" | "cooking" | "on_table" | "completed";

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
