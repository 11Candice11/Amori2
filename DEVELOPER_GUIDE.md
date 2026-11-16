# Amori Developer Guide

Setup, deployment and feature reference that isn't covered by `docs/BRD_Amori_v2.md`
(features and rules), `docs/architecture/README.md` (layout) or `backend/README.md` (API).

Contents: 1. Deploying · 2. Push notifications setup · 3. iOS widget and Live Activity setup ·
4. Background images · 5. Badge UI components

---

## 1. Deploying

Everything goes through one script at the repo root:

```bash
./deploy.sh api [--skip-build]   # backend to EC2
./deploy.sh ios [UDID]           # Release build on a connected iPhone
./deploy.sh android [DEVICE_ID]  # Release APK on a connected Android device (USB)
./deploy.sh all [--skip-build]   # api, then ios
```

### Backend (`api`)

Builds the API image for linux/amd64 locally, ships it over SSH to the EC2 box, restarts the
compose stack and waits for `/api/health` to return 200. Needs Docker Desktop running and the
key at `~/.ssh/AmoriKey.pem`. Override `SSH_HOST`, `SSH_USER`, `SSH_KEY`, `IMAGE_NAME`,
`REMOTE_DIR`, `COMPOSE_FILE`, `HEALTH_URL` or `PLATFORM` through environment variables.

Takes about 6 to 8 minutes, so run it as a background process. Program.cs runs `MigrateAsync()`
on boot, so a deploy applies new migrations. Before a deploy that includes migrations:

1. Back up the database (dumps go to `~/amori/backups/` on the server):
   `sudo docker exec amori-postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner' | gzip > ~/amori/backups/pre-deploy-<UTC>.sql.gz`
2. Check what will run: `dotnet ef migrations script <server's last migration>`. The server's
   list is in `__EFMigrationsHistory`.

A 404 from an `[Authorize]` route on the live API means that code isn't deployed. Deployed
routes return 401 without a token. If the API fails to become healthy, the script prints the
`docker logs` command to run. `backend/scripts/prune-docker-logs.sh` is a cron job on the server
and is not part of the deploy.

### iOS (`ios`)

Runs `npx react-native run-ios --mode Release --udid <udid>`. The Release build embeds the JS
bundle (AppDelegate loads `main.jsbundle` when `DEBUG` is off), so the app runs with no Metro
and no Wi-Fi. Run it again after any code change.

Requirements: iPhone plugged in, unlocked, trusted, Developer Mode on, Xcode command line tools.
With no UDID, the script uses the default device if connected, otherwise the first connected
iPhone or iPad.

Troubleshooting:
- **Code signing error:** in Xcode, Amori target, Signing & Capabilities, enable "Automatically
  manage signing" and pick your team. On the phone, trust the developer under Settings, General,
  VPN & Device Management.
- **Missing `.xcconfig` files:** run `cd ios && pod install`.
- **Changes not showing:** clear the Metro cache with `npm start -- --reset-cache`. If that fails,
  remove `ios/build` and `ios/Pods`, run `pod install`, and clean the build folder in Xcode
  (Cmd+Shift+K).
- **Debug on device with Metro:** open `ios/Amori.xcworkspace` in Xcode, pick the device and press
  Cmd+R, with `npm start` running in a terminal.
- **TestFlight or App Store:** `eas build --platform ios`.

### Android (`android`)

Bundles the JS, runs `./gradlew assembleRelease` and installs
`android/app/build/outputs/apk/release/app-release.apk` with `adb install -r`. Needs `adb` on
PATH and USB debugging enabled (Settings, About phone, tap Build number 7 times, then Developer
options, USB debugging). The APK is signed with the debug key, which is fine for testing but not
for the Play Store.

If the install fails, run `adb uninstall com.candice.amori` and retry. If the build fails, run
`cd android && ./gradlew clean`.

For development with hot reload use `npm run ios` or `npm run android`.

---

## 2. Push notifications setup

Already done in the repo: `expo-notifications` and `expo-device` installed, the `aps-environment`
entitlement and `remote-notification` background mode on iOS, the `POST_NOTIFICATIONS` permission
in `app.json`, the `expo-notifications` plugin, `EXPO_PROJECT_ID` read from
`app.json` (`expo.extra.eas.projectId`), device registration and tap handling in `App.tsx` and
`pushHandlers.ts`, and `ExpoPushNotificationService` on the backend.

Still needs your Apple, Firebase and Expo credentials, plus a physical device (push does not work
on simulators or emulators):

1. **EAS CLI:** `npm install -g eas-cli && eas login`.
2. **iOS, APNs key:**
   - In Xcode, Amori target, Signing & Capabilities, confirm "Push Notifications" is listed.
   - In the Apple Developer portal (Keys), create a key with "Apple Push Notifications service
     (APNs)" enabled and download the `.p8` file. You can only download it once.
   - Run `eas credentials`, choose iOS, "Push Notifications Key", and upload the `.p8` with your
     Key ID and Team ID.
