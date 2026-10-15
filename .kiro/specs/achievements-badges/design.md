# Achievements & Badges — Design

Status: **for approval**
Requirements: `./requirements.md`

## 1. Architecture

```
┌─ Feature handler (HugService, MoodService, …) ────────────────────────┐
│  1. domain write                                                      │
│  2. await db.SaveChangesAsync(ct)          ← parent txn committed      │
│  3. var rewards = await rewards.GrantAsync(userId, trigger, ctx, ct)   │
│  4. return dto with dto.Rewards = rewards                             │
└───────────────────────────────────────────────────────────────────────┘
                                   │  never throws
                                   ▼
          ┌─ IRewardService (scoped facade) ──────────────────────────┐
          │  own DbContext scope via IServiceScopeFactory             │
          │  a) IPointsService.AwardAsync(activityType)   → points    │
          │  b) IBadgeEvaluator.EvaluateAsync(trigger)    → badges    │
          │  c) INotificationService.CreateAsync(BadgeEarned) per badge│
          └───────────────────────────────────────────────────────────┘
                                   ▲
      ┌────────────────────────────┴───────────────────────────┐
      │                                                        │
 BadgeTimeMonitor (daily BackgroundService)          BadgeBackfillRunner
 time-based criteria, notifies                       all criteria, silent
```

The seam is deliberately the same one `INotificationService` already occupies: called by the service method after its own save, best-effort, never allowed to break the caller. There is no `SaveChangesAsync` override, no domain-event dispatcher and no `IUnitOfWork` in this codebase, and introducing one for badges would be a disproportionate change.

### 1.1 Why a separate DbContext scope (ACH-24)

`IRewardService` resolves its own scope from `IServiceScopeFactory`. The cost is one extra pooled connection per awarding request; the benefits are decisive:

- A `DbUpdateException` from a unique-constraint race (ACH-15) cannot leave the parent request's `ChangeTracker` in a broken state, which would otherwise poison a later `SaveChangesAsync` in the same request.
- The parent's write is already committed, so the evaluator reads committed data and the "after the main transaction succeeds" guarantee is structural rather than a comment.
- Evaluator queries use `AsNoTracking()` without interfering with entities the parent still holds.

## 2. Data model

### 2.1 New entities

All under `Domain/Entities/`, deriving from `BaseEntity`, following the existing `ToTable("snake_case")` + `HasColumnName` + explicit index naming convention.

```csharp
// Domain/Entities/BadgeDefinition.cs
public sealed class BadgeDefinition : BaseEntity
{
    public string Slug { get; set; } = string.Empty;          // kebab-case, unique, immutable
    public string Title { get; set; } = string.Empty;
    public string Tagline { get; set; } = string.Empty;
    public BadgeCategory Category { get; set; }
    public BadgeTier Tier { get; set; } = BadgeTier.Common;
    public bool IsHidden { get; set; }
    public BadgeCriteriaType CriteriaType { get; set; }
    public int Threshold { get; set; } = 1;
    public string? CriteriaParams { get; set; }               // jsonb
    public int SortOrder { get; set; }
    public string AssetKey { get; set; } = string.Empty;       // image basename, may be shared
    public ICollection<UserBadge> UserBadges { get; set; } = [];
}

// Domain/Entities/UserBadge.cs
public sealed class UserBadge : BaseEntity
{
    public Guid UserId { get; set; }
    public Guid BadgeId { get; set; }
    public DateTime EarnedAt { get; set; }
    public DateTime? ArchivedAt { get; set; }
    /// <summary>True when granted by the one-off backfill: no notification, no reward modal.</summary>
    public bool IsBackfilled { get; set; }
    public User User { get; set; } = null!;
    public BadgeDefinition Badge { get; set; } = null!;
}

// Domain/Entities/UserStreak.cs — ACH-T06
public sealed class UserStreak : BaseEntity
{
    public Guid UserId { get; set; }
    public StreakKey StreakKey { get; set; }
    public DateOnly LastCreditedLocalDate { get; set; }
    public int CurrentLength { get; set; }
    public int LongestLength { get; set; }   // high-water mark, ACH-16
    public User User { get; set; } = null!;
}

// Domain/Entities/DailyGiftOpen.cs — S-11
public sealed class DailyGiftOpen : BaseEntity
{
    public Guid UserId { get; set; }
    public DateOnly LocalDate { get; set; }
    public DateTime OpenedAt { get; set; }
    public User User { get; set; } = null!;
}

// Domain/Entities/GroundingExerciseCompletion.cs — S-10
public sealed class GroundingExerciseCompletion : BaseEntity
{
    public Guid UserId { get; set; }
    public string ExerciseKey { get; set; } = string.Empty;   // "box-breathing", "5-4-3-2-1", …
    public int? DurationSeconds { get; set; }
    public DateOnly LocalDate { get; set; }
    public DateTime CompletedAt { get; set; }
    public User User { get; set; } = null!;
}
```

Indexes:

| Table | Index | Kind |
|-------|-------|------|
| `badge_definitions` | `IX_badge_definitions_slug` | unique |
| `badge_definitions` | `IX_badge_definitions_criteria_type` | — |
| `user_badges` | `IX_user_badges_user_badge` (`user_id`, `badge_id`) | **unique** — the idempotency guarantee |
| `user_badges` | `IX_user_badges_user_id` | — |
| `user_streaks` | `IX_user_streaks_user_key` (`user_id`, `streak_key`) | unique |
| `daily_gift_opens` | `IX_daily_gift_opens_user_date` (`user_id`, `local_date`) | unique |
| `grounding_exercise_completions` | `IX_grounding_completions_user_id` | — |

### 2.2 Changes to existing entities

| Entity | Change | Req |
|--------|--------|-----|
| `User` | `+ int? LastKnownUtcOffsetMinutes`, `+ DateOnly? LastKnownLocalDate`, `+ DateTime? BadgesBackfilledAt`; nav `Badges` retyped to `ICollection<UserBadge>` | S-12 |
| `MoodCheckIn` | `+ MoodQuadrant? Quadrant`, `+ DateOnly? LocalDate`, `+ int? UtcOffsetMinutes` | S-9 |
| `SplittingSession` | `+ SplittingResolvedFeeling? ResolvedFeeling` | S-1 |
| `Memory` | `+ Guid? SourceVisionBoardItemId` (FK, `OnDelete.SetNull`) | S-2 |
| `TimelineEvent` | `+ Guid? SourceVisionBoardItemId` (FK, `OnDelete.SetNull`) | S-2 |
| `VisionBoardSection` | `+ Guid? CreatedByUserId` | S-3 |
| `DateIdea` | `+ DateTime? LastRandomlySuggestedAt` | S-5 |
| `VaultGift` | `+ Guid? SentByUserId` | S-6 |
| `GameSession` | `+ string? ResultDetails` (jsonb) | S-7, S-8 |
| `Hug` | `+ int? HoldDurationMs`, plus the same field on `SendHugRequest` | S-14, ACH-25b |
| **Deleted** | `Domain/Entities/Badge.cs`, `Data/Configurations/BadgeConfiguration.cs`, `AmoriDbContext.Badges` | ACH-13 |

