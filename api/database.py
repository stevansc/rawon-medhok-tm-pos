import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.pool import NullPool
from sqlalchemy.orm import sessionmaker, declarative_base

load_dotenv(override=True)

# STRICTLY REQUIRE DATABASE_URL for Vercel Serverless
db_url = os.getenv("DATABASE_URL")
if not db_url:
    raise ValueError("CRITICAL ERROR: DATABASE_URL environment variable is missing!")

# Fix Supabase's deprecated postgres:// schema
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

# By default, SQLAlchemy uses QueuePool which keeps connections alive.
# This prevents the 1.5s+ TCP/SSL handshake penalty locally and across regions.
# We MUST use pool_pre_ping=True to prevent frozen connection errors on Vercel Serverless
# and to prevent 4-second TCP timeout reconnects on dropped connections.
engine = create_engine(
    db_url,
    pool_pre_ping=True,
    pool_recycle=120, # Recycle connections every 2 mins to prevent stale drops on PgBouncer
    pool_size=10,
    max_overflow=20
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
