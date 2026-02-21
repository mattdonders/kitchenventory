from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from ..models import Location, Item
from ..schemas import LocationOut, LocationCreate, LocationUpdate

router = APIRouter()


@router.get("/locations", response_model=List[LocationOut])
def list_locations(db: Session = Depends(get_db)):
    return db.query(Location).order_by(Location.sort_order).all()


@router.post("/locations", response_model=LocationOut, status_code=201)
def create_location(data: LocationCreate, db: Session = Depends(get_db)):
    if db.query(Location).filter(Location.name == data.name).first():
        raise HTTPException(status_code=409, detail="Location already exists")
    max_order = db.query(func.max(Location.sort_order)).scalar() or 0
    loc = Location(name=data.name, sort_order=max_order + 1)
    db.add(loc)
    db.commit()
    db.refresh(loc)
    return loc


@router.put("/locations/{location_id}", response_model=LocationOut)
def update_location(location_id: int, data: LocationUpdate, db: Session = Depends(get_db)):
    loc = db.query(Location).filter(Location.id == location_id).first()
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")
    conflict = db.query(Location).filter(
        Location.name == data.name, Location.id != location_id
    ).first()
    if conflict:
        raise HTTPException(status_code=409, detail="Location name already in use")
    loc.name = data.name
    db.commit()
    db.refresh(loc)
    return loc


@router.delete("/locations/{location_id}", status_code=204)
def delete_location(location_id: int, db: Session = Depends(get_db)):
    loc = db.query(Location).filter(Location.id == location_id).first()
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")
    count = db.query(Item).filter(Item.location_id == location_id).count()
    if count:
        raise HTTPException(
            status_code=409,
            detail=f"Cannot delete — {count} item{'s' if count != 1 else ''} use this location"
        )
    db.delete(loc)
    db.commit()
