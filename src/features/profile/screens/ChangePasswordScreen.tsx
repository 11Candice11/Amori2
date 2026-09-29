/**
 * ChangePasswordScreen — update the signed-in user's password.
 *
 * Flow:
 *   1. Enter your current password.
 *   2. Enter a new password, then confirm it.
 *   3. On success the modal closes; the existing session stays valid.
 *
 * Rendered as a full-screen modal from ProfileScreen.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '../../../shared/components/header';
import { colors, spacing, typography } from '../../../shared/theme';
import { authService } from '../../../services/auth/authService';

type Props = {
  visible: boolean;
  onClose: () => void;
};

/** Minimum password length the app enforces before hitting the backend. */
const MIN_PASSWORD_LENGTH = 8;

export function ChangePasswordScreen({ visible, onClose }: Props) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Clear the form each time the modal opens so stale input never lingers.
  useEffect(() => {
    if (visible) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setError(null);
      setSaving(false);
    }
  }, [visible]);

  const handleSubmit = useCallback(async () => {
    const current = currentPassword;
    const next = newPassword;
    const confirm = confirmPassword;

    if (!current) {
      setError('Enter your current password.');
      return;
    }
    if (next.length < MIN_PASSWORD_LENGTH) {
      setError(`Your new password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (next !== confirm) {
      setError("Your new passwords don't match.");
      return;
    }
    if (next === current) {
      setError('Your new password must be different from your current one.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await authService.changePassword({
        currentPassword: current,
        newPassword: next,
      });
      Alert.alert('Password updated', 'Your password has been changed.');
      onClose();
    } catch (err) {
      setError(messageFrom(err));
    } finally {
      setSaving(false);
    }
  }, [currentPassword, newPassword, confirmPassword, onClose]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaProvider>
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          <StatusBar barStyle="light-content" backgroundColor={colors.background} />

          <AppHeader title="Change password" onBack={onClose} showNotificationBell={false} />

          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <ScrollView
              contentContainerStyle={styles.content}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.helperText}>
                Enter your current password, then choose a new one.
              </Text>

              <View style={styles.card}>
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>CURRENT PASSWORD</Text>
                  <TextInput
                    style={styles.input}
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    placeholder="••••••••"
                    placeholderTextColor={colors.neutralSubtle}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                    textContentType="password"
                    editable={!saving}
                    returnKeyType="next"
                    accessibilityLabel="Current password"
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>NEW PASSWORD</Text>
                  <TextInput
                    style={styles.input}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="At least 8 characters"
                    placeholderTextColor={colors.neutralSubtle}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                    textContentType="newPassword"
                    editable={!saving}
                    returnKeyType="next"
                    accessibilityLabel="New password"
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>CONFIRM NEW PASSWORD</Text>
                  <TextInput
                    style={styles.input}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Re-enter your new password"
                    placeholderTextColor={colors.neutralSubtle}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                    textContentType="newPassword"
                    editable={!saving}
                    returnKeyType="done"
                    onSubmitEditing={handleSubmit}
                    accessibilityLabel="Confirm new password"
                  />
                </View>

                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                <Pressable
                  style={({ pressed }) => [
                    styles.primaryButton,
                    pressed && !saving && styles.pressed,
                    saving && styles.disabled,
                  ]}
                  onPress={handleSubmit}
                  disabled={saving}
                  accessibilityRole="button"
                  accessibilityLabel="Update password"
                >
                  {saving ? (
                    <ActivityIndicator color={colors.ctaText} />
                  ) : (
                    <Text style={styles.primaryButtonText}>Update password</Text>
                  )}
                </Pressable>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

function messageFrom(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  return 'Something went wrong. Please try again.';
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
  },
  helperText: {
    ...typography.body,
    color: colors.neutralMuted,
    fontSize: 13,
  },
  card: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  fieldGroup: {
    gap: spacing.xs,
  },
  fieldLabel: {
    ...typography.label,
    color: colors.neutralMuted,
    fontSize: 10,
  },
  input: {
    ...typography.body,
    color: colors.neutral,
    backgroundColor: 'rgba(10,20,15,0.7)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(253,252,240,0.12)',
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  errorText: {
    ...typography.bodySm,
    color: '#E57373',
  },
  primaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.ctaBackground,
    borderRadius: 14,
    paddingVertical: spacing.md,
    marginTop: spacing.xs,
  },
  primaryButtonText: {
    ...typography.bodySemiBold,
    color: colors.ctaText,
    fontSize: 15,
  },
  pressed: {
    opacity: 0.88,
  },
  disabled: {
    opacity: 0.5,
  },
});
