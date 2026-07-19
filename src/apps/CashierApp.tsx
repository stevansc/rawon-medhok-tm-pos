import React, { useState, useEffect, useRef } from "react";
import { Order } from "../types";
import { ApiService } from "../services/api";
import { formatTimeGMT7 } from "../utils/time";
import { useAuth } from "../hooks/useAuth";
import LoginScreen from "../components/LoginScreen";
import { Modal } from "../components/Modal";
import {
  Banknote, Receipt, LogOut, Search, MapPin,
  RefreshCw, ShoppingCart, Check, Printer
} from "lucide-react";
import { printReceipt, printKitchenTicket, connectPrinter, isPrinterConnected, ReceiptData } from "../services/printer";

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

  const [autoPoll, setAutoPoll] = useState(true);
  
  const [autoPrintEnabled, setAutoPrintEnabledState] = useState(false);
  const autoPrintEnabledRef = useRef(false);

  const setAutoPrintEnabled = (val: boolean) => {
    setAutoPrintEnabledState(val);
    autoPrintEnabledRef.current = val;
  };
  
  const seenOrderIds = useRef<Set<number>>(new Set());

  // Fetch cashier orders
  const fetchOrders = async () => {
    if (!auth.user) return;
    try {
      setIsLoadingOrders(true);
      setOrdersError(null);
      const activeBranch = auth.user.role === 'admin' ? currentBranch : auth.user.branch_name;
      const result = await ApiService.getOrders(activeBranch);

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
      setOrdersError(err.message || "Gagal memuat pesanan.");
    } finally {
      setIsLoadingOrders(false);
    }
  };

  useEffect(() => {
    if (!auth.user) return;
    fetchOrders();

    let pollInterval: NodeJS.Timeout;
    if (autoPoll) {
      pollInterval = setInterval(() => {
        fetchOrders();
      }, 8000);
    }

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [auth.user, autoPoll]);

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
        alert("Jumlah diskon tidak valid.");
        return;
      }
      if (!discountReason.trim()) {
        alert("Silakan berikan alasan untuk diskon/penghapusan.");
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
        alert("Jumlah pembayaran tunai tidak cukup.");
        return;
      }
    }

    try {
      setIsProcessingPayment(true);
      const updated = await ApiService.updateOrderStatus(selectedOrder.id, "completed", paymentMethod, finalDiscountAmount, finalDiscountReason);
      setOrders(prev => prev.map(o => o.id === selectedOrder.id ? updated : o));
      setSelectedOrder(updated);
      setPrintedReceiptOrder(updated);
      
      // Auto-print receipt if enabled
      if (autoPrintEnabled && isPrinterConnected()) {
        handleBluetoothPrint(updated);
      }
      
      fetchOrders();
    } catch (err: any) {
      alert(`Pembayaran gagal: ${err.message}`);
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

  const handleConnectPrinter = async () => {
    try {
      await connectPrinter();
      setAutoPrintEnabled(true);
      alert("Printer terhubung! Cetak otomatis sekarang aktif untuk pesanan baru yang masuk.");
    } catch (err: any) {
      alert(`Gagal menghubungkan printer: ${err.message}`);
      setAutoPrintEnabled(false);
    }
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
      alert("Struk berhasil dicetak!");
    } catch (err: any) {
      alert(`Gagal mencetak: ${err.message}`);
    }
  };

  if (!auth.isAuthenticated) {
    return (
      <LoginScreen
        title="Mesin Kasir"
        subtitle="Checkout Point of Sale Rawon TM"
        icon={<Banknote className="w-10 h-10 text-white" />}
        buttonText="Buka Laci Kasir"
        loadingText="Membuka akses..."
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
                <span>Meja Kasir Depan</span>
                <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded-none font-bold uppercase tracking-wider">Shift Aktif</span>
              </h1>
              <p className="text-[10px] text-stone-400 font-mono flex items-center gap-1.5 mt-0.5 uppercase">
                <MapPin className="w-3.5 h-3.5 text-orange-500" />
                <span>Cabang {auth.user!.role === 'admin' ? currentBranch : auth.user!.branch_name}   Kasir: {auth.user!.username}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleConnectPrinter}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-none text-xs font-bold uppercase tracking-wider transition-all border border-stone-700 ${autoPrintEnabled ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-stone-800 text-stone-300 hover:bg-stone-700"}`}
              title="Hubungkan Printer Otomatis"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{autoPrintEnabled ? "Printer Otomatis AKTIF" : "Hubungkan Printer"}</span>
            </button>
            <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-stone-300 uppercase tracking-wider hover:text-white transition-colors">
              <input type="checkbox" checked={autoPoll} onChange={(e) => setAutoPoll(e.target.checked)} className="w-3.5 h-3.5 accent-orange-600 cursor-pointer" />
              <span className="hidden sm:inline">Segarkan Otomatis</span>
            </label>
            <button
              onClick={fetchOrders}
              disabled={isLoadingOrders}
              className="p-2 bg-stone-800 hover:bg-stone-700 text-orange-500 transition-colors border border-stone-700"
              title="Segarkan Antrean"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingOrders ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={auth.handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-none text-xs font-bold uppercase tracking-wider transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Akhiri Shift</span>
            </button>
          </div>
        </header>

        {/* Toolbar */}
        <div className="bg-stone-100 p-4 border-b border-stone-200 flex flex-col sm:flex-row gap-3 items-center justify-between shrink-0">
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Cari meja, ID atau nama..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-stone-300 pl-9 pr-3 py-2 rounded-none text-xs text-stone-900 focus:outline-none focus:border-orange-600 font-mono"
            />
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
          </div>

          <div className="flex gap-1.5 w-full sm:w-auto overflow-x-auto">
            {[
              { id: "all_active", label: "⏳ Belum Dibayar" },
              { id: "on_table", label: "🍽️ Disajikan / Makan di Tempat" },
              { id: "completed", label: "✅ Dibayar / Selesai" }
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
              <p className="font-bold text-sm uppercase">Tidak ada tiket yang cocok dengan filter</p>
              <p className="text-xs mt-1 font-mono">Pilih filter lain atau segarkan buku besar.</p>
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
                      {order.order_type === "dine-in" ? (
                        <span className="font-black text-stone-900 text-md uppercase">Meja {order.table_number}</span>
                      ) : (
                        <span className="font-black text-stone-900 text-md uppercase">{order.order_type === "takeaway" ? "Bawa Pulang" : order.order_type}</span>
                      )}
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
                      {order.status === "on_table" ? "Disajikan" : order.status}
                    </span>
                  </div>

                  <div className="mt-4 pt-3 border-t border-dashed border-stone-200 flex justify-between items-center">
                    <span className="text-[9px] text-stone-400 font-mono">#{order.daily_order_number || order.id} • {order.items.length} ITM</span>
                    <span className="font-bold text-xs text-orange-600 font-mono">Rp {Number(order.total_amount).toLocaleString("id-ID")}</span>
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
                <p className="text-[9px] text-stone-400 font-mono mt-0.5 uppercase tracking-widest">Cabang {selectedOrder.branch_name}</p>
              </div>

              {/* Order Metadata */}
              <div className="py-4 space-y-1 text-xs border-b border-stone-800 font-mono text-[11px]">
                <div className="flex justify-between text-stone-400"><span>ID INVOICE:</span><span className="font-bold text-white">#{selectedOrder.daily_order_number || selectedOrder.id}</span></div>
                <div className="flex justify-between text-stone-400"><span>NO MEJA:</span><span className="font-bold text-white uppercase">Meja {selectedOrder.table_number}</span></div>
                <div className="flex justify-between text-stone-400"><span>PELANGGAN:</span><span className="font-bold text-white uppercase">{selectedOrder.customer_name}</span></div>
                <div className="flex justify-between text-stone-400"><span>DIBUAT:</span><span className="text-white">{formatTimeGMT7(selectedOrder.created_at)}</span></div>
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
                <div className="flex justify-between text-stone-400"><span>SUBTOTAL:</span><span>Rp {Number((selectedOrder.total_amount - selectedOrder.tax_amount)).toLocaleString("id-ID")}</span></div>
                <div className="flex justify-between text-stone-400"><span>PAJAK:</span><span>Rp {Number(selectedOrder.tax_amount).toLocaleString("id-ID")}</span></div>
                <div className="flex justify-between font-black text-sm text-orange-500 pt-2 border-t border-dashed border-stone-800"><span>TOTAL AKHIR</span><span>Rp {Number(selectedOrder.total_amount).toLocaleString("id-ID")}</span></div>
              </div>

              {/* PAYMENT PROCESSOR */}
              {!["completed", "discounted"].includes(selectedOrder.status) ? (
                <div className="mt-5 space-y-4">
                  <h4 className="font-black text-[10px] text-stone-400 uppercase tracking-widest">Pilih Metode Pembayaran</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "QRIS", label: "📱 QRIS", color: "border-orange-500 text-orange-400 bg-orange-500/5" },
                      { id: "Cash", label: "💵 Tunai", color: "border-emerald-500 text-emerald-400 bg-emerald-500/5" },
                      { id: "Debit", label: "💳 Debit/Kartu", color: "border-purple-500 text-purple-400 bg-purple-500/5" }
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
                      <label className="block text-[10px] font-bold text-stone-500 mb-1.5 uppercase font-mono">Jumlah Bayar Tunai (Rp)</label>
                      <input
                        type="number"
                        placeholder="mis. 100000"
                        value={cashAmountPaid}
                        onChange={(e) => setCashAmountPaid(e.target.value)}
                        className="w-full bg-stone-900 border border-stone-800 rounded-none p-2.5 text-white focus:outline-none focus:border-orange-600 text-center font-bold font-mono text-sm"
                      />
                      {cashAmountPaid && (
                        <div className="mt-3 flex justify-between items-center text-xs border-t border-dashed border-stone-800 pt-2 font-mono">
                          <span className="text-stone-400">KEMBALIAN:</span>
                          <span className="font-black text-emerald-400 text-sm">Rp {Number(getChange()).toLocaleString("id-ID")}</span>
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
                      <span>{isDiscountMode ? "Batalkan Diskon" : "Terapkan Diskon / Penghapusan"}</span>
                    </button>
                    
                    {isDiscountMode && (
                      <div className="mt-3 space-y-3 p-3 bg-red-500/5 border border-red-500/20 rounded-none">
                        <div>
                          <label className="block text-[10px] font-bold text-red-400 mb-1.5 uppercase font-mono">Jumlah Diskon (Rp)</label>
                          <input
                            type="number"
                            placeholder="mis. 50000 atau jumlah penuh"
                            value={discountAmount}
                            onChange={(e) => setDiscountAmount(e.target.value)}
                            className="w-full bg-stone-900 border border-red-900/50 rounded-none p-2.5 text-red-200 focus:outline-none focus:border-red-500 text-center font-bold font-mono text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-red-400 mb-1.5 uppercase font-mono">Alasan</label>
                          <input
                            type="text"
                            placeholder="mis. Kas kurang, Bahan basi"
                            value={discountReason}
                            onChange={(e) => setDiscountReason(e.target.value)}
                            className="w-full bg-stone-900 border border-red-900/50 rounded-none p-2.5 text-red-200 focus:outline-none focus:border-red-500 font-mono text-xs"
                          />
                        </div>
                        {parseFloat(discountAmount) > 0 && (
                          <div className="flex justify-between items-center text-xs font-mono font-bold text-red-400 pt-2 border-t border-red-900/50">
                            <span>TOTAL AKHIR BARU:</span>
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
                    <span>{isProcessingPayment ? "Menyelesaikan Invoice..." : "Setujui Pembayaran & Tutup Pesanan"}</span>
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
                      <p>MEJA    : MEJA {selectedOrder.table_number}</p>
                      <p>KASIR   : {auth.user!.username.toUpperCase()}</p>
                      <p>TANGGAL : {new Date(selectedOrder.created_at.endsWith('Z') ? selectedOrder.created_at : selectedOrder.created_at + 'Z').toLocaleDateString()}</p>
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
                        <span>TERMASUK PAJAK ({Math.round(selectedOrder.tax_amount / (selectedOrder.total_amount - selectedOrder.tax_amount) * 100)}%)</span>
                        <span>{Number(selectedOrder.tax_amount).toLocaleString("id-ID")}</span>
                      </div>
                      {(selectedOrder.discount_amount && selectedOrder.discount_amount > 0) ? (
                        <>
                          <div className="flex justify-between font-bold text-red-600">
                            <span>DISKON:</span>
                            <span>- Rp {Number(selectedOrder.discount_amount).toLocaleString("id-ID")}</span>
                          </div>
                          <div className="flex justify-between font-black text-[11px] pt-1">
                            <span>TOTAL DIBAYAR ({selectedOrder.payment_method})</span>
                            <span>Rp {Math.max(0, selectedOrder.total_amount - selectedOrder.discount_amount).toLocaleString("id-ID")}</span>
                          </div>
                        </>
                      ) : (
                        <div className="flex justify-between font-black text-[11px]">
                          <span>TOTAL DIBAYAR ({selectedOrder.payment_method})</span>
                          <span>Rp {Number(selectedOrder.total_amount).toLocaleString("id-ID")}</span>
                        </div>
                      )}
                    </div>
                    <div className="text-center pt-2 border-t border-dashed border-stone-400">
                      <p className="font-bold">SUWUN! MATUR NUWUN</p>
                      <p className="text-[9px]">Terima kasih telah bersantap bersama kami!</p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleBluetoothPrint(selectedOrder)}
                    className="w-full py-3.5 mt-4 bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-xs uppercase tracking-wider rounded-none shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Cetak Ulang Struk via Bluetooth</span>
                  </button>
                </>
              )}
            </div>

            <div className="text-center text-[10px] text-stone-500 mt-4 font-mono uppercase tracking-wider">
              Pilih pesanan aktif lain untuk checkout.
            </div>
          </div>
        ) : (
          <div className="text-center py-20 text-stone-500 h-full flex flex-col items-center justify-center">
            <ShoppingCart className="w-12 h-12 text-stone-700 mb-3" />
            <p className="text-sm font-bold uppercase tracking-wider">Tidak Ada Tiket Dipilih</p>
            <p className="text-xs mt-2 max-w-xs leading-normal">Pilih pesanan aktif dari kiri untuk melihat tagihan dan proses checkout.</p>
          </div>
        )}
      </div>

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
              <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-[10px] font-bold uppercase tracking-wider mb-2 font-sans rounded-full">📶 Bluetooth Terhubung</span>
              <h3 className="font-extrabold text-sm uppercase tracking-widest text-stone-800 animate-pulse">*** STRUK KASIR ***</h3>
            </div>
            <div className="py-4 space-y-3 text-xs leading-relaxed">
              <div className="flex justify-between font-bold">
                <span>INVOICE: #{printedReceiptOrder.daily_order_number || printedReceiptOrder.id}</span>
                <span>MEJA: {printedReceiptOrder.table_number}</span>
              </div>
              <div className="border-b border-dashed border-stone-200 pb-2">
                <p><span className="font-bold">PELANGGAN:</span> {printedReceiptOrder.customer_name ? printedReceiptOrder.customer_name.toUpperCase() : "TAMU"}</p>
                <p><span className="font-bold">KASIR:</span> {auth.user?.username.toUpperCase()}</p>
                <p><span className="font-bold">PEMBAYARAN:</span> {printedReceiptOrder.payment_method?.toUpperCase() || "N/A"}</p>
              </div>
              <div className="space-y-1.5 py-1 border-b border-dashed border-stone-200">
                {printedReceiptOrder.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span>{it.quantity}x {it.menu_item?.name.toUpperCase() || "ITEM TIDAK DIKENAL"}</span>
                    <span>{(it.menu_item?.price_normal * it.quantity).toLocaleString("id-ID")}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span>PAJAK</span>
                  <span>{Number(printedReceiptOrder.tax_amount).toLocaleString("id-ID")}</span>
                </div>
                <div className="flex justify-between font-black">
                  <span>TOTAL</span>
                  <span>Rp {Number(printedReceiptOrder.total_amount).toLocaleString("id-ID")}</span>
                </div>
              </div>
            </div>
            <div className="text-center pt-4 border-t border-dashed border-stone-300 flex flex-col gap-3">
              <button onClick={() => handleBluetoothPrint(printedReceiptOrder)} className="w-full py-2 bg-orange-600 text-white font-bold text-xs uppercase hover:bg-orange-500 rounded-none flex items-center justify-center gap-2">
                <Printer className="w-4 h-4" /> Cetak Struk
              </button>
              <p className="text-[10px] text-stone-500 uppercase tracking-wider font-bold">MATUR NUWUN!</p>
              <p className="text-[9px] text-stone-400">Menutup secara otomatis...</p>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
