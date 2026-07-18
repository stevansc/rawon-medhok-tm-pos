from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime

class Token(BaseModel):
    access_token: str
    token_type: str

class UserBase(BaseModel):
    username: str
    role: str

class UserCreate(UserBase):
    password: str
    branch_name: Optional[str] = None

class UserResponse(UserBase):
    id: int
    branch_name: Optional[str] = None
    model_config = {"from_attributes": True}

class BranchBase(BaseModel):
    name: str
    tax_rate: float
    color_theme: str = "stone"

class BranchResponse(BranchBase):
    model_config = {"from_attributes": True}

class MenuCategoryBase(BaseModel):
    name: str

class MenuCategoryResponse(MenuCategoryBase):
    created_at: datetime
    model_config = {"from_attributes": True}

class IngredientBase(BaseModel):
    name: str
    stock_qty: float
    unit: str
    branch_name: str
    sort_order: Optional[int] = 0

class IngredientReorderItem(BaseModel):
    id: int
    sort_order: int

class IngredientCreate(IngredientBase):
    pass

class IngredientUpdate(BaseModel):
    name: Optional[str] = None
    stock_qty: Optional[float] = None
    unit: Optional[str] = None
    branch_name: Optional[str] = None

class IngredientResponse(IngredientBase):
    id: int
    model_config = {"from_attributes": True}

class MenuItemIngredientCreate(BaseModel):
    ingredient_id: int
    required_qty: float

class MenuItemIngredientResponse(BaseModel):
    id: int
    ingredient_id: int
    required_qty: float
    ingredient: IngredientResponse
    model_config = {"from_attributes": True}

class MenuItemBase(BaseModel):
    name: str
    price_normal: float
    price_gofood: Optional[float] = None
    price_grabfood: Optional[float] = None
    price_shopee: Optional[float] = None
    cost: float
    category: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    is_available: bool = True
    branch_name: str
    addons: List[str] = Field(default_factory=list)
    sort_order: Optional[int] = 0

class MenuItemCreate(MenuItemBase):
    ingredients: List[MenuItemIngredientCreate] = []

class MenuItemResponse(MenuItemBase):
    id: int
    stock_count: int = 0
    ingredients: List[MenuItemIngredientResponse] = []
    model_config = {"from_attributes": True}

class MenuItemReorderItem(BaseModel):
    id: int
    sort_order: int

class MenuItemReorderRequest(BaseModel):
    items: List[MenuItemReorderItem]

class OrderItemCreate(BaseModel):
    menu_item_id: int
    quantity: int
    special_notes: Optional[str] = None

class OrderCreate(BaseModel):
    table_number: int
    customer_name: Optional[str] = None
    phone_number: Optional[str] = None
    order_type: str
    branch_name: str
    items: List[OrderItemCreate]

class OrderItemResponse(BaseModel):
    id: int
    menu_item_id: int
    quantity: int
    special_notes: Optional[str]
    status: str
    menu_item: MenuItemResponse

    model_config = {"from_attributes": True}

class OrderResponse(BaseModel):
    id: int
    table_number: int
    customer_name: Optional[str]
    phone_number: Optional[str]
    order_type: str
    payment_method: Optional[str]
    status: str
    total_amount: float
    tax_amount: float
    branch_name: str
    created_at: datetime
    cooked_at: Optional[datetime] = None
    served_at: Optional[datetime] = None
    paid_at: Optional[datetime] = None
    daily_order_number: Optional[int] = None
    discount_amount: float = 0.0
    discount_reason: Optional[str] = None
    items: List[OrderItemResponse]

    model_config = {"from_attributes": True}

class OrderStatusUpdate(BaseModel):
    status: str
    payment_method: Optional[str] = None
    discount_amount: Optional[float] = None
    discount_reason: Optional[str] = None

class DashboardResponse(BaseModel):
    branch_name: Optional[str] = None
    total_revenue: float
    total_profit: float
    order_count: int

class DishPerformanceResponse(BaseModel):
    id: int
    name: str
    category: str
    branch_name: str
    price: float
    cost: float
    stock: int
    soldCount: int
    revenue: float
    costOfSales: float
    profit: float
    marginPercent: int
    topAddon: str

class PromotionBase(BaseModel):
    title: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    branch_name: Optional[str] = None
    is_active: bool = True

class PromotionCreate(PromotionBase):
    pass

class PromotionResponse(PromotionBase):
    id: int
    created_at: datetime
    model_config = {"from_attributes": True}
