---
inclusion: always
---

# Amori — project context

Read this before exploring the repo. It's the map; open the files it points to
rather than re-scanning the whole tree. **Keep it current**: when a change makes
something here wrong (new feature, moved file, changed rule), update this file in
the same change.

Deeper references: `docs/BRD_Amori_v2.md` (every feature, flow, rule, exact UI
message, endpoint, known bugs), `docs/Test_Cases_Amori.md`, and
`.kiro/specs/achievements-badges/` (the planned server-owned badge redesign).

## What it is

A private two-person couples app. Two accounts link into one **relationship**
(max 2 members); almost everything is relationship-scoped. Some data is private
per user: Vault, chat drafts, private support-profile fields, points/badges.

## Stack and layout

| Area | Tech | Where |
|------|------|-------|
| Mobile | React Native 0.74 + Expo 51 + TypeScript, React Navigation 6, zod. Node 20 (`.nvmrc`) | `src/` |
| Backend | ASP.NET Core (.NET 9), EF Core 9 + Npgsql (PostgreSQL), JWT, AWS S3, Expo push | `backend/Amori.Api/` |
| Backend tests | xUnit + Testcontainers (needs Docker running) | `backend/Amori.Api.Tests/` |
| Hosting | `https://amori.ycare.org` — EC2 behind nginx/TLS; `backend/deploy.sh` | |

**Mobile** — feature folders: `src/features/<feature>/{screens,components,hooks,services,types,utils,navigation}`.
Shared UI/state: `src/shared/` (components, `state/*Store.ts`, theme). App entry and
auth bootstrap: `src/app/App.tsx`. Navigation types: `src/navigation/`.

**Backend** — vertical slices: `Features/<Feature>/{Controllers,DTOs,Services}`.
Entities in `Domain/Entities`, enums in `Domain/Enums`, EF configs in
`Data/Configurations`, migrations in `Data/Migrations`. Cross-cutting in `Common/`
(exceptions, middleware, `RewardsResponse`, client local time) and
`Infrastructure/` (auth, push, storage, `IRelationshipAccessService`). DI is in
`Common/Extensions/ApplicationServicesExtensions.cs`.

## Commands

