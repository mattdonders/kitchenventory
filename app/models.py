from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Date, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    sort_order = Column(Integer, default=0)

    items = relationship("Item", back_populates="category")


class Location(Base):
    __tablename__ = "locations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    sort_order = Column(Integer, default=0)

    items = relationship("Item", back_populates="location")


class Item(Base):
    __tablename__ = "items"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    quantity = Column(Float, default=1.0)
    unit = Column(String, default="")
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True, index=True)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=True, index=True)
    expiration_date = Column(Date, nullable=True, index=True)
    notes = Column(String, default="")
    low_threshold = Column(Float, default=1.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    category = relationship("Category", back_populates="items", lazy="joined")
    location = relationship("Location", back_populates="items", lazy="joined")


class ShoppingListItem(Base):
    __tablename__ = "shopping_list"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    quantity = Column(Float, default=1.0)
    unit = Column(String, default="")
    is_checked = Column(Boolean, default=False)
    source = Column(String, default="manual")  # "manual" or "auto"
    item_id = Column(Integer, ForeignKey("items.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    item = relationship("Item")


class MealPlanEntry(Base):
    __tablename__ = "meal_plan_entries"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, unique=True, nullable=False, index=True)
    meal_name = Column(String, nullable=False)
    notes = Column(String, default="")
    recipe_id = Column(Integer, nullable=True)  # future-proofing, unused in Phase 1
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
