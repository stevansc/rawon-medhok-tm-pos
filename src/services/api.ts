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

  // In-flight request deduplication map
  private static inflightRequests = new Map<string, Promise<any>>();

  private static async deduplicatedRequest<T>(
    key: string,
    endpoint: string,
    options: RequestInit & { useCache?: boolean; publicEndpoint?: boolean } = {}
  ): Promise<T> {
    if (!options.method || options.method === "GET") {
      const existing = this.inflightRequests.get(key);
      if (existing) return existing as Promise<T>;

      const promise = this.request<T>(endpoint, options).finally(() => {
        this.inflightRequests.delete(key);
      });
      this.inflightRequests.set(key, promise);
      return promise;
    }
    return this.request<T>(endpoint, options);
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
    return this.deduplicatedRequest<MenuItem[]>("menu:" + (branchName || "all"), url, { useCache: true, publicEndpoint: true });
  }

  static async reorderMenuItems(items: { id: number; sort_order: number }[]): Promise<{ message: string }> {
    return this.request<{ message: string }>("/admin/menu/reorder", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items })
    });
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
    paymentMethod?: "Cash" | "QRIS" | "Debit",
    discountAmount?: number,
    discountReason?: string
  ): Promise<Order> {
    const payload: Record<string, any> = { status };
    if (paymentMethod) {
      payload["payment_method"] = paymentMethod;
    }
    if (discountAmount !== undefined) {
      payload["discount_amount"] = discountAmount;
    }
    if (discountReason) {
      payload["discount_reason"] = discountReason;
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

  static async getTransactions(branchName?: string, startDate?: string, endDate?: string): Promise<Order[]> {
    const params = new URLSearchParams();
    if (branchName) params.append("branch_name", branchName);
    if (startDate) params.append("start_date", startDate);
    if (endDate) params.append("end_date", endDate);
    const qs = params.toString();
    return this.request<Order[]>(`/admin/transactions${qs ? `?${qs}` : ""}`);
  }

  static async deleteTransaction(orderId: number): Promise<void> {
    return this.request<void>(`/admin/transactions/${orderId}`, {
      method: "DELETE"
    });
  }

  static async getBranches(): Promise<Branch[]> {
    return this.deduplicatedRequest<Branch[]>("branches", "/branches/", { useCache: true, publicEndpoint: true });
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

  static async updateMenuItem(id: number, item: Omit<MenuItem, "id">): Promise<MenuItem> {
    return this.request<MenuItem>(`/menu/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item)
    });
  }

  static async deleteMenuItem(id: number): Promise<void> {
    return this.request<void>(`/menu/${id}`, {
      method: "DELETE"
    });
  }

  static async declineOrderItem(orderId: number, itemId: number): Promise<void> {
    return this.request<void>(`/orders/${orderId}/items/${itemId}/decline`, {
      method: "POST"
    });
  }

  // --- INGREDIENTS ---
  static async getIngredients(branchName?: string): Promise<any[]> {
    const params = new URLSearchParams();
    if (branchName) params.append("branch_name", branchName);
    const qs = params.toString();
    return this.deduplicatedRequest<any[]>("ingredients:" + (branchName || "all"), `/ingredients${qs ? `?${qs}` : ""}`);
  }

  static async createIngredient(ingredient: any): Promise<any> {
    return this.request<any>("/ingredients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ingredient)
    });
  }

  static async reorderIngredients(items: { id: number; sort_order: number }[]): Promise<void> {
    return this.request<void>("/ingredients/reorder", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(items)
    });
  }

  static async updateIngredientStock(id: number, stockQty: number): Promise<any> {
    return this.request<any>(`/ingredients/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stock_qty: stockQty })
    });
  }

  static async updateIngredient(id: number, updateData: any): Promise<any> {
    return this.request<any>(`/ingredients/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updateData)
    });
  }

  static async deleteIngredient(id: number): Promise<void> {
    return this.request<void>(`/ingredients/${id}`, {
      method: "DELETE"
    });
  }

  static async getCategories(): Promise<string[]> {
    return this.deduplicatedRequest<string[]>("categories", "/categories", { useCache: true, publicEndpoint: true }).then(
      cats => (cats as any[]).map((c: any) => typeof c === 'string' ? c : c.name)
    );
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
