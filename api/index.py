import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, Query, status, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, cast, Date
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv(override=True)

from database import engine, get_db
import models
import schemas
import auth

app = FastAPI()

# CORS: Read allowed origins from env, default to * for dev
allowed_origins = os.getenv("CORS_ORIGINS", "*").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/")
def read_root():
    return {"message": "Welcome to Rawon TM POS API. Go to /docs for documentation."}

# --- AUTH & USERS ---
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

@app.get("/api/users/me", response_model=schemas.UserResponse)
def get_current_user_profile(current_user: models.User = Depends(auth.get_current_user)):
    """Returns the authenticated user's real profile (role, branch, id) from the database."""
    return current_user

@app.post("/api/users/", response_model=schemas.UserResponse)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    hashed_password = auth.get_password_hash(user.password)
    new_user = models.User(
        username=user.username,
        password_hash=hashed_password,
        role=user.role,
        branch_name=user.branch_name
    )
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
def get_branches(response: Response, db: Session = Depends(get_db)):
    response.headers["Cache-Control"] = "public, max-age=60, s-maxage=60, stale-while-revalidate=86400"
    return db.query(models.Branch).all()

@app.put("/api/branches/{branch_name}", response_model=schemas.BranchResponse)
def update_branch(branch_name: str, branch: schemas.BranchBase, db: Session = Depends(get_db), current_user: models.User = Depends(auth.require_role(["admin"]))):
    db_branch = db.query(models.Branch).filter(models.Branch.name == branch_name).first()
    if not db_branch:
        raise HTTPException(status_code=404, detail="Branch not found")

    db_branch.tax_rate = branch.tax_rate
    db_branch.color_theme = branch.color_theme

    if branch.name != branch_name:
        db_branch.name = branch.name

    db.commit()
    db.refresh(db_branch)
    return db_branch

# --- CATEGORIES ---
@app.get("/api/categories", response_model=List[schemas.MenuCategoryResponse])
def get_categories(response: Response, db: Session = Depends(get_db)):
    response.headers["Cache-Control"] = "public, max-age=60, s-maxage=60, stale-while-revalidate=86400"
    return db.query(models.MenuCategory).all()

@app.post("/api/categories", response_model=List[str])
def create_category(category: schemas.MenuCategoryBase, db: Session = Depends(get_db), current_user: models.User = Depends(auth.require_role(["admin"]))):
    # Single check-and-insert, then return all names
    existing = db.query(models.MenuCategory.name).filter(models.MenuCategory.name == category.name).first()
    if not existing:
        db.add(models.MenuCategory(name=category.name))
        db.commit()
    # Selective query: only fetch names, not full objects
    return [name for (name,) in db.query(models.MenuCategory.name).all()]

