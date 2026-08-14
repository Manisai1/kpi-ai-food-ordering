"""
Populates the database with a starter menu, a default admin account, and a
demo customer so the app isn't empty on first run.

Usage (from the backend/ directory, with the venv active):
    python seed_data.py
"""
import os
from database import SessionLocal, engine, Base
import models
from auth import hash_password
from config import DEFAULT_ADMIN_EMAIL, DEFAULT_ADMIN_PASSWORD
from ai_search import generate_embedding
import json

MENU = [
    # name, description, category, price, dietary_tag, image_url
    ("Paneer Tikka", "Grilled cottage cheese marinated in smoky tandoori spices", "Starters", 180.0, models.DietaryTag.SPICY.value, "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=600&auto=format&fit=crop"),
    ("Chicken 65", "Deep-fried spicy chicken bites tossed in curry leaves and chilli", "Starters", 220.0, models.DietaryTag.NON_VEGETARIAN.value, "https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?w=600&auto=format&fit=crop"),
    ("Veg Spring Rolls", "Crispy rolls stuffed with lightly spiced mixed vegetables", "Starters", 150.0, models.DietaryTag.VEGETARIAN.value, "https://vegecravings.com/wp-content/uploads/2016/09/spring-roll-recipe-step-by-step-instructions.jpg"),
    ("Corn Chaat", "Steamed sweet corn tossed with lime, chaat masala and herbs", "Starters", 120.0, models.DietaryTag.VEGETARIAN.value, "https://images.unsplash.com/photo-1626844131082-256783844137?w=600&auto=format&fit=crop"),
    ("Dal Tadka", "Yellow lentils tempered with cumin, garlic and ghee", "Main Course", 160.0, models.DietaryTag.VEGETARIAN.value, "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600&auto=format&fit=crop"),
    ("Butter Chicken", "Creamy tomato-based curry with tender chicken pieces", "Main Course", 260.0, models.DietaryTag.NON_VEGETARIAN.value, "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=600&auto=format&fit=crop"),
    ("Paneer Butter Masala", "Cottage cheese cubes in a rich, mildly spiced tomato gravy", "Main Course", 210.0, models.DietaryTag.VEGETARIAN.value, "https://pipingpotcurry.com/wp-content/uploads/2025/07/Instant-pot-paneer-butter-masala-PipingPotCurry.jpg"),
    ("Chilli Garlic Noodles", "Wok-tossed noodles with a fiery chilli-garlic kick", "Main Course", 190.0, models.DietaryTag.SPICY.value, "https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=600&auto=format&fit=crop"),
    ("Egg Curry", "Boiled eggs simmered in a lightly spiced onion-tomato gravy", "Main Course", 170.0, models.DietaryTag.NON_VEGETARIAN.value, "https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=600&auto=format&fit=crop"),
    ("Veg Pulao", "Fragrant basmati rice cooked with seasonal vegetables, lightly spiced", "Main Course", 150.0, models.DietaryTag.VEGETARIAN.value, "https://images.unsplash.com/photo-1596797038530-2c107229654b?w=600&auto=format&fit=crop"),
    ("Grilled Fish Curry", "Light, steamed-then-grilled fish in a tangy coconut curry, not fried", "Main Course", 280.0, models.DietaryTag.NON_VEGETARIAN.value, "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600&auto=format&fit=crop"),
    ("Mutton Rogan Josh", "Slow-cooked mutton in a rich, spicy Kashmiri curry", "Main Course", 320.0, models.DietaryTag.SPICY.value, "https://kagomeindia.com/wp-content/uploads/2024/07/3-2.jpg"),
    ("Gulab Jamun", "Soft milk-solid dumplings soaked in rose-scented sugar syrup", "Desserts", 90.0, models.DietaryTag.VEGETARIAN.value, "https://images.unsplash.com/photo-1551024601-bec78aea704b?w=600&auto=format&fit=crop"),
    ("Chocolate Brownie", "Warm fudgy brownie served with a scoop of vanilla ice cream", "Desserts", 140.0, models.DietaryTag.VEGETARIAN.value, "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600&auto=format&fit=crop"),
    ("Rasmalai", "Soft cottage cheese discs soaked in chilled, cardamom-spiced milk", "Desserts", 110.0, models.DietaryTag.VEGETARIAN.value, "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&auto=format&fit=crop"),
    ("Masala Chai", "Classic spiced Indian tea brewed with milk", "Beverages", 40.0, models.DietaryTag.VEGETARIAN.value, "https://www.jcookingodyssey.com/wp-content/uploads/2026/04/masala-chai.jpg"),
    ("Fresh Lime Soda", "Light and refreshing soda with fresh lime, sweet or salted", "Beverages", 60.0, models.DietaryTag.VEGETARIAN.value, "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&auto=format&fit=crop"),
    ("Mango Lassi", "Chilled yogurt smoothie blended with sweet mango pulp", "Beverages", 80.0, models.DietaryTag.VEGETARIAN.value, "https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=600&auto=format&fit=crop"),
    ("Cold Coffee", "Blended chilled coffee topped with a scoop of ice cream", "Beverages", 90.0, models.DietaryTag.VEGETARIAN.value, "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=600&auto=format&fit=crop"),
]


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if db.query(models.MenuItem).count() == 0:
            for name, description, category, price, dietary_tag, image_url in MENU:
                # Optionally generate embeddings if OPENROUTER_API_KEY is available
                text_to_embed = f"{name} {description} {category} {dietary_tag}"
                embedding_vector = generate_embedding(text_to_embed)
                embedding_str = json.dumps(embedding_vector) if embedding_vector else None

                db.add(models.MenuItem(
                    name=name, description=description, category=category, price=price,
                    dietary_tag=dietary_tag, image_url=image_url, is_available=True,
                    embedding=embedding_str
                ))
            db.commit()
            print(f"Seeded {len(MENU)} menu items.")
        else:
            print("Menu already has items — skipping menu seed.")

        if not db.query(models.User).filter(models.User.role == models.UserRole.ADMIN.value).first():
            db.add(models.User(
                name="Restaurant Admin",
                email=DEFAULT_ADMIN_EMAIL.lower(),
                hashed_password=hash_password(DEFAULT_ADMIN_PASSWORD),
                role=models.UserRole.ADMIN.value,
            ))
            db.commit()
            print(f"Created default admin: {DEFAULT_ADMIN_EMAIL} / {DEFAULT_ADMIN_PASSWORD}")
        else:
            print("Admin account already exists — skipping.")

        if not db.query(models.User).filter(models.User.email == "customer@demo.com").first():
            db.add(models.User(
                name="Demo Customer",
                email="customer@demo.com",
                phone="9876543210",
                hashed_password=hash_password("Demo@123"),
                role=models.UserRole.CUSTOMER.value,
            ))
            db.commit()
            print("Created demo customer: customer@demo.com / Demo@123")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
