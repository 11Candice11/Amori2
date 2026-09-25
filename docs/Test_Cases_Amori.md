# Amori — Test Case Checklist

**Companion to:** `BRD_Amori.md`
**Audience:** QA / Automation Tester
**Last updated:** 2026-09-23

## How to use this document

- Each case has an **ID**, the **requirement** it maps to (from the BRD), **preconditions**, **steps**, **expected result**, and a **priority** (P0 highest).
- **P** = "Result" column is for you to fill: Pass / Fail / Blocked / N/A.
- Cases marked **[Manual]** need a physical device or a hard-to-automate condition; the rest are automatable.
- **Test accounts:** most cases need two accounts. Convention used below: **User A** (primary) and **User B** (partner). "Linked pair" means A and B have completed partner linking (TC-LINK-*).

Legend: 🔺 P0 · 🔸 P1 · ▪️ P2

---

## 1. Authentication & Session (BRD §2.1)

| ID | Req | Precondition | Steps | Expected result | Pri | Result |
|----|-----|--------------|-------|-----------------|-----|--------|
| TC-AUTH-01 | AUTH-1 | App on login screen, register mode | Enter valid name/email/password → submit | Account created, user lands authenticated | 🔺 | |
| TC-AUTH-02 | AUTH-1 | Register mode | Leave name empty, fill email+password → submit | Blocked with "Please enter your name." | 🔺 | |
| TC-AUTH-03 | AUTH-2 | Login mode, existing account | Enter valid email+password → submit | User signed in, lands on Home | 🔺 | |
| TC-AUTH-04 | AUTH-2 | Login mode | Leave email or password empty → submit | Blocked with "Please enter your email and password." | 🔺 | |
| TC-AUTH-05 | AUTH-2 | Login mode | Enter wrong password → submit | Server error surfaced inline; not signed in | 🔺 | |
| TC-AUTH-06 | AUTH-3 | Login/register mode | Enter malformed email (e.g. `abc@`) → submit | Client does NOT block on format; request sent; server response handled gracefully | 🔸 | |
| TC-AUTH-07 | AUTH-4 | Signed in | Force-quit and relaunch app | User remains signed in (session restored) | 🔺 | |
| TC-AUTH-08 | AUTH-5 | Signed in, access token expired but refresh valid | Trigger any API call (e.g. open Home) | Silent refresh occurs; call succeeds; no visible logout | 🔺 | |
| TC-AUTH-09 | AUTH-6 | Signed in, refresh token revoked/expired | Trigger any API call | User is signed out and returned to login | 🔺 | |
| TC-AUTH-10 | AUTH-7 | Signed in, device offline, stored token present | Relaunch app offline | Stays authenticated (no logout on network error) | 🔸 | [Manual] |
| TC-AUTH-11 | AUTH-8 | Signed in as A | Log out | Refresh token revoked; push device deregistered; cached settings cleared | 🔺 | |
| TC-AUTH-12 | AUTH-8 | A logged out, B logs in on same device | Log in as B | B sees own settings, not A's | 🔸 | |

---

## 2. Partner Linking / Pairing (BRD §2.2)

| ID | Req | Precondition | Steps | Expected result | Pri | Result |
|----|-----|--------------|-------|-----------------|-----|--------|
| TC-LINK-01 | LINK-1 | A signed in, unlinked, on Link screen | Enter B's email → Send | Request sent; confirmation alert; appears in "outgoing" | 🔺 | |
| TC-LINK-02 | LINK-1 | Link screen | Enter malformed email → Send | Blocked with "Check the email" | 🔺 | |
| TC-LINK-03 | LINK-2 | B signed in, has incoming request from A | Open Link screen | Request shown under "Requests for you" above the send form | 🔺 | |
| TC-LINK-04 | LINK-3 | B viewing incoming request | Tap Accept without picking date → Confirm | Blocked with "Pick a date" | 🔺 | |
| TC-LINK-05 | LINK-3 | B accepting | Pick a future start date | Future date is rejected/not selectable | 🔸 | |
| TC-LINK-06 | LINK-3 | B accepting | Pick valid past date → Confirm | Accounts linked; "You're linked" confirmation on both | 🔺 | |
| TC-LINK-07 | LINK-4 | B has incoming request | Tap Decline | Request removed; A sees it declined | 🔸 | |
| TC-LINK-08 | LINK-4 | A has outgoing request | Tap Cancel | Outgoing request removed | 🔸 | |
| TC-LINK-09 | LINK-5 | Linked pair | A taps Unlink → confirm dialog → Unlink | Accounts unlinked; shared data stops sharing; can re-link | 🔺 | |
| TC-LINK-10 | LINK-5 | Linked pair | A taps Unlink → Cancel | No change; still linked | ▪️ | |
| TC-LINK-11 | LINK-6 | A sends request to B | Observe B | B receives `PartnerLinkRequest` notification | 🔸 | [Manual] |
| TC-LINK-12 | LINK-6 | B accepts A's request | Observe A | A receives `PartnerLinkAccepted` notification | 🔸 | [Manual] |

