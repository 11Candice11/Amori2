# Business Requirements Document (BRD) — Amori

**Audience:** QA / Automation Tester
**Purpose:** Describe what Amori does, feature by feature, so test cases can be written against real functionality (user flows, inputs, validation, integration points, and edge cases).
**Product:** Amori — a private couples app for iOS and Android.
**Version of this doc:** 1.0 · Last updated: 2026-09-23

---

## 1. Product Overview

Amori is a two-person, invite-only app for couples. Once two accounts are **linked** into one **relationship**, they share moods, memories, a calendar, milestones, games, and a relationship "help desk." Some data is private per user (e.g. the Vault), most is shared with the linked partner subject to privacy toggles.

**Tech stack (context for integration testing):**

| Layer | Technology |
|-------|-----------|
| Mobile | React Native + TypeScript |
| Backend | C# / ASP.NET Core Web API, Entity Framework Core, PostgreSQL |
| Cloud | AWS S3 (media), Expo Push (APNs / FCM) |
| API origin | `https://amori.ycare.org` (prod and default dev target) |

> **Important scope note for test planning.** Not every folder in the app is a working feature. Sections below are marked **Implemented** or **Not implemented / out of scope**. Do not write end-to-end tests against features marked out of scope — they have no UI or service wired up yet.

---

## 2. Cross-Cutting Requirements (apply to all features)

These behaviors are shared infrastructure. They affect nearly every test case, so validate them once thoroughly and assume them elsewhere.

### 2.1 Authentication & Session

| ID | Requirement | Test focus |
|----|-------------|-----------|
| AUTH-1 | User can register with **name, email, password**. | All three required. Register fails if name empty ("Please enter your name.") or email/password empty. |
| AUTH-2 | User can log in with **email + password**. | Both required ("Please enter your email and password."). Email keyboard, no auto-capitalize, password masked. |
| AUTH-3 | No client-side email-format or password-strength check on login/register — only non-empty. | Invalid-format email is accepted by the client and rejected (or not) by the server. Confirm server behavior. |
| AUTH-4 | On success the app stores an **access token + refresh token** (persisted, survives app restart). | Kill and relaunch app → user stays signed in. |
| AUTH-5 | **Silent token refresh:** a 401 on a normal request triggers one refresh + retry. | Expired access token + valid refresh → request succeeds transparently. |
| AUTH-6 | If refresh is rejected (401/403), the session ends and user is signed out. | Expired/revoked refresh token → forced logout. |
| AUTH-7 | A network error at launch must NOT sign the user out; only a genuine 401/403 does. | Launch offline with a stored token → stays authenticated. |
| AUTH-8 | Logout revokes the refresh token server-side, deregisters the push device, and clears cached settings/notifications. | After logout, next user does not inherit prior settings. |

**Auth endpoints:** `POST /api/auth/login`, `POST /api/auth/register`, `POST /api/auth/refresh`, `POST /api/auth/logout`, `GET /api/users/me`.

### 2.2 Partner Linking (Pairing)

Reached from **Profile → Link to partner** (full-screen modal). Two accounts must link before shared features have a partner.

| ID | Requirement | Test focus |
|----|-------------|-----------|
| LINK-1 | Send a link request by the partner's **account email**. | Client validates email format; invalid → "Check the email". |
| LINK-2 | Recipient sees the request under "Requests for you" and taps **Accept**. | Incoming requests take priority over the send form. |
| LINK-3 | Accepting requires picking the **relationship start date**; it **cannot be in the future**. | No date → "Pick a date". Future date rejected. This date drives "days together". |
| LINK-4 | Recipient can **Decline**; sender can **Cancel** an outgoing request. | Status refreshes after each action. |
| LINK-5 | Either partner can **Unlink** (destructive, confirm dialog). Re-linking is possible later. | Confirm dialog required; after unlink, shared data stops being shared. |
| LINK-6 | Link events generate notifications: `PartnerLinkRequest`, `PartnerLinkAccepted`, `PartnerLinkDeclined`. | Verify notification appears for the other party. |