### 2.3 New enums (`Domain/Enums/`)

```csharp
public enum BadgeTier { Common = 1, Rare = 2, Legendary = 3 }

public enum BadgeCategory
{
    Hugs = 1, CheckIns = 2, MemoryVault = 3, Messages = 4, Timeline = 5,
    VisionBoard = 6, BucketList = 7, Games = 8, Mood = 9, Media = 10,
    Relationship = 11, Support = 12, Incidents = 13, Dates = 14,
    Reflection = 15, Gifts = 16, Progression = 17, Special = 18,
}

public enum MoodQuadrant { HighPleasant = 1, LowPleasant = 2, HighUnpleasant = 3, LowUnpleasant = 4 }

public enum SplittingResolvedFeeling { OkayNow = 1, StillStruggling = 2, NeedSpace = 3 }

public enum StreakKey { CheckIn = 1, HugSent = 2, DailyGiftOpen = 3, SameSky = 4 }
```

`eternal-bond` (ACH-B38) counts categories excluding `Progression` and `Special`, i.e. 16.

### 2.4 Migrations

Because of F-1, the first migration necessarily creates the long-missing gamification tables too.

1. **`AddBadgeCatalogueAndGamificationTables`**
   - `CreateTable` for `user_points`, `points_history` (never migrated — F-1), `badge_definitions`, `user_badges`, `user_streaks`, `daily_gift_opens`, `grounding_exercise_completions`.
   - `DropTable` for `badges` guarded by `DROP TABLE IF EXISTS badges;` — the table may exist in a hand-managed environment even though no migration created it.
2. **`AddBadgeCriteriaColumns`** — the §2.2 column additions, all nullable, no backfill needed.
3. **`SeedBadgeDefinitions`** — `migrationBuilder.Sql` with a generated `INSERT … ON CONFLICT (slug) DO UPDATE SET title=…, tagline=…, sort_order=…, asset_key=…, tier=…` block (ACH-19). Chosen over `HasData` because the repo has no `HasData` anywhere and over the runtime `AmoriDbSeeder` because the catalogue must exist before the first request, including in the test fixture which calls `EnsureCreatedAsync()` rather than migrating.

> `EnsureCreatedAsync()` does not run migrations, so the test fixture would miss SQL-only seeding. Mitigation: the seed rows are generated from a single C# source of truth, `BadgeCatalogue.All` (a `static readonly` array of `BadgeDefinitionSeed` records), consumed by both the migration generator and `AmoriDbSeeder.SeedBadgeDefinitionsAsync`, which the test fixture calls. One list, two delivery mechanisms, no drift.

## 3. Criteria taxonomy

`BadgeCriteriaType` is one value per criterion *family*, with `Threshold` and `CriteriaParams` carrying the variation. 79 badges reduce to 48 criteria types, grouped into 13 evaluator classes.

| Evaluator class | Criteria types | Data source |
|---|---|---|
| `HugCriteriaEvaluator` | `HugsSent`, `HugsSentWithWhisper`, `HugsAcknowledgedByUser`, `FastHugAcknowledgements`, `NightHugsSentLocal`, `MutualHugLocalDays`, `LongDistanceHugsSent`, `HugAcknowledgedWithinSeconds`, `HugSentLocalDayStreak` | `Hugs`, `User.LastKnownUtcOffsetMinutes`, `UserStreak` |
| `ChatCriteriaEvaluator` | `ChatMessagesSent`, `ChatReciprocationsWithinHours` | `ChatConversations` (`SentAt != null`, never `Status == Sent` — status later becomes `Read`) |
| `MessageCriteriaEvaluator` | `HighVolumeMessageDays` | `Messages` grouped by local day |
| `CheckInCriteriaEvaluator` | `CheckInsOfType`, `CheckInLocalDayStreak`, `MoodCheckInsLogged`, `DistinctMoodsLogged`, `QuadrantsInLocalWeek`, `PartnerSameLocalDayStreak` | `MoodCheckIns` (`LocalDate`, `Quadrant`), `UserStreak` |
| `MemoryCriteriaEvaluator` | `MemoriesCreated`, `MemoriesSavedToVault`, `MemoriesWithLocation`, `MemoriesOnAnniversary`, `MediaShared` | `Memories`, `MemoryMedia`, `VaultGifts`, `Relationship.AnniversaryDate` |
| `TimelineCriteriaEvaluator` | `TimelineEventsAdded`, `YearsTogether` | `TimelineEvents`, `Relationship.AnniversaryDate` |
| `VisionCriteriaEvaluator` | `VisionItemsAdded`, `VisionItemsCompleted`, `VisionMadeReal`, `CustomSectionWithPinnedItems` | `VisionBoardItems`, `VisionBoardSections`, `Memory/TimelineEvent.SourceVisionBoardItemId` |
| `PlanningCriteriaEvaluator` | `BucketListItemsCompleted`, `ImportantDatesCreated`, `DateIdeasCompleted`, `RandomDateIdeaCompleted` | `BucketListItems`, `ImportantDates`, `CalendarEvents`, `DateIdeas` |
| `SupportCriteriaEvaluator` | `SupportProfileSectionsComplete`, `WeeklyReflectionsSaved`, `EmergencyAcknowledgements`, `FastEmergencyAcknowledgements`, `GroundingExercisesCompleted` | `SupportProfileCompletion.Calculate`, `WeeklyReflectionArchives`, `EmergencyRequests`, `GroundingExerciseCompletions` |
| `SplittingCriteriaEvaluator` | `SplittingResolvedOkay`, `SplittingSpaceWindowsCompleted` | `SplittingSessions` |
| `IncidentCriteriaEvaluator` | `IncidentsResolved`, `IncidentLessonsWritten`, `IncidentsResolvedBeforeDue` | `RelationshipIncidents`, `RelationshipIncidentLessons` |
| `GameCriteriaEvaluator` | `GamesPlayed`, `PerfectQuizScores`, `MatchingWouldYouRatherAnswers`, `HiddenNumberPuzzlesFound`, `Game2048TileReached` | `GameSessions` (+`ResultDetails`), `QuizSessions`, `WouldYouRatherAnswers` |
| `ProgressionCriteriaEvaluator` | `PartnerLinked`, `DaysTogetherLocal`, `GiftsSent`, `DailyGiftOpenLocalDayStreak`, `LevelReached`, `CategoriesWithEarnedBadge` | `RelationshipMembers`, `Relationship.AnniversaryDate`, `VaultGifts`, `UserStreak`, `UserPoints`, `UserBadges` |

