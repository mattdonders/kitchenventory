from pydantic import BaseModel, computed_field, field_validator
from typing import Optional, List
from datetime import date, datetime


class CategoryOut(BaseModel):
    id: int
    name: str
    sort_order: int

    model_config = {"from_attributes": True}


class LocationOut(BaseModel):
    id: int
    name: str
    sort_order: int

    model_config = {"from_attributes": True}


class ItemBase(BaseModel):
    name: str
    quantity: float = 1.0
    unit: str = ""
    category_id: Optional[int] = None
    location_id: Optional[int] = None
    expiration_date: Optional[date] = None
    notes: str = ""
    low_threshold: float = 1.0


class ItemCreate(ItemBase):
    pass


class ItemUpdate(ItemBase):
    pass


class ItemOut(ItemBase):
    id: int
    category: Optional[CategoryOut] = None
    location: Optional[LocationOut] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    @computed_field
    @property
    def is_low(self) -> bool:
        return self.quantity <= self.low_threshold

    @computed_field
    @property
    def is_expired(self) -> bool:
        if self.expiration_date is None:
            return False
        return self.expiration_date < date.today()

    @computed_field
    @property
    def is_expiring_soon(self) -> bool:
        if self.expiration_date is None:
            return False
        days = (self.expiration_date - date.today()).days
        return 0 <= days <= 7

    model_config = {"from_attributes": True}


class QuantityAdjust(BaseModel):
    delta: float


class ParseListRequest(BaseModel):
    text: str


class ParsedItem(BaseModel):
    name: str
    quantity: float = 1.0
    unit: str = ""
    category: str = ""


class ItemBulkCreate(BaseModel):
    items: List[ItemCreate]

    @field_validator('items')
    @classmethod
    def max_50_items(cls, v):
        if len(v) > 50:
            raise ValueError('Cannot create more than 50 items at once')
        return v


class ShoppingItemBase(BaseModel):
    name: str
    quantity: float = 1.0
    unit: str = ""
    source: str = "manual"
    item_id: Optional[int] = None


class ShoppingItemCreate(ShoppingItemBase):
    pass


class ShoppingItemUpdate(BaseModel):
    name: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    is_checked: Optional[bool] = None


class ShoppingItemOut(ShoppingItemBase):
    id: int
    is_checked: bool = False
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class RecipeRequest(BaseModel):
    dietary_notes: str = ""


class MealPlanEntryBase(BaseModel):
    meal_name: str
    notes: str = ""


class MealPlanEntryCreate(MealPlanEntryBase):
    date: date  # YYYY-MM-DD


class MealPlanEntryUpdate(BaseModel):
    meal_name: Optional[str] = None
    notes: Optional[str] = None


class MealPlanEntryOut(MealPlanEntryBase):
    id: int
    date: date
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class ParseUrlRequest(BaseModel):
    url: str


class ParseHtmlRequest(BaseModel):
    html: str
    url: Optional[str] = None  # original URL for context (optional)


class ParsedRecipe(BaseModel):
    title: str
    url: Optional[str] = None
    image_url: Optional[str] = None
    total_time: Optional[str] = None
    yields: Optional[str] = None
    ingredients: List[str] = []
    instructions: List[str] = []
    source: str = "url"


class SavedRecipeCreate(BaseModel):
    title: str
    url: Optional[str] = None
    image_url: Optional[str] = None
    total_time: Optional[str] = None
    yields: Optional[str] = None
    ingredients: List[str] = []
    instructions: List[str] = []
    notes: str = ""
    source: str = "manual"
    is_favorite: bool = False
    tags: List[str] = []


class SavedRecipeUpdate(BaseModel):
    title: Optional[str] = None
    notes: Optional[str] = None
    is_favorite: Optional[bool] = None
    tags: Optional[List[str]] = None


class SavedRecipeOut(BaseModel):
    id: int
    title: str
    url: Optional[str] = None
    image_url: Optional[str] = None
    total_time: Optional[str] = None
    yields: Optional[str] = None
    ingredients: List[str] = []
    instructions: List[str] = []
    notes: str = ""
    source: str = "manual"
    is_favorite: bool = False
    tags: List[str] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    @field_validator('ingredients', 'instructions', mode='before')
    @classmethod
    def parse_json_list(cls, v):
        if isinstance(v, str):
            import json
            return json.loads(v)
        return v or []

    @field_validator('tags', mode='before')
    @classmethod
    def parse_json_tags(cls, v):
        if isinstance(v, str):
            import json
            return json.loads(v)
        return v or []

    model_config = {"from_attributes": True}


class RecipeTagOut(BaseModel):
    id: int
    name: str
    slug: str
    sort_order: int

    model_config = {"from_attributes": True}