**Endpoints:** `GET /api/partner-link/status`, `POST /api/partner-link/requests`, `POST /api/partner-link/requests/{id}/accept` (body `{startDate}`), `POST .../decline`, `DELETE /api/partner-link/requests/{id}` (cancel), `DELETE /api/partner-link` (unlink).

### 2.3 Notifications & Push

- Push uses **Expo push tokens** (APNs on iOS, FCM on Android). Platform enum: **1 = iOS, 2 = Android**.
- **Push is a safe no-op on the iOS Simulator and Android emulator** (and when permission is denied). You cannot verify push *delivery* there — test the in-app inbox and polling-based flows instead, and use physical devices for delivery testing.
- In-app inbox: **Notifications** screen (header bell). List newest-first, mark one read, mark all read.
- Tapping a push routes into the app: type `Hug` → opens the delivered hug; type `Incident` → opens the incident detail.

**Endpoints:** `POST /api/notifications/devices`, `DELETE /api/notifications/devices/{id}`, `GET /api/notifications`, `POST /api/notifications/{id}/read`, `POST /api/notifications/read-all`.

### 2.4 Media Upload

- Two-step pattern everywhere: **upload image → get `fileKey` → attach `fileKey` to the record** (memory, timeline event, puzzle).
- Multipart to `POST /api/media`, form field name `file`. Returns `{ fileKey, url }`.
- Images are downscaled client-side to **max 2048px, quality 0.8** to stay under the size limit.
- **413 (too large)** returns a friendly message: "That file is too large to upload. Try a smaller image." **502/503/504** → "The server is unavailable right now."

### 2.5 There is NO real-time socket (SignalR / WebSocket) in the app

"Live" behavior is achieved by **push notifications** and **polling** (e.g. the hug-acknowledged screens poll on an interval). Do not write tests expecting a persistent socket connection.

### 2.6 Enum encoding inconsistency (high-value gotcha)

The request payloads do not encode enums consistently. This is a common source of integration bugs — test both directions.

- **Sent as integers:** Mood check-ins, Incident fields (category/impact/urgency/status).
- **Sent as string names:** Splitting session enums, Timeline event types.
- **API responses** generally return **string names**.

---

## 3. Feature Requirements

### 3.1 Home / "Sanctuary" Dashboard — *Implemented*

The landing tab. Aggregates data from several services and degrades gracefully if any call fails.