---

## 3. Notifications & Push (BRD §2.3)

| ID | Req | Precondition | Steps | Expected result | Pri | Result |
|----|-----|--------------|-------|-----------------|-----|--------|
| TC-NOTIF-01 | 2.3 | Signed in, some notifications exist | Open bell → Notifications | List shown newest-first | 🔸 | |
| TC-NOTIF-02 | 2.3 | Notifications list with unread | Tap one notification | Marked read | 🔸 | |
| TC-NOTIF-03 | 2.3 | Multiple unread | Tap "Mark all read" | All show as read | ▪️ | |
| TC-NOTIF-04 | 2.3 | On simulator/emulator | Attempt push registration | No crash; push no-ops silently | 🔸 | |
| TC-NOTIF-05 | 2.3 | Physical device, hug received | Tap hug push | App opens the hug confirmation screen | ▪️ | [Manual] |
| TC-NOTIF-06 | 2.3 | Physical device, incident event | Tap incident push | App opens the incident detail | ▪️ | [Manual] |

---

## 4. Media Upload (BRD §2.4)

| ID | Req | Precondition | Steps | Expected result | Pri | Result |
|----|-----|--------------|-------|-----------------|-----|--------|
| TC-MEDIA-01 | 2.4 | On a create-with-photo screen | Pick a normal image | Uploads, preview shown, returns fileKey | 🔸 | |
| TC-MEDIA-02 | 2.4 | Create-with-photo screen | Pick an oversized image (>limit) | Downscaled to ≤2048px; upload succeeds OR 413 → "That file is too large…" | 🔸 | |
| TC-MEDIA-03 | 2.4 | Server returns 5xx during upload | Attempt upload | Friendly "server is unavailable" message; no crash | ▪️ | |
| TC-MEDIA-04 | 2.4 | Upload fails (network) | Attempt upload | Per-photo Retry overlay appears | 🔸 | |

---

## 5. Home / Sanctuary Dashboard (BRD §3.1)

| ID | Req | Precondition | Steps | Expected result | Pri | Result |
|----|-----|--------------|-------|-----------------|-----|--------|
| TC-HOME-01 | HOME-1 | Linked pair with start date | Open Home | "Days together" shows correct count from start date | 🔸 | |
| TC-HOME-02 | HOME-1 | Unlinked account | Open Home | Graceful state, no crash, no days-together | 🔸 | |
| TC-HOME-03 | HOME-2 | Linked pair, both checked in | Open Home | Own + partner mood shown | 🔸 | |
| TC-HOME-04 | HOME-2 | Partner has shareMood OFF | Open Home | Partner mood hidden | 🔸 | |
| TC-HOME-05 | HOME-3 | Partner has active splitting window | Open Home | Space-window countdown visible; hides after it elapses | ▪️ | |
| TC-HOME-06 | HOME-4 | Account with ≥1 memory | Open Home twice same day | Same daily gift both times (pinned) | 🔸 | |
| TC-HOME-07 | HOME-4 | Account with NO memories | Open Home | No daily gift shown, no crash | 🔸 | |
| TC-HOME-08 | HOME-4 | Daily gift shown | Advance system date to next day, reopen | Gift resets for the new day | ▪️ | [Manual] |
| TC-HOME-09 | HOME-5 | On Home | Tap each quick action (hug, splitting, distraction, vault) | Each opens the correct hidden flow | 🔸 | |

---

## 6. Mood / Check-in (BRD §3.2)

