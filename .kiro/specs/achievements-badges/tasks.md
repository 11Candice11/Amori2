# Achievements & Badges — Implementation Tasks

Requirements: `./requirements.md` · Design: `./design.md`

Ordering is dependency-driven: schema → catalogue → evaluator core → hooks → API → jobs → notifications → client → docs. Each task names the requirement IDs it satisfies. `dotnet build` after every backend group; `npx tsc --noEmit` after every client group.

---

## Done: points slice (shipped ahead of the badge work)

Points were not updating at all, so the parts of Phases 1/2/4/5 that fix that were brought forward and are complete. 13 new tests in `PointsAwardingTests`; full suite 163 passed, 1 pre-existing unrelated failure (BUG-07).

- [x] Migration `AddGamificationTables` — creates `user_points`, `points_history`, `badges` (finding F-1: never migrated). Written as idempotent raw SQL, because deployed databases already have these tables outside the migration history and `Program.cs` auto-migrates on boot, so a plain `CreateTable` would crash the API. Verified both ways against a scratch Postgres. — ACH-10 (partial)
- [x] Migration `AddPointsHistoryLocalDate` — `points_history.local_date` + the `(user, activity, local_date)` index backing the daily guard. — ACH-T06
- [x] Migration `AddHugHoldDuration` — `hugs.hold_duration_ms`. — S-14
- [x] `ClientLocalTime` + `ClientLocalTimeMiddleware` + `IClientLocalTimeAccessor`; `TimeProvider.System` registered. Absent headers fall back to server UTC; malformed ones 422; implausible ones are discarded and logged. — ACH-T01, T03, T04, 0.2
- [x] Client sends `X-Amori-Local-Date` / `X-Amori-Utc-Offset-Minutes` from `client.ts` on every request, including uploads. — ACH-T01
- [x] `RewardsResponse` / `EarnedBadgeResponse` — final shape, so adding badges later changes no DTO. — ACH-33 (shape)
- [x] `IRewardService` / `RewardService` — own `DbContext` scope, never throws. — ACH-21, ACH-23, ACH-24
- [x] `PointsService` rework: server-owned `PointValues`; `AwardAsync`; first-ever `UserPoints` row now persists (finding F-3); every crossed badge threshold awarded, not just the level landed on; single `SaveChangesAsync`; typed history with a clamped limit. — ACH-25, ACH-27
- [x] `POST /api/users/me/points` restricted to `ManualAdjustment` (422 otherwise). **Contract change — QA collections posting other activity types will now get 422.** — ACH-26
- [x] Hooks with `rewards` on the response: hug send (`HugSent` + `HugHeld` ≥3 s), check-in (`MorningCheckIn`, once per local day), vision item create (`VisionAdded`), bucket-list create (`TodoAdded` for `ToDoList` category, else `BucketListAdded`), splitting complete (`SosFlowCompleted`), vault gift send/create (`CardCollected`). — ACH-25, ACH-25a, ACH-25b

Deferred from this slice, still open below: hug acknowledge needs the `ActorAndPartner` audience (3.2), daily gift open and grounding completion need their new endpoints (5.11, 5.12), and the client does not yet send `holdDurationMs` — see the note on task 9.10.

---

## Phase 0 — Decisions and groundwork

- [x] **0.1a** OQ-1 resolved: the 22 files on disk are the current art set; more arrives later. No restoration. Art sharing + placeholder per design §11.3.
- [x] **0.1b** OQ-2…OQ-5 resolved: add `Hug.HoldDurationMs`; accept creator-attributed pins; hook `TodoAdded` to `BucketListCategory.ToDoList`; `golden-hour` awards to acknowledger **and** sender.
- [ ] **0.1c** Supply `images/badges/placeholder.png` — the designed art-pending badge (frame + monogram, tintable for locked/earned). *Blocks 9.3.* — ACH-A02, ACH-53
- [ ] **0.2** Register `TimeProvider.System` as a singleton; add `@types/jest` to client dev dependencies. — ACH-TEST-09…13, BUG-14
- [ ] **0.3** Add `Common/Exceptions/ForbiddenException.cs` and the 403 arm in `ExceptionHandlingMiddleware`. — ACH-36

