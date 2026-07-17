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
# This prevents the 1.5s+ TCP/SSL handshake penalty on every single request.
# Ensure you are using the Supabase Connection Pooler URL (port 6543) in production.
engine = create_engine(
    db_url,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