### 3.1 Evaluator contract

```csharp
public interface IBadgeCriteriaEvaluator
{
    /// <summary>The criteria types this evaluator can measure.</summary>
    IReadOnlySet<BadgeCriteriaType> Handles { get; }

    /// <summary>
    /// Current progress for one definition. Uncapped — the caller clamps for
    /// display (ACH-31) but compares the raw value against the threshold.
    /// Returns null when the criterion cannot be measured for this user
    /// (e.g. no partner yet), which reads as "not tracked" rather than zero.
    /// </summary>
    Task<int?> MeasureAsync(BadgeEvaluationContext ctx, BadgeDefinition def, CancellationToken ct);
}

public sealed record BadgeEvaluationContext(
    Guid UserId,
    Guid? RelationshipId,
    Guid? PartnerUserId,
    DateOnly? PartnerLastLocalDate,
    DateOnly? AnniversaryDate,
    ClientLocalTime LocalTime,
    AmoriDbContext Db);
```

All 13 are registered `AddScoped<IBadgeCriteriaEvaluator, …>()` and resolved as `IEnumerable<IBadgeCriteriaEvaluator>`; the orchestrator builds a `Dictionary<BadgeCriteriaType, IBadgeCriteriaEvaluator>` once per scope from `Handles`. A startup self-check asserts every `BadgeCriteriaType` in `BadgeCatalogue.All` has exactly one handler, so a new badge with an unhandled criterion fails fast at boot rather than silently never awarding.

### 3.2 Trigger → criteria map (ACH-22)

```csharp
public enum BadgeTrigger
{
    PartnerLinked, HugSent, HugAcknowledged, ChatSent, CheckInCreated,
    MemoryCreated, TimelineEventCreated, VisionItemCreated, VisionItemCompleted,
    VisionSectionCreated, VisionItemPinned,
    BucketListItemCreated, BucketListItemCompleted,
    ImportantDateCreated, CalendarEventCreated, DateIdeaCompleted,
    SupportProfileUpdated, WeeklyReflectionSaved, SplittingSessionCompleted,
    IncidentResolved, IncidentLessonAdded, GiftSent, DailyGiftOpened,
    GameSessionCompleted, QuizSessionCompleted, WouldYouRatherAnswered,
    GroundingExerciseCompleted, EmergencyAcknowledged, MessageSent,
    PointsAwarded, AppOpened, DailyJob, Backfill,
}
```

`BadgeTriggerMap` is a `static readonly FrozenDictionary<BadgeTrigger, BadgeCriteriaType[]>`. `Backfill` maps to all types; `DailyJob` maps to the time-only set (`DaysTogetherLocal`, `YearsTogether`, `SplittingSpaceWindowsCompleted`, `PartnerSameLocalDayStreak`); `AppOpened` maps to the same time-only set plus `CategoriesWithEarnedBadge` and `LevelReached` (ACH-T09). `PointsAwarded` maps to `LevelReached` and `CategoriesWithEarnedBadge` so a level badge can cascade into `eternal-bond`.

Cascade handling: awarding a badge can satisfy `CategoriesWithEarnedBadge`. The orchestrator therefore runs a **second** pass limited to meta criteria when the first pass awarded anything, with a hard cap of 2 passes to preclude loops.

### 3.4 Multi-recipient triggers (ACH-20a)

Some events earn a badge for both partners. `golden-hour` goes to the acknowledger *and* the sender; `same-sky` depends on both partners' check-in dates; `knot-undone` fires for either partner resolving an incident. Rather than special-casing these inside evaluators, the audience is declared on the trigger:

```csharp
public enum BadgeAudience { Actor, ActorAndPartner }

// BadgeTriggerMap entries carry it alongside the criteria list.
public sealed record TriggerSpec(BadgeCriteriaType[] Criteria, BadgeAudience Audience);
```

`ActorAndPartner` triggers: `HugAcknowledged`, `CheckInCreated`, `IncidentResolved`, `PartnerLinked`, `VisionItemCompleted`, `BucketListItemCompleted`. The orchestrator resolves the partner via `IRelationshipAccessService.GetPartnerAsync`, then runs the **same** evaluate-and-award loop once per recipient with that recipient as `ctx.UserId`. Consequences that fall out for free:

- Idempotency is per (user, badge), so the partner's award is independently race-safe (ACH-15).
- Each recipient's criteria are measured from *their* own perspective — `golden-hour` asks "was a hug involving me acknowledged within 60 s", which is true for both parties from one `Hug` row, with no asymmetric logic.
- Only the actor's new badges go into the response `rewards` envelope. The partner is not in the request, so they learn of theirs through the `BadgeEarned` notification, which is the existing mechanism for partner-side effects.
- A solo user (no partner) degrades to `Actor` silently.

`golden-hour`'s criterion is therefore `HugAcknowledgedWithinSeconds` measured as `Hugs.Any(h => (h.SenderId == me || h.RecipientId == me) && h.AcknowledgedAt - h.CreatedAt <= 60s)`, identical for both users.

### 3.3 Awarding algorithm (ACH-15, ACH-16)

```
for each definition D whose CriteriaType ∈ map[trigger]:
    if D already in earnedSlugs → skip
    current = evaluator.Measure(ctx, D)
    if current is null or current < D.Threshold → record progress, continue
    insert UserBadge { UserId, BadgeId = D.Id, EarnedAt = clock.Now, IsBackfilled = source == Backfill }
try SaveChangesAsync
catch DbUpdateException when IsUniqueViolation(ex, "IX_user_badges_user_badge"):
    // lost a race; re-read the earned set, keep only rows we actually inserted
    detach + re-query + report only genuinely-new badges
```