# --- MENU ---
@app.get("/api/menu/", response_model=List[schemas.MenuItemResponse])
def get_menu(
    response: Response,
    branch_name: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    query = db.query(models.MenuItem).options(
        joinedload(models.MenuItem.ingredients).joinedload(models.MenuItemIngredient.ingredient)
    ).filter(models.MenuItem.category != "Deleted")
    if branch_name:
        query = query.filter(models.MenuItem.branch_name == branch_name)
    if category:
        query = query.filter(models.MenuItem.category == category)
    if search:
        query = query.filter(models.MenuItem.name.ilike(f"%{search}%"))
        
    menu_items = query.order_by(models.MenuItem.sort_order.asc()).all()
    for item in menu_items:
        valid_ingredients = [m for m in item.ingredients if m.required_qty > 0]
        if not valid_ingredients:
            item.stock_count = None
        else:
            item.stock_count = int(min(
                (mapping.ingredient.stock_qty // mapping.required_qty)
                for mapping in valid_ingredients
            ))
            
    return menu_items

@app.post("/api/menu/", response_model=schemas.MenuItemResponse)
def create_menu_item(item: schemas.MenuItemCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.require_role(["admin"]))):
    min_sort = db.query(func.min(models.MenuItem.sort_order)).filter(models.MenuItem.branch_name == item.branch_name).scalar()
    new_sort_order = (min_sort if min_sort is not None else 0) - 1

    item_data = item.model_dump(exclude={'ingredients'})
    db_item = models.MenuItem(**item_data)
    db_item.sort_order = new_sort_order
    db.add(db_item)
    db.flush()
    
    for ing_data in item.ingredients:
        db.add(models.MenuItemIngredient(
            menu_item_id=db_item.id,
            ingredient_id=ing_data.ingredient_id,
            required_qty=ing_data.required_qty
        ))

    db.commit()
    db.refresh(db_item)
    
    db_item.stock_count = 0 if not db_item.ingredients else int(min(
        (mapping.ingredient.stock_qty // mapping.required_qty)
        for mapping in db_item.ingredients if mapping.required_qty > 0
    ))
    return db_item

@app.put("/api/menu/{item_id}", response_model=schemas.MenuItemResponse)
def update_menu_item(item_id: int, item: schemas.MenuItemCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.require_role(["admin"]))):
    db_item = db.query(models.MenuItem).filter(models.MenuItem.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Menu item not found")

    item_data = item.model_dump(exclude={'ingredients'})
    for key, value in item_data.items():
        if key == 'sort_order':
            continue # Preserve sort_order on update
        setattr(db_item, key, value)

    # Update ingredients
    db.query(models.MenuItemIngredient).filter(models.MenuItemIngredient.menu_item_id == item_id).delete()
    for ing_data in item.ingredients:
        db.add(models.MenuItemIngredient(
            menu_item_id=item_id,
            ingredient_id=ing_data.ingredient_id,
            required_qty=ing_data.required_qty
        ))

    db.commit()
    db.refresh(db_item)
    
    db_item.stock_count = 0 if not db_item.ingredients else int(min(
        (mapping.ingredient.stock_qty // mapping.required_qty)
        for mapping in db_item.ingredients if mapping.required_qty > 0
    ))
    return db_item

@app.put("/api/admin/menu/reorder")
def reorder_menu_items(request: schemas.MenuItemReorderRequest, db: Session = Depends(get_db), current_user: models.User = Depends(auth.require_role(["admin"]))):
    for item in request.items:
        db.query(models.MenuItem).filter(models.MenuItem.id == item.id).update({"sort_order": item.sort_order})
    db.commit()
    return {"message": "Reordered successfully"}

@app.delete("/api/menu/{item_id}")
def delete_menu_item(item_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.require_role(["admin"]))):
    db_item = db.query(models.MenuItem).filter(models.MenuItem.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Menu item not found")
    db_item.category = "Deleted"
    db_item.is_available = False
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

    # Batch-fetch all menu items in a single query (avoids N+1)
    total_price = 0
    item_ids = [item.menu_item_id for item in order.items]
    menu_items = db.query(models.MenuItem).options(
        joinedload(models.MenuItem.ingredients).joinedload(models.MenuItemIngredient.ingredient)
    ).filter(models.MenuItem.id.in_(item_ids)).all()
    menu_items_map = {mi.id: mi for mi in menu_items}

    for item in order.items:
        menu_item = menu_items_map.get(item.menu_item_id)
        if not menu_item:
            raise HTTPException(status_code=404, detail=f"Menu item {item.menu_item_id} not found")
        if menu_item.branch_name != order.branch_name:
            raise HTTPException(status_code=400, detail=f"Item {item.menu_item_id} is not available in {order.branch_name}")

        for mapping in menu_item.ingredients:
            req_qty = mapping.required_qty * item.quantity
            if mapping.ingredient.stock_qty < req_qty:
                raise HTTPException(status_code=400, detail=f"Not enough stock for item {menu_item.name} (Short on {mapping.ingredient.name})")
            mapping.ingredient.stock_qty -= req_qty

        o_type = order.order_type.lower()
        if o_type == 'gofood':
            item_price = menu_item.price_gofood if menu_item.price_gofood is not None else menu_item.price_normal
        elif o_type == 'grabfood':
            item_price = menu_item.price_grabfood if menu_item.price_grabfood is not None else menu_item.price_normal
        elif o_type == 'shopeefood':
            item_price = menu_item.price_shopee if menu_item.price_shopee is not None else menu_item.price_normal
        else:
            item_price = menu_item.price_normal

        total_price += float(item_price) * item.quantity

        order_item = models.OrderItem(
            menu_item_id=item.menu_item_id,
            quantity=item.quantity,
            special_notes=item.special_notes
        )
        db_order.items.append(order_item)

    tax_amount = float(total_price) * float(branch.tax_rate)
    db_order.tax_amount = tax_amount
    db_order.total_amount = float(total_price) + tax_amount
    
    from datetime import timezone, timedelta
    jkt_tz = timezone(timedelta(hours=7))
    now_jkt = datetime.now(jkt_tz)
    start_of_today = now_jkt.replace(hour=0, minute=0, second=0, microsecond=0)
    end_of_today = start_of_today + timedelta(days=1)
    start_utc = start_of_today.astimezone(timezone.utc).replace(tzinfo=None)
    end_utc = end_of_today.astimezone(timezone.utc).replace(tzinfo=None)

    max_daily = db.query(func.max(models.Order.daily_order_number)).filter(
        models.Order.branch_name == order.branch_name,
        models.Order.created_at >= start_utc,
        models.Order.created_at < end_utc
    ).scalar()
    
    db_order.daily_order_number = (max_daily + 1) if max_daily else 31

    db.add(db_order)
    db.commit()

    # Re-query with eager loading to avoid N+1 on serialization
    db_order = db.query(models.Order).options(
        joinedload(models.Order.items).joinedload(models.OrderItem.menu_item)
    ).filter(models.Order.id == db_order.id).first()

    return db_order

@app.get("/api/orders/", response_model=List[schemas.OrderResponse])
def get_orders(
    branch_name: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role(["admin", "cashier", "employee"]))
):
    query = db.query(models.Order).options(
        joinedload(models.Order.items).joinedload(models.OrderItem.menu_item)
    )
    if branch_name:
        query = query.filter(models.Order.branch_name == branch_name)
    if status:
        query = query.filter(models.Order.status == status)

    return query.all()

@app.post("/api/orders/{order_id}/items/{item_id}/decline")
def decline_order_item(order_id: int, item_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.require_role(["admin", "employee"]))):
    # Single query with eager-loaded menu_item and ingredients
    order_item = db.query(models.OrderItem).options(
        joinedload(models.OrderItem.menu_item).joinedload(models.MenuItem.ingredients).joinedload(models.MenuItemIngredient.ingredient)
    ).filter(
        models.OrderItem.order_id == order_id,
        models.OrderItem.id == item_id
    ).first()

    if not order_item:
        raise HTTPException(status_code=404, detail="Ordered item not found")

    if order_item.status == "declined":
        raise HTTPException(status_code=400, detail="Item already declined")

    order_item.status = "declined"

    # Restore stock via already-loaded relationship
    if order_item.menu_item:
        for mapping in order_item.menu_item.ingredients:
            mapping.ingredient.stock_qty += mapping.required_qty * order_item.quantity
        order_item.menu_item.is_available = True

    db.commit()
    return {"status": "success", "restored_stock": 0}

@app.patch("/api/orders/{order_id}/status", response_model=schemas.OrderResponse)
def update_order_status(
    order_id: int,
    status_update: schemas.OrderStatusUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role(["admin", "cashier", "employee"]))
):
    # Eager-load items + menu_items to avoid N+1 on serialization
    db_order = db.query(models.Order).options(
        joinedload(models.Order.items).joinedload(models.OrderItem.menu_item)
    ).filter(models.Order.id == order_id).first()

    if not db_order:
        raise HTTPException(status_code=404, detail="Order not found")

    db_order.status = status_update.status
    if status_update.discount_amount is not None and status_update.discount_amount > 0:
        db_order.discount_amount = status_update.discount_amount
        db_order.discount_reason = status_update.discount_reason
        # Force status to discounted if a discount is applied
        if status_update.status == "completed":
            db_order.status = "discounted"
        
    if status_update.status == "cooked":
        db_order.cooked_at = datetime.utcnow()
    elif status_update.status == "on_table":
        db_order.served_at = datetime.utcnow()
    elif status_update.status == "completed" or db_order.status == "discounted":
        now = datetime.utcnow()
        db_order.paid_at = now
        if not db_order.served_at:
            db_order.served_at = now

    if status_update.payment_method:
        db_order.payment_method = status_update.payment_method

    db.commit()
    db.refresh(db_order)
    return db_order

