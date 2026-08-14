# AI-Powered Food Ordering System

## Functionality
Food Ordering system with AI-based searching, smart recommendations, and an AI-powered cart builder.

## User Stories & Acceptance Criteria
1. Application has two roles: **Admin** and **User (Customer)**, using JWT Authentication and password hashing.
2. Role-based access control (IAM) for performing CRUD operations.
3. Admin can perform CRUD operations for the menu.
4. Admin can manage orders and move order status: `Placed` → `Confirmed` → `Preparing` → `Ready` → `Picked Up` (or `Cancelled`).
5. Supported order types are Dine-in, Takeaway and Online Delivery.
6. Admin has a dashboard showing orders by status, popular items, and total revenue for the day.
7. Users can browse the menu by category and view item details.
8. Users have an AI-powered natural language search to find dishes based on descriptions.
   - External LLM API from OpenRouter (`google/gemini-3.7-flash` or free models).
   - Semantic search using vector embeddings (`nvidia/nemotron-3-embed-1b:free`).
9. Users can add items to a cart, see item quantities, and view the total price calculation.
10. Users can place an order and track the order status.

### Additional Features
- Payment integration via Razorpay.
- Customization of system prompts for the LLM via the Admin Dashboard.
- Show recommendations to users based on order history and sales data.

## Tech Stack
- **Backend:** FastAPI (Offers open API docs, easy testing, and Pydantic validation).
- **Database:** SQLite (Lightweight).
- **Frontend:** React.
- **External AI API:** OpenRouter (Supports free models and multi-model support like `google/gemini-3.7-flash`).
- **Embedding Model:** `nvidia/nemotron-3-embed-1b:free` via OpenRouter.

## APIs
- **Backend (OpenDocs):** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **Frontend URL:** [http://localhost:5173/](http://localhost:5173/)

## Database Entities & Enums

### Enums
- **DietaryTag:** `Vegetarian`, `Non-Vegetarian`, `Spicy`
- **OrderStatus:** `Placed`, `Confirmed`, `Preparing`, `Ready`, `Picked Up`, `Cancelled`
- **OrderType:** `Dine-in`, `Takeaway`, `Online Delivery`
- **PaymentStatus:** `Pending`, `Paid`, `Failed`
- **UserRoles:** `Admin`, `Customer`

### Tables
**Menu Table**
- `id` (Integer, Primary Key)
- `name` (String, Indexed)
- `description` (Text)
- `category` (String, Indexed)
- `price` (Float)
- `dietary_tag` (String)
- `is_available` (Boolean, default: True)
- `image_url` (String)
- `embedding` (Text, JSON serialized)

**Orders Table**
- `id` (Integer, Primary Key)
- `status` (String, default: `Placed`)
- `total_price` (Float)
- `order_type` (String, default: `Takeaway`)
- `table_number` (String)
- `delivery_address` (Text)
- `payment_status` (String, default: `Pending`)
- `payment_method` (String, default: `razorpay`)
- `razorpay_order_id` (String)
- `razorpay_payment_id` (String)
- `user_id` (Integer, Foreign Key to Users)
- `created_at` (DateTime)

**OrderItem Table**
- `id` (Integer, Primary Key)
- `order_id` (Integer, Foreign Key to Orders)
- `menu_item_id` (Integer, Foreign Key to Menu)
- `quantity` (Integer)
- `price_at_time_of_order` (Float)

**Users Table**
- `id` (Integer, Primary Key)
- `name` (String)
- `phone` (String)
- `email` (String, Unique)
- `hashed_password` (String)
- `role` (String, default: `Customer`)
- `created_at` (DateTime)

## IAM Rules
1. JWT token-based authentication using the `python-jose` library. The `/api/auth/login` endpoint is used for OAuth2 login.
2. Passwords are securely hashed using Python's built-in `hashlib.pbkdf2_hmac` algorithm (no external bcrypt dependencies required).
3. Only an admin (with the secure invite code) can create another admin account. A default admin is generated automatically during server startup using FastAPI's Lifespan context manager.
   - **Default Admin Email:** `admin@kpifood.com`
   - **Default Admin Password:** `Admin@123` (or generated based on `.env`)

## Commands to Run the Application

**1. Setup Environment**
Set  `OPENROUTER_API_KEY` in the backend `.env` file.

**2. Start Backend**
```bash
cd backend
python -m venv .venv
# Activate venv: .venv\Scripts\activate (Windows) or source .venv/bin/activate (Mac/Linux)
pip install -r requirements.txt
python main.py
```

**3. Start Frontend**
```bash
cd frontend
npm install
npm run dev
```

## AI Approach

**Two Modes for Searching:**
1. **Semantic Search:** Fast searching using vector embeddings.

**Working:** 
- It converts your search words into numbers.
- It compares your numbers against the numbers of the menu items.
- It returns the items that mathematically match your search the closest.

2. **LLM Smart Filter:** Uses natural language logic to perform strict filtering for complex user queries.

**Working:** 
- It sends the entire menu and your exact request to a smart AI assistant.
- The AI reads your request and picks out only the items that match all your specific rules (like price or dietary limits).
- It returns the final list of items the AI selected.

**AI Cart Builder:**
- Uses the LLM to understand natural language inputs and automatically construct an itemized cart for the user.

## Recommendations
- **Smart Recommendations:** Shown based on the user's past order history supplemented with the restaurant's overall sales history (using standard database heuristics).
      **Working:**
         *  It checks your past order history to see what you order most frequently.
         *  If you don't have enough past orders, it finds the most popular items bought by everyone else.
         *  It combines this information to suggest a top 5 list of dishes you are most likely to enjoy.