3. **Android, FCM:**
   - In the Firebase console, create a project and add an Android app with package
     `com.candice.amori`. Put the downloaded `google-services.json` in `android/app/`.
   - Under Project Settings, Cloud Messaging, enable the Firebase Cloud Messaging API (V1).
   - Under Service Accounts, generate a private key, then run `eas credentials`, choose Android,
     "Google Service Account", and upload it.
4. **Build:** `eas build --platform ios|android --profile development`, or `npm run ios` /
   `npm run android`.

`google-services.json` and `*-firebase-adminsdk-*.json` are git-ignored. Never commit them.

Testing: log in (the device registers itself), then send a hug or create an incident. You can
also paste the `ExponentPushToken[...]` from the app logs into https://expo.dev/notifications.

Troubleshooting:
- **Nothing on iOS:** check the Push Notifications capability, the APNs key in EAS, a physical
  device, and `EXPO_PROJECT_ID`.
- **Nothing on Android:** check `android/app/google-services.json`, the FCM credentials in EAS, a
  physical device, and the notification permission. Check the API logs for tickets Expo rejected:
  `InvalidCredentials` means the FCM key isn't uploaded to Expo, `DeviceNotRegistered` means a
  stale token.
- **Token is null:** check Settings, Amori, Notifications, and the console logs.
- **`expo-notifications` not found:** run `npm install`, `cd ios && pod install`, and rebuild.

---

## 3. iOS widget and Live Activity setup

Two iOS-only surfaces use existing app data. On Android and iOS before 16.1 the JS bridge is a
no-op, so the app doesn't branch.

- **Partner Mood widget** (small and medium): the partner's latest shared mood check-in.
- **Splitting countdown Live Activity** (Lock Screen and Dynamic Island): the self-regulation
  window in the "Take some space" flow.

### Files in the repo

`ios/AmoriWidgets/`:

| File | Target | Purpose |
| --- | --- | --- |
| `Shared/AmoriSharedStore.swift` | app and extension | App Group store (`group.com.candice.amori`) and `PartnerMoodSnapshot` |
| `Shared/MoodTheme.swift` | app and extension | Mood label to colour and glyph |
| `Shared/SplittingActivityAttributes.swift` | app and extension | `ActivityAttributes` for the Live Activity |
| `PartnerMoodWidget.swift` | extension | Widget UI and timeline provider |
| `SplittingLiveActivity.swift` | extension | Lock Screen and Dynamic Island UI |
| `AmoriWidgetsBundle.swift` | extension | `@main` widget bundle |
| `Info.plist`, `AmoriWidgets.entitlements` | extension | Extension point and App Group |

`ios/Amori/`: `AmoriWidgetBridge.swift` and `.m` (RN native module), `Amori-Bridging-Header.h`,
`Amori.entitlements` (App Group), `Info.plist` (`NSSupportsLiveActivities`).

JS: `src/services/native/widgetBridge.ts` (safe wrapper), `useDashboard.ts` (pushes the partner's
mood on each dashboard load), `DeEscalationPacingScreen.tsx` (starts the Live Activity),
`useLeaveSplittingFlow.ts` (ends it).

### One-time Xcode setup

The widget extension target must be created in Xcode, because hand-editing `project.pbxproj` is
unreliable. Open `ios/Amori.xcworkspace`:

1. File, New, Target, **Widget Extension**, named `AmoriWidgets`. Untick "Include Configuration
   App Intent" and tick "Include Live Activity". Delete the placeholder files Xcode generates and
   use the ones in `ios/AmoriWidgets/`.
2. Target membership: `PartnerMoodWidget`, `SplittingLiveActivity` and `AmoriWidgetsBundle` go to
   `AmoriWidgets` only. The three `Shared/` files go to both `Amori` and `AmoriWidgets`. The two
   `AmoriWidgetBridge` files go to `Amori` only. Point the extension's Info.plist and entitlements
   build settings at the files in `ios/AmoriWidgets/`.
3. Signing & Capabilities: add the App Group `group.com.candice.amori` to both targets (works
   with a free Apple team).
4. Set the `AmoriWidgets` minimum iOS to 16.1. The Live Activity code is guarded by
   `#available(iOS 16.1, *)`.

`expo prebuild` does not create extra targets, so repeat steps 1 to 4 after a clean prebuild.

### Data flow

- **Widget:** `useDashboard` fetches the partner's check-in, calls
  `widgetBridge.setPartnerMood(...)`, the native module writes a `PartnerMoodSnapshot` to the App
  Group and reloads the `PartnerMoodWidget` timeline.
- **Live Activity:** choosing a fixed duration in *Take some space* calls
  `widgetBridge.startSplittingActivity(...)`. The activity counts down on its own with
  `Text(timerInterval:)`. `completeGrounding` calls `endSplittingActivity(true)`. Open-ended windows
  are skipped, since a Live Activity needs an end time.

---

## 4. Background images

Images live in `images/background/`, two per set, one picked at random.

