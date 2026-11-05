/**
 * CardStackViewer — opens a stack of saved gifts as a deck you can shuffle through.
 *
 * The same card art can be drawn on several days, each time wrapping a
 * different memory or vision, so the deck view shows those gifts as a pile.
 *
 * Opening: the whole pile travels from where it sits in the grid to the centre
 * of the screen, growing as it goes (with a little overshoot), then the top
 * card turns face up. Closing plays it backwards: the card turns back to its
 * art and the deck shrinks into the pile.
 *
 * Browsing: the cards sit in a fanned deck. The top card is face up (a
 * "Memory" / "Vision" heading, the title, notes, photos, the location map and
 * so on, in a vertically scrolling body); the others show their card art
 * peeking out to either side. Swiping shuffles the deck: the top card is tossed
 * out to the side and turns over, and half way through it drops behind the deck
 * and tucks in while the next card is lifted to the top. Swiping back reverses
 * it, pulling a card out of the deck onto the top.
 *
 * All of the motion is driven by the list's scroll position, so it follows your
 * finger and can be dragged part way and let go. The list still does the
 * scrolling and snapping; each card is just pinned to the middle of the screen
 * and moved by an interpolation of the scroll offset. Only the stacking order
 * can't be animated, so it is switched in JS when a card passes the half way
 * point — the moment it goes behind.
 *
 * `origin` is where the pile sits on screen (window coordinates). It only
 * drives the grow/shrink animation, so a missing origin just grows from the
 * centre. Built on the built-in Animated API, like FlipRevealModal, and follows
 * the same lifecycle: `onClose` fires only after the closing animation ends, so
 * the parent's `visible` state resets in step with the cards leaving.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  Easing,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing, typography } from '../../../shared/theme';
import { getCardImage } from '../../../utils/cardSelector';
import { formatRelativeDate, formatShortDate } from '../../../utils/dateUtils';
import { MemoryMediaView } from '../../memories/components/MemoryMediaView';
import type { SavedGift } from '../types/vault.types';

/** Where the tapped pile sits on screen, in window coordinates. */
export type StackOrigin = { x: number; y: number; width: number; height: number };

type CardStackViewerProps = {
  visible: boolean;
  /** Gifts in the stack, in the order they should be swiped through. */
  gifts: SavedGift[];
  origin: StackOrigin | null;
  /** Fired once the closing animation has finished. */
  onClose: () => void;
};

// Opening: the deck grows into place, and the top card turns over partway through.
const GROW_MS = 520;
const REVEAL_DELAY_MS = 340;
const REVEAL_MS = 520;
// Closing: the card turns back to its art, then the deck shrinks into the pile.
const UNREVEAL_MS = 340;
const SHRINK_DELAY_MS = 220;
const SHRINK_MS = 340;
/** Vertical room kept free below the cards for the dots, counter and Done button. */
const CHROME_HEIGHT = 150;
/** Spare room above and below the cards so a tossed, tilted card isn't clipped by the list. */
const SWING_PAD = 32;
/** Start scale when there's no origin to grow from. */
const FALLBACK_START_SCALE = 0.42;
/** Perspective for the turn, matching FlipRevealModal. */
const PERSPECTIVE = 1200;
/** How fanned out the deck is as it arrives (1 = fully fanned). A little keeps the pile's layered look. */
const FAN_MIN = 0.12;

// How the deck is laid out, as fractions of the card width.
/** How far the next/previous card's centre sits from the top card's, tucked behind it. */
const PEEK = 0.26;
/** The card behind that, peeking out a little further. */
const PEEK_FAR = 0.31;
/** How far out to the side a card is tossed on its way behind the deck (far enough to read as lifted off, near enough to stay on screen). */
const TOSS = 0.66;

/**
 * Slot offsets we describe the motion at, measured in cards from the centre
 * (0 = the top card, 1 = the next card waiting on the right, -1 = the card just
 * shuffled to the left). Listed in descending order so that, as a card's input
 * to the interpolation, the scroll offsets they map to ascend.
 */