## Phase 1 — Schema and catalogue

- [ ] **1.1** New enums: `BadgeTier`, `BadgeCategory`, `BadgeCriteriaType`, `MoodQuadrant`, `SplittingResolvedFeeling`, `StreakKey`. — ACH-10, S-1, S-9
- [ ] **1.2** New entities + EF configurations: `BadgeDefinition`, `UserBadge`, `UserStreak`, `DailyGiftOpen`, `GroundingExerciseCompletion`; DbSets on `AmoriDbContext`. Unique indexes per design §2.1. — ACH-10, ACH-11, ACH-15, S-10, S-11, S-13
- [ ] **1.3** Column additions to `User`, `MoodCheckIn`, `SplittingSession`, `Memory`, `TimelineEvent`, `VisionBoardSection`, `DateIdea`, `VaultGift`, `GameSession`, `Hug` (`HoldDurationMs`). — S-1…S-9, S-12, S-14
- [ ] **1.4** Delete `Domain/Entities/Badge.cs`, `BadgeConfiguration.cs`, `AmoriDbContext.Badges`, `BadgeResponse`'s level-oriented fields. — ACH-13
- [ ] **1.5** `BadgeCatalogue.All` — the single C# source of truth: 79 `BadgeDefinitionSeed` records with stable Guids, slugs, titles, taglines, categories, tiers, hidden flags, criteria types, thresholds, params, sort orders, asset keys. Covers ACH-B01…B38 (imported), ACH-B50…B83 (new), ACH-B90…B97 (levels). — ACH-10, ACH-18, §4 of requirements
- [ ] **1.5a** Assign `asset_key` per design §11.3: 17 own art, 18 shared (tier ladders + 8 level badges on `eternal_bond`), 5 orphan assignments (`rainbow_after_rain`→`whole-spectrum`, `completionist`→`open-book`, `voice_of_love`→`whispered-words`, `our_soundtrack`→`same-wavelength`, `time_capsule`→`days-together-365`), remainder `null` → placeholder. — ACH-A01, ACH-A04
- [ ] **1.6** Migration `AddBadgeCatalogueAndGamificationTables` — creates `user_points`, `points_history` (never migrated, finding F-1), the five new tables; `DROP TABLE IF EXISTS badges`. — ACH-10, ACH-11, F-1
- [ ] **1.7** Migration `AddBadgeCriteriaColumns` — the 1.3 additions.
- [ ] **1.8** Migration `SeedBadgeDefinitions` — generated `INSERT … ON CONFLICT (slug) DO UPDATE` from `BadgeCatalogue.All`, plus `AmoriDbSeeder.SeedBadgeDefinitionsAsync` for the `EnsureCreated` test path. — ACH-19
- [ ] **1.9** Verify: `dotnet ef migrations list`, apply against a scratch database, confirm 79 rows and that re-running the seeder changes nothing.

## Phase 2 — Local time and streaks

- [ ] **2.1** `ClientLocalTime`, `IClientLocalTimeAccessor`, `ClientLocalTimeMiddleware` with the validation table from design §6. — ACH-T01, T03, T04
- [ ] **2.2** Last-known offset/date persistence, debounced to once per user per day. — ACH-T05
- [ ] **2.3** `StreakService.Credit` + `UserStreak` upsert helper. — ACH-T06, T07, ACH-16
- [ ] **2.4** `MoodQuadrant` derivation from `(Mood, Intensity)`, matching the client's `WeeklyReflectionSnapshot` mapping. Confirm the client mapping first — do not guess it. — S-9, ACH-B79
- [ ] **2.5** Tests: `ClientLocalTimeTests`, `StreakServiceTests` — DST both directions, `+840`/`-720` accepted, `±841` rejected, Sunday 23:59 vs Monday 00:00, midnight rollover mid-request, tampered date discarded. — ACH-TEST-09…13

