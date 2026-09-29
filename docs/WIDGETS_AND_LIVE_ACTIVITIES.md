# Home-screen Widget + Live Activity (iOS)

This adds two iOS surfaces, both wired to existing app data:

- **Partner Mood widget** — a home-screen widget (small + medium) showing the
  partner's most recent shared mood check-in.
- **Splitting countdown Live Activity** — a Lock Screen + Dynamic Island
  countdown for the "self-regulation window" (the *Take some space* flow).

Both are iOS-only. On Android and iOS < 16.1 (Live Activities) the JS bridge is
a no-op, so nothing needs to branch in the app.

---

## What's already in the repo

### Native — widget extension (`ios/AmoriWidgets/`)
| File | Target | Purpose |
| --- | --- | --- |
| `Shared/AmoriSharedStore.swift` | app **and** extension | App Group store (`group.com.candice.amori`) + `PartnerMoodSnapshot` |
| `Shared/MoodTheme.swift` | app **and** extension | Maps a mood label → colour/glyph (mirrors the app's quadrant model) |
| `Shared/SplittingActivityAttributes.swift` | app **and** extension | `ActivityAttributes` for the Live Activity |
| `PartnerMoodWidget.swift` | extension only | The home-screen widget UI + timeline provider |
| `SplittingLiveActivity.swift` | extension only | Lock Screen + Dynamic Island UI |
| `AmoriWidgetsBundle.swift` | extension only | `@main` widget bundle |
| `Info.plist` | extension only | `widgetkit-extension` point |
| `AmoriWidgets.entitlements` | extension only | App Group membership |

### Native — app bridge (`ios/Amori/`)
| File | Purpose |
| --- | --- |
| `AmoriWidgetBridge.swift` | RN native module: widget refresh + Live Activity start/update/end |
| `AmoriWidgetBridge.m` | `RCT_EXTERN_MODULE` registration |
| `Amori-Bridging-Header.h` | now imports `<React/RCTBridgeModule.h>` |
| `Amori.entitlements` | App Group added |
| `Info.plist` | `NSSupportsLiveActivities = true` added |

### JS
| File | Purpose |
| --- | --- |
| `src/services/native/widgetBridge.ts` | Safe wrapper around the native module (no-op where unsupported) |
| `src/features/home/hooks/useDashboard.ts` | Pushes the partner's mood to the widget on every dashboard load |
| `src/features/splitting/screens/DeEscalationPacingScreen.tsx` | Starts the Live Activity when a fixed space window begins |
| `src/features/splitting/hooks/useLeaveSplittingFlow.ts` | Ends the Live Activity when the grounding session completes |

---

## Remaining one-time Xcode setup

The new files exist on disk, but Xcode still needs a **Widget Extension target**
created and the source files assigned to targets. This can't be done reliably by
hand-editing `project.pbxproj`, so do it once in Xcode (open
`ios/Amori.xcworkspace`):

1. **Add the widget target**
   - File ▸ New ▸ Target… ▸ **Widget Extension**. Name it **`AmoriWidgets`**.
   - Uncheck "Include Configuration App Intent" (this widget is static).
   - Check **Include Live Activity**.
   - When prompted, do **not** activate the auto-created scheme changes you don't
     want; let Xcode embed the extension in the `Amori` app.
   - Delete the placeholder `.swift`/`Info.plist`/`.entitlements` Xcode generates
     for the target — you'll use the ones already in `ios/AmoriWidgets/`.

2. **Assign the files** (File Inspector ▸ Target Membership)
   - `PartnerMoodWidget.swift`, `SplittingLiveActivity.swift`,
     `AmoriWidgetsBundle.swift` → **AmoriWidgets** only.
   - `Shared/AmoriSharedStore.swift`, `Shared/MoodTheme.swift`,
     `Shared/SplittingActivityAttributes.swift` → **both** `Amori` **and**
     `AmoriWidgets`.
   - `AmoriWidgetBridge.swift`, `AmoriWidgetBridge.m` → **Amori** only.
   - Point the `AmoriWidgets` target's Info.plist / entitlements build settings
     at `ios/AmoriWidgets/Info.plist` and `ios/AmoriWidgets/AmoriWidgets.entitlements`.

3. **App Group capability** (both targets)
   - Select the `Amori` target ▸ Signing & Capabilities ▸ **+ App Group** ▸ add
     `group.com.candice.amori`.
   - Repeat for the `AmoriWidgets` target with the **same** group.
   - App Groups are available to free/personal Apple teams, so this doesn't
     require a paid membership.

4. **Deployment target**
   - Set the `AmoriWidgets` target's minimum iOS to **16.1** (Live Activities).
     The widget itself works from iOS 14; the Live Activity is guarded with
     `if #available(iOS 16.1, *)`.

5. **Build & run** on a device or simulator (iOS 16.1+ for the Live Activity).

> If you regenerate native projects with `expo prebuild`, the App Group
> entitlement and `NSSupportsLiveActivities` are already declared in `app.json`,
> but the **widget extension target itself is not** — prebuild doesn't create
> extra targets. Re-run steps 1–4 after a clean prebuild, or move this into a
> custom Expo config plugin if prebuild is part of your regular flow.

---

## How the data flows

**Partner mood widget**
1. `useDashboard` fetches the partner's current shared check-in.
2. It calls `widgetBridge.setPartnerMood({ mood, feelings, partnerName, updatedAt })`.
3. The native module writes a `PartnerMoodSnapshot` into the App Group and calls
   `WidgetCenter.reloadTimelines(ofKind: "PartnerMoodWidget")`.
4. The widget reads the snapshot and renders it.

**Splitting Live Activity**
1. In *Take some space*, choosing a fixed duration stamps `spaceEndsAt`
   (`DeEscalationPacingScreen.startSpace`).
2. That calls `widgetBridge.startSplittingActivity({ endsAt, startedAt, owner, partnerName })`.
3. The native module starts an `Activity<SplittingActivityAttributes>` whose
   `Text(timerInterval:)` counts down on its own — no app foreground needed.
4. When the grounding session completes (any leave path funnels through
   `completeGrounding`), `widgetBridge.endSplittingActivity(true)` retires it.

Open-ended ("I'll decide later") windows are intentionally skipped — a Live
Activity needs a concrete end time to count down to.
