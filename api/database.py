import os
from dotenv import load_dotenv
from sqlalchemy import create_engine

load_dotenv(override=True)
from sqlalchemy.orm import sessionmaker, declarative_base

# Fallback to SQLite if no DATABASE_URL is provided in the environment
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./restaurant_pos.db")

# If using SQLite, we need connect_args={"check_same_thread": False}
if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
    )
else:
    engine = create_engine(SQLALCHEMY_DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
