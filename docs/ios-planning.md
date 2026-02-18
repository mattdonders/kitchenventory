# Kitchenventory iOS — Planning Notes

> Lessons and design decisions captured from building the web MVP.
> Update this as you use the web app and discover what matters most.

---

## What Worked Well (Keep for iOS)

### UX Patterns
- **Location pills** — tapping a location to filter is intuitive and fast. Replicate as a segmented control or horizontal scroll of capsule buttons.
- **Quick-add mode** — persistent category/location between adds is a huge friction reducer for bulk entry. Make this the default on iOS.
- **Autocomplete from local cache** — zero-latency suggestions from already-loaded data feels instant. On iOS, implement with a `UISearchController` or custom dropdown driven by the in-memory store.
- **Grouped cards by item name** — "Milk (2 locations)" is more useful than two separate rows. Use a section header or expandable cell in a `UITableView` / `List` in SwiftUI.
- **+/- quantity debounce** — batch rapid taps into one write. Critical for feel on iOS where taps are even faster. Use a `DispatchWorkItem` with a 500ms delay.
- **Low stock / expiration badges** — these are the whole value prop. Surface them prominently (widget, notification, badge count on app icon).

### Data Model (translates directly)
```
Item
  - name: String
  - quantity: Double
  - unit: String
  - categoryId: UUID?
  - locationId: UUID?
  - expirationDate: Date?
  - notes: String
  - lowThreshold: Double
  - createdAt: Date
  - updatedAt: Date

Category
  - name: String
  - sortOrder: Int
  - icon: String (SF Symbol name)

Location
  - name: String
  - sortOrder: Int
```

### Features Worth Keeping
- Auto-suggest for shopping list (items below low threshold)
- Recipe suggestions via Claude API (works great as an async operation)
- Export shopping list as text / share sheet

---

## iOS-Specific Enhancements (Priority Order)

### P0 — Core differentiators
- **Barcode scanner** — AVFoundation or VisionKit. Scan a UPC → auto-fill name, unit, category via Open Food Facts API or similar. This alone makes iOS worth building.
- **Camera for item photos** — attach a photo to each item for visual inventory browsing.
- **Home screen widget** — show items expiring soon and low-stock count. `WidgetKit` small/medium widget.
- **CloudKit sync** — multi-device sync (phone + iPad + family members). Use `NSPersistentCloudKitContainer` for near-zero-effort sync over Core Data.

### P1 — Quality of life
- **Siri Shortcuts** — "Add milk to inventory", "What's expiring this week?", "Add eggs to shopping list".
- **Push notifications** — daily digest: "3 items expire in the next 7 days". `UNUserNotificationCenter` with a background refresh.
- **Haptic feedback** — light tap on +/-, success pattern on add. `UIImpactFeedbackGenerator`.
- **Swipe actions** — swipe left to delete, swipe right to add to shopping list.
- **Share sheet** — export full inventory as CSV or share shopping list as plain text.

### P2 — Nice to have
- **Meal planning calendar** — tie recipes to specific days.
- **Nutritional info** — look up via Open Food Facts when scanning barcode.
- **Multi-household** — separate CloudKit containers per household, shareable via iCloud family.
- **Dark mode** — comes free with SwiftUI system colors; just use semantic colors from day one.

---

## Architecture Decisions for iOS

### Local-first, sync second
- Store everything in Core Data locally. Sync to CloudKit in the background.
- Never block the UI on a network call. All writes are local-first; sync is eventual.
- Matches user expectation: the pantry should work offline in a dead zone.

### SwiftUI over UIKit
- The web app's card-based UI maps naturally to SwiftUI `List` + custom `ViewBuilder` cells.
- Use `@Query` (SwiftData) or `@FetchRequest` (Core Data) for reactive list updates.
- `NavigationStack` for inventory → item detail → edit flow.

### No backend required (v1)
- The web app needed a FastAPI backend for the AI recipes endpoint only.
- On iOS, call the Anthropic API directly from the app (or via a simple serverless function).
- Everything else is local + CloudKit.

### State management
- The web app used a single `App.state` object with manual cache invalidation.
- On iOS: use `@Observable` (iOS 17+) or `ObservableObject` for a single `InventoryStore`.
- `InventoryStore` owns all items, categories, locations; views observe it reactively.

---

## Friction Points in the Web App (Fix on iOS)

| Web friction | iOS solution |
|---|---|
| Manual name typing for every item | Barcode scanner fills it in |
| No images | Camera attachment per item |
| No offline mode | Core Data local-first |
| Shopping list is manual copy-paste to share | Native Share Sheet |
| No notifications | Push via UNUserNotificationCenter |
| Expiration dates are easy to miss | Widget + badge count on icon |
| Quick-add still requires typing | Barcode + autocomplete from history |

---

## API / Backend Reuse

If you keep the FastAPI backend (e.g. for households that want web access too):
- The REST API is already clean — iOS can consume it directly with `URLSession` or `Alamofire`.
- Add JWT auth (`python-jose`) and a `User` model before shipping multi-user.
- The `/api/items/bulk` endpoint is useful for initial import from iOS (scan a bunch of items → bulk POST).
- Consider a `/api/sync` endpoint that accepts a full item list and returns a diff (for CloudKit conflict resolution fallback).

---

## Open Questions

- [ ] Should iOS be a paid app or free with iCloud sync as a premium tier?
- [ ] Target iOS 16+ (SwiftData) or iOS 15+ (Core Data)?
- [ ] Single user or multi-household from day one?
- [ ] Barcode database: Open Food Facts (free/open) vs Nutritionix (paid but richer)?
- [ ] Share the same Claude API key or have users bring their own?