const SLOTS = [3, 2, 1, 0, -0.5, -1, -2, -3];

// Typed as a plain FlatList so item generics survive; Animated wraps the scroll event.
const AnimatedFlatList = Animated.createAnimatedComponent(FlatList) as unknown as typeof FlatList;

/**
 * The card currently on top. Cells read it to set their stacking order, which
 * (unlike everything else) can't be driven by the native animation.
 */
const ActiveIndexContext = createContext(0);

/** A constant 1, for adding to animated values. */
const ONE = new Animated.Value(1);

type DeckCellProps = {
  index: number;
  style?: StyleProp<ViewStyle>;
  onLayout?: (e: LayoutChangeEvent) => void;
  children?: React.ReactNode;
};

/** Each card's slot in the list: the nearer to the top card, the higher it is stacked. */
function DeckCell({ index, style, onLayout, children }: DeckCellProps) {
  const active = useContext(ActiveIndexContext);
  return (
    <View style={[style, { zIndex: 1000 - Math.abs(index - active) }]} onLayout={onLayout}>
      {children}
    </View>
  );
}

function hasCoordinates(gift: SavedGift): boolean {
  const { latitude, longitude } = gift;
  return latitude != null && longitude != null && !isNaN(latitude) && !isNaN(longitude);
}

type GiftPageProps = {
  gift: SavedGift;
  index: number;
  /** The page currently on top. Only it is interactive and readable by screen readers. */
  active: boolean;
  /** The top page or one of its neighbours; heavy media is only mounted for these. */
  nearActive: boolean;
  scrollX: Animated.Value;
  /** 0 → 1 as the deck travels to the centre and grows (and back on closing). */
  grow: Animated.Value;
  /** 0 → 1 as the top card turns face up on opening (and back on closing). */
  reveal: Animated.Value;
  itemWidth: number;
  cardWidth: number;
  cardHeight: number;
  gap: number;
};

