from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
import models, schemas
from auth import hash_password


# ---------- Users ----------
def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email.lower()).first()


def create_user(db: Session, data: schemas.UserRegister, role: str = models.UserRole.CUSTOMER.value):
    db_user = models.User(
        name=data.name,
        email=data.email.lower(),
        phone=data.phone,
        hashed_password=hash_password(data.password),
        role=role,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


# ---------- Menu ----------
def get_menu_items(db: Session, skip: int = 0, limit: int = 200):
    return db.query(models.MenuItem).order_by(models.MenuItem.id).offset(skip).limit(limit).all()


def get_menu_item(db: Session, item_id: int):
    return db.query(models.MenuItem).filter(models.MenuItem.id == item_id).first()


def create_menu_item(db: Session, item: schemas.MenuItemCreate):
    db_item = models.MenuItem(**item.model_dump())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item


def update_menu_item(db: Session, item_id: int, item: schemas.MenuItemCreate):
    db_item = db.query(models.MenuItem).filter(models.MenuItem.id == item_id).first()
    if db_item:
        for key, value in item.model_dump().items():
            setattr(db_item, key, value)
        db.commit()
        db.refresh(db_item)
    return db_item


def delete_menu_item(db: Session, item_id: int):
    db_item = db.query(models.MenuItem).filter(models.MenuItem.id == item_id).first()
    if db_item:
        db.delete(db_item)
        db.commit()
    return db_item


def get_categories(db: Session):
    rows = db.query(models.MenuItem.category).distinct().order_by(models.MenuItem.category).all()
    return [r[0] for r in rows if r[0]]


# ---------- Orders ----------
def create_order(db: Session, order: schemas.OrderCreate, customer: models.User | None):
    validated = []
    for item in order.items:
        db_menu_item = db.query(models.MenuItem).filter(models.MenuItem.id == item.menu_item_id).first()
        if db_menu_item is None:
            raise ValueError(f"Menu item with id {item.menu_item_id} does not exist")
        if not db_menu_item.is_available:
            raise ValueError(f"'{db_menu_item.name}' is currently unavailable")
        validated.append((item, db_menu_item))

    db_order = models.Order(
        user_id=customer.id if customer else None,
        order_type=order.order_type,
        table_number=order.table_number,
        delivery_address=order.delivery_address,
        payment_method=order.payment_method,
    )
    db.add(db_order)
    db.commit()
    db.refresh(db_order)

    total_price = 0.0
    for item, db_menu_item in validated:
        price = db_menu_item.price
        total_price += price * item.quantity
        db.add(models.OrderItem(
            order_id=db_order.id,
            menu_item_id=item.menu_item_id,
            quantity=item.quantity,
            price_at_time_of_order=price,
        ))

    gst = round(total_price * 0.05, 2)
    delivery_fee = 30.0 if order.order_type == "Online Delivery" and len(validated) > 0 else 0.0
    grand_total = total_price + gst + delivery_fee

    db_order.total_price = round(grand_total, 2)
    
    if order.payment_method == "COD":
        db_order.payment_status = "Pending"

    db.commit()
    db.refresh(db_order)
    return db_order


def get_orders(db: Session, skip: int = 0, limit: int = 200, user_id: int | None = None):
    q = db.query(models.Order).options(joinedload(models.Order.items).joinedload(models.OrderItem.menu_item))
    if user_id is not None:
        q = q.filter(models.Order.user_id == user_id)
    return q.order_by(models.Order.id.desc()).offset(skip).limit(limit).all()


def get_order(db: Session, order_id: int):
    return db.query(models.Order).options(
        joinedload(models.Order.items).joinedload(models.OrderItem.menu_item)
    ).filter(models.Order.id == order_id).first()


def update_order_status(db: Session, order_id: int, status: str):
    db_order = get_order(db, order_id)
    if db_order:
        db_order.status = status
        db.commit()
        db.refresh(db_order)
    return db_order


def mark_order_paid(db: Session, order_id: int, razorpay_payment_id: str):
    db_order = get_order(db, order_id)
    if db_order:
        db_order.payment_status = models.PaymentStatus.PAID.value
        db_order.razorpay_payment_id = razorpay_payment_id
        if db_order.status == models.OrderStatus.PLACED.value:
            db_order.status = models.OrderStatus.CONFIRMED.value
        db.commit()
        db.refresh(db_order)
    return db_order


def get_dashboard_stats(db: Session):
    from datetime import datetime, timedelta
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

    total_revenue_today = db.query(func.sum(models.Order.total_price)).filter(
        models.Order.created_at >= today_start,
        models.Order.payment_status == models.PaymentStatus.PAID.value,
    ).scalar() or 0.0

    total_revenue_all_time = db.query(func.sum(models.Order.total_price)).filter(
        models.Order.payment_status == models.PaymentStatus.PAID.value
    ).scalar() or 0.0

    orders_by_status = db.query(models.Order.status, func.count(models.Order.id)).group_by(models.Order.status).all()
    status_counts = {status: count for status, count in orders_by_status}

    popular_items = db.query(
        models.MenuItem.name,
        func.sum(models.OrderItem.quantity).label('total_quantity')
    ).join(models.OrderItem, models.MenuItem.id == models.OrderItem.menu_item_id) \
     .group_by(models.MenuItem.id) \
     .order_by(func.sum(models.OrderItem.quantity).desc()) \
     .limit(5).all()

    popular = [{"name": name, "quantity": int(qty)} for name, qty in popular_items]

    orders_today = db.query(func.count(models.Order.id)).filter(models.Order.created_at >= today_start).scalar() or 0

    return {
        "total_revenue_today": round(total_revenue_today, 2),
        "total_revenue_all_time": round(total_revenue_all_time, 2),
        "orders_today": orders_today,
        "orders_by_status": status_counts,
        "popular_items": popular,
    }


def get_recommendations(db: Session, user_id: int):
    # A simple recommendation: Get their most ordered items, and supplement with popular items
    user_orders = db.query(models.OrderItem.menu_item_id, func.sum(models.OrderItem.quantity).label('qty')) \
                    .join(models.Order, models.Order.id == models.OrderItem.order_id) \
                    .filter(models.Order.user_id == user_id) \
                    .group_by(models.OrderItem.menu_item_id) \
                    .order_by(func.sum(models.OrderItem.quantity).desc()) \
                    .limit(5).all()
    
    rec_ids = [item_id for item_id, qty in user_orders]
    
    if len(rec_ids) < 5:
        # Pad with general popular items
        popular = db.query(models.OrderItem.menu_item_id, func.sum(models.OrderItem.quantity).label('qty')) \
                    .group_by(models.OrderItem.menu_item_id) \
                    .order_by(func.sum(models.OrderItem.quantity).desc()) \
                    .limit(10).all()
        for p_id, _ in popular:
            if p_id not in rec_ids:
                rec_ids.append(p_id)
            if len(rec_ids) >= 5:
                break
                
    if not rec_ids:
        # If absolutely no orders exist, just return first 5 menu items
        return db.query(models.MenuItem).limit(5).all()
        
    return db.query(models.MenuItem).filter(models.MenuItem.id.in_(rec_ids)).all()
