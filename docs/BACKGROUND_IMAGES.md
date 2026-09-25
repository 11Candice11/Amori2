# Background Images System

## Overview

Backgrounds fall into two groups.

**Mood-driven, shared.** Check-in, Together and Desk (including Incident Detail)
always show the *same* image: the quadrant of today's check-in, or neutral when
there is no check-in yet today. They read it from a shared store so the image
does not change as the user moves between those screens — only a new check-in
changes it.

**Screen-specific.** Sign-in, the home dashboard and settings have their own
artwork and never follow the mood.

Every set has two images; one is picked at random.

## Mood Quadrants

Moods map to four quadrants by energy level (high/low) and valence
(pleasant/unpleasant):

- **HIGH_PLEASANT** — joyful, excited, energized: `high_pleasant1.png`, `high_pleasant2.png`
- **LOW_PLEASANT** — calm, content, peaceful: `low_pleasant1.png`, `low_pleasant2.png`
- **HIGH_UNPLEASANT** — anxious, angry, overwhelmed: `high_unpleasant1.png`, `high_unpleasant2.png`
- **LOW_UNPLEASANT** — sad, numb, exhausted: `low_unpleasant1.png`, `low_unpleasant2.png`
- No check-in today — `neutral1.png`, `neutral2.png`

## Image Locations

All background images live in `/images/background/`:

| Image | Used by |
| --- | --- |
| `signin1.png`, `signin2.png` | Sign-in |
| `dashboard1.png`, `dashboard2.png` | Home dashboard |
| `settings1.png`, `settings2.png` | Profile / settings |
| `neutral1.png`, `neutral2.png` | Mood-driven screens, no check-in today |
| `high_pleasant1.png`, `high_pleasant2.png` | Mood-driven screens, HIGH_PLEASANT |
| `low_pleasant1.png`, `low_pleasant2.png` | Mood-driven screens, LOW_PLEASANT |
| `high_unpleasant1.png`, `high_unpleasant2.png` | Mood-driven screens, HIGH_UNPLEASANT |
| `low_unpleasant1.png`, `low_unpleasant2.png` | Mood-driven screens, LOW_UNPLEASANT |

## Usage

### Mood-driven screens

```typescript
import { useMoodBackground } from '../../../shared/state/moodBackgroundStore';

function TogetherScreen() {
  const backgroundImage = useMoodBackground();

  return (
    <ImageBackground source={backgroundImage} style={styles.background} resizeMode="cover">
      <View style={styles.scrim} />
      {/* content */}
    </ImageBackground>
  );
}
```

The hook triggers a one-time fetch of today's check-in the first time any
mood-driven screen mounts, then re-renders whenever the mood changes.

### Screen-specific backgrounds

```typescript
import { useBackgroundImage } from '../../../hooks/useBackgroundImage';

const backgroundImage = useBackgroundImage('settings'); // 'signin' | 'dashboard' | 'settings'
```

Or call the getter directly and hold it in state so re-renders don't reshuffle:

```typescript
import { getDashboardBackground } from '../../../utils/backgroundImages';

const [backgroundImage] = useState(() => getDashboardBackground());
```

## Keeping the shared mood state fresh

`shared/state/moodBackgroundStore` owns both the quadrant and which of the two
images is in use. The variant is only re-rolled when the quadrant actually
changes, which is what keeps the three screens in sync.

- `load()` — fetches today's check-in once per session (`load(true)` to force).
- `setFromCheckIn(checkIn)` — derives the quadrant from a check-in response;
  anything not from today counts as no check-in.
- `setQuadrant(quadrant)` — set directly; CheckInScreen calls this the moment a
  check-in is confirmed so the other screens follow immediately.

CheckInScreen is the writer: it already fetches `/api/moods/current` on focus and
pushes the result into the store.

## Adding New Backgrounds

1. Add the image to `/images/background/`.
2. Register it in `BACKGROUND_IMAGES` in `/src/utils/backgroundImages.ts`.
3. For a mood pair, add it to `MOOD_BACKGROUND_PAIRS`. For screen-specific art,
   add a getter and a `BackgroundContext` value.
4. Document it in the table above.

## Performance Considerations

- Images are bundled at build time via `require()` and cached by React Native.
- No network requests for backgrounds.
- The random pick is held for the life of the screen (or, for mood backgrounds,
  until the mood changes), so nothing swaps mid-interaction.

## Accessibility

- Backgrounds are decorative and carry no critical information.
- A scrim (`rgba(6, 18, 10, 0.45)`) sits over the image on full-screen
  backgrounds to keep text contrast.
