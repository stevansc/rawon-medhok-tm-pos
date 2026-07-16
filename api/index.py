import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from datetime import datetime, timedelta
import os

from database import engine, get_db
import models
import schemas
import auth




app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/")
def read_root():
    return {"message": "Welcome to Rawon TM POS API. Go to /docs for documentation."}

# --- AUTH & USERS ---
# Triggering uvicorn reload
@app.post("/api/token", response_model=schemas.Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/api/users/", response_model=schemas.UserResponse)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    hashed_password = auth.get_password_hash(user.password)
    new_user = models.User(username=user.username, password_hash=hashed_password, role=user.role)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

# --- BRANCHES ---
@app.post("/api/branches/", response_model=schemas.BranchResponse)
def create_branch(branch: schemas.BranchBase, db: Session = Depends(get_db), current_user: models.User = Depends(auth.require_role(["admin"]))):
    db_branch = models.Branch(**branch.model_dump())
    db.add(db_branch)
    db.commit()
    db.refresh(db_branch)
    return db_branch

@app.get("/api/branches/", response_model=List[schemas.BranchResponse])
def get_branches(db: Session = Depends(get_db)):
    return db.query(models.Branch).all()

# --- CATEGORIES ---
@app.get("/api/categories", response_model=List[schemas.MenuCategoryResponse])
def get_categories(db: Session = Depends(get_db)):
    return db.query(models.MenuCategory).all()

@app.post("/api/categories", response_model=List[str])
def create_category(category: schemas.MenuCategoryBase, db: Session = Depends(get_db), current_user: models.User = Depends(auth.require_role(["admin"]))):
    db_cat = db.query(models.MenuCategory).filter(models.MenuCategory.name == category.name).first()
    if not db_cat:
        new_cat = models.MenuCategory(name=category.name)
        db.add(new_cat)
        db.commit()
    all_cats = db.query(models.MenuCategory).all()
    return [c.name for c in all_cats]

# --- MENU ---
@app.get("/api/menu/", response_model=List[schemas.MenuItemResponse])
def get_menu(
    branch_name: Optional[str] = None, 
    category: Optional[str] = None, 
    search: Optional[str] = None, 
    db: Session = Depends(get_db)
):
    query = db.query(models.MenuItem)
    if branch_name:
        query = query.filter(models.MenuItem.branch_name == branch_name)
    if category:
        query = query.filter(models.MenuItem.category == category)
    if search:
        query = query.filter(models.MenuItem.name.ilike(f"%{search}%"))
    return query.all()

@app.post("/api/menu/", response_model=schemas.MenuItemResponse)
def create_menu_item(item: schemas.MenuItemCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.require_role(["admin"]))):
    db_item = models.MenuItem(**item.model_dump())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@app.put("/api/menu/{item_id}", response_model=schemas.MenuItemResponse)
def update_menu_item(item_id: int, item: schemas.MenuItemCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.require_role(["admin"]))):
    db_item = db.query(models.MenuItem).filter(models.MenuItem.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Menu item not found")
    
    for key, value in item.model_dump().items():
        setattr(db_item, key, value)
        
    db.commit()
    db.refresh(db_item)
    return db_item

@app.delete("/api/menu/{item_id}")
def delete_menu_item(item_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.require_role(["admin"]))):
    db_item = db.query(models.MenuItem).filter(models.MenuItem.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Menu item not found")
    db.delete(db_item)
    db.commit()
    return {"message": "Deleted"}

# --- ORDERS ---
@app.post("/api/orders/", response_model=schemas.OrderResponse)
def create_order(order: schemas.OrderCreate, db: Session = Depends(get_db)):
    branch = db.query(models.Branch).filter(models.Branch.name == order.branch_name).first()
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")

    db_order = models.Order(
        table_number=order.table_number,
        customer_name=order.customer_name,
        phone_number=order.phone_number,
        order_type=order.order_type,
        branch_name=order.branch_name
    )
    
    total_price = 0
    item_ids = [item.menu_item_id for item in order.items]
    menu_items = db.query(models.MenuItem).filter(models.MenuItem.id.in_(item_ids)).all()
    menu_items_map = {mi.id: mi for mi in menu_items}
    
    for item in order.items:
        menu_item = menu_items_map.get(item.menu_item_id)
        if not menu_item:
            raise HTTPException(status_code=404, detail=f"Menu item {item.menu_item_id} not found")
        if menu_item.branch_name != order.branch_name:
            raise HTTPException(status_code=400, detail=f"Item {item.menu_item_id} is not available in {order.branch_name}")
        if menu_item.stock_count < item.quantity:
            raise HTTPException(status_code=400, detail=f"Not enough stock for item {menu_item.name}")
            
        total_price += float(menu_item.price) * item.quantity
        menu_item.stock_count -= item.quantity
        
        order_item = models.OrderItem(
            menu_item_id=item.menu_item_id,
            quantity=item.quantity,
            special_notes=item.special_notes
        )
        db_order.items.append(order_item)
        
    tax_amount = float(total_price) * float(branch.tax_rate)
    db_order.tax_amount = tax_amount
    db_order.total_amount = float(total_price) + tax_amount
    
    db.add(db_order)
    db.commit()
    db.refresh(db_order)
    return db_order

@app.get("/api/orders/", response_model=List[schemas.OrderResponse])
def get_orders(
    branch_name: Optional[str] = None, 
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role(["admin", "cashier", "kitchen"]))
):
    # Use eager loading to prevent N+1 query problem when serializing items
    query = db.query(models.Order).options(
        joinedload(models.Order.items).joinedload(models.OrderItem.menu_item)
    )
    if branch_name:
        query = query.filter(models.Order.branch_name == branch_name)
    if status:
        query = query.filter(models.Order.status == status)
        
    return query.all()

