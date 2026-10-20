/**
 * CheckInStep2Screen — "Choose your specific mood"
 *
 * One large 2×2 canvas of colour quadrants, 30 moods each (5 columns × 6 rows):
 *
 *      Red    | Yellow
 *   ----------+----------
 *      Blue   | Green
 *
 * The viewport is zoomed so roughly 3 columns × 4 rows are visible at a time.
 * It opens on the quadrant chosen in step 1; the user drags in any direction
 * (left/right/up/down) to reach the neighbouring colours. Panning snaps to the
 * mood grid on release.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  LayoutChangeEvent,
  PanResponder,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  Vibration,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle } from 'react-native-svg';

import { colors, spacing, typography } from '../../../shared/theme';
import {
  MOOD_OPTIONS,
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
        stroke={SOFT_TEXT}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="12" cy="12" r="10" stroke={SOFT_TEXT} strokeWidth={1.5} />
    </Svg>
  );
}

// ─── Colours & canvas layout ──────────────────────────────────────────────────

const QUADRANT_COLORS: Record<MoodQuadrant, string> = {
  HIGH_UNPLEASANT: '#FF6B6B', // Red
  HIGH_PLEASANT: '#FFD93D',   // Yellow
  LOW_PLEASANT: '#6BCF9E',    // Green
  LOW_UNPLEASANT: '#6B9FFF',  // Blue
};

/**
 * Brighter text/accent colours for this screen. The theme's `neutral` is a dark
 * brown that reads as dim against the near-black background.
 */
const BRIGHT_TEXT = '#F3E9D2';
const SOFT_TEXT = '#CBBE9E';
const BRIGHT_GOLD = '#D9B26A';

function getMoodColor(mood: MoodOption): string {
  return QUADRANT_COLORS[mood.quadrant];
}

/** Each quadrant is 5 columns × 6 rows = 30 moods. */
const QUAD_COLS = 5;
const QUAD_ROWS = 6;

/** Where each colour sits on the 2×2 canvas (quadrant column/row). */
const QUADRANT_POSITION: Record<MoodQuadrant, { qCol: 0 | 1; qRow: 0 | 1 }> = {
  HIGH_UNPLEASANT: { qCol: 0, qRow: 0 }, // Red    – top left
  HIGH_PLEASANT: { qCol: 1, qRow: 0 },   // Yellow – top right
  LOW_UNPLEASANT: { qCol: 0, qRow: 1 },  // Blue   – bottom left
  LOW_PLEASANT: { qCol: 1, qRow: 1 },    // Green  – bottom right
};

const CANVAS_COLS = QUAD_COLS * 2; // 10
const CANVAS_ROWS = QUAD_ROWS * 2; // 12

/** Visible cells (the extra 0.25 lets the neighbouring colour peek in). */
const VIEW_COLS = 3;
const VIEW_ROWS = 4;
const PEEK = 0.25;

/** Furthest the viewport's top-left cell can go while staying on the canvas. */
const MAX_COL = CANVAS_COLS - VIEW_COLS; // 6
const MAX_ROW = CANVAS_ROWS - VIEW_ROWS; // 7

type PlacedMood = { mood: MoodOption; col: number; row: number };

