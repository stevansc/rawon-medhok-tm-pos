import os
import sys
import time
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv(override=True)
db_url = os.getenv("DATABASE_URL")
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

# FORCE DIRECT PORT 5432
db_url = db_url.replace(":6543/", ":5432/")

engine = create_engine(db_url)

print("Starting DB ping test...")

# Test 1: Full connection establishment + query
start_time = time.time()
with engine.connect() as conn:
    conn.execute(text("SELECT 1"))
end_time = time.time()
print(f"Test 1 (New Connection + SELECT 1): {end_time - start_time:.4f} seconds")

# Test 2: Reuse connection (pool)
start_time = time.time()
with engine.connect() as conn:
    conn.execute(text("SELECT 1"))
end_time = time.time()
print(f"Test 2 (Pooled Connection + SELECT 1): {end_time - start_time:.4f} seconds")

# Test 3: Actual query
start_time = time.time()
with engine.connect() as conn:
    conn.execute(text("SELECT count(*) FROM ingredients")).scalar()
end_time = time.time()
print(f"Test 3 (SELECT count(*) FROM ingredients): {end_time - start_time:.4f} seconds")

