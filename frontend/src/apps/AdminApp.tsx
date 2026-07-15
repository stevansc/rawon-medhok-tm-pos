import React, { useState, useEffect } from "react";
import { MenuItem, Branch, DashboardAnalytics, User } from "../types";
import { ApiService } from "../services/api";
import { 
  Building, Settings, Plus, Edit, Trash2, CheckCircle2, 
  TrendingUp, CircleDollarSign, ShoppingBag, Eye, LogOut, 
  AlertCircle, Sparkles, ChefHat, ToggleLeft, ToggleRight, Percent,
  Search, ArrowUpDown, Flame
} from "lucide-react";

export default function AdminApp() {
  const [user, setUser] = useState<User | null>(ApiService.getSavedUser());
  const [token, setToken] = useState<string | null>(ApiService.getToken());

  // Login credentials state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

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

  // Branch editing states
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [branchFormName, setBranchFormName] = useState("");
  const [branchFormTax, setBranchFormTax] = useState("10");

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
  const [categories, setCategories] = useState<string[]>(["food", "drink", "dessert", "other"]);
  const [newCategoryName, setNewCategoryName] = useState("");

  // Analytical Dashboard timeframe state
  const [analyticsTimeframe, setAnalyticsTimeframe] = useState<"daily" | "weekly" | "monthly" | "yearly">("monthly");
  
  // Backend aggregated dish performance
  const [dishPerformance, setDishPerformance] = useState<any[]>([]);

  // Dashboard dish analysis filter states
  const [dishSearchQuery, setDishSearchQuery] = useState("");
  const [menuSearchQuery, setMenuSearchQuery] = useState("");
  const [dishSortField, setDishSortField] = useState<"soldCount" | "revenue" | "profit" | "stock">("soldCount");
  const [dishSortOrder, setDishSortOrder] = useState<"asc" | "desc">("desc");
  const [dishCategoryFilter, setDishCategoryFilter] = useState("all");

  // Load session
  useEffect(() => {
    const savedUser = ApiService.getSavedUser();
    const savedToken = ApiService.getToken();
    if (savedUser && savedUser.role === "admin") {
      setUser(savedUser);
      setToken(savedToken);
    } else if (savedUser) {
      ApiService.logout();
      setUser(null);
      setToken(null);
    }
  }, []);

  // Fetch admin content
  const loadAdminData = async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      setError(null);
      
      const [fetchedAnalytics, fetchedBranches, fetchedMenu, fetchedCats, fetchedPerformance] = await Promise.all([
        ApiService.getDashboardAnalytics(selectedBranchFilter || undefined),
        ApiService.getBranches(),
        ApiService.getMenu(selectedBranchFilter || undefined),
        ApiService.getCategories(),
        ApiService.getDishPerformance(selectedBranchFilter || undefined)
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
    if (user) {
      loadAdminData();
    }
  }, [user, selectedBranchFilter]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;

    try {
      setIsLoggingIn(true);
      setLoginError(null);
      
      const response = await ApiService.login(username, password);
      const loggedUser = ApiService.getSavedUser();

      if (loggedUser && loggedUser.role === "admin") {
        setUser(loggedUser);
        setToken(response.access_token);
      } else {
        ApiService.logout();
        throw new Error("Access Denied. Admin application requires user privileges with 'admin' credentials role.");
      }
    } catch (err: any) {
      setLoginError(err.message || "Admin login authentication failed.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    ApiService.logout();
    setUser(null);
    setToken(null);
  };

  // Create new branch
  const handleAddBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName.trim()) return;

    try {
      setError(null);
      const rate = parseFloat(newBranchTax) / 100;
      await ApiService.createBranch({
        name: newBranchName,
        tax_rate: isNaN(rate) ? 0.10 : rate
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
      image_url: menuFormImage || "https://images.unsplash.com/photo-1601050690597-df056fb4ce78?w=500",
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

      // Reset
      setEditingMenuItem(null);
      setMenuFormName("");
      setMenuFormPrice("");
      setMenuFormDesc("");
      setMenuFormImage("");
      setMenuFormStock("15");
      setMenuFormCost("10000");
      setMenuFormAddons("");
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
    setMenuFormStock(item.stock_count_count !== undefined ? item.stock_count_count.toString() : "15");
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
  };

  const handleUpdateBranchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBranch || !branchFormName.trim()) return;
    try {
      const taxRate = parseFloat(branchFormTax) / 100;
      await ApiService.updateBranch(editingBranch.name, {
        name: branchFormName.trim(),
        tax_rate: isNaN(taxRate) ? 0.10 : taxRate
      });
      setEditingBranch(null);
      loadAdminData();
      alert("Branch details updated successfully.");
    } catch (err: any) {
      alert(`Failed to update branch: ${err.message}`);
    }
  };

  if (!user || !token) {
    return (
      <div className="mx-auto max-w-md bg-stone-900 text-white min-h-screen flex flex-col justify-center px-6 py-12 font-sans border-x border-stone-800">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-orange-600 rounded-none flex items-center justify-center mb-4 border-2 border-stone-900 shadow-[4px_4px_0px_0px_rgba(255,255,255,0.9)]">
            <Settings className="w-10 h-10 text-white animate-spin-slow" />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white uppercase font-sans">HQ Admin Center</h2>
          <p className="text-[10px] text-orange-500 mt-1 uppercase tracking-widest font-mono">Rawon TM Executive Hub</p>
        </div>

        <div className="bg-stone-950 rounded-none p-6 shadow-2xl border-2 border-orange-600">
          <h3 className="font-bold text-sm text-white mb-4 flex items-center gap-2 uppercase tracking-wider">
            <TrendingUp className="w-4 h-4 text-orange-500" />
            <span>Administrator Credentials Login</span>
          </h3>

          <form onSubmit={handleLogin} className="space-y-4 text-sm">
            <div>
              <label className="block text-[10px] font-bold text-stone-300 uppercase tracking-wider mb-1">Username</label>
              <input 
                type="text" 
                required
                placeholder="e.g. admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-stone-900 border border-stone-800 rounded-none px-4 py-3 text-white focus:outline-none focus:border-orange-500 text-xs placeholder-stone-600 font-mono"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-stone-300 uppercase tracking-wider mb-1">Password</label>
              <input 
                type="password" 
                required
                placeholder="e.g. admin123"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-stone-900 border border-stone-800 rounded-none px-4 py-3 text-white focus:outline-none focus:border-orange-500 text-xs placeholder-stone-600 font-mono"
              />
            </div>

            {loginError && (
              <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-none text-red-200 text-xs flex items-start gap-1.5 leading-snug font-mono">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>{loginError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-orange-600 hover:bg-orange-500 disabled:bg-stone-800 disabled:text-stone-600 text-white font-bold py-3 rounded-none uppercase tracking-wider text-xs shadow-md active:scale-95 transition-all mt-6"
            >
              {isLoggingIn ? "Logging in..." : "Enter Headquarters"}
            </button>
          </form>
        </div>

        <div className="mt-8 text-center p-4 bg-stone-950 rounded-none border border-stone-800 text-[10px] text-stone-400 font-mono">
          <p className="font-bold text-orange-500 uppercase">HQ Admin credentials:</p>
          <p className="mt-1">Username: <code className="text-white bg-stone-900 px-1.5 py-0.5 border border-stone-800 font-mono">admin</code> | Password: <code className="text-white bg-stone-900 px-1.5 py-0.5 border border-stone-800 font-mono">admin123</code></p>
        </div>
      </div>
    );
  }

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
              <span>Branch Controller Portal • Operator: {user.username}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end md:self-auto">
          {/* Branch Filter dropdown */}
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
            onClick={handleLogout}
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

        {/* 1. DASHBOARD VIEW */}
        {activeTab === "dashboard" && (
          (() => {
            const allOrdersRaw = JSON.parse(localStorage.getItem("rawon_mock_orders") || "[]");
            const nowTime = Date.now();
            
            // Filter by branch
            const branchOrders = selectedBranchFilter
              ? allOrdersRaw.filter((o: any) => o.branch_name.toLowerCase() === selectedBranchFilter.toLowerCase())
              : allOrdersRaw;

            // Filter by timeframe
            const timeframeOrders = branchOrders.filter((o: any) => {
              const orderTime = new Date(o.created_at).getTime();
              const elapsedHours = (nowTime - orderTime) / (1000 * 60 * 60);
              
              if (analyticsTimeframe === "daily") {
                return elapsedHours <= 24;
              } else if (analyticsTimeframe === "weekly") {
                return elapsedHours <= 24 * 7;
              } else if (analyticsTimeframe === "monthly") {
                return elapsedHours <= 24 * 30;
              } else { // yearly
                return elapsedHours <= 24 * 365;
              }
            });

            // Calculate metrics
            const completedTickets = timeframeOrders.filter((o: any) => o.status === "completed");
            const totalRevenue = completedTickets.reduce((sum: number, o: any) => sum + o.total_amount, 0);
            
            let totalCostOfSales = 0;
            completedTickets.forEach((o: any) => {
              o.items.forEach((it: any) => {
                const itemCost = it.menu_item?.cost !== undefined ? it.menu_item.cost : Math.round(it.menu_item?.price * 0.5);
                totalCostOfSales += itemCost * it.quantity;
              });
            });
            const totalTaxesCollected = completedTickets.reduce((sum: number, o: any) => sum + (o.tax_amount || 0), 0);
            const totalProfit = Math.max(0, totalRevenue - totalTaxesCollected - totalCostOfSales);
            const totalTicketsCount = timeframeOrders.length;

            return (
              <div className="space-y-6">
                {/* Timeframe selector */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 rounded-none border-2 border-stone-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] gap-3">
                  <div>
                    <h4 className="font-extrabold text-sm text-stone-900 uppercase tracking-wider">Timeline Analytical Window</h4>
                    <p className="text-[10px] text-stone-500 font-mono uppercase mt-0.5">Filter combined branch registers and recipe cost margins</p>
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

                {/* Bento Grid top stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  
                  {/* Revenue */}
                  <div className="bg-white border-2 border-stone-900 rounded-none p-6 relative overflow-hidden flex flex-col justify-between shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] text-stone-900 animate-scale-in">
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-[10px] font-extrabold text-stone-500 uppercase tracking-widest font-mono">Gross Revenue</span>
                        <div className="bg-orange-100 text-orange-600 p-2 rounded-none border border-orange-200">
                          <CircleDollarSign className="w-5 h-5" />
                        </div>
                      </div>
                      <h3 className="text-2xl font-black text-stone-900 font-sans tracking-tight">
                        Rp {totalRevenue.toLocaleString("id-ID")}
                      </h3>
                      <p className="text-[10px] text-stone-400 mt-1 font-mono uppercase tracking-wider">Based on {analyticsTimeframe} timeline</p>
                    </div>
                    <div className="absolute right-[-20px] bottom-[-20px] opacity-5">
                      <CircleDollarSign className="w-24 h-24 text-stone-900" />
                    </div>
                  </div>

                  {/* Profit */}
                  <div className="bg-white border-2 border-stone-900 rounded-none p-6 relative overflow-hidden flex flex-col justify-between shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] text-stone-900 animate-scale-in">
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-[10px] font-extrabold text-stone-500 uppercase tracking-widest font-mono">Estimated Profit</span>
                        <div className="bg-emerald-100 text-emerald-600 p-2 rounded-none border border-emerald-200">
                          <TrendingUp className="w-5 h-5" />
                        </div>
                      </div>
                      <h3 className="text-2xl font-black text-emerald-700 font-sans tracking-tight">
                        Rp {totalProfit.toLocaleString("id-ID")}
                      </h3>
                      <p className="text-[10px] text-stone-400 mt-1 font-mono uppercase tracking-wider">Revenue minus actual recipe cost & tax</p>
                    </div>
                    <div className="absolute right-[-20px] bottom-[-20px] opacity-5">
                      <TrendingUp className="w-24 h-24 text-stone-900" />
                    </div>
                  </div>

                  {/* Order Count */}
                  <div className="bg-white border-2 border-stone-900 rounded-none p-6 relative overflow-hidden flex flex-col justify-between shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] text-stone-900 animate-scale-in">
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-[10px] font-extrabold text-stone-500 uppercase tracking-widest font-mono">Register Volume</span>
                        <div className="bg-stone-100 text-stone-900 p-2 rounded-none border border-stone-300">
                          <ShoppingBag className="w-5 h-5" />
                        </div>
                      </div>
                      <h3 className="text-2xl font-black text-stone-900 font-sans tracking-tight">
                        {totalTicketsCount} tickets
                      </h3>
                      <p className="text-[10px] text-stone-400 mt-1 font-mono uppercase tracking-wider">Total transactions logged</p>
                    </div>
                    <div className="absolute right-[-20px] bottom-[-20px] opacity-5">
                      <ShoppingBag className="w-24 h-24 text-stone-900" />
                    </div>
                  </div>

                </div>

                {/* Simulated Trend graph handdrawn */}
                <div className="bg-white border-2 border-stone-900 rounded-none p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] text-stone-900 animate-scale-in">
                  <div className="flex justify-between items-center mb-4 border-b border-stone-200 pb-4">
                    <div>
                      <h4 className="font-black text-sm text-stone-900 uppercase tracking-wider">Dynamic sales trend index</h4>
                      <p className="text-xs text-stone-500 mt-0.5">Timeline performance index based on {analyticsTimeframe} timeline</p>
                    </div>
                    <span className="text-[10px] font-mono px-2.5 py-1 bg-orange-100 text-orange-700 rounded-none border border-orange-200 font-bold uppercase tracking-wider">
                      Live Stream
                    </span>
                  </div>

                  {/* Handcrafted gorgeous SVG Chart */}
                  <div className="w-full h-44 mt-6">
                    <svg className="w-full h-full" viewBox="0 0 500 150">
                      <defs>
                        <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#ea580c" stopOpacity="0.2"/>
                          <stop offset="100%" stopColor="#ea580c" stopOpacity="0"/>
                        </linearGradient>
                      </defs>
                      
                      {/* Grid Lines */}
                      <line x1="0" y1="30" x2="500" y2="30" stroke="#e7e5e4" strokeWidth="1" strokeDasharray="4"/>
                      <line x1="0" y1="75" x2="500" y2="75" stroke="#e7e5e4" strokeWidth="1" strokeDasharray="4"/>
                      <line x1="0" y1="120" x2="500" y2="120" stroke="#e7e5e4" strokeWidth="1" strokeDasharray="4"/>
     
                      {/* Area fill */}
                      <path 
                        d={`M 0 150 L 0 ${120 - Math.min(60, totalRevenue / 150000)} Q 120 ${100 - Math.min(50, totalRevenue / 160000)} 200 ${110 - Math.min(55, totalRevenue / 140000)} T 350 ${60 - Math.min(40, totalRevenue / 120000)} T 500 ${25 - Math.min(20, totalRevenue / 90000)} L 500 150 Z`} 
                        fill="url(#chartGradient)"
                      />

                      {/* Trend line */}
                      <path 
                        d={`M 0 ${120 - Math.min(60, totalRevenue / 150000)} Q 120 ${100 - Math.min(50, totalRevenue / 160000)} 200 ${110 - Math.min(55, totalRevenue / 140000)} T 350 ${60 - Math.min(40, totalRevenue / 120000)} T 500 ${25 - Math.min(20, totalRevenue / 90000)}`} 
                        fill="none" 
                        stroke="#ea580c" 
                        strokeWidth="3.5"
                        strokeLinecap="round"
                      />

                      {/* Points */}
                      <circle cx="200" cy={110 - Math.min(55, totalRevenue / 140000)} r="5" fill="#ea580c" stroke="#ffffff" strokeWidth="2" />
                      <circle cx="350" cy={60 - Math.min(40, totalRevenue / 120000)} r="5" fill="#ea580c" stroke="#ffffff" strokeWidth="2" />
                      <circle cx="500" cy={25 - Math.min(20, totalRevenue / 90000)} r="5" fill="#ea580c" stroke="#ffffff" strokeWidth="2" />

                      {/* Text Markers depending on timeframe */}
                      {analyticsTimeframe === "daily" && (
                        <>
                          <text x="5" y="145" fill="#78716c" className="font-mono text-[9px] uppercase">00:00</text>
                          <text x="180" y="145" fill="#78716c" className="font-mono text-[9px] uppercase">08:00</text>
                          <text x="330" y="145" fill="#78716c" className="font-mono text-[9px] uppercase">16:00</text>
                          <text x="465" y="145" fill="#78716c" className="font-mono text-[9px] uppercase">Now</text>
                        </>
                      )}
                      {analyticsTimeframe === "weekly" && (
                        <>
                          <text x="5" y="145" fill="#78716c" className="font-mono text-[9px] uppercase">Mon</text>
                          <text x="180" y="145" fill="#78716c" className="font-mono text-[9px] uppercase">Wed</text>
                          <text x="330" y="145" fill="#78716c" className="font-mono text-[9px] uppercase">Fri</text>
                          <text x="465" y="145" fill="#78716c" className="font-mono text-[9px] uppercase">Today</text>
                        </>
                      )}
                      {analyticsTimeframe === "monthly" && (
                        <>
                          <text x="5" y="145" fill="#78716c" className="font-mono text-[9px] uppercase">Week 1</text>
                          <text x="180" y="145" fill="#78716c" className="font-mono text-[9px] uppercase">Week 2</text>
                          <text x="330" y="145" fill="#78716c" className="font-mono text-[9px] uppercase">Week 3</text>
                          <text x="465" y="145" fill="#78716c" className="font-mono text-[9px] uppercase">Week 4</text>
                        </>
                      )}
                      {analyticsTimeframe === "yearly" && (
                        <>
                          <text x="5" y="145" fill="#78716c" className="font-mono text-[9px] uppercase">Q1</text>
                          <text x="180" y="145" fill="#78716c" className="font-mono text-[9px] uppercase">Q2</text>
                          <text x="330" y="145" fill="#78716c" className="font-mono text-[9px] uppercase">Q3</text>
                          <text x="465" y="145" fill="#78716c" className="font-mono text-[9px] uppercase">Q4</text>
                        </>
                      )}
                    </svg>
                  </div>
                </div>

                {/* 🍳 Dish Menu Performance Analysis */}
                {(() => {
                  const menuPerformance = dishPerformance;

                  // Filter performance list by search query and category
                  const filteredPerformance = menuPerformance.filter(item => {
                    const matchesSearch = item.name.toLowerCase().includes(dishSearchQuery.toLowerCase()) || 
                      (item.description && item.description.toLowerCase().includes(dishSearchQuery.toLowerCase()));
                    const matchesCategory = dishCategoryFilter === "all" || item.category === dishCategoryFilter;
                    return matchesSearch && matchesCategory;
                  });

                  // Sort performance list
                  const sortedPerformance = [...filteredPerformance].sort((a, b) => {
                    let valA: any = a[dishSortField];
                    let valB: any = b[dishSortField];
                    
                    if (dishSortField === "stock") {
                      valA = a.stock !== undefined ? a.stock : 15;
                      valB = b.stock !== undefined ? b.stock : 15;
                    }

                    if (valA < valB) return dishSortOrder === "asc" ? -1 : 1;
                    if (valA > valB) return dishSortOrder === "asc" ? 1 : -1;
                    return 0;
                  });

                  return (
                    <div className="bg-white border-2 border-stone-900 rounded-none p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] text-stone-900 animate-scale-in">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200 pb-4 mb-6">
                        <div>
                          <h4 className="font-black text-sm text-stone-900 uppercase tracking-wider flex items-center gap-2">
                            <ChefHat className="w-4 h-4 text-orange-600" />
                            <span>Dish Menu Performance Analysis</span>
                          </h4>
                          <p className="text-xs text-stone-500 mt-0.5">Analyze order volumes, margins, profits, stock, and popular addon choices for each menu item.</p>
                        </div>

                        <span className="text-[10px] font-mono px-2.5 py-1 bg-teal-50 text-teal-700 rounded-none border border-teal-200 font-bold uppercase tracking-wider self-start md:self-auto">
                          {sortedPerformance.length} items evaluated
                        </span>
                      </div>

                      {/* Filter Toolbar */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                        {/* Search */}
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

                        {/* Category Filter */}
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

                        {/* Quick Sort Selector */}
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

                      {/* Performance Data Grid / Table */}
                      <div className="overflow-x-auto border border-stone-200">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-stone-100 border-b-2 border-stone-200 font-mono text-[10px] text-stone-500 uppercase font-black">
                              <th className="p-3">Dish / Menu Detail</th>
                              <th className="p-3 text-right">
                                <button 
                                  type="button"
                                  onClick={() => {
                                    setDishSortField("soldCount");
                                    setDishSortOrder(dishSortField === "soldCount" && dishSortOrder === "desc" ? "asc" : "desc");
                                  }}
                                  className="inline-flex items-center gap-1 font-bold hover:text-stone-900 transition-colors cursor-pointer uppercase"
                                >
                                  <span>Vol Sold</span>
                                  <ArrowUpDown className="w-3 h-3 text-stone-400" />
                                </button>
                              </th>
                              <th className="p-3 text-right">
                                <button 
                                  type="button"
                                  onClick={() => {
                                    setDishSortField("revenue");
                                    setDishSortOrder(dishSortField === "revenue" && dishSortOrder === "desc" ? "asc" : "desc");
                                  }}
                                  className="inline-flex items-center gap-1 font-bold hover:text-stone-900 transition-colors cursor-pointer uppercase"
                                >
                                  <span>Revenue</span>
                                  <ArrowUpDown className="w-3 h-3 text-stone-400" />
                                </button>
                              </th>
                              <th className="p-3 text-right">
                                <button 
                                  type="button"
                                  onClick={() => {
                                    setDishSortField("profit");
                                    setDishSortOrder(dishSortField === "profit" && dishSortOrder === "desc" ? "asc" : "desc");
                                  }}
                                  className="inline-flex items-center gap-1 font-bold hover:text-stone-900 transition-colors cursor-pointer uppercase"
                                >
                                  <span>Profit / Margin</span>
                                  <ArrowUpDown className="w-3 h-3 text-stone-400" />
                                </button>
                              </th>
                              <th className="p-3 text-right">
                                <button 
                                  type="button"
                                  onClick={() => {
                                    setDishSortField("stock");
                                    setDishSortOrder(dishSortField === "stock" && dishSortOrder === "desc" ? "asc" : "desc");
                                  }}
                                  className="inline-flex items-center gap-1 font-bold hover:text-stone-900 transition-colors cursor-pointer uppercase"
                                >
                                  <span>Stock Status</span>
                                  <ArrowUpDown className="w-3 h-3 text-stone-400" />
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

                                return (
                                  <tr key={item.id} className="hover:bg-stone-50 transition-colors">
                                    {/* Details column */}
                                    <td className="p-3">
                                      <div className="flex gap-2.5 items-start">
                                        <img 
                                          src={item.image_url || "https://images.unsplash.com/photo-1541832676-9b763b0239ab?w=100&auto=format&fit=crop&q=60"}
                                          alt={item.name}
                                          referrerPolicy="no-referrer"
                                          className="w-10 h-10 object-cover border border-stone-200 shrink-0"
                                        />
                                        <div>
                                          <div className="flex items-center gap-1.5 flex-wrap">
                                            <p className="font-bold text-stone-900 uppercase text-[11px] leading-tight">{item.name}</p>
                                            
                                            {/* Badges */}
                                            {isPopular && (
                                              <span className="text-[7px] font-black uppercase px-1 py-0.5 bg-orange-600 text-white rounded-none flex items-center gap-0.5 leading-none">
                                                <Flame className="w-2.5 h-2.5 text-white" />
                                                <span>HOT</span>
                                              </span>
                                            )}
                                            {highMargin && item.soldCount > 0 && (
                                              <span className="text-[7px] font-black uppercase px-1 py-0.5 bg-emerald-700 text-white rounded-none leading-none">
                                                HERO
                                              </span>
                                            )}
                                          </div>
                                          
                                          <div className="flex flex-wrap gap-1 mt-1 font-mono text-[9px] uppercase">
                                            <span className="bg-stone-100 text-stone-600 px-1 py-0.2 border border-stone-200">{item.category}</span>
                                            <span className={`px-1 py-0.2 border leading-none font-bold ${
                                              item.branch_name.toLowerCase().includes("gayung")
                                                ? "bg-teal-50 text-teal-800 border-teal-200"
                                                : "bg-indigo-50 text-indigo-800 border-indigo-200"
                                            }`}>{item.branch_name}</span>
                                          </div>
                                        </div>
                                      </div>
                                    </td>

                                    {/* Vol Sold */}
                                    <td className="p-3 text-right font-mono font-bold text-stone-900">
                                      {item.soldCount}
                                      <span className="text-[9px] text-stone-400 font-normal ml-0.5"> pcs</span>
                                    </td>

                                    {/* Revenue */}
                                    <td className="p-3 text-right font-mono font-semibold text-stone-900">
                                      Rp {item.revenue.toLocaleString("id-ID")}
                                    </td>

                                    {/* Profit / Margin */}
                                    <td className="p-3 text-right font-mono">
                                      <div className="font-bold text-emerald-700">
                                        Rp {item.profit.toLocaleString("id-ID")}
                                      </div>
                                      {item.revenue > 0 ? (
                                        <div className="text-[9px] font-semibold text-stone-500">
                                          Margin: <span className={item.marginPercent >= 50 ? "text-emerald-600 font-bold" : "text-stone-600 font-bold"}>{item.marginPercent}%</span>
                                        </div>
                                      ) : (
                                        <div className="text-[9px] text-stone-400">-</div>
                                      )}
                                    </td>

                                    {/* Stock status */}
                                    <td className="p-3 text-right font-mono font-semibold">
                                      {isOut ? (
                                        <span className="text-[9px] font-black uppercase px-1.5 py-0.5 bg-red-100 text-red-700 border border-red-200 rounded-none">
                                          OUT
                                        </span>
                                      ) : isLowStock ? (
                                        <div className="text-red-600 font-black flex flex-col items-end">
                                          <span>{item.stock} left</span>
                                          <span className="text-[7px] text-red-500 font-black uppercase leading-none">CRITICAL</span>
                                        </div>
                                      ) : (
                                        <span className="text-stone-600">{item.stock !== undefined ? item.stock : 15} units</span>
                                      )}
                                    </td>

                                    {/* Popular Addon */}
                                    <td className="p-3 font-mono text-[10px] text-stone-700 capitalize">
                                      {item.topAddon}
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Analysis Insights Summary Widget */}
                      {sortedPerformance.length > 0 && (
                        <div className="mt-6 p-4 bg-orange-50/50 border border-orange-100 rounded-none grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="flex gap-2 items-start">
                            <Sparkles className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-xs font-bold text-stone-900 uppercase">Top Performer of the Timeframe</p>
                              {(() => {
                                const topDish = [...sortedPerformance].sort((a, b) => b.soldCount - a.soldCount)[0];
                                if (topDish && topDish.soldCount > 0) {
                                  return (
                                    <p className="text-xs text-stone-600 mt-1">
                                      <strong>{topDish.name}</strong> ({topDish.branch_name}) has lead sales with <strong>{topDish.soldCount} servings sold</strong>, generating a profit of <strong>Rp {topDish.profit.toLocaleString("id-ID")}</strong>!
                                    </p>
                                  );
                                }
                                return <p className="text-xs text-stone-500 mt-1">No sales logged in this timeframe window yet.</p>;
                              })()}
                            </div>
                          </div>

                          <div className="flex gap-2 items-start border-t md:border-t-0 md:border-l border-stone-200 pt-3 md:pt-0 md:pl-4">
                            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-xs font-bold text-stone-900 uppercase">Urgent Stock & Prep Alerts</p>
                              {(() => {
                                const lowStockItems = sortedPerformance.filter(i => i.stock !== undefined && i.stock <= 5);
                                if (lowStockItems.length > 0) {
                                  return (
                                    <p className="text-xs text-stone-600 mt-1">
                                      There are <strong>{lowStockItems.length} items</strong> with low or critical inventory remaining. Check raw ingredient purchase channels for <strong>{lowStockItems.map(i => i.name).slice(0, 3).join(", ")}{lowStockItems.length > 3 ? "..." : ""}</strong> immediately.
                                    </p>
                                  );
                                }
                                return <p className="text-xs text-stone-500 mt-1">All kitchen inventory levels are healthy and above prep threshold.</p>;
                              })()}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            );
          })()
        )}

        {/* 2. BRANCH CONFIGURATION VIEW */}
        {activeTab === "branches" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Branch Creation or Editing Form */}
            <div className="bg-white border-2 border-stone-900 rounded-none p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] text-stone-900">
              {editingBranch ? (
                <>
                  <h4 className="font-black text-sm text-stone-900 mb-4 flex items-center gap-2 uppercase tracking-wider border-b border-stone-200 pb-2">
                    <Edit className="w-4 h-4 text-orange-600" />
                    <span>Update Branch: {editingBranch.name}</span>
                  </h4>

                  <form onSubmit={handleUpdateBranchSubmit} className="space-y-4 text-sm">
                    <div>
                      <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest font-mono mb-1">New Branch Name</label>
                      <input 
                        type="text" 
                        required
                        placeholder="e.g. Gayung Sari Premium"
                        value={branchFormName}
                        onChange={(e) => setBranchFormName(e.target.value)}
                        className="w-full bg-stone-50 border border-stone-300 rounded-none px-4 py-3 text-stone-900 focus:outline-none focus:border-orange-600 text-xs placeholder-stone-400 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest font-mono mb-1">Government Tax rate (%)</label>
                      <div className="relative">
                        <input 
                          type="number" 
                          required
                          min="0"
                          max="50"
                          placeholder="e.g. 10 for 10%"
                          value={branchFormTax}
                          onChange={(e) => setBranchFormTax(e.target.value)}
                          className="w-full bg-stone-50 border border-stone-300 rounded-none pl-4 pr-10 py-3 text-stone-900 focus:outline-none focus:border-orange-600 text-xs placeholder-stone-400 font-mono"
                        />
                        <Percent className="w-3.5 h-3.5 text-stone-500 absolute right-3.5 top-3.5" />
                      </div>
                      <p className="text-[10px] text-stone-400 mt-1.5 font-mono leading-normal">Changing name or taxes will instantly update active menus and compute dynamic receipts accordingly.</p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="flex-1 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-none font-bold text-xs uppercase tracking-widest transition-all shadow-md"
                      >
                        Save Details
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingBranch(null)}
                        className="px-4 py-3 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-none font-bold text-xs uppercase"
                      >
                        Cancel
                      </button>
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
                      <input 
                        type="text" 
                        required
                        placeholder="e.g. Gayung Sari, Siwalankerto"
                        value={newBranchName}
                        onChange={(e) => setNewBranchName(e.target.value)}
                        className="w-full bg-stone-50 border border-stone-300 rounded-none px-4 py-3 text-stone-900 focus:outline-none focus:border-orange-600 text-xs placeholder-stone-400 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest font-mono mb-1">Government Tax rate (%)</label>
                      <div className="relative">
                        <input 
                          type="number" 
                          required
                          min="0"
                          max="50"
                          placeholder="e.g. 10 for 10%"
                          value={newBranchTax}
                          onChange={(e) => setNewBranchTax(e.target.value)}
                          className="w-full bg-stone-50 border border-stone-300 rounded-none pl-4 pr-10 py-3 text-stone-900 focus:outline-none focus:border-orange-600 text-xs placeholder-stone-400 font-mono"
                        />
                        <Percent className="w-3.5 h-3.5 text-stone-500 absolute right-3.5 top-3.5" />
                      </div>
                      <p className="text-[10px] text-stone-400 mt-1.5 font-mono leading-normal">This tax is automatically added to customer checkout totals dynamically based on selected branch rules.</p>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-none font-bold text-xs uppercase tracking-widest transition-all shadow-md active:scale-95"
                    >
                      Save and Sync Branch
                    </button>
                  </form>
                </>
              )}
            </div>

            {/* List current outlets */}
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
                      <p className="text-[10px] text-stone-400 mt-0.5 font-mono uppercase">Government tax rules</p>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <div className="bg-orange-50 text-orange-700 border border-orange-200 px-3 py-1.5 rounded-none text-xs font-mono font-bold">
                        Tax rate: {Math.round(b.tax_rate * 100)}%
                      </div>
                      <button
                        onClick={() => handleEditBranchSelect(b)}
                        className="p-2 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-none transition-all"
                        title="Edit branch parameters"
                      >
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
            
            {/* Menu modification form */}
            <div className="bg-white border-2 border-stone-900 rounded-none p-6 lg:col-span-1 h-fit sticky top-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] text-stone-900">
              <h4 className="font-black text-sm text-stone-900 mb-4 flex items-center gap-2 uppercase tracking-wider border-b border-stone-200 pb-2">
                <ChefHat className="w-4 h-4 text-orange-600" />
                <span>{editingMenuItem ? "Modify Menu Dish" : "Create New Menu Dish"}</span>
              </h4>

              <form onSubmit={handleMenuFormSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest font-mono mb-1">Dish Name</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. Rawon Super Pedas"
                    value={menuFormName}
                    onChange={(e) => setMenuFormName(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-none px-3 py-2.5 text-stone-900 focus:outline-none focus:border-orange-600 text-xs font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest font-mono mb-1">Price (Rp)</label>
                    <input 
                      type="number" 
                      required
                      placeholder="e.g. 45000"
                      value={menuFormPrice}
                      onChange={(e) => setMenuFormPrice(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-300 rounded-none px-3 py-2.5 text-stone-900 focus:outline-none focus:border-orange-600 text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest font-mono mb-1">Category</label>
                    <select 
                      value={menuFormCategory} 
                      onChange={(e) => setMenuFormCategory(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-300 rounded-none px-3 py-2.5 text-stone-900 focus:outline-none focus:border-orange-600 text-xs cursor-pointer font-bold font-mono"
                    >
                      {categories.map(cat => (
                        <option key={cat} value={cat}>
                          {cat === "food" ? "🍲" : cat === "drink" ? "🍹" : cat === "dessert" ? "🍨" : cat === "other" ? "🥚" : "🍽️"} {cat.toUpperCase()}
                        </option>
                      ))}
                    </select>

                    <div className="mt-2 p-2 bg-stone-50 border border-stone-200">
                      <label className="block text-[8px] font-bold text-stone-500 uppercase tracking-widest font-mono mb-1">Create custom category</label>
                      <div className="flex gap-1">
                        <input 
                          type="text" 
                          placeholder="e.g. snack, rawon"
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          className="flex-1 bg-white border border-stone-300 rounded-none px-2 py-1 text-stone-900 text-[10px] font-mono focus:outline-none focus:border-orange-600"
                        />
                        <button
                          type="button"
                          onClick={handleAddCategorySubmit}
                          className="px-2.5 py-1 bg-stone-900 hover:bg-stone-850 text-white rounded-none text-[9px] font-bold uppercase tracking-wider"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest font-mono mb-1">Stock level (Qty)</label>
                    <input 
                      type="number" 
                      required
                      min="0"
                      placeholder="e.g. 25"
                      value={menuFormStock}
                      onChange={(e) => setMenuFormStock(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-300 rounded-none px-3 py-2.5 text-stone-900 focus:outline-none focus:border-orange-600 text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest font-mono mb-1">Ingredient Cost (Rp)</label>
                    <input 
                      type="number" 
                      required
                      min="0"
                      placeholder="e.g. 12000"
                      value={menuFormCost}
                      onChange={(e) => setMenuFormCost(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-300 rounded-none px-3 py-2.5 text-stone-900 focus:outline-none focus:border-orange-600 text-xs font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest font-mono mb-1">Target Branch Outlet</label>
                  <select 
                    value={menuFormBranch} 
                    onChange={(e) => setMenuFormBranch(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-none px-3 py-2.5 text-stone-900 focus:outline-none focus:border-orange-600 text-xs cursor-pointer font-bold font-mono"
                  >
                    {branches.map(b => (
                      <option key={b.name} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest font-mono mb-1">Description / Recipe notes</label>
                  <textarea 
                    rows={2}
                    placeholder="Short description for guests..."
                    value={menuFormDesc}
                    onChange={(e) => setMenuFormDesc(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-none p-3 text-stone-900 focus:outline-none focus:border-orange-600 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest font-mono mb-1">Image URL Address</label>
                  <input 
                    type="url" 
                    placeholder="https://..."
                    value={menuFormImage}
                    onChange={(e) => setMenuFormImage(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-none px-3 py-2.5 text-stone-900 focus:outline-none focus:border-orange-600 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest font-mono mb-1">Custom Addon Options (Comma-separated list)</label>
                  <input 
                    type="text" 
                    placeholder="e.g. sambal, kecambah, kerupuk, telur asin"
                    value={menuFormAddons}
                    onChange={(e) => setMenuFormAddons(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-none px-3 py-2.5 text-stone-900 focus:outline-none focus:border-orange-600 text-xs font-mono"
                  />
                  <p className="text-[9px] text-stone-400 mt-1 font-mono uppercase">Addons will be rendered as optional checkboxes for customers during checkout.</p>
                </div>

                <div className="flex items-center justify-between p-3 bg-stone-50 rounded-none border border-stone-300">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-600 font-mono">Available for orders</span>
                  <button
                    type="button"
                    onClick={() => setMenuFormAvailable(!menuFormAvailable)}
                    className="text-orange-600 hover:text-orange-500"
                  >
                    {menuFormAvailable ? (
                      <ToggleRight className="w-8 h-8" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-stone-400" />
                    )}
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-none font-bold text-xs uppercase tracking-widest transition-all"
                  >
                    {editingMenuItem ? "Save changes" : "Deploy Dish"}
                  </button>
                  {editingMenuItem && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingMenuItem(null);
                        setMenuFormName("");
                        setMenuFormPrice("");
                        setMenuFormDesc("");
                        setMenuFormImage("");
                        setMenuFormStock("15");
                        setMenuFormCost("10000");
                        setMenuFormAddons("");
                      }}
                      className="px-4 py-3 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-none font-bold text-xs uppercase"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Dishes list table */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white border-2 border-stone-900 rounded-none p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] text-stone-900">
                <div className="flex justify-between items-center mb-4 border-b border-stone-200 pb-3">
                  <h4 className="font-black text-sm text-stone-900 uppercase tracking-wider">Active branch menu catalog</h4>
                  <span className="text-[10px] text-stone-500 font-bold font-mono uppercase">{menuItems.length} dishes synced</span>
                </div>

                {/* Filter Input */}
                <div className="mb-4 relative">
                  <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-3.5" />
                  <input 
                    type="text" 
                    placeholder="Filter dishes by name..."
                    value={menuSearchQuery}
                    onChange={(e) => setMenuSearchQuery(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-none pl-8 pr-16 py-2.5 text-xs text-stone-900 focus:outline-none focus:border-orange-600 font-mono"
                  />
                  {menuSearchQuery && (
                    <button 
                      type="button"
                      onClick={() => setMenuSearchQuery("")}
                      className="absolute right-3 top-3 text-stone-400 hover:text-stone-900 text-[10px] font-bold uppercase tracking-wider font-mono cursor-pointer"
                    >
                      CLEAR
                    </button>
                  )}
                </div>

                {(() => {
                  const filteredItems = menuItems.filter(item => 
                    item.name.toLowerCase().includes(menuSearchQuery.toLowerCase())
                  );

                  return (
                    <div className="space-y-3">
                      {filteredItems.length === 0 ? (
                        <div className="p-8 text-center text-stone-400 font-mono text-xs uppercase border border-dashed border-stone-300">
                          No dishes match "{menuSearchQuery}" filter.
                        </div>
                      ) : (
                        filteredItems.map(item => {
                          const itemStock = item.stock_count_count !== undefined ? item.stock_count_count : 15;
                          const itemCost = item.cost !== undefined ? item.cost : Math.round(item.price * 0.5);
                          const grossProfit = item.price - itemCost;
                          const grossMarginPercent = item.price > 0 ? Math.round((grossProfit / item.price) * 100) : 0;

                          return (
                            <div key={item.id} className="p-3 bg-stone-50 rounded-none border border-stone-200 hover:border-stone-400 transition-colors flex flex-col sm:flex-row justify-between gap-3 group">
                              <div className="flex gap-3">
                                <img 
                                  src={item.image_url} 
                                  alt={item.name} 
                                  referrerPolicy="no-referrer"
                                  className="w-16 h-16 object-cover rounded-none bg-stone-200 shrink-0 border border-stone-300"
                                />
                                <div className="flex-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <p className="font-bold text-xs text-stone-900 group-hover:text-orange-600 transition-colors uppercase">{item.name}</p>
                                    <span className={`text-[8px] font-black uppercase px-1 py-0.5 border leading-none ${
                                      item.branch_name.toLowerCase().includes("gayung") 
                                        ? "bg-teal-50 text-teal-700 border-teal-200" 
                                        : "bg-indigo-50 text-indigo-700 border-indigo-200"
                                    }`}>
                                      {item.branch_name.toLowerCase().includes("gayung") ? "GS" : "SW"}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-stone-500 mt-1 line-clamp-1">{item.description || "No description provided."}</p>
                                  <div className="flex flex-wrap gap-1.5 mt-2 font-mono">
                                    <span className="text-[9px] bg-stone-200 text-stone-700 px-1.5 py-0.5 rounded-none font-bold uppercase">{item.category}</span>
                                    <span className={`text-[9px] px-1.5 py-0.5 rounded-none font-bold uppercase border leading-none ${
                                      item.branch_name.toLowerCase().includes("gayung")
                                        ? "bg-teal-50 text-teal-800 border-teal-200"
                                        : "bg-indigo-50 text-indigo-800 border-indigo-200"
                                    }`}>{item.branch_name}</span>
                                    
                                    {itemStock === 0 ? (
                                      <span className="text-[9px] bg-red-100 text-red-700 border border-red-200 px-1.5 py-0.5 rounded-none font-bold uppercase">Out of Stock</span>
                                    ) : (
                                      <span className={`text-[9px] border px-1.5 py-0.5 rounded-none font-bold uppercase ${
                                        itemStock < 5 ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-stone-100 text-stone-700 border-stone-300"
                                      }`}>Stock: {itemStock} qty</span>
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
                                  {/* Toggle Availability */}
                                  <button
                                    onClick={() => handleToggleMenuAvailability(item)}
                                    disabled={itemStock === 0}
                                    className={`text-[10px] font-bold uppercase px-2 py-1 rounded-none bg-white border font-mono ${
                                      itemStock === 0 
                                        ? "text-stone-400 border-stone-200 bg-stone-100 cursor-not-allowed" 
                                        : "hover:bg-stone-100 border-stone-300 text-stone-700"
                                    }`}
                                  >
                                    {itemStock === 0 ? (
                                      <span className="text-stone-400">Unavailable</span>
                                    ) : item.is_available ? (
                                      <span className="text-emerald-600">Available</span>
                                    ) : (
                                      <span className="text-red-500">Suspended</span>
                                    )}
                                  </button>
                                  
                                  {/* Edit button */}
                                  <button
                                    onClick={() => handleEditMenuItemSelect(item)}
                                    className="p-1.5 bg-stone-200 hover:bg-stone-300 rounded-none text-stone-700 transition-all"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
