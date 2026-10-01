/**
 * HiddenNumberScreen — "Spot the Hidden Number".
 *
 * Two ways to play:
 *   1. Couple puzzles — one partner hides a number inside a photo; the other
 *      hunts for it. Tap the number to win.
 *   2. Quick number round — a procedural fallback (a field of similar numbers
 *      with one odd target) always available, even with no couple puzzles yet.
 *
 * Authoring a couple puzzle: choose a photo, choose the number to hide, then
 * tap the photo to place it. The number is drawn client-side at the stored
 * (0–1) target coordinates, so both partners see it in exactly the same spot.
 * Solving either mode records a game session/score to the backend.
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
import {
  launchImageLibrary,
  type ImageLibraryOptions,
  type ImagePickerResponse,
  type MediaType,
} from 'react-native-image-picker';

import { colors, spacing, typography } from '../../../shared/theme';
import { ScreenHeader, Button } from '../components/DistractionUI';
import { distractionService } from '../services/distractionService';
import { showSuccessOverlay } from '../../../shared/state/successOverlayStore';
import { showErrorOverlay } from '../../../shared/state/errorOverlayStore';
import { mediaService } from '../../../services/media/mediaService';
import { useDistractionCentre } from '../hooks/useDistractionCentre';
import type { HiddenObjectPuzzleResponse } from '../../../services/api/types';

type Mode = 'menu' | 'numbers' | 'puzzle' | 'create';

// ─── Hidden numbers ──────────────────────────────────────────────────────────
// A puzzle's `prompt` holds the hidden number (e.g. "47"). Older puzzles may
// still hold a free-text object, so read them defensively.

const NUMBER_PROMPT = /^\d{1,2}$/;

function hiddenNumberOf(puzzle: { prompt: string }): string | null {
  const trimmed = puzzle.prompt.trim();
  return NUMBER_PROMPT.test(trimmed) ? trimmed : null;
}

function puzzleLabel(puzzle: { prompt: string }): string {
  const number = hiddenNumberOf(puzzle);
  return number ? `Find the ${number}` : `Find ${puzzle.prompt}`;
}

/** A fresh two-digit number to hide (10–99 reads clearly at small sizes). */
function randomHiddenNumber(): string {
  return String(Math.floor(Math.random() * 90) + 10);
}

/**
 * The hidden number as it sits on the photo — small and softly translucent so
 * it blends in. Rendered identically for the author's preview and the solver,
 * so what you place is what they hunt for.
 */