- **Mood-driven, shared:** Check-in, Together and Desk (including Incident Detail) show the same
  image, chosen from the quadrant of today's check-in, or neutral if there is none. They read it
  from `shared/state/moodBackgroundStore`, so it changes only on a new check-in.
- **Screen-specific:** sign-in, home dashboard and settings have their own art and ignore mood.

Quadrants (energy by pleasantness): `HIGH_PLEASANT` (joyful, excited), `LOW_PLEASANT` (calm,
content), `HIGH_UNPLEASANT` (anxious, angry), `LOW_UNPLEASANT` (sad, numb), plus `neutral`.
File names are `high_pleasant1.png`, `high_pleasant2.png`, `low_pleasant1.png`, and so on, plus
`signin1/2`, `dashboard1/2`, `settings1/2` and `neutral1/2`.

```typescript
// Mood-driven screens
const backgroundImage = useMoodBackground();            // shared/state/moodBackgroundStore

// Screen-specific
const bg = useBackgroundImage('settings');              // 'signin' | 'dashboard' | 'settings'
const [bg2] = useState(() => getDashboardBackground()); // or hold a getter result in state
```

Store API: `load()` fetches today's check-in once per session (`load(true)` forces it),
`setFromCheckIn(checkIn)` derives the quadrant (anything not from today counts as none), and
`setQuadrant(q)` sets it directly. CheckInScreen is the writer: it fetches `/api/moods/current` on
focus and calls `setQuadrant` as soon as a check-in is confirmed. The variant is re-rolled only
when the quadrant changes, which keeps the three screens in sync.

To add a background: put the image in `images/background/`, register it in `BACKGROUND_IMAGES` in
`src/utils/backgroundImages.ts`, add it to `MOOD_BACKGROUND_PAIRS` (mood pair) or add a getter and
a `BackgroundContext` value (screen art), and add it to the list above. Images are bundled with
`require()`, so there are no network requests. A scrim (`rgba(6, 18, 10, 0.45)`) sits over
full-screen backgrounds for text contrast.

---

## 5. Badge UI components

Badge data, rules and points are described in `.kiro/steering/project-context.md` (Gamification)
and `.kiro/specs/achievements-badges/`. This section covers the UI pieces.

- Display data and helpers: `src/constants/badges.ts` (`ALL_BADGES`, `getBadgeById`,
  `getBadgesByCategory`, `getVisibleBadges`, `getHiddenBadges`, `isBadgeUnlocked`,
  `getBadgeProgress`, `getBadgeImage`). Images are in `src/images/badges/`, named by badge id.
- Components: `shared/components/BadgeDisplay`, `BadgeGrid`, `BadgeDetailsModal`;
  `features/vault/components/BadgeRewardModal`; `features/profile/screens/AchievementsScreen`.
- Unlock state comes from `badgeService.getUserStats()`, which caches
  `GET /api/users/me/badge-stats` for 30 seconds and adds the locally derived
  `categories_unlocked`.

Stats rules worth knowing:
- Streak criteria report the longest run, so an earned badge never looks un-earned after a quiet
  week.
- Couples with no anniversary date fall back to the day the relationship was created, so
  `anniversary_reached` still has a value.
- A criterion missing from `userStats` means "not measured": the progress bar is hidden instead of
  drawn at zero.
- `sync_questions_agreed` counts Would You Rather questions where both partners picked the same
  option. `partner_low_mood_support` means the partner shared a hard-day mood and the user sent a
  hug or message within 24 hours.

Props:

| Component | Props |
| --- | --- |
| `BadgeDisplay` | `badgeId`, `onPress?`, `variant?` (`large`/`medium`/`small`), `showName?`, `showLocked?`, `isLocked?` |
| `BadgeGrid` | `badges` (ids), `variant?`, `showNames?`, `unlockedBadges?` (`Set<string>`), `onBadgePress?`, `emptyText?`, `numColumns?` |
| `BadgeDetailsModal` | `visible`, `badgeId`, `onDismiss`, `isUnlocked?`, `userStats?` (drives the "5 / 10 hugs sent" progress bar) |
| `BadgeRewardModal` | `visible`, `badgeId`, `onDismiss`, `onSaveToVault`, `loading?` |

```tsx
<BadgeGrid
  badges={['first_embrace', 'daily_streak']}
  variant="medium"
  showNames
  unlockedBadges={unlockedBadges}
  onBadgePress={(id) => setSelectedBadgeId(id)}
  numColumns={3}
/>
<BadgeDetailsModal
  visible={selectedBadgeId !== null}
  badgeId={selectedBadgeId}
  onDismiss={() => setSelectedBadgeId(null)}
  userStats={userStats}
/>
```

Troubleshooting: if an image doesn't load, check the file name matches the badge id (snake_case).
If a badge doesn't appear, check it is in `ALL_BADGES` and the id is spelled the same. Use
`variant="small"` in long lists. BadgeGrid is a FlatList, so memoise the `unlockedBadges` set.
