import {
  User, MenuItem, Order, OrderInput, OrderStatus,
  TokenResponse, DashboardAnalytics, Branch, Promotion
} from "../types";

const CONFIG_KEYS = {
  TOKEN: "rawon_pos_token",
  USER: "rawon_pos_user"
};

export class ApiService {
  static getBaseUrl(): string {
    return "/api";
  }

  static getToken(): string | null {
    return localStorage.getItem(CONFIG_KEYS.TOKEN);
  }

  static getSavedUser(): User | null {
    const userStr = localStorage.getItem(CONFIG_KEYS.USER);
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }

  static logout(): void {
    localStorage.removeItem(CONFIG_KEYS.TOKEN);
    localStorage.removeItem(CONFIG_KEYS.USER);
  }

  // --- Core API Helpers ---
  private static async request<T>(
    endpoint: string,
    options: RequestInit & { useCache?: boolean; publicEndpoint?: boolean } = {}
  ): Promise<T> {
    const baseUrl = this.getBaseUrl();
    const token = this.getToken();

    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>)
    };

    if (!options.useCache) {
      headers["Cache-Control"] = "no-cache, no-store, must-revalidate";
      headers["Pragma"] = "no-cache";
      headers["Expires"] = "0";
    }

    if (token && !options.publicEndpoint) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${baseUrl}${endpoint}`, {
      ...options,
      headers
    });

    if (!response.ok) {
      let errMsg = `Request failed with status ${response.status}`;
      try {
        const errorJson = await response.json();
        errMsg = errorJson.detail || errMsg;
      } catch {
        // fallback
      }
      throw new Error(errMsg);
    }

    return response.json() as Promise<T>;
  }

  // --- Authentication Flow ---
  static async login(username: string, password: string): Promise<User> {
    const formData = new URLSearchParams();
    formData.append("username", username);
    formData.append("password", password);

    const baseUrl = this.getBaseUrl();
    const response = await fetch(`${baseUrl}/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: formData.toString()
    });

    if (!response.ok) {
      let errMsg = "Authentication failed";
      try {
        const errorJson = await response.json();
        errMsg = errorJson.detail || errMsg;
      } catch {
        // ignore
      }
      throw new Error(errMsg);
    }

    const tokenData = (await response.json()) as TokenResponse;
    localStorage.setItem(CONFIG_KEYS.TOKEN, tokenData.access_token);

    // Fetch real user profile from backend instead of guessing from username
    const userProfile = await this.request<User>("/users/me");
    localStorage.setItem(CONFIG_KEYS.USER, JSON.stringify(userProfile));
    return userProfile;
  }

  // --- Menu Management ---
  static async getMenu(branchName?: string, category?: string, search?: string): Promise<MenuItem[]> {
    const params = new URLSearchParams();
    if (branchName && branchName !== "all") {
      params.append("branch_name", branchName);
    }
    if (category && category !== "all") {
      params.append("category", category);
    }
    if (search) {
      params.append("search", search);
    }
    const qs = params.toString();
    const url = `/menu/${qs ? `?${qs}` : ""}`;
    return this.request<MenuItem[]>(url, { useCache: true, publicEndpoint: true });
  }

  // --- Order Placement & Management ---
  static async createOrder(orderInput: OrderInput): Promise<Order> {
    return this.request<Order>("/orders/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderInput)
    });
  }

  static async getOrders(branchName: string, status?: OrderStatus): Promise<Order[]> {
    let url = `/orders/?branch_name=${encodeURIComponent(branchName)}`;
    if (status) {
      url += `&status=${status}`;
    }
    return this.request<Order[]>(url);
  }

  static async updateOrderStatus(
    orderId: number,
    status: OrderStatus,
    paymentMethod?: "Cash" | "QRIS" | "Debit"
  ): Promise<Order> {
    const payload: Record<string, string> = { status };
    if (paymentMethod) {
      payload["payment_method"] = paymentMethod;
    }

    return this.request<Order>(`/orders/${orderId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  }

  // --- Admin Dashboard & Management ---
  static async getDashboardAnalytics(branchName?: string, startDate?: string, endDate?: string): Promise<DashboardAnalytics> {
    const params = new URLSearchParams();
    if (branchName) params.append("branch_name", branchName);
    if (startDate) params.append("start_date", startDate);
    if (endDate) params.append("end_date", endDate);
    const qs = params.toString();
    return this.request<DashboardAnalytics>(`/dashboard/${qs ? `?${qs}` : ""}`);
  }

  static async getDishPerformance(branchName?: string, startDate?: string, endDate?: string): Promise<any[]> {
    const params = new URLSearchParams();
    if (branchName) params.append("branch_name", branchName);
    if (startDate) params.append("start_date", startDate);
    if (endDate) params.append("end_date", endDate);
    const qs = params.toString();
    return this.request<any[]>(`/admin/dish-performance${qs ? `?${qs}` : ""}`);
  }

  static async getBranches(): Promise<Branch[]> {
    return this.request<Branch[]>("/branches/", { useCache: true, publicEndpoint: true });
  }

  static async createBranch(branch: Branch): Promise<Branch> {
    return this.request<Branch>("/branches/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(branch)
    });
  }

  static async createMenuItem(item: Omit<MenuItem, "id">): Promise<MenuItem> {
    return this.request<MenuItem>("/menu/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item)
    });
  }

  static async updateMenuItem(itemId: number, item: Omit<MenuItem, "id">): Promise<MenuItem> {
    return this.request<MenuItem>(`/menu/${itemId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item)
    });
  }

  static async declineOrderItem(orderId: number, itemId: number): Promise<Order> {
    return this.request<Order>(`/orders/${orderId}/items/${itemId}/decline`, {
      method: "POST"
    });
  }

  static async getCategories(): Promise<string[]> {
    const cats = await this.request<{name: string, created_at: string}[]>("/categories", { useCache: true, publicEndpoint: true });
    return cats.map(c => c.name);
  }

  static async addCategory(categoryName: string): Promise<string[]> {
    const cleanCat = categoryName.trim().toLowerCase();
    if (!cleanCat) return [];

    return this.request<string[]>("/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: cleanCat })
    });
  }

  static async updateBranch(oldName: string, updatedBranch: Branch): Promise<Branch> {
    return this.request<Branch>(`/branches/${encodeURIComponent(oldName)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedBranch)
    });
  }

  // --- Promotions ---
  static async getPromotions(branchName?: string): Promise<Promotion[]> {
    const params = new URLSearchParams();
    if (branchName) params.append("branch_name", branchName);
    const qs = params.toString();
    return this.request<Promotion[]>(`/promotions${qs ? `?${qs}` : ""}`, { useCache: true, publicEndpoint: true });
  }

  static async createPromotion(promo: Omit<Promotion, "id" | "created_at">): Promise<Promotion> {
    return this.request<Promotion>("/promotions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(promo)
    });
  }
}
