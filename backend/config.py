"""
Central configuration, loaded from environment variables (.env file supported).
Copy .env.example to .env and fill in real values before deploying.
"""
import os
from dotenv import load_dotenv

load_dotenv()

# --- Auth ---
JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-me-in-production")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))  # 24h

# --- Razorpay ---
RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "")
# When no live keys are configured, payments run in a local "test mode" that
# simulates a successful payment so the app is fully demoable out of the box.
RAZORPAY_TEST_MODE = not (RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET)

# --- CORS ---
FRONTEND_ORIGINS = os.getenv("FRONTEND_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")

# --- Database ---
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./restaurant.db")

# --- Default admin (created on first run if no admin exists) ---
DEFAULT_ADMIN_EMAIL = os.getenv("DEFAULT_ADMIN_EMAIL", "admin@kpifood.com")
DEFAULT_ADMIN_PASSWORD = os.getenv("DEFAULT_ADMIN_PASSWORD", "Admin@123")

# Anyone registering a new admin account via /api/auth/register-admin must
# supply this code, so the admin portal can't be self-provisioned by the public.
ADMIN_INVITE_CODE = os.getenv("ADMIN_INVITE_CODE", "KPI-ADMIN-2026")
