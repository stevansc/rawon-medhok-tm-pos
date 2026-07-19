import os
import sys

sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'api'))
from sqlalchemy import text
from database import engine

def add_indexes():
    print("Connecting to database...")
    with engine.connect() as conn:
        print("Adding index on orders.created_at...")
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_orders_created_at ON orders(created_at);"))
        
        print("Adding index on orders.branch_name...")
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_orders_branch_name ON orders(branch_name);"))
        
        print("Adding index on order_items.order_id...")
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_order_items_order_id ON order_items(order_id);"))
        
        print("Adding index on ingredients.branch_name...")
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_ingredients_branch_name ON ingredients(branch_name);"))
        
        conn.commit()
    print("All indexes created successfully!")

if __name__ == "__main__":
    add_indexes()
