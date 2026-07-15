# Rawon TM - POS Backend System

This is the backend system for the Rawon TM Point of Sale (POS) system. It is built using **FastAPI** and uses **PostgreSQL** as the database. It is designed to support a multi-app ecosystem including Customer, Kitchen, Cashier, and Admin interfaces across multiple branches.

## Features
- **Multi-Branch Support**: Track menus, orders, and taxes independently per branch.
- **Role-Based Access Control (RBAC)**: Secure endpoints using JWT authentication (`admin`, `cashier`, `kitchen` roles).
- **Automated Calculations**: Backend handles all subtotal and tax computations securely.
- **Admin Dashboard**: View revenue, profit, and order volume metrics.

---

## 🚀 Getting Started

### 1. Prerequisites
- Python 3.9+
- PostgreSQL (or Supabase)

### 2. Installation
Install the required dependencies via `pip`:

```bash
pip install fastapi uvicorn sqlalchemy psycopg2-binary python-jose[cryptography] passlib[bcrypt] python-multipart pydantic python-dotenv
```

### 3. Environment Variables
Create a `.env` file in the root directory. You must define your `DATABASE_URL` (e.g., your Supabase connection string). 

```env
# Example using PostgreSQL/Supabase:
DATABASE_URL=postgresql://postgres:password@localhost:5432/rawontmdb

# Example using SQLite (for local testing without Postgres installed):
# DATABASE_URL=sqlite:///./restaurant_pos.db
```

### 4. Running the Server
Start the local development server:

```bash
uvicorn main:app --reload
```

The server will be running at `http://localhost:8000`.

---

## 📚 Documentation for Frontend Developers

### Architecture & Flows
Read the [frontend_documentation.md](./frontend_documentation.md) file to understand how the Customer, Kitchen, Cashier, and Admin apps are supposed to interact with the backend APIs.

### API Reference (Swagger)
FastAPI automatically generates an interactive API documentation page. Once the server is running, you can explore all endpoints, view request/response schemas, and send test requests here:

👉 **[http://localhost:8000/docs](http://localhost:8000/docs)**
