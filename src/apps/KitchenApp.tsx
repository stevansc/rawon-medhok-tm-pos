import React, { useState, useEffect } from "react";
import { Order, OrderStatus } from "../types";
import { ApiService } from "../services/api";
import { useAuth } from "../hooks/useAuth";
import LoginScreen from "../components/LoginScreen";
import {
  Flame, Check, ChefHat, LogOut, Clock,
  MapPin, RefreshCw, AlertCircle
} from "lucide-react";

interface KitchenAppProps {
  currentBranch: string;
}

export default function KitchenApp({ currentBranch }: KitchenAppProps) {
  const auth = useAuth({ allowedRoles: ["kitchen", "admin", "cashier"] });

  // Orders state
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [autoPoll, setAutoPoll] = useState(true);
  const [printedReceiptOrder, setPrintedReceiptOrder] = useState<Order | null>(null);

  // Fetch kitchen orders
  const fetchKitchenOrders = async () => {
    if (!auth.user) return;
    try {
      setIsLoadingOrders(true);
      setOrdersError(null);
      const result = await ApiService.getOrders(auth.user.branch_name || currentBranch);
      setOrders(result);
    } catch (err: any) {
      setOrdersError(err.message || "Failed to load kitchen orders.");
    } finally {
      setIsLoadingOrders(false);
    }
  };

  // Poll orders
  useEffect(() => {
    if (!auth.user) return;
    fetchKitchenOrders();

    let pollInterval: NodeJS.Timeout;
    if (autoPoll) {
      pollInterval = setInterval(() => {
        fetchKitchenOrders();
      }, 8000);
    }

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [auth.user, autoPoll]);

  const handleLogout = () => {
    auth.handleLogout();
    setOrders([]);
  };

  // Progress order status
  const handleProgressStatus = async (orderId: number, currentStatus: OrderStatus) => {
    let nextStatus: OrderStatus;
    if (currentStatus === "pending") {
      nextStatus = "cooking";
    } else if (currentStatus === "cooking" || currentStatus === "accepted") {
      nextStatus = "on_table";
    } else {
      return;
    }

    try {
      const orderToPrint = orders.find(o => o.id === orderId);
      if (orderToPrint && currentStatus === "pending") {
        setPrintedReceiptOrder({ ...orderToPrint, status: "cooking" });
      }

      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: nextStatus } : o));
      await ApiService.updateOrderStatus(orderId, nextStatus);
    } catch (err: any) {
      alert(`Failed to update status: ${err.message}`);
      fetchKitchenOrders();
    }
  };

  // Decline an individual item
  const handleDeclineOrderItem = async (orderId: number, itemId: number) => {
    try {
      const updatedOrder = await ApiService.declineOrderItem(orderId, itemId);
      setOrders(prev => prev.map(o => o.id === orderId ? updatedOrder : o));
    } catch (err: any) {
      alert(`Failed to decline item: ${err.message}`);
    }
  };

  // Filter orders
  const filteredOrders = orders.filter(o => {
    if (statusFilter === "active") return o.status !== "completed";
    return o.status === statusFilter;
  });

  const pendingCount = orders.filter(o => o.status === "pending").length;
  const cookingCount = orders.filter(o => o.status === "cooking" || o.status === "accepted").length;
  const onTableCount = orders.filter(o => o.status === "on_table").length;

  if (!auth.isAuthenticated) {
    return (
      <LoginScreen
        title="Kitchen Console"
        subtitle="Rawon TM Back-Of-House App"
        icon={<ChefHat className="w-10 h-10 text-white" />}
        buttonText="Log In to Kitchen"
        loadingText="Authorizing..."
        credentialHint={{ username: "kitchen", password: "kitchen123" }}
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
              <span>{auth.user!.branch_name || currentBranch} Branch • Role: {auth.user!.role}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end md:self-auto">
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
            <p className="text-xs mt-1 max-w-xs font-mono">No active orders found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredOrders.map(order => {
              const utcDateStr = order.created_at.endsWith('Z') ? order.created_at : `${order.created_at}Z`;
              const minutesElapsed = Math.floor((Date.now() - new Date(utcDateStr).getTime()) / 60000);
              const isUrgent = minutesElapsed > 15 && order.status !== "on_table";

              return (
                <div
                  key={order.id}
                  className={`bg-white rounded-none border-2 border-stone-900 overflow-hidden flex flex-col justify-between shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] relative transition-all duration-200 ${isUrgent ? "ring-4 ring-orange-500/20" : ""}`}
                >
                  <div className="p-4 bg-stone-900 text-white border-b-2 border-stone-900 flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-white text-md uppercase">Table {order.table_number}</span>
                        <span className="text-[9px] px-1.5 py-0.5 bg-orange-600 text-white font-mono font-bold uppercase tracking-wider">{order.order_type}</span>
                      </div>
                      <p className="text-[10px] font-bold text-stone-300 truncate max-w-[140px] uppercase mt-1 font-mono">{order.customer_name}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-[9px] text-stone-400 block">#{order.id}</span>
                      <div className="flex items-center gap-1 mt-1 text-[10px] text-stone-300 justify-end font-mono">
                        <Clock className={`w-3.5 h-3.5 ${isUrgent ? "text-orange-500 animate-pulse" : "text-stone-400"}`} />
                        <span className={`font-bold uppercase tracking-wider ${isUrgent ? "text-orange-400 animate-pulse" : ""}`}>{minutesElapsed}m ago</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 flex-1 space-y-3 bg-stone-50">
                    {order.items.map((it, idx) => (
                      <div key={idx} className="flex gap-2 items-start justify-between">
                        <div className="flex gap-2 items-start flex-1 min-w-0">
                          <div className="bg-stone-900 text-white font-black w-6 h-6 flex items-center justify-center shrink-0 text-xs font-mono">{it.quantity}x</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-extrabold text-stone-900 uppercase tracking-wide leading-tight mt-0.5">{it.menu_item?.name}</p>
                            {it.special_notes && (
                              <p className="text-[10px] text-orange-950 bg-orange-50 px-2 py-0.5 border border-orange-200 font-mono inline-block mt-1 uppercase tracking-wider">⚠️ "{it.special_notes}"</p>
                            )}
                          </div>
                        </div>
                        {order.status === "pending" && it.id && (
                          <button
                            onClick={() => handleDeclineOrderItem(order.id, it.id!)}
                            className="px-2 py-1 bg-red-100 hover:bg-red-200 text-red-700 hover:text-red-900 text-[10px] font-bold uppercase tracking-wider transition-colors font-mono rounded-none shrink-0"
                            title="Decline this item"
                          >
                            Decline
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

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

                    {order.status !== "on_table" && (
                      <button
                        onClick={() => handleProgressStatus(order.id, order.status)}
                        className={`px-3 py-2 rounded-none font-bold text-[10px] uppercase tracking-wider transition-all active:scale-95 flex items-center gap-1.5 shrink-0 ${
                          order.status === "pending" ? "bg-stone-900 hover:bg-stone-800 text-white" :
                          order.status === "accepted" ? "bg-amber-600 text-white hover:bg-amber-700" :
                          "bg-orange-600 text-white hover:bg-orange-700"
                        }`}
                      >
                        {order.status === "pending" && <><Check className="w-3.5 h-3.5" /><span>Accept</span></>}
                        {order.status === "accepted" && <><Flame className="w-3.5 h-3.5" /><span>Cook</span></>}
                        {order.status === "cooking" && <><Check className="w-3.5 h-3.5" /><span>Done Cooking</span></>}
                      </button>
                    )}

                    {order.status === "on_table" && (
                      <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 rounded-none text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 shrink-0 font-mono">
                        <Check className="w-3.5 h-3.5" /><span>Ready at Table</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bluetooth Printer Receipt Modal */}
      {printedReceiptOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/80 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white text-stone-900 w-full max-w-sm border-4 border-double border-stone-900 p-6 shadow-2xl relative flex flex-col font-mono animate-scale-in">
            <div className="text-center pb-4 border-b border-dashed border-stone-300">
              <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-[10px] font-bold uppercase tracking-wider mb-2 font-sans rounded-full">📶 Bluetooth Connected</span>
              <h3 className="font-extrabold text-sm uppercase tracking-widest text-stone-800 animate-pulse">*** RECEIPT PRINTED ***</h3>
            </div>
            <div className="py-4 space-y-3 text-xs leading-relaxed">
              <div className="flex justify-between font-bold">
                <span>ORDER: #{printedReceiptOrder.id}</span>
                <span>TABLE: {printedReceiptOrder.table_number}</span>
              </div>
              <div className="border-b border-dashed border-stone-200 pb-2">
                <p><span className="font-bold">CUST:</span> {printedReceiptOrder.customer_name ? printedReceiptOrder.customer_name.toUpperCase() : "GUEST"}</p>
                <p><span className="font-bold">TYPE:</span> {printedReceiptOrder.order_type.toUpperCase()}</p>
              </div>
              <div className="space-y-1.5 py-1">
                {printedReceiptOrder.items.map((it, idx) => (
                  <div key={idx} className="flex flex-col">
                    <span className="font-bold">{it.quantity}x {it.menu_item?.name.toUpperCase() || "UNKNOWN ITEM"}</span>
                    {it.special_notes && <span className="text-[10px] text-stone-500 italic uppercase">Note: {it.special_notes}</span>}
                  </div>
                ))}
              </div>
            </div>
            <div className="text-center pt-4 border-t border-dashed border-stone-300">
              <p className="text-[10px] text-stone-500 uppercase tracking-wider font-bold">--- Sent to Cooking Queue ---</p>
              <button
                onClick={() => setPrintedReceiptOrder(null)}
                className="mt-4 w-full py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-none font-bold text-xs uppercase tracking-wider transition-all shadow-sm font-sans"
              >
                Close Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
