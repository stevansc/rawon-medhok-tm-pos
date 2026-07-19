import React, { useState, useEffect } from "react";
import { MenuItem, OrderInput } from "../types";
import { ApiService } from "../services/api";
import { ShoppingBag, Plus, Minus, CheckCircle, Search, Info } from "lucide-react";

interface EmployeeOrderEntryProps {
  currentBranch: string;
  onOrderPlaced: () => void;
}

export default function EmployeeOrderEntry({ currentBranch, onOrderPlaced }: EmployeeOrderEntryProps) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  const [orderType, setOrderType] = useState<"dine-in" | "GoFood" | "GrabFood" | "ShopeeFood">("dine-in");
  const [fulfillmentType, setFulfillmentType] = useState<"dine-in" | "takeaway">("dine-in");
  const [tableNumber, setTableNumber] = useState<number>(0);
  const [customerName, setCustomerName] = useState<string>("");
  
  // Cart state
  const [cart, setCart] = useState<{
    id: string;
    item: MenuItem;
    quantity: number;
    notes: string;
  }[]>([]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadMenu() {
      try {
        setIsLoading(true);
        const menu = await ApiService.getMenu(currentBranch);
        
        const uniqueCategories = Array.from(new Set(menu.map(item => item.category)));
        
        setMenuItems(menu);
        setCategories(uniqueCategories.filter(c => c.toLowerCase() !== 'master'));
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    loadMenu();
  }, [currentBranch]);

  const getPrice = (item: MenuItem) => {
    if (orderType === "GoFood" && item.price_gofood !== null) return item.price_gofood;
    if (orderType === "GrabFood" && item.price_grabfood !== null) return item.price_grabfood;
    if (orderType === "ShopeeFood" && item.price_shopee !== null) return item.price_shopee;
    return item.price_normal;
  };

  const filteredMenu = menuItems.filter(item => {
    if (item.category.toLowerCase() === 'master') return false;
    if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
    if (searchQuery) {
      return item.name.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  const addToCart = (item: MenuItem) => {
    const existing = cart.find(c => c.item.id === item.id);
    if (existing) {
      const updated = cart.map(c => 
        c.item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
      );
      setCart(updated);
    } else {
      setCart([...cart, { 
        id: Math.random().toString(36).substring(2, 11),
        item, 
        quantity: 1, 
        notes: ""
      }]);
    }
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(cart.map(c => {
      if (c.id === id) {
        return { ...c, quantity: Math.max(0, c.quantity + delta) };
      }
      return c;
    }).filter(c => c.quantity > 0));
  };

  const subtotal = cart.reduce((sum, c) => sum + getPrice(c.item) * c.quantity, 0);

  const handleSubmit = async () => {
    if (cart.length === 0) return;
    if (orderType === "dine-in" && fulfillmentType === "dine-in" && tableNumber <= 0) {
      alert("Please enter a valid table number.");
      return;
    }
    try {
      setIsSubmitting(true);
      const payload: OrderInput = {
        table_number: (orderType === "dine-in" && fulfillmentType === "dine-in") ? tableNumber : 0,
        customer_name: customerName,
        phone_number: "Online",
        order_type: orderType === "dine-in" ? fulfillmentType : orderType,
        branch_name: currentBranch,
        items: cart.map(c => ({
          menu_item_id: c.item.id,
          quantity: c.quantity,
          special_notes: c.notes
        }))
      };
      
      await ApiService.createOrder(payload);
      setCart([]);
      setTableNumber(0);
      setCustomerName("");
      onOrderPlaced();
    } catch (err: any) {
      alert(`Failed to place order: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-full">
      {/* Left: Menu & Filters */}
      <div className="flex-1 flex flex-col bg-stone-100 overflow-hidden">
        <div className="p-4 bg-white border-b border-stone-200">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
            <h2 className="text-lg font-black uppercase tracking-wider text-stone-900 flex items-center gap-2">
              <ShoppingBag className="text-orange-600" />
              <span>New Order</span>
            </h2>
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Platform Pricing:</label>
              <select 
                value={orderType} 
                onChange={(e) => setOrderType(e.target.value as any)}
                className="bg-stone-900 text-white font-bold text-xs px-3 py-1.5 uppercase tracking-wider border-none focus:ring-0"
              >
                <option value="dine-in">Dine/Take</option>
                <option value="GoFood">GoFood</option>
                <option value="GrabFood">GrabFood</option>
                <option value="ShopeeFood">ShopeeFood</option>
              </select>
            </div>
          </div>
          
          <div className="flex gap-2 items-center">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-stone-400" />
              <input 
                type="text" 
                placeholder="Search menu..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs font-mono border border-stone-300 rounded-none focus:border-orange-600 focus:outline-none"
              />
            </div>
            <select 
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="px-3 py-2 text-xs border border-stone-300 rounded-none bg-stone-50 font-bold uppercase tracking-wider focus:outline-none focus:border-orange-600"
            >
              <option value="all">All Categories</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="flex-1 p-4 overflow-y-auto">
          {isLoading ? (
            <div className="text-center py-10 text-stone-400 text-sm font-mono">Loading menu...</div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredMenu.map(item => {
                const isOutOfStock = !item.is_available || (item.stock_count !== null && item.stock_count <= 0);
                return (
                <div key={item.id} onClick={() => !isOutOfStock && addToCart(item)} className={`bg-white border-2 p-3 flex flex-col justify-between transition-colors group relative shadow-sm ${isOutOfStock ? 'border-stone-200 opacity-50 cursor-not-allowed' : 'border-stone-200 hover:border-stone-900 cursor-pointer hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)]'}`}>
                  {isOutOfStock && <div className="absolute inset-0 z-10 flex items-center justify-center font-black text-red-600 uppercase tracking-widest text-lg transform -rotate-12 backdrop-blur-[1px]">Out of Stock</div>}
                  <div>
                    <h3 className={`font-bold text-sm uppercase leading-tight transition-colors ${isOutOfStock ? 'text-stone-500' : 'text-stone-900 group-hover:text-orange-600'}`}>{item.name}</h3>
                    <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider mt-1">{item.category}</p>
                  </div>
                  <div className="mt-3 flex justify-between items-center">
                    <span className="font-black text-stone-900 font-mono">Rp {getPrice(item).toLocaleString('id-ID')}</span>
                    {(() => {
                      const cartItem = cart.find(c => c.item.id === item.id);
                      if (cartItem) {
                        return (
                          <div className="flex items-center bg-stone-900 text-white rounded-none border border-stone-900" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => updateQuantity(cartItem.id, -1)} className="p-1.5 hover:text-orange-500 transition-colors">
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="font-bold text-xs w-6 text-center font-mono">{cartItem.quantity}</span>
                            <button onClick={() => updateQuantity(cartItem.id, 1)} className="p-1.5 hover:text-orange-500 transition-colors">
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      }
                      return (
                        <button className={`p-1.5 transition-colors border border-stone-900 ${isOutOfStock ? 'bg-stone-100 text-stone-400' : 'bg-white hover:bg-stone-900 hover:text-white text-stone-900'}`}>
                          <Plus className="w-4 h-4" />
                        </button>
                      );
                    })()}
                  </div>
                </div>
              )})}
            </div>
          )}
        </div>
      </div>

      {/* Right: Cart */}
      <div className="w-full md:w-80 bg-stone-900 text-white flex flex-col border-l-4 border-orange-600 shrink-0">
        <div className="p-4 border-b border-stone-800 flex justify-between items-center">
          <h3 className="font-black text-sm uppercase tracking-wider flex items-center gap-2">
            <span>Current Ticket</span>
            <span className="bg-orange-600 px-2 py-0.5 text-[10px]">{orderType === "dine-in" ? "DINE/TAKE" : orderType}</span>
          </h3>
          {orderType === "dine-in" && fulfillmentType === "dine-in" && (
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-bold text-stone-400 tracking-wider">TABLE:</label>
              <input type="number" min="1" value={tableNumber || ''} onChange={e => setTableNumber(parseInt(e.target.value) || 0)} className="bg-stone-800 border border-stone-700 text-white w-12 px-2 py-1 text-xs text-center font-mono focus:border-orange-500 focus:outline-none" />
            </div>
          )}
        </div>
        
        <div className="px-4 py-2 bg-stone-800 border-b border-stone-700 flex flex-col gap-2">
          {orderType === "dine-in" && (
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-bold text-stone-400 tracking-wider whitespace-nowrap">TYPE:</label>
              <select 
                value={fulfillmentType} 
                onChange={e => setFulfillmentType(e.target.value as any)} 
                className="bg-stone-900 border border-stone-700 text-white w-full px-2 py-1 text-xs font-mono focus:border-orange-500 focus:outline-none uppercase"
              >
                <option value="dine-in">Dine-In</option>
                <option value="takeaway">Takeaway</option>
              </select>
            </div>
          )}
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-bold text-stone-400 tracking-wider whitespace-nowrap">CUSTOMER:</label>
            <input 
              type="text" 
              placeholder="Optional Name"
              value={customerName} 
              onChange={e => setCustomerName(e.target.value)} 
              className="bg-stone-900 border border-stone-700 text-white w-full px-2 py-1 text-xs font-mono focus:border-orange-500 focus:outline-none" 
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {cart.length === 0 ? (
            <div className="text-center py-10 text-stone-600 font-mono text-xs">
              Ticket is empty.<br/>Click items to add.
            </div>
          ) : (
            cart.map(c => (
              <div key={c.id} className="bg-stone-800 p-3 border border-stone-700">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-xs uppercase leading-tight pr-2">{c.item.name}</span>
                  <span className="font-mono text-xs text-orange-500 font-bold whitespace-nowrap">Rp {(getPrice(c.item) * c.quantity).toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between items-center">
                  <input 
                    type="text" 
                    placeholder="Notes..." 
                    value={c.notes}
                    onChange={(e) => setCart(cart.map(x => x.id === c.id ? {...x, notes: e.target.value} : x))}
                    className="w-1/2 bg-stone-900 border border-stone-700 px-2 py-1 text-[10px] font-mono text-stone-300 focus:outline-none focus:border-orange-500"
                  />
                  <div className="flex items-center gap-2 bg-stone-900 border border-stone-700">
                    <button onClick={() => updateQuantity(c.id, -1)} className="p-1 hover:text-orange-500 hover:bg-stone-800 transition-colors"><Minus className="w-3 h-3" /></button>
                    <span className="text-[10px] font-black w-4 text-center">{c.quantity}</span>
                    <button onClick={() => updateQuantity(c.id, 1)} className="p-1 hover:text-orange-500 hover:bg-stone-800 transition-colors"><Plus className="w-3 h-3" /></button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-stone-800 bg-stone-950">
          <div className="flex justify-between items-center mb-4 text-sm font-mono">
            <span className="text-stone-400">Total</span>
            <span className="font-black text-white text-lg">Rp {subtotal.toLocaleString('id-ID')}</span>
          </div>
          <button 
            onClick={handleSubmit}
            disabled={cart.length === 0 || isSubmitting}
            className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-stone-800 disabled:text-stone-600 text-white font-black uppercase tracking-widest py-3 transition-colors flex items-center justify-center gap-2"
          >
            {isSubmitting ? "Sending..." : "Send to Kitchen"}
            <CheckCircle className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
