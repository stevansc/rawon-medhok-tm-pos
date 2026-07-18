from sqlalchemy import Column, Integer, String, Numeric, DateTime, ForeignKey, Boolean, Float, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class User(Base):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True)
    username = Column(String, unique=True, index=True)
    password_hash = Column(String)
    role = Column(String)  # 'admin', 'cashier', 'employee'
    branch_name = Column(String, ForeignKey('branches.name'), nullable=True)

class Branch(Base):
    __tablename__ = 'branches'

    name = Column(String, primary_key=True)
    tax_rate = Column(Float, default=0.0)  # e.g. 0.10 for 10%
    color_theme = Column(String, default='stone')  # e.g. 'teal', 'indigo', 'stone'

class MenuCategory(Base):
    __tablename__ = 'menu_categories'
    name = Column(String, primary_key=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Ingredient(Base):
    __tablename__ = 'ingredients'

    id = Column(Integer, primary_key=True, index=True)
    branch_name = Column(String, ForeignKey('branches.name'))
    name = Column(String)
    stock_qty = Column(Float, default=0.0)
    unit = Column(String, default="pcs")
    sort_order = Column(Integer, default=0)

class MenuItemIngredient(Base):
    __tablename__ = 'menu_item_ingredients'

    id = Column(Integer, primary_key=True, index=True)
    menu_item_id = Column(Integer, ForeignKey('menu_items.id'))
    ingredient_id = Column(Integer, ForeignKey('ingredients.id'))
    required_qty = Column(Float, default=1.0)

    ingredient = relationship("Ingredient")

class MenuItem(Base):
    __tablename__ = 'menu_items'

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    cost = Column(Numeric(10, 2))
    price_normal = Column(Numeric(10, 2))
    price_gofood = Column(Numeric(10, 2), nullable=True)
    price_grabfood = Column(Numeric(10, 2), nullable=True)
    price_shopee = Column(Numeric(10, 2), nullable=True)
    category = Column(String)
    description = Column(String, nullable=True)
    image_url = Column(String, nullable=True)
    is_available = Column(Boolean, default=True)
    branch_name = Column(String, ForeignKey('branches.name'))
    addons = Column(JSON, default=list)
    sort_order = Column(Integer, default=0)

    ingredients = relationship("MenuItemIngredient", cascade="all, delete-orphan")

class Order(Base):
    __tablename__ = 'orders'

    id = Column(Integer, primary_key=True)
    table_number = Column(Integer)
    customer_name = Column(String, nullable=True)
    phone_number = Column(String, nullable=True)
    order_type = Column(String)  # 'dine-in', 'takeaway'
    payment_method = Column(String, nullable=True)  # 'Cash', 'QRIS', 'Debit'
    status = Column(String, default='cooking')
    total_amount = Column(Numeric(10, 2), default=0.00)
    tax_amount = Column(Numeric(10, 2), default=0.00)
    branch_name = Column(String, ForeignKey('branches.name'))
    created_at = Column(DateTime, default=datetime.utcnow)
    cooked_at = Column(DateTime, nullable=True)
    served_at = Column(DateTime, nullable=True)
    paid_at = Column(DateTime, nullable=True)
    daily_order_number = Column(Integer, nullable=True)
    discount_amount = Column(Float, default=0.0)
    discount_reason = Column(String, nullable=True)

    items = relationship("OrderItem", back_populates="order")

class OrderItem(Base):
    __tablename__ = 'order_items'

    id = Column(Integer, primary_key=True)
    order_id = Column(Integer, ForeignKey('orders.id'))
    menu_item_id = Column(Integer, ForeignKey('menu_items.id'))
    quantity = Column(Integer, default=1)
    special_notes = Column(String, nullable=True)
    status = Column(String, default='cooking')  # cooking, declined

    order = relationship("Order", back_populates="items")
    menu_item = relationship("MenuItem")

class Promotion(Base):
    __tablename__ = 'promotions'

    id = Column(Integer, primary_key=True)
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    image_url = Column(String, nullable=True)
    branch_name = Column(String, ForeignKey('branches.name'), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