`IsUniqueViolation` inspects `PostgresException.SqlState == "23505"`. The unique index is the single authority on "earned once"; no advisory lock, no `SELECT … FOR UPDATE`, nothing to deadlock. Two concurrent requests both see "not earned", both insert, one wins, the loser reports zero new badges — so exactly one notification is created (ACH-TEST-03).

Streak criteria read `UserStreak.LongestLength`, which only ever increases, satisfying ACH-16 without special-casing.

## 4. Hook points

Each row: the handler, the trigger raised after its `SaveChangesAsync`, and the points awarded. "Rewards on response" marks DTOs gaining a `Rewards` property (ACH-33).

| Handler (file:method) | Trigger | ActivityType (pts) | Rewards on response |
|---|---|---|---|
| `PartnerLinkService.AcceptRequestAsync` | `PartnerLinked` | — | `RelationshipResponse` |
| `HugService.SendHugAsync` | `HugSent` | `HugSent` (10) **+ `HugHeld` (5) when `HoldDurationMs >= 3000`** | `HugResponse` |
| `HugService.AcknowledgeAsync` (first ack only — honour `wasAlreadyAcknowledged`) | `HugAcknowledged` → **actor + partner** | — | `HugResponse` |
| `ChatService.SendAsync` (real-send path, after line ~188) | `ChatSent` | — | `ChatConversationResponse` |
| `MoodService.CreateCheckInAsync` | `CheckInCreated` | `MorningCheckIn` (10, once per local day) | `CheckInResponse` |
| `MemoryService.CreateAsync` | `MemoryCreated` | — | `MemoryResponse` |
| `TimelineService.CreateAsync` | `TimelineEventCreated` | — | `TimelineEventResponse` |
| `VisionBoardService.CreateItemAsync` | `VisionItemCreated` | `VisionAdded` (10) | `VisionBoardItemResponse` |
| `VisionBoardService.CompleteItemAsync` | `VisionItemCompleted` | — | `VisionBoardItemResponse` |
| `VisionBoardService.CreateSectionAsync` / `SetPinnedAsync` | `VisionSectionCreated` / `VisionItemPinned` | — | section/item response |
| `BucketListService.CreateAsync` | `BucketListItemCreated` | **`TodoAdded` (10) when `Category == ToDoList`, else `BucketListAdded` (10)** | item response |
| `BucketListService.CompleteAsync` | `BucketListItemCompleted` → actor + partner | — | item response |
| `ImportantDateService.CreateAsync`, `CalendarService.CreateAsync` | `ImportantDateCreated` / `CalendarEventCreated` | — | item response |
| `DatePlannerService.CompleteAsync` | `DateIdeaCompleted` | — | `DateIdeaResponse` |
| `SupportProfileService.SaveSectionsAsync` (single choke point for all 8 update paths) | `SupportProfileUpdated` | — | `SupportProfileResponse` |
| `WeeklyReflectionArchiveService.SaveAsync` | `WeeklyReflectionSaved` | — | `WeeklyReflectionArchiveResponse` |
| `SplittingService.CompleteAsync` | `SplittingSessionCompleted` | `SosFlowCompleted` (20) | `SplittingSessionResponse` |
| `IncidentService.ResolveAsync` | `IncidentResolved` | — | `IncidentDetailResponse` |
| `IncidentService.AddLessonAsync` | `IncidentLessonAdded` | — | `IncidentLessonResponse` |
| `VaultService.CreateGiftToPartnerAsync` / `SendGiftToPartnerAsync` | `GiftSent` | `CardCollected` (10) | `SendGiftResult` |
| `VaultService.OpenDailyGiftAsync` (**new**) | `DailyGiftOpened` | `DailyGiftOpened` (15, once per local day) | `DailyGiftOpenResponse` |
| `DistractionService.CompleteSessionAsync` | `GameSessionCompleted` | — | `GameSessionResponse` |
| `QuizService.CompleteSessionAsync` | `QuizSessionCompleted` | — | quiz response |
| `DistractionService.AnswerWouldYouRatherAsync` | `WouldYouRatherAnswered` | — | answer response |
| `DistractionService.CompleteGroundingAsync` (**new**) | `GroundingExerciseCompleted` | — | completion response |
| `EmergencyService.AcknowledgeAsync` | `EmergencyAcknowledged` | — | request response |
| `MessageService.SendAsync` | `MessageSent` | — | `MessageResponse` |
| `PointsService.AddPointsAsync` | `PointsAwarded` | caller-supplied `ManualAdjustment` | `AddPointsResponse` |
| `UserService.GetCurrentUserAsync` | `AppOpened` | — | — (fire-and-forget) |

`MorningCheckIn` and `DailyGiftOpened` are once-per-local-day, enforced by `PointsHistory` lookup on the client-sent local date (not UTC), so a user cannot farm points by checking in repeatedly.

A single send can award two activity types (`HugSent` + `HugHeld`), so `AwardAsync` is called twice and `rewards.pointsAwarded` is the sum. `HoldDurationMs` is validated to `0 … 600000` and clamped rather than rejected — a bogus hold duration should not fail a hug.

With `TodoAdded` and `HugHeld` wired, all nine earnable `ActivityType` values now fire from a real handler (ACH-25). `ManualAdjustment` remains the tenth and is API-only.

## 5. Points service rework

`PointsService` gains an internal, server-owned value table and fixes F-3:

```csharp
private static readonly FrozenDictionary<ActivityType, int> PointValues = new Dictionary<ActivityType, int>
{
    [ActivityType.HugSent] = 10, [ActivityType.HugHeld] = 5,
    [ActivityType.VisionAdded] = 10, [ActivityType.TodoAdded] = 10,
    [ActivityType.BucketListAdded] = 10, [ActivityType.MorningCheckIn] = 10,
    [ActivityType.SosFlowCompleted] = 20, [ActivityType.DailyGiftOpened] = 15,
    [ActivityType.CardCollected] = 10,
}.ToFrozenDictionary();

// New server-only entry point. Amount is never client-supplied.
Task<PointsAwardResult> AwardAsync(Guid userId, ActivityType type, Guid? referenceId = null,
                                  string? metadata = null, CancellationToken ct = default);
```

Fixes applied:

