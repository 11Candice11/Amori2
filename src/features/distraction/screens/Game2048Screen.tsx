/**
 * Game2048Screen — Amari 2048 ("Constellations"). Swipe (or use the arrow
 * pad) to slide and merge tiles. Client-side game; the final score is recorded
 * to the backend when the board locks up, via distractionService.recordPlay.
 */
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { colors, spacing, typography } from '../../../shared/theme';
import { ScreenHeader } from '../components/DistractionUI';
import { distractionService } from '../services/distractionService';
import { useDistractionCentre } from '../hooks/useDistractionCentre';
import {
  SIZE,
  canMove,
  move,
  newGame,
  spawnTile,
  type Board,
  type Direction,
} from '../utils/game2048';

const SWIPE_THRESHOLD = 20;

/** Tile colours keyed by value; higher tiles glow gold. */
function tileStyle(value: number) {
  if (value === 0) return { bg: 'rgba(253,252,240,0.04)', fg: 'transparent' };
  if (value <= 4) return { bg: 'rgba(167,210,182,0.18)', fg: colors.neutral };
  if (value <= 16) return { bg: 'rgba(167,210,182,0.30)', fg: colors.neutral };
  if (value <= 64) return { bg: 'rgba(197,163,101,0.35)', fg: colors.neutral };
  if (value <= 256) return { bg: 'rgba(197,163,101,0.55)', fg: colors.ctaText };
  return { bg: colors.gold, fg: colors.ctaText };
}

export function Game2048Screen() {
  const navigation = useNavigation();
  const { games, refresh } = useDistractionCentre();
  const { width } = useWindowDimensions();

  const [board, setBoard] = useState<Board>(() => newGame());
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const recordedRef = useRef(false);

  const gridSize = Math.min(width - spacing.md * 2, 360);
  const gap = spacing.sm;
  const cell = (gridSize - gap * (SIZE + 1)) / SIZE;

  const game2048 = useMemo(
    () => games.find(g => g.type === 'Game2048' || /2048/i.test(g.title)),
    [games],
  );

  const recordScore = useCallback(
    (finalScore: number) => {
      if (recordedRef.current || !game2048) return;
      recordedRef.current = true;
      distractionService.recordPlay(game2048.id, finalScore).then(() => refresh());
    },
    [game2048, refresh],
  );

  const applyMove = useCallback(
    (dir: Direction) => {
      if (gameOver) return;
      setBoard(prev => {
        const result = move(prev, dir);
        if (!result.moved) return prev;

        const withSpawn = spawnTile(result.board);
        setScore(s => {
          const next = s + result.gained;
          if (!canMove(withSpawn)) {
            setGameOver(true);
            recordScore(next);
          }
          return next;
        });
        return withSpawn;
      });
    },
    [gameOver, recordScore],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_e, g) =>
          Math.abs(g.dx) > SWIPE_THRESHOLD || Math.abs(g.dy) > SWIPE_THRESHOLD,
        onPanResponderRelease: (_e, g) => {
          if (Math.abs(g.dx) > Math.abs(g.dy)) {
            applyMove(g.dx > 0 ? 'right' : 'left');
          } else {
            applyMove(g.dy > 0 ? 'down' : 'up');
          }
        },
      }),
    [applyMove],
  );

  const restart = () => {
    recordedRef.current = false;
    setBoard(newGame());
    setScore(0);
    setGameOver(false);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScreenHeader
        eyebrow="Absorbing focus"
        title="Amari 2048"
        onBack={() => navigation.goBack()}
      />

      <View style={styles.body}>
        <View style={styles.scoreRow}>
          <Text style={styles.scoreLabel}>SCORE</Text>
          <Text style={styles.scoreValue}>{score}</Text>
        </View>

        <View
          style={[styles.grid, { width: gridSize, height: gridSize, padding: gap }]}
          {...panResponder.panHandlers}
        >
          {board.map((value, i) => {
            const t = tileStyle(value);
            return (
              <View
                key={i}
                style={[
                  styles.tile,
                  {
                    width: cell,
                    height: cell,
                    margin: gap / 2,
                    backgroundColor: t.bg,
                  },
                ]}
              >
                {value > 0 ? (
                  <Text
                    style={[
                      styles.tileText,
                      { color: t.fg, fontSize: value >= 1024 ? 20 : 26 },
                    ]}
                  >
                    {value}
                  </Text>
                ) : null}
              </View>
            );
          })}
        </View>

        {gameOver ? (
          <View style={styles.gameOver}>
            <Text style={styles.gameOverText}>No moves left</Text>
            <Text style={styles.gameOverScore}>Final score · {score}</Text>
          </View>
        ) : (
          <Text style={styles.hint}>Swipe to slide the tiles together.</Text>
        )}

        {/* Accessible arrow pad (also handy on emulators). */}
        <View style={styles.pad}>
          <ArrowBtn label="Up" onPress={() => applyMove('up')} glyph="↑" />
          <View style={styles.padRow}>
            <ArrowBtn label="Left" onPress={() => applyMove('left')} glyph="←" />
            <ArrowBtn label="Down" onPress={() => applyMove('down')} glyph="↓" />
            <ArrowBtn label="Right" onPress={() => applyMove('right')} glyph="→" />
          </View>
        </View>

        <Pressable
          style={styles.restartBtn}
          onPress={restart}
          accessibilityRole="button"
          accessibilityLabel="Start a new game"
        >
          <Text style={styles.restartText}>New game</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function ArrowBtn({
  label,
  glyph,
  onPress,
}: {
  label: string;
  glyph: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={styles.arrowBtn}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Move ${label}`}
      android_ripple={{ color: 'rgba(197,163,101,0.15)', borderless: true }}
    >
      <Text style={styles.arrowGlyph}>{glyph}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  body: { flex: 1, alignItems: 'center', paddingHorizontal: spacing.md },
  scoreRow: { alignItems: 'center', marginBottom: spacing.md },
  scoreLabel: { ...typography.label, color: colors.gold },
  scoreValue: { ...typography.headline, color: colors.neutral },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: colors.surfaceCard,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  tile: {
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileText: { fontFamily: 'Manrope-SemiBold' },
  hint: {
    ...typography.bodySm,
    color: colors.neutralMuted,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  gameOver: { alignItems: 'center', marginTop: spacing.md },
  gameOverText: { ...typography.headlineSm, color: colors.gold },
  gameOverScore: { ...typography.bodySm, color: colors.neutralMuted },
  pad: { alignItems: 'center', marginTop: spacing.lg, gap: spacing.sm },
  padRow: { flexDirection: 'row', gap: spacing.sm },
  arrowBtn: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceCard,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  arrowGlyph: { fontSize: 24, color: colors.neutral },
  restartBtn: {
    marginTop: spacing.lg,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    paddingHorizontal: spacing.xl,
  },
  restartText: { ...typography.bodySemiBold, color: colors.neutral },
});