## Phase 3 — Evaluator core

- [ ] **3.1** `BadgeEvaluationContext`, `IBadgeCriteriaEvaluator`, `BadgeTrigger`, `TriggerSpec`, `BadgeAudience`, `BadgeTriggerMap`, `BadgeAwardSource`. — ACH-20, ACH-20a, ACH-22
- [ ] **3.2** `BadgeEvaluator` orchestrator: resolve handlers, skip earned, measure, insert, catch `23505`, two-pass meta cascade, and the per-recipient loop for `ActorAndPartner` triggers (only the actor's awards reach the `rewards` envelope). — ACH-15, ACH-20a, ACH-22
- [ ] **3.3** `RewardService` facade: own scope via `IServiceScopeFactory`, points + badges + notifications, swallows and logs everything. — ACH-21, ACH-23, ACH-24
- [ ] **3.4** Startup self-check: every `BadgeCriteriaType` used by the catalogue has exactly one handler. — design §3.1
- [ ] **3.5** The 13 evaluator classes (design §3): Hug, Chat, Message, CheckIn, Memory, Timeline, Vision, Planning, Support, Splitting, Incident, Game, Progression. Batch one query group per area.
- [ ] **3.6** DI registration in the `// ── Users ──` block of `ApplicationServicesExtensions`.
- [ ] **3.7** Tests: one `*CriteriaTests` class per evaluator, threshold −1 / = / +1. — ACH-TEST-01
- [ ] **3.8** Tests: `BadgeAwardIdempotencyTests` (sequential + 8-way parallel), `RewardServiceResilienceTests`. — ACH-TEST-02, 03, 04

## Phase 4 — Points rework

- [ ] **4.1** `PointValues` table; `IPointsService.AwardAsync(userId, activityType, …)`. — ACH-25
- [ ] **4.2** Fix `AddPointsAsync`: persist a first-ever `UserPoints` row, single `SaveChangesAsync`, remove the nested badge save. — ACH-27, finding F-3
- [ ] **4.3** Restrict `POST /api/users/me/points` to `ManualAdjustment` (422 otherwise). — ACH-26
- [ ] **4.4** Typed `PointsHistoryEntryResponse`; clamp `limit` to 1…200.
- [ ] **4.5** Once-per-local-day guard for `MorningCheckIn` and `DailyGiftOpened`, keyed on the client-sent local date. — ACH-T02

## Phase 5 — Handler hooks

Each sub-task: call `RewardService.GrantAsync` after the existing `SaveChangesAsync`, add `Rewards` to the response DTO, populate it. Satisfies ACH-21, ACH-25, ACH-33.

- [ ] **5.1** Relationships — `AcceptRequestAsync`. — ACH-B50
- [ ] **5.2** Hugs — send (`HoldDurationMs` on the request, clamped 0…600000; `HugSent` + `HugHeld` when ≥3000 ms), acknowledge (first-ack guard, `ActorAndPartner` audience so `golden-hour` reaches both). — ACH-B01…B10, B53, B54, B83, ACH-25b, ACH-20a
- [ ] **5.3** Let's Chat — `SendAsync` real-send path. — ACH-B51, B52
- [ ] **5.4** Mood — `CreateCheckInAsync` + quadrant/local-date persistence. — ACH-B11…B18, B33, B34, B79, B82
- [ ] **5.5** Memories, Timeline (+ `SourceVisionBoardItemId` plumbing). — ACH-B19, B22, B23, B35…B37, B78, B63
- [ ] **5.6** Vision board — create/complete item, create section, pin. — ACH-B25, B26, B62, B63, B64
- [ ] **5.7** Planning — bucket list create (`TodoAdded` when `Category == ToDoList`, else `BucketListAdded`) and complete, important dates, calendar, date ideas (+ `LastRandomlySuggestedAt` on `/api/dates/random`). — ACH-B27, B28, B69, B70, B71, ACH-25a
- [ ] **5.8** Support profile `SaveSectionsAsync`, weekly reflection `SaveAsync`, emergency acknowledge. — ACH-B55, B56, B31, B32
- [ ] **5.9** Splitting `CompleteAsync` + `ResolvedFeeling`. — ACH-B57, B58
- [ ] **5.10** Incidents — resolve, add lesson. — ACH-B59, B60, B61
- [ ] **5.11** Vault — gift create/send (+ `SentByUserId`), new `POST /api/vault/daily-gift/open`. — ACH-B72, B73, B81
- [ ] **5.12** Games — session complete (+ `ResultDetails`), quiz complete, would-you-rather answer, new `POST /api/distraction/grounding/completions`. — ACH-B29, B30, B74…B77, B80
- [ ] **5.13** Messages `SendAsync`; `UserService.GetCurrentUserAsync` → `AppOpened`. — ACH-B20, B21, ACH-T09

## Phase 6 — API surface

- [ ] **6.1** `BadgeCatalogueEntryResponse`, `BadgeProgressResponse`, `BadgesSummaryResponse`, `RewardsResponse`.
- [ ] **6.2** `GET /api/users/me/badges` — full catalogue, hidden omission, clamped progress, `null` progress for unmeasurable. — ACH-30, ACH-31, ACH-17
- [ ] **6.3** `GET /api/users/me/badges/summary`. — ACH-32
- [ ] **6.4** `POST /api/users/me/badges/{slug}/archive` — 404 / 403 / 200 / idempotent repeat. — ACH-34
- [ ] **6.5** Remove `GET /api/users/me/badge-stats`, `IBadgeStatsService` and `BadgeStatsService`; its counters are now evaluator criteria. — ACH-35
- [ ] **6.6** Confirm no partner-facing endpoint or DTO exposes badges, points, level or progress. — ACH-14
- [ ] **6.7** Tests: `BadgesApiTests`, `BadgesTwoUserTests` (incl. the `golden-hour` dual-award and the `TodoAdded`/`HugHeld` points boundaries). — ACH-TEST-05…08b

## Phase 7 — Background work

- [ ] **7.1** `BadgeTimeMonitor` — hourly tick, once-per-user-per-UTC-day, paged 500, notifies. — ACH-28, ACH-T09
- [ ] **7.2** `BadgeBackfillRunner` — resumable via `BadgesBackfilledAt`, `IsBackfilled = true`, silent. — ACH-29
- [ ] **7.3** Register both as hosted services next to `IncidentSlaMonitor`.
- [ ] **7.4** Tests: `BadgeTimeMonitorTests`, `BadgeBackfillTests`. — ACH-TEST-14, 15

## Phase 8 — Notifications

- [ ] **8.1** `NotificationTypes.BadgeEarned`; emit one per badge from `RewardService`. — ACH-40, ACH-42
- [ ] **8.2** Confirm master-switch-only gating; no per-type toggle. — ACH-41
- [ ] **8.3** Client `notificationTypes.ts` + `resolveNotificationRoute` shared by both handlers. — ACH-47
- [ ] **8.4** Fix BUG-12 in `NotificationsScreen.tsx` and `pushHandlers.ts`; delete `'VisionBoardItem'`, `'CalendarEvent'`, `data.eventDate`, `'LevelUp'`; align `Gift` params. — ACH-45, ACH-46
- [ ] **8.5** `BadgeEarned` → `Profile → Achievements` in both handlers; widen `ProfileStackParamList.Achievements` to `{ slug?: string }`. — ACH-43, ACH-44

## Phase 9 — Client

- [ ] **9.1** Local-date headers attached centrally in `client.ts`. — ACH-T01
- [ ] **9.2** `pointsService.ts`: drop `getBadgeStats`, retype `getBadges`, `archiveBadge(slug)`, mark `addPoints` dev-only. Verify BUG-01 closed. — ACH-50, ACH-52
- [ ] **9.3** **Do this first in Phase 9** — it unblocks the bundle. Delete `src/constants/badges.ts` (23 of its 40 `require()`s point at files that no longer exist); move types to `badge.types.ts` and the art map to `badgeAssets.ts`, which lists **only files present on disk** plus `badgeArt()` + `BADGE_PLACEHOLDER`. — ACH-12, ACH-56, ACH-58
- [ ] **9.4** Rewrite `badgeService.ts` as a server-state cache. — ACH-12
- [ ] **9.5** `userPointsStore`: delete client level math, hold the server payload, remove the `require()` escape hatches, clear on sign-out. Verify BUG-03 closed. — ACH-51, ACH-57
- [ ] **9.6** `rewardQueueStore` + `captureRewards` helper; wrap mutating feature calls. — ACH-54
- [ ] **9.7** Replace `useBadgeRewardListener` polling with a queue subscription. — ACH-54
- [ ] **9.8** `AchievementsScreen`, `BadgeGrid`, `BadgeDisplay`, `BadgeDetailsModal`: locked / earned / progress from server data, `null` progress → no bar. — ACH-53
- [ ] **9.9** `VaultScreen` archive via `badgeService.archive`. — ACH-55
- [ ] **9.10** Client payload additions: splitting `resolvedFeeling`, game `resultDetails` (2048 highest tile, hidden-number found), grounding completion call, daily-gift open call. — S-1, S-7, S-8, S-10, S-11
- [ ] **9.10a** Hug `holdDurationMs` — **needs a product decision first.** The server accepts it and awards `HugHeld` at ≥3 s, but `NeedAHugScreen` sends the hug from `onLongPress`, which fires at the long-press threshold while the finger is still down. The only duration measurable at that instant is the threshold itself (~500 ms), so nothing would ever qualify. Earning `HugHeld` means sending on release after a sustained hold instead — a change to how sending a hug feels, so it is not being made unilaterally. Until then `holdDurationMs` is omitted and `HugHeld` does not fire. — S-14, ACH-25b
- [ ] **9.11** Tests: every `ART` entry resolves; `AWAITING_ART` equals exactly the catalogue's art-less keys; every catalogue entry resolves through `badgeArt()`; header attachment; reward queue dedupe. — ACH-TEST-16, ACH-A03
- [ ] **9.12** `npx tsc --noEmit` clean for every file this spec touches.

## Phase 10 — Documentation

- [ ] **10.1** Rewrite BRD §6.17: server-authoritative model, 79-badge table with ACH-B IDs, endpoints, local-date contract, device-time trust risk, backfill `earnedAt` caveat, `TodoAdded` left unhooked. — ACH-DOC-01
- [ ] **10.2** BRD §9: close BUG-01, BUG-03, BUG-12 with verifying requirement IDs; add the missing-migration defect (F-1); note that `ForbiddenException` now exists for BUG-07. — ACH-DOC-02
- [ ] **10.3** BRD §5.4: add `BadgeEarned`; clear the BUG-12 "⚠ Nothing" markers. — ACH-DOC-03
- [ ] **10.4** BRD §8: data-model diagram and ownership table for the new tables. — ACH-DOC-04
- [ ] **10.5** BRD §11: move Achievements off P3 now that it has a UI and a server contract.
- [ ] **10.7** BRD §6.17: correct the point-value table — all nine earnable ActivityTypes now fire server-side, `TodoAdded` maps to `ToDoList`-category bucket-list items, and `HugHeld` needs a ≥3 s hold. Remove the "client never calls the points API" caveat.
- [ ] **10.6** BRD §6.17: note that ~39 badges ship on placeholder art, with `AWAITING_ART` as the tracked list, so QA treats a placeholder as expected rather than raising it as a defect. — ACH-A02, ACH-A03

## Verification gate

- [ ] `dotnet build backend/Amori.sln` clean.
- [ ] `dotnet test backend/Amori.sln` green (requires Docker for Testcontainers).
- [ ] `npx tsc --noEmit` clean.
- [ ] `npm test` green.
- [ ] Manual: fresh user → send 10 hugs → badge push arrives, tap opens Achievements on `first-embrace`, reward modal shows once, Vault archive persists, Achievements shows correct locked/earned/progress.
