from pydantic._internal import _known_annotated_metadata
from fastapi import FastAPI, Depends, HTTPException
from contextlib import asynccontextmanager
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from fastapi.middleware.cors import CORSMiddleware

import models, schemas, crud, ai_search, payments
from database import engine, get_db, SessionLocal
from config import FRONTEND_ORIGINS, DEFAULT_ADMIN_EMAIL, DEFAULT_ADMIN_PASSWORD, ADMIN_INVITE_CODE
from auth import (
    create_access_token,
    verify_password,
    get_current_user,
    get_current_admin,
    get_current_customer,
    get_optional_user,
)

models.Base.metadata.create_all(bind=engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Seed the database with default data (admin, customer, menu) if empty
    import seed_data
    seed_data.seed()
    yield
    # Shutdown: clean up resources if needed
    pass

app = FastAPI(title="KPI Food Ordering API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    return {"message": "Welcome to KPI Food Ordering API"}


# ================= AUTH =================
@app.post("/api/auth/register", response_model=schemas.Token, status_code=201)
def register_customer(data: schemas.UserRegister, db: Session = Depends(get_db)):
    if crud.get_user_by_email(db, data.email):
        raise HTTPException(status_code=400, detail="An account with this email already exists")
    user = crud.create_user(db, data, role=models.UserRole.CUSTOMER.value)
    token = create_access_token(user)
    return {"access_token": token, "user": user}


@app.post("/api/auth/register-admin", response_model=schemas.Token, status_code=201)
def register_admin(data: schemas.AdminRegister, db: Session = Depends(get_db)):
    if data.invite_code != ADMIN_INVITE_CODE:
        raise HTTPException(status_code=403, detail="Invalid admin invite code")
    if crud.get_user_by_email(db, data.email):
        raise HTTPException(status_code=400, detail="An account with this email already exists")
    user = crud.create_user(db, data, role=models.UserRole.ADMIN.value)
    token = create_access_token(user)
    return {"access_token": token, "user": user}


@app.post("/api/auth/login", response_model=schemas.Token)
def login(data: schemas.UserLogin, db: Session = Depends(get_db)):
    user = crud.get_user_by_email(db, data.email)
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    token = create_access_token(user)
    return {"access_token": token, "user": user}


@app.get("/api/auth/me", response_model=schemas.UserOut)
def read_me(current_user: models.User = Depends(get_current_user)):
    return current_user


# ================= MENU =================
@app.get("/api/menu", response_model=List[schemas.MenuItem])
def read_menu(category: Optional[str] = None, db: Session = Depends(get_db)):
    items = crud.get_menu_items(db)
    if category:
        items = [i for i in items if i.category.lower() == category.lower()]
    return items


@app.get("/api/menu/categories", response_model=List[str])
def read_categories(db: Session = Depends(get_db)):
    return crud.get_categories(db)


@app.get("/api/menu/{item_id}", response_model=schemas.MenuItem)
def read_menu_item(item_id: int, db: Session = Depends(get_db)):
    db_item = crud.get_menu_item(db, item_id)
    if db_item is None:
        raise HTTPException(status_code=404, detail="Menu item not found")
    return db_item


@app.post("/api/menu", response_model=schemas.MenuItem, status_code=201)
def create_menu_item(item: schemas.MenuItemCreate, db: Session = Depends(get_db),
                      _admin: models.User = Depends(get_current_admin)):
    return crud.create_menu_item(db=db, item=item)


@app.put("/api/menu/{item_id}", response_model=schemas.MenuItem)
def update_menu_item(item_id: int, item: schemas.MenuItemCreate, db: Session = Depends(get_db),
                      _admin: models.User = Depends(get_current_admin)):
    db_item = crud.update_menu_item(db, item_id, item)
    if db_item is None:
        raise HTTPException(status_code=404, detail="Menu item not found")
    return db_item


@app.delete("/api/menu/{item_id}")
def delete_menu_item(item_id: int, db: Session = Depends(get_db),
                      _admin: models.User = Depends(get_current_admin)):
    db_item = crud.delete_menu_item(db, item_id)
    if db_item is None:
        raise HTTPException(status_code=404, detail="Menu item not found")
    return {"message": "Item deleted successfully"}


# ================= AI SEARCH =================
@app.get("/api/search")
def search_menu(q: str, mode: str = "semantic", db: Session = Depends(get_db)):
    if not q or not q.strip():
        raise HTTPException(status_code=400, detail="Query parameter 'q' must not be empty")
    items = crud.get_menu_items(db)
    if mode == "llm":
        return ai_search.search_menu_llm(q, items)
    return ai_search.search_menu(q, items)


# ================= AI CART =================
class CartQuery(BaseModel):
    query: str

@app.post("/api/cart/ai-add", response_model=schemas.AICartResponse)
def ai_build_cart(data: CartQuery, db: Session = Depends(get_db)):
    if not data.query or not data.query.strip():
        raise HTTPException(status_code=400, detail="Query must not be empty")
    items = crud.get_menu_items(db)
    result = ai_search.build_ai_cart(data.query, items)
    return result


# ================= SYSTEM PROMPT =================
@app.get("/api/admin/prompt")
def get_system_prompt(_admin: models.User = Depends(get_current_admin)):
    return {
        "system_prompt": ai_search.get_system_prompt(),
        "filter_prompt": ai_search.get_filter_prompt()
    }

@app.put("/api/admin/prompt")
def update_system_prompt(data: schemas.SystemPromptUpdate, _admin: models.User = Depends(get_current_admin)):
    ai_search.update_system_prompt(data.system_prompt, data.filter_prompt)
    return {"message": "System prompts updated successfully"}


# ================= ORDERS =================
@app.post("/api/orders", response_model=schemas.Order, status_code=201)
def create_order(order: schemas.OrderCreate, db: Session = Depends(get_db),
                  current_user: Optional[models.User] = Depends(get_optional_user)):
    if current_user is not None and current_user.role != models.UserRole.CUSTOMER.value:
        raise HTTPException(status_code=403, detail="Only customers can place orders")
    try:
        return crud.create_order(db=db, order=order, customer=current_user)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/orders", response_model=List[schemas.Order])
def read_orders(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if current_user.role == models.UserRole.ADMIN.value:
        return crud.get_orders(db)
    return crud.get_orders(db, user_id=current_user.id)


@app.get("/api/orders/{order_id}", response_model=schemas.Order)
def read_order(order_id: int, db: Session = Depends(get_db),
                current_user: models.User = Depends(get_current_user)):
    db_order = crud.get_order(db, order_id=order_id)
    if db_order is None:
        raise HTTPException(status_code=404, detail="Order not found")
    if current_user.role != models.UserRole.ADMIN.value and db_order.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this order")
    return db_order


@app.put("/api/orders/{order_id}/status", response_model=schemas.Order)
def update_order_status(order_id: int, status_update: schemas.OrderStatusUpdate, db: Session = Depends(get_db),
                         _admin: models.User = Depends(get_current_admin)):
    db_order = crud.update_order_status(db, order_id, status_update.status)
    if db_order is None:
        raise HTTPException(status_code=404, detail="Order not found")
    return db_order


# ================= RECOMMENDATIONS =================
@app.get("/api/users/recommendations", response_model=List[schemas.MenuItem])
def get_user_recommendations(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return crud.get_recommendations(db, user_id=current_user.id)


# ================= PAYMENTS (Razorpay) =================
@app.post("/api/payments/create-order/{order_id}", response_model=schemas.RazorpayOrderOut)
def create_payment(order_id: int, db: Session = Depends(get_db),
                    current_user: Optional[models.User] = Depends(get_optional_user)):
    from config import RAZORPAY_KEY_ID, RAZORPAY_TEST_MODE

    db_order = crud.get_order(db, order_id)
    if db_order is None:
        raise HTTPException(status_code=404, detail="Order not found")
    if current_user is not None and current_user.role == models.UserRole.CUSTOMER.value and db_order.user_id not in (None, current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized for this order")

    rzp_order = payments.create_razorpay_order(db_order.total_price, receipt=f"order_{db_order.id}")
    db_order.razorpay_order_id = rzp_order["id"]
    db.commit()

    return {
        "razorpay_order_id": rzp_order["id"],
        "amount": rzp_order["amount"],
        "currency": rzp_order.get("currency", "INR"),
        "key_id": RAZORPAY_KEY_ID or "rzp_test_1DP5mmOlF5G5ag",
        "order_id": db_order.id,
        "test_mode": RAZORPAY_TEST_MODE,
    }


@app.post("/api/payments/verify", response_model=schemas.Order)
def verify_payment(data: schemas.PaymentVerify, db: Session = Depends(get_db)):
    db_order = crud.get_order(db, data.order_id)
    if db_order is None:
        raise HTTPException(status_code=404, detail="Order not found")

    valid = payments.verify_payment_signature(
        data.razorpay_order_id, data.razorpay_payment_id, data.razorpay_signature
    )
    if not valid:
        raise HTTPException(status_code=400, detail="Payment signature verification failed")

    return crud.mark_order_paid(db, data.order_id, data.razorpay_payment_id)


# ================= DASHBOARD =================
@app.get("/api/dashboard/stats")
def read_dashboard_stats(db: Session = Depends(get_db), _admin: models.User = Depends(get_current_admin)):
    return crud.get_dashboard_stats(db)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="localhost", port=8000)
