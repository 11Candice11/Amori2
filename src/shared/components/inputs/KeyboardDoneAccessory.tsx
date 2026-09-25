import React from 'react';
import {
  InputAccessoryView,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors, spacing, typography } from '../../theme';

/**
 * Shared nativeID for the "Done" bar that sits above the iOS keyboard.
 *
 * Pass this to any TextInput as `inputAccessoryViewID` and render a single
 * <KeyboardDoneAccessory /> somewhere in the same screen. Multiline inputs have
 * no return key that dismisses the keyboard, so without this there is no way to
 * get the keyboard out of the way.
 */
export const KEYBOARD_DONE_ACCESSORY_ID = 'amoriKeyboardDone';

type Props = {
  /** Override the nativeID when a screen needs more than one accessory bar. */
  nativeID?: string;
  label?: string;
};

/**
 * iOS-only accessory bar with a right-aligned "Done" button that dismisses the
 * keyboard. Renders nothing on Android, where the system back gesture/button
 * already closes the keyboard (and InputAccessoryView is unsupported).
 */
export function KeyboardDoneAccessory({
  nativeID = KEYBOARD_DONE_ACCESSORY_ID,
  label = 'Done',
}: Props) {
  if (Platform.OS !== 'ios') return null;

  return (
    <InputAccessoryView nativeID={nativeID}>
      <View style={styles.bar}>
        <Pressable
          onPress={Keyboard.dismiss}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={`${label}, dismiss keyboard`}
          style={styles.button}
        >
          <Text style={styles.label}>{label}</Text>
        </Pressable>
      </View>
    </InputAccessoryView>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    backgroundColor: colors.surfaceCard,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  button: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  label: {
    ...typography.bodySemiBold,
    color: colors.gold,
    fontSize: 16,
  },
});
