# Achievements & Badges — Requirements

Status: **for approval**
Baseline: `feature/new_features` @ `2712156`
Related BRD: §6.17 (Achievements, points, levels & badges), §5.4 (Notifications), §9 (BUG-01, BUG-03, BUG-12)

## 1. Context and problem statement

Badges today are decided on the client. `src/constants/badges.ts` holds a 40-badge catalogue (the BRD's "35" is stale) and `badgeService.ts` decides what is earned by comparing those thresholds against a counter dictionary from `GET /api/users/me/badge-stats`. Nothing is persisted as "earned", `GET /api/users/me/badges` has no caller in `src/`, and the server only ever awards level badges.

Four findings from the baseline that shape these requirements:

| # | Finding | Consequence |
|---|---------|-------------|
| F-1 | `user_points`, `badges` and `points_history` appear in **zero** migrations and are absent from `AmoriDbContextModelSnapshot.cs`, yet `Program.cs` migrates on boot. | The gamification endpoints fail at runtime on any clean database. There is **no existing badge or points data anywhere**, so we are free to choose the schema and slug convention without a data migration. This is a more severe defect than BUG-01. |
| F-2 | BUG-01 and BUG-03 are already fixed in the working tree (uncommitted). `pointsService.ts` imports `{ api } from './client'`; `userPointsStore.load()` performs a real fetch. | Those two bugs reduce to *verify and close*, not *fix*. |
| F-3 | `PointsService.AddPointsAsync` never adds a new `UserPoints` row (`BaseEntity.Id` is pre-seeded, so the `Id == Guid.Empty` guard is always false), and only reacts to the immediately-reached level, so a multi-level jump skips badge thresholds. | A user's first-ever points award persists only the history row. Must be fixed as part of making the server authoritative. |
| F-4 | `images/badges/` holds **22 files**; `badges.ts` makes **40** `require()` calls, of which **23 resolve to files that do not exist**. The remaining tracked-but-deleted art is deliberately gone — it is being replaced, with new art arriving later. | The Metro bundle cannot resolve 23 asset requires today. Art coverage is therefore a first-class design concern, not a fallback: the catalogue must ship with most badges on shared or placeholder art and must never `require()` a missing file. See §4.4 and design §11.3. |

## 2. Scope

**In scope:** server-owned badge catalogue and awarding; server-side points for the existing `ActivityType` list; progress computation; a daily time-based job; backfill for existing users; the `BadgeEarned` notification end to end; client rework to consume server truth; BUG-12 notification-routing fixes; BRD §6.17 and §9 updates.

**Out of scope:** new badge artwork; redesign of the level curve; the unbuilt "partner sync" feature; push delivery infrastructure changes (Expo push stays as is).

## 3. Functional requirements

### 3.1 Catalogue and ownership — `ACH-10` … `ACH-19`

| ID | Requirement |
|----|-------------|
| ACH-10 | Badge definitions live in a server table `badge_definitions`, seeded by migration, with columns: `slug` (unique, stable), `title`, `tagline`, `category`, `tier` (`common`/`rare`/`legendary`), `is_hidden`, `criteria_type`, `threshold`, `criteria_params` (jsonb, nullable), `sort_order`, `asset_key`. |
| ACH-11 | Earned badges live in `user_badges` (`user_id`, `badge_id`, `earned_at`, `archived_at`, `is_backfilled`) with a unique constraint on (`user_id`, `badge_id`). |
| ACH-12 | The client holds **no** badge definitions, thresholds or earned-state logic. The only client-side badge data is a slug → bundled-image map, which is presentation and is asserted complete by a test. |
| ACH-13 | The legacy per-user `badges` table and `Badge` entity are removed. Level milestones become catalogue entries (`level-5` … `level-50`) with criteria type `LevelReached`. |
| ACH-14 | Badges and points are private to the owning user. No partner-facing endpoint, DTO or notification exposes another user's badges, points, level or progress. |
| ACH-15 | A badge is awarded at most once per user, ever — under retries, concurrent requests, the daily job and the backfill. |
| ACH-16 | Awarding never un-awards. Progress counters that can decrease (streaks) are compared against a stored high-water mark so an earned badge cannot revert to locked. |
| ACH-17 | Hidden badges are absent from catalogue responses until the user has earned them. |
| ACH-18 | Slugs are kebab-case and immutable once shipped. `asset_key` is the image basename and may be shared by several badges (e.g. all level milestones reuse `level_up`). |
| ACH-19 | Seeding is idempotent: re-running it updates presentation fields (`title`, `tagline`, `sort_order`, `asset_key`, `tier`) and inserts missing slugs, but never deletes a slug that users may have earned. |

### 3.2 Evaluation and awarding — `ACH-20` … `ACH-29`

| ID | Requirement |
|----|-------------|
| ACH-20 | An `IBadgeEvaluator` service computes progress and awards badges server-side from real feature data. |
| ACH-20a | A trigger may award to more than one user. `golden-hour` (ACH-B83) awards to both the hug's acknowledger and its sender; `same-sky` (ACH-B82) and `knot-undone` (ACH-B59) evaluate for both partners. Each recipient is evaluated and awarded independently and idempotently, and only the acting user's awards appear in that request's `rewards` envelope — the partner learns of theirs by notification. |
| ACH-21 | The evaluator is invoked from feature handlers **after** the handler's own `SaveChangesAsync` has succeeded. |
| ACH-22 | Each invocation evaluates only the criteria types mapped to that trigger, not the whole catalogue. |
| ACH-23 | The evaluator never propagates an exception to the parent request. Any failure is logged at warning and the parent response is unaffected. |
| ACH-24 | Evaluation uses its own `DbContext` scope so a failed badge write cannot pollute the parent request's change tracker. |
| ACH-25 | Points for the existing `ActivityType` values are awarded **server-side** by the same handlers. The client never needs to call the points API for them. All nine earnable types fire from a real handler; none is left dead. |
| ACH-25a | `TodoAdded` is awarded when a bucket-list item is created with `Category == BucketListCategory.ToDoList`; `BucketListAdded` for every other category. One create path, two activity types, no new table. |
| ACH-25b | `HugHeld` is awarded to the sender when a hug is sent with `HoldDurationMs >= 3000`. A hug sent without hold data awards `HugSent` only. |
| ACH-26 | `POST /api/users/me/points` is retained but accepts only `ManualAdjustment`; any other `activityType` returns 422 with the standard error envelope. |
| ACH-27 | `AddPointsAsync` is fixed to persist a first-ever `UserPoints` row and to award **every** badge threshold crossed by a multi-level jump, in one `SaveChangesAsync`. |
| ACH-28 | A daily background job (`BadgeTimeMonitor`, registered alongside `IncidentSlaMonitor`) awards time-based badges so they land without the user opening the app. It pages over users rather than loading all of them. |
| ACH-29 | A one-off resumable backfill evaluates every existing user against all criteria using historical data. Backfilled awards are marked `is_backfilled`, send **no** notification and raise **no** reward modal. |

### 3.3 API — `ACH-30` … `ACH-36`

| ID | Requirement |
|----|-------------|
| ACH-30 | `GET /api/users/me/badges` returns the full visible catalogue, each entry carrying `slug`, presentation fields, `isEarned`, `earnedAt`, `archivedAt` and `progress: { current, target }`. Hidden-and-unearned badges are omitted (ACH-17). |
| ACH-31 | `progress.current` is clamped to `progress.target`; `target` is the badge's threshold and is never 0. |
| ACH-32 | `GET /api/users/me/badges/summary` returns `earnedCount`, `totalVisible` and `recent` (the N most recently earned, newest first). |
| ACH-33 | Responses of actions that can award include `rewards: { newBadges: [...], leveledUp, newLevel, pointsAwarded }`. `newBadges` is empty, not null, when nothing was earned. |
| ACH-34 | `POST /api/users/me/badges/{slug}/archive` archives by slug. Unknown slug → 404. Known slug the user has not earned → **403**. Already archived → 200, idempotent. |
| ACH-35 | `GET /api/users/me/badge-stats` is removed; the per-badge `progress` on ACH-30 replaces it. |
| ACH-36 | All new error responses use the existing envelope `{ success: false, message, errors }` produced by `ExceptionHandlingMiddleware`. A new `ForbiddenException` maps to 403. |

### 3.4 Notifications — `ACH-40` … `ACH-44`

| ID | Requirement |
|----|-------------|
| ACH-40 | A new notification type `BadgeEarned` is sent to the earner only, with `referenceId` = badge slug. It is never sent to the partner. |
| ACH-41 | `BadgeEarned` push is gated by the master switch only (`NotificationsEnabled` && `PushNotificationsEnabled`). The inbox record is always persisted, matching existing `NotificationService` behaviour. |
| ACH-42 | One notification per newly earned badge. Batched awards produce one per badge, in `sort_order`. |
| ACH-43 | Tapping a `BadgeEarned` **push** opens Profile → Achievements, scrolled/focused on that badge. |
| ACH-44 | Tapping a `BadgeEarned` **inbox row** does the same. Both `pushHandlers.ts` and `NotificationsScreen.tsx` are updated. |

### 3.5 BUG-12 — notification routing — `ACH-45` … `ACH-47`

| ID | Requirement |
|----|-------------|
| ACH-45 | The inbox handles the exact server strings. Fix `VisionBoardItem` → `VisionBoardItemAdded`/`VisionBoardItemCompleted` and `CalendarEvent` → `CalendarEventAdded`. Add `MemoryAdded`, `BucketListItemAdded`, `WishlistItemAdded`. |
| ACH-46 | Dead client-only strings are removed: `'VisionBoardItem'`, `'CalendarEvent'` (both files), the `data.eventDate` read that the server never sends, and the unused `'LevelUp'` path in `badgeNotificationService.ts`. |
| ACH-47 | Type strings are defined once on the client and shared by `pushHandlers.ts` and `NotificationsScreen.tsx`, so the two cannot drift again. |

### 3.6 Client — `ACH-50` … `ACH-57`

| ID | Requirement |
|----|-------------|
| ACH-50 | BUG-01 closed: no module imports a non-existent `apiClient`; `npx tsc --noEmit` reports no error in `pointsService.ts`. |
| ACH-51 | BUG-03 closed: points and level come from `GET /api/users/me/points` on app start; client-side level arithmetic is deleted in favour of the server's `level`, `pointsInCurrentLevel`, `pointsNeededForLevel`, `progressPercentage`. |
| ACH-52 | The client never calls `POST /api/users/me/points` outside a developer/debug path. |
| ACH-53 | The Achievements screen renders locked / earned / progress from `GET /api/users/me/badges` using `assetKey` images, with a designed placeholder for any badge whose art has not arrived yet. A placeholder badge is visually complete — never a broken-image box — because most of the catalogue will use one at launch. |
| ACH-58 | The client asset map never `require()`s a file that is not on disk. Adding a badge to the catalogue without art cannot break the bundle. |
| ACH-54 | The reward modal is driven by `rewards.newBadges` in action responses, replacing the 5-second polling in `useBadgeRewardListener`. Each badge is shown once per session. |
| ACH-55 | The Vault archive action calls the slug-based archive endpoint through one code path (`badgeService`), not directly from the screen. |
| ACH-56 | `src/constants/badges.ts` definitions, `isBadgeUnlocked`, `getUnlockedBadges` and `countUnlockedCategories` are deleted. |
| ACH-57 | On sign-out, cached badges and points are cleared. |

### 3.7 Time handling — `ACH-T01` … `ACH-T10`

The device's local date is authoritative for every day-based badge.

| ID | Requirement |
|----|-------------|
| ACH-T01 | One shared contract carries the client's local date and UTC offset on every request that can affect a badge: headers `X-Amori-Local-Date` (`YYYY-MM-DD`) and `X-Amori-Utc-Offset-Minutes` (integer). Added centrally in `client.ts`; one middleware resolves both into a single `ClientLocalTime` value. |
| ACH-T02 | Applies to: check-in create, daily gift open, weekly reflection save, hug send, hug acknowledge, game session complete, quiz session complete, grounding completion, and app-open badge refresh. |
| ACH-T03 | An offset outside `-840 … +840` minutes is rejected with 422 and the standard envelope. |
| ACH-T04 | If the client's local date differs from the server's UTC date by more than one day, the client value is discarded, the server's UTC date is used, and the discrepancy is logged at warning with the user id and both dates. |
| ACH-T05 | The user's last known UTC offset and local date are stored on the user record and refreshed whenever a valid header pair arrives. |
| ACH-T06 | Streaks store the last credited **local** date and compare against the client-sent local date. No streak is ever derived from UTC timestamps alone. |
| ACH-T07 | Re-crediting the same local date is a no-op; a gap of exactly one day extends the streak; a larger gap restarts it at 1. The longest run is retained (ACH-16). |
| ACH-T08 | `same-sky` compares each partner's **own** stored local check-in date. One partner's date is never converted into the other's time zone. |
| ACH-T09 | `days-together` is evaluated by the daily job from the user's stored offset **and** on app open from the client-sent local date. Whichever fires first awards; the other is a no-op (ACH-15). |
| ACH-T10 | `whole-spectrum` and weekly reflection boundaries use a Monday-to-Sunday week computed from the local date. |

**Accepted risk (must appear in the BRD):** because the device's local date is trusted, a user who changes their device clock can advance or inflate their own streak badges. This is accepted — badges are private (ACH-14). The trust boundary is limited: a client-supplied local date may influence **only** that user's own badge state. It must never affect partner-visible data, another user's badges, or points totals beyond the points attached to the badge-triggering action itself.

## 4. Badge catalogue requirements

Every badge criterion gets a traceable ID. `ACH-B01` … `ACH-B40` are the imported client badges; `ACH-B50` … `ACH-B83` are the new ones; `ACH-B90` … `ACH-B97` are level milestones.

### 4.1 Imported from the client catalogue (40 → 37 shipped)

| ID | Slug | Criterion | Threshold | Notes |
|----|------|-----------|-----------|-------|
| ACH-B01 | `first-embrace` | hugs sent | 10 | |
| ACH-B02 | `first-embrace-2` | hugs sent | 50 | |
| ACH-B03 | `hug-collector` | hugs sent | 100 | |
| ACH-B04 | `golden-heart` | hugs sent | 250 | |
| ACH-B05 | `golden-heart-2` | hugs sent | 500 | |
| ACH-B06 | `hug-back` | received hugs acknowledged within 5 min | 10 | |
| ACH-B07 | `hug-marathon` | consecutive local days with a hug sent | 7 | local-date streak |
| ACH-B08 | `long-distance-hugger` | hugs sent while partners' last-known UTC offsets differ | 1 | **redefined** — was unmeasurable |
| ACH-B09 | `midnight-hug` | hugs sent 00:00–04:00 **local** | 1 | hidden; was UTC-hour based |
| ACH-B10 | `both-ways` | local days with a hug in each direction | 10 | |
| ACH-B11 | `first-light` | morning check-ins | 1 | |
| ACH-B12 | `morning-ritual` | morning check-ins | 10 | |
| ACH-B13 | `night-whispers` | evening check-ins | 10 | |
| ACH-B14 | `daily-streak` | consecutive local check-in days | 7 | |
| ACH-B15 | `daily-streak-2` | consecutive local check-in days | 30 | |
| ACH-B16 | `evergreen` | consecutive local check-in days | 100 | |
| ACH-B17 | `evergreen-2` | consecutive local check-in days | 250 | |
| ACH-B18 | `evergreen-3` | consecutive local check-in days | 365 | |
| ACH-B19 | `memory-keeper` | memories saved to the vault | 1 | |
| ACH-B20 | `words-that-matter` | days with ≥20 messages exchanged | 1 | |
| ACH-B21 | `words-that-matter-2` | days with ≥20 messages exchanged | 10 | |
| ACH-B22 | `shared-horizons` | timeline events added by the user | 1 | |
| ACH-B23 | `shared-horizons-2` | timeline events added by the user | 10 | |
| ACH-B24 | `together-forever` | completed years since relationship start | 1 | |
| ACH-B25 | `dream-builders` | vision items added by the user | 10 | |
| ACH-B26 | `dream-builders-2` | vision items completed in the relationship | 1 | |
| ACH-B27 | `bucket-list-buddy` | bucket-list items completed | 1 | |
| ACH-B28 | `bucket-list-buddy-2` | bucket-list items completed | 10 | |
| ACH-B29 | `curious-mind` | games played | 1 | |
| ACH-B30 | `curious-mind-2` | perfect quiz scores | 1 | |
| ACH-B31 | `open-heart` | partner emergency requests acknowledged within 10 min | 10 | |
| ACH-B32 | `safe-harbor` | partner emergency requests acknowledged | 1 | **redefined** — was unmeasurable |
| ACH-B33 | `finding-calm` | mood check-ins logged | 20 | **redefined** — duplicated `daily-streak`; now matches the BRD's "20 moods" |
| ACH-B34 | `finding-calm-2` | distinct mood types logged | 5 | |
| ACH-B35 | `emerald-soul` | media items shared | 10 | |
| ACH-B36 | `emerald-soul-2` | media items shared | 100 | |
| ACH-B37 | `sacred-vow` | memories saved on the anniversary day | 1 | hidden |
| ACH-B38 | `eternal-bond` | categories with ≥1 earned badge | all non-meta categories | hidden; server-computed |
| — | ~~`growing-together`~~ | **retired** — its `sync_questions_agreed` criterion is identical to `same-wavelength` (ACH-B74) | | |
| — | ~~`level_up`~~ | **folded into** `level-5` (ACH-B90) | | |

### 4.2 New badges

| ID | Slug | Criterion | Threshold | Tier | Needs |
|----|------|-----------|-----------|------|-------|
| ACH-B50 | `two-become-one` | partner link accepted (relationship has 2 members) | 1 | common | — |
| ACH-B51 | `soft-landing` | Let's Chat messages sent (`SentAt != null`) | 1 | common | — |
| ACH-B52 | `both-sides` | chat sent within 24 h of receiving one from the partner | 5 | rare | — |
| ACH-B53 | `held-gently` | received hugs acknowledged | 10 | common | — |
| ACH-B54 | `whispered-words` | hugs sent with a non-empty whisper | 10 | common | — |
| ACH-B55 | `open-book` | support-profile sections complete | 7 | rare | — |
| ACH-B56 | `week-keeper` | distinct weekly reflections saved | 4 | common | — |
| ACH-B57 | `harbor-found` | splitting sessions completed with final state "I'm okay now" | 1 | common | **S-1** |
| ACH-B58 | `space-keeper` | splitting sessions whose space window ran to completion | 3 | rare | — |
| ACH-B59 | `knot-undone` | incidents resolved in the relationship (either partner) | 1 | common | — |
| ACH-B60 | `wisdom-kept` | incident lessons written by the user | 5 | rare | — |
| ACH-B61 | `in-good-time` | incidents resolved before `dueAt` | 5 | rare | — |
| ACH-B62 | `we-did-it` | vision items completed in the relationship | 1 | common | — |
| ACH-B63 | `made-real` | a completed vision linked to **both** a memory and a timeline event | 1 | rare | **S-2** |
| ACH-B64 | `curator-of-us` | a user-created custom vision section **and** 3 pinned items | 1 | rare | **S-3** |
| ACH-B65 | `days-together-100` | days since relationship start (local) | 100 | common | — |
| ACH-B66 | `days-together-365` | days since relationship start (local) | 365 | rare | — |
| ACH-B67 | `days-together-730` | days since relationship start (local) | 730 | rare | — |
| ACH-B68 | `days-together-1000` | days since relationship start (local) | 1000 | legendary | — |
| ACH-B69 | `marked-in-gold` | important dates created by the user, plus the user's calendar events on the anniversary day | 5 | common | **S-4** |
| ACH-B70 | `written-in-stars` | date ideas completed | 5 | common | — |
| ACH-B71 | `roll-of-the-heart` | a date idea surfaced by `POST /api/dates/random` and later completed | 1 | rare | **S-5** |
| ACH-B72 | `unwrapped-heart` | gifts sent to the partner | 1 | common | **S-6** |
| ACH-B73 | `unwrapped-heart-10` | gifts sent to the partner | 10 | rare | **S-6** |
| ACH-B74 | `same-wavelength` | would-you-rather answers matching the partner's | 10 | rare | — |
| ACH-B75 | `mind-reader` | perfect couple-quiz scores | 3 | rare | — |
| ACH-B76 | `needle-in-the-stars` | hidden-number puzzles found | 10 | rare | **S-7** |
| ACH-B77 | `constellation-maker` | a 2048 session reaching the 2048 tile | 1 | legendary | **S-8** |
| ACH-B78 | `cartographer-of-us` | memories created with a location | 10 | rare | — |
| ACH-B79 | `whole-spectrum` | all 4 mood quadrants within one local Mon–Sun week | 1 | rare | **S-9** |
| ACH-B80 | `tended-gently` | grounding exercises completed | 5 | common | **S-10** |
| ACH-B81 | `tear-and-treasure` | consecutive local days with the daily gift opened | 7 | rare | **S-11** |
| ACH-B82 | `same-sky` | consecutive local days both partners checked in | 14 | legendary | hidden; **S-9** |
| ACH-B83 | `golden-hour` | a hug acknowledged within 60 s of being sent | 1 | legendary | hidden; awarded to **both** the acknowledger and the sender |

### 4.3 Level milestones

| ID | Slugs | Criterion |
|----|-------|-----------|
| ACH-B90 … ACH-B97 | `level-5`, `level-10`, `level-15`, `level-20`, `level-25`, `level-30`, `level-40`, `level-50` | level reached; thresholds match the existing `BadgeThresholds` array; all share `asset_key = level_up` |

**Shipped total: 37 imported + 34 new + 8 level = 79 badges.**

### 4.4 Artwork coverage — `ACH-A01` … `ACH-A04`

79 badges, 22 art files. Art availability must not gate the catalogue, and the catalogue must not gate art.

| ID | Requirement |
|----|-------------|
| ACH-A01 | `asset_key` is independent of `slug`. Several badges may share one image — in particular a tier ladder shares its base art until dedicated art arrives, and all eight level milestones share one image. |
| ACH-A02 | A badge whose `asset_key` has no file on disk renders the placeholder. This is the expected state for most of the catalogue at launch and is not a defect. |
| ACH-A03 | The set of badges awaiting art is explicit and reviewable in one list, so dropping a new png into `images/badges/` and wiring it is a one-line change with a test that notices. |
| ACH-A04 | The 5 art files with no matching badge (`completionist`, `our_soundtrack`, `rainbow_after_rain`, `time_capsule`, `voice_of_love`) are assigned to suitable new badges rather than left unused. Assignments in design §11.3. |

## 5. Required schema and payload additions

These are the criteria with no existing data source. Each is the smallest change that makes the criterion computable.

| ID | For | Change |
|----|-----|--------|
| S-1 | ACH-B57 `harbor-found` | `SplittingSession.ResolvedFeeling` (nullable enum: `OkayNow`, `StillStruggling`, `NeedSpace`) set by `CompleteSplittingSessionRequest`. The client's `SafeTransitionScreen` already offers "I'm okay now" (`id: 'okay'`) but sends nothing; `FinalMood` is optional and a poor proxy. |
| S-2 | ACH-B63 `made-real` | `Memory.SourceVisionBoardItemId` and `TimelineEvent.SourceVisionBoardItemId` (nullable FK, indexed). No link exists in either direction today. |
| S-3 | ACH-B64 `curator-of-us` | `VisionBoardSection.CreatedByUserId` (nullable — null for the seeded defaults). Pin attribution uses the item's `CreatedByUserId`; attributing the pin itself would need `PinnedByUserId`, which this spec does **not** add (see OQ-3). |
| S-4 | ACH-B69 `marked-in-gold` | No schema change. "Anniversary calendar event" is interpreted as a `CalendarEvent` created by the user whose `EventDate` month/day matches `Relationship.AnniversaryDate`. Neither `ImportantDate` nor `CalendarEvent` has a type/category column, and adding one is a larger change than this badge justifies. |
| S-5 | ACH-B71 `roll-of-the-heart` | `DateIdea.LastRandomlySuggestedAt` (nullable). `POST /api/dates/random` becomes a write that stamps the idea it returns. |
| S-6 | ACH-B72/B73 `unwrapped-heart` | `VaultGift.SentByUserId` (nullable — null for self-saves). `VaultGift` currently stores only the recipient. |
| S-7 | ACH-B76 `needle-in-the-stars` | `GameSession.ResultDetails` (jsonb, nullable) + the same field on `CompleteGameSessionRequest`. For hidden-number sessions the client sends `{ "found": true, "puzzleId": "…" }`. The client already calls `distractionService.recordPlay` from `HiddenNumberScreen`, so only the payload grows. |
| S-8 | ACH-B77 `constellation-maker` | Same `ResultDetails` field: `{ "highestTile": 2048 }` from `Game2048Screen`, which already calls `recordPlay`. |
| S-9 | ACH-B79/B82 | `MoodCheckIn.Quadrant` (nullable enum: `HighPleasant`, `LowPleasant`, `HighUnpleasant`, `LowUnpleasant`), `MoodCheckIn.LocalDate` (`DateOnly`, nullable) and `MoodCheckIn.UtcOffsetMinutes` (nullable int). Quadrants exist today only as opaque strings inside the client-authored `WeeklyReflectionSnapshot`; the server derives the quadrant from `(Mood, Intensity)` and stores it so both features agree. |
| S-10 | ACH-B80 `tended-gently` | New table `grounding_exercise_completions` (`user_id`, `exercise_key`, `duration_seconds`, `local_date`, `completed_at`) and `POST /api/distraction/grounding/completions`. `SomaticSuiteScreen` makes no server call today. |
| S-11 | ACH-B81 `tear-and-treasure` | New table `daily_gift_opens` (`user_id`, `local_date`, `opened_at`, unique on user+local date) and `POST /api/vault/daily-gift/open`. The daily gift is 100% client-side today. |
| S-12 | ACH-T05 | `User.LastKnownUtcOffsetMinutes` (nullable int), `User.LastKnownLocalDate` (nullable `DateOnly`), `User.BadgesBackfilledAt` (nullable timestamp, for resumable backfill). |
| S-13 | ACH-T06 | New table `user_streaks` (`user_id`, `streak_key`, `last_credited_local_date`, `current_length`, `longest_length`, unique on user+key). Keys: `checkin`, `hug_sent`, `daily_gift_open`, `same_sky`. |
| S-14 | ACH-25b `HugHeld` points | `Hug.HoldDurationMs` (nullable int) plus the same field on `SendHugRequest`. The ActivityType is otherwise unawardable — the server has no hold data. The client already uses a press-and-hold gesture to send ("Tap and hold to send a hug"), so it only needs to report the duration it already measures. Nullable because older clients will omit it. |

## 6. Test requirements

Backend tests use the existing `Amori.Api.Tests` project (xunit + Testcontainers Postgres + `AmoriWebApplicationFactory`). New code takes `TimeProvider` rather than calling `DateTime.UtcNow`, so time can be controlled.

| ID | Requirement |
|----|-------------|
| ACH-TEST-01 | One unit test class per criteria type, covering: below threshold, exactly at threshold, above threshold. |
| ACH-TEST-02 | Idempotency: evaluating the same trigger twice awards once; the second call returns no new badges. |
| ACH-TEST-03 | Concurrency: N parallel evaluations of the same trigger produce exactly one `user_badges` row and one notification. |
| ACH-TEST-04 | Evaluator failure (forced exception) leaves the parent request's response and persisted state unchanged. |
| ACH-TEST-05 | API: `GET /api/users/me/badges` shape, hidden-badge omission before earning and inclusion after, progress clamping, `summary` counts. |
| ACH-TEST-06 | API: `rewards.newBadges` populated on a qualifying action and empty otherwise. |
| ACH-TEST-07 | API: archive — unknown slug 404, unearned slug 403, earned slug 200, repeat 200. |
| ACH-TEST-08 | Two-user: `two-become-one`, `both-sides`, `same-wavelength`, `same-sky`, `golden-hour`, `knot-undone`, `in-good-time` each asserted from both A's and B's perspective, including that B's badges never appear in A's responses (ACH-14). |
| ACH-TEST-08a | `golden-hour`: B acknowledges A's hug within 60 s → **both** A and B hold the badge; B's `rewards.newBadges` contains it, A's does not, and A receives a `BadgeEarned` notification. Acknowledging at 61 s awards neither. A solo user with no partner degrades to a single award without error. |
| ACH-TEST-08b | `TodoAdded` vs `BucketListAdded`: creating a `ToDoList`-category item writes a `TodoAdded` history row, any other category writes `BucketListAdded`. `HugHeld` fires at 3000 ms, not at 2999 ms; a hug with no `holdDurationMs` awards `HugSent` only. |
| ACH-TEST-09 | Time — DST: a local date sequence spanning a spring-forward and an autumn-back transition keeps a 7-day streak intact. |
| ACH-TEST-10 | Time — extreme offsets: `+840` (UTC+14) and `-720` (UTC−12) both accepted; `+841` and `-841` rejected with 422. |
| ACH-TEST-11 | Time — week boundary: a check-in at local Sunday 23:59 and one at local Monday 00:00 fall in different Mon–Sun weeks for `whole-spectrum`. |
| ACH-TEST-12 | Time — midnight rollover mid-request: the client-sent local date is used for the whole request even if the server's UTC date rolls over during it. |
| ACH-TEST-13 | Time — tampered date: a local date 3 days ahead of server UTC is discarded, server UTC is used, a warning is logged, and the streak does not advance. |
| ACH-TEST-14 | Backfill: a user with historical data gains the right badges, marked `is_backfilled`, with zero notifications created. |
| ACH-TEST-15 | Daily job: `days-together-100` awards for a user who has not opened the app, using the stored offset, once only. |
| ACH-TEST-16 | Client (jest): every catalogue slug resolves to an image or an explicit placeholder; the local-date headers are attached by `client.ts`; the reward queue shows each badge once. |

## 7. Documentation requirements

| ID | Requirement |
|----|-------------|
| ACH-DOC-01 | BRD §6.17 rewritten: server-authoritative model, the 79-badge catalogue with requirement IDs, new endpoints, the local-date contract, and the device-time trust risk. |
| ACH-DOC-02 | BRD §9: close BUG-01, BUG-03 and BUG-12 with the verifying requirement IDs; add the F-1 missing-migration defect as a new entry. |
| ACH-DOC-03 | BRD §5.4 notification table gains `BadgeEarned`; the BUG-12 "⚠ Nothing" markers are cleared. |
| ACH-DOC-04 | BRD §8 data-model diagram and ownership table updated for the new tables. |

## 8. Open questions

All resolved. Recorded here for traceability.

| ID | Question | Resolution |
|----|----------|------------|
| OQ-1 | Restore the deleted badge pngs? | **No.** The 22 files on disk are the current set; more art arrives later, and the deletions are intentional replacements. Handled by art sharing + placeholder (design §11.3, ACH-A01…A04). The deletions should be committed at some point so the tree stops showing 33 phantom `D` entries, but that is yours and is not part of this spec. |
| OQ-2 | Add `Hug.HoldDurationMs`? | **Yes.** S-14 is now in scope rather than optional. It exists to make `HugHeld` points awardable (ACH-25b); no badge depends on it, so no catalogue change. |
| OQ-3 | `curator-of-us` attributes pinned items by creator? | **Accepted.** No `PinnedByUserId`. S-3 stays as specified. |
| OQ-4 | Hook up `TodoAdded`? | **Yes**, and it needs no new feature: `BucketListCategory.ToDoList = 7` already exists, so a "to-do" is a bucket-list item in that category. See ACH-25a. |
| OQ-5 | Who gets `golden-hour`? | **Both** the acknowledger and the sender. Requires multi-recipient trigger support — see ACH-20a and design §3.4. |
