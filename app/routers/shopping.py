from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from ..models import ShoppingListItem, Item
from ..schemas import ShoppingItemCreate, ShoppingItemUpdate, ShoppingItemOut

router = APIRouter()


@router.get("/shopping", response_model=List[ShoppingItemOut])
def list_shopping(db: Session = Depends(get_db)):
    return (
        db.query(ShoppingListItem)
        .order_by(ShoppingListItem.is_checked, ShoppingListItem.created_at)
        .all()
    )


@router.post("/shopping", response_model=ShoppingItemOut, status_code=201)
def add_shopping_item(item: ShoppingItemCreate, db: Session = Depends(get_db)):
    db_item = ShoppingListItem(**item.model_dump())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item


# Specific routes MUST come before /{item_id} to avoid route conflicts
@router.post("/shopping/auto-suggest", response_model=List[ShoppingItemOut])
def auto_suggest(db: Session = Depends(get_db)):
    low_items = db.query(Item).filter(Item.quantity <= Item.low_threshold).all()

    added = []
    for item in low_items:
        existing = (
            db.query(ShoppingListItem)
            .filter(
                ShoppingListItem.name == item.name,
                ShoppingListItem.is_checked == False,
            )
            .first()
        )
        if not existing:
            shopping_item = ShoppingListItem(
                name=item.name,
                quantity=max(item.low_threshold, 1.0),
                unit=item.unit,
                source="auto",
                item_id=item.id,
            )
            db.add(shopping_item)
            added.append(shopping_item)

    db.commit()
    for item in added:
        db.refresh(item)

    return added


@router.get("/shopping/export")
def export_shopping_list(db: Session = Depends(get_db)):
    items = (
        db.query(ShoppingListItem)
        .filter(ShoppingListItem.is_checked == False)
        .order_by(ShoppingListItem.created_at)
        .all()
    )

    lines = ["Shopping List", "=" * 40, ""]
    for item in items:
        qty_str = f"{item.quantity} {item.unit}".strip() if item.unit else str(item.quantity)
        lines.append(f"[ ] {item.name} ({qty_str})" if item.unit else f"[ ] {item.name} x{item.quantity}")

    return {"text": "\n".join(lines)}


@router.delete("/shopping/checked", status_code=204)
def clear_checked(db: Session = Depends(get_db)):
    db.query(ShoppingListItem).filter(ShoppingListItem.is_checked == True).delete()
    db.commit()


@router.put("/shopping/{item_id}", response_model=ShoppingItemOut)
def update_shopping_item(
    item_id: int, item_data: ShoppingItemUpdate, db: Session = Depends(get_db)
):
    item = db.query(ShoppingListItem).filter(ShoppingListItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Shopping item not found")

    for key, value in item_data.model_dump(exclude_none=True).items():
        setattr(item, key, value)

    db.commit()
    db.refresh(item)
    return item


@router.delete("/shopping/{item_id}", status_code=204)
def delete_shopping_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(ShoppingListItem).filter(ShoppingListItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Shopping item not found")
    db.delete(item)
    db.commit()
