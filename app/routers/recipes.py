from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Item
from ..schemas import RecipeRequest
from ..services.recipe_service import get_recipe_suggestions

router = APIRouter()


@router.post("/recipes/suggest")
def suggest_recipes(request: RecipeRequest, db: Session = Depends(get_db)):
    items = db.query(Item).filter(Item.quantity > 0).all()

    if not items:
        raise HTTPException(status_code=400, detail="No items in inventory to suggest recipes from.")

    try:
        recipes = get_recipe_suggestions(items, request.dietary_notes)
        return {"recipes": recipes}
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))