@app.post("/api/orders/{order_id}/items/{item_id}/decline")
def decline_order_item(order_id: int, item_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.require_role(["admin", "kitchen"]))):
    order_item = db.query(models.OrderItem).filter(
        models.OrderItem.order_id == order_id, 
        models.OrderItem.id == item_id
    ).first()
    
    if not order_item:
        raise HTTPException(status_code=404, detail="Ordered item not found")
        
    if order_item.status == "declined":
        raise HTTPException(status_code=400, detail="Item already declined")
        
    order_item.status = "declined"
    
    dish = db.query(models.MenuItem).filter(models.MenuItem.id == order_item.menu_item_id).first()
    if dish:
        dish.stock_count += order_item.quantity
        dish.is_available = True 
        
    db.commit()
    return {"status": "success", "restored_stock": dish.stock_count if dish else 0}

@app.patch("/orders/{order_id}/status", response_model=schemas.OrderResponse)
def update_order_status(
    order_id: int, 
    status_update: schemas.OrderStatusUpdate, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role(["admin", "cashier", "kitchen"]))
):
    db_order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not db_order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    db_order.status = status_update.status
    if status_update.payment_method:
        db_order.payment_method = status_update.payment_method
        
    db.commit()
    db.refresh(db_order)
    return db_order

# --- ADMIN DASHBOARD ---
@app.get("/api/admin/dish-performance", response_model=List[schemas.DishPerformanceResponse])
def get_dish_performance(branch_name: Optional[str] = None, db: Session = Depends(get_db), current_user: models.User = Depends(auth.require_role(["admin"]))):
    from sqlalchemy import text
    query = """
        SELECT 
            m.id,
            m.name,
            m.category,
            m.branch_name,
            COALESCE(m.price, 0) as price,
            COALESCE(m.cost, 0) as cost,
            m.stock_count as stock,
            COALESCE(SUM(oi.quantity), 0) as sold_count,
            COALESCE(SUM(oi.quantity * m.price), 0) as revenue,
            COALESCE(SUM(oi.quantity * COALESCE(m.cost, m.price * 0.5)), 0) as cost_of_sales,
            (COALESCE(SUM(oi.quantity * m.price), 0) - COALESCE(SUM(oi.quantity * COALESCE(m.cost, m.price * 0.5)), 0)) as profit
        FROM menu_items m
        LEFT JOIN order_items oi ON oi.menu_item_id = m.id
        LEFT JOIN orders o ON o.id = oi.order_id AND o.status = 'completed'
        WHERE (:branch_name IS NULL OR m.branch_name = :branch_name)
        GROUP BY m.id
    """
    results = db.execute(text(query), {"branch_name": branch_name}).fetchall()
    
    performance_data = []
    for r in results:
        margin_percent = round((float(r.profit) / float(r.revenue)) * 100) if float(r.revenue) > 0 else 0
        performance_data.append({
            "id": r.id,
            "name": r.name,
            "category": r.category,
            "branch_name": r.branch_name,
            "price": float(r.price),
            "cost": float(r.cost),
            "stock": r.stock,
            "soldCount": r.sold_count,
            "revenue": float(r.revenue),
            "costOfSales": float(r.cost_of_sales),
            "profit": float(r.profit),
            "marginPercent": margin_percent,
            "topAddon": "-"
        })
    return performance_data

@app.get("/api/dashboard/", response_model=schemas.DashboardResponse)
def get_dashboard(
    branch_name: Optional[str] = None, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role(["admin"]))
):
    # 1. Calculate revenue and order count entirely in PostgreSQL
    base_query = db.query(
        func.count(func.distinct(models.Order.id)).label('order_count'),
        func.sum(models.Order.total_amount).label('total_revenue')
    ).filter(models.Order.status == "completed")
    
    if branch_name:
        base_query = base_query.filter(models.Order.branch_name == branch_name)
        
    result = base_query.first()
    order_count = result.order_count or 0
    total_revenue = float(result.total_revenue or 0)
    
    # 2. Calculate profit using a direct SQL JOIN to avoid downloading thousands of rows
    profit_query = db.query(
        func.sum((models.MenuItem.price - models.MenuItem.cost) * models.OrderItem.quantity).label('total_profit')
    ).select_from(models.Order)\
     .join(models.OrderItem, models.Order.id == models.OrderItem.order_id)\
     .join(models.MenuItem, models.OrderItem.menu_item_id == models.MenuItem.id)\
     .filter(models.Order.status == "completed")
     
    if branch_name:
        profit_query = profit_query.filter(models.Order.branch_name == branch_name)
        
    profit_result = profit_query.first()
    total_profit = float(profit_result.total_profit or 0)

    return {
        "branch_name": branch_name,
        "total_revenue": total_revenue,
        "total_profit": total_profit,
        "order_count": order_count
    }