| Task | Command (from repo root unless noted) |
|------|------|
| Type-check app | `npx tsc --noEmit -p .` — pipe through `grep -v __tests__` (Jest globals aren't typed) |
| App unit tests | `npx jest --silent` |
| Build backend | `cd backend && dotnet build Amori.Api/Amori.Api.csproj -nologo -v q` |
| Backend tests | `cd backend && dotnet test Amori.Api.Tests -nologo` (~1 min; run as a background process — the shell tool times out on it) |
| New migration | `cd backend && dotnet ef migrations add <Name> --project Amori.Api --startup-project Amori.Api -o Data/Migrations` |
| Migration SQL | `dotnet ef migrations script <From> <To> --project Amori.Api --startup-project Amori.Api --no-build` |

The shell is **zsh**: unquoted `$var` lists don't word-split (use `xargs`), and
unquoted globs like `--include=*.ts` fail — quote them.

Known baseline: `tsc` reports 8 pre-existing errors (MemoryLocationMap,
ProfileStackNavigator ×2, AchievementsScreen, ProfileScreen `openLink`,
VisionBoardScreen `sectionGroup`, MainTabNavigator `onLogout`). Two
`PointsAwardingTests` fail on hard-coded dates that are now in the past:
`PointsHistory_ShouldRecordTheLocalDateTheActivityHappenedOn` and
`CheckIn_ShouldAwardAgainOnTheNextLocalDay` (166/168 pass). Don't treat those as
regressions; do flag any new ones.

## Conventions that matter

**API client** (`src/services/api/client.ts`): use `api.get/post/patch/delete` with
full paths (`'/api/...'`). Throws `ApiError { status, message }`. One silent token
refresh + retry on **401 only**. Sends `X-Amori-Local-Date` / `X-Amori-Utc-Offset-Minutes`
on every request. Any response with a `rewards` envelope is published to
`services/api/rewards.ts`, which `userPointsStore` applies — never forward rewards by hand.

**Error contract** (`Common/Middleware/ExceptionHandlingMiddleware.cs`), body
`{ success:false, message, errors[] }`:
`NotFoundException`→404 · `UnauthorizedException`→401 (identity only: bad
credentials/token) · `ForbiddenException`→403 (signed in but not allowed: not the
creator, other relationship) · `ValidationException`→422 · `ConflictException`→409.
Never use 401 for a permission check — it makes the app refresh the token.

**Enums**: the API serialises enums as **string names** and accepts either names
or ints. Some client payloads send ints (mood, incident, memory category), others
names (splitting, timeline, chat, support profile). Match the existing service.

**Request field names must match the C# DTO exactly** — unknown JSON fields are
silently ignored. Type payload literals with their request interface (e.g.
`const payload: SaveGiftRequest = …`) so drift fails `tsc`.

**Notifications**: types in `Features/Notifications/NotificationTypes.cs`; push
gating per type in `NotificationService.IsPushAllowed`. Tap routing for **both**
OS push and the in-app inbox goes through `src/navigation/notificationRouting.ts` —
add new types there only. **Android push**: `pushToken.ts` must create the notification
channel *before* asking for permission (Android 13+ shows no prompt until a channel exists);
`ExpoPushNotificationService` sends `priority: "high"` (Expo's Android default is "normal",
which can be delayed) and logs any ticket Expo rejects (`InvalidCredentials` = FCM key not
uploaded to Expo, `DeviceNotRegistered` = stale token) — check the API logs when an Android
push doesn't arrive.

**Sign-out** clears every per-user cache via `src/services/auth/clearLocalUserData.ts`.
Any new per-user store (memory or AsyncStorage) must be added there.

**UI feedback**: `showSuccessOverlay` / `showErrorOverlay` (shared/state) for action
results; `showSuccess` / `showError` (bannerStore) for light banners. No `testID`s
exist; accessibility labels are the automation hooks — add them to new controls.

**Card deck** (vault / daily gift): the card art is `images/cards/cardN.png`, listed in
`src/utils/cardImages.generated.ts` (`npm run cards`). Roll cards with
`getRandomCardNumber()` (`utils/cardSelector`), never a hard-coded range. The server
rejects card numbers above `VaultService.CardCount` (currently 43) with a 422, so
**raise that constant whenever a card is added**. A card can hold several saved gifts:
the vault deck draws those as a pile, and `CardStackViewer` opens it as a deck you shuffle
through (all motion is derived from the list's scroll offset; only the stacking order is
switched in JS, via `CellRendererComponent`, when a card passes half way).

## Gamification (points, levels, badges)

- **Points are server-owned.** `PointsService.PointValues` sets amounts; features call
  `IRewardService.GrantAsync(...)` *after* their own save (never throws) and return
  `rewards` on the response. `POST /api/users/me/points` only accepts `ManualAdjustment`.
  Values: HugSent 10, HugHeld 5, VisionAdded 10, TodoAdded 10, BucketListAdded 10,
  MorningCheckIn 10 (once per local day), SosFlowCompleted 20, DailyGiftOpened 15,
  CardCollected 10, BadgeSaved = that badge's `pointsReward`, HistoryBackfill = one-off sum.
- **Levels**: level N costs N×100 (cumulative 100/300/600/1000…). Server level-badges
  ("Level N", GUID ids) at 5,10,15,20,25,30,40,50.
- **Catalogue badges** (40, slugs like `first_embrace`): display data in
  `src/constants/badges.ts`; unlock state computed client-side in
  `features/profile/services/badgeService.ts` from `GET /api/users/me/badge-stats`
  (`BadgeStatsService`). Saving to the vault: `POST /api/users/me/badges/{slug}/archive`
  → server checks the rule in `Features/Users/Services/BadgeCatalog.cs` (409 if
  unearned, 404 unknown slug), creates a `badges` row with `slug`, and on the **first**
  save awards `pointsReward` in the same DB save (unique `(user_id, slug)` index =
  pay once). Client path: `useSaveBadge()` → `badgeService.archiveBadge`. Saved state
  comes from `GET /api/users/me/badges` (`slug` + `isArchivedInVault`).
- **Catch-up (one-off, per user):** `POST /api/users/me/catch-up` credits points for
  activity from before server-side awarding (hugs, held hugs, check-in days, SOS,
  vision / bucket-list / to-do items, gift cards), skipping anything already credited
  (matched on `points_history.reference_id`). One `HistoryBackfill` (12) history row
  marks it done — unique partial index = once ever. `firstRun` is true only on that
  call; `BadgeCatchUpHost` (mounted in `App.tsx`) then shows `BadgeCatchUpModal`
  ("You've already earned N badges", **Save all** → `POST /api/users/me/badges/archive-all`).
- **Badge counters** (`BadgeStatsService`): "messages" badges count **Let's Chat**
  (`conversations_completed` = a sent chat answered by the partner's chat within 24 h);
  `long_distance_hugs` = hugs where `hugs.sender_utc_offset_minutes` ≠
  `recipient_utc_offset_minutes` (user's offset kept in `users.last_known_utc_offset_minutes`
  by `ClientLocalTimeMiddleware`); `partner_request_fast_responses` = partner's Let's Chat
  "Need" answered by a chat or hug, or a care ticket set to Awaiting Response answered
  with a response, within 10 min (plus emergency acks).
- **`BadgeCatalog.cs` must stay in sync with `src/constants/badges.ts`** (slug,
  category, criteria, threshold, pointsReward). The spec in
  `.kiro/specs/achievements-badges/` plans to replace both with one server catalogue.

## Feature map (screens → service → API base)

| Feature | Mobile | API |
|---------|--------|-----|
| Auth | `features/auth`, `services/auth` | `/api/auth` |
| Partner link | `features/profile/screens/LinkPartnerScreen` | `/api/partner-link` |
| Home dashboard + daily gift | `features/home` | aggregates; vault save `/api/vault/gifts` |
| Mood check-in | `features/mood` | `/api/moods` |
| Hugs | `features/hugs` | `/api/hugs` |
| Let's Chat | `features/chat` (local drafts `chatDraftStore`). Home pills: Drafts, **Chats** (`ChatList`: sent, unresolved) and **Resolved** (`ChatResolved`). `ChatDetail` shows one chat, yours or your partner's, and is the push / inbox target. Either partner can **Resolve** an open chat: `ChatResolve` asks for a resolution → `POST /api/chat/{id}/resolve`, then resets the stack to ChatHome → ChatList (or just ChatHome if none are open). Resolved is **not** a `Status` value: it is `resolved_at` / `resolved_by_id` / `resolution` on the row, so Sent/Read and the badge counters are untouched. The first resolution wins (409 after that) | `/api/chat` |
| Help desk / incidents | `features/incidents` | `/api/incidents` (state machine in `IncidentStatusService`) |
| Together: calendar, important dates, bucket list/to-do, date ideas, wishlist | `features/together` (wishlist add **and edit** both go through `AddWishlistItemScreen`, which edits when given a route `item`: photo via `useImageAttachment` → `/api/media`, title, description, link; on PATCH `''` clears a field. Edit/Delete show only on your own wishes (owner-only on the backend). "Fulfilled" closes a wish without deleting it (either partner; Reopen undoes it) and is stored in the legacy `isPurchased` / `purchasedAt` fields, so don't add a second flag. **Date ideas work the same way** (`AddDateIdeaScreen`, `DateIdeasScreen`; Done = `isCompleted`/`completedAt`; either partner can Edit, only the creator can Delete). Both add/edit screens are thin wrappers over `components/ItemComposeForm` (photo, title, description, link); link/blank rules live in `Common/Text/UserInput.cs`. Links are http(s) only, checked by `utils/links.ts` and `WishlistService.NormalizeLink`) | `/api/calendar/events`, `/api/important-dates`, `/api/bucket-list`, `/api/dates`, `/api/wishlist` |
| Vision Board | `features/together` (VisionBoard*) | `/api/vision-board` |
| Memories / Timeline | `features/memories`, `features/timeline` | `/api/memories`, `/api/timeline`, media `/api/media` |
| Splitting (SOS) | `features/splitting` | `/api/splitting/sessions` |
| Distraction games | `features/distraction` | `/api/games`, `/api/quiz`, `/api/would-you-rather`, `/api/hidden-object-puzzles` |
| Vault + gifts | `features/vault` | `/api/vault/gifts` |
| Weekly reflection | `features/weeklyReflection` | `/api/weekly-reflections` |
| How to Know Me | `features/supportProfile` | `/api/support-profile` |
| Profile / settings / achievements | `features/profile` | `/api/users` |
| Notifications | `features/notifications`, `services/notifications` | `/api/notifications` |

Backend-only (no app UI): emergency, messages, reminders, voice-notes, tickets.

Navigation: 5 visible tabs (Home, CheckIn, Together, Desk, Profile); everything
else is a hidden tab in `src/navigation/MainTabNavigator.tsx`.

## Workflow notes

- Uncommitted work from other sessions is common — check `git status` before large
  edits and don't overwrite files you haven't re-read.
- Don't add permanent tests unless asked; temporary verification tests are fine if
  deleted afterwards.
- **Deploy**: `cd backend && ./deploy.sh` (~6–8 min; amd64 image built locally, shipped over
  SSH with `~/.ssh/AmoriKey.pem` to `ubuntu@51.20.141.199`, Postgres runs in Docker on the same
  box). Run it as a background process. **Back up first** — dumps go to `~/amori/backups/` on the
  server: `sudo docker exec amori-postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner' | gzip > ~/amori/backups/pre-deploy-<UTC>.sql.gz`.
  Check what will run with `dotnet ef migrations script <server's last migration>`; the server's
  list is in `__EFMigrationsHistory`. A 404 from an `[Authorize]` route on the live API means
  that code isn't deployed (deployed routes return 401 without a token).
- `Program.cs` runs `MigrateAsync()` on boot, so a deploy applies new migrations.
  Tests build the schema with `EnsureCreated` and do **not** exercise migrations —
  check generated SQL for anything non-trivial (filtered indexes, renames).
