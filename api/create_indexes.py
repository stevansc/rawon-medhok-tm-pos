import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv(override=True)
db_url = os.environ.get('DATABASE_URL')
if db_url.startswith('postgres://'):
    db_url = db_url.replace('postgres://', 'postgresql://', 1)

engine = create_engine(db_url)

indexes = [
    "CREATE INDEX IF NOT EXISTS idx_menu_items_branch_category ON menu_items (branch_name, category);",
    "CREATE INDEX IF NOT EXISTS idx_orders_branch_status ON orders (branch_name, status);",
    "CREATE INDEX IF NOT EXISTS idx_orders_branch_created ON orders (branch_name, created_at);",
    "CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items (order_id);",
    "CREATE INDEX IF NOT EXISTS idx_order_items_menu_item_id ON order_items (menu_item_id);",
    "CREATE INDEX IF NOT EXISTS idx_promotions_branch_active ON promotions (branch_name, is_active);",
]

with engine.begin() as conn:
    for idx_sql in indexes:
        print(f"Running: {idx_sql}")
        conn.execute(text(idx_sql))
        print("  OK")

print("\nAll indexes created successfully.")