/** Lay every mood out on the canvas grid once. */
const PLACED_MOODS: PlacedMood[] = (
  Object.keys(QUADRANT_POSITION) as MoodQuadrant[]
).flatMap((q) => {
  const { qCol, qRow } = QUADRANT_POSITION[q];
  return MOOD_OPTIONS.filter((m) => m.quadrant === q)
    .slice(0, QUAD_COLS * QUAD_ROWS)
    .map((mood, i) => ({
      mood,
      col: qCol * QUAD_COLS + (i % QUAD_COLS),
      row: qRow * QUAD_ROWS + Math.floor(i / QUAD_COLS),
    }));
});

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  quadrant: MoodQuadrant;
  onConfirm: (mood: MoodOption) => void;
  onIDontKnow: () => void;
  onBack: () => void;
  submitting?: boolean;
  error?: string | null;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function CheckInStep2Screen({
  quadrant,
  onConfirm,
  onIDontKnow,
  onBack,
  submitting = false,
  error = null,
}: Props) {
  const [selectedMoodId, setSelectedMoodId] = useState<string | null>(null);
  const [viewport, setViewport] = useState<{ w: number; h: number } | null>(null);

  // Size of one mood cell, derived from the space available for the grid.
  const cell = viewport
    ? Math.floor(
        Math.min(viewport.w / (VIEW_COLS + PEEK), viewport.h / (VIEW_ROWS + PEEK)),
      )
    : 0;

  // Pan state. `pan` is the canvas translation in px; `cellPos` is the snapped
  // top-left cell (col,row) so we can re-snap if the cell size changes.
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const panValue = useRef({ x: 0, y: 0 });
  const dragStart = useRef({ x: 0, y: 0 });
  const cellRef = useRef(0);
  cellRef.current = cell;

  useEffect(() => {
    const id = pan.addListener((v) => {
      panValue.current = v;
    });
    return () => pan.removeListener(id);
  }, [pan]);

  // Resting position as a snapped top-left cell, so a resize keeps the user's place.
  const cellPos = useRef<{ col: number; row: number } | null>(null);
  const focusedQuadrant = useRef<MoodQuadrant | null>(null);

  // Open focused on the quadrant picked in step 1 (only when it first appears or
  // changes). If the cell size merely changes, stay where the user is.
  useEffect(() => {
    if (!cell) return;
    if (focusedQuadrant.current !== quadrant || !cellPos.current) {
      const { qCol, qRow } = QUADRANT_POSITION[quadrant];
      cellPos.current = {
        col: clamp(qCol * QUAD_COLS, 0, MAX_COL),
        row: clamp(qRow * QUAD_ROWS, 0, MAX_ROW),
      };
      focusedQuadrant.current = quadrant;
    }
    pan.setValue({ x: -cellPos.current.col * cell, y: -cellPos.current.row * cell });
  }, [cell, quadrant, pan]);

  const panResponder = useRef(
    PanResponder.create({
      // Take over from the bubbles only once the finger actually moves.
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 6 || Math.abs(g.dy) > 6,
      onMoveShouldSetPanResponderCapture: (_e, g) =>
        Math.abs(g.dx) > 6 || Math.abs(g.dy) > 6,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        pan.stopAnimation();
        dragStart.current = { ...panValue.current };
      },
      onPanResponderMove: (_e, g) => {
        const c = cellRef.current;
        pan.setValue({
          x: clamp(dragStart.current.x + g.dx, -MAX_COL * c, 0),
          y: clamp(dragStart.current.y + g.dy, -MAX_ROW * c, 0),
        });
      },
      onPanResponderRelease: (_e, g) => {
        const c = cellRef.current;
        if (!c) return;
        // Project a little along the fling, then snap to the nearest cell.
        const projX = panValue.current.x + g.vx * 160;
        const projY = panValue.current.y + g.vy * 160;
        const col = clamp(Math.round(-projX / c), 0, MAX_COL);
        const row = clamp(Math.round(-projY / c), 0, MAX_ROW);
        cellPos.current = { col, row };
        Animated.spring(pan, {
          toValue: { x: -col * c, y: -row * c },
          useNativeDriver: false,
          friction: 9,
          tension: 60,
        }).start();
      },
    }),
  ).current;

  const selectedMood = selectedMoodId
    ? MOOD_OPTIONS.find((m) => m.id === selectedMoodId) ?? null
    : null;

  const handleBubbleSelect = useCallback((moodId: string) => {
    Vibration.vibrate(30);
    setSelectedMoodId(moodId);
  }, []);

  const handleConfirm = useCallback(() => {
    if (selectedMood) onConfirm(selectedMood);
  }, [selectedMood, onConfirm]);

  const onGridLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setViewport((prev) =>
      prev && prev.w === width && prev.h === height ? prev : { w: width, h: height },
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      <View style={styles.container}>
        {/* Header */}
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

        {/* Pannable mood canvas */}
        <View
          style={styles.gridViewport}
          onLayout={onGridLayout}
          accessibilityHint="Drag in any direction to see more moods"
          {...panResponder.panHandlers}
        >
          {cell > 0 && (
            <Animated.View
              style={[
                styles.canvas,
                {
                  width: CANVAS_COLS * cell,
                  height: CANVAS_ROWS * cell,
                  transform: [{ translateX: pan.x }, { translateY: pan.y }],
                },
              ]}
            >
              {PLACED_MOODS.map(({ mood, col, row }) => (
                <View
                  key={mood.id}
                  style={{
                    position: 'absolute',
                    left: col * cell,
                    top: row * cell,
                    width: cell,
                    height: cell,
                    padding: 3,
                    // Keep the enlarged, glowing bubble above its neighbours.
                    zIndex: selectedMoodId === mood.id ? 10 : 0,
                  }}
                >
                  <BubbleMood
                    mood={mood}
                    isSelected={selectedMoodId === mood.id}
                    onPress={() => handleBubbleSelect(mood.id)}
                  />
                </View>
              ))}
            </Animated.View>
          )}
        </View>

        {/* Description (fixed height so the grid doesn't resize on select) */}
        <View style={styles.descriptionContainer}>
          {selectedMood ? (
            <>
              <Text style={[styles.descriptionLabel, { color: getMoodColor(selectedMood) }]}>
                {selectedMood.label}
              </Text>
              <Text style={styles.descriptionSubtext}>{selectedMood.description}</Text>
            </>
          ) : (
            <Text style={styles.descriptionSubtext}>
              Drag to explore every colour, then tap a mood
            </Text>
          )}
        </View>

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

// ─── Bubble component ─────────────────────────────────────────────────────────

interface BubbleMoodProps {
  mood: MoodOption;
  isSelected: boolean;
  onPress: () => void;
}

const BubbleMood = React.memo(function BubbleMood({ mood, isSelected, onPress }: BubbleMoodProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: isSelected ? 1.12 : 1,
      useNativeDriver: true,
      friction: 5,
      tension: 40,
    }).start();
  }, [isSelected, scaleAnim]);

  const color = getMoodColor(mood);

  return (
    <Animated.View style={[styles.bubbleWrap, { transform: [{ scale: scaleAnim }] }]}>
      {isSelected && (
        <View
          pointerEvents="none"
          style={[
            styles.bubbleGlow,
            { backgroundColor: color, shadowColor: color },
          ]}
        />
      )}
      <Pressable
        onPress={onPress}
        style={[
          styles.bubble,
          { backgroundColor: color },
          isSelected && { shadowColor: color, shadowOpacity: 0.95, shadowRadius: 16, elevation: 12 },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`${mood.label}: ${mood.description}`}
        accessibilityState={{ selected: isSelected }}
      >
        <Text
          style={styles.bubbleText}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.5}
        >
          {mood.label}
        </Text>
        {isSelected && <View pointerEvents="none" style={styles.bubbleRing} />}
      </Pressable>
    </Animated.View>
  );
});

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
    paddingTop: spacing.lg,
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
    fontSize: 16,
    paddingHorizontal: spacing.lg,
  },

  // Canvas
  gridViewport: {
    flex: 1,
    overflow: 'hidden',
  },
  canvas: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  bubbleWrap: {
    flex: 1,
  },
  bubble: {
    flex: 1,
    borderRadius: 1000,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  bubbleText: {
    ...typography.bodySemiBold,
    fontSize: 15,
    color: '#0A140F',
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  bubbleGlow: {
    position: 'absolute',
    top: -5,
    left: -5,
    right: -5,
    bottom: -5,
    borderRadius: 1000,
    opacity: 0.4,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 18,
  },
  bubbleRing: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 1000,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },

  // Description — fixed height so selecting a mood never resizes the grid above.
  descriptionContainer: {
    height: 84,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(217,178,106,0.35)',
  },
  descriptionLabel: {
    ...typography.bodySemiBold,
    fontSize: 20,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  descriptionSubtext: {
    ...typography.body,
    fontSize: 15,
    color: BRIGHT_TEXT,
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

  // Buttons
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: 16,
    borderRadius: 50,
    backgroundColor: BRIGHT_GOLD,
    marginBottom: spacing.xs,
  },
  confirmButtonDisabled: {
    opacity: 0.45,
  },
  confirmButtonPressed: {
    opacity: 0.88,
  },
  confirmButtonText: {
    ...typography.bodySemiBold,
    color: colors.ctaText,
    fontSize: 15,
  },

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
    color: SOFT_TEXT,
  },
  error: {
    ...typography.bodySm,
    color: '#B34040',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
});