| ID | Req | Precondition | Steps | Expected result | Pri | Result |
|----|-----|--------------|-------|-----------------|-----|--------|
| TC-MOOD-01 | MOOD-1 | Not checked in today | Open Check-in | Quadrant selection (High/Low × Pleasant/Unpleasant) shown | 🔺 | |
| TC-MOOD-02 | MOOD-2 | Quadrant picked | Pick a specific mood → confirm | Check-in saved; mood sent as INTEGER; shared with partner | 🔺 | |
| TC-MOOD-03 | MOOD-2 | Quadrant picked | Choose "I don't know" | Sends mood = Other; NOT shared with partner | 🔸 | |
| TC-MOOD-04 | MOOD-3 | Any mood check-in | Inspect request payload | `checkInType=AdHoc`, `intensity=5`, mood integer | 🔸 | |
| TC-MOOD-05 | MOOD-4 | Step 1 | Pick High+Pleasant | Routed to Mood Gift; gold theme | 🔸 | |
| TC-MOOD-06 | MOOD-4 | Step 1 | Pick High+Unpleasant | Routed to Breathe | 🔸 | |
| TC-MOOD-07 | MOOD-4 | Step 1 | Pick Low+Unpleasant | Routed to Grounding | 🔸 | |
| TC-MOOD-08 | MOOD-4 | Step 1 | Pick Low+Pleasant | Routed to Need a Hug | 🔸 | |
| TC-MOOD-09 | MOOD-5 | Already checked in today | Open Check-in | Existing summary shown instead of the flow | 🔸 | |
| TC-MOOD-10 | MOOD-5 | Checked in, day rolls over | Advance date, reopen | Flow available again | ▪️ | [Manual] |

---

## 7. Hugs (BRD §3.3)

| ID | Req | Precondition | Steps | Expected result | Pri | Result |
|----|-----|--------------|-------|-----------------|-----|--------|
| TC-HUG-01 | HUG-1 | Linked pair, A on Need-a-hug | Send hug with whisper | Hug sent to B with whisper | 🔸 | |
| TC-HUG-02 | HUG-1 | A sending | Send hug with empty whisper | Sent; whisper stored as null | ▪️ | |
| TC-HUG-03 | HUG-2 | A sent a hug, B not yet acknowledged | Observe A's sent screen | Screen polls; waits for acknowledgement | 🔸 | |
| TC-HUG-04 | HUG-2 | A on polling screen | B acknowledges | A's screen updates; polling stops | 🔸 | |
| TC-HUG-05 | HUG-2 | A on polling screen | Navigate away | Polling stops (no leak / no further calls) | ▪️ | |
| TC-HUG-06 | HUG-3 | B received a hug | B taps "Held" | Hug acknowledged | 🔸 | |
| TC-HUG-07 | HUG-3 | A is the sender | A views the hug | A cannot acknowledge | ▪️ | |
| TC-HUG-08 | HUG-4 | Pair with sent+received hugs | Open history | Sent vs received separated; unacked received show "Held" | ▪️ | |

---

## 8. Incidents / Help Desk (BRD §3.4)

| ID | Req | Precondition | Steps | Expected result | Pri | Result |
|----|-----|--------------|-------|-----------------|-----|--------|
| TC-INC-01 | INC-1 | Linked pair, on Log Incident | Fill title+category+impact+urgency → submit | Ticket created; enums sent as INTEGERS | 🔸 | |
| TC-INC-02 | INC-1 | Log Incident | Omit a required field → submit | Submit blocked | 🔸 | |
| TC-INC-03 | INC-2 | Open ticket | Assign → Investigate → Awaiting-response | Each transition succeeds; status updates | 🔸 | |
| TC-INC-04 | INC-2 | Ticket | Reassign to partner | Assignee changes; partner notified | 🔸 | |
| TC-INC-05 | INC-3 | Ticket in progress | Resolve without resolution text | Blocked (resolution required) | 🔸 | |
| TC-INC-06 | INC-3 | Ticket in progress | Resolve with resolution → then Close | Resolved then Closed | 🔸 | |
| TC-INC-07 | INC-3 | Closed ticket | Reopen without reason | Blocked (reason required) | 🔸 | |
| TC-INC-08 | INC-3 | Closed ticket | Reopen with reason | Status → Reopened | 🔸 | |
| TC-INC-09 | INC-4 | Ticket detail | Add a note / response | Requires content; appears in conversation | ▪️ | |
| TC-INC-10 | INC-4 | Resolved ticket | Add review (3 optional fields) + lessons | Saved | ▪️ | |
| TC-INC-11 | INC-5 | New ticket | Open SLA view | `dueAt` / remaining countdown shown | 🔸 | |
| TC-INC-12 | INC-5 | Ticket past due | View ticket | Marked overdue; overdue push fired | ▪️ | [Manual] |
| TC-INC-13 | INC-6 | Several tickets, mixed states | Apply each filter (status/category/priority/reportedByMe/assignedToMe/openOnly/overdue) | List narrows correctly per filter | 🔸 | |
| TC-INC-14 | INC-6 | More tickets than one page | Page through list | Pagination returns next set | ▪️ | |
| TC-INC-15 | INC-7 | Incident push received | Tap it | Opens the correct ticket detail | ▪️ | [Manual] |

---

## 9. Memories (BRD §3.5)

