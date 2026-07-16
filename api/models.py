from sqlalchemy import Column, Integer, String, Numeric, DateTime, ForeignKey, Boolean, Float, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class User(Base):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True)
    username = Column(String, unique=True, index=True)
    password_hash = Column(String)
    role = Column(String)  # 'admin', 'cashier', 'kitchen'

class Branch(Base):
    __tablename__ = 'branches'

    name = Column(String, primary_key=True)
    tax_rate = Column(Float, default=0.0) # e.g. 0.10 for 10%

class MenuCategory(Base):
    __tablename__ = 'menu_categories'
    name = Column(String, primary_key=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class MenuItem(Base):
    __tablename__ = 'menu_items'

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    cost = Column(Numeric(10, 2))  
    price = Column(Numeric(10, 2)) 
    stock_count = Column(Integer, default=0)
    category = Column(String)      
    description = Column(String, nullable=True)
    image_url = Column(String, nullable=True)
    is_available = Column(Boolean, default=True)
    branch_name = Column(String, ForeignKey('branches.name'))
    addons = Column(JSON, default=list)

class Order(Base):
    __tablename__ = 'orders'

    id = Column(Integer, primary_key=True)
    table_number = Column(Integer)
    customer_name = Column(String, nullable=True)
    phone_number = Column(String, nullable=True)
    order_type = Column(String) # 'dine-in', 'takeaway'
    payment_method = Column(String, nullable=True) # 'Cash', 'QRIS', 'Debit', etc.
    status = Column(String, default='pending') 
    total_amount = Column(Numeric(10, 2), default=0.00)
    tax_amount = Column(Numeric(10, 2), default=0.00)
    branch_name = Column(String, ForeignKey('branches.name'))
    created_at = Column(DateTime, default=datetime.utcnow)

    items = relationship("OrderItem", back_populates="order")

class OrderItem(Base):
    __tablename__ = 'order_items'

    id = Column(Integer, primary_key=True)
    order_id = Column(Integer, ForeignKey('orders.id'))
    menu_item_id = Column(Integer, ForeignKey('menu_items.id'))
    quantity = Column(Integer, default=1)
    special_notes = Column(String, nullable=True)
    status = Column(String, default='pending') # pending, declined

    order = relationship("Order", back_populates="items")
    menu_item = relationship("MenuItem")
