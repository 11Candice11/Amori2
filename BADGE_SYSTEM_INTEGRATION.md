# Badge System Integration Guide

Complete integration of the Amori badge system with images and UI components.

## Overview

The badge system provides:
- **35 badges** across 13 categories
- **Beautiful image assets** (PNG files) stored in `src/images/badges/`
- **Reusable UI components** for displaying badges
- **Unlock criteria tracking** with point rewards
- **Hidden/secret badges** for special achievements

## Files & Structure

### Core Badge System
```
src/constants/badges.ts
├── BADGE_IMAGES object (all 35 image requires)
├── Badge interface with metadata support
├── 35 Badge constant exports
├── ALL_BADGES registry
└── Helper functions (getBadgeById, getVisibleBadges, getBadgeImage, etc.)
```

### UI Components
```
src/shared/components/
├── BadgeDisplay.tsx          - Single badge display with lock/unlock states
├── BadgeGrid.tsx            - Responsive grid of multiple badges
├── BadgeDetailsModal.tsx     - Full badge details with unlock criteria
└── ...(existing)

src/features/vault/components/
├── BadgeRewardModal.tsx      - UPDATED to use badge system (celebration modal)
└── ...(existing)

src/features/profile/screens/
├── AchievementsScreen.tsx    - NEW: Complete achievements gallery
├── ProfileScreen.tsx         - EXISTING: Can add badge preview section
└── ...(existing)
```

### Badge Images
```
src/images/badges/
├── first_embrace.png                 ├── curious_mind.png
├── first_embrace2.png               ├── curious_mind2.png
├── hug_collector.png                ├── safe_harbor.png
├── morning_ritual.png               ├── evergreen.png
├── night_whispers.png               ├── evergreen2.png
├── memory_keeper.png                ├── evergreen3.png
├── words_that_matter.png            ├── eternal_bond.png
├── words_that_matter2.png           ├── sacred_vow.png
├── open_heart.png                   ├── finding_calm.png
├── daily_streak.png                 ├── finding_calm2.png
├── daily_streak2.png                ├── emerald_soul.png
├── dream_builders.png               ├── emerald_soul2.png
├── dream_builders2.png              ├── golden_heart.png
├── shared_horizons.png              ├── golden_heart2.png
├── shared_horizons2.png             ├── level_up.png
├── bucket_list_buddy.png            ├── growing_together.png
├── bucket_list_buddy2.png           └── together_forever.png (35 total)
```

## Usage Examples

### 1. Display a Single Badge

```typescript
import { BadgeDisplay } from '../shared/components/BadgeDisplay';

export function MyBadgeShowcase() {
  const unlockedBadges = new Set(['first_embrace', 'daily_streak']);

  return (
    <BadgeDisplay
      badgeId="first_embrace"
      variant="large"
      showName={true}
      isLocked={!unlockedBadges.has('first_embrace')}
      onPress={() => console.log('Badge tapped!')}
    />
  );
}
```

### 2. Display Multiple Badges in a Grid

```typescript
import { BadgeGrid } from '../shared/components/BadgeGrid';

export function BadgesSection() {
  const unlockedBadges = new Set(['first_embrace', 'daily_streak', 'hug_collector']);
  
  return (
    <BadgeGrid
      badges={['first_embrace', 'daily_streak', 'hug_collector', 'memory_keeper']}
      variant="medium"
      showNames={true}
      unlockedBadges={unlockedBadges}
      onBadgePress={(badgeId) => {
        // Show details modal or navigate
      }}
      numColumns={3}
    />
  );
}
```

### 3. Show Badge Details Modal

```typescript
import { useState } from 'react';
import { BadgeDetailsModal } from '../shared/components/BadgeDetailsModal';

export function BadgeExplorer() {
  const [selectedBadgeId, setSelectedBadgeId] = useState<string | null>(null);
  const userStats = { hugs_sent: 5, checkin_streak: 15 };
  
  return (
    <>
      {/* Trigger button */}
      <Pressable onPress={() => setSelectedBadgeId('first_embrace')}>
        <Text>View Badge</Text>
      </Pressable>

      {/* Modal */}
      <BadgeDetailsModal
        visible={selectedBadgeId !== null}
        badgeId={selectedBadgeId}
        onDismiss={() => setSelectedBadgeId(null)}
        userStats={userStats}
      />
    </>
  );
}
```