- `UserPoints` is loaded with `FirstOrDefaultAsync`; when null a new row is **added to the change tracker** unconditionally (the `Id == Guid.Empty` guard is deleted — `BaseEntity` pre-seeds `Id`).
- Badge thresholds crossed by a multi-level jump are all awarded: the level-badge criterion is now `LevelReached` in the catalogue, and the evaluator compares `UserPoints.Level >= threshold`, so jumping 4 → 11 awards both `level-5` and `level-10`.
- One `SaveChangesAsync` for points + history (the nested save inside the old `AwardBadgeAsync` is gone — badges are now written by the evaluator in its own scope).
- `AddPointsRequest.ActivityType != ManualAdjustment` → `ValidationException` → 422 (ACH-26). `Amount` is honoured only for `ManualAdjustment`.
- `GetPointsHistoryAsync` returns a typed `PointsHistoryEntryResponse` instead of `List<object>`, and `limit` is clamped to 1…200.

## 6. Client local-time contract (ACH-T01 … T05)

```csharp
// Common/Time/ClientLocalTime.cs
public sealed record ClientLocalTime(DateOnly LocalDate, int UtcOffsetMinutes, bool WasTrusted)
{
    public static ClientLocalTime FromServerUtc(TimeProvider clock) =>
        new(DateOnly.FromDateTime(clock.GetUtcNow().UtcDateTime), 0, false);
}

public interface IClientLocalTimeAccessor { ClientLocalTime Current { get; } }
```

`ClientLocalTimeMiddleware` (registered after auth, before MVC) reads both headers once per request:

| Condition | Behaviour |
|---|---|
| Headers absent | `ClientLocalTime.FromServerUtc`, `WasTrusted = false`. No error — most endpoints do not need it. |
| Offset not an integer, or outside `-840 … +840` | `throw new ValidationException("…")` → **422** (ACH-T03). An explicitly wrong value is a client bug worth surfacing, unlike an absent one. |
| Date not `^\d{4}-\d{2}-\d{2}$` | 422, same reasoning. |
| `abs(localDate - serverUtcDate) > 1 day` | Discard, fall back to server UTC, `WasTrusted = false`, `LogWarning("Discarding client local date {ClientDate} for user {UserId}; server UTC date is {ServerDate}")` (ACH-T04). |
| Valid | Use it; update `User.LastKnownUtcOffsetMinutes` / `LastKnownLocalDate` when changed (ACH-T05). The user write is debounced to once per day per user to avoid an UPDATE on every request. |

`±840` covers UTC+14 (Kiritimati) and UTC−12, so no legitimate zone is rejected (ACH-TEST-10). A one-day tolerance is the minimum that works: a client at UTC+14 is legitimately "tomorrow" relative to server UTC, and one at UTC−12 legitimately "yesterday".

Nothing in the server reads `DateTime.UtcNow` for a day-based decision. Day-based code takes `ClientLocalTime`; everything else takes `TimeProvider` (registered `services.AddSingleton(TimeProvider.System)`), which is what makes ACH-TEST-09 … TEST-13 writable.

### 6.1 Streak maintenance (ACH-T06, T07)

```csharp
// Common/Time/StreakService.cs
public StreakOutcome Credit(UserStreak streak, DateOnly localDate)
{
    if (localDate <= streak.LastCreditedLocalDate) return StreakOutcome.AlreadyCredited; // no-op
    streak.CurrentLength = localDate.DayNumber - streak.LastCreditedLocalDate.DayNumber == 1
        ? streak.CurrentLength + 1
        : 1;
    streak.LastCreditedLocalDate = localDate;
    streak.LongestLength = Math.Max(streak.LongestLength, streak.CurrentLength);
    return StreakOutcome.Extended;
}
```

`DayNumber` arithmetic on `DateOnly` is DST-proof by construction: local *dates* are compared, never local *times*, so a 23-hour or 25-hour day is irrelevant (ACH-TEST-09). A date earlier than the last credited date is ignored rather than rewinding the streak — that is the clock-tampering containment, and it is why `LongestLength` is what badges read.

`same-sky` (ACH-B82) is credited only when both partners' stored `MoodCheckIn.LocalDate` sets contain the same date; each side's own local date is used, never converted (ACH-T08). It is evaluated on `CheckInCreated` for both partners and by the daily job.

## 7. Background job (ACH-T09, ACH-28)

`BadgeTimeMonitor : BackgroundService`, modelled directly on `IncidentSlaMonitor`: 30-second boot delay, `PeriodicTimer`, per-tick `scopeFactory.CreateScope()`, try/catch so a transient failure never kills the loop.

- Interval: 1 hour, with a guard that the time-based sweep runs at most once per user per UTC day. Hourly ticks mean a user at UTC+14 gets their `days-together` badge within an hour of their local midnight rather than up to 24 hours later.
- Pages users 500 at a time ordered by `Id`, filtered to those in a relationship with an `AnniversaryDate` — never `ToListAsync()` over all users.
- Uses `User.LastKnownUtcOffsetMinutes ?? 0` to compute each user's local date, which is the documented limitation in ACH-T09: the job cannot know the device's *current* offset, only the last one seen.
- Notifies (unlike the backfill), because these awards are genuinely new.

## 8. Backfill (ACH-29)

`BadgeBackfillRunner : BackgroundService`, started once after boot, separate from the daily monitor.

- Selects users with `BadgesBackfilledAt IS NULL`, 100 at a time, evaluates with `source = Backfill` (all criteria types), stamps `BadgesBackfilledAt = clock.Now`, saves per batch. A crash resumes exactly where it stopped.
- `IsBackfilled = true`, no `INotificationService` call, so nobody receives 40 pushes on deploy. The client suppresses the reward modal for backfilled badges.
- `EarnedAt` is set to the evaluation time rather than reconstructed from history. Deriving a truthful historical earn date would require replaying each counter's event stream per badge; the cost is not worth it and a wrong date is worse than an honest "awarded when we started tracking". This is stated in the BRD so QA does not treat it as a bug.
- Correctness does not depend on the marker: re-running is harmless because awarding is idempotent (ACH-15). The marker is purely a cost optimisation.

## 9. API

### 9.1 `GET /api/users/me/badges`

```jsonc
[
  {
    "slug": "first-embrace",
    "title": "First Embrace",
    "tagline": "Send 10 hugs and let your partner feel your warmth, even from afar.",
    "category": "Hugs",
    "tier": "Common",
    "assetKey": "first_embrace",
    "sortOrder": 101,
    "isEarned": true,
    "earnedAt": "2026-10-04T18:22:11Z",
    "archivedAt": null,
    "progress": { "current": 10, "target": 10 }
  },
  {
    "slug": "hug-collector",
    "isEarned": false, "earnedAt": null, "archivedAt": null,
    "progress": { "current": 37, "target": 100 }
    // …presentation fields elided
  }
]
```

