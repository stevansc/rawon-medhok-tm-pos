import React, { useState, useEffect } from "react";
import { Order, OrderStatus, User } from "../types";
import { ApiService } from "../services/api";
import { 
  Banknote, Receipt, LogOut, Search, MapPin, 
  RefreshCw, AlertCircle, ShoppingCart, Check, CreditCard, QrCode, ArrowRight
} from "lucide-react";

interface CashierAppProps {
  currentBranch: string;
}

export default function CashierApp({ currentBranch }: CashierAppProps) {
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
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all_active"); // "all_active" | "completed" | "on_table"

  // Selected order for checkout detail
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"Cash" | "QRIS" | "Debit">("QRIS");
  const [cashAmountPaid, setCashAmountPaid] = useState<string>("");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [showInvoicePrintout, setShowInvoicePrintout] = useState(false);

  // Load saved session on mount
  useEffect(() => {
    const savedUser = ApiService.getSavedUser();
    const savedToken = ApiService.getToken();
    
    if (savedUser && (savedUser.role === "cashier" || savedUser.role === "admin")) {
      setUser(savedUser);
      setToken(savedToken);
    } else if (savedUser) {
      ApiService.logout();
      setUser(null);
      setToken(null);
    }
  }, []);

  // Fetch cashier orders
  const fetchOrders = async () => {
    if (!user) return;
    try {
      setIsLoadingOrders(true);
      setOrdersError(null);
      const result = await ApiService.getOrders(user.branch_name);
      setOrders(result);
    } catch (err: any) {
      setOrdersError(err.message || "Failed to load orders.");
    } finally {
      setIsLoadingOrders(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchOrders();
  }, [user]);

  // Handle Cashier Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;

    try {
      setIsLoggingIn(true);
      setLoginError(null);
      
      const response = await ApiService.login(username, password);
      const loggedUser = ApiService.getSavedUser();

      if (loggedUser && (loggedUser.role === "cashier" || loggedUser.role === "admin")) {
        setUser(loggedUser);
        setToken(response.access_token);
      } else {
        ApiService.logout();
        throw new Error("Unauthorized role. Cashier App requires 'cashier' (or admin) credentials.");
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
    setSelectedOrder(null);
  };

  // Complete checkout & process payment
  const handleProcessPayment = async () => {
    if (!selectedOrder) return;
    
    // For cash payments, ensure sufficient cash was provided
    if (paymentMethod === "Cash") {
      const parsedCash = parseFloat(cashAmountPaid);
      if (isNaN(parsedCash) || parsedCash < selectedOrder.total_amount) {
        alert("Insufficient cash payment amount.");
        return;
      }
    }

    try {
      setIsProcessingPayment(true);
      
      // Update order status to "completed" with the selected payment method
      const updated = await ApiService.updateOrderStatus(selectedOrder.id, "completed", paymentMethod);
      
      // Update state
      setOrders(prev => prev.map(o => o.id === selectedOrder.id ? updated : o));
      setSelectedOrder(updated);
      setShowInvoicePrintout(true);
      fetchOrders(); // Refresh table list
    } catch (err: any) {
      alert(`Payment failed: ${err.message}`);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Filter orders based on status & search
  const filteredOrders = orders.filter(o => {
    // Search filter
    const matchesSearch = 
      o.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.table_number.toString() === searchQuery ||
      o.id.toString().includes(searchQuery);

    if (!matchesSearch) return false;

    // Status filter
    if (statusFilter === "all_active") {
      return o.status !== "completed";
    } else if (statusFilter === "completed") {
      return o.status === "completed";
    } else if (statusFilter === "on_table") {
      return o.status === "on_table";
    }
    return true;
  });

  // Calculate change for cash payment
  const getChange = () => {
    if (!selectedOrder || paymentMethod !== "Cash") return 0;
    const paid = parseFloat(cashAmountPaid);
    if (isNaN(paid)) return 0;
    return Math.max(0, paid - selectedOrder.total_amount);
  };

  if (!user || !token) {
    return (
      <div className="mx-auto max-w-md bg-stone-900 text-white min-h-screen flex flex-col justify-center px-6 py-12 font-sans border-x border-stone-800">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-orange-600 rounded-none flex items-center justify-center mb-4 border-2 border-stone-900 shadow-[4px_4px_0px_0px_rgba(255,255,255,0.9)]">
            <Banknote className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white uppercase font-sans">Cashier Register</h2>
          <p className="text-[10px] text-orange-500 mt-1 uppercase tracking-widest font-mono">Rawon TM Point of Sale Checkout</p>
        </div>

        <div className="bg-stone-950 rounded-none p-6 shadow-2xl border-2 border-orange-600">
          <h3 className="font-bold text-sm text-white mb-4 flex items-center gap-2 uppercase tracking-wider">
            <Banknote className="w-4 h-4 text-orange-500 animate-pulse" />
            <span>Cashier Sign-In Required</span>
          </h3>

          <form onSubmit={handleLogin} className="space-y-4 text-sm">
            <div>
              <label className="block text-[10px] font-bold text-stone-300 uppercase tracking-wider mb-1">Username</label>
              <input 
                type="text" 
                required
                placeholder="e.g. cashier"
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
                placeholder="e.g. cashier123"
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
              {isLoggingIn ? "Authenticating..." : "Open Cash Drawer"}
            </button>
          </form>
        </div>

        <div className="mt-8 text-center p-4 bg-stone-950 rounded-none border border-stone-800 text-[10px] text-stone-400 font-mono">
          <p className="font-bold text-orange-500 uppercase">Staff Mock credentials:</p>
          <p className="mt-1">Username: <code className="text-white bg-stone-900 px-1.5 py-0.5 border border-stone-800 font-mono">cashier</code> | Password: <code className="text-white bg-stone-900 px-1.5 py-0.5 border border-stone-800 font-mono">cashier123</code></p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-stone-50 text-stone-900 min-h-screen font-sans flex flex-col md:flex-row overflow-hidden">
      
      {/* LEFT: Active order list & Search */}
      <div className="flex-1 flex flex-col min-h-0 border-r border-stone-200">
        
        {/* Header */}
        <header className="bg-stone-900 px-6 py-4 border-b-4 border-orange-600 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-orange-600 text-white p-2.5 rounded-none">
              <Banknote className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-md font-black tracking-tight text-white flex items-center gap-2 uppercase">
                <span>Front Cashier Desk</span>
                <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded-none font-bold uppercase tracking-wider">Shift Active</span>
              </h1>
              <p className="text-[10px] text-stone-400 font-mono flex items-center gap-1.5 mt-0.5 uppercase">
                <MapPin className="w-3.5 h-3.5 text-orange-500" />
                <span>{user.branch_name} Branch Ledger • Cashier: {user.username}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button 
              onClick={fetchOrders}
              disabled={isLoadingOrders}
              className="p-2 bg-stone-800 hover:bg-stone-700 text-orange-500 transition-colors border border-stone-700"
              title="Refresh Queue"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingOrders ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-none text-xs font-bold uppercase tracking-wider transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Shift End</span>
            </button>
          </div>
        </header>

        {/* Toolbar */}
        <div className="bg-stone-100 p-4 border-b border-stone-200 flex flex-col sm:flex-row gap-3 items-center justify-between shrink-0">
          {/* Search bar */}
          <div className="relative w-full sm:w-64">
            <input 
              type="text" 
              placeholder="Search table, ID or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-stone-300 pl-9 pr-3 py-2 rounded-none text-xs text-stone-900 focus:outline-none focus:border-orange-600 font-mono"
            />
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
          </div>

          {/* Quick Filters */}
          <div className="flex gap-1.5 w-full sm:w-auto overflow-x-auto">
            {[
              { id: "all_active", label: "⏳ Unpaid" },
              { id: "on_table", label: "🍽️ Served / Eat-in" },
              { id: "completed", label: "✅ Paid / Closed" }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-all rounded-none border ${
                  statusFilter === f.id
                    ? "bg-stone-900 border-stone-900 text-white font-black"
                    : "bg-white border-stone-200 text-stone-600 hover:bg-stone-200"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Orders Table Grid */}
        <div className="flex-1 p-4 overflow-y-auto">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-20 text-stone-500">
              <p className="font-bold text-sm uppercase">No tickets matching filter</p>
              <p className="text-xs mt-1 font-mono">Select other filters or refresh ledger.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredOrders.map(order => (
                <div 
                  key={order.id}
                  onClick={() => {
                    setSelectedOrder(order);
                    setShowInvoicePrintout(false);
                    setCashAmountPaid("");
                  }}
                  className={`p-4 rounded-none border cursor-pointer text-left transition-all ${
                    selectedOrder?.id === order.id
                      ? "bg-white border-2 border-stone-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)]"
                      : "bg-white border-stone-200 hover:border-stone-900 hover:shadow-sm"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-black text-stone-900 text-md uppercase">Table {order.table_number}</span>
                      <p className="text-[10px] text-stone-500 mt-1 font-bold uppercase tracking-wider font-mono truncate max-w-[120px]">{order.customer_name}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-none text-[9px] font-bold uppercase tracking-wider font-mono ${
                      order.status === "completed" 
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                        : order.status === "on_table"
                        ? "bg-orange-100 text-orange-950 border border-orange-200"
                        : "bg-stone-100 text-stone-800 border border-stone-200"
                    }`}>
                      {order.status === "on_table" ? "Served" : order.status}
                    </span>
                  </div>

                  <div className="mt-4 pt-3 border-t border-dashed border-stone-200 flex justify-between items-center">
                    <span className="text-[9px] text-stone-400 font-mono">#{order.id} • {order.items.length} ITM</span>
                    <span className="font-bold text-xs text-orange-600 font-mono">Rp {order.total_amount.toLocaleString("id-ID")}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: Selected Order checkout panel */}
      <div className="w-full md:w-[380px] bg-stone-900 text-white p-6 flex flex-col justify-between overflow-y-auto shrink-0 border-t md:border-t-0 md:border-l-4 md:border-stone-950">
        {selectedOrder ? (
          <div className="flex-1 flex flex-col min-h-0 justify-between">
            <div>
              {/* Receipt Header */}
              <div className="border-b border-stone-800 pb-4 text-center">
                <Receipt className="w-8 h-8 text-orange-500 mx-auto mb-2" />
                <h3 className="font-black text-sm text-white uppercase tracking-wider">Rawon TM POS</h3>
                <p className="text-[9px] text-stone-400 font-mono mt-0.5 uppercase tracking-widest">{selectedOrder.branch_name} Branch</p>
              </div>

              {/* Order Metadata */}
              <div className="py-4 space-y-1 text-xs border-b border-stone-800 font-mono text-[11px]">
                <div className="flex justify-between text-stone-400">
                  <span>INVOICE ID:</span>
                  <span className="font-bold text-white">#{selectedOrder.id}</span>
                </div>
                <div className="flex justify-between text-stone-400">
                  <span>TABLE NO:</span>
                  <span className="font-bold text-white uppercase">Table {selectedOrder.table_number}</span>
                </div>
                <div className="flex justify-between text-stone-400">
                  <span>CUSTOMER:</span>
                  <span className="font-bold text-white uppercase">{selectedOrder.customer_name}</span>
                </div>
                <div className="flex justify-between text-stone-400">
                  <span>CREATED:</span>
                  <span className="text-white">{new Date(selectedOrder.created_at.endsWith('Z') ? selectedOrder.created_at : selectedOrder.created_at + 'Z').toLocaleTimeString()}</span>
                </div>
              </div>

              {/* Item details */}
              <div className="py-4 space-y-2.5 max-h-[160px] overflow-y-auto border-b border-stone-800">
                {selectedOrder.items.map((item, i) => (
                  <div key={i} className="text-xs">
                    <div className="flex justify-between text-white font-medium">
                      <span>{item.quantity}x {item.menu_item?.name}</span>
                      <span className="font-mono">Rp {(item.menu_item?.price * item.quantity).toLocaleString("id-ID")}</span>
                    </div>
                    {item.special_notes && (
                      <p className="text-[10px] text-orange-400 bg-stone-950 px-1.5 py-0.5 rounded-none mt-0.5 font-mono">
                        * {item.special_notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* Billing totals */}
              <div className="py-4 space-y-2 text-xs border-b border-stone-800 font-mono text-[11px]">
                <div className="flex justify-between text-stone-400">
                  <span>SUBTOTAL:</span>
                  <span>Rp {(selectedOrder.total_amount - selectedOrder.tax_amount).toLocaleString("id-ID")}</span>
                </div>
                <div className="flex justify-between text-stone-400">
                  <span>GOVT TAX:</span>
                  <span>Rp {selectedOrder.tax_amount.toLocaleString("id-ID")}</span>
                </div>
                <div className="flex justify-between font-black text-sm text-orange-500 pt-2 border-t border-dashed border-stone-800">
                  <span>GRAND TOTAL</span>
                  <span>Rp {selectedOrder.total_amount.toLocaleString("id-ID")}</span>
                </div>
              </div>

              {/* PAYMENT PROCESSOR */}
              {selectedOrder.status !== "completed" ? (
                <div className="mt-5 space-y-4">
                  <h4 className="font-black text-[10px] text-stone-400 uppercase tracking-widest">Select Payment Method</h4>
                  
                  {/* Grid selector buttons */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "QRIS", label: "📱 QRIS", color: "border-orange-500 text-orange-400 bg-orange-500/5" },
                      { id: "Cash", label: "💵 Cash", color: "border-emerald-500 text-emerald-400 bg-emerald-500/5" },
                      { id: "Debit", label: "💳 Debit/Card", color: "border-purple-500 text-purple-400 bg-purple-500/5" }
                    ].map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setPaymentMethod(p.id as any);
                          setCashAmountPaid("");
                        }}
                        className={`py-3 rounded-none border text-[10px] font-bold uppercase tracking-wider transition-all text-center flex flex-col items-center justify-center gap-1 ${
                          paymentMethod === p.id 
                            ? `${p.color} border-2 shadow-inner scale-95`
                            : "border-stone-800 text-stone-400 bg-stone-950 hover:bg-stone-800"
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>

                  {/* Cash Change Calculator Form */}
                  {paymentMethod === "Cash" && (
                    <div className="p-3 bg-stone-950 rounded-none border border-stone-800 text-xs">
                      <label className="block text-[10px] font-bold text-stone-500 mb-1.5 uppercase font-mono">Amount Paid Cash (Rp)</label>
                      <input 
                        type="number"
                        placeholder="e.g. 100000"
                        value={cashAmountPaid}
                        onChange={(e) => setCashAmountPaid(e.target.value)}
                        className="w-full bg-stone-900 border border-stone-800 rounded-none p-2.5 text-white focus:outline-none focus:border-orange-600 text-center font-bold font-mono text-sm"
                      />
                      {cashAmountPaid && (
                        <div className="mt-3 flex justify-between items-center text-xs border-t border-dashed border-stone-800 pt-2 font-mono">
                          <span className="text-stone-400">CHANGE RETURN:</span>
                          <span className="font-black text-emerald-400 text-sm">Rp {getChange().toLocaleString("id-ID")}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    onClick={handleProcessPayment}
                    disabled={isProcessingPayment}
                    className="w-full py-4 bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs uppercase tracking-wider rounded-none shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4 shrink-0" />
                    <span>{isProcessingPayment ? "Settling Invoice..." : "Approve Payment & Close order"}</span>
                  </button>
                </div>
              ) : (
                /* Invoice Printout Simulated Receipt Drawer */
                <div className="mt-5 p-4 bg-white text-stone-950 rounded-none border-2 border-stone-900 font-mono text-[10px] space-y-2 relative shadow-md">
                  <div className="text-center pb-2 border-b border-dashed border-stone-400">
                    <p className="font-extrabold text-xs uppercase tracking-wider">RAVON TM - {selectedOrder.branch_name.toUpperCase()}</p>
                    <p className="text-[9px]">SURABAYA, EAST JAVA</p>
                  </div>
                  <div className="space-y-0.5 text-left text-[9px]">
                    <p>INVOICE : #{selectedOrder.id}</p>
                    <p>TABLE   : TABLE {selectedOrder.table_number}</p>
                    <p>CASHIER : {user.username.toUpperCase()}</p>
                    <p>DATE    : {new Date(selectedOrder.created_at.endsWith('Z') ? selectedOrder.created_at : selectedOrder.created_at + 'Z').toLocaleDateString()}</p>
                  </div>
                  <div className="border-t border-dashed border-stone-400 py-1 space-y-1">
                    {selectedOrder.items.map((it, i) => (
                      <div key={i} className="flex justify-between">
                        <span>{it.quantity}x {it.menu_item?.name.substring(0, 18)}</span>
                        <span>{(it.menu_item?.price * it.quantity).toLocaleString("id-ID")}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-dashed border-stone-400 pt-1 space-y-0.5">
                    <div className="flex justify-between font-bold">
                      <span>TAX INCL. ({Math.round(selectedOrder.tax_amount / (selectedOrder.total_amount - selectedOrder.tax_amount) * 100)}%)</span>
                      <span>{selectedOrder.tax_amount.toLocaleString("id-ID")}</span>
                    </div>
                    <div className="flex justify-between font-black text-[11px]">
                      <span>TOTAL PAID ({selectedOrder.payment_method})</span>
                      <span>Rp {selectedOrder.total_amount.toLocaleString("id-ID")}</span>
                    </div>
                  </div>
                  <div className="text-center pt-2 border-t border-dashed border-stone-400">
                    <p className="font-bold">SUWUN! MATUR NUWUN</p>
                    <p className="text-[9px]">Thank you for dining with us!</p>
                  </div>
                </div>
              )}
            </div>

            <div className="text-center text-[10px] text-stone-500 mt-4 font-mono uppercase tracking-wider">
              Select other active orders to checkout.
            </div>
          </div>
        ) : (
          <div className="text-center py-20 text-stone-500 h-full flex flex-col items-center justify-center">
            <ShoppingCart className="w-12 h-12 text-stone-700 mb-3" />
            <p className="text-sm font-bold uppercase tracking-wider">No Ticket Selected</p>
            <p className="text-xs mt-2 max-w-xs leading-normal">Select any active order from the left to view detailed bills, process cash/QRIS checkout, and print paper receipts.</p>
          </div>
        )}
      </div>
    </div>
  );
}
