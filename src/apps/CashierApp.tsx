import React, { useState, useEffect } from "react";
import { Order } from "../types";
import { ApiService } from "../services/api";
import { useAuth } from "../hooks/useAuth";
import LoginScreen from "../components/LoginScreen";
import {
  Banknote, Receipt, LogOut, Search, MapPin,
  RefreshCw, ShoppingCart, Check, Printer
} from "lucide-react";
import { printReceipt, ReceiptData } from "../services/printer";

interface CashierAppProps {
  currentBranch: string;
}

export default function CashierApp({ currentBranch }: CashierAppProps) {
  const auth = useAuth({ allowedRoles: ["cashier", "admin"] });

  // Orders state
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all_active");

  // Selected order for checkout detail
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"Cash" | "QRIS" | "Debit">("Cash");
  const [cashAmountPaid, setCashAmountPaid] = useState<string>("");
  const [printedReceiptOrder, setPrintedReceiptOrder] = useState<Order | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  
  // Discount state
  const [isDiscountMode, setIsDiscountMode] = useState(false);
  const [discountAmount, setDiscountAmount] = useState<string>("");
  const [discountReason, setDiscountReason] = useState<string>("");

  // Fetch cashier orders
  const fetchOrders = async () => {
    if (!auth.user) return;
    try {
      setIsLoadingOrders(true);
      setOrdersError(null);
      const result = await ApiService.getOrders(auth.user.branch_name || currentBranch);
      setOrders(result);
    } catch (err: any) {
      setOrdersError(err.message || "Failed to load orders.");
    } finally {
      setIsLoadingOrders(false);
    }
  };

  useEffect(() => {
    if (!auth.user) return;
    fetchOrders();
  }, [auth.user]);

  // Printer modal timeout
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    if (printedReceiptOrder) {
      timeout = setTimeout(() => {
        setPrintedReceiptOrder(null);
      }, 3000);
    }
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [printedReceiptOrder]);

  // Complete checkout & process payment
  const handleProcessPayment = async () => {
    if (!selectedOrder) return;

    let finalDiscountAmount: number | undefined = undefined;
    let finalDiscountReason: string | undefined = undefined;
    
    if (isDiscountMode) {
      const parsedDiscount = parseFloat(discountAmount);
      if (isNaN(parsedDiscount) || parsedDiscount < 0) {
        alert("Invalid discount amount.");
        return;
      }
      if (!discountReason.trim()) {
        alert("Please provide a reason for the discount/write-off.");
        return;
      }
      finalDiscountAmount = parsedDiscount;
      finalDiscountReason = discountReason.trim();
    }

    let finalTotal = selectedOrder.total_amount;
    if (finalDiscountAmount) {
      finalTotal = Math.max(0, finalTotal - finalDiscountAmount);
    }

    if (paymentMethod === "Cash") {
      const parsedCash = parseFloat(cashAmountPaid);
      if (isNaN(parsedCash) || parsedCash < finalTotal) {
        alert("Insufficient cash payment amount.");
        return;
      }
    }

    try {
      setIsProcessingPayment(true);
      const updated = await ApiService.updateOrderStatus(selectedOrder.id, "completed", paymentMethod, finalDiscountAmount, finalDiscountReason);
      setOrders(prev => prev.map(o => o.id === selectedOrder.id ? updated : o));
      setSelectedOrder(updated);
      setPrintedReceiptOrder(updated);
      fetchOrders();
    } catch (err: any) {
      alert(`Payment failed: ${err.message}`);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Filter orders
  const filteredOrders = orders.filter(o => {
    const matchesSearch =
      o.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.table_number.toString() === searchQuery ||
      o.id.toString().includes(searchQuery);
    if (!matchesSearch) return false;

    if (statusFilter === "all_active") return !["completed", "discounted"].includes(o.status);
    if (statusFilter === "completed") return ["completed", "discounted"].includes(o.status);
    if (statusFilter === "on_table") return o.status === "on_table";
    return true;
  });

  const getChange = () => {
    if (!selectedOrder || paymentMethod !== "Cash") return 0;
    const paid = parseFloat(cashAmountPaid);
    if (isNaN(paid)) return 0;
    
    let finalTotal = selectedOrder.total_amount;
    if (isDiscountMode) {
      const discount = parseFloat(discountAmount) || 0;
      finalTotal = Math.max(0, finalTotal - discount);
    }
    
    return Math.max(0, paid - finalTotal);
  };

  const handleBluetoothPrint = async (order: Order) => {
    try {
      const receiptData: ReceiptData = {
        branchName: order.branch_name,
        invoiceNumber: order.daily_order_number || order.id,
        tableNumber: order.table_number,
        customerName: order.customer_name || "Guest",
        cashierName: auth.user?.username || "CASHIER",
        paymentMethod: order.payment_method || "N/A",
        createdAt: order.created_at,
        items: order.items.map(item => ({
          name: item.menu_item?.name || "Unknown",
          quantity: item.quantity,
          price: (item.menu_item?.price_normal || 0) * item.quantity,
        })),
        subtotal: order.total_amount - order.tax_amount,
        taxAmount: order.tax_amount,
        discountAmount: order.discount_amount,
        discountReason: order.discount_reason || undefined,
        totalAmount: order.total_amount,
      };
      await printReceipt(receiptData);
      alert("Receipt printed successfully!");
    } catch (err: any) {
      alert(`Print failed: ${err.message}`);
    }
  };

  if (!auth.isAuthenticated) {
    return (
      <LoginScreen
        title="Cashier Register"
        subtitle="Rawon TM Point of Sale Checkout"
        icon={<Banknote className="w-10 h-10 text-white" />}
        buttonText="Open Cash Drawer"
        loadingText="Authenticating..."
        credentialHint={{ username: "cashier", password: "cashier123" }}
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
                <span>{auth.user!.branch_name || currentBranch} Branch • Cashier: {auth.user!.username}</span>
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
              onClick={auth.handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-none text-xs font-bold uppercase tracking-wider transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Shift End</span>
            </button>
          </div>
        </header>

        {/* Toolbar */}
        <div className="bg-stone-100 p-4 border-b border-stone-200 flex flex-col sm:flex-row gap-3 items-center justify-between shrink-0">
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

        {/* Orders Grid */}
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
                        : order.status === "discounted"
                        ? "bg-red-200 text-red-900 border border-red-300 shadow-sm"
                        : order.status === "on_table"
                        ? "bg-orange-100 text-orange-950 border border-orange-200"
                        : "bg-stone-100 text-stone-800 border border-stone-200"
                    }`}>
                      {order.status === "on_table" ? "Served" : order.status}
                    </span>
                  </div>

                  <div className="mt-4 pt-3 border-t border-dashed border-stone-200 flex justify-between items-center">
                    <span className="text-[9px] text-stone-400 font-mono">#{order.daily_order_number || order.id} • {order.items.length} ITM</span>
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
                <div className="flex justify-between text-stone-400"><span>INVOICE ID:</span><span className="font-bold text-white">#{selectedOrder.daily_order_number || selectedOrder.id}</span></div>
                <div className="flex justify-between text-stone-400"><span>TABLE NO:</span><span className="font-bold text-white uppercase">Table {selectedOrder.table_number}</span></div>
                <div className="flex justify-between text-stone-400"><span>CUSTOMER:</span><span className="font-bold text-white uppercase">{selectedOrder.customer_name}</span></div>
                <div className="flex justify-between text-stone-400"><span>CREATED:</span><span className="text-white">{new Date(selectedOrder.created_at.endsWith('Z') ? selectedOrder.created_at : selectedOrder.created_at + 'Z').toLocaleTimeString()}</span></div>
              </div>

              {/* Item details */}
              <div className="py-4 space-y-2.5 max-h-[160px] overflow-y-auto border-b border-stone-800">
                {selectedOrder.items.map((item, i) => (
                  <div key={i} className="text-xs">
                    <div className="flex justify-between text-white font-medium">
                      <span>{item.quantity}x {item.menu_item?.name}</span>
                      <span className="font-mono">Rp {(item.menu_item?.price_normal * item.quantity).toLocaleString("id-ID")}</span>
                    </div>
                    {item.special_notes && (
                      <p className="text-[10px] text-orange-400 bg-stone-950 px-1.5 py-0.5 rounded-none mt-0.5 font-mono">* {item.special_notes}</p>
                    )}
                  </div>
                ))}
              </div>

              {/* Billing totals */}
              <div className="py-4 space-y-2 text-xs border-b border-stone-800 font-mono text-[11px]">
                <div className="flex justify-between text-stone-400"><span>SUBTOTAL:</span><span>Rp {(selectedOrder.total_amount - selectedOrder.tax_amount).toLocaleString("id-ID")}</span></div>
                <div className="flex justify-between text-stone-400"><span>GOVT TAX:</span><span>Rp {selectedOrder.tax_amount.toLocaleString("id-ID")}</span></div>
                <div className="flex justify-between font-black text-sm text-orange-500 pt-2 border-t border-dashed border-stone-800"><span>GRAND TOTAL</span><span>Rp {selectedOrder.total_amount.toLocaleString("id-ID")}</span></div>
              </div>

              {/* PAYMENT PROCESSOR */}
              {!["completed", "discounted"].includes(selectedOrder.status) ? (
                <div className="mt-5 space-y-4">
                  <h4 className="font-black text-[10px] text-stone-400 uppercase tracking-widest">Select Payment Method</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "QRIS", label: "📱 QRIS", color: "border-orange-500 text-orange-400 bg-orange-500/5" },
                      { id: "Cash", label: "💵 Cash", color: "border-emerald-500 text-emerald-400 bg-emerald-500/5" },
                      { id: "Debit", label: "💳 Debit/Card", color: "border-purple-500 text-purple-400 bg-purple-500/5" }
                    ].map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => { setPaymentMethod(p.id as any); setCashAmountPaid(""); }}
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

                  {/* Discount / Write-Off Section */}
                  <div className="border-t border-stone-800 pt-4 mt-2">
                    <button
                      onClick={() => setIsDiscountMode(!isDiscountMode)}
                      className={`w-full py-2.5 rounded-none border text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                        isDiscountMode 
                          ? "bg-red-500/10 border-red-500 text-red-400" 
                          : "bg-stone-950 border-stone-800 text-stone-500 hover:text-stone-300"
                      }`}
                    >
                      <span>{isDiscountMode ? "Cancel Discount" : "Apply Discount / Write-Off"}</span>
                    </button>
                    
                    {isDiscountMode && (
                      <div className="mt-3 space-y-3 p-3 bg-red-500/5 border border-red-500/20 rounded-none">
                        <div>
                          <label className="block text-[10px] font-bold text-red-400 mb-1.5 uppercase font-mono">Discount Amount (Rp)</label>
                          <input
                            type="number"
                            placeholder="e.g. 50000 or full amount"
                            value={discountAmount}
                            onChange={(e) => setDiscountAmount(e.target.value)}
                            className="w-full bg-stone-900 border border-red-900/50 rounded-none p-2.5 text-red-200 focus:outline-none focus:border-red-500 text-center font-bold font-mono text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-red-400 mb-1.5 uppercase font-mono">Reason</label>
                          <input
                            type="text"
                            placeholder="e.g. Short cash, Spoiled ingredient"
                            value={discountReason}
                            onChange={(e) => setDiscountReason(e.target.value)}
                            className="w-full bg-stone-900 border border-red-900/50 rounded-none p-2.5 text-red-200 focus:outline-none focus:border-red-500 font-mono text-xs"
                          />
                        </div>
                        {parseFloat(discountAmount) > 0 && (
                          <div className="flex justify-between items-center text-xs font-mono font-bold text-red-400 pt-2 border-t border-red-900/50">
                            <span>NEW GRAND TOTAL:</span>
                            <span>Rp {Math.max(0, selectedOrder.total_amount - parseFloat(discountAmount)).toLocaleString("id-ID")}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleProcessPayment}
                    disabled={isProcessingPayment}
                    className="w-full py-4 bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs uppercase tracking-wider rounded-none shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 mt-4"
                  >
                    <Check className="w-4 h-4 shrink-0" />
                    <span>{isProcessingPayment ? "Settling Invoice..." : "Approve Payment & Close order"}</span>
                  </button>
                </div>
              ) : (
                <>
                  {/* Invoice Printout */}
                  <div className="mt-5 p-4 bg-white text-stone-950 rounded-none border-2 border-stone-900 font-mono text-[10px] space-y-2 relative shadow-md">
                    <div className="text-center pb-2 border-b border-dashed border-stone-400">
                      <p className="font-extrabold text-xs uppercase tracking-wider">RAWON TM - {selectedOrder.branch_name.toUpperCase()}</p>
                      <p className="text-[9px]">SURABAYA, EAST JAVA</p>
                    </div>
                    <div className="space-y-0.5 text-left text-[9px]">
                      <p>INVOICE : #{selectedOrder.id}</p>
                      <p>TABLE   : TABLE {selectedOrder.table_number}</p>
                      <p>CASHIER : {auth.user!.username.toUpperCase()}</p>
                      <p>DATE    : {new Date(selectedOrder.created_at.endsWith('Z') ? selectedOrder.created_at : selectedOrder.created_at + 'Z').toLocaleDateString()}</p>
                    </div>
                    <div className="border-t border-dashed border-stone-400 py-1 space-y-1">
                      {selectedOrder.items.map((it, i) => (
                        <div key={i} className="flex justify-between">
                          <span>{it.quantity}x {it.menu_item?.name.substring(0, 18)}</span>
                          <span>{(it.menu_item?.price_normal * it.quantity).toLocaleString("id-ID")}</span>
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-dashed border-stone-400 pt-1 space-y-0.5">
                      <div className="flex justify-between font-bold">
                        <span>TAX INCL. ({Math.round(selectedOrder.tax_amount / (selectedOrder.total_amount - selectedOrder.tax_amount) * 100)}%)</span>
                        <span>{selectedOrder.tax_amount.toLocaleString("id-ID")}</span>
                      </div>
                      {(selectedOrder.discount_amount && selectedOrder.discount_amount > 0) ? (
                        <>
                          <div className="flex justify-between font-bold text-red-600">
                            <span>DISCOUNT:</span>
                            <span>- Rp {selectedOrder.discount_amount.toLocaleString("id-ID")}</span>
                          </div>
                          <div className="flex justify-between font-black text-[11px] pt-1">
                            <span>TOTAL PAID ({selectedOrder.payment_method})</span>
                            <span>Rp {Math.max(0, selectedOrder.total_amount - selectedOrder.discount_amount).toLocaleString("id-ID")}</span>
                          </div>
                        </>
                      ) : (
                        <div className="flex justify-between font-black text-[11px]">
                          <span>TOTAL PAID ({selectedOrder.payment_method})</span>
                          <span>Rp {selectedOrder.total_amount.toLocaleString("id-ID")}</span>
                        </div>
                      )}
                    </div>
                    <div className="text-center pt-2 border-t border-dashed border-stone-400">
                      <p className="font-bold">SUWUN! MATUR NUWUN</p>
                      <p className="text-[9px]">Thank you for dining with us!</p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleBluetoothPrint(selectedOrder)}
                    className="w-full py-3.5 mt-4 bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-xs uppercase tracking-wider rounded-none shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Reprint Receipt via Bluetooth</span>
                  </button>
                </>
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
            <p className="text-xs mt-2 max-w-xs leading-normal">Select any active order from the left to view bills and process checkout.</p>
          </div>
        )}
      </div>

      {/* Bluetooth Printer Receipt Modal */}
      {printedReceiptOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/80 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white text-stone-900 w-full max-w-sm border-4 border-double border-stone-900 p-6 shadow-2xl relative flex flex-col font-mono animate-scale-in">
            <div className="text-center pb-4 border-b border-dashed border-stone-300">
              <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-[10px] font-bold uppercase tracking-wider mb-2 font-sans rounded-full">📶 Bluetooth Connected</span>
              <h3 className="font-extrabold text-sm uppercase tracking-widest text-stone-800 animate-pulse">*** CASHIER RECEIPT ***</h3>
            </div>
            <div className="py-4 space-y-3 text-xs leading-relaxed">
              <div className="flex justify-between font-bold">
                <span>INVOICE: #{printedReceiptOrder.daily_order_number || printedReceiptOrder.id}</span>
                <span>TABLE: {printedReceiptOrder.table_number}</span>
              </div>
              <div className="border-b border-dashed border-stone-200 pb-2">
                <p><span className="font-bold">CUST:</span> {printedReceiptOrder.customer_name ? printedReceiptOrder.customer_name.toUpperCase() : "GUEST"}</p>
                <p><span className="font-bold">CASHIER:</span> {auth.user?.username.toUpperCase()}</p>
                <p><span className="font-bold">PAYMENT:</span> {printedReceiptOrder.payment_method?.toUpperCase() || "N/A"}</p>
              </div>
              <div className="space-y-1.5 py-1 border-b border-dashed border-stone-200">
                {printedReceiptOrder.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span>{it.quantity}x {it.menu_item?.name.toUpperCase() || "UNKNOWN ITEM"}</span>
                    <span>{(it.menu_item?.price_normal * it.quantity).toLocaleString("id-ID")}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span>TAX</span>
                  <span>{printedReceiptOrder.tax_amount.toLocaleString("id-ID")}</span>
                </div>
                <div className="flex justify-between font-black">
                  <span>TOTAL</span>
                  <span>Rp {printedReceiptOrder.total_amount.toLocaleString("id-ID")}</span>
                </div>
              </div>
            </div>
            <div className="text-center pt-4 border-t border-dashed border-stone-300">
              <p className="text-[10px] text-stone-500 uppercase tracking-wider font-bold">MATUR NUWUN!</p>
              <p className="text-[9px] text-stone-400 mt-2">Closing automatically...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
