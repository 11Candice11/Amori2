/**
 * HiddenNumberScreen — "Spot the Hidden Number/Object".
 *
 * Two ways to play:
 *   1. Couple puzzles — image puzzles one partner hides for the other. Tap
 *      where you think the hidden thing is; a close-enough tap wins.
 *   2. Quick number round — a procedural fallback (a field of similar numbers
 *      with one odd target) always available, even with no couple puzzles yet.
 *
 * Partners can add their own image puzzles: provide an image URL, tap the
 * image to mark where the hidden object is, and write a prompt. Solving either
 * mode records a game session/score to the backend.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type LayoutRectangle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';

import { colors, spacing, typography } from '../../../shared/theme';
import { ScreenHeader, Button } from '../components/DistractionUI';
import { distractionService } from '../services/distractionService';
import { mediaService } from '../../../services/media/mediaService';
import { useDistractionCentre } from '../hooks/useDistractionCentre';
import type { HiddenObjectPuzzleResponse } from '../../../services/api/types';

type Mode = 'menu' | 'numbers' | 'puzzle' | 'create';

export function HiddenNumberScreen() {
  const navigation = useNavigation();
  const { games, hiddenPuzzles, loading, refresh } = useDistractionCentre();

  const [mode, setMode] = useState<Mode>('menu');
  const [activePuzzle, setActivePuzzle] =
    useState<HiddenObjectPuzzleResponse | null>(null);

  const hiddenGame = useMemo(
    () => games.find(g => g.type === 'HiddenNumber' || /hidden|number|spot/i.test(g.title)),
    [games],
  );

  const recordWin = useCallback(
    (score: number) => {
      if (hiddenGame) {
        distractionService.recordPlay(hiddenGame.id, score).then(() => refresh());
      }
    },
    [hiddenGame, refresh],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScreenHeader
        eyebrow="Gentle focus"
        title="Spot the Hidden Thing"
        onBack={() => {
          if (mode === 'menu') navigation.goBack();
          else {
            setMode('menu');
            setActivePuzzle(null);
          }
        }}
      />

      {mode === 'menu' ? (
        <MenuView
          loading={loading}
          puzzles={hiddenPuzzles}
          onPlayNumbers={() => setMode('numbers')}
          onPlayPuzzle={p => {
            setActivePuzzle(p);
            setMode('puzzle');
          }}
          onCreate={() => setMode('create')}
        />
      ) : mode === 'numbers' ? (
        <NumberRound onWin={recordWin} />
      ) : mode === 'puzzle' && activePuzzle ? (
        <PuzzlePlayer
          puzzle={activePuzzle}
          onWin={recordWin}
          onBack={() => {
            setMode('menu');
            setActivePuzzle(null);
          }}
        />
      ) : mode === 'create' ? (
        <PuzzleCreator
          onDone={() => {
            setMode('menu');
            refresh();
          }}
          onCancel={() => setMode('menu')}
        />
      ) : null}
    </SafeAreaView>
  );
}

// ─── Menu ──────────────────────────────────────────────────────────────────

function MenuView({
  loading,
  puzzles,
  onPlayNumbers,
  onPlayPuzzle,
  onCreate,
}: {
  loading: boolean;
  puzzles: HiddenObjectPuzzleResponse[];
  onPlayNumbers: () => void;
  onPlayPuzzle: (p: HiddenObjectPuzzleResponse) => void;
  onCreate: () => void;
}) {
  return (
    <ScrollView contentContainerStyle={styles.body}>
      <Text style={styles.intro}>
        Give a racing mind something small to hold. Play a quick round, or find
        the thing your partner hid for you.
      </Text>

      <Pressable
        style={styles.menuCard}
        onPress={onPlayNumbers}
        accessibilityRole="button"
        accessibilityLabel="Play a quick number round"
      >
        <Text style={styles.menuTitle}>Quick number round</Text>
        <Text style={styles.menuBody}>
          Find the odd number out in a calm field of digits.
        </Text>
      </Pressable>

      <View style={styles.sectionHead}>
        <Text style={styles.sectionLabel}>Puzzles from the two of you</Text>
        <Pressable
          onPress={onCreate}
          accessibilityRole="button"
          accessibilityLabel="Hide something for your partner"
        >
          <Text style={styles.addLink}>+ Hide one</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.gold} style={{ marginTop: spacing.md }} />
      ) : puzzles.length === 0 ? (
        <Text style={styles.emptySmall}>
          No hidden puzzles yet. Tap “Hide one” to make the first for your
          partner.
        </Text>
      ) : (
        puzzles.map(p => (
          <Pressable
            key={p.id}
            style={styles.puzzleRow}
            onPress={() => onPlayPuzzle(p)}
            accessibilityRole="button"
            accessibilityLabel={`Play puzzle: ${p.prompt}`}
          >
            <Image source={{ uri: p.imageUrl }} style={styles.puzzleThumb} />
            <View style={styles.puzzleMeta}>
              <Text style={styles.puzzlePrompt}>Find {p.prompt}</Text>
              <Text style={styles.puzzleAuthor}>
                {p.isMine
                  ? 'You hid this — tap to preview'
                  : `Hidden by ${p.createdByName ?? 'your partner'}`}
              </Text>
            </View>
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}

// ─── Number round (procedural fallback) ──────────────────────────────────────

const COLS = 6;
const ROWS = 8;
const CELL_COUNT = COLS * ROWS;

interface Round {
  base: number;
  target: number;
  targetIndex: number;
}

function makeRound(): Round {
  const base = Math.floor(Math.random() * 8) + 1; // 1–8
  const target = base === 9 ? 8 : base + 1;
  const targetIndex = Math.floor(Math.random() * CELL_COUNT);
  return { base, target, targetIndex };
}

function NumberRound({ onWin }: { onWin: (score: number) => void }) {
  const [round, setRound] = useState<Round>(() => makeRound());
  const [found, setFound] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const startRef = useRef<number>(Date.now());

  useEffect(() => {
    startRef.current = Date.now();
  }, [round]);

  const onPick = (index: number) => {
    if (found || index !== round.targetIndex) return;
    const elapsedMs = Date.now() - startRef.current;
    const roundScore = Math.max(100, Math.round(1000 - elapsedMs / 10));
    setScore(roundScore);
    setFound(true);
    onWin(roundScore);
  };

  const nextRound = () => {
    setFound(false);
    setScore(null);
    setRound(makeRound());
  };

  return (
    <View style={styles.body}>
      <Text style={styles.prompt}>
        Find the <Text style={styles.promptTarget}>{round.target}</Text> hidden
        among the {round.base}s.
      </Text>

      <View style={styles.grid}>
        {Array.from({ length: CELL_COUNT }).map((_, i) => {
          const isTarget = i === round.targetIndex;
          const value = isTarget ? round.target : round.base;
          const revealed = found && isTarget;
          return (
            <Pressable
              key={i}
              style={styles.cell}
              onPress={() => onPick(i)}
              accessibilityRole="button"
              accessibilityLabel={isTarget ? 'Hidden number' : `Number ${value}`}
            >
              <Text style={[styles.cellText, revealed && styles.cellTextFound]}>
                {value}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {found ? (
        <View style={styles.result}>
          <Text style={styles.resultTitle}>Found it — nicely spotted.</Text>
          {score != null ? <Text style={styles.resultScore}>+{score}</Text> : null}
          <Button label="Another round" onPress={nextRound} />
        </View>
      ) : (
        <Text style={styles.hint}>Take your time. Let your eyes drift.</Text>
      )}
    </View>
  );
}

// ─── Image puzzle player ─────────────────────────────────────────────────────

function PuzzlePlayer({
  puzzle,
  onWin,
  onBack,
}: {
  puzzle: HiddenObjectPuzzleResponse;
  onWin: (score: number) => void;
  onBack: () => void;
}) {
  const [frame, setFrame] = useState<LayoutRectangle | null>(null);
  const [found, setFound] = useState(false);
  const [misses, setMisses] = useState(0);
  const [tap, setTap] = useState<{ x: number; y: number } | null>(null);
  const startRef = useRef<number>(Date.now());

  const handleTap = (e: { nativeEvent: { locationX: number; locationY: number } }) => {
    if (found || !frame || puzzle.isMine) return;
    const nx = e.nativeEvent.locationX / frame.width;
    const ny = e.nativeEvent.locationY / frame.height;
    setTap({ x: nx, y: ny });

    const dist = Math.hypot(nx - puzzle.targetX, ny - puzzle.targetY);
    if (dist <= puzzle.targetRadius) {
      setFound(true);
      const elapsedMs = Date.now() - startRef.current;
      const score = Math.max(100, Math.round(1000 - elapsedMs / 20 - misses * 50));
      onWin(score);
    } else {
      setMisses(m => m + 1);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.body}>
      <Text style={styles.prompt}>Find {puzzle.prompt}</Text>

      <Pressable
        onPress={handleTap}
        onLayout={e => setFrame(e.nativeEvent.layout)}
        style={styles.puzzleImageWrap}
        accessibilityRole="imagebutton"
        accessibilityLabel={`Tap where you see ${puzzle.prompt}`}
      >
        <Image source={{ uri: puzzle.imageUrl }} style={styles.puzzleImage} />

        {/* Show the answer marker to the author (preview), or after a win. */}
        {(puzzle.isMine || found) && frame ? (
          <View
            style={[
              styles.targetMarker,
              {
                left: puzzle.targetX * frame.width - 16,
                top: puzzle.targetY * frame.height - 16,
              },
            ]}
          />
        ) : null}

        {/* Show the last tap for feedback. */}
        {tap && !found && frame ? (
          <View
            style={[
              styles.missMarker,
              { left: tap.x * frame.width - 10, top: tap.y * frame.height - 10 },
            ]}
          />
        ) : null}
      </Pressable>

      {puzzle.isMine ? (
        <Text style={styles.hint}>
          This is your puzzle — the marker shows where you hid it.
        </Text>
      ) : found ? (
        <View style={styles.result}>
          <Text style={styles.resultTitle}>You found it.</Text>
          <Text style={styles.hint}>
            {misses === 0 ? 'First try — sharp eyes.' : `After ${misses} look${misses === 1 ? '' : 's'}.`}
          </Text>
        </View>
      ) : (
        <Text style={styles.hint}>
          Tap the image where you think it's hiding.
          {misses > 0 ? `  ${misses} miss${misses === 1 ? '' : 'es'} so far.` : ''}
        </Text>
      )}

      <Button label="Back to puzzles" variant="secondary" onPress={onBack} />
    </ScrollView>
  );
}

