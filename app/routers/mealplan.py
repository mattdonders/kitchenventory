from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, timedelta

from ..database import get_db
from ..models import MealPlanEntry
from ..schemas import MealPlanEntryCreate, MealPlanEntryUpdate, MealPlanEntryOut

router = APIRouter()


def _week_monday(d: date) -> date:
    """Return the Monday of the week containing d."""
    return d - timedelta(days=d.weekday())


@router.get("/mealplan", response_model=List[MealPlanEntryOut])
def list_meal_plan(
    week: Optional[str] = Query(None, description="ISO date (YYYY-MM-DD) of any day in the desired week; defaults to current week"),
    db: Session = Depends(get_db),
):
    if week:
        try:
            anchor = date.fromisoformat(week)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format; use YYYY-MM-DD")
    else:
        anchor = date.today()

    monday = _week_monday(anchor)
    sunday = monday + timedelta(days=6)

    return (
        db.query(MealPlanEntry)
        .filter(MealPlanEntry.date >= monday, MealPlanEntry.date <= sunday)
        .order_by(MealPlanEntry.date)
        .all()
    )


@router.post("/mealplan", response_model=MealPlanEntryOut, status_code=201)
def create_meal_plan_entry(entry: MealPlanEntryCreate, db: Session = Depends(get_db)):
    existing = db.query(MealPlanEntry).filter(MealPlanEntry.date == entry.date).first()
    if existing:
        raise HTTPException(status_code=409, detail=f"An entry already exists for {entry.date}")

    db_entry = MealPlanEntry(**entry.model_dump())
    db.add(db_entry)
    db.commit()
    db.refresh(db_entry)
    return db_entry


@router.put("/mealplan/{entry_id}", response_model=MealPlanEntryOut)
def update_meal_plan_entry(
    entry_id: int, data: MealPlanEntryUpdate, db: Session = Depends(get_db)
):
    entry = db.query(MealPlanEntry).filter(MealPlanEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Meal plan entry not found")

    for key, value in data.model_dump(exclude_none=True).items():
        setattr(entry, key, value)

    db.commit()
    db.refresh(entry)
    return entry


@router.delete("/mealplan/{entry_id}", status_code=204)
def delete_meal_plan_entry(entry_id: int, db: Session = Depends(get_db)):
    entry = db.query(MealPlanEntry).filter(MealPlanEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Meal plan entry not found")
    db.delete(entry)
    db.commit()