# --- ADMIN DASHBOARD ---
@app.get("/api/admin/transactions", response_model=List[schemas.OrderResponse])
def get_transactions(
    branch_name: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role(["admin"]))
):
    query = db.query(models.Order).options(
        joinedload(models.Order.items).joinedload(models.OrderItem.menu_item)
    )

    if branch_name:
        query = query.filter(models.Order.branch_name == branch_name)

    if start_date:
        try:
            sd = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
            query = query.filter(models.Order.created_at >= sd)
        except ValueError:
            pass

    if end_date:
        try:
            ed = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
            query = query.filter(models.Order.created_at <= ed)
        except ValueError:
            pass

    # Return orders ordered by most recent first
    return query.order_by(models.Order.created_at.desc()).all()

@app.get("/api/admin/dish-performance", response_model=List[schemas.DishPerformanceResponse])
def get_dish_performance(
    branch_name: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role(["admin"]))
):
    from sqlalchemy import text

    query = """
        SELECT
            m.id,
            m.name,
            m.category,
            m.branch_name,
            COALESCE(m.price_normal, 0) as price,
            COALESCE(m.cost, 0) as cost,
            0 as stock,
            COALESCE(SUM(oi.quantity), 0) as sold_count,
            COALESCE(SUM(oi.quantity * m.price_normal), 0) as revenue,
            COALESCE(SUM(oi.quantity * COALESCE(m.cost, m.price_normal * 0.5)), 0) as cost_of_sales,
            (COALESCE(SUM(oi.quantity * m.price_normal), 0) - COALESCE(SUM(oi.quantity * COALESCE(m.cost, m.price_normal * 0.5)), 0)) as profit
        FROM menu_items m
        LEFT JOIN order_items oi ON oi.menu_item_id = m.id
        LEFT JOIN orders o ON o.id = oi.order_id AND o.status IN ('completed', 'discounted')
    """

    conditions = []
    params = {}

    if branch_name:
        conditions.append("m.branch_name = :branch_name")
        params["branch_name"] = branch_name

    if start_date:
        conditions.append("(o.created_at IS NULL OR o.created_at >= :start_date)")
        params["start_date"] = start_date

    if end_date:
        conditions.append("(o.created_at IS NULL OR o.created_at <= :end_date)")
        params["end_date"] = end_date

    if conditions:
        query += " WHERE " + " AND ".join(conditions)

    query += " GROUP BY m.id, m.name, m.category, m.branch_name, m.price_normal, m.cost"

    results = db.execute(text(query), params).fetchall()

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
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role(["admin"]))
):
    # Revenue and order count in a single DB round-trip
    base_query = db.query(
        func.count(func.distinct(models.Order.id)).label('order_count'),
        func.sum(models.Order.total_amount).label('total_revenue')
    ).filter(models.Order.status.in_(["completed", "discounted"]))

    if branch_name:
        base_query = base_query.filter(models.Order.branch_name == branch_name)

    if start_date:
        try:
            sd = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
            base_query = base_query.filter(models.Order.created_at >= sd)
        except ValueError:
            pass

    if end_date:
        try:
            ed = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
            base_query = base_query.filter(models.Order.created_at <= ed)
        except ValueError:
            pass

    result = base_query.first()
    order_count = result.order_count or 0
    total_revenue = float(result.total_revenue or 0)

    # Profit via JOIN (avoids downloading all rows)
    profit_query = db.query(
        func.sum((models.MenuItem.price_normal - models.MenuItem.cost) * models.OrderItem.quantity).label('total_profit')
    ).select_from(models.Order)\
     .join(models.OrderItem, models.Order.id == models.OrderItem.order_id)\
     .join(models.MenuItem, models.OrderItem.menu_item_id == models.MenuItem.id)\
     .filter(models.Order.status.in_(["completed", "discounted"]))

    if branch_name:
        profit_query = profit_query.filter(models.Order.branch_name == branch_name)

    if start_date:
        try:
            sd = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
            profit_query = profit_query.filter(models.Order.created_at >= sd)
        except ValueError:
            pass

    if end_date:
        try:
            ed = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
            profit_query = profit_query.filter(models.Order.created_at <= ed)
        except ValueError:
            pass

    profit_result = profit_query.first()
    total_profit = float(profit_result.total_profit or 0)

    return {
        "branch_name": branch_name,
        "total_revenue": total_revenue,
        "total_profit": total_profit,
        "order_count": order_count
    }