// ─── Image puzzle creator ────────────────────────────────────────────────────

function PuzzleCreator({
  onDone,
  onCancel,
}: {
  onDone: () => void;
  onCancel: () => void;
}) {
  const [prompt, setPrompt] = useState('');
  // The uploaded image: preview URL for display + storage key for saving.
  const [image, setImage] = useState<{ url: string; fileKey: string } | null>(null);
  const [target, setTarget] = useState<{ x: number; y: number } | null>(null);
  const [frame, setFrame] = useState<LayoutRectangle | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickImage = async () => {
    setError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Photo access is needed to choose an image.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
    });
    if (result.canceled || result.assets.length === 0) return;

    const asset = result.assets[0];
    setUploading(true);
    setTarget(null); // reset target for the new image
    try {
      const uploaded = await mediaService.uploadImage({
        uri: asset.uri,
        type: asset.mimeType ?? 'image/jpeg',
        name: asset.fileName ?? `puzzle-${Date.now()}.jpg`,
      });
      setImage({ url: uploaded.url, fileKey: uploaded.fileKey });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not upload the image.');
    } finally {
      setUploading(false);
    }
  };

  const placeTarget = (e: {
    nativeEvent: { locationX: number; locationY: number };
  }) => {
    if (!frame) return;
    setTarget({
      x: e.nativeEvent.locationX / frame.width,
      y: e.nativeEvent.locationY / frame.height,
    });
  };

  const save = async () => {
    if (!image) return setError('Choose a photo first.');
    if (!prompt.trim()) return setError('Say what your partner should find.');
    if (!target) return setError('Tap the image to mark the hidden spot.');

    setSaving(true);
    setError(null);
    try {
      await distractionService.createHiddenObjectPuzzle({
        imageFileKey: image.fileKey,
        prompt: prompt.trim(),
        targetX: target.x,
        targetY: target.y,
      });
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the puzzle.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.body}>
      <Text style={styles.intro}>
        Hide something for your partner to find. Choose a photo, tell them what
        to look for, then tap the image to mark where it's hiding.
      </Text>

      <Button
        label={
          uploading
            ? 'Uploading…'
            : image
            ? 'Choose a different photo'
            : 'Choose a photo'
        }
        variant="secondary"
        onPress={pickImage}
        disabled={uploading}
        style={{ alignSelf: 'stretch' }}
      />

      <Text style={[styles.label, { marginTop: spacing.md }]}>
        What should they find?
      </Text>
      <TextInput
        style={styles.input}
        value={prompt}
        onChangeText={setPrompt}
        placeholder="e.g. the tiny heart in the trees"
        placeholderTextColor={colors.neutralSubtle}
      />

      {image ? (
        <>
          <Text style={[styles.label, { marginTop: spacing.md }]}>
            Tap to mark the hidden spot
          </Text>
          <Pressable
            onPress={placeTarget}
            onLayout={e => setFrame(e.nativeEvent.layout)}
            style={styles.puzzleImageWrap}
            accessibilityRole="imagebutton"
            accessibilityLabel="Tap to place the hidden target"
          >
            <Image source={{ uri: image.url }} style={styles.puzzleImage} />
            {target && frame ? (
              <View
                style={[
                  styles.targetMarker,
                  {
                    left: target.x * frame.width - 16,
                    top: target.y * frame.height - 16,
                  },
                ]}
              />
            ) : null}
          </Pressable>
        </>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.composerActions}>
        <Button
          label="Cancel"
          variant="secondary"
          onPress={onCancel}
          style={styles.composerBtn}
        />
        <Button
          label={saving ? 'Hiding…' : 'Hide it'}
          onPress={save}
          disabled={saving}
          style={styles.composerBtn}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  body: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl, alignItems: 'center' },
  intro: {
    ...typography.body,
    color: colors.neutralMuted,
    marginBottom: spacing.md,
    alignSelf: 'stretch',
  },
  // Menu
  menuCard: {
    alignSelf: 'stretch',
    backgroundColor: colors.surfaceCard,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
  },
  menuTitle: { ...typography.headlineSm, color: colors.neutral, fontSize: 18 },
  menuBody: { ...typography.bodySm, color: colors.neutralMuted, marginTop: 4 },
  sectionHead: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionLabel: { ...typography.label, color: colors.gold },
  addLink: { ...typography.bodySemiBold, color: colors.gold, fontSize: 14 },
  emptySmall: {
    ...typography.bodySm,
    color: colors.neutralMuted,
    alignSelf: 'stretch',
  },
  puzzleRow: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.surfaceCard,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    alignItems: 'center',
  },
  puzzleThumb: { width: 56, height: 56, borderRadius: 10, backgroundColor: colors.surface },
  puzzleMeta: { flex: 1 },
  puzzlePrompt: { ...typography.bodySemiBold, color: colors.neutral },
  puzzleAuthor: { ...typography.bodySm, color: colors.neutralSubtle, marginTop: 2 },
  // Number round
  prompt: {
    ...typography.body,
    color: colors.neutralMuted,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  promptTarget: { color: colors.gold, fontFamily: 'Manrope-SemiBold' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', maxWidth: 360 },
  cell: {
    width: `${100 / COLS}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellText: { ...typography.body, color: 'rgba(253,252,240,0.55)', fontSize: 20 },
  cellTextFound: { color: colors.gold, fontFamily: 'Manrope-SemiBold', fontSize: 24 },
  hint: {
    ...typography.bodySm,
    color: colors.neutralMuted,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  result: { alignItems: 'center', marginTop: spacing.lg, gap: spacing.sm },
  resultTitle: { ...typography.headlineSm, color: colors.neutral },
  resultScore: { ...typography.headline, color: colors.gold },
  // Image puzzle
  puzzleImageWrap: {
    alignSelf: 'stretch',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    marginTop: spacing.xs,
  },
  puzzleImage: { width: '100%', aspectRatio: 1, backgroundColor: colors.surfaceCard },
  targetMarker: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: colors.gold,
    backgroundColor: 'rgba(197,163,101,0.25)',
  },
  missMarker: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.emergency,
  },
  // Creator inputs
  label: { ...typography.label, color: colors.gold, alignSelf: 'stretch' },
  input: {
    ...typography.body,
    color: colors.neutral,
    alignSelf: 'stretch',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(253,252,240,0.04)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },
  error: {
    ...typography.bodySm,
    color: colors.emergency,
    marginTop: spacing.sm,
    alignSelf: 'stretch',
  },
  composerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    alignSelf: 'stretch',
  },
  composerBtn: { flex: 1 },
});
