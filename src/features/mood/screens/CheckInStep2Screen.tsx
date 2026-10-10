/**
 * CheckInStep2Screen — "Choose your specific mood"
 *
 * Step 2 of 2: Shows a bubble cloud of moods where:
 * - Each mood is its own bubble with text inside
 * - Selected quadrant's color dominates, but other colors are visible
 * - Horizontally scrollable to pan and see moods from other quadrants
 * - Tap a bubble to expand it and show the description at bottom
 * - Selected bubble shows the mood description
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  Vibration,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle } from 'react-native-svg';

import { colors, spacing, typography } from '../../../shared/theme';
import {
  MOOD_OPTIONS,
  QUADRANTS,
  type MoodOption,
  type MoodQuadrant,
} from '../types/mood.types';

// ─── Icons ────────────────────────────────────────────────────────────────────

function AnchorIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="5" r="3" stroke={colors.ctaText} strokeWidth={1.8} />
      <Path
        d="M12 8v13M5 12H2l3 5M19 12h3l-3 5M5 17c0 3.87 3.13 7 7 7s7-3.13 7-7"
        stroke={colors.ctaText}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function QuestionDontKnowIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01"
        stroke={colors.neutralMuted}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="12" cy="12" r="10" stroke={colors.neutralMuted} strokeWidth={1.5} />
    </Svg>
  );
}

// ─── Color spectrum ────────────────────────────────────────────────────────────

// Color mapping for each quadrant - circular spectrum
const QUADRANT_COLORS: Record<MoodQuadrant, string> = {
  HIGH_UNPLEASANT: '#FF6B6B',      // Red
  HIGH_PLEASANT: '#FFD93D',        // Yellow
  LOW_PLEASANT: '#6BCF9E',         // Green
  LOW_UNPLEASANT: '#6B9FFF',       // Blue
};

// Circular color spectrum for transitions
const COLOR_SPECTRUM = [
  '#FF6B6B',    // 0: Red (HIGH_UNPLEASANT)
  '#FF8A5B',    // 1: Orange (HIGH_UNPLEASANT → HIGH_PLEASANT transition)
  '#FFD93D',    // 2: Yellow (HIGH_PLEASANT)
  '#87CEEB',    // 3: Light Blue (HIGH_PLEASANT → LOW_PLEASANT transition)
  '#6BCF9E',    // 4: Green (LOW_PLEASANT)
  '#5CB8B8',    // 5: Turquoise (LOW_PLEASANT → LOW_UNPLEASANT transition)
  '#6B9FFF',    // 6: Blue (LOW_UNPLEASANT)
  '#8B7FB8',    // 7: Purple (LOW_UNPLEASANT → HIGH_UNPLEASANT transition)
];

// Helper to get color for a mood based on its quadrant
function getMoodColor(mood: MoodOption): string {
  return QUADRANT_COLORS[mood.quadrant];
}

// Map quadrant to position in the color spectrum for smooth transitions
function getQuadrantColorIndex(quadrant: MoodQuadrant): number {
  switch (quadrant) {
    case 'HIGH_UNPLEASANT': return 0;  // Red
    case 'HIGH_PLEASANT': return 2;    // Yellow
    case 'LOW_PLEASANT': return 4;     // Green
    case 'LOW_UNPLEASANT': return 6;   // Blue
  }
}

// Generate bubble layout for 2x2 quadrant grid with center transitions
interface BubbleLayout {
  mood: MoodOption;
  size: number;
  color: string;
  quadrant: MoodQuadrant;
}

function generateBubbleGrid(quadrant: MoodQuadrant): BubbleLayout[] {
  const sizes = [0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 0.85, 0.95, 1.05, 1.15, 1.25, 1.35, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4];
  const bubbles: BubbleLayout[] = [];
  
  // Get moods for this quadrant (main 20)
  const moodsForQuadrant = MOOD_OPTIONS.filter((m) => m.quadrant === quadrant);
  const mainColor = QUADRANT_COLORS[quadrant];
  
  moodsForQuadrant.forEach((mood, index) => {
    if (index < 20) {
      bubbles.push({
        mood,
        size: sizes[index % sizes.length],
        color: mainColor,
        quadrant,
      });
    }
  });
  
  // Add 10 transition moods to each adjacent quadrant with transition colors
  const adjacent = getAdjacentQuadrants(quadrant);
  const currentColorIndex = getQuadrantColorIndex(quadrant);
  
  adjacent.forEach((adjQuadrant, adjIndex) => {
    const adjColorIndex = getQuadrantColorIndex(adjQuadrant);
    // Get the transition color between current and adjacent
    const isClockwise = (adjColorIndex > currentColorIndex) || 
                        (currentColorIndex === 6 && adjColorIndex === 0); // Blue to Red wrap
    
    // Pick the middle color between the two quadrants
    let transitionColorIndex: number;
    if (adjIndex === 0) {
      // First adjacent quadrant - use first transition color
      transitionColorIndex = (currentColorIndex + 1) % COLOR_SPECTRUM.length;
    } else {
      // Second adjacent quadrant - use second transition color (going backwards)
      transitionColorIndex = (currentColorIndex - 1 + COLOR_SPECTRUM.length) % COLOR_SPECTRUM.length;
    }
    
    const transitionColor = COLOR_SPECTRUM[transitionColorIndex];
    const transitionMoods = MOOD_OPTIONS.filter((m) => m.quadrant === adjQuadrant).slice(0, 10);
    
    transitionMoods.forEach((mood, index) => {
      bubbles.push({
        mood,
        size: sizes[index % sizes.length],
        color: transitionColor,
        quadrant: adjQuadrant,
      });
    });
  });
  
  return bubbles;
}

// Get adjacent quadrants (the ones that share an edge)
function getAdjacentQuadrants(quadrant: MoodQuadrant): MoodQuadrant[] {
  switch (quadrant) {
    case 'HIGH_PLEASANT':
      return ['HIGH_UNPLEASANT', 'LOW_PLEASANT'];
    case 'HIGH_UNPLEASANT':
      return ['HIGH_PLEASANT', 'LOW_UNPLEASANT'];
    case 'LOW_PLEASANT':
      return ['HIGH_PLEASANT', 'LOW_UNPLEASANT'];
    case 'LOW_UNPLEASANT':
      return ['HIGH_UNPLEASANT', 'LOW_PLEASANT'];
  }
}

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  quadrant: MoodQuadrant;
  onConfirm: (mood: MoodOption) => void;
  onIDontKnow: () => void;
  onBack: () => void;
  /** True while the API call is in-flight */
  submitting?: boolean;
  /** Error message from a failed confirm / "I don't know" submission. */
  error?: string | null;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function CheckInStep2Screen({ quadrant, onConfirm, onIDontKnow, onBack, submitting = false, error = null }: Props) {
  const [selectedMoodId, setSelectedMoodId] = useState<string | null>(null);
  const [currentQuadrant, setCurrentQuadrant] = useState<MoodQuadrant>(quadrant);
  const scrollViewRef = useRef<ScrollView>(null);

  // Generate bubble grid for current quadrant (20 main + 20 transitions)
  const bubbles = generateBubbleGrid(currentQuadrant);

  const selectedMood = selectedMoodId 
    ? MOOD_OPTIONS.find((m) => m.id === selectedMoodId) ?? null
    : null;

  const handleBubbleSelect = (moodId: string) => {
    Vibration.vibrate(30);
    setSelectedMoodId(moodId);
  };

  const handleConfirm = useCallback(() => {
    if (selectedMood) {
      onConfirm(selectedMood);
    }
  }, [selectedMood, onConfirm]);

  // Map quadrant to scroll index
  const quadrantIndex = getQuadrantIndex(quadrant);
  
  useEffect(() => {
    // Scroll to the correct quadrant when it changes
    setTimeout(() => {
      if (scrollViewRef.current) {
        const screenWidth = 100; // approximate, will be set by ScrollView
        scrollViewRef.current.scrollTo({ x: quadrantIndex * screenWidth, animated: true });
      }
    }, 100);
  }, [quadrant, quadrantIndex]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      <View style={styles.container}>
        {/* Header with back button and title */}
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={!submitting ? onBack : undefined}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            accessibilityState={{ disabled: submitting }}
          >
            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
              <Path
                d="M19 12H5M5 12l7-7M5 12l7 7"
                stroke={colors.neutral}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </Pressable>

          <Text style={styles.headerTitle}>
            Tap the emotion that best describes how you feel right now
          </Text>
        </View>

        {/* Bubble cloud - horizontal scroll between quadrants */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.bubbleScroll}
          contentContainerStyle={styles.bubbleContainer}
          horizontal={true}
          scrollEnabled={true}
          showsHorizontalScrollIndicator={false}
          pagingEnabled={true}
          scrollEventThrottle={16}
          onMomentumScrollEnd={(event) => {
            const contentOffsetX = event.nativeEvent.contentOffset.x;
            const screenWidth = event.nativeEvent.layoutMeasurement.width;
            const pageIndex = Math.round(contentOffsetX / screenWidth);
            const quadrants: MoodQuadrant[] = ['HIGH_PLEASANT', 'HIGH_UNPLEASANT', 'LOW_PLEASANT', 'LOW_UNPLEASANT'];
            if (quadrants[pageIndex]) {
              setCurrentQuadrant(quadrants[pageIndex]);
            }
          }}
        >
          {['HIGH_PLEASANT', 'HIGH_UNPLEASANT', 'LOW_PLEASANT', 'LOW_UNPLEASANT'].map((q) => (
            <View key={q} style={styles.quadrantPage}>
              <ScrollView
                scrollEnabled={true}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.bubbleGrid}>
                  {generateBubbleGrid(q as MoodQuadrant).map((bubble, index) => (
                    <BubbleMood
                      key={`${bubble.mood.id}-${index}`}
                      bubble={bubble}
                      isSelected={selectedMoodId === bubble.mood.id}
                      onPress={() => handleBubbleSelect(bubble.mood.id)}
                      delay={Math.min(index * 15, 600)}
                    />
                  ))}
                </View>
              </ScrollView>
            </View>
          ))}
        </ScrollView>

        {/* Description shown at bottom when mood is selected */}
        {selectedMood && (
          <View style={styles.descriptionContainer}>
            <Text style={[styles.descriptionText, { color: getMoodColor(selectedMood) }]}>
              <Text style={styles.descriptionLabel}>{selectedMood.label}</Text>
            </Text>
            <Text style={styles.descriptionSubtext}>{selectedMood.description}</Text>
          </View>
        )}

        {/* Footer with actions */}
        <View style={styles.footer}>
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            style={({ pressed }) => [
              styles.confirmButton,
              (!selectedMood || submitting) && styles.confirmButtonDisabled,
              pressed && selectedMood && !submitting && styles.confirmButtonPressed,
            ]}
            onPress={handleConfirm}
            disabled={!selectedMood || submitting}
            android_ripple={selectedMood && !submitting ? { color: 'rgba(10,20,15,0.2)' } : undefined}
            accessibilityRole="button"
            accessibilityLabel="Confirm and anchor"
            accessibilityState={{ disabled: !selectedMood || submitting }}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={colors.ctaText} />
            ) : (
              <>
                <AnchorIcon />
                <Text style={styles.confirmButtonText}>Confirm & Anchor</Text>
              </>
            )}
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.dontKnowButton,
              pressed && styles.dontKnowPressed,
              submitting && styles.dontKnowPressed,
            ]}
            onPress={!submitting ? onIDontKnow : undefined}
            android_ripple={{ color: 'rgba(253,252,240,0.06)' }}
            accessibilityRole="button"
            accessibilityLabel="I don't know, hard to pinpoint words right now"
            accessibilityState={{ disabled: submitting }}
          >
            <QuestionDontKnowIcon />
            <Text style={styles.dontKnowText}>I don't know</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