Hidden-and-unearned entries are absent (ACH-17). `progress.current` is clamped to `target` (ACH-31); `target` is never 0. Criteria that return `null` from `MeasureAsync` serialise `progress: null`, which the client renders as "no progress bar" rather than 0 % — preserving the distinction the existing `isTracked` flag made client-side.

One request measures every visible definition. That is ~79 counters, which `BadgeStatsService` already demonstrates is acceptable as a handful of grouped queries, but each evaluator batches its measurements (one query per feature area, not per badge) and the result is cached per request scope.

### 9.2 `GET /api/users/me/badges/summary`

```jsonc
{ "earnedCount": 7, "totalVisible": 72, "recent": [ /* up to 5 catalogue entries, newest first */ ] }
```

### 9.3 `POST /api/users/me/badges/{slug}/archive`

Route changes from `{badgeId:Guid}` to `{slug}`. The only existing caller (`VaultScreen.tsx:257`) already passes a catalogue slug, so this fixes a live mismatch rather than breaking a working contract.

| Case | Status |
|---|---|
| Earned, not archived | 200, entry with `archivedAt` set |
| Earned, already archived | 200, unchanged (idempotent) |
| Slug not in catalogue | 404 `NotFoundException` |
| In catalogue, not earned by this user | **403** `ForbiddenException` (ACH-34) |

### 9.4 Rewards envelope (ACH-33)

```csharp
// Common/Responses/RewardsResponse.cs
public sealed class RewardsResponse
{
    public IReadOnlyList<BadgeCatalogueEntryResponse> NewBadges { get; init; } = [];
    public bool LeveledUp { get; init; }
    public int? NewLevel { get; init; }
    public int PointsAwarded { get; init; }
    public static readonly RewardsResponse None = new();
}
```

Added as `public RewardsResponse Rewards { get; set; } = RewardsResponse.None;` to the ~24 response DTOs in §4. Never null, so the client can read `response.rewards.newBadges` unconditionally. Handlers that return `NoContent()` cannot carry rewards; those actions rely on the next `summary` fetch, and the table in §4 lists no such handler.

### 9.5 403 infrastructure (ACH-36)

```csharp
// Common/Exceptions/ForbiddenException.cs
public sealed class ForbiddenException(string message = "You are not allowed to perform this action.")
    : Exception(message);
```

`ExceptionHandlingMiddleware` gains an arm mapping it to 403 with the existing envelope. This is new to the codebase (today every denial is a 401, which BUG-07 already flags as wrong because the client treats 401 as "token expired" and silently refreshes). We use it only for the ACH-34 case; converting the rest of the codebase's 401s is explicitly out of scope but the infrastructure now exists for BUG-07.

Ownership-scoped lookups keep returning 404 rather than 403 where revealing existence would itself be a leak — matching `VaultService.LoadOwnAsync`'s documented reasoning.

## 10. Notifications

- `NotificationTypes.BadgeEarned = "BadgeEarned"`, `referenceId` = slug.
- No case is added to `IsPushAllowed`: it falls to `_ => true`, which is already gated by `NotificationsEnabled && PushNotificationsEnabled` (ACH-41). A per-type toggle is not added — a user muting "partner activity" should not lose their own achievements.
- Title/body: `"Badge earned"` / `"{title} — {tagline}"`.
- Sent from `IRewardService` after a successful award, one per badge in `sort_order` (ACH-42), inside the same try/catch so a push failure cannot fail the parent request.
- `referenceId` is the slug, not a Guid. `AppNotification.ReferenceId` is already `string?`, so no schema change.

### 10.1 Client routing

A new shared module removes the drift that caused BUG-12 (ACH-47):

```ts
// src/services/notifications/notificationTypes.ts — mirrors NotificationTypes.cs
export const NOTIFICATION_TYPES = {
  hug: 'Hug', emergency: 'Emergency', incident: 'Incident',
  partnerActivity: 'PartnerActivity', gift: 'Gift', letsChat: 'LetsChat',
  visionBoardItemAdded: 'VisionBoardItemAdded',
  visionBoardItemCompleted: 'VisionBoardItemCompleted',
  memoryAdded: 'MemoryAdded', calendarEventAdded: 'CalendarEventAdded',
  bucketListItemAdded: 'BucketListItemAdded', wishlistItemAdded: 'WishlistItemAdded',
  checkInReminder: 'CheckInReminder', dailyDigest: 'DailyDigest',
  partnerLinkRequest: 'PartnerLinkRequest', partnerLinkAccepted: 'PartnerLinkAccepted',
  partnerLinkDeclined: 'PartnerLinkDeclined', partnerUnlinked: 'PartnerUnlinked',
  badgeEarned: 'BadgeEarned',
} as const;
```

Both `pushHandlers.ts` and `NotificationsScreen.tsx` route from one shared `resolveNotificationRoute(type, referenceId)` table. Changes:

| Type | Before | After |
|---|---|---|
| `VisionBoardItemAdded` / `Completed` | inbox matched `'VisionBoardItem'` → dead | both route to `Together → VisionBoardItemDetail` |
| `CalendarEventAdded` | inbox matched `'CalendarEvent'` → dead | routes to `Together → Calendar` |
| `MemoryAdded`, `BucketListItemAdded`, `WishlistItemAdded` | inbox: absent | routed |
| `BucketListItemAdded` push | opened Date Ideas (BUG-11) | opens Together home |
| `Gift` | inbox passed no params | passes `{ giftId }` like the push path |
| `'CalendarEvent'`, `data.eventDate`, `'LevelUp'` | dead code | deleted (ACH-46) |
| `BadgeEarned` | — | `navigation.navigate('Profile', { screen: 'Achievements', params: { slug } })` |

`ProfileStackParamList.Achievements` widens from `undefined` to `{ slug?: string } | undefined` so the screen can scroll to and open the badge (ACH-43, ACH-44).

## 11. Client design

### 11.1 Module layout

