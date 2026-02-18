# Kitchenventory TODO

## MVP Features

### Backend
- [x] FastAPI app with lifespan (DB create + seed)
- [x] SQLAlchemy models: Category, Location, Item, ShoppingListItem
- [x] Pydantic schemas with computed fields (is_low, is_expired, is_expiring_soon)
- [x] Items CRUD + quantity adjust endpoint
- [x] Categories + Locations read endpoints
- [x] Shopping list CRUD + auto-suggest + export + clear-checked
- [x] Recipe suggestions via Anthropic claude-haiku-4-5-20251001
- [x] Seed data (10 categories, 6 locations)

### Frontend
- [x] Mobile-first SPA with vanilla JS (no framework)
- [x] Bottom nav (mobile) / sidebar nav (desktop)
- [x] Inventory view: search, location filter chips, item cards, +/- quantity
- [x] Status badges: low stock, expiring soon, expired
- [x] Add/Edit item form with category+location pills, localStorage persistence
- [x] Shopping list: manual add, auto-suggest, check/uncheck, export, clear
- [x] Recipe suggestions view with expandable recipe cards
- [x] Toast notifications
- [x] Confirm modal dialogs
- [x] Responsive: mobile / tablet / desktop layouts

## Post-MVP Enhancements
- [ ] Barcode scanner integration (mobile camera)
- [ ] Push notifications for expiring items
- [ ] Multi-household support / user accounts
- [ ] Import/export inventory (CSV)
- [ ] Item image upload
- [ ] Dark mode
- [ ] PWA / installable app
- [ ] Shopping list sharing (share link or URL)
- [ ] Nutritional info lookup
- [ ] Meal planning calendar

## Bugs / Polish
- [ ] Add autocomplete on item name (from existing items)
- [ ] Quantity adjust should debounce rapid clicks
- [ ] Shopping list: inline quantity editing
- [ ] Recipe view: save favorites

## Completed
- [x] Initial MVP implementation
