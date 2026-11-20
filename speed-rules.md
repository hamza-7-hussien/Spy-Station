# Spy Station Speed & Scalability Rules (`speed-rules.md`)

Follow these 5 mandatory performance rules whenever adding or modifying features in **Spy Station**:

## 1. Database Optimization (Indexing & No N+1 Queries)
- **Never** run full-collection scans on `spy_rooms`, `spy_quick_match_queue`, or `users` (e.g. avoid unbounded `db.ref('spy_rooms').on('value')`).
- Always filter on indexed fields (`orderByChild('visibility').equalTo('public')`, `orderByChild('createdAt')`) backed by `.indexOn` in `database.rules.json` and composite indexes in `firestore.indexes.json`.
- **Never** issue database reads or writes inside `for` / `map` loops (N+1 anti-pattern). Batch reads with `Promise.all(...)` + TTL cache checks, and batch writes into a single atomic multi-path `db.ref().update(multiPathPayload)`.

## 2. Pagination (`limitToLast` / Sliced Rendering + Load More)
- Bound every list query with `.limitToLast(pageSize)` (default `12`–`20` items) and provide a **Load More** trigger (`+12`) rather than downloading or rendering thousands of rows at once.
- Paginate client lists (`FriendsTab`, `InviteFriendsModal`, `LobbyScreen` chat, `CluesHistoryModal`) so the DOM stays light even with hundreds of items.

## 3. Images (WebP Format & Lazy Loading)
- Store static illustration/banner/background assets as compressed `.webp` in `src/assets/images/` (not raw multi-MB `.jpg`/`.png` files).
- Encode user-uploaded avatars via HTML5 Canvas to `image/webp` (with JPEG fallback) at `256x256` before saving.
- Always add `loading="lazy"` and `decoding="async"` to non-critical, list, modal, and below-the-fold `<img>` elements (`decoding="async"` on critical avatars).

## 4. Caching (Stale-While-Revalidate + TTL Cache)
- Use `src/utils/cache.ts` (`userProfileCache`, `publicRoomsCache`, `friendCodeCache`) for static or infrequently changing data (profiles, public station snapshots, lookup codes) with explicit TTLs and bounded LRU capacity.
- Hydrate UI immediately from cache while refreshing live updates in the background, and keep static assets (`.webp`, `.svg`, fonts) cached in `public/sw.js`.

## 5. Skeleton Loading (Never Leave Blank / White / Unstructured Waiting Screens)
- Replace blank screens or bare centered text waits with structured **Skeleton Loading** placeholders (`src/components/Skeletons.tsx`: `AppBootSkeleton`, `StationsListSkeleton`, `FriendsListSkeleton`, `RoomLobbySkeleton`) that mirror the final card geometry while async auth or database data loads.
