import React, { useState, useEffect } from "react";
import { Order, OrderStatus, User } from "../types";
import { ApiService } from "../services/api";
import { 
  Flame, Check, ChefHat, LogOut, Clock, 
  MapPin, RefreshCw, AlertCircle, ShoppingBag, Eye 
} from "lucide-react";

interface KitchenAppProps {
  currentBranch: string;
}

export default function KitchenApp({ currentBranch }: KitchenAppProps) {
  const [user, setUser] = useState<User | null>(ApiService.getSavedUser());
  const [token, setToken] = useState<string | null>(ApiService.getToken());
  
  // Login form state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Orders state
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("active"); // "active" | "pending" | "cooking" | "on_table"
  const [autoPoll, setAutoPoll] = useState(true);
  const [printedReceiptOrder, setPrintedReceiptOrder] = useState<Order | null>(null);

  // Load saved session on mount
  useEffect(() => {
    const savedUser = ApiService.getSavedUser();
    const savedToken = ApiService.getToken();
    
    // Make sure user has role access
    if (savedUser && (savedUser.role === "kitchen" || savedUser.role === "admin" || savedUser.role === "cashier")) {
      setUser(savedUser);
      setToken(savedToken);
    } else if (savedUser) {
      // Clear unauthorized role session
      ApiService.logout();
      setUser(null);
      setToken(null);
    }
  }, []);

  // Fetch kitchen orders
  const fetchKitchenOrders = async () => {
    if (!user) return;
    try {
      setIsLoadingOrders(true);
      setOrdersError(null);
      // Fetch orders for the user's branch
      const result = await ApiService.getOrders(user.branch_name);
      setOrders(result);
    } catch (err: any) {
      setOrdersError(err.message || "Failed to load kitchen orders.");
    } finally {
      setIsLoadingOrders(false);
    }
  };

  // Poll orders
  useEffect(() => {
    if (!user) return;
    fetchKitchenOrders();

    let pollInterval: NodeJS.Timeout;
    if (autoPoll) {
      pollInterval = setInterval(() => {
        fetchKitchenOrders();
      }, 8000); // Poll every 8s
    }

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [user, autoPoll]);

  // Handle credentials Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;

    try {
      setIsLoggingIn(true);
      setLoginError(null);
      
      const response = await ApiService.login(username, password);
      const loggedUser = ApiService.getSavedUser();

      if (loggedUser && (loggedUser.role === "kitchen" || loggedUser.role === "admin" || loggedUser.role === "cashier")) {
        setUser(loggedUser);
        setToken(response.access_token);
      } else {
        ApiService.logout();
        throw new Error("Unauthorized role. The Kitchen App requires a 'kitchen' (or admin) role credentials.");
      }
    } catch (err: any) {
      setLoginError(err.message || "Login failed.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    ApiService.logout();
    setUser(null);
    setToken(null);
    setOrders([]);
  };

  // Progress order status
  const handleProgressStatus = async (orderId: number, currentStatus: OrderStatus) => {
    let nextStatus: OrderStatus;
    if (currentStatus === "pending") {
      nextStatus = "cooking"; // Go directly to cooking as requested
    } else if (currentStatus === "cooking" || currentStatus === "accepted") {
      nextStatus = "on_table";
    } else {
      return; // Already ready or completed
    }

    try {
      const orderToPrint = orders.find(o => o.id === orderId);
      if (orderToPrint && currentStatus === "pending") {
        // Set printedReceiptOrder to show Bluetooth print-out simulation with remaining items!
        setPrintedReceiptOrder({ ...orderToPrint, status: "cooking" });
      }

      // Optimistic update
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: nextStatus } : o));
      await ApiService.updateOrderStatus(orderId, nextStatus);
    } catch (err: any) {
      alert(`Failed to update status: ${err.message}`);
      fetchKitchenOrders(); // roll back on failure
    }
  };

  // Decline an individual item from a pending order
  const handleDeclineOrderItem = async (orderId: number, menuItemId: number, specialNotes: string) => {
    try {
      const updatedOrder = await ApiService.declineOrderItem(orderId, menuItemId, specialNotes);
      setOrders(prev => prev.map(o => o.id === orderId ? updatedOrder : o));
    } catch (err: any) {
      alert(`Failed to decline item: ${err.message}`);
    }
  };

  // Filter orders
  const filteredOrders = orders.filter(o => {
    if (statusFilter === "active") {
      return o.status !== "completed";
    }
    return o.status === statusFilter;
  });

  // Calculate stats for badge badges
  const pendingCount = orders.filter(o => o.status === "pending").length;
  const cookingCount = orders.filter(o => o.status === "cooking" || o.status === "accepted").length;
  const onTableCount = orders.filter(o => o.status === "on_table").length;

  if (!user || !token) {
    return (
      <div className="mx-auto max-w-md bg-stone-900 text-white min-h-screen flex flex-col justify-center px-6 py-12 font-sans border-x border-stone-800">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-orange-600 rounded-none flex items-center justify-center mb-4 border-2 border-stone-900 shadow-[4px_4px_0px_0px_rgba(255,255,255,0.9)]">
            <ChefHat className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white uppercase font-sans">Kitchen Console</h2>
          <p className="text-[10px] text-orange-500 mt-1 uppercase tracking-widest font-mono">Rawon TM Back-Of-House App</p>
        </div>

        <div className="bg-stone-950 rounded-none p-6 shadow-2xl border-2 border-orange-600">
          <h3 className="font-bold text-sm text-white mb-4 flex items-center gap-2 uppercase tracking-wider">
            <Flame className="w-4 h-4 text-orange-500 animate-pulse" />
            <span>Staff Authentication Required</span>
          </h3>

          <form onSubmit={handleLogin} className="space-y-4 text-sm">
            <div>
              <label className="block text-[10px] font-bold text-stone-300 uppercase tracking-wider mb-1">Username</label>
              <input 
                type="text" 
                required
                placeholder="e.g. kitchen"
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
                placeholder="e.g. kitchen123"
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
              {isLoggingIn ? "Authorizing..." : "Log In to Kitchen"}
            </button>
          </form>
        </div>

        <div className="mt-8 text-center p-4 bg-stone-950 rounded-none border border-stone-800 text-[10px] text-stone-400 font-mono">
          <p className="font-bold text-orange-500 uppercase">Staff Mock credentials:</p>
          <p className="mt-1">Username: <code className="text-white bg-stone-900 px-1.5 py-0.5 border border-stone-800 font-mono">kitchen</code> | Password: <code className="text-white bg-stone-900 px-1.5 py-0.5 border border-stone-800 font-mono">kitchen123</code></p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-stone-50 text-stone-900 min-h-screen font-sans flex flex-col">
      {/* Kitchen Header */}
      <header className="bg-stone-900 px-6 py-4 border-b-4 border-orange-600 flex flex-col md:flex-row md:items-center justify-between gap-4 text-white">
        <div className="flex items-center gap-3">
          <div className="bg-orange-600 p-2.5 rounded-none text-white">
            <ChefHat className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-2 uppercase">
              <span>Kitchen Display Board</span>
              <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded-none font-bold uppercase tracking-wider animate-pulse">Live Queue</span>
            </h1>
            <p className="text-[10px] text-stone-400 font-mono flex items-center gap-1.5 mt-0.5 uppercase">
              <MapPin className="w-3.5 h-3.5 text-orange-500" />
              <span>{user.branch_name} Branch Queue • Role: {user.role}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end md:self-auto">
          {/* Refresh & Polling toggle */}
          <div className="flex items-center gap-2 bg-stone-800 px-3 py-1.5 border border-stone-700 text-xs">
            <label className="text-[10px] text-stone-300 font-bold uppercase tracking-wider flex items-center gap-1 font-mono">
              <input 
                type="checkbox" 
                checked={autoPoll} 
                onChange={(e) => setAutoPoll(e.target.checked)}
                className="rounded-none border-stone-700 text-orange-600 focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5 bg-stone-900"
              />
              <span>Auto-refresh</span>
            </label>
            <button 
              onClick={fetchKitchenOrders}
              disabled={isLoadingOrders}
              className="p-1 text-orange-500 hover:text-orange-400 disabled:text-stone-700 transition-colors"
              title="Refresh Queue"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingOrders ? "animate-spin" : ""}`} />
            </button>
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

      {/* Orders Filter Toolbar */}
      <div className="bg-stone-100 px-6 py-3 border-b border-stone-200 flex gap-2 overflow-x-auto">
        {[
          { id: "active", label: "🔥 Active Queue", count: pendingCount + cookingCount + onTableCount },
          { id: "pending", label: "⏳ Pending Orders", count: pendingCount },
          { id: "cooking", label: "🍳 In Cooking", count: cookingCount },
          { id: "on_table", label: "✅ Ready & Served", count: onTableCount }
        ].map(filter => (
          <button
            key={filter.id}
            onClick={() => setStatusFilter(filter.id)}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all flex items-center gap-2 border rounded-none ${
              statusFilter === filter.id
                ? "bg-stone-900 text-white border-stone-900 shadow-sm font-black"
                : "bg-white border-stone-200 text-stone-600 hover:bg-stone-200"
            }`}
          >
            <span>{filter.label}</span>
            {filter.count > 0 && (
              <span className={`text-[9px] px-1.5 py-0.5 font-bold font-mono ${
                statusFilter === filter.id ? "bg-orange-600 text-white" : "bg-stone-200 text-stone-800"
              }`}>
                {filter.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Grid of Kitchen Tickets */}
      <div className="flex-1 p-6 overflow-y-auto">
        {ordersError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-800 rounded-none flex items-center gap-2 text-xs font-mono max-w-lg mx-auto">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{ordersError}</span>
          </div>
        )}

        {isLoadingOrders && orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-stone-400">
            <RefreshCw className="w-8 h-8 animate-spin text-orange-600 mb-2" />
            <p className="text-xs font-mono">Fetching ticket queue...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-24 text-stone-400 flex flex-col items-center justify-center">
            <ChefHat className="w-16 h-16 text-stone-200 mb-3" />
            <p className="font-extrabold text-sm uppercase tracking-wider text-stone-800">Kitchen Queue is Empty</p>
            <p className="text-xs mt-1 max-w-xs font-mono">No active orders found in the selected category for this branch.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredOrders.map(order => {
              // Time elapsed helper
              const utcDateStr = order.created_at.endsWith('Z') ? order.created_at : `${order.created_at}Z`;
              const minutesElapsed = Math.floor(
                (Date.now() - new Date(utcDateStr).getTime()) / 60000
              );
              
              const isUrgent = minutesElapsed > 15 && order.status !== "on_table";

              return (
                <div 
                  key={order.id}
                  className={`bg-white rounded-none border-2 border-stone-900 overflow-hidden flex flex-col justify-between shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] relative transition-all duration-200 ${
                    isUrgent ? "ring-4 ring-orange-500/20" : ""
                  }`}
                >
                  {/* Card Header */}
                  <div className="p-4 bg-stone-900 text-white border-b-2 border-stone-900 flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-white text-md uppercase">Table {order.table_number}</span>
                        <span className="text-[9px] px-1.5 py-0.5 bg-orange-600 text-white font-mono font-bold uppercase tracking-wider">
                          {order.order_type}
                        </span>
                      </div>
                      <p className="text-[10px] font-bold text-stone-300 truncate max-w-[140px] uppercase mt-1 font-mono">
                        {order.customer_name}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="font-mono text-[9px] text-stone-400 block">
                        #{order.id}
                      </span>
                      <div className="flex items-center gap-1 mt-1 text-[10px] text-stone-300 justify-end font-mono">
                        <Clock className={`w-3.5 h-3.5 ${isUrgent ? "text-orange-500 animate-pulse" : "text-stone-400"}`} />
                        <span className={`font-bold uppercase tracking-wider ${isUrgent ? "text-orange-400 animate-pulse" : ""}`}>
                          {minutesElapsed}m ago
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Order Items List */}
                  <div className="p-4 flex-1 space-y-3 bg-stone-50">
                    {order.items.map((it, idx) => (
                      <div key={idx} className="flex gap-2 items-start justify-between">
                        <div className="flex gap-2 items-start flex-1 min-w-0">
                          <div className="bg-stone-900 text-white font-black w-6 h-6 flex items-center justify-center shrink-0 text-xs font-mono">
                            {it.quantity}x
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-extrabold text-stone-900 uppercase tracking-wide leading-tight mt-0.5">
                              {it.menu_item?.name}
                            </p>
                            {it.special_notes ? (
                              <p className="text-[10px] text-orange-950 bg-orange-50 px-2 py-0.5 border border-orange-200 font-mono inline-block mt-1 uppercase tracking-wider">
                                ⚠️ "{it.special_notes}"
                              </p>
                            ) : null}
                          </div>
                        </div>

                        {/* Decline button next to each menu item, ONLY on pending orders */}
                        {order.status === "pending" && (
                          <button
                            onClick={() => handleDeclineOrderItem(order.id, it.menu_item_id, it.special_notes || "")}
                            className="px-2 py-1 bg-red-100 hover:bg-red-200 text-red-700 hover:text-red-900 text-[10px] font-bold uppercase tracking-wider transition-colors font-mono rounded-none shrink-0"
                            title="Decline this item"
                          >
                            Decline
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Status & Action Footer */}
                  <div className="p-4 bg-white border-t border-stone-200 flex items-center justify-between gap-2.5">
                    <div className="flex flex-col">
                      <span className="text-[9px] text-stone-400 uppercase font-bold tracking-wider">Status</span>
                      <span className={`text-[11px] font-black uppercase tracking-wider ${
                        order.status === "pending" ? "text-stone-900" :
                        order.status === "accepted" ? "text-amber-600" :
                        order.status === "cooking" ? "text-orange-600" : "text-emerald-700"
                      }`}>
                        {order.status === "on_table" ? "Served" : order.status}
                      </span>
                    </div>

                    {/* Progress Action Buttons */}
                    {order.status !== "on_table" && (
                      <button
                        onClick={() => handleProgressStatus(order.id, order.status)}
                        className={`px-3 py-2 rounded-none font-bold text-[10px] uppercase tracking-wider transition-all active:scale-95 flex items-center gap-1.5 shrink-0 ${
                          order.status === "pending"
                            ? "bg-stone-900 hover:bg-stone-800 text-white"
                            : order.status === "accepted"
                            ? "bg-amber-600 text-white hover:bg-amber-700"
                            : "bg-orange-600 text-white hover:bg-orange-700"
                        }`}
                      >
                        {order.status === "pending" && (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Accept</span>
                          </>
                        )}
                        {order.status === "accepted" && (
                          <>
                            <Flame className="w-3.5 h-3.5" />
                            <span>Cook</span>
                          </>
                        )}
                        {order.status === "cooking" && (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Done Cooking</span>
                          </>
                        )}
                      </button>
                    )}

                    {order.status === "on_table" && (
                      <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 rounded-none text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 shrink-0 font-mono">
                        <Check className="w-3.5 h-3.5" />
                        <span>Ready at Table</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bluetooth Printer Summary Modal */}
      {printedReceiptOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/80 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white text-stone-900 w-full max-w-sm border-4 border-double border-stone-900 p-6 shadow-2xl relative flex flex-col font-mono animate-scale-in">
            {/* Simulation Header */}
            <div className="text-center pb-4 border-b border-dashed border-stone-300">
              <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-[10px] font-bold uppercase tracking-wider mb-2 font-sans rounded-full">
                📶 Bluetooth Connected
              </span>
              <h3 className="font-extrabold text-sm uppercase tracking-widest text-stone-800 animate-pulse">*** RECEIPT PRINTED ***</h3>
              <p className="text-[10px] text-stone-500 mt-1">RAWON TM THERMAL PRINTER v1.0</p>
            </div>

            {/* Virtual Paper Roll */}
            <div className="py-4 space-y-3 text-xs leading-relaxed">
              <div className="flex justify-between font-bold">
                <span>ORDER: #{printedReceiptOrder.id}</span>
                <span>TABLE: {printedReceiptOrder.table_number}</span>
              </div>
              <div className="border-b border-dashed border-stone-200 pb-2">
                <p><span className="font-bold">CUST:</span> {printedReceiptOrder.customer_name ? printedReceiptOrder.customer_name.toUpperCase() : "GUEST"}</p>
                <p><span className="font-bold">TYPE:</span> {printedReceiptOrder.order_type.toUpperCase()}</p>
                <p><span className="font-bold">TIME:</span> {new Date(printedReceiptOrder.created_at.endsWith('Z') ? printedReceiptOrder.created_at : printedReceiptOrder.created_at + 'Z').toLocaleTimeString()}</p>
              </div>

              <div className="space-y-1.5 py-1">
                {printedReceiptOrder.items.map((it, idx) => (
                  <div key={idx} className="flex flex-col">
                    <span className="font-bold">{it.quantity}x {it.menu_item?.name.toUpperCase() || "UNKNOWN ITEM"}</span>
                    {it.special_notes && (
                      <span className="text-[10px] text-stone-500 italic uppercase">Note: {it.special_notes}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Simulation Footer */}
            <div className="text-center pt-4 border-t border-dashed border-stone-300">
              <p className="text-[10px] text-stone-500 uppercase tracking-wider font-bold">--- Sent to Cooking Queue ---</p>
              <button 
                onClick={() => setPrintedReceiptOrder(null)}
                className="mt-4 w-full py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-none font-bold text-xs uppercase tracking-wider transition-all shadow-sm font-sans"
              >
                Close Receipt Simulation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
