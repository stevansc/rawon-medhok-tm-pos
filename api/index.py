import sys
import os

# Add the backend directory to the Python path so absolute imports work inside the Vercel Lambda
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))

from fastapi import FastAPI
from main import app as backend_app

# Create a master FastAPI app for Vercel
app = FastAPI()

# Mount the backend app under /api, which perfectly matches Vercel's automatic routing!
app.mount("/api", backend_app)