# --- PROMOTIONS ---
@app.get("/api/promotions", response_model=List[schemas.PromotionResponse])
def get_promotions(response: Response, branch_name: Optional[str] = None, db: Session = Depends(get_db)):
    response.headers["Cache-Control"] = "public, max-age=60, s-maxage=60, stale-while-revalidate=86400"
    query = db.query(models.Promotion).filter(models.Promotion.is_active == True)
    if branch_name:
        # Return promos for this branch + global promos (branch_name IS NULL)
        query = query.filter(
            (models.Promotion.branch_name == branch_name) | (models.Promotion.branch_name.is_(None))
        )
    return query.order_by(models.Promotion.created_at.desc()).all()

@app.post("/api/promotions", response_model=schemas.PromotionResponse)
def create_promotion(promo: schemas.PromotionCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.require_role(["admin"]))):
    db_promo = models.Promotion(**promo.model_dump())
    db.add(db_promo)
    db.commit()
    db.refresh(db_promo)
    return db_promo

@app.delete("/api/promotions/{promo_id}")
def delete_promotion(promo_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.require_role(["admin"]))):
    db_promo = db.query(models.Promotion).filter(models.Promotion.id == promo_id).first()
    if not db_promo:
        raise HTTPException(status_code=404, detail="Promotion not found")
    db.delete(db_promo)
    db.commit()
    return {"message": "Deleted"}

