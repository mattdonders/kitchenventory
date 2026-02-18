from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from ..models import Location
from ..schemas import LocationOut

router = APIRouter()


@router.get("/locations", response_model=List[LocationOut])
def list_locations(db: Session = Depends(get_db)):
    return db.query(Location).order_by(Location.sort_order).all()