### 4. Show Badge Reward Animation

```typescript
import { BadgeRewardModal } from '../features/vault/components/BadgeRewardModal';
import { useState } from 'react';

export function LevelUpScreen() {
  const [earnedBadgeId, setEarnedBadgeId] = useState<string | null>('first_embrace');

  return (
    <BadgeRewardModal
      visible={earnedBadgeId !== null}
      badgeId={earnedBadgeId}
      onDismiss={() => setEarnedBadgeId(null)}
      onSaveToVault={async (badgeId) => {
        // Save to user's vault
        console.log('Saving badge:', badgeId);
      }}
    />
  );
}
```

### 5. Get Badge Information Programmatically

```typescript
import { 
  getBadgeById, 
  getBadgesByCategory,
  getVisibleBadges,
  getHiddenBadges,
  isBadgeUnlocked,
  getBadgeImage,
  ALL_BADGES 
} from '../constants/badges';

// Get a specific badge
const badge = getBadgeById('first_embrace');
// {
//   id: 'first_embrace',
//   name: 'First Embrace',
//   description: 'Sent your first hug to your partner.',
//   category: 'hugs',
//   tier: 1,
//   pointsReward: 50,
//   unlockCriteria: { type: 'hugs_sent', threshold: 1 },
//   ...
// }

// Get all badges in a category
const hugBadges = getBadgesByCategory('hugs');

// Get visible (non-hidden) badges
const publicBadges = getVisibleBadges();

// Get hidden badges
const secretBadges = getHiddenBadges();

// Check if badge is unlocked
const userStats = { hugs_sent: 5 };
const isUnlocked = isBadgeUnlocked(badge, userStats);

// Get badge image
const image = getBadgeImage('first_embrace');
// Returns: require('../images/badges/first_embrace.png')

// Get all badges
console.log(ALL_BADGES.length); // 35
```

## Integration Points

### 1. Profile Screen
Add a "Badges" section to show top achievements:

```typescript
import { BadgeGrid } from '../../../shared/components/BadgeGrid';

// In ProfileScreen:
<Text style={styles.sectionLabel}>YOUR BADGES</Text>
<BadgeGrid
  badges={topBadges}
  variant="small"
  showNames={false}
  unlockedBadges={unlockedBadges}
  numColumns={5}
/>
<Pressable onPress={() => navigation.navigate('Achievements')}>
  <Text>View All Achievements</Text>
</Pressable>
```

### 2. Level Up/Achievement Screen
Update when user earns a badge:

```typescript
import { BadgeRewardModal } from '../components/BadgeRewardModal';

// When user levels up:
const newBadgeId = calculateEarnedBadge(newLevel);
if (newBadgeId) {
  setShowBadgeModal(newBadgeId);
}

<BadgeRewardModal
  visible={showBadgeModal !== null}
  badgeId={showBadgeModal}
  onDismiss={() => setShowBadgeModal(null)}
  onSaveToVault={saveBadgeToVault}
/>
```

### 3. Achievement Notifications
Push notification when badge earned:

```typescript
import { getBadgeById } from '../constants/badges';

const badge = getBadgeById(badgeId);
await sendNotification({
  title: '🎉 Badge Earned!',
  body: `You've earned: ${badge.name}`,
  data: { badgeId }
});
```

### 4. User Profile/Stats
Track unlock progress:

```typescript
const userStats = {
  hugs_sent: 5,
  checkin_streak: 15,
  memories_saved_to_vault: 8,
  messages_sent: 42,
  // ... other stats
};

const unlockedBadges = new Set(
  ALL_BADGES
    .filter(badge => isBadgeUnlocked(badge, userStats))
    .map(b => b.id)
);

const totalPoints = ALL_BADGES
  .filter(badge => isBadgeUnlocked(badge, userStats))
  .reduce((sum, badge) => sum + badge.pointsReward, 0);
