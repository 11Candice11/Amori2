/**
 * WheelPicker — a snapping scroll column, the building block for the time
 * picker's hour / minute / AM-PM wheels.
 *
 * Deliberately dependency-free: it's a plain `ScrollView` with
 * `snapToInterval`, so it works on iOS and Android with no native module and
 * no rebuild. The selected row sits in the vertical centre behind a
 * highlight band drawn by the parent.
 */
import React, { useCallback, useEffect, useRef } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { colors, typography } from '../../theme';

export const WHEEL_ITEM_HEIGHT = 40;
/** Must be odd so one row can sit dead centre. */
export const WHEEL_VISIBLE_ITEMS = 5;
export const WHEEL_HEIGHT = WHEEL_ITEM_HEIGHT * WHEEL_VISIBLE_ITEMS;

const EDGE_ITEMS = (WHEEL_VISIBLE_ITEMS - 1) / 2;

export type WheelItem = {
  label: string;
  value: number;
};

type WheelPickerProps = {
  items: WheelItem[];
  /** The currently selected item's `value`. */
  value: number;
  onChange: (value: number) => void;
  /** Fixed column width; omit to let it flex. */
  width?: number;
  accessibilityLabel?: string;
};

export function WheelPicker({
  items,
  value,
  onChange,
  width,
  accessibilityLabel,
}: WheelPickerProps) {
  const scrollRef = useRef<ScrollView>(null);
  /** Index we last scrolled to ourselves, so external syncs don't fight drags. */
  const settledIndex = useRef<number>(-1);

  const selectedIndex = Math.max(
    0,
    items.findIndex((i) => i.value === value),
  );

  // Keep the column parked on the selected row whenever the value changes from
  // the outside (initial mount, "Today" resets, clamping to a min/max).
  useEffect(() => {
    if (settledIndex.current === selectedIndex) return;
    settledIndex.current = selectedIndex;
    const y = selectedIndex * WHEEL_ITEM_HEIGHT;
    // rAF so the first scroll lands after layout on mount.
    const handle = requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y, animated: false });
    });
    return () => cancelAnimationFrame(handle);
  }, [selectedIndex]);

  const commitFromOffset = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const raw = e.nativeEvent.contentOffset.y / WHEEL_ITEM_HEIGHT;
      const index = Math.min(items.length - 1, Math.max(0, Math.round(raw)));
      settledIndex.current = index;
      const next = items[index];
      if (next && next.value !== value) onChange(next.value);
    },
    [items, onChange, value],
  );

  const handlePressItem = useCallback(
    (index: number) => {
      settledIndex.current = index;
      scrollRef.current?.scrollTo({ y: index * WHEEL_ITEM_HEIGHT, animated: true });
      const next = items[index];
      if (next && next.value !== value) onChange(next.value);
    },
    [items, onChange, value],
  );

  return (
    <View
      style={[styles.column, width !== undefined && { width }]}
      accessibilityLabel={accessibilityLabel}
    >
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={WHEEL_ITEM_HEIGHT}
        decelerationRate="fast"
        disableIntervalMomentum
        nestedScrollEnabled
        onMomentumScrollEnd={commitFromOffset}
        // Android often ends a slow drag without momentum; catch that too.
        onScrollEndDrag={commitFromOffset}
        contentContainerStyle={styles.contentContainer}
      >
        {items.map((item, index) => {
          const isSelected = index === selectedIndex;
          const distance = Math.abs(index - selectedIndex);
          return (
            <Pressable
              key={item.value}
              style={styles.item}
              onPress={() => handlePressItem(index)}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={item.label}
            >
              <Text
                style={[
                  styles.itemText,
                  isSelected && styles.itemTextSelected,
                  distance >= 2 && styles.itemTextFar,
                ]}
                numberOfLines={1}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

/**
 * The static highlight band the wheels scroll behind. Render it as an absolute
 * sibling of the columns, inside a container of `WHEEL_HEIGHT`.
 */
export function WheelHighlight() {
  return <View pointerEvents="none" style={styles.highlight} />;
}

const styles = StyleSheet.create({
  column: {
    height: WHEEL_HEIGHT,
  },
  contentContainer: {
    paddingVertical: EDGE_ITEMS * WHEEL_ITEM_HEIGHT,
  },
  item: {
    height: WHEEL_ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: {
    ...typography.body,
    color: colors.neutralMuted,
    fontSize: 20,
  },
  itemTextSelected: {
    ...typography.bodySemiBold,
    color: colors.neutral,
    fontSize: 22,
  },
  itemTextFar: {
    color: colors.neutralSubtle,
    fontSize: 17,
  },
  highlight: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: EDGE_ITEMS * WHEEL_ITEM_HEIGHT,
    height: WHEEL_ITEM_HEIGHT,
    borderRadius: 10,
    backgroundColor: 'rgba(197,163,101,0.12)',
    borderWidth: 1,
    borderColor: colors.border,
  },
});
