from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import date, timedelta

from ..database import get_db
from ..models import Item
from ..schemas import ItemCreate, ItemUpdate, ItemOut, QuantityAdjust, ItemBulkCreate

router = APIRouter()


@router.get("/items", response_model=List[ItemOut])
def list_items(
    db: Session = Depends(get_db),
    category_id: Optional[int] = Query(None),
    location_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    low_only: bool = Query(False),
    expiring_days: Optional[int] = Query(None),
):
    query = db.query(Item)

    if category_id:
        query = query.filter(Item.category_id == category_id)
    if location_id:
        query = query.filter(Item.location_id == location_id)
    if search:
        query = query.filter(Item.name.ilike(f"%{search}%"))
    if low_only:
        query = query.filter(Item.quantity <= Item.low_threshold)
    if expiring_days is not None:
        cutoff = date.today() + timedelta(days=expiring_days)
        query = query.filter(
            Item.expiration_date <= cutoff,
            Item.expiration_date >= date.today(),
        )

    return query.order_by(Item.name).all()


@router.post("/items", response_model=ItemOut, status_code=201)
def create_item(item: ItemCreate, db: Session = Depends(get_db)):
    db_item = Item(**item.model_dump())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item


@router.post("/items/bulk", response_model=List[ItemOut], status_code=201)
def bulk_create_items(payload: ItemBulkCreate, db: Session = Depends(get_db)):
    db_items = []
    for item_data in payload.items:
        db_item = Item(**item_data.model_dump())
        db.add(db_item)
        db_items.append(db_item)
    db.commit()
    for db_item in db_items:
        db.refresh(db_item)
    return db_items


@router.get("/items/{item_id}", response_model=ItemOut)
def get_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item


@router.put("/items/{item_id}", response_model=ItemOut)
def update_item(item_id: int, item_data: ItemUpdate, db: Session = Depends(get_db)):
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    for key, value in item_data.model_dump().items():
        setattr(item, key, value)

    db.commit()
    db.refresh(item)
    return item


@router.delete("/items/{item_id}", status_code=204)
def delete_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    db.delete(item)
    db.commit()


@router.patch("/items/{item_id}/quantity", response_model=ItemOut)
def adjust_quantity(item_id: int, adjust: QuantityAdjust, db: Session = Depends(get_db)):
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    item.quantity = max(0.0, item.quantity + adjust.delta)
    db.commit()
    db.refresh(item)
    return item
