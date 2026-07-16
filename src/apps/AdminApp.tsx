import React, { useState, useEffect } from "react";
import { MenuItem, Branch, DashboardAnalytics } from "../types";
import { FALLBACK_IMAGE_URL } from "../types";
import { ApiService } from "../services/api";
import { useAuth } from "../hooks/useAuth";
import LoginScreen from "../components/LoginScreen";
import {
  Building, Settings, Plus, Edit,
  TrendingUp, CircleDollarSign, ShoppingBag, LogOut,
  AlertCircle, Sparkles, ChefHat, ToggleLeft, ToggleRight, Percent,
  Search, ArrowUpDown, Flame
} from "lucide-react";

export default function AdminApp() {
  const auth = useAuth({ allowedRoles: ["admin"] });

  // Active section tab
  const [activeTab, setActiveTab] = useState<"dashboard" | "branches" | "menu">("dashboard");

  // Admin state
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>("");
  const [branches, setBranches] = useState<Branch[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Management Form states
  const [newBranchName, setNewBranchName] = useState("");
  const [newBranchTax, setNewBranchTax] = useState("10");
  const [newBranchColor, setNewBranchColor] = useState("stone");

  // Branch editing states
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [branchFormName, setBranchFormName] = useState("");
  const [branchFormTax, setBranchFormTax] = useState("10");
  const [branchFormColor, setBranchFormColor] = useState("stone");

  // Menu editor form states
  const [editingMenuItem, setEditingMenuItem] = useState<MenuItem | null>(null);
  const [menuFormName, setMenuFormName] = useState("");
  const [menuFormPrice, setMenuFormPrice] = useState("");
  const [menuFormDesc, setMenuFormDesc] = useState("");
  const [menuFormCategory, setMenuFormCategory] = useState<string>("food");
  const [menuFormBranch, setMenuFormBranch] = useState("");
  const [menuFormAvailable, setMenuFormAvailable] = useState(true);
  const [menuFormImage, setMenuFormImage] = useState("");
  const [menuFormStock, setMenuFormStock] = useState("15");
  const [menuFormCost, setMenuFormCost] = useState("10000");
  const [menuFormAddons, setMenuFormAddons] = useState("");

  // Dynamic Categories states
  const [categories, setCategories] = useState<string[]>([]);
  const [newCategoryName, setNewCategoryName] = useState("");

  // Dashboard timeframe filter — drives real API start_date/end_date
  const [analyticsTimeframe, setAnalyticsTimeframe] = useState<"daily" | "weekly" | "monthly" | "yearly">("monthly");

  // Backend aggregated dish performance
  const [dishPerformance, setDishPerformance] = useState<any[]>([]);

  // Dashboard dish analysis filter states
  const [dishSearchQuery, setDishSearchQuery] = useState("");
  const [menuSearchQuery, setMenuSearchQuery] = useState("");
  const [dishSortField, setDishSortField] = useState<"soldCount" | "revenue" | "profit" | "stock">("soldCount");
  const [dishSortOrder, setDishSortOrder] = useState<"asc" | "desc">("desc");
  const [dishCategoryFilter, setDishCategoryFilter] = useState("all");

  // Compute date range from timeframe
  const getDateRange = (): { startDate?: string; endDate?: string } => {
    const now = new Date();
    let start: Date | undefined;
    if (analyticsTimeframe === "daily") {
      start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    } else if (analyticsTimeframe === "weekly") {
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (analyticsTimeframe === "monthly") {
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else {
      start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    }
    return {
      startDate: start?.toISOString(),
      endDate: now.toISOString()
    };
  };

  // Fetch admin content
  const loadAdminData = async () => {
    if (!auth.user) return;
    try {
      setIsLoading(true);
      setError(null);

      const { startDate, endDate } = getDateRange();

      const [fetchedAnalytics, fetchedBranches, fetchedMenu, fetchedCats, fetchedPerformance] = await Promise.all([
        ApiService.getDashboardAnalytics(selectedBranchFilter || undefined, startDate, endDate),
        ApiService.getBranches(),
        ApiService.getMenu(selectedBranchFilter || undefined),
        ApiService.getCategories(),
        ApiService.getDishPerformance(selectedBranchFilter || undefined, startDate, endDate)
      ]);

      setAnalytics(fetchedAnalytics);
      setBranches(fetchedBranches);
      setMenuItems(fetchedMenu);
      setCategories(fetchedCats);
      setDishPerformance(fetchedPerformance);

      if (!menuFormBranch && fetchedBranches.length > 0) {
        setMenuFormBranch(fetchedBranches[0].name);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load administration data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (auth.user) {
      loadAdminData();
    }
  }, [auth.user, selectedBranchFilter, analyticsTimeframe]);

  // Create new branch
  const handleAddBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName.trim()) return;

    try {
      setError(null);
      const rate = parseFloat(newBranchTax) / 100;
      await ApiService.createBranch({
        name: newBranchName,
        tax_rate: isNaN(rate) ? 0.10 : rate,
        color_theme: newBranchColor
      });
      setNewBranchName("");
      loadAdminData();
      alert("New branch configured successfully.");
    } catch (err: any) {
      alert(`Failed to configure branch: ${err.message}`);
    }
  };

  // Toggle MenuItem availability
  const handleToggleMenuAvailability = async (item: MenuItem) => {
    try {
      const updatedItem = {
        name: item.name,
        price: item.price,
        description: item.description,
        category: item.category,
        branch_name: item.branch_name,
        is_available: !item.is_available,
        image_url: item.image_url,
        stock_count: item.stock_count,
        cost: item.cost
      };
      await ApiService.updateMenuItem(item.id, updatedItem);
      loadAdminData();
    } catch (err: any) {
      alert(`Failed to update item state: ${err.message}`);
    }
  };

  // Reset menu form
  const resetMenuForm = () => {
    setEditingMenuItem(null);
    setMenuFormName("");
    setMenuFormPrice("");
    setMenuFormDesc("");
    setMenuFormImage("");
    setMenuFormStock("15");
    setMenuFormCost("10000");
    setMenuFormAddons("");
  };

  // Submit Menu Item Edit/Create Form
  const handleMenuFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!menuFormName || !menuFormPrice || !menuFormBranch) {
      alert("Missing required fields.");
      return;
    }

    const stockVal = parseInt(menuFormStock, 10);
    const finalStock = isNaN(stockVal) ? 15 : stockVal;
    const finalCost = parseFloat(menuFormCost) || Math.round(parseFloat(menuFormPrice) * 0.5);
    const finalAddons = menuFormAddons.split(",").map(s => s.trim()).filter(s => s.length > 0);

    const payload = {
      name: menuFormName,
      price: parseFloat(menuFormPrice),
      description: menuFormDesc,
      category: menuFormCategory,
      branch_name: menuFormBranch,
      is_available: finalStock > 0 ? menuFormAvailable : false,
      image_url: menuFormImage || FALLBACK_IMAGE_URL,
      stock_count: finalStock,
      cost: finalCost,
      addons: finalAddons
    };

    try {
      setError(null);
      if (editingMenuItem) {
        await ApiService.updateMenuItem(editingMenuItem.id, payload);
        alert("Dish updated successfully.");
      } else {
        await ApiService.createMenuItem(payload);
        alert("New dish added successfully.");
      }
      resetMenuForm();
      loadAdminData();
    } catch (err: any) {
      alert(`Menu modification failed: ${err.message}`);
    }
  };

  const handleEditMenuItemSelect = (item: MenuItem) => {
    setEditingMenuItem(item);
    setMenuFormName(item.name);
    setMenuFormPrice(item.price.toString());
    setMenuFormDesc(item.description);
    setMenuFormCategory(item.category);
    setMenuFormBranch(item.branch_name);
    setMenuFormAvailable(item.is_available);
    setMenuFormImage(item.image_url);
    setMenuFormStock(item.stock_count !== undefined ? item.stock_count.toString() : "15");
    setMenuFormCost(item.cost !== undefined ? item.cost.toString() : Math.round(item.price * 0.5).toString());
    setMenuFormAddons(item.addons ? item.addons.join(", ") : "");
  };

  const handleAddCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    try {
      const updatedCats = await ApiService.addCategory(newCategoryName);
      setCategories(updatedCats);
      setMenuFormCategory(newCategoryName.trim().toLowerCase());
      setNewCategoryName("");
      alert(`Category "${newCategoryName}" added successfully.`);
    } catch (err: any) {
      alert(`Failed to add category: ${err.message}`);
    }
  };

  const handleEditBranchSelect = (branch: Branch) => {
    setEditingBranch(branch);
    setBranchFormName(branch.name);
    setBranchFormTax(Math.round(branch.tax_rate * 100).toString());
    setBranchFormColor(branch.color_theme || "stone");
  };

  const handleUpdateBranchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBranch || !branchFormName.trim()) return;
    try {
      const taxRate = parseFloat(branchFormTax) / 100;
      await ApiService.updateBranch(editingBranch.name, {
        name: branchFormName.trim(),
        tax_rate: isNaN(taxRate) ? 0.10 : taxRate,
        color_theme: branchFormColor
      });
      setEditingBranch(null);
      loadAdminData();
      alert("Branch details updated successfully.");
    } catch (err: any) {
      alert(`Failed to update branch: ${err.message}`);
    }
  };

  // Helper: get branch color classes
  const getBranchColorClasses = (branchName: string): { bg: string; text: string; border: string } => {
    const branch = branches.find(b => b.name === branchName);
    const theme = branch?.color_theme || "stone";
    const map: Record<string, { bg: string; text: string; border: string }> = {
      teal: { bg: "bg-teal-50", text: "text-teal-800", border: "border-teal-200" },
      indigo: { bg: "bg-indigo-50", text: "text-indigo-800", border: "border-indigo-200" },
      orange: { bg: "bg-orange-50", text: "text-orange-800", border: "border-orange-200" },
      emerald: { bg: "bg-emerald-50", text: "text-emerald-800", border: "border-emerald-200" },
      stone: { bg: "bg-stone-100", text: "text-stone-800", border: "border-stone-200" },
    };
    return map[theme] || map.stone;
  };

  if (!auth.isAuthenticated) {
    return (
      <LoginScreen
        title="HQ Admin Center"
        subtitle="Rawon TM Executive Hub"
        icon={<Settings className="w-10 h-10 text-white animate-spin-slow" />}
        buttonText="Enter Headquarters"
        loadingText="Logging in..."
        credentialHint={{ username: "admin", password: "admin123" }}
        username={auth.username}
        setUsername={auth.setUsername}
        password={auth.password}
        setPassword={auth.setPassword}
        isLoggingIn={auth.isLoggingIn}
        loginError={auth.loginError}
        handleLogin={auth.handleLogin}
      />
    );
  }

  // Filter & sort dish performance data
  const filteredPerformance = dishPerformance.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(dishSearchQuery.toLowerCase());
    const matchesCategory = dishCategoryFilter === "all" || item.category === dishCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  const sortedPerformance = [...filteredPerformance].sort((a, b) => {
    const valA = a[dishSortField] ?? 0;
    const valB = b[dishSortField] ?? 0;
    if (valA < valB) return dishSortOrder === "asc" ? -1 : 1;
    if (valA > valB) return dishSortOrder === "asc" ? 1 : -1;
    return 0;
  });

  return (
    <div className="bg-stone-50 text-stone-900 min-h-screen font-sans flex flex-col">
      {/* Admin Header */}
      <header className="bg-stone-900 px-6 py-4 border-b-4 border-orange-600 flex flex-col md:flex-row md:items-center justify-between gap-4 text-white shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-orange-600 p-2.5 rounded-none text-white">
            <Settings className="w-6 h-6 animate-spin-slow" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-2 uppercase">
              <span>Admin Management HQ</span>
              <span className="text-[10px] bg-orange-500 text-white px-2.5 py-0.5 rounded-none font-bold uppercase tracking-widest">Enterprise Mode</span>
            </h1>
            <p className="text-[10px] text-stone-400 font-mono uppercase mt-0.5 flex items-center gap-1.5">
              <span>Branch Controller Portal • Operator: {auth.user!.username}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end md:self-auto">
          <div className="flex items-center gap-2 bg-stone-950 px-3 py-1.5 rounded-none border border-stone-800 text-xs font-mono">
            <Building className="w-3.5 h-3.5 text-orange-500" />
            <span className="text-stone-400 font-bold uppercase text-[9px] tracking-wider">Branch:</span>
            <select
              value={selectedBranchFilter}
              onChange={(e) => setSelectedBranchFilter(e.target.value)}
              className="bg-transparent text-white focus:outline-none border-0 p-0 font-bold hover:text-orange-500 transition-colors cursor-pointer text-xs"
            >
              <option value="" className="bg-stone-900 text-white">All Branches Combined</option>
              {branches.map(b => (
                <option key={b.name} value={b.name} className="bg-stone-900 text-white">{b.name}</option>
              ))}
            </select>
          </div>

          <button
            onClick={auth.handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-none text-xs font-bold uppercase tracking-wider transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Tabs navigation */}
      <div className="bg-stone-900 px-6 border-b border-stone-850 flex gap-4 shrink-0 text-white">
        {[
          { id: "dashboard", label: "📈 Dashboard Analytics" },
          { id: "branches", label: "🏬 Branch Settings" },
          { id: "menu", label: "🍳 Dish Menu Editor" }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id as any);
              setEditingMenuItem(null);
            }}
            className={`py-3.5 px-1 border-b-2 font-bold text-xs uppercase tracking-wider transition-all rounded-none ${
              activeTab === tab.id
                ? "border-orange-500 text-orange-500 font-black"
                : "border-transparent text-stone-400 hover:text-stone-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Board content */}
      <div className="flex-1 p-6 overflow-y-auto">
        {isLoading && (
          <div className="text-center py-12 text-stone-500 font-mono">
            <p className="animate-pulse text-xs uppercase tracking-widest font-extrabold text-orange-600">Loading enterprise data...</p>
          </div>
        )}

        {error && (
          <div className="p-3 mb-6 bg-red-100 border border-red-200 rounded-none text-red-800 text-xs flex items-center gap-2 max-w-lg mx-auto font-mono">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {/* 1. DASHBOARD VIEW — Real API data */}
        {activeTab === "dashboard" && analytics && (
          <div className="space-y-6">
            {/* Timeframe selector */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 rounded-none border-2 border-stone-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] gap-3">
              <div>
                <h4 className="font-extrabold text-sm text-stone-900 uppercase tracking-wider">Timeline Analytical Window</h4>
                <p className="text-[10px] text-stone-500 font-mono uppercase mt-0.5">Filter by date range — powered by backend aggregation</p>
              </div>
              <div className="flex gap-1 bg-stone-100 p-1 border border-stone-200 self-stretch sm:self-auto">
                {(["daily", "weekly", "monthly", "yearly"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setAnalyticsTimeframe(t)}
                    className={`flex-1 sm:flex-initial px-3 py-1.5 font-bold text-[10px] uppercase tracking-wider font-mono transition-all ${
                      analyticsTimeframe === t
                        ? "bg-stone-900 text-white"
                        : "text-stone-500 hover:text-stone-900 hover:bg-stone-200"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Bento Grid top stats — Real API data */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="bg-white border-2 border-stone-900 rounded-none p-6 relative overflow-hidden flex flex-col justify-between shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] text-stone-900 animate-scale-in">
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[10px] font-extrabold text-stone-500 uppercase tracking-widest font-mono">Gross Revenue</span>
                    <div className="bg-orange-100 text-orange-600 p-2 rounded-none border border-orange-200">
                      <CircleDollarSign className="w-5 h-5" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-black text-stone-900 font-sans tracking-tight">
                    Rp {analytics.total_revenue.toLocaleString("id-ID")}
                  </h3>
                  <p className="text-[10px] text-stone-400 mt-1 font-mono uppercase tracking-wider">Based on {analyticsTimeframe} timeline</p>
                </div>
                <div className="absolute right-[-20px] bottom-[-20px] opacity-5">
                  <CircleDollarSign className="w-24 h-24 text-stone-900" />
                </div>
              </div>

              <div className="bg-white border-2 border-stone-900 rounded-none p-6 relative overflow-hidden flex flex-col justify-between shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] text-stone-900 animate-scale-in">
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[10px] font-extrabold text-stone-500 uppercase tracking-widest font-mono">Estimated Profit</span>
                    <div className="bg-emerald-100 text-emerald-600 p-2 rounded-none border border-emerald-200">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-black text-emerald-700 font-sans tracking-tight">
                    Rp {analytics.total_profit.toLocaleString("id-ID")}
                  </h3>
                  <p className="text-[10px] text-stone-400 mt-1 font-mono uppercase tracking-wider">Revenue minus recipe cost</p>
                </div>
                <div className="absolute right-[-20px] bottom-[-20px] opacity-5">
                  <TrendingUp className="w-24 h-24 text-stone-900" />
                </div>
              </div>

              <div className="bg-white border-2 border-stone-900 rounded-none p-6 relative overflow-hidden flex flex-col justify-between shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] text-stone-900 animate-scale-in">
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[10px] font-extrabold text-stone-500 uppercase tracking-widest font-mono">Register Volume</span>
                    <div className="bg-stone-100 text-stone-900 p-2 rounded-none border border-stone-300">
                      <ShoppingBag className="w-5 h-5" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-black text-stone-900 font-sans tracking-tight">
                    {analytics.order_count} tickets
                  </h3>
                  <p className="text-[10px] text-stone-400 mt-1 font-mono uppercase tracking-wider">Completed transactions</p>
                </div>
                <div className="absolute right-[-20px] bottom-[-20px] opacity-5">
                  <ShoppingBag className="w-24 h-24 text-stone-900" />
                </div>
              </div>
            </div>

            {/* Dish Menu Performance Analysis */}
            <div className="bg-white border-2 border-stone-900 rounded-none p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] text-stone-900 animate-scale-in">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200 pb-4 mb-6">
                <div>
                  <h4 className="font-black text-sm text-stone-900 uppercase tracking-wider flex items-center gap-2">
                    <ChefHat className="w-4 h-4 text-orange-600" />
                    <span>Dish Menu Performance Analysis</span>
                  </h4>
                  <p className="text-xs text-stone-500 mt-0.5">Analyze order volumes, margins, profits, and stock levels.</p>
                </div>
                <span className="text-[10px] font-mono px-2.5 py-1 bg-teal-50 text-teal-700 rounded-none border border-teal-200 font-bold uppercase tracking-wider self-start md:self-auto">
                  {sortedPerformance.length} items evaluated
                </span>
              </div>

              {/* Filter Toolbar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-3.5" />
                  <input
                    type="text"
                    placeholder="Search dishes..."
                    value={dishSearchQuery}
                    onChange={(e) => setDishSearchQuery(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-none pl-8 pr-4 py-2.5 text-xs text-stone-900 focus:outline-none focus:border-orange-600 font-mono"
                  />
                </div>

                <div className="flex items-center gap-2 bg-stone-50 border border-stone-300 px-3 py-2 text-xs font-mono">
                  <span className="text-stone-400 font-bold uppercase text-[9px] tracking-wider shrink-0">Category:</span>
                  <select
                    value={dishCategoryFilter}
                    onChange={(e) => setDishCategoryFilter(e.target.value)}
                    className="w-full bg-transparent text-stone-900 focus:outline-none border-0 p-0 font-bold cursor-pointer text-xs uppercase"
                  >
                    <option value="all">All Categories</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2 bg-stone-50 border border-stone-300 px-3 py-2 text-xs font-mono">
                  <span className="text-stone-400 font-bold uppercase text-[9px] tracking-wider shrink-0">Sort By:</span>
                  <select
                    value={`${dishSortField}-${dishSortOrder}`}
                    onChange={(e) => {
                      const [field, order] = e.target.value.split("-") as [any, any];
                      setDishSortField(field);
                      setDishSortOrder(order);
                    }}
                    className="w-full bg-transparent text-stone-900 focus:outline-none border-0 p-0 font-bold cursor-pointer text-xs"
                  >
                    <option value="soldCount-desc">Highest Sales Volume</option>
                    <option value="soldCount-asc">Lowest Sales Volume</option>
                    <option value="revenue-desc">Highest Gross Revenue</option>
                    <option value="profit-desc">Highest Total Profit</option>
                    <option value="stock-asc">Lowest Stock Level</option>
                  </select>
                </div>
              </div>

              {/* Performance Data Table */}
              <div className="overflow-x-auto border border-stone-200">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-stone-100 border-b-2 border-stone-200 font-mono text-[10px] text-stone-500 uppercase font-black">
                      <th className="p-3">Dish / Menu Detail</th>
                      <th className="p-3 text-right">
                        <button type="button" onClick={() => { setDishSortField("soldCount"); setDishSortOrder(dishSortField === "soldCount" && dishSortOrder === "desc" ? "asc" : "desc"); }} className="inline-flex items-center gap-1 font-bold hover:text-stone-900 transition-colors cursor-pointer uppercase">
                          <span>Vol Sold</span><ArrowUpDown className="w-3 h-3 text-stone-400" />
                        </button>
                      </th>
                      <th className="p-3 text-right">
                        <button type="button" onClick={() => { setDishSortField("revenue"); setDishSortOrder(dishSortField === "revenue" && dishSortOrder === "desc" ? "asc" : "desc"); }} className="inline-flex items-center gap-1 font-bold hover:text-stone-900 transition-colors cursor-pointer uppercase">
                          <span>Revenue</span><ArrowUpDown className="w-3 h-3 text-stone-400" />
                        </button>
                      </th>
                      <th className="p-3 text-right">
                        <button type="button" onClick={() => { setDishSortField("profit"); setDishSortOrder(dishSortField === "profit" && dishSortOrder === "desc" ? "asc" : "desc"); }} className="inline-flex items-center gap-1 font-bold hover:text-stone-900 transition-colors cursor-pointer uppercase">
                          <span>Profit / Margin</span><ArrowUpDown className="w-3 h-3 text-stone-400" />
                        </button>
                      </th>
                      <th className="p-3 text-right">
                        <button type="button" onClick={() => { setDishSortField("stock"); setDishSortOrder(dishSortField === "stock" && dishSortOrder === "desc" ? "asc" : "desc"); }} className="inline-flex items-center gap-1 font-bold hover:text-stone-900 transition-colors cursor-pointer uppercase">
                          <span>Stock Status</span><ArrowUpDown className="w-3 h-3 text-stone-400" />
                        </button>
                      </th>
                      <th className="p-3 font-bold uppercase text-[9px] text-stone-500">Popular Addon</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-150">
                    {sortedPerformance.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-stone-400 font-mono text-xs uppercase">
                          No matching dishes analyzed in this timeframe window.
                        </td>
                      </tr>
                    ) : (
                      sortedPerformance.map((item) => {
                        const isLowStock = item.stock !== undefined && item.stock <= 5;
                        const isOut = item.stock !== undefined && item.stock === 0;
                        const isPopular = item.soldCount >= 5;
                        const highMargin = item.marginPercent >= 50;
                        const branchColors = getBranchColorClasses(item.branch_name);

                        return (
                          <tr key={item.id} className="hover:bg-stone-50 transition-colors">
                            <td className="p-3">
                              <div className="flex gap-2.5 items-start">
                                <div>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <p className="font-bold text-stone-900 uppercase text-[11px] leading-tight">{item.name}</p>
                                    {isPopular && (
                                      <span className="text-[7px] font-black uppercase px-1 py-0.5 bg-orange-600 text-white rounded-none flex items-center gap-0.5 leading-none">
                                        <Flame className="w-2.5 h-2.5 text-white" /><span>HOT</span>
                                      </span>
                                    )}
                                    {highMargin && item.soldCount > 0 && (
                                      <span className="text-[7px] font-black uppercase px-1 py-0.5 bg-emerald-700 text-white rounded-none leading-none">HERO</span>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap gap-1 mt-1 font-mono text-[9px] uppercase">
                                    <span className="bg-stone-100 text-stone-600 px-1 py-0.2 border border-stone-200">{item.category}</span>
                                    <span className={`px-1 py-0.2 border leading-none font-bold ${branchColors.bg} ${branchColors.text} ${branchColors.border}`}>{item.branch_name}</span>
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-stone-900">
                              {item.soldCount}<span className="text-[9px] text-stone-400 font-normal ml-0.5"> pcs</span>
                            </td>
                            <td className="p-3 text-right font-mono font-semibold text-stone-900">
                              Rp {item.revenue.toLocaleString("id-ID")}
                            </td>
                            <td className="p-3 text-right font-mono">
                              <div className="font-bold text-emerald-700">Rp {item.profit.toLocaleString("id-ID")}</div>
                              {item.revenue > 0 ? (
                                <div className="text-[9px] font-semibold text-stone-500">
                                  Margin: <span className={item.marginPercent >= 50 ? "text-emerald-600 font-bold" : "text-stone-600 font-bold"}>{item.marginPercent}%</span>
                                </div>
                              ) : (
                                <div className="text-[9px] text-stone-400">-</div>
                              )}
                            </td>
                            <td className="p-3 text-right font-mono font-semibold">
                              {isOut ? (
                                <span className="text-[9px] font-black uppercase px-1.5 py-0.5 bg-red-100 text-red-700 border border-red-200 rounded-none">OUT</span>
                              ) : isLowStock ? (
                                <div className="text-red-600 font-black flex flex-col items-end">
                                  <span>{item.stock} left</span>
                                  <span className="text-[7px] text-red-500 font-black uppercase leading-none">CRITICAL</span>
                                </div>
                              ) : (
                                <span className="text-stone-600">{item.stock ?? 0} units</span>
                              )}
                            </td>
                            <td className="p-3 font-mono text-[10px] text-stone-700 capitalize">{item.topAddon}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Analysis Insights */}
              {sortedPerformance.length > 0 && (
                <div className="mt-6 p-4 bg-orange-50/50 border border-orange-100 rounded-none grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex gap-2 items-start">
                    <Sparkles className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-stone-900 uppercase">Top Performer</p>
                      {(() => {
                        const topDish = [...sortedPerformance].sort((a, b) => b.soldCount - a.soldCount)[0];
                        if (topDish && topDish.soldCount > 0) {
                          return (
                            <p className="text-xs text-stone-600 mt-1">
                              <strong>{topDish.name}</strong> ({topDish.branch_name}) with <strong>{topDish.soldCount} sold</strong>, profit <strong>Rp {topDish.profit.toLocaleString("id-ID")}</strong>.
                            </p>
                          );
                        }
                        return <p className="text-xs text-stone-500 mt-1">No sales logged yet.</p>;
                      })()}
                    </div>
                  </div>
                  <div className="flex gap-2 items-start border-t md:border-t-0 md:border-l border-stone-200 pt-3 md:pt-0 md:pl-4">
                    <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-stone-900 uppercase">Stock Alerts</p>
                      {(() => {
                        const lowStockItems = sortedPerformance.filter(i => i.stock !== undefined && i.stock <= 5);
                        if (lowStockItems.length > 0) {
                          return (
                            <p className="text-xs text-stone-600 mt-1">
                              <strong>{lowStockItems.length} items</strong> with low inventory: <strong>{lowStockItems.map(i => i.name).slice(0, 3).join(", ")}{lowStockItems.length > 3 ? "..." : ""}</strong>.
                            </p>
                          );
                        }
                        return <p className="text-xs text-stone-500 mt-1">All inventory levels healthy.</p>;
                      })()}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 2. BRANCH CONFIGURATION VIEW */}
        {activeTab === "branches" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white border-2 border-stone-900 rounded-none p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] text-stone-900">
              {editingBranch ? (
                <>
                  <h4 className="font-black text-sm text-stone-900 mb-4 flex items-center gap-2 uppercase tracking-wider border-b border-stone-200 pb-2">
                    <Edit className="w-4 h-4 text-orange-600" />
                    <span>Update Branch: {editingBranch.name}</span>
                  </h4>
                  <form onSubmit={handleUpdateBranchSubmit} className="space-y-4 text-sm">
                    <div>
                      <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest font-mono mb-1">Branch Name</label>
                      <input type="text" required value={branchFormName} onChange={(e) => setBranchFormName(e.target.value)} className="w-full bg-stone-50 border border-stone-300 rounded-none px-4 py-3 text-stone-900 focus:outline-none focus:border-orange-600 text-xs font-mono" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest font-mono mb-1">Tax rate (%)</label>
                      <div className="relative">
                        <input type="number" required min="0" max="50" value={branchFormTax} onChange={(e) => setBranchFormTax(e.target.value)} className="w-full bg-stone-50 border border-stone-300 rounded-none pl-4 pr-10 py-3 text-stone-900 focus:outline-none focus:border-orange-600 text-xs font-mono" />
                        <Percent className="w-3.5 h-3.5 text-stone-500 absolute right-3.5 top-3.5" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest font-mono mb-1">Color Theme</label>
                      <select value={branchFormColor} onChange={(e) => setBranchFormColor(e.target.value)} className="w-full bg-stone-50 border border-stone-300 rounded-none px-4 py-3 text-stone-900 focus:outline-none focus:border-orange-600 text-xs font-mono font-bold cursor-pointer">
                        {["stone", "teal", "indigo", "orange", "emerald"].map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <button type="submit" className="flex-1 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-none font-bold text-xs uppercase tracking-widest transition-all shadow-md">Save Details</button>
                      <button type="button" onClick={() => setEditingBranch(null)} className="px-4 py-3 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-none font-bold text-xs uppercase">Cancel</button>
                    </div>
                  </form>
                </>
              ) : (
                <>
                  <h4 className="font-black text-sm text-stone-900 mb-4 flex items-center gap-2 uppercase tracking-wider border-b border-stone-200 pb-2">
                    <Plus className="w-4 h-4 text-orange-600 animate-pulse" />
                    <span>Configure New Branch Outlet</span>
                  </h4>
                  <form onSubmit={handleAddBranch} className="space-y-4 text-sm">
                    <div>
                      <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest font-mono mb-1">Branch Name</label>
                      <input type="text" required placeholder="e.g. Gayung Sari" value={newBranchName} onChange={(e) => setNewBranchName(e.target.value)} className="w-full bg-stone-50 border border-stone-300 rounded-none px-4 py-3 text-stone-900 focus:outline-none focus:border-orange-600 text-xs font-mono" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest font-mono mb-1">Tax rate (%)</label>
                      <div className="relative">
                        <input type="number" required min="0" max="50" placeholder="e.g. 10" value={newBranchTax} onChange={(e) => setNewBranchTax(e.target.value)} className="w-full bg-stone-50 border border-stone-300 rounded-none pl-4 pr-10 py-3 text-stone-900 focus:outline-none focus:border-orange-600 text-xs font-mono" />
                        <Percent className="w-3.5 h-3.5 text-stone-500 absolute right-3.5 top-3.5" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest font-mono mb-1">Color Theme</label>
                      <select value={newBranchColor} onChange={(e) => setNewBranchColor(e.target.value)} className="w-full bg-stone-50 border border-stone-300 rounded-none px-4 py-3 text-stone-900 focus:outline-none focus:border-orange-600 text-xs font-mono font-bold cursor-pointer">
                        {["stone", "teal", "indigo", "orange", "emerald"].map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <button type="submit" className="w-full py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-none font-bold text-xs uppercase tracking-widest transition-all shadow-md active:scale-95">Save and Sync Branch</button>
                  </form>
                </>
              )}
            </div>

            <div className="bg-white border-2 border-stone-900 rounded-none p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] text-stone-900">
              <h4 className="font-black text-sm text-stone-900 mb-4 flex items-center gap-2 uppercase tracking-wider border-b border-stone-200 pb-2">
                <Building className="w-4 h-4 text-orange-600" />
                <span>Synchronized Branches</span>
              </h4>
              <div className="space-y-3">
                {branches.map(b => (
                  <div key={b.name} className="p-4 bg-stone-50 rounded-none border border-stone-250 flex items-center justify-between hover:border-stone-900 transition-all group">
                    <div>
                      <p className="font-bold text-sm text-stone-900 uppercase">{b.name}</p>
                      <p className="text-[10px] text-stone-400 mt-0.5 font-mono uppercase">Theme: {b.color_theme}</p>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <div className="bg-orange-50 text-orange-700 border border-orange-200 px-3 py-1.5 rounded-none text-xs font-mono font-bold">
                        Tax: {Math.round(b.tax_rate * 100)}%
                      </div>
                      <button onClick={() => handleEditBranchSelect(b)} className="p-2 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-none transition-all" title="Edit branch">
                        <Edit className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 3. MENU DISH EDITOR VIEW */}
        {activeTab === "menu" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="bg-white border-2 border-stone-900 rounded-none p-6 lg:col-span-1 h-fit sticky top-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] text-stone-900">
              <h4 className="font-black text-sm text-stone-900 mb-4 flex items-center gap-2 uppercase tracking-wider border-b border-stone-200 pb-2">
                <ChefHat className="w-4 h-4 text-orange-600" />
                <span>{editingMenuItem ? "Modify Menu Dish" : "Create New Menu Dish"}</span>
              </h4>

              <form onSubmit={handleMenuFormSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest font-mono mb-1">Dish Name</label>
                  <input type="text" required placeholder="e.g. Rawon Super Pedas" value={menuFormName} onChange={(e) => setMenuFormName(e.target.value)} className="w-full bg-stone-50 border border-stone-300 rounded-none px-3 py-2.5 text-stone-900 focus:outline-none focus:border-orange-600 text-xs font-mono" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest font-mono mb-1">Price (Rp)</label>
                    <input type="number" required placeholder="e.g. 45000" value={menuFormPrice} onChange={(e) => setMenuFormPrice(e.target.value)} className="w-full bg-stone-50 border border-stone-300 rounded-none px-3 py-2.5 text-stone-900 focus:outline-none focus:border-orange-600 text-xs font-mono" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest font-mono mb-1">Category</label>
                    <select value={menuFormCategory} onChange={(e) => setMenuFormCategory(e.target.value)} className="w-full bg-stone-50 border border-stone-300 rounded-none px-3 py-2.5 text-stone-900 focus:outline-none focus:border-orange-600 text-xs cursor-pointer font-bold font-mono">
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat.toUpperCase()}</option>
                      ))}
                    </select>
                    <div className="mt-2 p-2 bg-stone-50 border border-stone-200">
                      <label className="block text-[8px] font-bold text-stone-500 uppercase tracking-widest font-mono mb-1">Create custom category</label>
                      <div className="flex gap-1">
                        <input type="text" placeholder="e.g. snack" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} className="flex-1 bg-white border border-stone-300 rounded-none px-2 py-1 text-stone-900 text-[10px] font-mono focus:outline-none focus:border-orange-600" />
                        <button type="button" onClick={handleAddCategorySubmit} className="px-2.5 py-1 bg-stone-900 hover:bg-stone-850 text-white rounded-none text-[9px] font-bold uppercase tracking-wider">Add</button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest font-mono mb-1">Stock (Qty)</label>
                    <input type="number" required min="0" value={menuFormStock} onChange={(e) => setMenuFormStock(e.target.value)} className="w-full bg-stone-50 border border-stone-300 rounded-none px-3 py-2.5 text-stone-900 focus:outline-none focus:border-orange-600 text-xs font-mono" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest font-mono mb-1">Cost (Rp)</label>
                    <input type="number" required min="0" value={menuFormCost} onChange={(e) => setMenuFormCost(e.target.value)} className="w-full bg-stone-50 border border-stone-300 rounded-none px-3 py-2.5 text-stone-900 focus:outline-none focus:border-orange-600 text-xs font-mono" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest font-mono mb-1">Target Branch</label>
                  <select value={menuFormBranch} onChange={(e) => setMenuFormBranch(e.target.value)} className="w-full bg-stone-50 border border-stone-300 rounded-none px-3 py-2.5 text-stone-900 focus:outline-none focus:border-orange-600 text-xs cursor-pointer font-bold font-mono">
                    {branches.map(b => (
                      <option key={b.name} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest font-mono mb-1">Description</label>
                  <textarea rows={2} placeholder="Short description..." value={menuFormDesc} onChange={(e) => setMenuFormDesc(e.target.value)} className="w-full bg-stone-50 border border-stone-300 rounded-none p-3 text-stone-900 focus:outline-none focus:border-orange-600 text-xs font-mono" />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest font-mono mb-1">Image URL</label>
                  <input type="url" placeholder="https://..." value={menuFormImage} onChange={(e) => setMenuFormImage(e.target.value)} className="w-full bg-stone-50 border border-stone-300 rounded-none px-3 py-2.5 text-stone-900 focus:outline-none focus:border-orange-600 text-xs font-mono" />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest font-mono mb-1">Addon Options (comma-separated)</label>
                  <input type="text" placeholder="e.g. sambal, kerupuk" value={menuFormAddons} onChange={(e) => setMenuFormAddons(e.target.value)} className="w-full bg-stone-50 border border-stone-300 rounded-none px-3 py-2.5 text-stone-900 focus:outline-none focus:border-orange-600 text-xs font-mono" />
                </div>

                <div className="flex items-center justify-between p-3 bg-stone-50 rounded-none border border-stone-300">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-600 font-mono">Available for orders</span>
                  <button type="button" onClick={() => setMenuFormAvailable(!menuFormAvailable)} className="text-orange-600 hover:text-orange-500">
                    {menuFormAvailable ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8 text-stone-400" />}
                  </button>
                </div>

                <div className="flex gap-2">
                  <button type="submit" className="flex-1 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-none font-bold text-xs uppercase tracking-widest transition-all">{editingMenuItem ? "Save changes" : "Deploy Dish"}</button>
                  {editingMenuItem && (
                    <button type="button" onClick={resetMenuForm} className="px-4 py-3 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-none font-bold text-xs uppercase">Cancel</button>
                  )}
                </div>
              </form>
            </div>

            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white border-2 border-stone-900 rounded-none p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] text-stone-900">
                <div className="flex justify-between items-center mb-4 border-b border-stone-200 pb-3">
                  <h4 className="font-black text-sm text-stone-900 uppercase tracking-wider">Active branch menu catalog</h4>
                  <span className="text-[10px] text-stone-500 font-bold font-mono uppercase">{menuItems.length} dishes synced</span>
                </div>

                <div className="mb-4 relative">
                  <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-3.5" />
                  <input type="text" placeholder="Filter dishes by name..." value={menuSearchQuery} onChange={(e) => setMenuSearchQuery(e.target.value)} className="w-full bg-stone-50 border border-stone-300 rounded-none pl-8 pr-16 py-2.5 text-xs text-stone-900 focus:outline-none focus:border-orange-600 font-mono" />
                  {menuSearchQuery && (
                    <button type="button" onClick={() => setMenuSearchQuery("")} className="absolute right-3 top-3 text-stone-400 hover:text-stone-900 text-[10px] font-bold uppercase tracking-wider font-mono cursor-pointer">CLEAR</button>
                  )}
                </div>

                <div className="space-y-3">
                  {menuItems.filter(item => item.name.toLowerCase().includes(menuSearchQuery.toLowerCase())).length === 0 ? (
                    <div className="p-8 text-center text-stone-400 font-mono text-xs uppercase border border-dashed border-stone-300">
                      No dishes match filter.
                    </div>
                  ) : (
                    menuItems.filter(item => item.name.toLowerCase().includes(menuSearchQuery.toLowerCase())).map(item => {
                      const itemStock = item.stock_count ?? 0;
                      const itemCost = item.cost ?? Math.round(item.price * 0.5);
                      const grossProfit = item.price - itemCost;
                      const grossMarginPercent = item.price > 0 ? Math.round((grossProfit / item.price) * 100) : 0;
                      const branchColors = getBranchColorClasses(item.branch_name);

                      return (
                        <div key={item.id} className="p-3 bg-stone-50 rounded-none border border-stone-200 hover:border-stone-400 transition-colors flex flex-col sm:flex-row justify-between gap-3 group">
                          <div className="flex gap-3">
                            <img src={item.image_url || FALLBACK_IMAGE_URL} alt={item.name} referrerPolicy="no-referrer" className="w-16 h-16 object-cover rounded-none bg-stone-200 shrink-0 border border-stone-300" />
                            <div className="flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="font-bold text-xs text-stone-900 group-hover:text-orange-600 transition-colors uppercase">{item.name}</p>
                                <span className={`text-[8px] font-black uppercase px-1 py-0.5 border leading-none ${branchColors.bg} ${branchColors.text} ${branchColors.border}`}>
                                  {item.branch_name}
                                </span>
                              </div>
                              <p className="text-[10px] text-stone-500 mt-1 line-clamp-1">{item.description || "No description."}</p>
                              <div className="flex flex-wrap gap-1.5 mt-2 font-mono">
                                <span className="text-[9px] bg-stone-200 text-stone-700 px-1.5 py-0.5 rounded-none font-bold uppercase">{item.category}</span>
                                {itemStock === 0 ? (
                                  <span className="text-[9px] bg-red-100 text-red-700 border border-red-200 px-1.5 py-0.5 rounded-none font-bold uppercase">Out of Stock</span>
                                ) : (
                                  <span className={`text-[9px] border px-1.5 py-0.5 rounded-none font-bold uppercase ${itemStock < 5 ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-stone-100 text-stone-700 border-stone-300"}`}>Stock: {itemStock}</span>
                                )}
                                <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-1.5 py-0.5 rounded-none font-mono">
                                  Cost: Rp {itemCost.toLocaleString("id-ID")} ({grossMarginPercent}% margin)
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex sm:flex-col items-end justify-between text-right shrink-0">
                            <span className="font-bold text-xs text-orange-600 font-mono">Rp {item.price.toLocaleString("id-ID")}</span>
                            <div className="flex items-center gap-2 mt-2">
                              <button onClick={() => handleToggleMenuAvailability(item)} disabled={itemStock === 0} className={`text-[10px] font-bold uppercase px-2 py-1 rounded-none bg-white border font-mono ${itemStock === 0 ? "text-stone-400 border-stone-200 bg-stone-100 cursor-not-allowed" : "hover:bg-stone-100 border-stone-300 text-stone-700"}`}>
                                {itemStock === 0 ? <span className="text-stone-400">Unavailable</span> : item.is_available ? <span className="text-emerald-600">Available</span> : <span className="text-red-500">Suspended</span>}
                              </button>
                              <button onClick={() => handleEditMenuItemSelect(item)} className="p-1.5 bg-stone-200 hover:bg-stone-300 rounded-none text-stone-700 transition-all">
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
