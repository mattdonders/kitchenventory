# Kitchenventory — Claude Code Instructions

## Project Overview
Household inventory management web app. FastAPI backend + vanilla JS SPA frontend.
No JS framework, no CSS framework — everything is hand-rolled.

## Tech Stack
- **Backend**: Python 3.11+, FastAPI, SQLAlchemy (SQLite), Pydantic v2, Anthropic SDK
- **Frontend**: HTML5, CSS3 (mobile-first), Vanilla JS ES6 modules (IIFE pattern)
- **Database**: SQLite (`data/kitchenventory.db`, gitignored)
- **AI**: claude-haiku-4-5-20251001 for recipe suggestions

## Running the App
```bash
source .venv/bin/activate  # or your venv path
python run.py              # starts uvicorn on :8000 with hot reload
```

## Key Files
- `app/main.py` — FastAPI app, lifespan, middleware, router registration
- `app/models.py` — SQLAlchemy ORM models (4 tables)
- `app/schemas.py` — Pydantic request/response models with computed fields
- `app/seed.py` — Seeds categories and locations on first run
- `app/routers/` — One file per resource group
- `app/services/recipe_service.py` — Anthropic API call + prompt
- `static/js/app.js` — SPA router, global state, init
- `static/js/api.js` — All fetch calls to backend
- `static/js/views/` — One file per view (inventory, itemForm, shopping, recipes)
- `static/js/components/` — Shared UI (nav, toast, modal)

## Architecture Decisions
- **SPA routing**: Hash-based, no framework. `App.navigate(viewId, state)` is the entry point.
- **Global state**: `App.state` holds cached items/categories/locations to reduce API calls.
- **IIFE modules**: Each JS file exports a single object (e.g., `InventoryView`, `API`, `Toast`).
- **Static serving**: FastAPI serves `static/` at `/` — API is at `/api/`.
- **Route ordering**: In `shopping.py`, specific routes (auto-suggest, export, checked) MUST come before `/{item_id}` to avoid FastAPI treating them as path params.

## Computed Fields
`ItemOut` schema has three computed fields (Pydantic v2 `@computed_field`):
- `is_low`: quantity <= low_threshold
- `is_expired`: expiration_date < today
- `is_expiring_soon`: expiration_date within 7 days

## Environment Variables
- `ANTHROPIC_API_KEY` — Required for recipe suggestions
- `DATABASE_URL` — Default: `sqlite:///./data/kitchenventory.db`

## Conventions
- Python: snake_case, type hints everywhere
- JS: camelCase, IIFE modules with `const Module = (() => { ... return {...} })()`
- CSS: BEM-ish class names, CSS variables for theming
- No TypeScript, no bundler — keep it simple

## Testing
- API docs: http://localhost:8000/docs
- Frontend: http://localhost:8000
