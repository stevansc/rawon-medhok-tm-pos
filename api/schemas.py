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

class MenuItemBase(BaseModel):
    name: str
    price: float
    cost: float
    stock_count: int
    category: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    is_available: bool = True
    branch_name: str
    addons: List[str] = Field(default_factory=list)

class MenuItemCreate(MenuItemBase):
    pass

class MenuItemResponse(MenuItemBase):
    id: int
    model_config = {"from_attributes": True}

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
    items: List[OrderItemResponse]

    model_config = {"from_attributes": True}

class OrderStatusUpdate(BaseModel):
    status: str
    payment_method: Optional[str] = None

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
