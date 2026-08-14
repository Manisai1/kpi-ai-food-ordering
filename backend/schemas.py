from pydantic import BaseModel, EmailStr, field_validator
from typing import List, Optional
from datetime import datetime
from models import OrderStatus, PaymentStatus, UserRole, DietaryTag, OrderType


# ---------- Auth / Users ----------
class UserRegister(BaseModel):
    name: Optional[str] = None
    email: EmailStr
    phone: Optional[str] = None
    password: str

    @field_validator("password")
    @classmethod
    def password_len(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("password must be at least 6 characters")
        return v


class AdminRegister(UserRegister):
    """Admin signup requires an invite code so randoms can't self-provision admin access."""
    invite_code: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    name: Optional[str] = None
    email: str
    phone: Optional[str] = None
    role: str

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ---------- Menu ----------
class MenuItemBase(BaseModel):
    name: str
    description: Optional[str] = None
    category: str
    price: float
    dietary_tag: Optional[str] = None
    image_url: Optional[str] = None
    is_available: bool = True

    @field_validator("name", "category")
    @classmethod
    def not_blank(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("must not be empty")
        return v.strip()

    @field_validator("price")
    @classmethod
    def price_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("price must be greater than 0")
        return round(v, 2)


class MenuItemCreate(MenuItemBase):
    pass


class MenuItem(MenuItemBase):
    id: int

    class Config:
        from_attributes = True


class MenuItemSearchResult(MenuItem):
    match_score: Optional[float] = None


# ---------- Orders ----------
class OrderItemBase(BaseModel):
    menu_item_id: int
    quantity: int

    @field_validator("quantity")
    @classmethod
    def quantity_positive(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("quantity must be greater than 0")
        return v


class OrderItemCreate(OrderItemBase):
    pass


class OrderItemOut(OrderItemBase):
    id: int
    order_id: int
    price_at_time_of_order: Optional[float] = None
    menu_item: MenuItem

    class Config:
        from_attributes = True


class OrderCreate(BaseModel):
    items: List[OrderItemCreate]
    order_type: str = OrderType.TAKEAWAY.value
    table_number: Optional[str] = None
    delivery_address: Optional[str] = None
    payment_method: str = "Online"

    @field_validator("items")
    @classmethod
    def items_not_empty(cls, v: List[OrderItemCreate]) -> List[OrderItemCreate]:
        if not v:
            raise ValueError("order must contain at least one item")
        return v


class OrderStatusUpdate(BaseModel):
    status: str


class Order(BaseModel):
    id: int
    user_id: Optional[int] = None
    status: str
    total_price: float
    order_type: str
    table_number: Optional[str] = None
    delivery_address: Optional[str] = None
    payment_status: str
    payment_method: str
    razorpay_order_id: Optional[str] = None
    razorpay_payment_id: Optional[str] = None
    created_at: datetime
    items: List[OrderItemOut]

    class Config:
        from_attributes = True


# ---------- Payments ----------
class RazorpayOrderOut(BaseModel):
    razorpay_order_id: str
    amount: int  # paise
    currency: str = "INR"
    key_id: str
    order_id: int
    test_mode: bool = False


class PaymentVerify(BaseModel):
    order_id: int
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str

# ---------- AI Cart ----------
class AICartItem(BaseModel):
    item_id: int
    quantity: int

class AICartResponse(BaseModel):
    items: List[AICartItem]
    message: Optional[str] = None

class SystemPromptUpdate(BaseModel):
    system_prompt: str
    filter_prompt: str
