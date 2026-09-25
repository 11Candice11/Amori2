/**
 * LoginScreen — sign in or register.
 * Uses the forest image as a full-screen background.
 */
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing, typography } from '../../../shared/theme';
import { authService } from '../../../services/auth/authService';
import { getSignInBackground } from '../../../utils/backgroundImages';
import { validateLogin } from '../utils/authSchema';

type Props = {
  onLoginSuccess: () => void;
};

type Mode = 'login' | 'register';

export function LoginScreen({ onLoginSuccess }: Props) {
  const [mode, setMode]         = useState<Mode>('login');
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  
  // Select a random background once at component mount
  const [backgroundImage] = useState(() => getSignInBackground());

  const isLogin = mode === 'login';

  const handleSubmit = useCallback(async () => {
    // Validate the email field and sanitize both email and password.
    const validation = validateLogin({ email, password });
    if (!validation.success) {
      setError(validation.error);
      return;
    }
    const { email: cleanEmail, password: cleanPassword } = validation.data;

    if (!isLogin && !name.trim()) {
      setError('Please enter your name.');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      if (isLogin) {
        await authService.login({ email: cleanEmail, password: cleanPassword });
      } else {
        await authService.register({ name: name.trim(), email: cleanEmail, password: cleanPassword });
      }
      onLoginSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  }, [isLogin, name, email, password, onLoginSuccess]);

  return (
    <ImageBackground
      source={backgroundImage}
      style={styles.bg}
      resizeMode="cover"
    >
      {/* Dark gradient overlay */}
      <View style={styles.overlay} />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Wordmark */}
            <View style={styles.wordmarkSection}>
              <Text style={styles.wordmark}>Amori</Text>
              <Text style={styles.tagline}>
                {isLogin ? 'Welcome back' : 'Begin your sanctuary'}
              </Text>
            </View>

            {/* Glass card */}
            <View style={styles.card}>
              {/* Mode toggle */}
              <View style={styles.modeToggle}>
                <Pressable
                  style={[styles.modeTab, isLogin && styles.modeTabActive]}
                  onPress={() => { setMode('login'); setError(null); }}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isLogin }}
                >
                  <Text style={[styles.modeTabText, isLogin && styles.modeTabTextActive]}>
                    Sign In
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.modeTab, !isLogin && styles.modeTabActive]}
                  onPress={() => { setMode('register'); setError(null); }}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: !isLogin }}
                >
                  <Text style={[styles.modeTabText, !isLogin && styles.modeTabTextActive]}>
                    Register
                  </Text>
                </Pressable>
              </View>

              {/* Fields */}
              <View style={styles.form}>
                {!isLogin && (
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>YOUR NAME</Text>
                    <TextInput
                      style={styles.input}
                      value={name}
                      onChangeText={setName}
                      placeholder="Your first name"
                      placeholderTextColor={colors.neutralSubtle}
                      autoCapitalize="words"
                      returnKeyType="next"
                      accessibilityLabel="Your name"
                    />
                  </View>
                )}

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>EMAIL</Text>
                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="you@example.com"
                    placeholderTextColor={colors.neutralSubtle}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="next"
                    accessibilityLabel="Email address"
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>PASSWORD</Text>
                  <TextInput
                    style={styles.input}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="••••••••"
                    placeholderTextColor={colors.neutralSubtle}
                    secureTextEntry
                    returnKeyType="done"
                    onSubmitEditing={handleSubmit}
                    accessibilityLabel="Password"
                  />
                </View>

                {error ? (
                  <Text style={styles.errorText}>{error}</Text>
                ) : null}

                <Pressable
                  style={({ pressed }) => [
                    styles.submitButton,
                    loading && styles.submitButtonDisabled,
                    pressed && !loading && styles.submitButtonPressed,
                  ]}
                  onPress={handleSubmit}
                  disabled={loading}
                  accessibilityRole="button"
                  accessibilityLabel={isLogin ? 'Sign in' : 'Create account'}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color={colors.ctaText} />
                  ) : (
                    <Text style={styles.submitButtonText}>
                      {isLogin ? 'Sign In' : 'Create Account'}
                    </Text>
                  )}
                </Pressable>

                <Pressable
                  onPress={() => { setMode(isLogin ? 'register' : 'login'); setError(null); }}
                  style={styles.switchLink}
                  accessibilityRole="button"
                >
                  <Text style={styles.switchLinkText}>
                    {isLogin
                      ? "Don't have an account? Register"
                      : 'Already have an account? Sign in'}
                  </Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(6, 14, 10, 0.72)',
  },
  safe: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xl,
  },
  wordmarkSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  wordmark: {
    ...typography.headlineLg,
    color: colors.gold,
    marginBottom: spacing.xs,
  },
  tagline: {
    ...typography.body,
    color: colors.neutralMuted,
    textAlign: 'center',
  },
  card: {
    backgroundColor: 'rgba(17, 29, 22, 0.88)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(253,252,240,0.1)',
    padding: spacing.lg,
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(10,20,15,0.6)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
    padding: 3,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  modeTabActive: {
    backgroundColor: colors.ctaBackground,
  },
  modeTabText: {
    ...typography.bodySemiBold,
    color: colors.neutralMuted,
    fontSize: 13,
  },
  modeTabTextActive: {
    color: colors.ctaText,
  },
  form: {
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
    backgroundColor: 'rgba(10,20,15,0.7)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(253,252,240,0.12)',
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    ...typography.body,
    color: colors.neutral,
  },
  errorText: {
    ...typography.bodySm,
    color: '#E57373',
    textAlign: 'center',
  },
  submitButton: {
    backgroundColor: colors.ctaBackground,
    borderRadius: 50,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonPressed: {
    opacity: 0.88,
  },
  submitButtonText: {
    ...typography.bodySemiBold,
    color: colors.ctaText,
    fontSize: 15,
  },
  switchLink: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  switchLinkText: {
    ...typography.body,
    color: colors.neutralMuted,
  },
});
