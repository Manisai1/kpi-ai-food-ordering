from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Float, Enum, DateTime, Text
from sqlalchemy.orm import relationship
import enum
from datetime import datetime
from database import Base


class UserRole(str, enum.Enum):
    ADMIN = "Admin"
    CUSTOMER = "Customer"


class DietaryTag(str, enum.Enum):
    VEGETARIAN = "Vegetarian"
    NON_VEGETARIAN = "Non-Vegetarian"
    SPICY = "Spicy"


class OrderStatus(str, enum.Enum):
    PLACED = "Placed"
    CONFIRMED = "Confirmed"
    PREPARING = "Preparing"
    READY = "Ready"
    PICKED_UP = "Picked Up"
    CANCELLED = "Cancelled"  


class OrderType(str, enum.Enum):
    DINE_IN = "Dine-in"
    TAKEAWAY = "Takeaway"
    ONLINE_DELIVERY = "Online Delivery"


class PaymentStatus(str, enum.Enum):
    PENDING = "Pending"
    PAID = "Paid"
    FAILED = "Failed"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=True) 
    email = Column(String, unique=True, index=True, nullable=False)
    phone = Column(String, nullable=True) 
    hashed_password = Column(String, nullable=False)
    role = Column(String, default=UserRole.CUSTOMER.value, nullable=False) 
    created_at = Column(DateTime, default=datetime.utcnow)

    orders = relationship("Order", back_populates="user")


class MenuItem(Base):
    __tablename__ = "menu_items"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String, index=True, nullable=False)
    price = Column(Float, nullable=False)
    dietary_tag = Column(String, nullable=True)
    image_url = Column(String, nullable=True)
    is_available = Column(Boolean, default=True)
    embedding = Column(Text, nullable=True) # JSON serialized  for semantic search


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True) 
    status = Column(String, default=OrderStatus.PLACED.value)
    total_price = Column(Float, default=0.0)
    order_type = Column(String, nullable=False, default=OrderType.TAKEAWAY.value)
    table_number = Column(String, nullable=True)
    delivery_address = Column(Text, nullable=True)
    
    
    payment_status = Column(String, default=PaymentStatus.PENDING.value)
    payment_method = Column(String, default="razorpay")
    razorpay_order_id = Column(String, nullable=True)
    razorpay_payment_id = Column(String, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"))
    menu_item_id = Column(Integer, ForeignKey("menu_items.id"))
    quantity = Column(Integer, default=1)
    
    price_at_time_of_order = Column(Float, nullable=True) 

    order = relationship("Order", back_populates="items")
    menu_item = relationship("MenuItem")
