from .database import SessionLocal
from .models import Category, Location, RecipeTag

CATEGORIES = [
    ("dairy", 0),
    ("produce", 1),
    ("meat", 2),
    ("frozen", 3),
    ("dry goods", 4),
    ("snacks", 5),
    ("beverages", 6),
    ("condiments", 7),
    ("leftovers", 8),
    ("other", 9),
]

LOCATIONS = [
    ("Kitchen Fridge", 0),
    ("Kitchen Freezer", 1),
    ("Garage Fridge", 2),
    ("Garage Freezer", 3),
    ("Kitchen Pantry", 4),
    ("Office Pantry", 5),
]

RECIPE_TAGS = [
    ("Family Favorites", "family-favorites", 0),
    ("Quick & Easy", "quick-easy", 1),
    ("One-Pan", "one-pan", 2),
    ("Crock Pot", "crock-pot", 3),
    ("Meal Prep", "meal-prep", 4),
    ("Weeknight", "weeknight", 5),
    ("Weekend", "weekend", 6),
    ("Grilling", "grilling", 7),
]


def seed_data():
    db = SessionLocal()
    try:
        if db.query(Category).count() == 0:
            for name, order in CATEGORIES:
                db.add(Category(name=name, sort_order=order))

        if db.query(Location).count() == 0:
            for name, order in LOCATIONS:
                db.add(Location(name=name, sort_order=order))

        if db.query(RecipeTag).count() == 0:
            for name, slug, order in RECIPE_TAGS:
                db.add(RecipeTag(name=name, slug=slug, sort_order=order))

        db.commit()
    finally:
        db.close()