@app.delete("/api/admin/transactions/{order_id}")
def delete_transaction(order_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.require_role(["admin"]))):
    db_order = db.query(models.Order).options(
        joinedload(models.Order.items).joinedload(models.OrderItem.menu_item).joinedload(models.MenuItem.ingredients).joinedload(models.MenuItemIngredient.ingredient)
    ).filter(models.Order.id == order_id).first()
    
    if not db_order:
        raise HTTPException(status_code=404, detail="Transaction not found")
        
    # Restore stock for all non-declined items
    for order_item in db_order.items:
        if order_item.status != "declined" and order_item.menu_item:
            for mapping in order_item.menu_item.ingredients:
                mapping.ingredient.stock_qty += mapping.required_qty * order_item.quantity

    db.query(models.OrderItem).filter(models.OrderItem.order_id == order_id).delete()
    db.delete(db_order)
    db.commit()
    return {"message": "Transaction deleted"}

# --- INGREDIENTS ---
@app.get("/api/ingredients", response_model=List[schemas.IngredientResponse])
def get_ingredients(branch_name: Optional[str] = None, db: Session = Depends(get_db), current_user: models.User = Depends(auth.require_role(["admin"]))):
    query = db.query(models.Ingredient)
    if branch_name:
        query = query.filter(models.Ingredient.branch_name == branch_name)
    return query.order_by(models.Ingredient.sort_order.asc()).all()

@app.post("/api/ingredients", response_model=schemas.IngredientResponse)
def create_ingredient(ingredient: schemas.IngredientCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.require_role(["admin"]))):
    min_sort = db.query(func.min(models.Ingredient.sort_order)).filter(models.Ingredient.branch_name == ingredient.branch_name).scalar()
    new_sort_order = (min_sort if min_sort is not None else 0) - 1
    
    ing_data = ingredient.model_dump()
    ing_data["sort_order"] = new_sort_order
    db_ing = models.Ingredient(**ing_data)
    db.add(db_ing)
    db.commit()
    db.refresh(db_ing)
    return db_ing

@app.put("/api/ingredients/reorder")
def reorder_ingredients(items: List[schemas.IngredientReorderItem], db: Session = Depends(get_db), current_user: models.User = Depends(auth.require_role(["admin"]))):
    for item in items:
        db.query(models.Ingredient).filter(models.Ingredient.id == item.id).update({"sort_order": item.sort_order})
    db.commit()
    return {"message": "Reordered successfully"}

@app.put("/api/ingredients/{ing_id}", response_model=schemas.IngredientResponse)
def update_ingredient(ing_id: int, update_data: schemas.IngredientUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.require_role(["admin"]))):
    db_ing = db.query(models.Ingredient).filter(models.Ingredient.id == ing_id).first()
    if not db_ing:
        raise HTTPException(status_code=404, detail="Ingredient not found")
    if update_data.stock_qty is not None:
        db_ing.stock_qty = update_data.stock_qty
    if update_data.name is not None:
        db_ing.name = update_data.name
    if update_data.unit is not None:
        db_ing.unit = update_data.unit
    if update_data.branch_name is not None:
        db_ing.branch_name = update_data.branch_name
    db.commit()
    db.refresh(db_ing)
    return db_ing

@app.delete("/api/ingredients/{ing_id}")
def delete_ingredient(ing_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.require_role(["admin"]))):
    db_ing = db.query(models.Ingredient).filter(models.Ingredient.id == ing_id).first()
    if not db_ing:
        raise HTTPException(status_code=404, detail="Ingredient not found")
    db.delete(db_ing)
    db.commit()
    return {"message": "Deleted"}
