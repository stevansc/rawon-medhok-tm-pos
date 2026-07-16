import os
from dotenv import load_dotenv
from sqlalchemy import create_engine

load_dotenv(override=True)
from sqlalchemy.orm import sessionmaker, declarative_base

# STRICTLY REQUIRE DATABASE_URL for Vercel Serverless
# and fix Supabase's deprecated postgres:// schema if it exists
db_url = os.getenv("DATABASE_URL")
if not db_url:
    raise ValueError("CRITICAL ERROR: DATABASE_URL environment variable is missing!")

if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

engine = create_engine(db_url)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
