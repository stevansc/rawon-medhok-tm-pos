import React, { useState, useEffect } from "react";
import { MenuItem, Branch, DashboardAnalytics } from "../types";
import { FALLBACK_IMAGE_URL } from "../types";
import { ApiService } from "../services/api";
import { useAuth } from "../hooks/useAuth";
import LoginScreen from "../components/LoginScreen";
import { Modal } from "../components/Modal";
import {
  Building, Settings, Plus, Edit,
  TrendingUp, CircleDollarSign, ShoppingBag, LogOut,
  AlertCircle, Sparkles, ChefHat, ToggleLeft, ToggleRight, Percent,
  Search, ArrowUpDown, Flame, History, Clock, Calculator, Receipt, Trash, GripVertical, X, Equal, Minus, ShieldAlert
} from "lucide-react";
import { Order } from "../types";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableMenuItem({ item, onToggleAvailability, onEdit, onDelete, branchColors, FALLBACK_IMAGE_URL }: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.5 : 1,
  };

  const itemStock = item.stock_count === null || item.stock_count === undefined ? '∞' : item.stock_count;
  const itemCost = item.cost ?? Math.round(item.price_normal * 0.5);
  const grossProfit = item.price_normal - itemCost;
  const grossMarginPercent = item.price_normal > 0 ? Math.round((grossProfit / item.price_normal) * 100) : 0;

  return (
    <div ref={setNodeRef} style={style} className={`p-3 bg-stone-50 rounded-none border ${isDragging ? 'border-orange-500 shadow-2xl scale-[1.02]' : 'border-stone-200 hover:border-stone-400'} transition-all flex flex-col sm:flex-row justify-between gap-3 group relative`}>
      <div className="flex gap-3 items-center w-full sm:w-auto">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-stone-400 hover:text-stone-900 px-2 py-4">
          <GripVertical className="w-5 h-5" />
        </div>
        <img src={item.image_url || FALLBACK_IMAGE_URL} alt={item.name} referrerPolicy="no-referrer" className="w-16 h-16 object-cover rounded-none bg-stone-200 shrink-0 border border-stone-300 pointer-events-none" />
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
              Cost: Rp {itemCost.toLocaleString("id-ID")}
            </span>
          </div>
        </div>
      </div>
      <div className="flex sm:flex-col items-end justify-between text-right shrink-0">
        <div className="flex flex-col items-end gap-1 font-mono">
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-stone-500 uppercase font-bold tracking-widest">Dine-in</span>
            <span className="font-bold text-xs text-orange-600">Rp {item.price_normal.toLocaleString("id-ID")}</span>
          </div>
          {!!item.price_gofood && (
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-red-500/80 uppercase font-bold tracking-widest">GoFood</span>
              <span className="font-bold text-[11px] text-stone-600">Rp {item.price_gofood.toLocaleString("id-ID")}</span>
            </div>
          )}
          {!!item.price_grabfood && (
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-emerald-500/80 uppercase font-bold tracking-widest">Grab</span>
              <span className="font-bold text-[11px] text-stone-600">Rp {item.price_grabfood.toLocaleString("id-ID")}</span>
            </div>
          )}
          {!!item.price_shopee && (
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-orange-400/80 uppercase font-bold tracking-widest">Shopee</span>
              <span className="font-bold text-[11px] text-stone-600">Rp {item.price_shopee.toLocaleString("id-ID")}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 mt-3 relative z-20">
          <button onClick={() => onToggleAvailability(item)} disabled={itemStock === 0} className={`text-[10px] font-bold uppercase px-2 py-1 rounded-none bg-white border font-mono ${itemStock === 0 ? "text-stone-400 border-stone-200 bg-stone-100 cursor-not-allowed" : "hover:bg-stone-100 border-stone-300 text-stone-700"}`}>
            {itemStock === 0 ? <span className="text-stone-400">Unavailable</span> : item.is_available ? <span className="text-emerald-600">Available</span> : <span className="text-red-500">Suspended</span>}
          </button>
          <button onClick={() => onEdit(item)} className="p-1.5 bg-stone-200 hover:bg-stone-300 rounded-none text-stone-700 transition-all">
            <Edit className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onDelete(item.id)} className="p-1.5 bg-red-100 hover:bg-red-200 rounded-none text-red-600 border border-red-300 transition-all">
            <Trash className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function SortableIngredientItem({ item, onEdit, onDelete, onUpdateStock, branchColors }: { item: any, onEdit: (i: any) => void, onDelete: (id: number) => void, onUpdateStock: (i: any) => void, branchColors: { bg: string; text: string; border: string } }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className={`flex flex-col sm:flex-row gap-4 p-3 border-2 transition-all group relative bg-white ${isDragging ? "border-orange-500 shadow-xl" : "border-stone-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.9)]"}`}>
      <div {...attributes} {...listeners} className="absolute left-0 top-0 bottom-0 w-8 flex items-center justify-center cursor-grab active:cursor-grabbing bg-stone-50 border-r-2 border-stone-900 text-stone-400 group-hover:text-stone-900 transition-colors">
        <GripVertical className="w-4 h-4" />
      </div>
      
      <div className="flex-1 flex flex-col justify-center ml-8 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <h5 className="font-black text-sm uppercase truncate tracking-wide text-stone-900">{item.name}</h5>
          <span className={`text-[9px] px-1.5 py-0.5 rounded-none font-bold uppercase tracking-widest border ${branchColors.bg} ${branchColors.text} ${branchColors.border}`}>{item.branch_name}</span>
        </div>
        <div className="flex gap-4 text-xs font-mono text-stone-500">
          <p>Stock: <span className="font-bold text-orange-600">{item.stock_qty}</span> {item.unit}</p>
        </div>
      </div>
      
      <div className="flex sm:flex-col items-end justify-center gap-2 shrink-0 relative z-20">
        <div className="flex items-center gap-2">
          <button onClick={() => onUpdateStock(item)} className="p-1.5 bg-stone-200 hover:bg-stone-300 rounded-none text-stone-700 transition-all">
            <ArrowUpDown className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onEdit(item)} className="p-1.5 bg-stone-200 hover:bg-stone-300 rounded-none text-stone-700 transition-all">
            <Edit className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onDelete(item.id)} className="p-1.5 bg-red-100 hover:bg-red-200 rounded-none text-red-600 border border-red-300 transition-all">
            <Trash className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminApp() {
  const auth = useAuth({ allowedRoles: ["admin"] });

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const formatDuration = (start?: string, end?: string) => {
    if (!start || !end) return "-";
    const startDate = new Date(start + (!start.endsWith('Z') ? 'Z' : ''));
    const endDate = new Date(end + (!end.endsWith('Z') ? 'Z' : ''));
    const diffMs = endDate.getTime() - startDate.getTime();
    if (diffMs < 0) return "-";
    
    const diffSeconds = Math.floor(diffMs / 1000);
    const h = Math.floor(diffSeconds / 3600);
    const m = Math.floor((diffSeconds % 3600) / 60);
    const s = diffSeconds % 60;
    
    if (h > 0) {
      return `${h} hours ${m} minute ${s} seconds`;
    }
    return `${m} minute ${s} seconds`;
  };

  const formatLocalTime = (isoString?: string) => {
    if (!isoString) return "-";
    const d = new Date(isoString + (!isoString.endsWith('Z') ? 'Z' : ''));
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Active section tab
  const [activeTab, setActiveTab] = useState<"dashboard" | "branches" | "menu" | "transactions" | "inventory">("dashboard");

  // Admin state
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>("");
  const [branches, setBranches] = useState<Branch[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Branch configuration states
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [branchFormName, setBranchFormName] = useState("");
  const [branchFormTax, setBranchFormTax] = useState("10");
  const [branchFormColor, setBranchFormColor] = useState("stone");

  const resetBranchForm = () => {
    setEditingBranch(null);
    setBranchFormName("");
    setBranchFormTax("10");
    setBranchFormColor("stone");
    setBranchUsers([]);
    setNewUserUsername("");
    setNewUserPassword("");
    setNewUserRole("cashier");
  };

  // Branch User Management states
  const [branchUsers, setBranchUsers] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [newUserUsername, setNewUserUsername] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState<"cashier" | "employee">("cashier");

  // Menu editor form states
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
  const [editingMenuItem, setEditingMenuItem] = useState<MenuItem | null>(null);
  const [menuFormName, setMenuFormName] = useState("");
  const [menuFormPrice, setMenuFormPrice] = useState("");
  const [menuFormGoFood, setMenuFormGoFood] = useState("");
  const [menuFormGrabFood, setMenuFormGrabFood] = useState("");
  const [menuFormShopee, setMenuFormShopee] = useState("");
  const [menuFormDesc, setMenuFormDesc] = useState("");
  const [menuFormCategory, setMenuFormCategory] = useState<string>("food");
  const [menuFormBranch, setMenuFormBranch] = useState("");
  const [menuFormAvailable, setMenuFormAvailable] = useState(true);
  const [menuFormImage, setMenuFormImage] = useState("");
  const [menuFormStock, setMenuFormStock] = useState("15");
  const [menuFormCost, setMenuFormCost] = useState("10000");
  const [menuFormAddons, setMenuFormAddons] = useState("");
  const [menuFormIngredients, setMenuFormIngredients] = useState<any[]>([]);

  // Inventory state
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [isIngredientModalOpen, setIsIngredientModalOpen] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<any | null>(null);
  const [ingredientSearchQuery, setIngredientSearchQuery] = useState("");
  const [ingredientFormName, setIngredientFormName] = useState("");
  const [ingredientFormUnit, setIngredientFormUnit] = useState("pcs");
  const [ingredientFormStock, setIngredientFormStock] = useState("0");
  const [ingredientFormBranch, setIngredientFormBranch] = useState("");
  const [adjustStockIngredient, setAdjustStockIngredient] = useState<any | null>(null);
  const [adjustStockAmount, setAdjustStockAmount] = useState<string>("");

  // Dynamic Categories states
  const [categories, setCategories] = useState<string[]>([]);
  const [newCategoryName, setNewCategoryName] = useState("");

  // Dashboard date filter
  const getLocalDateStr = (offsetDays = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
  };

  const [analyticsStartDate, setAnalyticsStartDate] = useState(getLocalDateStr());
  const [analyticsEndDate, setAnalyticsEndDate] = useState(getLocalDateStr());

  // Backend aggregated dish performance
  const [dishPerformance, setDishPerformance] = useState<any[]>([]);

  // Dashboard dish analysis filter states
  const [dishSearchQuery, setDishSearchQuery] = useState("");
  const [menuSearchQuery, setMenuSearchQuery] = useState("");
  const [dishSortField, setDishSortField] = useState<"soldCount" | "revenue" | "profit" | "stock">("soldCount");
  const [dishSortOrder, setDishSortOrder] = useState<"asc" | "desc">("desc");
  const [dishCategoryFilter, setDishCategoryFilter] = useState("all");

  // Transactions Tab
  const [transactionsStartDate, setTransactionsStartDate] = useState(getLocalDateStr());
  const [transactionsEndDate, setTransactionsEndDate] = useState(getLocalDateStr());
  const [transactions, setTransactions] = useState<Order[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [transactionsSearch, setTransactionsSearch] = useState("");
  const [transactionReceiptOrder, setTransactionReceiptOrder] = useState<Order | null>(null);

  // Fetch admin content
  const loadAdminData = async () => {
    if (!auth.user) return;
    try {
      setIsLoading(true);
      setError(null);

      const startDate = analyticsStartDate ? new Date(analyticsStartDate + "T00:00:00+07:00").toISOString() : undefined;
      const endDate = analyticsEndDate ? new Date(analyticsEndDate + "T23:59:59+07:00").toISOString() : undefined;

      const [fetchedAnalytics, fetchedPerformance, fetchedMenu, fetchedBranches, fetchedCats, fetchedIngredients] = await Promise.all([
        ApiService.getDashboardAnalytics(selectedBranchFilter || undefined, startDate, endDate),
        ApiService.getDishPerformance(selectedBranchFilter || undefined, startDate, endDate),
        ApiService.getMenu(selectedBranchFilter || undefined),
        branches.length === 0 ? ApiService.getBranches() : Promise.resolve(branches),
        categories.length === 0 ? ApiService.getCategories() : Promise.resolve(categories),
        ApiService.getIngredients(selectedBranchFilter || undefined)
      ]);

      setAnalytics(fetchedAnalytics);
      setDishPerformance(fetchedPerformance);
      setMenuItems(fetchedMenu);
      setIngredients(fetchedIngredients);
      if (branches.length === 0) setBranches(fetchedBranches);
      if (categories.length === 0) setCategories(fetchedCats);

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
  }, [auth.user, selectedBranchFilter, analyticsStartDate, analyticsEndDate]);

  // Load transactions
  const loadTransactions = async () => {
    if (!auth.user || activeTab !== "transactions") return;
    try {
      setIsLoadingTransactions(true);
      setError(null);
      const startIso = new Date(transactionsStartDate + "T00:00:00+07:00").toISOString();
      const endIso = new Date(transactionsEndDate + "T23:59:59+07:00").toISOString();
      const data = await ApiService.getTransactions(selectedBranchFilter || undefined, startIso, endIso);
      setTransactions(data);
    } catch (err: any) {
      setError(err.message || "Failed to load transactions.");
    } finally {
      setIsLoadingTransactions(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [activeTab, selectedBranchFilter, transactionsStartDate, transactionsEndDate]);

  // Delete transaction
  const handleDeleteTransaction = async (orderId: number) => {
    if (!window.confirm(`Are you sure you want to permanently delete transaction #${orderId}? This cannot be undone.`)) return;
    try {
      await ApiService.deleteTransaction(orderId);
      setTransactions(prev => prev.filter(t => t.id !== orderId));
      setTransactionReceiptOrder(null);
    } catch (err: any) {
      alert(`Failed to delete transaction: ${err.message}`);
    }
  };

  // Create new branch
  const handleAddBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchFormName.trim()) return;

    try {
      setError(null);
      const rate = parseFloat(branchFormTax) / 100;
      const newBranch = await ApiService.createBranch({
        name: branchFormName,
        tax_rate: isNaN(rate) ? 0.10 : rate,
        color_theme: branchFormColor
      });
      setIsBranchModalOpen(false);
      resetBranchForm();
      setBranches(prev => [...prev, newBranch]);
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
        price_normal: item.price_normal,
        price_gofood: item.price_gofood,
        price_grabfood: item.price_grabfood,
        price_shopee: item.price_shopee,
        description: item.description,
        category: item.category,
        branch_name: item.branch_name,
        is_available: !item.is_available,
        image_url: item.image_url,
        stock_count: item.stock_count,
        cost: item.cost,
        addons: item.addons,
        ingredients: item.ingredients ? item.ingredients.map((ing: any) => ({
          ingredient_id: ing.ingredient_id,
          required_qty: ing.required_qty
        })) : []
      };
      const savedItem = await ApiService.updateMenuItem(item.id, updatedItem);
      setMenuItems(prev => prev.map(m => m.id === savedItem.id ? savedItem : m));
    } catch (err: any) {
      alert(`Failed to update item state: ${err.message}`);
    }
  };

  // Handle Drag End
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = menuItems.findIndex((item) => item.id === active.id);
      const newIndex = menuItems.findIndex((item) => item.id === over.id);

      const reorderedItems = arrayMove(menuItems, oldIndex, newIndex);
      
      // Compute new sort order based on position (e.g. sequentially)
      // For a quick robust fix, we update all items in the array to index + 1
      const payload = reorderedItems.map((item, idx) => ({
        id: item.id,
        sort_order: idx
      }));

      // Optimistically update
      setMenuItems(reorderedItems);

      try {
        await ApiService.reorderMenuItems(payload);
      } catch (err: any) {
        alert("Failed to save reorder: " + err.message);
        loadAdminData(); // Refresh from backend if it fails
      }
    }
  };
  // Handle Drag End for Ingredients
  const handleIngredientDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = ingredients.findIndex((item) => item.id === active.id);
      const newIndex = ingredients.findIndex((item) => item.id === over.id);

      const reorderedItems = arrayMove(ingredients, oldIndex, newIndex);
      
      const payload = reorderedItems.map((item, idx) => ({
        id: item.id,
        sort_order: idx
      }));

      setIngredients(reorderedItems);

      try {
        await ApiService.reorderIngredients(payload);
      } catch (err: any) {
        alert("Failed to save reorder: " + err.message);
        loadAdminData();
      }
    }
  };

  const resetIngredientForm = () => {
    setEditingIngredient(null);
    setIngredientFormName("");
    setIngredientFormUnit("pcs");
    setIngredientFormStock("0");
    setIngredientFormBranch(selectedBranchFilter || (branches[0]?.name || ""));
  };

  const handleEditIngredientSelect = (item: any) => {
    setEditingIngredient(item);
    setIngredientFormName(item.name);
    setIngredientFormUnit(item.unit);
    setIngredientFormStock(item.stock_qty.toString());
    setIngredientFormBranch(item.branch_name);
  };

  const handleIngredientFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ingredientFormName || !ingredientFormUnit || !ingredientFormBranch) return;

    try {
      if (editingIngredient) {
        const amt = parseFloat(ingredientFormStock) || 0;
        await ApiService.updateIngredient(editingIngredient.id, {
          name: ingredientFormName,
          unit: ingredientFormUnit,
          stock_qty: amt,
          branch_name: ingredientFormBranch
        });
        alert("Ingredient updated successfully.");
        loadAdminData();
      } else {
        const newIng = await ApiService.createIngredient({
          name: ingredientFormName,
          unit: ingredientFormUnit,
          stock_qty: parseFloat(ingredientFormStock) || 0,
          branch_name: ingredientFormBranch
        });
        setIngredients(prev => [...prev, newIng]);
        alert("Ingredient created successfully.");
      }
      setIsIngredientModalOpen(false);
      resetIngredientForm();
    } catch (err: any) {
      alert(`Failed to save ingredient: ${err.message}`);
    }
  };

  const handleStockAdjustment = async (action: "add" | "deduct" | "set") => {
    if (!adjustStockIngredient) return;
    const amount = parseFloat(adjustStockAmount);
    if (isNaN(amount)) return;

    let newQty = adjustStockIngredient.stock_qty;
    if (action === "add") {
      newQty += amount;
    } else if (action === "deduct") {
      newQty -= amount;
    } else if (action === "set") {
      newQty = amount;
    }

    try {
      await ApiService.updateIngredientStock(adjustStockIngredient.id, newQty);
      setIngredients(prev => prev.map(i => i.id === adjustStockIngredient.id ? { ...i, stock_qty: newQty } : i));
      setAdjustStockIngredient(null);
      setAdjustStockAmount("");
      loadAdminData(); // Optionally refresh full data to update BOM stock if needed
    } catch (err: any) {
      alert("Failed to update stock: " + err.message);
    }
  };

  // Reset menu form
  const resetMenuForm = () => {
    setEditingMenuItem(null);
    setMenuFormName("");
    setMenuFormPrice("");
    setMenuFormGoFood("");
    setMenuFormGrabFood("");
    setMenuFormShopee("");
    setMenuFormDesc("");
    setMenuFormImage("");
    setMenuFormStock("0");
    setMenuFormCost("10000");
    setMenuFormAddons("");
    setMenuFormIngredients([]);
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
      price_normal: parseFloat(menuFormPrice),
      price_gofood: menuFormGoFood ? parseFloat(menuFormGoFood) : null,
      price_grabfood: menuFormGrabFood ? parseFloat(menuFormGrabFood) : null,
      price_shopee: menuFormShopee ? parseFloat(menuFormShopee) : null,
      description: menuFormDesc,
      category: menuFormCategory,
      branch_name: menuFormBranch,
      is_available: menuFormAvailable,
      image_url: menuFormImage || FALLBACK_IMAGE_URL,
      cost: finalCost,
      addons: finalAddons,
      ingredients: menuFormIngredients.map(ing => ({
        ingredient_id: ing.ingredient_id,
        required_qty: parseFloat(ing.required_qty)
      }))
    };

    try {
      setError(null);
      if (editingMenuItem) {
        const savedItem = await ApiService.updateMenuItem(editingMenuItem.id, payload);
        setMenuItems(prev => prev.map(m => m.id === savedItem.id ? savedItem : m));
        alert("Dish updated successfully.");
      } else {
        const newItem = await ApiService.createMenuItem(payload);
        setMenuItems(prev => [...prev, newItem]);
        alert("New dish added successfully.");
      }
      resetMenuForm();
    } catch (err: any) {
      alert(`Menu modification failed: ${err.message}`);
    }
  };

  const handleDeleteMenuItem = async (id: number) => {
    if (!window.confirm(`Are you sure you want to permanently delete this menu item?`)) return;
    try {
      await ApiService.deleteMenuItem(id);
      setMenuItems(prev => prev.filter(m => m.id !== id));
    } catch (err: any) {
      alert(`Failed to delete menu item: ${err.message}`);
    }
  };

  const handleEditMenuItemSelect = (item: MenuItem) => {
    setEditingMenuItem(item);
    setMenuFormName(item.name);
    setMenuFormPrice(item.price_normal.toString());
    setMenuFormGoFood(item.price_gofood ? item.price_gofood.toString() : "");
    setMenuFormGrabFood(item.price_grabfood ? item.price_grabfood.toString() : "");
    setMenuFormShopee(item.price_shopee ? item.price_shopee.toString() : "");
    setMenuFormDesc(item.description);
    setMenuFormCategory(item.category);
    setMenuFormBranch(item.branch_name);
    setMenuFormAvailable(item.is_available);
    setMenuFormImage(item.image_url);
    setMenuFormStock((item.stock_count ?? 0).toString());
    setMenuFormCost(item.cost !== undefined ? item.cost.toString() : Math.round(item.price_normal * 0.5).toString());
    setMenuFormAddons(item.addons ? item.addons.join(", ") : "");
    setMenuFormIngredients(item.ingredients ? item.ingredients.map(ing => ({
      ingredient_id: ing.ingredient_id,
      required_qty: ing.required_qty.toString()
    })) : []);
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
    fetchBranchUsers(branch.name);
  };

  const fetchBranchUsers = async (branchName: string) => {
    try {
      setIsLoadingUsers(true);
      const users = await ApiService.getUsers(branchName);
      setBranchUsers(users.filter(u => u.role !== "admin")); // Only show non-admins here
    } catch (err: any) {
      alert(`Failed to load branch users: ${err.message}`);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBranch || !newUserUsername || !newUserPassword) return;
    try {
      await ApiService.createUser({
        username: newUserUsername.trim(),
        password: newUserPassword,
        role: newUserRole,
        branch_name: editingBranch.name
      });
      setNewUserUsername("");
      setNewUserPassword("");
      await fetchBranchUsers(editingBranch.name);
      alert("User account created successfully.");
    } catch (err: any) {
      alert(`Failed to create user: ${err.message}`);
    }
  };

  const handleChangeUserPassword = async (userId: number, username: string) => {
    const newPassword = prompt(`Enter new password for ${username}:`);
    if (!newPassword) return;
    try {
      await ApiService.updateUserPassword(userId, newPassword);
      alert("Password updated successfully.");
    } catch (err: any) {
      alert(`Failed to update password: ${err.message}`);
    }
  };

  const handleDeleteUser = async (userId: number, username: string) => {
    if (!confirm(`Are you sure you want to delete the account for ${username}?`)) return;
    try {
      await ApiService.deleteUser(userId);
      if (editingBranch) {
        await fetchBranchUsers(editingBranch.name);
      }
      alert("User account deleted.");
    } catch (err: any) {
      alert(`Failed to delete user: ${err.message}`);
    }
  };

  const handleUpdateBranchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBranch || !branchFormName.trim()) return;
    try {
      const taxRate = parseFloat(branchFormTax) / 100;
      const savedBranch = await ApiService.updateBranch(editingBranch.name, {
        name: branchFormName.trim(),
        tax_rate: isNaN(taxRate) ? 0.10 : taxRate,
        color_theme: branchFormColor
      });
      setIsBranchModalOpen(false);
      resetBranchForm();
      setBranches(prev => prev.map(b => b.name === editingBranch.name ? savedBranch : b));
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
      <div className="bg-stone-900 px-6 border-b border-stone-850 flex gap-4 shrink-0 text-white overflow-x-auto scrollbar-hide">
        {[
          { id: "dashboard", label: "📈 Dashboard Analytics" },
          { id: "transactions", label: "🧾 Transactions Detail" },
          { id: "branches", label: "🏬 Branch Settings" },
          { id: "menu", label: "🍳 Dish Menu Editor" },
          { id: "inventory", label: "📦 Inventory Management" }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id as any);
              setEditingMenuItem(null);
            }}
            className={`py-3.5 px-1 border-b-2 font-bold text-xs uppercase tracking-wider transition-all rounded-none whitespace-nowrap shrink-0 ${
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
              <div className="flex gap-2 text-xs font-mono items-center self-stretch sm:self-auto">
                <input 
                  type="date" 
                  value={analyticsStartDate} 
                  onChange={e => setAnalyticsStartDate(e.target.value)}
                  className="bg-stone-50 border border-stone-300 px-2 py-1.5 focus:outline-none focus:border-orange-600"
                />
                <span className="font-bold text-stone-400">to</span>
                <input 
                  type="date" 
                  value={analyticsEndDate} 
                  onChange={e => setAnalyticsEndDate(e.target.value)}
                  className="bg-stone-50 border border-stone-300 px-2 py-1.5 focus:outline-none focus:border-orange-600"
                />
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
                  <p className="text-[10px] text-stone-400 mt-1 font-mono uppercase tracking-wider">Based on custom timeline</p>
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
                    {Array.from(new Set(menuItems.map(item => item.category))).map(cat => (
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

        {/* TRANSACTIONS DETAIL VIEW */}
        {activeTab === "transactions" && (
          <div className="bg-white border-2 border-stone-900 rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] overflow-hidden">
            <div className="p-4 border-b-2 border-stone-900 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h4 className="font-black text-sm text-stone-900 uppercase tracking-wider flex items-center gap-2">
                  <History className="w-5 h-5 text-orange-600" /> Transactions Audit Log
                </h4>
                <p className="text-[10px] text-stone-500 font-mono uppercase mt-0.5">Historical orders and operational performance</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Search Name, ID, Status..." 
                    value={transactionsSearch}
                    onChange={e => setTransactionsSearch(e.target.value)}
                    className="w-full sm:w-48 pl-8 pr-3 py-1.5 bg-stone-50 border border-stone-300 text-xs font-mono focus:outline-none focus:border-orange-600"
                  />
                  <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2" />
                </div>
                <div className="flex gap-2 text-xs font-mono items-center">
                  <input 
                    type="date" 
                    value={transactionsStartDate} 
                    onChange={e => setTransactionsStartDate(e.target.value)}
                    className="bg-stone-50 border border-stone-300 px-2 py-1.5 focus:outline-none focus:border-orange-600"
                  />
                  <span className="font-bold text-stone-400">to</span>
                  <input 
                    type="date" 
                    value={transactionsEndDate} 
                    onChange={e => setTransactionsEndDate(e.target.value)}
                    className="bg-stone-50 border border-stone-300 px-2 py-1.5 focus:outline-none focus:border-orange-600"
                  />
                </div>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-stone-100 border-b-2 border-stone-900 text-stone-900 uppercase text-[10px] tracking-wider">
                    <th className="p-3 font-black whitespace-nowrap">Order Time</th>
                    <th className="p-3 font-black whitespace-nowrap">Order ID</th>
                    <th className="p-3 font-black whitespace-nowrap">Customer</th>
                    <th className="p-3 font-black whitespace-nowrap">Phone</th>
                    <th className="p-3 font-black whitespace-nowrap">Branch</th>
                    <th className="p-3 font-black whitespace-nowrap">Type</th>
                    <th className="p-3 font-black whitespace-nowrap">Table</th>
                    <th className="p-3 font-black whitespace-nowrap">Total</th>
                    <th className="p-3 font-black whitespace-nowrap">Status</th>
                    <th className="p-3 font-black text-right text-orange-700 whitespace-nowrap">Order ➜ Serve</th>
                    <th className="p-3 font-black text-right text-emerald-700 whitespace-nowrap">Serve ➜ Pay</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-150">
                  {isLoadingTransactions ? (
                    <tr><td colSpan={11} className="p-8 text-center text-stone-400 font-mono text-xs uppercase tracking-widest">Loading transactions...</td></tr>
                  ) : transactions.length === 0 ? (
                    <tr><td colSpan={11} className="p-8 text-center text-stone-400 font-mono text-xs uppercase tracking-widest">No transactions found for this date range.</td></tr>
                  ) : (
                    transactions
                      .filter(o => 
                        !transactionsSearch || 
                        o.customer_name?.toLowerCase().includes(transactionsSearch.toLowerCase()) || 
                        o.status.toLowerCase().includes(transactionsSearch.toLowerCase()) || 
                        (o.daily_order_number || o.id).toString() === transactionsSearch
                      )
                      .map(order => (
                      <tr 
                        key={order.id} 
                        onClick={() => setTransactionReceiptOrder(order)}
                        className="hover:bg-orange-50 transition-colors cursor-pointer group"
                      >
                        <td className="p-3 font-mono text-[10px] text-stone-600 whitespace-nowrap">{formatLocalTime(order.created_at)}</td>
                        <td className="p-3 font-mono font-bold text-stone-900 group-hover:text-orange-600">#{order.daily_order_number || order.id}</td>
                        <td className="p-3 font-bold text-[11px] uppercase tracking-wider">{order.customer_name || "-"}</td>
                        <td className="p-3 font-mono text-[10px] text-stone-500">{order.phone_number === "Online" ? "-" : (order.phone_number || "-")}</td>
                        <td className="p-3 text-[10px] font-bold uppercase tracking-wider">{order.branch_name}</td>
                        <td className="p-3 text-[10px] font-bold uppercase tracking-wider">{order.order_type}</td>
                        <td className="p-3 font-mono text-stone-600">{order.table_number || "-"}</td>
                        <td className="p-3 font-mono font-semibold text-emerald-700 whitespace-nowrap">
                          Rp {Math.max(0, order.total_amount - (order.discount_amount || 0)).toLocaleString("id-ID")}
                          {order.discount_amount && order.discount_amount > 0 && (
                            <div className="text-[9px] text-red-500 font-bold uppercase mt-0.5 px-1 bg-red-100 inline-block rounded-sm">
                              -{order.discount_amount.toLocaleString("id-ID")}
                            </div>
                          )}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                            order.status === "completed" ? "bg-emerald-100 text-emerald-800" :
                            order.status === "discounted" ? "bg-red-200 text-red-900 border border-red-300 shadow-sm" :
                            order.status === "on_table" ? "bg-blue-100 text-blue-800" :
                            order.status === "cooked" ? "bg-orange-100 text-orange-800" :
                            "bg-stone-100 text-stone-800"
                          }`}>{order.status === "on_table" ? "Served" : order.status}</span>
                        </td>
                        <td className="p-3 font-mono text-[11px] font-black text-right text-orange-600">
                          {formatDuration(order.created_at, order.served_at)}
                        </td>
                        <td className="p-3 font-mono text-[11px] font-black text-right text-emerald-600">
                          {formatDuration(order.served_at, order.paid_at)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 2. BRANCH CONFIGURATION VIEW */}
        {activeTab === "branches" && (
          <div className="bg-white border-2 border-stone-900 rounded-none p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.9)] text-stone-900 relative">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b-2 border-stone-900">
              <div className="flex items-center gap-3">
                <div className="bg-orange-100 p-2 border border-orange-300">
                  <Building className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-black text-xl uppercase tracking-widest text-stone-900">Branch Management</h3>
                  <p className="text-[10px] text-stone-500 font-mono uppercase mt-1">Configure physical branch locations</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  resetBranchForm();
                  setIsBranchModalOpen(true);
                }} 
                className="w-full sm:w-auto py-3 px-6 bg-orange-600 hover:bg-orange-500 text-white rounded-none font-bold text-xs uppercase tracking-widest transition-all shadow-md flex justify-center items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Create Branch
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {branches.map(b => (
                <div key={b.name} className="p-4 bg-stone-50 border-2 border-stone-200 flex flex-col justify-between hover:border-stone-900 transition-all group">
                  <div className="mb-4">
                    <p className="font-black text-lg text-stone-900 uppercase tracking-wider">{b.name}</p>
                    <p className="text-[10px] text-stone-500 font-mono uppercase mt-1">Theme: {b.color_theme}</p>
                  </div>
                  <div className="flex items-center justify-between border-t border-dashed border-stone-300 pt-3">
                    <div className="bg-orange-50 text-orange-700 border border-orange-200 px-3 py-1 rounded-none text-xs font-mono font-bold">
                      Tax: {Math.round(b.tax_rate * 100)}%
                    </div>
                    <button 
                      onClick={() => { handleEditBranchSelect(b); setIsBranchModalOpen(true); }} 
                      className="p-2 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-none transition-all shadow-sm flex items-center gap-1 text-[10px] font-bold uppercase"
                    >
                      <Edit className="w-3.5 h-3.5" /> Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. MENU DISH EDITOR VIEW */}
        {activeTab === "menu" && (
          <div className="space-y-4">
            <div className="bg-white border-2 border-stone-900 rounded-none p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] text-stone-900">
              <div className="flex justify-between items-center mb-4 border-b border-stone-200 pb-3 flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <h4 className="font-black text-sm text-stone-900 uppercase tracking-wider">Active branch menu catalog</h4>
                  <span className="text-[10px] text-stone-500 font-bold font-mono uppercase bg-stone-100 px-2 py-1">{menuItems.length} dishes synced</span>
                </div>
                <button 
                  onClick={() => {
                    resetMenuForm();
                    setIsMenuModalOpen(true);
                  }} 
                  className="py-2 px-4 bg-orange-600 hover:bg-orange-500 text-white rounded-none font-bold text-xs uppercase tracking-widest transition-all shadow-md flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Create New Menu Dish
                </button>
              </div>

              <div className="mb-6 relative">
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
                  <DndContext 
                    sensors={sensors} 
                    collisionDetection={closestCenter} 
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext 
                      items={menuItems.filter(item => item.name.toLowerCase().includes(menuSearchQuery.toLowerCase())).map(i => i.id)} 
                      strategy={verticalListSortingStrategy}
                    >
                      {menuItems.filter(item => item.name.toLowerCase().includes(menuSearchQuery.toLowerCase())).map(item => (
                        <SortableMenuItem 
                          key={item.id} 
                          item={item} 
                          onToggleAvailability={handleToggleMenuAvailability} 
                          onEdit={(i: any) => { handleEditMenuItemSelect(i); setIsMenuModalOpen(true); }}
                          onDelete={handleDeleteMenuItem}
                          branchColors={getBranchColorClasses(item.branch_name)}
                          FALLBACK_IMAGE_URL={FALLBACK_IMAGE_URL}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 5. INVENTORY VIEW */}
        {activeTab === "inventory" && (
          <div className="space-y-4">
            <div className="bg-white border-2 border-stone-900 rounded-none p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] text-stone-900">
              <div className="flex justify-between items-center mb-4 border-b border-stone-200 pb-3 flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <h4 className="font-black text-sm text-stone-900 uppercase tracking-wider">Active branch ingredients</h4>
                  <span className="text-[10px] text-stone-500 font-bold font-mono uppercase bg-stone-100 px-2 py-1">{ingredients.length} ingredients</span>
                </div>
                <button 
                  onClick={() => {
                    resetIngredientForm();
                    setIsIngredientModalOpen(true);
                  }} 
                  className="py-2 px-4 bg-orange-600 hover:bg-orange-500 text-white rounded-none font-bold text-xs uppercase tracking-widest transition-all shadow-md flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Create New Ingredient
                </button>
              </div>

              <div className="mb-6 relative">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-3.5" />
                <input type="text" placeholder="Filter ingredients by name..." value={ingredientSearchQuery} onChange={(e) => setIngredientSearchQuery(e.target.value)} className="w-full bg-stone-50 border border-stone-300 rounded-none pl-8 pr-16 py-2.5 text-xs text-stone-900 focus:outline-none focus:border-orange-600 font-mono" />
                {ingredientSearchQuery && (
                  <button type="button" onClick={() => setIngredientSearchQuery("")} className="absolute right-3 top-3 text-stone-400 hover:text-stone-900 text-[10px] font-bold uppercase tracking-wider font-mono cursor-pointer">CLEAR</button>
                )}
              </div>

              <div className="space-y-3">
                {ingredients.filter(item => item.name.toLowerCase().includes(ingredientSearchQuery.toLowerCase())).length === 0 ? (
                  <div className="p-8 text-center text-stone-400 font-mono text-xs uppercase border border-dashed border-stone-300">
                    No ingredients match filter.
                  </div>
                ) : (
                  <DndContext 
                    sensors={sensors} 
                    collisionDetection={closestCenter} 
                    onDragEnd={handleIngredientDragEnd}
                  >
                    <SortableContext 
                      items={ingredients.filter(item => item.name.toLowerCase().includes(ingredientSearchQuery.toLowerCase())).map(i => i.id)} 
                      strategy={verticalListSortingStrategy}
                    >
                      {ingredients.filter(item => item.name.toLowerCase().includes(ingredientSearchQuery.toLowerCase())).map(item => (
                        <SortableIngredientItem 
                          key={item.id} 
                          item={item}
                          onUpdateStock={(ing) => {
                            setAdjustStockIngredient(ing);
                            setAdjustStockAmount("");
                          }}
                          onEdit={(i: any) => { handleEditIngredientSelect(i); setIsIngredientModalOpen(true); }}
                          onDelete={async (id: number) => {
                            if (window.confirm("Are you sure you want to delete this ingredient?")) {
                              await ApiService.deleteIngredient(id);
                              setIngredients(prev => prev.filter(i => i.id !== id));
                            }
                          }}
                          branchColors={getBranchColorClasses(item.branch_name)}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Branch Editor Modal */}
      <Modal
        isOpen={isBranchModalOpen}
        onClose={() => { setIsBranchModalOpen(false); resetBranchForm(); }}
        backdropClassName="fixed inset-0 bg-stone-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        className="bg-white border-2 border-stone-900 w-full max-w-lg shadow-[8px_8px_0px_0px_rgba(0,0,0,0.9)] rounded-none flex flex-col max-h-[95vh]"
      >
        <div className="p-4 bg-stone-900 text-white flex justify-between items-center shrink-0">
          <h3 className="font-black text-sm uppercase flex items-center gap-2">
            <Building className="w-4 h-4 text-orange-500" />
            {editingBranch ? "Update Branch Details" : "Configure New Branch Outlet"}
          </h3>
          <button 
            onClick={() => { setIsBranchModalOpen(false); resetBranchForm(); }}
            className="text-stone-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto font-mono text-xs flex-1 text-stone-900">
          <form onSubmit={editingBranch ? handleUpdateBranchSubmit : handleAddBranch} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest font-mono mb-1">Branch Name</label>
              <input type="text" required placeholder="e.g. Gayung Sari" disabled={!!editingBranch} value={branchFormName} onChange={(e) => setBranchFormName(e.target.value)} className="w-full bg-stone-50 border border-stone-300 rounded-none px-4 py-3 text-stone-900 focus:outline-none focus:border-orange-600 text-xs font-mono disabled:opacity-50" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest font-mono mb-1">Tax rate (%)</label>
                <div className="relative">
                  <input type="number" required min="0" max="50" placeholder="e.g. 10" value={branchFormTax} onChange={(e) => setBranchFormTax(e.target.value)} className="w-full bg-stone-50 border border-stone-300 rounded-none pl-4 pr-10 py-3 text-stone-900 focus:outline-none focus:border-orange-600 text-xs font-mono" />
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
            </div>

            <div className="flex gap-2 pt-4 border-t border-stone-200">
              <button type="submit" className="flex-1 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-none font-bold text-xs uppercase tracking-widest transition-all shadow-md">{editingBranch ? "Save Details" : "Save and Sync Branch"}</button>
              <button type="button" onClick={() => { setIsBranchModalOpen(false); resetBranchForm(); }} className="px-6 py-3 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-none font-bold text-xs uppercase shadow-sm">Cancel</button>
            </div>
          </form>

          {editingBranch && (
            <div className="mt-8 pt-8 border-t-2 border-stone-800">
              <h4 className="font-black text-sm text-stone-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-orange-600" />
                Branch Staff Accounts
              </h4>
              
              {isLoadingUsers ? (
                <div className="text-center p-4 text-stone-500 font-mono text-xs uppercase">Loading accounts...</div>
              ) : (
                <div className="space-y-3 mb-6">
                  {branchUsers.length === 0 ? (
                    <div className="bg-stone-100 p-4 border border-stone-200 text-center text-[10px] uppercase font-mono text-stone-500">
                      No staff accounts configured for this branch.
                    </div>
                  ) : (
                    branchUsers.map(u => (
                      <div key={u.id} className="bg-stone-100 border border-stone-300 p-3 flex justify-between items-center group">
                        <div>
                          <div className="font-bold text-sm uppercase tracking-wide">{u.username}</div>
                          <div className="text-[10px] text-stone-500 font-mono uppercase bg-stone-200 px-1 inline-block mt-1">Role: {u.role}</div>
                        </div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleChangeUserPassword(u.id, u.username)} className="px-3 py-1.5 bg-stone-800 text-white text-[10px] font-bold uppercase hover:bg-stone-700">Password</button>
                          <button onClick={() => handleDeleteUser(u.id, u.username)} className="px-3 py-1.5 bg-red-600 text-white text-[10px] font-bold uppercase hover:bg-red-500"><X className="w-3 h-3" /></button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              <div className="bg-stone-50 border border-stone-200 p-4">
                <h5 className="font-bold text-xs uppercase tracking-widest text-stone-600 mb-3 border-b border-stone-200 pb-2">Add New Account</h5>
                <form onSubmit={handleAddUser} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest font-mono mb-1">Username</label>
                      <input type="text" required value={newUserUsername} onChange={e => setNewUserUsername(e.target.value)} className="w-full bg-white border border-stone-300 px-3 py-2 text-xs font-mono focus:border-orange-600 outline-none" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest font-mono mb-1">Password</label>
                      <input type="password" required value={newUserPassword} onChange={e => setNewUserPassword(e.target.value)} className="w-full bg-white border border-stone-300 px-3 py-2 text-xs font-mono focus:border-orange-600 outline-none" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest font-mono mb-1">Role</label>
                    <select value={newUserRole} onChange={e => setNewUserRole(e.target.value as any)} className="w-full bg-white border border-stone-300 px-3 py-2 text-xs font-mono font-bold focus:border-orange-600 outline-none">
                      <option value="cashier">Cashier</option>
                      <option value="employee">Employee (Kitchen)</option>
                    </select>
                  </div>
                  <button type="submit" disabled={!newUserUsername || !newUserPassword} className="w-full py-2 bg-stone-900 text-white font-bold text-[10px] uppercase tracking-widest hover:bg-stone-800 disabled:opacity-50">Create Account</button>
                </form>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Menu Editor Modal */}
      <Modal
        isOpen={isMenuModalOpen}
        onClose={() => { setIsMenuModalOpen(false); resetMenuForm(); }}
        backdropClassName="fixed inset-0 bg-stone-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        className="bg-white border-2 border-stone-900 w-full max-w-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,0.9)] rounded-none flex flex-col max-h-[95vh]"
      >
            <div className="p-4 bg-stone-900 text-white flex justify-between items-center shrink-0">
              <h3 className="font-black text-sm uppercase flex items-center gap-2">
                <ChefHat className="w-4 h-4 text-orange-500" />
                {editingMenuItem ? "Modify Menu Dish" : "Create New Menu Dish"}
              </h3>
              <button 
                onClick={() => { setIsMenuModalOpen(false); resetMenuForm(); }}
                className="text-stone-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto font-mono text-xs flex-1 text-stone-900">
              <form onSubmit={(e) => { handleMenuFormSubmit(e); setIsMenuModalOpen(false); }} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest font-mono mb-1">Dish Name</label>
                  <input type="text" required placeholder="e.g. Rawon Super Pedas" value={menuFormName} onChange={(e) => setMenuFormName(e.target.value)} className="w-full bg-stone-50 border border-stone-300 rounded-none px-3 py-2.5 text-stone-900 focus:outline-none focus:border-orange-600 text-xs font-mono" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest font-mono mb-1">Dine-In Price</label>
                    <input type="number" required placeholder="e.g. 45000" value={menuFormPrice} onChange={(e) => setMenuFormPrice(e.target.value)} className="w-full bg-stone-50 border border-stone-300 rounded-none px-3 py-2.5 text-stone-900 focus:outline-none focus:border-orange-600 text-xs font-mono" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest font-mono mb-1">GoFood Price</label>
                    <input type="number" placeholder="Optional" value={menuFormGoFood} onChange={(e) => setMenuFormGoFood(e.target.value)} className="w-full bg-stone-50 border border-stone-300 rounded-none px-3 py-2.5 text-stone-900 focus:outline-none focus:border-orange-600 text-xs font-mono" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest font-mono mb-1">GrabFood Price</label>
                    <input type="number" placeholder="Optional" value={menuFormGrabFood} onChange={(e) => setMenuFormGrabFood(e.target.value)} className="w-full bg-stone-50 border border-stone-300 rounded-none px-3 py-2.5 text-stone-900 focus:outline-none focus:border-orange-600 text-xs font-mono" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest font-mono mb-1">ShopeeFood Price</label>
                    <input type="number" placeholder="Optional" value={menuFormShopee} onChange={(e) => setMenuFormShopee(e.target.value)} className="w-full bg-stone-50 border border-stone-300 rounded-none px-3 py-2.5 text-stone-900 focus:outline-none focus:border-orange-600 text-xs font-mono" />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest font-mono mb-1">Category</label>
                    <select value={menuFormCategory} onChange={(e) => setMenuFormCategory(e.target.value)} className="w-full bg-stone-50 border border-stone-300 rounded-none px-3 py-2.5 text-stone-900 focus:outline-none focus:border-orange-600 text-xs cursor-pointer font-bold font-mono">
                      {Array.from(new Set(menuItems.map(item => item.category))).map(cat => (
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
                    <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest font-mono mb-1">Calculated Stock</label>
                    <input type="text" readOnly value={menuFormStock} className="w-full bg-stone-200 border border-stone-300 rounded-none px-3 py-2.5 text-stone-500 focus:outline-none text-xs font-mono cursor-not-allowed" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest font-mono mb-1">Cost (Rp)</label>
                    <input type="number" required min="0" value={menuFormCost} onChange={(e) => setMenuFormCost(e.target.value)} className="w-full bg-stone-50 border border-stone-300 rounded-none px-3 py-2.5 text-stone-900 focus:outline-none focus:border-orange-600 text-xs font-mono" />
                  </div>
                </div>

                <div className="border border-stone-300 bg-stone-50 p-4 rounded-none">
                  <div className="flex justify-between items-center mb-3">
                    <label className="block text-[10px] font-bold text-stone-900 uppercase tracking-widest font-mono">Bill of Materials (Ingredients)</label>
                    <button type="button" onClick={() => setMenuFormIngredients([...menuFormIngredients, { ingredient_id: ingredients[0]?.id || 0, required_qty: "1" }])} className="px-2 py-1 bg-stone-900 text-white text-[9px] font-bold uppercase tracking-wider flex items-center gap-1">
                      <Plus className="w-3 h-3" /> Add Ingredient
                    </button>
                  </div>
                  {menuFormIngredients.length === 0 ? (
                    <p className="text-[10px] text-stone-500 font-mono italic">No ingredients assigned. Stock will calculate as 0.</p>
                  ) : (
                    <div className="space-y-2">
                      {menuFormIngredients.map((mi, idx) => (
                        <div key={idx} className="flex gap-2 items-center">
                          <select value={mi.ingredient_id} onChange={(e) => {
                            const newIngs = [...menuFormIngredients];
                            newIngs[idx].ingredient_id = parseInt(e.target.value);
                            setMenuFormIngredients(newIngs);
                          }} className="flex-1 bg-white border border-stone-300 rounded-none px-2 py-1.5 text-stone-900 text-xs font-mono font-bold">
                            {ingredients.map(ing => (
                              <option key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</option>
                            ))}
                          </select>
                          <input type="number" step="0.01" min="0.01" value={mi.required_qty} onChange={(e) => {
                            const newIngs = [...menuFormIngredients];
                            newIngs[idx].required_qty = e.target.value;
                            setMenuFormIngredients(newIngs);
                          }} className="w-20 bg-white border border-stone-300 rounded-none px-2 py-1.5 text-stone-900 text-xs font-mono" placeholder="Qty" />
                          <button type="button" onClick={() => {
                            const newIngs = menuFormIngredients.filter((_, i) => i !== idx);
                            setMenuFormIngredients(newIngs);
                          }} className="p-1.5 bg-red-50 text-red-600 border border-red-200 hover:bg-red-100">
                            <Trash className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
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

                <div className="flex gap-2 pt-4 border-t border-stone-200">
                  <button type="submit" className="flex-1 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-none font-bold text-xs uppercase tracking-widest transition-all shadow-md">{editingMenuItem ? "Save changes" : "Deploy Dish"}</button>
                  <button type="button" onClick={() => { setIsMenuModalOpen(false); resetMenuForm(); }} className="px-6 py-3 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-none font-bold text-xs uppercase shadow-sm">Cancel</button>
                </div>
              </form>
            </div>
      </Modal>

      {/* Ingredient Editor Modal */}
      <Modal
        isOpen={isIngredientModalOpen}
        onClose={() => { setIsIngredientModalOpen(false); resetIngredientForm(); }}
        backdropClassName="fixed inset-0 bg-stone-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        className="bg-white border-2 border-stone-900 w-full max-w-lg shadow-[8px_8px_0px_0px_rgba(0,0,0,0.9)] rounded-none flex flex-col max-h-[90vh]"
      >
            <div className="p-4 bg-stone-900 text-white flex justify-between items-center shrink-0">
              <h3 className="font-black text-sm uppercase flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-orange-500" />
                {editingIngredient ? "Edit Ingredient Details" : "Configure New Ingredient"}
              </h3>
              <button onClick={() => { setIsIngredientModalOpen(false); resetIngredientForm(); }} className="text-stone-400 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto font-mono text-xs flex-1 text-stone-900">
              <form onSubmit={handleIngredientFormSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest font-mono mb-1">Ingredient Name</label>
                  <input type="text" required placeholder="e.g. Daging Rawon" value={ingredientFormName} onChange={(e) => setIngredientFormName(e.target.value)} className="w-full bg-stone-50 border border-stone-300 rounded-none px-3 py-2.5 text-stone-900 focus:outline-none focus:border-orange-600 text-xs font-mono" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest font-mono mb-1">Unit</label>
                    <input type="text" required placeholder="e.g. gr, pcs, portion" value={ingredientFormUnit} onChange={(e) => setIngredientFormUnit(e.target.value)} className="w-full bg-stone-50 border border-stone-300 rounded-none px-3 py-2.5 text-stone-900 focus:outline-none focus:border-orange-600 text-xs font-mono" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest font-mono mb-1">Initial Stock</label>
                    <input type="number" step="any" required value={ingredientFormStock} onChange={(e) => setIngredientFormStock(e.target.value)} className="w-full bg-stone-50 border border-stone-300 rounded-none px-3 py-2.5 text-stone-900 focus:outline-none focus:border-orange-600 text-xs font-mono" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest font-mono mb-1">Branch</label>
                  <select required value={ingredientFormBranch} onChange={(e) => setIngredientFormBranch(e.target.value)} className="w-full bg-stone-50 border border-stone-300 rounded-none px-3 py-2.5 text-stone-900 focus:outline-none focus:border-orange-600 text-xs font-mono font-bold cursor-pointer">
                    <option value="">Select branch...</option>
                    {branches.map(b => (
                      <option key={b.name} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2 pt-4 border-t border-stone-200">
                  <button type="submit" className="flex-1 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-none font-bold text-xs uppercase tracking-widest transition-all shadow-md">{editingIngredient ? "Save changes" : "Create Ingredient"}</button>
                  <button type="button" onClick={() => { setIsIngredientModalOpen(false); resetIngredientForm(); }} className="px-6 py-3 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-none font-bold text-xs uppercase shadow-sm">Cancel</button>
                </div>
              </form>
            </div>
      </Modal>
      {/* Transaction Receipt Modal */}
      <Modal
        isOpen={!!transactionReceiptOrder}
        onClose={() => setTransactionReceiptOrder(null)}
        backdropClassName="fixed inset-0 bg-stone-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        className="bg-white border-2 border-stone-900 w-full max-w-md shadow-[8px_8px_0px_0px_rgba(0,0,0,0.9)] rounded-none flex flex-col max-h-[90vh]"
      >
        {transactionReceiptOrder && (
          <>
            <div className="p-4 bg-stone-900 text-white flex justify-between items-center shrink-0">
              <h3 className="font-black text-sm uppercase flex items-center gap-2">
                <Receipt className="w-4 h-4 text-orange-500" />
                {["cooking", "cooked", "on_table"].includes(transactionReceiptOrder.status) ? "Kitchen Ticket" : "Final Cashier Receipt"}
              </h3>
              <button 
                onClick={() => setTransactionReceiptOrder(null)}
                className="text-stone-400 hover:text-white transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto font-mono text-xs flex-1 text-stone-900">
              {/* Common Header */}
              <div className="text-center mb-6">
                <h4 className="font-black text-lg uppercase tracking-widest border-b-2 border-stone-900 pb-2 mb-2">Rawon TM</h4>
                <p className="font-bold">Branch: {transactionReceiptOrder.branch_name}</p>
                <p>Order #{transactionReceiptOrder.daily_order_number || transactionReceiptOrder.id} • {formatLocalTime(transactionReceiptOrder.created_at)}</p>
                <p className="mt-2 bg-stone-100 p-1 border border-stone-300 font-bold uppercase">
                  {transactionReceiptOrder.order_type} {transactionReceiptOrder.order_type === "dine-in" && `- Table ${transactionReceiptOrder.table_number}`}
                </p>
                {transactionReceiptOrder.customer_name && (
                  <p className="mt-1 font-bold">Customer: {transactionReceiptOrder.customer_name}</p>
                )}
                {transactionReceiptOrder.phone_number && transactionReceiptOrder.phone_number !== "Online" && (
                  <p className="mt-1">Phone: {transactionReceiptOrder.phone_number}</p>
                )}
              </div>

              {/* Items Render */}
              <div className="border-t border-b border-dashed border-stone-400 py-4 mb-4">
                {transactionReceiptOrder.items.map((item, idx) => (
                  <div key={idx} className="mb-3 last:mb-0">
                    <div className="flex justify-between items-start font-bold uppercase">
                      <div className="flex-1 pr-4">
                        <span>{item.quantity}x {item.menu_item.name}</span>
                        {item.special_notes && (
                          <p className="text-[10px] text-stone-500 lowercase mt-0.5 ml-4">
                            ↳ note: {item.special_notes}
                          </p>
                        )}
                      </div>
                      {["completed", "discounted"].includes(transactionReceiptOrder.status) && (
                        <span className="shrink-0 text-right">
                          Rp {(item.menu_item.price_normal * item.quantity).toLocaleString("id-ID")}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals (Only for completed or discounted) */}
              {["completed", "discounted"].includes(transactionReceiptOrder.status) && (
                <div className="space-y-1">
                  <div className="flex justify-between text-stone-600">
                    <span>Subtotal</span>
                    <span>Rp {(transactionReceiptOrder.total_amount - transactionReceiptOrder.tax_amount).toLocaleString("id-ID")}</span>
                  </div>
                  <div className="flex justify-between text-stone-600 border-b border-stone-300 pb-2 mb-2">
                    <span>Tax</span>
                    <span>Rp {transactionReceiptOrder.tax_amount.toLocaleString("id-ID")}</span>
                  </div>
                  <div className="flex justify-between font-black text-sm uppercase">
                    <span>Total Amount</span>
                    <span>Rp {transactionReceiptOrder.total_amount.toLocaleString("id-ID")}</span>
                  </div>
                  {transactionReceiptOrder.discount_amount && transactionReceiptOrder.discount_amount > 0 && (
                    <div className="flex justify-between text-red-600 font-bold border-t border-red-200 pt-2 mt-2">
                      <div className="flex flex-col">
                        <span>Discount / Write-Off</span>
                        <span className="text-[9px] lowercase italic text-red-400">reason: {transactionReceiptOrder.discount_reason}</span>
                      </div>
                      <span>- Rp {transactionReceiptOrder.discount_amount.toLocaleString("id-ID")}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-black text-sm uppercase pt-2 border-t border-stone-800 mt-2">
                    <span>Final Paid</span>
                    <span>Rp {Math.max(0, transactionReceiptOrder.total_amount - (transactionReceiptOrder.discount_amount || 0)).toLocaleString("id-ID")}</span>
                  </div>
                  {transactionReceiptOrder.payment_method && (
                    <div className="flex justify-between font-bold text-[10px] uppercase mt-2">
                      <span>Paid Via</span>
                      <span className="bg-emerald-100 text-emerald-800 px-1 border border-emerald-300">{transactionReceiptOrder.payment_method}</span>
                    </div>
                  )}
                  {transactionReceiptOrder.paid_at && (
                    <div className="text-center text-[9px] text-stone-400 mt-6">
                      Paid at: {formatLocalTime(transactionReceiptOrder.paid_at)}
                    </div>
                  )}
                </div>
              )}

              {/* Danger Zone */}
              <div className="mt-8 border-t-2 border-red-200 pt-4">
                <button 
                  onClick={() => handleDeleteTransaction(transactionReceiptOrder.id)}
                  className="w-full py-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-colors"
                >
                  <Trash className="w-3.5 h-3.5" />
                  Delete Transaction
                </button>
              </div>
            </div>
          </>
        )}
      </Modal>

      {/* Stock Adjustment Modal */}
      <Modal
        isOpen={!!adjustStockIngredient}
        onClose={() => setAdjustStockIngredient(null)}
        backdropClassName="fixed inset-0 bg-stone-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        className="bg-white border-2 border-stone-900 w-full max-w-sm shadow-[8px_8px_0px_0px_rgba(0,0,0,0.9)] rounded-none flex flex-col"
      >
        {adjustStockIngredient && (
          <>
            <div className="p-4 bg-stone-900 text-white flex justify-between items-center shrink-0">
              <h3 className="font-black text-sm uppercase flex items-center gap-2">
                <ArrowUpDown className="w-4 h-4 text-orange-500" />
                Adjust Stock
              </h3>
              <button onClick={() => { setAdjustStockIngredient(null); setAdjustStockAmount(""); }} className="text-stone-400 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-6 text-stone-900 flex flex-col items-center">
              <h4 className="font-black text-lg text-center uppercase tracking-wider">{adjustStockIngredient.name}</h4>
              <p className="text-sm font-mono mt-1 mb-6 text-stone-500">
                Current Stock: <span className="font-bold text-orange-600 text-base">{adjustStockIngredient.stock_qty}</span> {adjustStockIngredient.unit}
              </p>
              
              <div className="w-full mb-6">
                <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest font-mono mb-2 text-left">Adjustment Amount</label>
                <input 
                  type="number" 
                  step="any"
                  value={adjustStockAmount} 
                  onChange={(e) => setAdjustStockAmount(e.target.value)} 
                  placeholder="e.g. 5"
                  className="w-full bg-stone-50 border-2 border-stone-300 rounded-none px-4 py-3 text-stone-900 focus:outline-none focus:border-stone-900 text-center font-bold text-lg font-mono"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-1 gap-2 w-full">
                <button 
                  onClick={() => handleStockAdjustment("add")}
                  disabled={!adjustStockAmount || isNaN(parseFloat(adjustStockAmount))}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-none font-bold text-xs uppercase tracking-widest transition-all shadow-md flex justify-center items-center gap-2 disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" /> Add to Stock
                </button>
                <button 
                  onClick={() => handleStockAdjustment("deduct")}
                  disabled={!adjustStockAmount || isNaN(parseFloat(adjustStockAmount))}
                  className="w-full py-3 bg-red-600 hover:bg-red-500 text-white rounded-none font-bold text-xs uppercase tracking-widest transition-all shadow-md flex justify-center items-center gap-2 disabled:opacity-50"
                >
                  <Minus className="w-4 h-4" /> Deduct from Stock
                </button>
                <button 
                  onClick={() => handleStockAdjustment("set")}
                  disabled={!adjustStockAmount || isNaN(parseFloat(adjustStockAmount))}
                  className="w-full py-3 bg-stone-800 hover:bg-stone-700 text-white rounded-none font-bold text-xs uppercase tracking-widest transition-all shadow-md flex justify-center items-center gap-2 disabled:opacity-50"
                >
                  <Equal className="w-4 h-4" /> Set Exact Stock
                </button>
              </div>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