| ID | Requirement | Test focus |
|----|-------------|-----------|
| HOME-1 | Shows **days together** derived from the relationship start date. | No relationship linked → graceful state (no crash). |
| HOME-2 | Shows **your current mood** and **partner's current mood**. | Respect partner's `shareMood` privacy setting. |
| HOME-3 | Shows an active grounding **"space window" countdown** (own preferred, else partner's) only if not elapsed. | Countdown hides once elapsed. |
| HOME-4 | Shows a **Daily Gift** artifact — a date-seeded random memory, **pinned per calendar day**. | Same gift all day; **no gift if no memories exist**; resets at midnight (day rollover). |
| HOME-5 | Provides quick actions to hidden flows: Send a hug, I'm splitting, Distraction, View vault. | Each opens the correct hidden stack. |

### 3.2 Mood / Check-in — *Implemented*

A two-step emotional check-in on the **Check-in** tab.

| ID | Requirement | Test focus |
|----|-------------|-----------|
| MOOD-1 | Step 1: pick a **quadrant** (High/Low energy × Pleasant/Unpleasant). | |
| MOOD-2 | Step 2: pick a specific **mood**, or choose **"I don't know"**. | "I don't know" sends mood = Other and is **not** shared with partner. |
| MOOD-3 | A normal check-in sends `checkInType = AdHoc`, the mood enum, `intensity = 5`, and is shared with partner. | Mood enum sent as **integer** (Happy=1 … Other=8). |
| MOOD-4 | Quadrant drives what comes next: High+Pleasant → Mood Gift (+ gold theme); High+Unpleasant → Breathe; Low+Unpleasant → Grounding; Low+Pleasant → Need a Hug. | Verify correct branch per quadrant. |
| MOOD-5 | If the user already checked in today, show the existing summary instead of the flow. | "Already checked in today" path; day-rollover resets it. |

**Endpoints:** `POST /api/moods/check-ins`, `GET /api/moods/current`, `GET /api/moods/partner-current`.

### 3.3 Hugs — *Implemented*

Send a "hug" with an optional whisper to the partner. Hidden flow (from dashboard / notification).

| ID | Requirement | Test focus |
|----|-------------|-----------|
| HUG-1 | Send a hug with an optional **whisper**; empty whisper is stored as null. | Whisper trimmed. |
| HUG-2 | Sender screen **polls** the hug until the partner acknowledges, then stops. | Polling stops on acknowledge and on unmount (no leak). |
| HUG-3 | Only the **recipient** can acknowledge ("Held"). | Sender cannot acknowledge. |
| HUG-4 | History screen separates **sent vs received**; received-but-unacknowledged show a "Held" action. | |
| HUG-5 | A hug push notification opens the hug confirmation screen. | Test on a physical device. |

**Endpoints:** `POST /api/hugs`, `GET /api/hugs`, `GET /api/hugs/{id}`, `POST /api/hugs/{id}/acknowledge`.

### 3.4 Incidents / Relationship Help Desk — *Implemented (largest feature)*

An ITIL-style "help desk" where couples log issues as tickets with a full lifecycle. Lives on the **Desk** tab. 14 screens.

**Statuses:** Open(1), Assigned(2), Investigating(3), AwaitingResponse(4), Resolved(5), Closed(6), Reopened(7).
**Categories:** 1–9 (Communication … Other). **Impact / Urgency:** Low / Medium / High / Critical (1–4). **Priority** is derived server-side.

| ID | Requirement | Test focus |
|----|-------------|-----------|
| INC-1 | Create a ticket: requires **title, category, impact, urgency** (enums sent as **integers**). | Missing any required field blocks submit. |
| INC-2 | Lifecycle actions: assign, reassign, investigate, mark awaiting-response, resolve, close, reopen. | Verify valid transitions and that each hits its endpoint. |
| INC-3 | **Resolve** requires a `resolution` (optional notes). **Close** has optional closure notes. **Reopen** requires a `reason`. | Validation per action. |
| INC-4 | Add **notes**, **responses**, **reviews** (3 optional free-text fields), and **lessons**. | Notes/responses require content. |
| INC-5 | **SLA** tracking: each ticket has `dueAt`, `remainingSeconds`, `isOverdue`. Overdue triggers a notification. | Countdown accuracy; overdue state; SLA-breach push. |
| INC-6 | List supports filters: status, category, priority, reportedByMe, assignedToMe, openOnly, overdue, plus **pagination** (page, pageSize). | Each filter narrows results; paging works. |
| INC-7 | Incident push notification opens the ticket detail. | SLA breach / reassignment / status change / close. |

**Endpoints (base `/api/incidents`):** list (with query filters), `/{id}`, `/summary`, `/{id}/sla`, `/{id}/history`, `/notes`, `/responses`, `/reviews`, `/lessons`; lifecycle POSTs `/assign`, `/reassign`, `/investigate`, `/awaiting-response`, `/resolve`, `/close`, `/reopen`.

### 3.5 Memories — *Implemented*

Shared photo memories with location and date.

| ID | Requirement | Test focus |
|----|-------------|-----------|
| MEM-1 | Create a memory: **title required**; category chip (Everyday/Trip/Date/Milestone/Adventure/Celebration, sent as int); **date required, capped at today** (no future). | Missing title → "Give the memory a title." Future date blocked. |
| MEM-2 | Optional location (lat/lng) and notes. | |
| MEM-3 | **Photos:** multi-pick; each uploads immediately with a preview; failed uploads show a **Retry** overlay. | Save is **blocked while any photo is still uploading** ("Give the photos a moment…"). |
| MEM-4 | Edit mode preloads the memory and only attaches **new** photo keys. | Existing photos not re-uploaded. |
| MEM-5 | Favorite / unfavorite a memory. View on a map. | |

**Endpoints:** `GET /api/memories`, `GET/PATCH/DELETE /api/memories/{id}`, `POST /api/memories`, `POST /api/memories/{id}/media`, `POST/DELETE /api/memories/{id}/favorite`.

### 3.6 Timeline (Relationship Milestones) — *Implemented*

| ID | Requirement | Test focus |
|----|-------------|-----------|
| TL-1 | Create a milestone: title, description, event date (`YYYY-MM-DD`), optional location, event type. | Event type sent as **string name** (FirstConversation/FirstDate/FirstKiss/FirstTrip/Anniversary/Custom; default Custom). |
| TL-2 | Edit (partial PATCH), delete, attach photos by key. | |

**Endpoints:** `GET /api/timeline`, `GET/PATCH/DELETE /api/timeline/{id}`, `POST /api/timeline`, `POST /api/timeline/{id}/media`.

### 3.7 Together (Shared Collections Hub) — *Implemented*

The **Together** tab bundles several sub-features that do NOT exist as standalone folders. Test them here.

| Sub-feature | Behavior | Test focus |
|-------------|----------|-----------|
| Shared calendar | List by month (`?year&month`, **month is 1-indexed**), create, edit, delete (**creator only**). | Delete restricted to creator. |
| Important dates | Read-only list. | |
| Bucket list | List, create, mark complete. | |
| Date ideas | List, create (with optional photo and link), edit, mark done / reopen (the idea is kept), delete (creator only), **random pick** (returns null / 204 when none uncompleted). Favorite/completed toggled via PATCH. | Random with no ideas → null. |
| Wishlist | List, create, edit, delete; fulfilled (`isPurchased`) / favorite toggled via PATCH. Fulfilling keeps the wish. | |

**Endpoints:** `/api/calendar/events`, `/api/important-dates`, `/api/bucket-list`, `/api/dates` (+ `/api/dates/random`), `/api/wishlist`.

### 3.8 Distraction Centre (Games) — *Implemented*

Couple games and quizzes. Hidden flow.

| Game | Behavior | Test focus |
|------|----------|-----------|
| Couple Quiz | Get questions, submit answers → score, history, author new questions (with correct answer + options). | |
| Would You Rather | Get questions, answer (`choseOptionA`), author new ones. Shows both partners' choices. | |
| 2048 / Hidden Number | Client-side games; play is recorded via start+complete (non-blocking; failure returns null, does not block play). | |
| Hidden Object | Create with uploaded `imageFileKey` + prompt + normalized target (x/y 0–1) + radius. Author cannot see own answer. | Normalized coords; author hidden-answer. |

**Endpoints:** `/api/games`, `/api/games/{id}/sessions`, `/api/games/sessions/{id}/complete`, `/api/games/history`, `/api/quiz/*`, `/api/would-you-rather/*`, `/api/hidden-object-puzzles`.

### 3.9 Splitting / "I'm Splitting" Grounding — *Implemented*

A guided self-regulation session with a shared **"space window"** countdown both partners can see (drives the Home countdown). Hidden flow, 12 screens.

| ID | Requirement | Test focus |
|----|-------------|-----------|
| SPL-1 | Create a session: feelings selected, trigger, description, what I need, initial mood. | Enums sent as **string names** (not ints). |
| SPL-2 | Update (partial), complete (final mood + actions taken), cancel. | |
| SPL-3 | Partner can see a privacy-safe active window (`GET /partner-active`, 204 → null). | The shared countdown appears on both dashboards. |
| SPL-4 | Custom triggers are stored **locally** on the device. | |

**Endpoints (base `/api/splitting/sessions`):** list, `/{id}`, `POST` create, `PATCH /{id}`, `POST /{id}/complete`, `POST /{id}/cancel`, `GET /partner-active`.

### 3.10 Vault ("Hearth Vault") — *Implemented*

A **private, per-user** collection of saved gifts. The partner cannot see it.

| ID | Requirement | Test focus |
|----|-------------|-----------|
| VAULT-1 | List saved gifts (newest first), view one, save, delete. | |
| VAULT-2 | Saving the same memory twice is **idempotent** — returns the existing entry. | Double-save is harmless. |

**Endpoints:** `GET /api/vault/gifts`, `GET /{id}`, `POST /api/vault/gifts`, `DELETE /{id}`.

### 3.11 Profile / Settings — *Implemented*

Settings, logout, and the Link Partner entry point. All settings are boolean toggles saved via **partial PATCH**.

- **Privacy:** shareMood, shareActivity, shareCheckIns, shareLocation, shareTimeline, allowHugs, allowEmergencyAlerts, allowPartnerReminders.
- **Notifications:** notificationsEnabled (master), hugNotifications, emergencyNotifications, checkInReminders, partnerActivityNotifications, dailyDigest.
- **App:** soundEnabled, vibrationEnabled.

**Test focus:** each toggle persists; privacy toggles actually hide the corresponding data from the partner (e.g. `shareMood = off` hides mood on partner's dashboard; `shareActivity = off` makes `lastActiveAt` null in partner status).

**Endpoints:** `PATCH /api/users/me/settings`, `GET /api/users/partner-status`.

---

## 4. Out of Scope / Not Implemented (do NOT write E2E tests)

These folders exist but are empty scaffolding, or exist only as backend DTO types with no wired UI. There is nothing to automate end-to-end today.

| Area | Status |
|------|--------|
| bucketList, calendar, datePlanner, importantDates, wishlist (as **standalone** features) | Empty folders — functionality lives inside **Together** (§3.7). Test it there. |
| messages, reminders, voiceNotes | Empty scaffolding. Backend `ReminderResponse` types exist but there is **no reminder UI or service** on the client. |
| emergency | **Display-only banner** on Home. No send/acknowledge flow, no API service, no wired navigation. Settings flags and DTO types exist, but the feature is **not testable end-to-end** from the app. |

---

## 5. Recommended Test Environment Notes

- **Two linked accounts** are required for most meaningful tests (partner visibility, hugs, shared collections, splitting window). Provision a pair of test accounts and link them via §2.2.
- **Physical devices** are needed for push-delivery tests; simulators/emulators no-op push (§2.3). Use polling-based flows (hugs) to validate "live" behavior without devices.
- **Media tests:** prepare images both under and over the size limit to exercise the 2048px downscale and the 413 error path.
- **Session tests:** have a way to expire the access token (short-lived) and separately revoke the refresh token to cover AUTH-5 / AUTH-6 / AUTH-7.
- **Enum tests:** for mood and incidents assert integer payloads; for splitting and timeline assert string-name payloads (§2.6).

---

## 6. Priority Matrix (suggested automation order)

| Priority | Feature | Why |
|----------|---------|-----|
| P0 | Auth (§2.1), Partner Linking (§2.2) | Everything depends on a session and a linked pair. |
| P0 | API client behavior: token refresh, 413/5xx handling (§2.1, §2.4) | Integration backbone; affects every feature. |
| P1 | Mood check-in (§3.2), Incidents (§3.4), Memories (§3.5) | Core daily-use flows with rich validation. |
| P1 | Together collections (§3.7), Timeline (§3.6) | CRUD-heavy, creator-only rules, date caps. |
| P2 | Hugs (§3.3), Splitting (§3.9), Vault (§3.10), Distraction (§3.8) | Secondary flows; hugs/splitting exercise polling + partner visibility. |
| P2 | Profile / privacy toggles (§3.11) | Verify privacy flags actually gate partner-visible data. |