| ID | Req | Precondition | Steps | Expected result | Pri | Result |
|----|-----|--------------|-------|-----------------|-----|--------|
| TC-MEM-01 | MEM-1 | On Add Memory | Fill title + category + date (today/past) → save | Memory created | 🔸 | |
| TC-MEM-02 | MEM-1 | Add Memory | Omit title → save | Blocked with "Give the memory a title." | 🔸 | |
| TC-MEM-03 | MEM-1 | Add Memory | Try to pick a future date | Future date blocked (capped at today) | 🔸 | |
| TC-MEM-04 | MEM-2 | Add Memory | Add location + notes → save | Location (lat/lng) and notes persisted | ▪️ | |
| TC-MEM-05 | MEM-3 | Add Memory | Add multiple photos | Each uploads with preview | 🔸 | |
| TC-MEM-06 | MEM-3 | Photo still uploading | Tap Save | Blocked with "Give the photos a moment…" | 🔸 | |
| TC-MEM-07 | MEM-3 | A photo upload fails | Observe photo | Retry overlay; retry succeeds | 🔸 | |
| TC-MEM-08 | MEM-4 | Existing memory with photos | Edit, add a new photo, save | Only new photo key attached; existing not re-uploaded | ▪️ | |
| TC-MEM-09 | MEM-5 | Memory exists | Favorite then unfavorite | Favorite state toggles | ▪️ | |
| TC-MEM-10 | MEM-5 | Memory with location | Open map | Memory appears at its location | ▪️ | |

---

## 10. Timeline (BRD §3.6)

| ID | Req | Precondition | Steps | Expected result | Pri | Result |
|----|-----|--------------|-------|-----------------|-----|--------|
| TC-TL-01 | TL-1 | On Add Timeline Event | Fill title + date + event type → save | Event created; event type sent as STRING name | 🔸 | |
| TC-TL-02 | TL-1 | Add event | Leave event type default | Defaults to Custom | ▪️ | |
| TC-TL-03 | TL-2 | Existing event | Edit description (partial PATCH) | Only changed fields updated | ▪️ | |
| TC-TL-04 | TL-2 | Existing event | Attach a photo | Photo attached by key | ▪️ | |
| TC-TL-05 | TL-2 | Existing event | Delete | Event removed | ▪️ | |

---

## 11. Together — Shared Collections (BRD §3.7)

| ID | Req | Precondition | Steps | Expected result | Pri | Result |
|----|-----|--------------|-------|-----------------|-----|--------|
| TC-TOG-01 | Calendar | Linked pair | Create a calendar event | Event appears for both | 🔸 | |
| TC-TOG-02 | Calendar | Event created by A | B tries to delete it | Delete blocked (creator only) | 🔸 | |
| TC-TOG-03 | Calendar | Events across months | Load month view | Query uses 1-indexed month; correct events shown | ▪️ | |
| TC-TOG-04 | Important dates | Linked pair | Open important dates | Read-only list shown | ▪️ | |
| TC-TOG-05 | Bucket list | Linked pair | Create item then mark complete | Item created and completes | ▪️ | |
| TC-TOG-06 | Date ideas | Some uncompleted ideas | Tap random pick | Returns a random idea | ▪️ | |
| TC-TOG-07 | Date ideas | No uncompleted ideas | Tap random pick | Returns null / empty state (no crash) | ▪️ | |
| TC-TOG-08 | Date ideas | Idea exists | Toggle favorite / mark complete | Favorite via PATCH; complete is one-way | ▪️ | |
| TC-TOG-09 | Wishlist | Linked pair | Create, edit, toggle purchased, delete | Each action persists | ▪️ | |

---

## 12. Distraction Centre — Games (BRD §3.8)

| ID | Req | Precondition | Steps | Expected result | Pri | Result |
|----|-----|--------------|-------|-----------------|-----|--------|
| TC-DIST-01 | Quiz | Quiz questions exist | Answer quiz, submit | Score returned; appears in history | ▪️ | |
| TC-DIST-02 | Quiz | On author screen | Author a question with correct answer + options | Question saved | ▪️ | |
| TC-DIST-03 | WYR | WYR questions exist | Answer (chose option A) | Answer recorded; both partners' choices shown | ▪️ | |
| TC-DIST-04 | 2048/Hidden Number | On game | Play a round | Play recorded via start+complete; failure to record does NOT block play | ▪️ | |
| TC-DIST-05 | Hidden Object | Uploaded image | Create puzzle with prompt + normalized target (0–1) + radius | Puzzle saved | ▪️ | |
| TC-DIST-06 | Hidden Object | Puzzle authored by A | A views own puzzle | Answer hidden from author | ▪️ | |

