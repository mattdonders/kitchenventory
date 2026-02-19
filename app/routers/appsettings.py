from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict

from ..database import get_db
from ..models import AppSetting
from ..schemas import AppSettingUpdate

router = APIRouter()


@router.get("/settings", response_model=Dict[str, str])
def get_settings(db: Session = Depends(get_db)):
    rows = db.query(AppSetting).all()
    return {row.key: row.value for row in rows}


@router.patch("/settings/{key}", response_model=Dict[str, str])
def update_setting(key: str, data: AppSettingUpdate, db: Session = Depends(get_db)):
    setting = db.query(AppSetting).filter(AppSetting.key == key).first()
    if not setting:
        raise HTTPException(status_code=404, detail=f"Setting '{key}' not found")
    setting.value = data.value
    db.commit()
    rows = db.query(AppSetting).all()
    return {row.key: row.value for row in rows}