| File | Change |
|---|---|
| `src/constants/badges.ts` | **Deleted.** Types move to `src/features/profile/types/badge.types.ts`; `BADGE_IMAGES` moves to `badgeAssets.ts`. |
| `src/features/profile/services/badgeAssets.ts` | **New.** `slug → require('../../../../images/badges/<asset_key>.png')`. Metro needs literal paths, so this map is unavoidable; it is presentation only and carries no thresholds. Unknown slug → `BADGE_PLACEHOLDER`. |
| `src/features/profile/services/badgeService.ts` | Rewritten as a server-state cache: `load()`, `refresh()`, `getAll()`, `getEarned()`, `archive(slug)`, `subscribe()`. All unlock logic deleted (ACH-56). |
| `src/shared/state/userPointsStore.ts` | `calculateLevel`/`getLevelProgress` deleted; the store holds the server's `UserPointsResult` verbatim (ACH-51). The two `require()` escape hatches are replaced by an explicit `refreshAll()` in the app bootstrap. |
| `src/services/api/pointsService.ts` | `getBadgeStats()` removed; `getBadges()` returns the catalogue; `archiveBadge(slug)`; `addPoints` kept but marked dev-only (ACH-52). |
| `src/shared/state/rewardQueueStore.ts` | **New.** `enqueue(newBadges)` from any response; the modal drains it one badge at a time, deduping by slug per session (ACH-54). |
| `src/features/vault/hooks/useBadgeRewardListener.ts` | Polling deleted; subscribes to `rewardQueueStore`. |
| `src/features/vault/screens/VaultScreen.tsx` | `pointsService.archiveBadge` → `badgeService.archive` (ACH-55). |
| `src/features/profile/screens/AchievementsScreen.tsx` | Renders from `badgeService.getAll()`: earned art at full opacity, locked dimmed with the progress bar, `progress === null` → no bar (ACH-53). |
| `src/services/api/client.ts` | Attaches `X-Amori-Local-Date` and `X-Amori-Utc-Offset-Minutes` to every request from one helper, so no call site can forget (ACH-T01). |

### 11.2 Response plumbing

A single helper keeps the reward wiring from spreading:

```ts
// src/shared/state/rewards.ts
export function captureRewards<T extends { rewards?: RewardsResponse }>(response: T): T {
  if (response?.rewards) {
    rewardQueueStore.enqueue(response.rewards.newBadges);
    if (response.rewards.pointsAwarded) void userPointsStore.load(true);
  }
  return response;
}
```

Feature services wrap their mutating calls: `return api.post<HugResponse>(…).then(captureRewards);`

### 11.3 Artwork strategy

79 badges, 22 files on disk, more art arriving later. `badges.ts` currently `require()`s 23 files that do not exist, which is why the bundle cannot resolve them. Three mechanisms, in priority order.

**(a) Own art — 17 badges.** Slug's `asset_key` matches a file that exists: `first-embrace`, `hug-collector`, `golden-heart`, `hug-marathon`, `first-light`, `morning-ritual`, `daily-streak`, `evergreen`, `memory-keeper`, `words-that-matter`, `dream-builders`, `bucket-list-buddy`, `curious-mind`, `finding-calm`, `emerald-soul`, `open-heart`, `eternal-bond`.

**(b) Shared art via `asset_key` — 18 badges.** A tier ladder reuses its base image until dedicated art lands. This is the whole reason `asset_key` is a separate column (ACH-A01), and it fixes 11 of the 23 broken requires outright.

| `asset_key` | Also used by |
|---|---|
| `first_embrace` | `first-embrace-2` |
| `golden_heart` | `golden-heart-2` |
| `daily_streak` | `daily-streak-2` |
| `evergreen` | `evergreen-2`, `evergreen-3` |
| `words_that_matter` | `words-that-matter-2` |
| `dream_builders` | `dream-builders-2`, `we-did-it` |
| `bucket_list_buddy` | `bucket-list-buddy-2` |
| `curious_mind` | `curious-mind-2`, `mind-reader` |
| `finding_calm` | `finding-calm-2` |
| `emerald_soul` | `emerald-soul-2` |
| `memory_keeper` | `cartographer-of-us` |
| `open_heart` | `safe-harbor` |
| `hug_marathon` | `held-gently` |
| `first_embrace` | `whispered-words` → superseded by (c) |
| `eternal_bond` | `level-5` … `level-50` (8 badges) — `level_up.png` is not on disk |

**(c) Orphan art assigned to new badges — 5 badges (ACH-A04).** Five files have no badge; each gets a thematically honest home rather than sitting unused.

| File | Assigned to | Why |
|---|---|---|
| `rainbow_after_rain` | `whole-spectrum` (ACH-B79) | All four mood quadrants in one week — a full spectrum. |
| `completionist` | `open-book` (ACH-B55) | Support profile 7/7 — completing every section. |
| `voice_of_love` | `whispered-words` (ACH-B54) | 10 hugs carrying a whisper. |
| `our_soundtrack` | `same-wavelength` (ACH-B74) | Matching the partner's answer ten times. |
| `time_capsule` | `days-together-365` (ACH-B66) | A year sealed away together. |

**(d) Placeholder — the remaining ~39 badges.** `BADGE_PLACEHOLDER` is a designed asset, not a fallback error state: the badge frame with a monogram or silhouette, dimmed when locked and gold when earned, so an earned placeholder badge still reads as an achievement (ACH-A02, ACH-53). Covers `two-become-one`, `soft-landing`, `both-sides`, `week-keeper`, `harbor-found`, `space-keeper`, `knot-undone`, `wisdom-kept`, `in-good-time`, `made-real`, `curator-of-us`, `days-together-100/730/1000`, `marked-in-gold`, `written-in-stars`, `roll-of-the-heart`, `unwrapped-heart`, `unwrapped-heart-10`, `needle-in-the-stars`, `constellation-maker`, `tended-gently`, `tear-and-treasure`, `same-sky`, `golden-hour`, `hug-back`, `long-distance-hugger`, `midnight-hug`, `both-ways`, `night-whispers`, `shared-horizons`, `shared-horizons-2`, `together-forever`, `sacred-vow`, `cartographer-of-us` if (b) is not taken.

**Implementation.** `badgeAssets.ts` is the one place that lists files, and it lists **only files on disk** so Metro can never fail to resolve (ACH-A58):

```ts
// src/features/profile/services/badgeAssets.ts
/** Every file that exists in images/badges/. Adding a png = adding one line here. */
const ART = {
  bucket_list_buddy: require('../../../../images/badges/bucket_list_buddy.png'),
  completionist:     require('../../../../images/badges/completionist.png'),
  // …20 more, one per file on disk
} as const;

export const BADGE_PLACEHOLDER = require('../../../../images/badges/placeholder.png');

/** assetKey comes from the server; unknown or art-less keys fall back. */
export function badgeArt(assetKey: string | null | undefined) {
  return (assetKey && ART[assetKey as keyof typeof ART]) || BADGE_PLACEHOLDER;
}
```

