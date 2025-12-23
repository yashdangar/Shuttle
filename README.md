I'll scan the Convex functions for query/mutation definitions to find list endpoints without pagination. I'll search for exported query/mutation functions and then inspect ones returning arrays without limit params.

Searched for text `export function`, 20 results

Searched for text `query(` (`**/convex/**`), 20 results

Read [](file:///Users/devitaliya/Documents/Code/Shuttle-2/convex/chats/index.ts#1-1), lines 1 to 500

Read [](file:///Users/devitaliya/Documents/Code/Shuttle-2/convex/chats/index.ts#500-500), lines 500 to 937

Searched for text `.collect()` (`**/convex/**`), 20 results

Searched for text `export const` (`**/convex/**`), 20 results

Read [](file:///Users/devitaliya/Documents/Code/Shuttle-2/convex/notifications/index.ts)

Read [](file:///Users/devitaliya/Documents/Code/Shuttle-2/convex/users/index.ts#1-1), lines 1 to 260

Read [](file:///Users/devitaliya/Documents/Code/Shuttle-2/convex/users/index.ts#260-260), lines 260 to 620

Read [](file:///Users/devitaliya/Documents/Code/Shuttle-2/convex/users/index.ts#620-620), lines 620 to 628

Read [](file:///Users/devitaliya/Documents/Code/Shuttle-2/convex/routes/index.ts)

Read [](file:///Users/devitaliya/Documents/Code/Shuttle-2/convex/shuttles/index.ts#1-1), lines 1 to 220

Read [](file:///Users/devitaliya/Documents/Code/Shuttle-2/convex/shuttles/queries.ts)

Read [](file:///Users/devitaliya/Documents/Code/Shuttle-2/convex/routeInstances/queries.ts)

Read [](file:///Users/devitaliya/Documents/Code/Shuttle-2/convex/shuttles/mutations.ts)

Searched for text `.collect();` (`**/convex/**`), 100 results

Read [](file:///Users/devitaliya/Documents/Code/Shuttle-2/convex/tripInstances/queries.ts)

Read [](file:///Users/devitaliya/Documents/Code/Shuttle-2/convex/trips/index.ts#1-1), lines 1 to 560

Read [](file:///Users/devitaliya/Documents/Code/Shuttle-2/convex/locations/index.ts#1-1), lines 1 to 520

Read [](file:///Users/devitaliya/Documents/Code/Shuttle-2/convex/tripInstances/mutations.ts#1-1), lines 1 to 220

Plan:
- I scanned the convex functions for queries/mutations that fetch large collections with `.collect()` or return unbounded arrays.
- Below I list the endpoints that should be reviewed for pagination (grouped by priority), why, and a short recommended fix.

High priority (likely to return unbounded/large lists — add pagination or batching)
- index.ts — `getChatsForUser`
  - Why: collects all messages for unread-count calculation (`.collect()` on `messages`) for every chat; returns full chat list to client.
  - Fix: avoid collecting all messages per chat. Use indexed queries with `.take()` / `.paginate()` or maintain unread counts on the chat/user records; add `limit`+`cursor` to chat listing if UI supports it.
- index.ts — `getChattableUsers`
  - Why: multiple `.collect()` calls returning full user lists (superadmins, drivers, frontdesks, etc.) and returns `filteredUsers` array to client.
  - Fix: add `limit` + `cursor` args and use `ctx.db.query(...).paginate(...)` or `.take(n)` with sensible defaults. Alternatively, search-backed endpoints should use a single indexed query + paginate.
- index.ts — `markMessagesAsViewed` (mutation)
  - Why: collects ALL messages for a chat, then patches them — unbounded work and heavy DB/compute on large chats.
  - Fix: perform updates in pages (paginate through messages), or maintain per-message indexed unread flag and update only a limited batch per call; or implement server-side batched updates with cursor.
- index.ts — `markAllNotificationsRead`
  - Why: `.collect()` of unread notifications then patches all — can be large.
  - Fix: paginate the `.collect()` loop or add a server-side bulk update that uses `paginate()` and processes in batches.
- index.ts — `clearAllNotifications`
  - Why: `.collect()` of all notifications then deletes — unbounded deletes.
  - Fix: process via pagination/batches (use `.paginate()` or loop with `.take()`).

Medium priority (list endpoints used by UI but may grow)
- index.ts — `listHotelTrips`
  - Why: returns all trips for a hotel via `.collect()` and maps `formatTrip` for each — unbounded payload to client.
  - Fix: add `limit` + `cursor` (server-side cursor) or use `ctx.db.query(...).paginate(...)` and return `nextCursor`.
- queries.ts — `getHotelShuttles`
  - Why: `.collect()` returns all shuttles for a hotel and does additional per-shuttle lookups.
  - Fix: add pagination or use an indexed `.paginate()` to avoid returning huge arrays.
- queries.ts — `getAvailableShuttlesForDriver`
  - Why: `.collect()` + multiple nested `.collect()` per shuttle; can be expensive if many shuttles/tripInstances.
  - Fix: add pagination/filtering or limit to active subset; use targeted indexed queries and paginate nested queries where needed.
- queries.ts — `getDriverTripInstances`
  - Why: collects all shuttles, then collects all tripInstances per shuttle and returns full assembled list.
  - Fix: add `limit` + `cursor` or date-range limits and paginate results before returning to client.
- queries.ts — `getTripInstancesByShuttleAndDate`, `getInProgressTripInstances`, `getTripInstanceAvailability`, etc.
  - Why: many `.collect()` calls and mapping/aggregation across potentially large sets.
  - Fix: where results are lists returned to clients, add pagination or accept filters (date ranges, status) and use `.paginate()`.

Lower priority / internal but worth hardening
- index.ts — `getRoutesByTrip` / `getRoutesByTripInternal` / `getTripStops`
  - Why: `.collect()` routes per trip; trips typically small, but could be many routes for some trips.
  - Fix: probably OK as-is for small route lists; if routes can grow, use `.paginate()` or ensure result size check.
- `convex/routeInstances/*` and `convex/lib/*` (slotFinder, seatCalculator, routeUtils)
  - Why: many `.collect()` uses inside server-side helpers; often used for calculations. These are internal but can be heavy.
  - Fix: if these helpers run on large datasets (e.g., all tripInstances, all bookings), switch to batched processing or more selective indexed queries; consider `paginate()` for batch processing.
- index.ts — `findShuttleByVehicleNumber`
  - Why: `.collect()` of shuttles to find by vehicle number — inefficient and can scan many rows.
  - Fix: add an index on `vehicleNumber` or use an indexed query (e.g., `.withIndex("by_hotel_vehicle", ...)`) or at least `.take()`/paginate instead of collect.
- index.ts — endpoints that call `.collect()` inside heavy availability checks (e.g., `getAvailableSlotsForTrip`, `getSlotCapacity`)
  - Why: these compute-intensive endpoints iterate many collections; not direct UI-lists but risk heavy reads.
  - Fix: optimize with targeted indices, break into smaller queries, or add time/size limits.

Notes & recommended patterns (short)
- Prefer `ctx.db.query(...).paginate({ numItems, cursor })` for client-facing list endpoints; return `page` + `continueCursor`/`isDone` or `nextCursor`.
- For server-side batch work (bulk update/delete), process in loops using `paginate()` (or `.take()` repeatedly) instead of a single `.collect()`.
- Avoid `.collect()` for anything that can grow arbitrarily (users, messages, bookings, notifications, trips/shuttles for large hotels).
- For unread-count computations, prefer maintaining counters on chat/user docs or use an indexed `.query(...).take(1)` + counts via aggregations if supported, rather than collecting full message lists.
- If you want, I can:
  - produce a PR that converts selected endpoints to use `paginate()` and cursor args, or
  - generate a compact checklist of specific code changes per function (e.g., add `limit`+`cursor` args and replace `.collect()` with `.paginate()`), or
  - implement the highest-priority fixes (e.g., `getChatsForUser` unread-count optimization + `markMessagesAsViewed` batching).

Next step — pick which endpoints you want me to automatically update first (I recommend starting with `getChatsForUser`, `markMessagesAsViewed`, `getChattableUsers`, and `listHotelTrips`). Which one should I implement first?