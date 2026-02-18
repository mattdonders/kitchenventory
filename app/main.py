from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from .database import engine, Base
from .seed import seed_data
from .routers import items, categories, locations, shopping, recipes, mealplan


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables and seed data
    Base.metadata.create_all(bind=engine)
    seed_data()
    yield
    # Shutdown (nothing to clean up for SQLite)


app = FastAPI(
    title="Kitchenventory",
    description="Household inventory management with AI recipe suggestions",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(items.router, prefix="/api")
app.include_router(categories.router, prefix="/api")
app.include_router(locations.router, prefix="/api")
app.include_router(shopping.router, prefix="/api")
app.include_router(recipes.router, prefix="/api")
app.include_router(mealplan.router, prefix="/api")

# Serve frontend — must come last
app.mount("/", StaticFiles(directory="static", html=True), name="static")