---

## 13. Splitting / Grounding (BRD §3.9)

| ID | Req | Precondition | Steps | Expected result | Pri | Result |
|----|-----|--------------|-------|-----------------|-----|--------|
| TC-SPL-01 | SPL-1 | Linked pair | Create session (feelings, trigger, description, need, initial mood) | Session created; enums sent as STRING names | ▪️ | |
| TC-SPL-02 | SPL-2 | Active session | Update session (partial) | Changes saved | ▪️ | |
| TC-SPL-03 | SPL-2 | Active session | Complete with final mood + actions | Session completed | ▪️ | |
| TC-SPL-04 | SPL-2 | Active session | Cancel | Session cancelled | ▪️ | |
| TC-SPL-05 | SPL-3 | A has active session | B opens Home | Shared space-window countdown visible to B | 🔸 | |
| TC-SPL-06 | SPL-3 | No active partner session | Call partner-active | Returns null (204) gracefully | ▪️ | |
| TC-SPL-07 | SPL-4 | On trigger picker | Add a custom trigger | Stored locally on device | ▪️ | |

---

## 14. Vault (BRD §3.10)

| ID | Req | Precondition | Steps | Expected result | Pri | Result |
|----|-----|--------------|-------|-----------------|-----|--------|
| TC-VAULT-01 | VAULT-1 | Signed in | Save a gift, open Vault | Gift listed newest-first | ▪️ | |
| TC-VAULT-02 | VAULT-1 | Gift in vault | View then delete | Gift removed | ▪️ | |
| TC-VAULT-03 | VAULT-1 | Linked pair, A saved a gift | B opens Vault | B does NOT see A's private vault | 🔸 | |
| TC-VAULT-04 | VAULT-2 | Gift already saved | Save the same memory again | Idempotent; returns existing, no duplicate | ▪️ | |

---

## 15. Profile / Settings (BRD §3.11)

| ID | Req | Precondition | Steps | Expected result | Pri | Result |
|----|-----|--------------|-------|-----------------|-----|--------|
| TC-SET-01 | 3.11 | On Settings | Toggle any setting, reopen screen | Toggle state persisted (partial PATCH) | 🔸 | |
| TC-SET-02 | 3.11 | Linked pair | A sets shareMood OFF | B no longer sees A's mood on Home | 🔸 | |
| TC-SET-03 | 3.11 | Linked pair | A sets shareActivity OFF | B's partner-status shows `lastActiveAt = null` | 🔸 | |
| TC-SET-04 | 3.11 | Linked pair | A sets allowHugs OFF | B cannot send A a hug | ▪️ | |
| TC-SET-05 | 3.11 | On Settings | Toggle notificationsEnabled (master) OFF | Sub-notifications suppressed | ▪️ | |

---

## 16. Out-of-Scope Negative Checks (BRD §4)

These confirm that unimplemented areas are not falsely exposed. Keep them lightweight.

| ID | Area | Steps | Expected result | Pri | Result |
|----|------|-------|-----------------|-----|--------|
| TC-OOS-01 | Emergency | Trigger/inspect emergency banner on Home | Banner is display-only; no send/acknowledge flow reachable | ▪️ | |
| TC-OOS-02 | Messages / Reminders / Voice notes | Look for entry points | No wired UI; not reachable from navigation | ▪️ | |

---

## Coverage summary

| Feature area | Cases | P0 | P1 | P2 |
|--------------|-------|----|----|----|
| Auth & Session | 12 | 8 | 4 | 0 |
| Partner Linking | 12 | 5 | 5 | 2 |
| Notifications & Push | 6 | 0 | 3 | 3 |
| Media Upload | 4 | 0 | 3 | 1 |
| Home | 9 | 0 | 6 | 3 |
| Mood / Check-in | 10 | 3 | 6 | 1 |
| Hugs | 8 | 0 | 4 | 4 |
| Incidents | 15 | 0 | 10 | 5 |
| Memories | 10 | 0 | 6 | 4 |
| Timeline | 5 | 0 | 1 | 4 |
| Together | 9 | 0 | 3 | 6 |
| Distraction | 6 | 0 | 0 | 6 |
| Splitting | 7 | 0 | 1 | 6 |
| Vault | 4 | 0 | 1 | 3 |
| Profile / Settings | 5 | 0 | 3 | 2 |
| Out-of-scope checks | 2 | 0 | 0 | 2 |
| **Total** | **124** | **29** | **56** | **52** |

> Note: expected results for server-side validation and status transitions are inferred from the frontend. Confirm exact API behavior against the backend before asserting on error messages/status codes in automated checks.