function GiftPage({
  gift,
  index,
  active,
  nearActive,
  scrollX,
  grow,
  reveal,
  itemWidth,
  cardWidth,
  cardHeight,
  gap,
}: GiftPageProps) {
  const motion = useMemo(() => {
    const c = cardWidth;
    const peek = c * PEEK;
    const peekFar = c * PEEK_FAR;
    const toss = c * TOSS;

    // Where the card should be on screen (measured from the centre) at each slot.
    const screenX: Record<number, number> = {
      3: peekFar, 2: peekFar, 1: peek, 0: 0, [-0.5]: -toss, [-1]: -peek, [-2]: -peekFar, [-3]: -peekFar,
    };
    const tilt: Record<number, number> = {
      3: 9, 2: 9, 1: 6, 0: 0, [-0.5]: -14, [-1]: -6, [-2]: -9, [-3]: -9,
    };
    // Size relative to the top card.
    const shrink: Record<number, number> = {
      3: -0.22, 2: -0.2, 1: -0.1, 0: 0, [-0.5]: -0.04, [-1]: -0.1, [-2]: -0.2, [-3]: -0.22,
    };
    // Cards three deep fade out so they never pop in or out as the list recycles them.
    const fade: Record<number, number> = {
      3: 0, 2: 0.75, 1: 1, 0: 1, [-0.5]: 1, [-1]: 1, [-2]: 0.75, [-3]: 0,
    };

    // This card sits `s` slots from the centre when the scroll offset is (index - s) slots.
    const inputRange = SLOTS.map((s) => (index - s) * itemWidth);
    const atSlot = (table: Record<number, number>) =>
      scrollX.interpolate({
        inputRange,
        outputRange: SLOTS.map((s) => table[s]),
        extrapolate: 'clamp',
      });

    // 0 while the deck is still a tight pile, 1 once it has fanned out.
    const fan = grow.interpolate({
      inputRange: [0.5, 1],
      outputRange: [FAN_MIN, 1],
      extrapolate: 'clamp',
    });

    // The list lays cards out in a row; this cancels the card's slot so it sits on
    // the centre, and the fanned offset for its place in the deck is added on top.
    const pinToCentre = scrollX.interpolate({
      inputRange: [0, 1],
      outputRange: [-index * itemWidth, 1 - index * itemWidth],
    });
    const translateX = Animated.add(pinToCentre, Animated.multiply(atSlot(screenX), fan));
    const rotate = Animated.multiply(atSlot(tilt), fan).interpolate({
      inputRange: [-30, 30],
      outputRange: ['-30deg', '30deg'],
    });
    const scale = Animated.add(ONE, Animated.multiply(atSlot(shrink), fan));
    const opacity = atSlot(fade);

    // Face turn, in degrees. The art face is up at 0° and 360°; the content face
    // (turned 180° to start with) is up at 180°, i.e. when the card is on top.
    const turnRange = [(index - 1) * itemWidth, index * itemWidth, (index + 1) * itemWidth];
    const turn = (from: number) =>
      scrollX.interpolate({
        inputRange: turnRange,
        outputRange: [from, from + 180, from + 360],
        extrapolate: 'clamp',
      });
    // On opening/closing the top card — and only it — starts on its art face.
    const onTop = scrollX.interpolate({
      inputRange: turnRange,
      outputRange: [0, 1, 0],
      extrapolate: 'clamp',
    });
    const intro = Animated.multiply(
      onTop,
      reveal.interpolate({ inputRange: [0, 1], outputRange: [-180, 0] }),
    );
    const toDegrees = (deg: Animated.AnimatedAddition<number>) =>
      deg.interpolate({ inputRange: [-360, 720], outputRange: ['-360deg', '720deg'] });

    return {
      translateX,
      rotate,
      scale,
      opacity,
      artTurn: toDegrees(Animated.add(turn(0), intro)),
      contentTurn: toDegrees(Animated.add(turn(180), intro)),
    };
  }, [scrollX, grow, reveal, index, itemWidth, cardWidth]);

  const kind = gift.visionBoardItemId ? 'Vision' : 'Memory';
  const memoryDate = formatShortDate(gift.memoryDateTime);
  const saved = formatRelativeDate(gift.savedAt);
  const savedLine = [
    saved ? `Saved ${saved}` : null,
    gift.createdByName ? `by ${gift.createdByName}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const coords = hasCoordinates(gift);
  const media = gift.media ?? [];
  const hasMedia = media.length > 0 || coords;

  return (
    <Animated.View
      style={{
        width: cardWidth,
        height: cardHeight,
        marginHorizontal: gap / 2,
        opacity: motion.opacity,
        transform: [
          { translateX: motion.translateX },
          { rotate: motion.rotate },
          { scale: motion.scale },
        ],
      }}
      accessibilityElementsHidden={!active}
      importantForAccessibility={active ? 'auto' : 'no-hide-descendants'}
    >
      {/* Card art — what you see while the card is in the deck or being shuffled. */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.face,
          { transform: [{ perspective: PERSPECTIVE }, { rotateY: motion.artTurn }] },
        ]}
      >
        <Image source={getCardImage(gift.cardNumber)} style={styles.art} resizeMode="contain" />
      </Animated.View>

      {/* The gift — face up once the card is on top. */}
      <Animated.View
        pointerEvents={active ? 'auto' : 'none'}
        style={[
          styles.face,
          { transform: [{ perspective: PERSPECTIVE }, { rotateY: motion.contentTurn }] },
        ]}
      >
        <ScrollView
          style={styles.fill}
          nestedScrollEnabled
          directionalLockEnabled
          showsVerticalScrollIndicator
          indicatorStyle="white"
          contentContainerStyle={styles.pageContent}
        >
          <Text style={styles.kind} accessibilityRole="header">
            {kind}
          </Text>
          <View style={styles.rule} />

          <Text style={styles.title}>{gift.title}</Text>
          {memoryDate ? <Text style={styles.date}>{memoryDate}</Text> : null}
          {savedLine ? <Text style={styles.savedLine}>{savedLine}</Text> : null}

          {gift.description ? <Text style={styles.body}>{gift.description}</Text> : null}

          {/* A location with no pin to draw still gets shown as text. */}
          {gift.location && !coords ? (
            <Text style={styles.locationText}>📍 {gift.location}</Text>
          ) : null}

          {hasMedia && nearActive ? (
            <View style={styles.mediaBlock}>
              <MemoryMediaView
                media={media}
                latitude={gift.latitude}
                longitude={gift.longitude}
                locationLabel={gift.location}
                photoHeight={200}
              />
            </View>
          ) : null}
        </ScrollView>
      </Animated.View>
    </Animated.View>
  );
}

export function CardStackViewer({ visible, gifts, origin, onClose }: CardStackViewerProps) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // 0 = the deck is back in its pile in the grid, 1 = in place at the centre of the screen.
  const grow = useRef(new Animated.Value(0)).current;
  // 0 = the top card shows its art, 1 = turned face up.
  const reveal = useRef(new Animated.Value(0)).current;
  const scrollX = useRef(new Animated.Value(0)).current;
  const running = useRef<Animated.CompositeAnimation | null>(null);
  const closing = useRef(false);
  // Keep the Modal mounted through the closing animation.
  const [mounted, setMounted] = useState(visible);
  // Swiping waits until the deck has settled, so a drag can't fight the opening animation.
  const [ready, setReady] = useState(false);
  const [index, setIndex] = useState(0);

  // The cards live in the band between the status bar and the controls below.
  const stageTop = insets.top;
  const stageBottom = height - CHROME_HEIGHT - insets.bottom;
  const stageHeight = Math.max(stageBottom - stageTop, 0);
  const stageCenterY = stageTop + stageHeight / 2;

  // Narrow enough that the cards behind the top one peek out either side.
  const cardWidth = Math.min(width * 0.7, 310);
  const cardHeight = Math.max(
    Math.min(stageHeight - SWING_PAD * 2, cardWidth * 1.75),
    220,
  );
  const gap = spacing.sm;
  const itemWidth = cardWidth + gap;
  // Padding that centres the first and last card.
  const sidePadding = (width - cardWidth) / 2 - gap / 2;

  const animateOpen = useCallback(() => {
    closing.current = false;
    grow.setValue(0);
    reveal.setValue(0);
    scrollX.setValue(0);
    const anim = Animated.parallel([
      // Out of the pile and up to size, overshooting a touch before settling.
      Animated.timing(grow, {
        toValue: 1,
        duration: GROW_MS,
        easing: Easing.out(Easing.back(1.1)),
        useNativeDriver: true,
      }),
      // Then the top card turns over.
      Animated.sequence([
        Animated.delay(REVEAL_DELAY_MS),
        Animated.timing(reveal, {
          toValue: 1,
          duration: REVEAL_MS,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]);
    running.current = anim;
    anim.start(({ finished }) => {
      if (finished) setReady(true);
    });
  }, [grow, reveal, scrollX]);

  const animateClose = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    setReady(false);
    // If it's closed mid-opening, carry on from wherever the cards are.
    running.current?.stop();
    const anim = Animated.parallel([
      Animated.timing(reveal, {
        toValue: 0,
        duration: UNREVEAL_MS,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(SHRINK_DELAY_MS),
        Animated.timing(grow, {
          toValue: 0,
          duration: SHRINK_MS,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]);
    running.current = anim;
    anim.start(({ finished }) => {
      if (finished) {
        setMounted(false);
        onClose();
      }
    });
  }, [grow, reveal, onClose]);

  useEffect(() => {
    if (visible) {
      setIndex(0);
      setReady(false);
      setMounted(true);
      // Wait for the Modal to mount before animating, or the grow can be dropped.
      requestAnimationFrame(() => animateOpen());
    } else if (mounted) {
      animateClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const clampIndex = useCallback(
    (offsetX: number) =>
      Math.min(Math.max(Math.round(offsetX / itemWidth), 0), Math.max(gifts.length - 1, 0)),
    [itemWidth, gifts.length],
  );

  // The top card changes as soon as a card passes half way, which is when it goes behind the deck.
  const onScroll = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
        useNativeDriver: true,
        listener: (e: NativeSyntheticEvent<NativeScrollEvent>) => {
          const next = clampIndex(e.nativeEvent.contentOffset.x);
          setIndex((prev) => (prev === next ? prev : next));
        },
      }),
    [scrollX, clampIndex],
  );

  const handleScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const next = clampIndex(e.nativeEvent.contentOffset.x);
      setIndex((prev) => (prev === next ? prev : next));
    },
    [clampIndex],
  );

  const keyExtractor = useCallback((item: SavedGift) => item.id, []);
  const getItemLayout = useCallback(
    (_: ArrayLike<SavedGift> | null | undefined, i: number) => ({
      length: itemWidth,
      offset: sidePadding + itemWidth * i,
      index: i,
    }),
    [itemWidth, sidePadding],
  );
  const renderPage = useCallback(
    ({ item, index: i }: { item: SavedGift; index: number }) => (
      <GiftPage
        gift={item}
        index={i}
        active={i === index}
        nearActive={Math.abs(i - index) <= 1}
        scrollX={scrollX}
        grow={grow}
        reveal={reveal}
        itemWidth={itemWidth}
        cardWidth={cardWidth}
        cardHeight={cardHeight}
        gap={gap}
      />
    ),
    [scrollX, grow, reveal, itemWidth, cardWidth, cardHeight, gap, index],
  );

  if (!mounted) return null;

  // Grow out of (and shrink back into) the pile: start at the pile's size and
  // position, end at full size in the centre of the stage. A failed measurement
  // (zero or non-finite size) falls back to growing from the centre.
  const usableOrigin =
    origin &&
    [origin.x, origin.y, origin.width, origin.height].every(Number.isFinite) &&
    origin.width > 0 &&
    origin.height > 0
      ? origin
      : null;
  const startScale = usableOrigin
    ? Math.min(Math.max(usableOrigin.width / cardWidth, 0.25), 1)
    : FALLBACK_START_SCALE;
  const startX = usableOrigin ? usableOrigin.x + usableOrigin.width / 2 - width / 2 : 0;
  const startY = usableOrigin ? usableOrigin.y + usableOrigin.height / 2 - stageCenterY : 0;

  // No clamp on the transform so the overshoot at the end of the grow is kept.
  const stageStyle = {
    opacity: grow.interpolate({
      inputRange: [0, 0.15, 1],
      outputRange: [0, 1, 1],
      extrapolate: 'clamp',
    }),
    transform: [
      { translateX: grow.interpolate({ inputRange: [0, 1], outputRange: [startX, 0] }) },
      { translateY: grow.interpolate({ inputRange: [0, 1], outputRange: [startY, 0] }) },
      { scale: grow.interpolate({ inputRange: [0, 1], outputRange: [startScale, 1] }) },
    ],
  };
  const backdropOpacity = grow.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const chromeOpacity = reveal;

  const total = gifts.length;

  return (
    <Modal
      visible
      transparent
      statusBarTranslucent
      animationType="none"
      onRequestClose={animateClose}
    >
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]} />
      {/* Tapping the dimmed area around the cards closes the viewer. */}
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={animateClose}
        accessibilityRole="button"
        accessibilityLabel="Close"
      />

      <Animated.View
        style={[styles.stage, { top: stageTop, height: stageHeight }, stageStyle]}
        pointerEvents="box-none"
      >
        <ActiveIndexContext.Provider value={index}>
          <AnimatedFlatList
            data={gifts}
            horizontal
            extraData={index}
            keyExtractor={keyExtractor}
            renderItem={renderPage}
            getItemLayout={getItemLayout}
            CellRendererComponent={DeckCell}
            initialNumToRender={7}
            windowSize={9}
            scrollEnabled={ready}
            showsHorizontalScrollIndicator={false}
            directionalLockEnabled
            snapToInterval={itemWidth}
            snapToAlignment="start"
            decelerationRate="fast"
            disableIntervalMomentum
            scrollEventThrottle={16}
            onScroll={onScroll}
            onMomentumScrollEnd={handleScrollEnd}
            contentContainerStyle={{
              paddingHorizontal: sidePadding,
              paddingVertical: SWING_PAD,
              alignItems: 'center',
            }}
            style={styles.list}
            accessibilityLabel="Saved gifts, swipe left or right to browse"
          />
        </ActiveIndexContext.Provider>
      </Animated.View>

      <Animated.View
        style={[styles.chrome, { paddingBottom: spacing.lg + insets.bottom, opacity: chromeOpacity }]}
        pointerEvents="box-none"
      >
        {total > 1 ? (
          <>
            <View style={styles.dots} accessibilityElementsHidden importantForAccessibility="no">
              {gifts.map((g, i) => (
                <View key={g.id} style={[styles.dot, i === index && styles.dotActive]} />
              ))}
            </View>
            <Text
              style={styles.counter}
              accessibilityLiveRegion="polite"
              accessibilityLabel={`Gift ${index + 1} of ${total}`}
            >
              {index + 1} of {total} · swipe to shuffle through them
            </Text>
          </>
        ) : null}
        <Pressable
          style={({ pressed }) => [styles.doneBtn, pressed && styles.pressed]}
          onPress={animateClose}
          accessibilityRole="button"
          accessibilityLabel="Done"
          android_ripple={{ color: 'rgba(10,20,15,0.2)' }}
        >
          <Text style={styles.doneBtnText}>Done</Text>
        </Pressable>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },
  fill: { flex: 1 },

  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(4, 9, 6, 0.92)',
  },

  stage: {
    position: 'absolute',
    left: 0,
    right: 0,
    justifyContent: 'center',
  },

  list: {
    flexGrow: 0,
  },

  // One side of a card. Both faces share the card's slot and hide whichever is turned away.
  face: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: colors.gold,
    backgroundColor: colors.surfaceCard,
    backfaceVisibility: 'hidden',
  },

  art: {
    width: '100%',
    height: '100%',
  },

  pageContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },

  kind: {
    ...typography.headlineSm,
    color: colors.gold,
    fontSize: 24,
    letterSpacing: 0.5,
    textAlign: 'center',
  },

  rule: {
    height: 1,
    alignSelf: 'center',
    width: 48,
    marginBottom: spacing.sm,
    backgroundColor: colors.gold,
    opacity: 0.6,
  },

  title: {
    ...typography.headlineSm,
    color: colors.neutral,
    textAlign: 'center',
  },

  date: {
    ...typography.bodySm,
    color: colors.neutralMuted,
    fontSize: 13,
    textAlign: 'center',
  },

  savedLine: {
    ...typography.bodySm,
    color: colors.neutralSubtle,
    fontSize: 11,
    textAlign: 'center',
  },

  body: {
    ...typography.body,
    color: colors.neutralMuted,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: spacing.xs,
  },

  locationText: {
    ...typography.bodySm,
    color: colors.neutralMuted,
    fontSize: 13,
    textAlign: 'center',
  },

  mediaBlock: {
    marginTop: spacing.sm,
  },

  chrome: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },

  dots: {
    flexDirection: 'row',
    alignSelf: 'center',
    gap: 6,
  },

  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.neutralSubtle,
    opacity: 0.5,
  },

  dotActive: {
    backgroundColor: colors.gold,
    opacity: 1,
  },

  counter: {
    ...typography.bodySm,
    color: colors.neutralSubtle,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },

  doneBtn: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.ctaBackground,
  },

  doneBtnText: {
    ...typography.bodySemiBold,
    color: colors.ctaText,
  },
});
