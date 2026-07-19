import React, { useState, useEffect, useRef } from "react";
import { Order, OrderStatus } from "../types";
import { ApiService } from "../services/api";
import { useAuth } from "../hooks/useAuth";
import LoginScreen from "../components/LoginScreen";
import EmployeeOrderEntry from './EmployeeOrderEntry';
import { Modal } from '../components/Modal';
import {
  Flame, Check, ChefHat, LogOut, Clock,
  MapPin, RefreshCw, AlertCircle, Printer
} from "lucide-react";
import { printKitchenTicket, connectPrinter, isPrinterConnected } from "../services/printer";

interface EmployeeAppProps {
  currentBranch: string;
}

const formatTimeElapsed = (totalMinutes: number) => {
  if (totalMinutes < 60) return `${totalMinutes}m ago`;
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const mins = totalMinutes % 60;
  
  let parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (mins > 0 || parts.length === 0) parts.push(`${mins}m`);
  
  return `${parts.join(" ")} ago`;
};

export default function EmployeeApp({ currentBranch }: EmployeeAppProps) {
  const auth = useAuth({ allowedRoles: ["employee", "admin", "cashier"] });

  // Orders state
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("cooking");
  const [autoPoll, setAutoPoll] = useState(true);
  const [activeTab, setActiveTab] = useState<"queue" | "order">("queue");
  
  const [autoPrintEnabled, setAutoPrintEnabledState] = useState(false);
  const autoPrintEnabledRef = useRef(false);
  
  const setAutoPrintEnabled = (val: boolean) => {
    setAutoPrintEnabledState(val);
    autoPrintEnabledRef.current = val;
  };

  const seenOrderIds = useRef<Set<number>>(new Set());
  
  const [printedReceiptOrder, setPrintedReceiptOrder] = useState<Order | null>(null);

  // Fetch employee orders
  const fetchEmployeeOrders = async () => {
    if (!auth.user) return;
    try {
      setIsLoadingOrders(true);
      setOrdersError(null);
      const activeBranch = auth.user.role === 'admin' ? currentBranch : auth.user.branch_name;
      const result = await ApiService.getOrders(activeBranch);
      
      // Use the ref here to avoid stale closures in the setInterval loop!
      if (autoPrintEnabledRef.current && isPrinterConnected()) {
        const newOrders = result.filter(o => o.status === "cooking" && !seenOrderIds.current.has(o.id));
        for (const o of newOrders) {
          try {
            await printKitchenTicket({
              branchName: o.branch_name,
              invoiceNumber: o.daily_order_number || o.id,
              tableNumber: o.table_number,
              customerName: o.customer_name || "Guest",
              orderType: o.order_type,
              createdAt: o.created_at,
              items: o.items.map(it => ({
                name: it.menu_item?.name || "Unknown",
                quantity: it.quantity,
                notes: it.special_notes || undefined,
              }))
            });
          } catch (e) {
            console.error("Auto print failed for order", o.id, e);
          }
        }
      }
      
      result.forEach(o => seenOrderIds.current.add(o.id));
      setOrders(result);
    } catch (err: any) {
      setOrdersError(err.message || "Failed to load employee orders.");
    } finally {
      setIsLoadingOrders(false);
    }
  };

  // Poll orders
  useEffect(() => {
    if (!auth.user) return;
    fetchEmployeeOrders();

    let pollInterval: NodeJS.Timeout;
    if (autoPoll) {
      pollInterval = setInterval(() => {
        fetchEmployeeOrders();
      }, 8000);
    }

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [auth.user, autoPoll]);

  // Auto close receipt modal after 3 seconds
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (printedReceiptOrder) {
      timeout = setTimeout(() => {
        setPrintedReceiptOrder(null);
      }, 3000);
    }
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [printedReceiptOrder]);

  const handleLogout = () => {
    auth.handleLogout();
    setOrders([]);
  };

  const handleBluetoothPrint = async (order: Order) => {
    try {
      await printKitchenTicket({
        branchName: order.branch_name,
        invoiceNumber: order.daily_order_number || order.id,
        tableNumber: order.table_number,
        customerName: order.customer_name || "Guest",
        orderType: order.order_type,
        createdAt: order.created_at,
        items: order.items.map(it => ({
          name: it.menu_item?.name || "Unknown",
          quantity: it.quantity,
          notes: it.special_notes || undefined,
        }))
      });
    } catch (err: any) {
      alert(`Print failed: ${err.message}`);
    }
  };

  // Progress order status
  const handleProgressStatus = async (orderId: number, currentStatus: OrderStatus) => {
    let nextStatus: OrderStatus;
    if (currentStatus === "cooking") {
      nextStatus = "on_table";
    } else {
      return;
    }

    try {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: nextStatus } : o));
      await ApiService.updateOrderStatus(orderId, nextStatus);
    } catch (err: any) {
      alert(`Failed to update status: ${err.message}`);
      fetchEmployeeOrders();
    }
  };


  const handleConnectPrinter = async () => {
    try {
      await connectPrinter();
      setAutoPrintEnabled(true);
      alert("Printer connected! Auto-print is now active for new incoming orders.");
    } catch (err: any) {
      alert(`Failed to connect printer: ${err.message}`);
      setAutoPrintEnabled(false);
    }
  };

  // Filter orders
  const filteredOrders = orders.filter(o => {
    if (statusFilter === "active") return o.status !== "completed" && o.status !== "discounted";
    return o.status === statusFilter;
  });

  const cookingCount = orders.filter(o => o.status === "cooking").length;
  const onTableCount = orders.filter(o => o.status === "on_table").length;

  if (!auth.isAuthenticated) {
    return (
      <LoginScreen
        title="Employee Console"
        subtitle="Rawon TM Back-Of-House App"
        icon={<ChefHat className="w-10 h-10 text-white" />}
        buttonText="Log In to Employee"
        loadingText="Authorizing..."
        credentialHint={{ username: "employee", password: "employee123" }}
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
      {/* Employee Header */}
      <header className="bg-stone-900 px-6 py-4 border-b-4 border-orange-600 flex flex-col md:flex-row md:items-center justify-between gap-4 text-white">
        <div className="flex items-center gap-3">
          <div className="bg-orange-600 p-2.5 rounded-none text-white">
            <ChefHat className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-2 uppercase">
              <span>Employee Display Board</span>
              <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded-none font-bold uppercase tracking-wider animate-pulse">Live Queue</span>
            </h1>
            <p className="text-[10px] text-stone-400 font-mono flex items-center gap-1.5 mt-0.5 uppercase">
              <MapPin className="w-3.5 h-3.5 text-orange-500" />
              <span>{auth.user!.role === 'admin' ? currentBranch : auth.user!.branch_name} Branch • Role: {auth.user!.role}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end md:self-auto">
          <div className="flex items-center bg-stone-800 text-xs font-bold uppercase tracking-wider overflow-hidden">
            <button onClick={() => setActiveTab("queue")} className={`px-4 py-2 transition-colors ${activeTab === 'queue' ? 'bg-orange-600 text-white' : 'text-stone-400 hover:text-stone-200'}`}>Live Queue</button>
            <button onClick={() => setActiveTab("order")} className={`px-4 py-2 transition-colors ${activeTab === 'order' ? 'bg-orange-600 text-white' : 'text-stone-400 hover:text-stone-200'}`}>Order Entry</button>
          </div>

          <button
            onClick={handleConnectPrinter}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-none text-xs font-bold uppercase tracking-wider transition-all ${autoPrintEnabled ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-stone-700 text-stone-300 hover:bg-stone-600"}`}
            title="Connect Auto-Printer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden md:inline">{autoPrintEnabled ? "Auto-Print ON" : "Connect Printer"}</span>
          </button>

          {activeTab === 'queue' && (
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
              onClick={fetchEmployeeOrders}
              disabled={isLoadingOrders}
              className="p-1 text-orange-500 hover:text-orange-400 disabled:text-stone-700 transition-colors"
              title="Refresh Queue"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingOrders ? "animate-spin" : ""}`} />
            </button>
          </div>
          )}

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-none text-xs font-bold uppercase tracking-wider transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {activeTab === "queue" ? (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Orders Filter Toolbar */}
          <div className="bg-stone-100 px-6 py-3 border-b border-stone-200 flex gap-2 overflow-x-auto">
          {[
            { id: "active", label: "ALL ACTIVE TICKETS", count: orders.filter(o => o.status !== "completed" && o.status !== "discounted").length },
            { id: "cooking", label: "COOKING", count: cookingCount },
            { id: "on_table", label: "SERVED", count: onTableCount }
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

      {/* Grid of Employee Tickets */}
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
            <p className="font-extrabold text-sm uppercase tracking-wider text-stone-800">Employee Queue is Empty</p>
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
                        {order.order_type === "dine-in" && (
                          <span className="font-black text-white text-md uppercase">Table {order.table_number}</span>
                        )}
                        <span className="text-[9px] px-1.5 py-0.5 bg-orange-600 text-white font-mono font-bold uppercase tracking-wider">
                          {order.order_type === "takeaway" ? "Takeaway" : order.order_type}
                        </span>
                      </div>
                      <p className="text-[10px] font-bold text-stone-300 truncate max-w-[140px] uppercase mt-1 font-mono">{order.customer_name}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-[9px] text-stone-400 block">#{order.daily_order_number || order.id}</span>
                      <div className="flex items-center gap-1 mt-1 text-[10px] text-stone-300 justify-end font-mono">
                        <Clock className={`w-3.5 h-3.5 ${isUrgent ? "text-orange-500 animate-pulse" : "text-stone-400"}`} />
                        <span className={`font-bold uppercase tracking-wider ${isUrgent ? "text-orange-400 animate-pulse" : ""}`}>{formatTimeElapsed(minutesElapsed)}</span>
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
                              <div className="mt-1.5 flex flex-col gap-1">
                                {it.special_notes.split(' | ').map((note, i) => (
                                  <p key={i} className="text-[10px] text-orange-950 bg-orange-50 px-2 py-1 border-l-2 border-orange-400 font-mono inline-block uppercase tracking-wider shadow-sm">📝 {note}</p>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-4 bg-white border-t border-stone-200 flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col">
                        <span className="text-[9px] text-stone-400 uppercase font-bold tracking-wider">Status</span>
                        <span className={`text-[11px] font-black uppercase tracking-wider ${
                          order.status === "cooking" ? "text-orange-600" : "text-emerald-700"
                        }`}>
                          {order.status === "on_table" ? "Served" : order.status}
                        </span>
                      </div>
                      
                      <button
                        onClick={() => setPrintedReceiptOrder(order)}
                        className="p-1.5 rounded-none transition-all active:scale-95 bg-stone-100 border border-stone-200 text-stone-600 hover:bg-stone-200 hover:text-stone-900"
                        title="Reprint Ticket"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </div>

                    {order.status === "cooking" && (
                      <button
                        onClick={() => handleProgressStatus(order.id, order.status)}
                        className="px-3 py-2 rounded-none font-bold text-[10px] uppercase tracking-wider transition-all active:scale-95 flex items-center gap-1.5 shrink-0 bg-blue-600 text-white hover:bg-blue-700"
                      >
                        <Check className="w-3.5 h-3.5" /><span>Mark as Served</span>
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
      </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-hidden">
          <EmployeeOrderEntry currentBranch={auth.user!.role === 'admin' ? currentBranch : (auth.user!.branch_name || currentBranch)} onOrderPlaced={() => setActiveTab("queue")} />
        </div>
      )}

      {/* Bluetooth Printer Receipt Modal */}
      <Modal
        isOpen={!!printedReceiptOrder}
        onClose={() => setPrintedReceiptOrder(null)}
        backdropClassName="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/80 backdrop-blur-xs p-4 animate-fade-in"
        className="bg-white text-stone-900 w-full max-w-sm border-4 border-double border-stone-900 p-6 shadow-2xl relative flex flex-col font-mono animate-scale-in"
      >
        {printedReceiptOrder && (
          <>
            <div className="text-center pb-4 border-b border-dashed border-stone-300">
              <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-[10px] font-bold uppercase tracking-wider mb-2 font-sans rounded-full">📶 Bluetooth Connected</span>
              <h3 className="font-extrabold text-sm uppercase tracking-widest text-stone-800 animate-pulse">*** RECEIPT PRINTED ***</h3>
            </div>
            <div className="py-4 space-y-3 text-xs leading-relaxed">
              <div className="flex justify-between font-bold">
                <span>ORDER: #{printedReceiptOrder.daily_order_number || printedReceiptOrder.id}</span>
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
            <div className="text-center pt-4 border-t border-dashed border-stone-300 flex flex-col gap-3">
              <button onClick={() => handleBluetoothPrint(printedReceiptOrder)} className="w-full py-2 bg-orange-600 text-white font-bold text-xs uppercase hover:bg-orange-500 rounded-none flex items-center justify-center gap-2">
                <Printer className="w-4 h-4" /> Print Kitchen Ticket
              </button>
              <p className="text-[10px] text-stone-500 uppercase tracking-wider font-bold">--- Sent to Cooking Queue ---</p>
              <p className="text-[9px] text-stone-400 mt-2">Closing automatically...</p>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}