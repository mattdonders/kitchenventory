from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
import json

from ..database import get_db
from ..models import Item, SavedRecipe, RecipeTag
from ..schemas import (
    RecipeRequest, ParseUrlRequest, ParseHtmlRequest, ParsedRecipe,
    SavedRecipeCreate, SavedRecipeUpdate, SavedRecipeOut, RecipeTagOut
)
from ..services.recipe_service import get_recipe_suggestions
from ..services.scrape_service import scrape_recipe_url, parse_recipe_html

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


@router.post("/recipes/parse-url", response_model=ParsedRecipe)
def parse_url(request: ParseUrlRequest):
    try:
        result = scrape_recipe_url(request.url)
        return ParsedRecipe(**result)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse recipe: {e}")


@router.post("/recipes/parse-html", response_model=ParsedRecipe)
def parse_html(request: ParseHtmlRequest):
    try:
        result = parse_recipe_html(request.html, request.url or "")
        return ParsedRecipe(**result)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse recipe: {e}")


@router.get("/recipes/tags", response_model=list[RecipeTagOut])
def list_tags(db: Session = Depends(get_db)):
    return db.query(RecipeTag).order_by(RecipeTag.sort_order).all()


@router.get("/recipes/saved", response_model=list[SavedRecipeOut])
def list_saved(
    favorite: Optional[bool] = None,
    tag: Optional[str] = None,
    db: Session = Depends(get_db)
):
    q = db.query(SavedRecipe)
    if favorite is not None:
        q = q.filter(SavedRecipe.is_favorite == favorite)
    recipes = q.order_by(SavedRecipe.created_at.desc()).all()
    if tag:
        recipes = [r for r in recipes if tag in json.loads(r.tags or "[]")]
    return recipes


@router.post("/recipes/saved", response_model=SavedRecipeOut, status_code=201)
def save_recipe(recipe: SavedRecipeCreate, db: Session = Depends(get_db)):
    db_recipe = SavedRecipe(
        title=recipe.title,
        url=recipe.url,
        image_url=recipe.image_url,
        total_time=recipe.total_time,
        yields=recipe.yields,
        ingredients=json.dumps(recipe.ingredients),
        instructions=json.dumps(recipe.instructions),
        notes=recipe.notes,
        source=recipe.source,
        is_favorite=recipe.is_favorite,
        tags=json.dumps(recipe.tags),
    )
    db.add(db_recipe)
    db.commit()
    db.refresh(db_recipe)
    return db_recipe


@router.get("/recipes/saved/{recipe_id}", response_model=SavedRecipeOut)
def get_saved(recipe_id: int, db: Session = Depends(get_db)):
    recipe = db.query(SavedRecipe).filter(SavedRecipe.id == recipe_id).first()
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    return recipe


@router.put("/recipes/saved/{recipe_id}", response_model=SavedRecipeOut)
def update_saved(recipe_id: int, update: SavedRecipeUpdate, db: Session = Depends(get_db)):
    recipe = db.query(SavedRecipe).filter(SavedRecipe.id == recipe_id).first()
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    if update.title is not None:
        recipe.title = update.title
    if update.notes is not None:
        recipe.notes = update.notes
    if update.is_favorite is not None:
        recipe.is_favorite = update.is_favorite
    if update.tags is not None:
        recipe.tags = json.dumps(update.tags)
    db.commit()
    db.refresh(recipe)
    return recipe


@router.delete("/recipes/saved/{recipe_id}", status_code=204)
def delete_saved(recipe_id: int, db: Session = Depends(get_db)):
    recipe = db.query(SavedRecipe).filter(SavedRecipe.id == recipe_id).first()
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    db.delete(recipe)
    db.commit()
    return None