The server's `asset_key` is just a string, so assigning real art to a placeholder badge later is a seed-data edit plus one line in `ART` — no client logic changes, no app release needed for the server half.

**Tests (ACH-TEST-16).** Three assertions, each catching a different failure:

1. Every value in `ART` resolves truthy — guards against a filename typo or a deleted file, the exact class of bug that breaks the bundle today.
2. `AWAITING_ART`, an explicit exported list, equals exactly `catalogueAssetKeys − keys(ART)`. When a png lands and is wired, this test fails until the slug is removed from `AWAITING_ART` — so art arriving is a reviewed, visible change rather than something that silently never gets hooked up (ACH-A03).
3. A catalogue fixture generated from `BadgeCatalogue.All` is checked in, and every entry resolves through `badgeArt()` to something non-null.

## 12. Testing strategy

| Layer | Where | Approach |
|---|---|---|
| Criteria measurement | `backend/Amori.Api.Tests/Badges/*CriteriaTests.cs` | One class per evaluator, seeded via DbContext against the Testcontainers instance; threshold −1 / = / +1 per criterion (ACH-TEST-01). |
| Pure time logic | `Badges/StreakServiceTests.cs`, `ClientLocalTimeTests.cs` | No database. `FakeTimeProvider` + explicit `DateOnly` sequences: DST spring-forward and fall-back, `+840`/`-720`, Sunday 23:59 vs Monday 00:00, tampered dates (ACH-TEST-09 … 13). |
| Idempotency & races | `Badges/BadgeAwardIdempotencyTests.cs` | Sequential double-award; then `Task.WhenAll` over 8 parallel evaluations asserting one row and one `AppNotification` (ACH-TEST-02, 03). |
| Failure isolation | `Badges/RewardServiceResilienceTests.cs` | A stub evaluator that throws; assert the parent action still returns 200 and its domain row persisted (ACH-TEST-04). |
| API contracts | `Badges/BadgesApiTests.cs` | Via `AmoriWebApplicationFactory`, following `UsersControllerTests`' register-and-token helper. Catalogue shape, hidden-badge visibility, archive 404/403/200, rewards envelope (ACH-TEST-05 … 07). |
| Two-user | `Badges/BadgesTwoUserTests.cs` | Register A and B, link them via `PartnerLinkAcceptTests`' existing flow, then assert each badge from both sides plus privacy (ACH-TEST-08). |
| Backfill & job | `Badges/BadgeBackfillTests.cs`, `BadgeTimeMonitorTests.cs` | Seed history, run the runner directly, assert `is_backfilled` and zero notifications; drive the monitor with `FakeTimeProvider` (ACH-TEST-14, 15). |
| Client | `src/features/profile/services/__tests__/`, `src/services/api/__tests__/` | jest, matching the existing `__tests__` convention (ACH-TEST-16). |

The test project needs `@types/jest` on the client side (BUG-14) for the new specs to typecheck; adding it is in scope as a dev dependency.

## 13. Decisions and tradeoffs

| Decision | Alternative rejected | Why |
|---|---|---|
| Explicit evaluator call in each handler | `SaveChangesAsync` override inspecting `ChangeTracker` | The override would be implicit, hard to scope to "this trigger", and would run inside the parent transaction, violating ACH-21. The explicit call mirrors `INotificationService`'s existing placement. |
| Unique index + catch `23505` | `SELECT … FOR UPDATE` or an advisory lock | No lock contention, no deadlock surface, and the constraint is a durable guarantee rather than a code convention. |
| Separate `DbContext` scope for awarding | Reuse the request's context | A unique-violation on a shared context poisons the parent's change tracker. Costs one pooled connection. |
| Criteria *families* with `threshold` + `criteriaParams` | One criteria type per badge | 48 types instead of 79, and tier ladders (hugs 10/50/100/250/500) become data rather than code. |
| `rewards` on ~24 response DTOs | Response header, or client polling `summary` | The reward modal must appear immediately after the action. A header is opaque and untyped; polling is a race (which is exactly what today's 5-second poller is). |
| Local date via two request **headers** | A body field on every request DTO | Many triggering endpoints take no body or a body we do not own; headers are attached once in `client.ts` and read once in middleware. The pair is treated as a single contract and resolved to one `ClientLocalTime`. |
| Hourly sweep, once per user per UTC day | True daily cron at 00:00 UTC | A single UTC-midnight run is up to 14 hours late for a UTC+14 user and 12 hours early for UTC−12. Hourly ticks bound the error to one hour at trivial cost. |
| `EarnedAt = now` for backfilled badges | Reconstruct historical earn dates | Reconstruction means replaying every counter's event stream per badge. Honest "awarded when tracking began", documented, beats a plausible-looking wrong date. |
| Delete the `Badge` entity outright | Keep it and dual-write for one release | There is no data (F-1), so there is nothing to migrate and nothing to keep compatible. Dual sources of truth is the exact failure mode this spec exists to remove. |
| Archive by slug | Keep the Guid route and have the client resolve ids | The one existing caller already sends a slug; slugs are the stable public identity and the Guid is an implementation detail. |

## 14. Risks

| Risk | Mitigation |
|---|---|
| Device-time trust lets a user inflate their own streak badges | Accepted and documented (ACH-T06, BRD). Containment: client dates affect only that user's badges; the ±1-day sanity check blocks gross tampering; `LongestLength` means a rewound clock cannot erase progress either. |
| `GET /api/users/me/badges` measures 79 counters per call | Batched per feature area (~13 query groups), `AsNoTracking`, cached per request. If it becomes hot, add a `user_badge_progress` snapshot table refreshed by the evaluator — deliberately deferred rather than designed in now. |
| ~39 of 79 badges launch on a placeholder | Design §11.3: `asset_key` sharing covers 18, orphan art covers 5, and the placeholder is a designed state rather than an error. The `AWAITING_ART` test makes the gap visible and makes filling it a one-line change. Server-side reassignment needs no app release. |
| `badges.ts` currently `require()`s 23 non-existent files, so the bundle cannot resolve them | Task 9.3 is sequenced first in the client phase and deletes that file. `badgeAssets.ts` lists only files on disk, so the class of bug cannot recur. |
| The first migration also creates three never-migrated tables | Called out in the migration's XML doc. Any environment where those tables were created by hand is covered by `DROP TABLE IF EXISTS badges` and `CREATE TABLE` failing loudly rather than silently diverging. |
| ~24 DTOs gaining a property is wide-reaching | Mechanical, additive, defaulted to `RewardsResponse.None`; no existing client field changes meaning. |
