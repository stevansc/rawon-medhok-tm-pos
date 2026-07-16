import React, { useState, useEffect } from "react";
import { MenuItem, OrderInput, Order, Branch, Promotion } from "../types";
import { ApiService } from "../services/api";
import { 
  ShoppingBag, Search, Plus, Minus, FileText, 
  CheckCircle, MapPin, ClipboardList, Info, Sparkles,
  Check, X, Share2
} from "lucide-react";

interface CustomerAppProps {
  branchNameQuery?: string;
  tableNumberQuery?: string;
}

export default function CustomerApp({ branchNameQuery, tableNumberQuery }: CustomerAppProps) {
  const [selectedBranch, setSelectedBranch] = useState<string>(branchNameQuery || "");
  const [tableNumber, setTableNumber] = useState<string>(tableNumberQuery || "5");
  const [customerName, setCustomerName] = useState<string>("");
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [orderType, setOrderType] = useState<"dine-in" | "take-away">("dine-in");
  
  const [branches, setBranches] = useState<Branch[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // Cart state with unique entry ID
  const [cart, setCart] = useState<{
    id: string;
    item: MenuItem;
    quantity: number;
    notes: string;
    selectedAddons?: string[];
    unavailablePref?: string;
  }[]>([]);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState<boolean>(false);
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Popup states for customizable menu item selection
  const [activePopupItem, setActivePopupItem] = useState<MenuItem | null>(null);
  const [popupNotes, setPopupNotes] = useState<string>("");
  const [popupQuantity, setPopupQuantity] = useState<number>(1);
  const [popupSelectedAddons, setPopupSelectedAddons] = useState<string[]>([]);

  // Fetch branches and menu
  useEffect(() => {
    async function loadInitialData() {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        const fetchedBranches = await ApiService.getBranches();
        setBranches(fetchedBranches);
        
        // If query is valid, use it; otherwise default to first branch
        const finalBranch = branchNameQuery || fetchedBranches[0]?.name || "";
        if (finalBranch) {
          setSelectedBranch(finalBranch);
        }
        
        const [menu, cats, promos] = await Promise.all([
          ApiService.getMenu(finalBranch),
          ApiService.getCategories(),
          ApiService.getPromotions(finalBranch)
        ]);
        setMenuItems(menu);
        setCategories(cats);
        setPromotions(promos);
      } catch (err: any) {
        setErrorMessage(err.message || "Failed to load initial data.");
      } finally {
        setIsLoading(false);
      }
    }
    loadInitialData();
  }, [branchNameQuery]);

  // Handle branch change
  const handleBranchChange = async (branchName: string) => {
    try {
      setIsLoading(true);
      setSelectedBranch(branchName);
      setCart([]); // Clear cart when changing branch to prevent menu mixups
      const [menu, promos] = await Promise.all([
        ApiService.getMenu(branchName, categoryFilter === "all" ? undefined : categoryFilter),
        ApiService.getPromotions(branchName)
      ]);
      setMenuItems(menu);
      setPromotions(promos);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to fetch branch menu");
    } finally {
      setIsLoading(false);
    }
  };

  // Filter and search menu trigger
  useEffect(() => {
    async function filterMenu() {
      if (!selectedBranch) return;
      try {
        setIsLoading(true);
        const menu = await ApiService.getMenu(
          selectedBranch, 
          categoryFilter === "all" ? undefined : categoryFilter,
          searchQuery || undefined
        );
        setMenuItems(menu);
      } catch (err: any) {
        setErrorMessage(err.message || "Failed to search/filter menu.");
      } finally {
        setIsLoading(false);
      }
    }
    
    const delayDebounce = setTimeout(() => {
      filterMenu();
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [categoryFilter, searchQuery, selectedBranch]);

  // Cart operations
  const addToCart = (item: MenuItem) => {
    setActivePopupItem(item);
    setPopupNotes("");
    setPopupQuantity(1);
    setPopupSelectedAddons([]);
  };

  const confirmAddToCart = () => {
    if (!activePopupItem) return;
    // Find if we already have the exact same item ID with the exact same options and notes
    const existingIndex = cart.findIndex(c => 
      c.item.id === activePopupItem.id && 
      JSON.stringify(c.selectedAddons || []) === JSON.stringify(popupSelectedAddons) &&
      c.notes.trim() === popupNotes.trim()
    );
    if (existingIndex > -1) {
      const updated = [...cart];
      updated[existingIndex].quantity += popupQuantity;
      setCart(updated);
    } else {
      setCart([...cart, { 
        id: Math.random().toString(36).substring(2, 11),
        item: activePopupItem, 
        quantity: popupQuantity, 
        notes: popupNotes.trim(),
        selectedAddons: popupSelectedAddons
      }]);
    }
    setActivePopupItem(null);
  };

  const updateCartQuantity = (cartEntryId: string, amount: number) => {
    const existingIndex = cart.findIndex(c => c.id === cartEntryId);
    if (existingIndex === -1) return;
    
    const updated = [...cart];
    updated[existingIndex].quantity += amount;
    if (updated[existingIndex].quantity <= 0) {
      updated.splice(existingIndex, 1);
    }
    setCart(updated);
  };

  const updateCartNotes = (cartEntryId: string, notes: string) => {
    const updated = cart.map(c => {
      if (c.id === cartEntryId) {
        return { ...c, notes };
      }
      return c;
    });
    setCart(updated);
  };

  // Subtotal and tax calculation
  const subtotal = cart.reduce((sum, c) => sum + c.item.price * c.quantity, 0);
  const activeBranch = branches.find(b => b.name === selectedBranch);
  const branchTaxRate = activeBranch?.tax_rate || 0.10;
  const theme = activeBranch?.color_theme === "indigo" ? "indigo" : "stone";
  const taxAmount = Math.round(subtotal * branchTaxRate);
  const totalAmount = subtotal + taxAmount;
  const totalCartCount = cart.reduce((sum, c) => sum + c.quantity, 0);

  // Submit Order to Backend API
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      alert("Please enter your name.");
      return;
    }
    if (!tableNumber) {
      alert("Please enter your table number.");
      return;
    }
    if (cart.length === 0) {
      alert("Your cart is empty!");
      return;
    }

    try {
      setIsSubmittingOrder(true);
      setErrorMessage(null);

      const orderPayload: OrderInput = {
        table_number: parseInt(tableNumber, 10),
        customer_name: customerName,
        phone_number: phoneNumber || "08123456789",
        order_type: orderType,
        branch_name: selectedBranch,
        items: cart.map(c => {
          const addonStr = c.selectedAddons && c.selectedAddons.length > 0 ? `Pelengkap: ${c.selectedAddons.join(", ")}` : "";
          const compiledNotes = [addonStr, c.notes].filter(Boolean).join(" | ");
          return {
            menu_item_id: c.item.id,
            quantity: c.quantity,
            special_notes: compiledNotes
          };
        })
      };

      const result = await ApiService.createOrder(orderPayload);
      setPlacedOrder(result);
      setCart([]); // Clear cart
      setIsCartOpen(false);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to place order. Please try again.");
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // Reset for new order browsing
  const startNewOrder = () => {
    setPlacedOrder(null);
    setCustomerName("");
    setPhoneNumber("");
    setCart([]);
  };

  return (
    <div className="relative mx-auto max-w-md bg-stone-50 text-stone-900 min-h-screen shadow-2xl flex flex-col font-sans border-x border-stone-200">
      
      {/* Brand Header */}
      <header className={`sticky top-0 z-20 text-white p-4 border-b-4 flex flex-col ${theme === 'indigo' ? 'bg-indigo-900 border-emerald-500' : 'bg-stone-900 border-orange-600'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`text-white w-8 h-8 flex items-center justify-center font-bold text-lg tracking-tighter ${theme === 'indigo' ? 'bg-emerald-500' : 'bg-orange-600'}`}>
              TM
            </div>
            <div>
              <h1 className="font-extrabold text-sm uppercase tracking-widest leading-none">Rawon TM</h1>
              <p className={`text-[9px] font-mono mt-0.5 ${theme === 'indigo' ? 'text-indigo-200' : 'text-stone-400'}`}>DINE-IN CUSTOMER APP</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-black/30 px-3 py-1.5 rounded-none border border-white/10 text-xs">
            <MapPin className={`w-3.5 h-3.5 ${theme === 'indigo' ? 'text-emerald-400' : 'text-orange-500'}`} />
            <span className="font-bold text-white uppercase tracking-wider text-[10px]">{selectedBranch}</span>
          </div>
        </div>

        {/* QR info details / mock table info */}
        <div className="mt-3 flex items-center justify-between bg-black/40 px-3 py-2 border border-white/10 text-xs">
          <div className="flex items-center gap-1">
            <span className={`font-mono font-bold uppercase tracking-wider ${theme === 'indigo' ? 'text-emerald-400' : 'text-orange-500'}`}>Table:</span>
            <input 
              type="text" 
              value={tableNumber} 
              onChange={(e) => setTableNumber(e.target.value)} 
              className={`w-10 bg-transparent text-white border-b font-bold focus:outline-none text-center font-mono ${theme === 'indigo' ? 'border-emerald-500/50 focus:border-emerald-400' : 'border-orange-600/50 focus:border-orange-500'}`}
              placeholder="NO"
            />
          </div>
          <div className="text-[10px] text-white/70 font-mono uppercase tracking-wider flex items-center gap-1">
            <Sparkles className={`w-3 h-3 animate-pulse ${theme === 'indigo' ? 'text-emerald-400' : 'text-orange-500'}`} />
            <span>Active Session</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto pb-24">
        {placedOrder ? (
          /* Order Placement Success View */
          <div className="p-6 text-center flex flex-col items-center justify-center min-h-[60vh] animate-fade-in">
            <div className="w-20 h-20 bg-stone-100 rounded-none flex items-center justify-center mb-4 border-2 border-stone-900 shadow-md">
              <CheckCircle className="w-12 h-12 text-orange-600 animate-bounce" />
            </div>
            <h2 className="text-2xl font-black text-stone-900 uppercase tracking-wide">Matur Nuwun!</h2>
            <p className="text-stone-500 text-sm mt-1">Your order has been submitted successfully.</p>
            
            <div className="my-6 w-full bg-white p-5 rounded-none border-2 border-stone-900 text-left shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)]">
              <div className="flex justify-between items-center pb-3 border-b border-stone-200">
                <span className="font-bold font-mono text-stone-900 text-xs">ORDER: #{placedOrder.id}</span>
                <span className="px-2.5 py-1 bg-orange-100 text-orange-950 text-[10px] font-bold uppercase tracking-wider font-mono">
                  {placedOrder.status}
                </span>
              </div>
              
              <div className="space-y-2 py-3 text-xs text-stone-600 font-mono">
                <p><span className="font-bold text-stone-900">CUSTOMER:</span> {placedOrder.customer_name}</p>
                <p><span className="font-bold text-stone-900">TABLE NO:</span> {placedOrder.table_number}</p>
                <p><span className="font-bold text-stone-900">BRANCH:</span> {placedOrder.branch_name}</p>
                <p><span className="font-bold text-stone-900">TIME:</span> {new Date(placedOrder.created_at).toLocaleTimeString()}</p>
              </div>

              <div className="border-t border-stone-200 pt-3 space-y-1">
                {placedOrder.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between text-xs text-stone-850">
                    <span>{it.quantity}x {it.menu_item?.name}</span>
                    <span className="font-bold font-mono">Rp {(it.menu_item?.price * it.quantity).toLocaleString("id-ID")}</span>
                  </div>
                ))}
              </div>

              <div className="border-t-2 border-dashed border-stone-300 mt-3 pt-3 flex justify-between font-bold text-sm text-stone-900 font-mono">
                <span>TOTAL (INCL. TAX)</span>
                <span>Rp {placedOrder.total_amount.toLocaleString("id-ID")}</span>
              </div>
            </div>

            <div className="p-4 bg-orange-50 border border-orange-200 text-xs text-orange-900 flex items-start gap-2 text-left w-full mb-6 rounded-none">
              <Info className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
              <p>Your order has been sent to the Kitchen. Please sit back; you can pay at the cashier counter later when you are done eating.</p>
            </div>

            <button 
              onClick={startNewOrder}
              className="w-full py-3.5 bg-orange-600 hover:bg-orange-700 text-white rounded-none font-bold uppercase tracking-wider text-xs transition-all active:scale-[0.98] shadow-md"
            >
              Order Something Else
            </button>
          </div>
        ) : (
          /* Normal Menu Browse & Order View */
          <div>
            {/* Quick Banner */}
            {promotions.length > 0 && (
              <div className="relative bg-stone-900 text-white p-5 flex items-center justify-between overflow-hidden border-b-2 border-stone-900">
                <div className="relative z-10 max-w-[70%]">
                  <span className="bg-orange-600 text-white font-extrabold text-[9px] px-2 py-0.5 uppercase tracking-wider font-mono">PROMO</span>
                  <h3 className="font-black text-sm uppercase tracking-wide mt-1.5 leading-snug">{promotions[0].title}</h3>
                  {promotions[0].description && (
                    <p className="text-[10px] text-stone-400 mt-1 font-mono leading-tight">{promotions[0].description}</p>
                  )}
                </div>
                <div className="absolute right-[-10px] bottom-[-15px] opacity-20 scale-100">
                  <Sparkles className="w-24 h-24 text-orange-500" />
                </div>
              </div>
            )}

            {/* Branch Fallback Selector if not set in query */}
            {!branchNameQuery && branches.length > 0 && (
              <div className="p-4 bg-stone-100 border-b border-stone-200 flex items-center justify-between">
                <span className="text-xs font-bold text-stone-900 uppercase tracking-wider">Branch:</span>
                <select 
                  value={selectedBranch}
                  onChange={(e) => handleBranchChange(e.target.value)}
                  className="bg-white border border-stone-300 text-xs px-2 py-1 focus:outline-none focus:ring-1 focus:ring-orange-600 font-mono"
                >
                  {branches.map(b => (
                    <option key={b.name} value={b.name}>{b.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Search Bar */}
            <div className="p-4 bg-stone-50 z-10">
              <div className="relative">
                <input 
                  type="text"
                  placeholder="Search rawon, drinks, sides..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white border border-stone-300 pl-10 pr-4 py-3 rounded-none text-xs focus:outline-none focus:border-orange-600 focus:ring-1 focus:ring-orange-600 shadow-sm placeholder-stone-400 font-mono transition-all"
                />
                <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
              </div>
            </div>

            {/* Category Slider */}
            <div className="px-4 pb-2 flex gap-2 overflow-x-auto scrollbar-hide">
              <button
                onClick={() => setCategoryFilter("all")}
                className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
                  categoryFilter === "all" 
                    ? "bg-orange-600 text-white shadow-sm" 
                    : "bg-stone-200 text-stone-600 hover:bg-stone-300"
                }`}
              >
                🍲 ALL ITEMS
              </button>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
                    categoryFilter === cat
                      ? "bg-orange-600 text-white shadow-sm" 
                      : "bg-stone-200 text-stone-600 hover:bg-stone-300"
                  }`}
                >
                  {cat.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="mx-4 my-3 p-3 bg-red-50 text-red-700 text-xs rounded-none border border-red-200 font-mono">
                {errorMessage}
              </div>
            )}

            {/* Menu Grid */}
            <div className="p-4 space-y-4">
              {isLoading ? (
                <div className="space-y-4 py-10">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex gap-4 p-3 bg-white rounded-none border border-stone-200 animate-pulse">
                      <div className="w-24 h-24 bg-stone-200 shrink-0" />
                      <div className="flex-1 space-y-2 py-1">
                        <div className="h-4 bg-stone-200 w-2/3" />
                        <div className="h-3 bg-stone-200 w-full" />
                        <div className="h-3 bg-stone-200 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : menuItems.length === 0 ? (
                <div className="text-center py-12 text-stone-500">
                  <p className="font-bold text-sm">No dishes found</p>
                  <p className="text-xs mt-1 font-mono">Try another category or search filter.</p>
                </div>
              ) : (
                menuItems.map(item => (
                  <div 
                    key={item.id}
                    className="group bg-white p-3 border border-stone-200 hover:border-stone-900 hover:shadow-md transition-all flex gap-3 relative rounded-none"
                  >
                    {/* Item Image */}
                    <div className="w-24 h-24 overflow-hidden shrink-0 bg-stone-100 border border-stone-200 relative rounded-none">
                      <img 
                        src={item.image_url} 
                        alt={item.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = "https://images.unsplash.com/photo-1601050690597-df056fb4ce78?w=200&auto=format&fit=crop";
                        }}
                      />
                      {!item.is_available && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-[10px] text-white font-extrabold uppercase tracking-widest">
                          Sold Out
                        </div>
                      )}
                    </div>

                    {/* Item Text */}
                    <div className="flex-1 flex flex-col justify-between py-0.5">
                      <div>
                        <h4 className="font-extrabold text-stone-900 text-sm group-hover:text-orange-600 transition-colors leading-tight">
                          {item.name}
                        </h4>
                        <p className="text-[10px] text-stone-500 line-clamp-2 mt-1 leading-snug">
                          {item.description}
                        </p>
                      </div>

                      <div className="flex justify-between items-center mt-2">
                        <span className="font-bold text-xs text-stone-900 font-mono">
                          Rp {item.price.toLocaleString("id-ID")}
                        </span>

                        {item.is_available && (
                          <button
                            onClick={() => addToCart(item)}
                            className="bg-orange-600 text-white py-1 px-3 hover:bg-orange-700 active:scale-95 transition-all flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Floating Bottom Cart Bar (if items in cart) */}
      {cart.length > 0 && !placedOrder && (
        <div className="fixed bottom-0 max-w-md w-full bg-stone-900 text-white border-t-2 border-stone-900 px-4 py-3 shadow-2xl flex items-center justify-between z-30">
          <div className="flex items-center gap-3">
            <div className="relative bg-orange-600 text-white p-2.5">
              <ShoppingBag className="w-4 h-4 text-white" />
              <span className="absolute -top-1.5 -right-1.5 bg-white text-stone-900 text-[9px] font-black w-4 h-4 flex items-center justify-center rounded-full border border-stone-900">
                {totalCartCount}
              </span>
            </div>
            <div>
              <p className="text-[10px] text-stone-400 font-mono">ESTIMATED TOTAL</p>
              <p className="text-xs font-bold font-mono text-white">Rp {totalAmount.toLocaleString("id-ID")}</p>
            </div>
          </div>

          <button
            onClick={() => setIsCartOpen(true)}
            className="px-4 py-2.5 bg-orange-600 text-white font-bold text-[10px] uppercase tracking-wider shadow-md hover:bg-orange-700 active:scale-95 transition-all"
          >
            Review Basket
          </button>
        </div>
      )}

      {/* Cart Review Side Drawer/Modal */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-t-[32px] p-6 max-h-[90vh] overflow-y-auto flex flex-col shadow-2xl animate-slide-up">
            
            {/* Drawer Drag handle */}
            <div className="w-12 h-1.5 bg-stone-200 rounded-full mx-auto mb-4" />

            <div className="flex justify-between items-center border-b border-stone-200 pb-3">
              <h3 className="font-extrabold text-md text-stone-900 flex items-center gap-2 uppercase tracking-wide">
                <ShoppingBag className="w-5 h-5 text-orange-600" />
                <span>Your Basket</span>
              </h3>
              <button 
                onClick={() => setIsCartOpen(false)}
                className="text-[10px] font-bold text-stone-500 hover:text-stone-900 bg-stone-100 px-3 py-1.5 uppercase tracking-wider font-mono"
              >
                Close
              </button>
            </div>

            {/* Cart list */}
            <div className="flex-1 overflow-y-auto space-y-4 py-4 max-h-[40vh]">
              {cart.map((c, idx) => (
                <div key={idx} className="border-b border-stone-100 pb-3 last:border-0">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1">
                      <h5 className="font-bold text-sm text-stone-900">{c.item.name}</h5>
                      <p className="text-xs text-stone-500 font-mono">Rp {c.item.price.toLocaleString("id-ID")}</p>
                      {c.selectedAddons && c.selectedAddons.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {c.selectedAddons.map(add => (
                            <span key={add} className="bg-emerald-50 text-emerald-800 text-[9px] px-1.5 py-0.5 rounded-none font-bold uppercase font-mono">
                              + {add}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 bg-stone-100 p-1">
                      <button 
                        onClick={() => updateCartQuantity(c.id, -1)}
                        className="w-7 h-7 bg-white text-stone-900 flex items-center justify-center hover:bg-stone-50 font-bold text-xs shadow-sm"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-bold text-stone-900 w-4 text-center font-mono">{c.quantity}</span>
                      <button 
                        onClick={() => updateCartQuantity(c.id, 1)}
                        className="w-7 h-7 bg-white text-stone-900 flex items-center justify-center hover:bg-stone-50 font-bold text-xs shadow-sm"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Item special notes */}
                  <div className="mt-2 flex items-center gap-1.5">
                    <FileText className="w-3 h-3 text-stone-400 shrink-0" />
                    <input 
                      type="text" 
                      placeholder="Add special notes (e.g. no onions, extra spicy)..."
                      value={c.notes}
                      onChange={(e) => updateCartNotes(c.id, e.target.value)}
                      className="w-full text-xs text-stone-600 bg-stone-50 border-b border-transparent focus:border-orange-600 focus:outline-none py-1 font-mono"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Customer Details Form */}
            <form onSubmit={handleSubmitOrder} className="border-t border-stone-200 pt-4 space-y-3">
              <h4 className="font-black text-xs text-stone-900 uppercase tracking-wider mb-2">Customer Details</h4>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">Your Name</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Enter name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full text-xs bg-stone-50 border border-stone-300 p-2.5 focus:outline-none focus:border-orange-600 rounded-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">Phone Number</label>
                  <input 
                    type="tel" 
                    placeholder="e.g. 081234..."
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full text-xs bg-stone-50 border border-stone-300 p-2.5 focus:outline-none focus:border-orange-600 rounded-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">Dining Option</label>
                <select 
                  value={orderType}
                  onChange={(e) => setOrderType(e.target.value as "dine-in" | "take-away")}
                  className="w-full text-xs bg-stone-50 border border-stone-300 p-2.5 focus:outline-none focus:border-orange-600 rounded-none font-mono font-bold"
                >
                  <option value="dine-in">🍽️ Dine-in</option>
                  <option value="take-away">🛍️ Takeaway</option>
                </select>
              </div>

              {/* Price Breakdown */}
              <div className="bg-stone-100 p-4 mt-4 space-y-2 text-xs border border-stone-200">
                <div className="flex justify-between text-stone-600">
                  <span>Subtotal</span>
                  <span className="font-mono">Rp {subtotal.toLocaleString("id-ID")}</span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>Tax ({Math.round(branchTaxRate * 100)}%)</span>
                  <span className="font-mono">Rp {taxAmount.toLocaleString("id-ID")}</span>
                </div>
                <div className="flex justify-between font-black text-sm text-stone-900 border-t border-dashed border-stone-300 pt-2 mt-2">
                  <span>Total Amount</span>
                  <span className="font-mono text-orange-600">Rp {totalAmount.toLocaleString("id-ID")}</span>
                </div>
              </div>

              {errorMessage && (
                <div className="p-3 bg-red-50 text-red-700 text-xs rounded-none border border-red-200 font-mono">
                  {errorMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmittingOrder}
                className="w-full mt-4 py-3.5 bg-orange-600 hover:bg-orange-700 disabled:bg-stone-300 disabled:text-stone-500 text-white font-bold text-sm uppercase tracking-wider rounded-none shadow-md active:scale-[0.98] transition-all"
              >
                {isSubmittingOrder ? "Placing Order..." : `Send Order • Rp ${totalAmount.toLocaleString("id-ID")}`}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ADD ITEM POPUP */}
      {activePopupItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-[24px] overflow-hidden flex flex-col shadow-2xl text-stone-900 border border-stone-150 relative animate-slide-up max-h-[92vh]">
            
            {/* Header Image Section */}
            <div className="h-52 w-full overflow-hidden shrink-0 bg-stone-100 relative">
              <img 
                src={activePopupItem.image_url} 
                alt={activePopupItem.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = "https://images.unsplash.com/photo-1601050690597-df056fb4ce78?w=500&auto=format&fit=crop";
                }}
              />
              
              {/* Close Button */}
              <button 
                type="button"
                onClick={() => setActivePopupItem(null)}
                className="absolute top-4 left-4 bg-black/40 hover:bg-black/60 text-white rounded-full p-2.5 flex items-center justify-center transition-all shadow-md"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Share Button (Aesthetic decoration to match screenshot) */}
              <button 
                type="button"
                onClick={() => alert("Share link copied to clipboard!")}
                className="absolute top-4 right-4 bg-black/40 hover:bg-black/60 text-white rounded-full p-2.5 flex items-center justify-center transition-all shadow-md"
                title="Share dish"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>

            {/* Title & Price Info section */}
            <div className="p-5 pb-4 border-b border-stone-100 bg-white">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <span className="bg-orange-50 text-orange-800 text-[9px] px-2 py-0.5 rounded-none font-bold uppercase tracking-wider font-mono">
                    {activePopupItem.category}
                  </span>
                  <h3 className="font-black text-xl text-stone-900 mt-1 uppercase tracking-tight leading-tight">{activePopupItem.name}</h3>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-mono font-black text-lg text-stone-900">
                    {activePopupItem.price.toLocaleString("id-ID")}
                  </p>
                  <p className="text-[10px] text-stone-400 font-semibold uppercase tracking-wider mt-0.5">Base price</p>
                </div>
              </div>
              
              {activePopupItem.description && (
                <p className="text-xs text-stone-500 leading-relaxed mt-2 italic font-mono">
                  {activePopupItem.description}
                </p>
              )}
            </div>

            {/* Scrollable Custom Options and notes */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-stone-50/50">
              
              {/* Addons option block (e.g. pelengkap rawon) */}
              {activePopupItem.addons && activePopupItem.addons.length > 0 && (
                <div className="bg-white p-4 border border-stone-200 shadow-xs">
                  <div className="flex justify-between items-center mb-3 border-b border-stone-100 pb-2">
                    <h4 className="font-extrabold text-xs text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-orange-500 animate-pulse" />
                      <span>Pelengkap {activePopupItem.name.toLowerCase().includes("rawon") ? "rawon" : activePopupItem.name.split(" ")[0].toLowerCase()}</span>
                    </h4>
                    <span className="text-[9px] font-bold text-stone-500 bg-stone-100 px-2 py-0.5 uppercase tracking-wider">
                      Optional, max 2
                    </span>
                  </div>

                  <div className="space-y-1">
                    {activePopupItem.addons.map(addon => {
                      const isSelected = popupSelectedAddons.includes(addon);
                      return (
                        <div 
                          key={addon}
                          onClick={() => {
                            if (isSelected) {
                              setPopupSelectedAddons(popupSelectedAddons.filter(a => a !== addon));
                            } else {
                              if (popupSelectedAddons.length < 2) {
                                setPopupSelectedAddons([...popupSelectedAddons, addon]);
                              } else {
                                // Keep max 2 by taking the second item and appending the new one
                                setPopupSelectedAddons([popupSelectedAddons[1], addon]);
                              }
                            }
                          }}
                          className="flex items-center justify-between py-2.5 px-1 hover:bg-stone-50/80 transition-colors cursor-pointer select-none border-b border-stone-50 last:border-0"
                        >
                          <span className="text-xs text-stone-700 capitalize font-mono font-medium">{addon}</span>
                          <div className={`w-5 h-5 rounded-none border flex items-center justify-center transition-all ${
                            isSelected 
                              ? "bg-emerald-600 border-emerald-600 text-white" 
                              : "border-stone-400 bg-white"
                          }`}>
                            {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Note to restaurant section */}
              <div className="bg-white p-4 border border-stone-200 shadow-xs">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-extrabold text-xs text-stone-900 uppercase tracking-wider">
                    Note to restaurant
                  </h4>
                  <span className="text-[9px] text-stone-400 font-bold uppercase">Optional</span>
                </div>
                <textarea 
                  rows={2}
                  placeholder="Add your request (subject to restaurant's discretion)..."
                  value={popupNotes}
                  onChange={(e) => setPopupNotes(e.target.value)}
                  className="w-full text-xs text-stone-800 bg-stone-50 border border-stone-300 rounded-none p-2.5 focus:border-emerald-600 focus:outline-none focus:ring-0 font-mono placeholder-stone-400"
                />
              </div>

            </div>

            {/* Fixed Sticky Bottom Action bar */}
            <div className="p-4 border-t border-stone-150 bg-white sticky bottom-0 z-10 flex flex-col gap-3">
              
              {/* Quantity selector inside bar */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 font-mono">Select Quantity</span>
                <div className="flex items-center gap-2.5 bg-stone-100 p-1 rounded-none border border-stone-200">
                  <button 
                    type="button"
                    onClick={() => setPopupQuantity(q => Math.max(1, q - 1))}
                    className="w-7 h-7 bg-white text-stone-900 flex items-center justify-center hover:bg-stone-50 font-bold text-xs shadow-xs transition-transform active:scale-90"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-xs font-black text-stone-900 w-6 text-center font-mono">{popupQuantity}</span>
                  <button 
                    type="button"
                    onClick={() => setPopupQuantity(q => q + 1)}
                    className="w-7 h-7 bg-white text-stone-900 flex items-center justify-center hover:bg-stone-50 font-bold text-xs shadow-xs transition-transform active:scale-90"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Big CTA Button */}
              <button
                type="button"
                onClick={confirmAddToCart}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs uppercase tracking-widest transition-all shadow-md active:scale-95 text-center flex items-center justify-center gap-2"
              >
                <span>Add to Basket - Rp {(activePopupItem.price * popupQuantity).toLocaleString("id-ID")} (Incl. tax)</span>
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