```

## Badge Categories

| Category | Count | Examples |
|----------|-------|----------|
| hugs | 3 | First Embrace, Embrace Collector, Hug Collector |
| checkins | 5 | Daily Ritual, Devoted Daily, First Light, Morning Ritual, Night Whispers |
| memory_vault | 1 | Memory Keeper |
| messages | 3 | Words That Matter, Conversation Maestro, Open Heart |
| timeline | 3 | Shared Horizons, Timeline Architect, Together Forever |
| vision_board | 2 | Dream Builders, Future Architects |
| bucket_list | 2 | Bucket List Buddy, Adventure Seeker |
| games | 3 | Curious Mind, Game Master, Level Up |
| partner_sync | 2 | Growing Together, Safe Harbor |
| special | 5 | Evergreen (3 tiers + 2 hidden) |
| mood | 2 | Finding Calm, Serenity Seeker |
| media | 4 | Emerald Soul, Emerald Legacy, Golden Heart, Golden Director |

## Unlock Criteria Types

- `hugs_sent` - Number of hugs sent
- `checkin_streak` - Consecutive daily check-ins
- `morning_checkins` / `evening_checkins` - Count of time-specific check-ins
- `memories_saved_to_vault` - Memories saved to vault
- `messages_sent` - Messages exchanged in Let's Chat
- `timeline_events_added` - Timeline milestones created
- `vision_board_items_added` - Vision board dreams added
- `bucket_list_items_added` - Bucket list items added
- `games_played` - Games played in Distraction Centre
- `mood_logged` - Mood entries logged
- `media_attachments` - Photos/videos attached to memories
- `level_reached` - User level achieved
- `custom` - Special/hidden criteria

## Testing

### Mock Data
```typescript
// Create mock user stats for testing
const mockUserStats = {
  hugs_sent: 50,
  checkin_streak: 30,
  morning_checkins: 15,
  evening_checkins: 15,
  memories_saved_to_vault: 10,
  messages_sent: 100,
  timeline_events_added: 5,
  vision_board_items_added: 10,
  bucket_list_items_added: 10,
  games_played: 10,
  mood_logged: 20,
  media_attachments: 15,
  level_reached: 5,
};

// Get all unlocked badges
const unlockedBadges = ALL_BADGES
  .filter(badge => isBadgeUnlocked(badge, mockUserStats))
  .map(b => b.id);
```

## Component Props Reference

### BadgeDisplay
- `badgeId` (string) - Badge ID to display
- `onPress?` (function) - Tap handler
- `variant?` ('large' | 'medium' | 'small') - Size
- `showName?` (boolean) - Show badge name
- `showLocked?` (boolean) - Show lock icon
- `isLocked?` (boolean) - Show as locked

### BadgeGrid
- `badges` (string[]) - Array of badge IDs
- `variant?` ('large' | 'medium' | 'small') - Size
- `showNames?` (boolean) - Show names
- `unlockedBadges?` (Set<string>) - Unlocked badge IDs
- `onBadgePress?` (function) - Badge tap handler
- `emptyText?` (string) - Empty state text
- `numColumns?` (number) - Grid columns

### BadgeDetailsModal
- `visible` (boolean) - Show modal
- `badgeId` (string | null) - Badge to show
- `onDismiss` (function) - Close handler
- `isUnlocked?` (boolean) - Unlock state
- `userStats?` (Record) - User stats for criteria

### BadgeRewardModal
- `visible` (boolean) - Show modal
- `badgeId` (string | null) - Earned badge ID
- `onDismiss` (function) - Close handler
- `onSaveToVault` (function) - Save handler
- `loading?` (boolean) - Loading state

## Next Steps

1. ✅ Badge images mapped (35 PNG files)
2. ✅ Badge system defined (35 badges with metadata)
3. ✅ UI components created (Display, Grid, Modals)
4. ✅ BadgeRewardModal updated to use new system
5. ✅ AchievementsScreen created
6. 📋 Connect to user stats API
7. 📋 Integrate unlock tracking in features
8. 📋 Add navigation to AchievementsScreen
9. 📋 Track badge earnings and notify users

## Troubleshooting

### Images not loading
- Ensure all 35 PNG files are in `src/images/badges/`
- Check file names match badge IDs exactly (snake_case)
- Verify require() paths are correct

### Badge not appearing
- Confirm badge is in ALL_BADGES array
- Check badgeId spelling matches badge.id
- Verify unlock criteria are being tracked correctly

### Performance
- BadgeGrid uses FlatList for efficient rendering
- Use `variant="small"` for large lists
- Memoize unlockedBadges set to prevent unnecessary re-renders

