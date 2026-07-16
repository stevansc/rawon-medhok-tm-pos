import { 
  User, MenuItem, Order, OrderInput, OrderStatus, 
  TokenResponse, DashboardAnalytics, Branch, UserRole 
} from "../types";

const CONFIG_KEYS = {
  TOKEN: "rawon_pos_token",
  USER: "rawon_pos_user"
};

export class ApiService {
  static getBaseUrl(): string {
    return "/api";
  }

  // Obsolete function, retained for compatibility if called elsewhere
  static getMode(): "real" | "mock" {
    return "real";
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
    options: RequestInit = {}
  ): Promise<T> {
    const baseUrl = this.getBaseUrl();
    const token = this.getToken();

    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>)
    };

    if (token) {
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
  static async login(username: string, password: string): Promise<TokenResponse> {
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

    let role: UserRole = "kitchen";
    if (username.toLowerCase().includes("admin")) {
      role = "admin";
    } else if (username.toLowerCase().includes("cashier")) {
      role = "cashier";
    }

    const branchName = username.toLowerCase().includes("siwalankerto") ? "Siwalankerto" : "Gayung Sari";

    const userDetails: User = {
      id: Math.floor(Math.random() * 1000),
      username,
      role,
      branch_name: branchName
    };

    localStorage.setItem(CONFIG_KEYS.USER, JSON.stringify(userDetails));
    return tokenData;
  }

  // --- Menu Management ---
  static async getMenu(branchName?: string, category?: string, search?: string): Promise<MenuItem[]> {
    const params = new URLSearchParams();
    if (branchName && branchName !== "all" && branchName !== "All Branches") {
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
    return this.request<MenuItem[]>(url);
  }

  // --- Order Placement & Management ---
  static async createOrder(orderInput: OrderInput): Promise<Order> {
    return this.request<Order>("/orders/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
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
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
  }

  // --- Admin App Dashboard & Branch/Menu Management ---
  static async getDashboardAnalytics(branchName?: string): Promise<DashboardAnalytics> {
    let url = "/dashboard/";
    if (branchName) {
      url += `?branch_name=${encodeURIComponent(branchName)}`;
    }
    return this.request<DashboardAnalytics>(url);
  }

  static async getDishPerformance(branchName?: string): Promise<any[]> {
    let url = "/admin/dish-performance";
    if (branchName) {
      url += `?branch_name=${encodeURIComponent(branchName)}`;
    }
    return this.request<any[]>(url);
  }

  static async getBranches(): Promise<Branch[]> {
    return this.request<Branch[]>("/branches/");
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
  
  static async declineOrderItem(orderId: number, menuItemId: number, specialNotes: string): Promise<Order> {
    return this.request<Order>(`/orders/${orderId}/items/${menuItemId}/decline`, {
      method: "POST"
    });
  }

  static async getCategories(): Promise<string[]> {
    const cats = await this.request<{name: string, created_at: string}[]>("/categories");
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
    return updatedBranch;
  }
}