function HiddenNumber({
  value,
  x,
  y,
  frame,
}: {
  value: string;
  x: number;
  y: number;
  frame: LayoutRectangle;
}) {
  const fontSize = Math.max(12, Math.round(frame.width * 0.05));
  const box = fontSize * 2.4;
  return (
    <View
      pointerEvents="none"
      style={[
        styles.hiddenNumberBox,
        {
          width: box,
          height: box,
          left: x * frame.width - box / 2,
          top: y * frame.height - box / 2,
        },
      ]}
    >
      <Text style={[styles.hiddenNumberText, { fontSize }]}>{value}</Text>
    </View>
  );
}

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
        the number your partner hid in a photo for you.
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
          accessibilityLabel="Hide a number for your partner"
        >
          <Text style={styles.addLink}>+ Hide a number</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.gold} style={{ marginTop: spacing.md }} />
      ) : puzzles.length === 0 ? (
        <Text style={styles.emptySmall}>
          No hidden numbers yet. Tap “Hide a number” to make the first for your
          partner.
        </Text>
      ) : (
        puzzles.map(p => (
          <Pressable
            key={p.id}
            style={styles.puzzleRow}
            onPress={() => onPlayPuzzle(p)}
            accessibilityRole="button"
            accessibilityLabel={`Play puzzle: ${puzzleLabel(p)}`}
          >
            <Image source={{ uri: p.imageUrl }} style={styles.puzzleThumb} />
            <View style={styles.puzzleMeta}>
              <Text style={styles.puzzlePrompt}>{puzzleLabel(p)}</Text>
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
    <ScrollView contentContainerStyle={styles.body}>
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
    </ScrollView>
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
  const [imageFailed, setImageFailed] = useState(false);
  const startRef = useRef<number>(Date.now());
  const hiddenNumber = hiddenNumberOf(puzzle);
  const label = puzzleLabel(puzzle);

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
      <Text style={styles.prompt}>
        {hiddenNumber ? (
          <>
            Find the <Text style={styles.promptTarget}>{hiddenNumber}</Text>{' '}
            hiding in the photo.
          </>
        ) : (
          label
        )}
      </Text>

      <Pressable
        onPress={handleTap}
        onLayout={e => setFrame(e.nativeEvent.layout)}
        style={styles.puzzleImageWrap}
        accessibilityRole="imagebutton"
        accessibilityLabel={`Tap where you see ${
          hiddenNumber ? `the number ${hiddenNumber}` : puzzle.prompt
        }`}
      >
        <Image
          source={{ uri: puzzle.imageUrl }}
          style={styles.puzzleImage}
          resizeMode="cover"
          onError={() => setImageFailed(true)}
        />

        {/* The hidden number itself — this is the thing to spot. */}
        {hiddenNumber && frame && !imageFailed ? (
          <HiddenNumber
            value={hiddenNumber}
            x={puzzle.targetX}
            y={puzzle.targetY}
            frame={frame}
          />
        ) : null}

        {/* Show the answer marker to the author (preview), or after a win. */}
        {(puzzle.isMine || found) && frame ? (
          <View
            pointerEvents="none"
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
            pointerEvents="none"
            style={[
              styles.missMarker,
              { left: tap.x * frame.width - 10, top: tap.y * frame.height - 10 },
            ]}
          />
        ) : null}
      </Pressable>

      {imageFailed ? (
        <Text style={styles.error}>
          That photo couldn't be loaded right now. Check your connection and try
          again.
        </Text>
      ) : null}

      {puzzle.isMine ? (
        <Text style={styles.hint}>
          This is your puzzle — the marker shows where you hid the{' '}
          {hiddenNumber ?? 'answer'}.
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
          Tap the {hiddenNumber ?? 'spot'} when you see it.
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
  const [hiddenNumber, setHiddenNumber] = useState(randomHiddenNumber);
  /**
   * The chosen photo. `previewUri` is the on-device file so the preview appears
   * the moment it's picked (no waiting on the upload, and no dependence on the
   * remote URL being reachable). `fileKey` arrives when the upload finishes and
   * is what gets persisted.
   */
  const [photo, setPhoto] = useState<{
    previewUri: string;
    fileKey: string | null;
  } | null>(null);
  const [target, setTarget] = useState<{ x: number; y: number } | null>(null);
  const [frame, setFrame] = useState<LayoutRectangle | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickImage = async () => {
    setError(null);

    const options: ImageLibraryOptions = {
      mediaType: 'photo' as MediaType,
      quality: 0.8,
      includeBase64: false,
    };

    launchImageLibrary(options, (response: ImagePickerResponse) => {
      if (response.didCancel || response.errorMessage) {
        if (response.errorMessage) {
          setError('Could not access photos: ' + response.errorMessage);
        }
        return;
      }

      const asset = response.assets?.[0];
      if (!asset?.uri) return;
      const previewUri = asset.uri;

      // Show it straight away; the upload catches up in the background.
      setPhoto({ previewUri, fileKey: null });
      setTarget(null); // reset target for the new image
      setUploading(true);

      mediaService.uploadImage({
        uri: previewUri,
        type: asset.type ?? 'image/jpeg',
        name: asset.fileName ?? `puzzle-${Date.now()}.jpg`,
      }).then(uploaded => {
        setPhoto({ previewUri, fileKey: uploaded.fileKey });
      }).catch(e => {
        setPhoto(null);
        setError(e instanceof Error ? e.message : 'Could not upload the image.');
      }).finally(() => {
        setUploading(false);
      });
    });
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
    if (!photo) return setError('Choose a photo first.');
    if (uploading || !photo.fileKey)
      return setError('Give the photo a moment to finish uploading.');
    if (!NUMBER_PROMPT.test(hiddenNumber))
      return setError('Pick a number between 0 and 99 to hide.');
    if (!target) return setError('Tap the photo to place the number.');

    setSaving(true);
    setError(null);
    try {
      await distractionService.createHiddenObjectPuzzle({
        imageFileKey: photo.fileKey,
        prompt: hiddenNumber,
        targetX: target.x,
        targetY: target.y,
      });
      showSuccessOverlay('Puzzle created');
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the puzzle.');
      showErrorOverlay("Couldn't create puzzle");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.body}>
      <Text style={styles.intro}>
        Hide a number for your partner to find. Choose a photo, pick the number,
        then tap the photo to tuck it somewhere quiet.
      </Text>

      <Button
        label={
          uploading
            ? 'Uploading…'
            : photo
            ? 'Choose a different photo'
            : 'Choose a photo'
        }
        variant="secondary"
        onPress={pickImage}
        disabled={uploading}
        style={{ alignSelf: 'stretch' }}
      />

      <View style={styles.numberRow}>
        <View style={styles.numberField}>
          <Text style={styles.label}>Number to hide</Text>
          <TextInput
            style={[styles.input, styles.numberInput]}
            value={hiddenNumber}
            onChangeText={t => setHiddenNumber(t.replace(/[^0-9]/g, '').slice(0, 2))}
            keyboardType="number-pad"
            maxLength={2}
            placeholder="42"
            placeholderTextColor={colors.neutralSubtle}
            accessibilityLabel="The number to hide, 0 to 99"
          />
        </View>
        <Pressable
          onPress={() => setHiddenNumber(randomHiddenNumber())}
          style={styles.shuffleBtn}
          accessibilityRole="button"
          accessibilityLabel="Pick a random number"
        >
          <Text style={styles.shuffleText}>Surprise me</Text>
        </Pressable>
      </View>

      {photo ? (
        <>
          <Text style={[styles.label, { marginTop: spacing.md }]}>
            Tap to place the {NUMBER_PROMPT.test(hiddenNumber) ? hiddenNumber : 'number'}
          </Text>
          <Pressable
            onPress={placeTarget}
            onLayout={e => setFrame(e.nativeEvent.layout)}
            style={styles.puzzleImageWrap}
            accessibilityRole="imagebutton"
            accessibilityLabel="Tap to place the hidden number"
          >
            <Image
              source={{ uri: photo.previewUri }}
              style={styles.puzzleImage}
              resizeMode="cover"
            />
            {target && frame ? (
              <>
                {NUMBER_PROMPT.test(hiddenNumber) ? (
                  <HiddenNumber
                    value={hiddenNumber}
                    x={target.x}
                    y={target.y}
                    frame={frame}
                  />
                ) : null}
                <View
                  pointerEvents="none"
                  style={[
                    styles.targetMarker,
                    {
                      left: target.x * frame.width - 16,
                      top: target.y * frame.height - 16,
                    },
                  ]}
                />
              </>
            ) : null}
          </Pressable>
          <Text style={styles.hint}>
            {target
              ? 'The ring is just for you — your partner only sees the number.'
              : 'Somewhere busy makes it a longer hunt.'}
          </Text>
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
          disabled={saving || uploading}
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
  hiddenNumberBox: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hiddenNumberText: {
    fontFamily: 'Manrope-SemiBold',
    color: 'rgba(253,252,240,0.85)',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
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
  numberRow: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  numberField: { width: 96 },
  numberInput: { textAlign: 'center', fontSize: 22, letterSpacing: 2 },
  shuffleBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shuffleText: { ...typography.bodySm, color: colors.gold },
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