// Bubble component
interface BubbleMoodProps {
  bubble: BubbleLayout;
  isSelected: boolean;
  onPress: () => void;
  delay: number;
}

function BubbleMood({ bubble, isSelected, onPress, delay }: BubbleMoodProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      delay,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim, delay]);

  useEffect(() => {
    // Scale animation when selected
    Animated.spring(scaleAnim, {
      toValue: isSelected ? 1.2 : 1,
      useNativeDriver: true,
      friction: 5,
      tension: 40,
    }).start();
  }, [isSelected, scaleAnim]);

  return (
    <Animated.View
      style={[
        styles.bubbleWrapper,
        {
          transform: [{ scale: scaleAnim }],
          opacity: fadeAnim,
        },
      ]}
    >
      <Pressable
        onPress={onPress}
        style={[
          styles.bubble,
          {
            backgroundColor: bubble.color,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`${bubble.mood.label}: ${bubble.mood.description}`}
      >
        <Text 
          style={styles.bubbleText}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {bubble.mood.label}
        </Text>
        {isSelected && (
          <View style={styles.bubbleSelection} />
        )}
      </Pressable>
    </Animated.View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },

  // Header
  header: {
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    padding: 4,
    zIndex: 10,
  },
  headerTitle: {
    ...typography.headline,
    color: colors.neutral,
    textAlign: 'center',
    fontSize: 18,
    paddingHorizontal: spacing.lg,
  },

  // Bubble cloud
  bubbleScroll: {
    flex: 1,
  },
  bubbleContainer: {
    flexGrow: 1,
  },
  quadrantPage: {
    width: '100%',
    height: '100%',
    flex: 1,
  },
  bubbleGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'flex-start',
    padding: spacing.md,
  },
  bubbleWrapper: {
    width: '12.5%',  // 8 columns (100 / 8 = 12.5%)
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xs,
  },
  bubble: {
    width: '85%',
    height: '85%',
    borderRadius: 1000,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  bubbleText: {
    ...typography.bodySemiBold,
    fontSize: 11,
    color: '#0A140F',
    textAlign: 'center',
    paddingHorizontal: spacing.xs,
  },
  bubbleSelection: {
    position: 'absolute',
    width: '110%',
    height: '110%',
    borderRadius: 1000,
    borderWidth: 3,
    borderColor: colors.gold,
  },

  // Description at bottom
  descriptionContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: 'rgba(10,20,15,0.4)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(197,163,101,0.2)',
  },
  descriptionLabel: {
    ...typography.bodySemiBold,
    fontSize: 16,
  },
  descriptionText: {
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  descriptionSubtext: {
    ...typography.body,
    color: colors.neutral,
    textAlign: 'center',
  },

  // Footer
  footer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 2,
  },

  // Confirm CTA
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: 16,
    borderRadius: 50,
    backgroundColor: colors.ctaBackground,
    marginBottom: spacing.xs,
  },
  confirmButtonDisabled: {
    opacity: 0.4,
  },
  confirmButtonPressed: {
    opacity: 0.88,
  },
  confirmButtonText: {
    ...typography.bodySemiBold,
    color: colors.ctaText,
    fontSize: 15,
  },

  // Don't know
  dontKnowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: 10,
  },
  dontKnowPressed: {
    opacity: 0.7,
  },
  dontKnowText: {
    ...typography.bodyMedium,
    color: colors.neutralMuted,
  },
  error: {
    ...typography.bodySm,
    color: '#B34040',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
});
