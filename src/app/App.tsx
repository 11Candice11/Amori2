import React, { useCallback, useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar, View, StyleSheet, Text } from 'react-native';

import { MainTabNavigator } from '../navigation/MainTabNavigator';
import { LoginScreen } from '../features/auth/screens/LoginScreen';
import { tokenStore, ApiError } from '../services/api/client';
import { authService } from '../services/auth/authService';
import { clearLocalUserData } from '../services/auth/clearLocalUserData';
import { notificationService } from '../services/notifications/notificationService';
import { userSettingsStore } from '../shared/state/userSettingsStore';
import { supportProfileStore } from '../features/supportProfile/services/supportProfileStore';
import {
  configureForegroundBehavior,
  registerNotificationListeners,
} from '../services/notifications/pushHandlers';
import {
  scheduleDailyCheckInReminder,
  cancelDailyCheckInReminder,
} from '../services/notifications/localReminderService';
import { navigationRef, notificationRoutes } from '../navigation/notificationRouting';
import {
  colors,
  ThemeProvider,
  useThemeMode,
  themeStore,
} from '../shared/theme';
import type { ThemePreference } from '../shared/theme';
import { Banner, FeedbackOverlayHost } from '../shared/components/overlays';
import { LoadingAnimation } from '../shared/components/screens';

/**
 * StatusBar whose appearance follows the active theme. Rendered inside
 * ThemeProvider so it re-renders (with the correct bar style / background)
 * whenever the theme is toggled.
 */
function ThemedStatusBar() {
  const { isDark } = useThemeMode();
  return (
    <StatusBar
      barStyle={isDark ? 'light-content' : 'dark-content'}
      backgroundColor={colors.background}
    />
  );
}

type AuthState = 'checking' | 'unauthenticated' | 'authenticated' | 'error';

// Expose the logout callback app-wide without prop drilling
let _globalLogout: (() => void) | null = null;
export function logout() {
  _globalLogout?.();
}

export default function App() {
  const [authState, setAuthState] = useState<AuthState>('checking');
  const [error, setError] = useState<string | null>(null);
  // The persisted theme, loaded during bootstrap. `null` until resolved so the
  // first paint of the app uses the saved palette (avoids a theme flash).
  const [initialTheme, setInitialTheme] = useState<ThemePreference | null>(null);

  const handleLogout = useCallback(() => {
    // Drop every cache and on-device store tied to this user (settings,
    // notifications, support profile, points, chat drafts, custom triggers,
    // daily gift) so the next person on this device inherits nothing.
    void clearLocalUserData();
    try {
      // Best-effort: remove this device so the ex-user stops getting pushes.
      notificationService.deregisterDevice().finally(() => {
        // Revokes the refresh token server-side, then clears local tokens.
        void authService.logout();
        setAuthState('unauthenticated');
      });
    } catch (err) {
      console.warn('Logout error:', err);
      void authService.logout();
      setAuthState('unauthenticated');
    }
  }, []);

  // Register global logout so any screen can call logout()
  useEffect(() => {
    _globalLogout = handleLogout;
    return () => { _globalLogout = null; };
  }, [handleLogout]);

  // On startup: load the persisted theme, then validate any existing token.
  useEffect(() => {
    async function bootstrap() {
      try {
        // Load theme first so the app's first paint uses the saved palette.
        const savedTheme = await themeStore.load();
        setInitialTheme(savedTheme);

        // Restore any persisted session so the user stays signed in across app
        // restarts (until they explicitly sign out).
        const existing = await tokenStore.hydrate();
        if (!existing) {
          setAuthState('unauthenticated');
          return;
        }
        try {
          // This doubles as the token check and the initial settings load, so
          // preferences like vibration are honoured from the first screen on.
          userSettingsStore.set(await authService.getMe());
          // Restore the persisted Support Profile so it's ready after a restart,
          // then refresh it (and the partner view) from the network in the
          // background — failures keep the cached copy.
          void supportProfileStore.hydrate().then(() => {
            void supportProfileStore.loadOwn(true);
          });
          setAuthState('authenticated');
        } catch (authErr) {
          // Only sign the user out if the token is genuinely rejected (401).
          // A network error or backend hiccup at launch must NOT end an
          // otherwise-valid session — the user stays signed in until they
          // explicitly sign out. We keep the persisted token and let them in;
          // any later request will re-validate and, if truly expired, prompt
          // a fresh login then.
          if (authErr instanceof ApiError && authErr.isAuthError) {
            console.warn('Auth token rejected, signing out:', authErr);
            tokenStore.clear();
            // Same as an explicit sign-out: whoever signs in next starts clean.
            void clearLocalUserData();
            setAuthState('unauthenticated');
          } else {
            console.warn('Session validation failed (keeping session):', authErr);
            setAuthState('authenticated');
          }
        }
      } catch (err) {
        console.error('Bootstrap error:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize app');
        setAuthState('error');
        // Still set a default theme so the error screen renders
        setInitialTheme({
          mode: 'dark',
          variant: 'botanical',
        });
      }
    }
    bootstrap();
  }, []);

  const handleLoginSuccess = useCallback(() => {
    // Pull the new user's settings in before any screen needs to honour them.
    userSettingsStore.load(true);
    // A fresh sign-in is a new session on this device: clear any residual
    // Support Profile cache, then load this user's own profile.
    supportProfileStore.reset();
    void supportProfileStore.loadOwn(true);
    setAuthState('authenticated');
  }, []);

  // Configure how notifications render while the app is foregrounded (once).
  useEffect(() => {
    try {
      configureForegroundBehavior();
    } catch (err) {
      console.warn('Notification configuration error:', err);
    }
  }, []);

  // Once authenticated, register this device for push and listen for taps.
  // Safe no-op when no push token is available (simulator / provider not linked).
  useEffect(() => {
    if (authState !== 'authenticated') return;

    try {
      notificationService.registerDevice();
      // Same routes as tapping a row in the in-app Notifications inbox.
      const unsubscribe = registerNotificationListeners(notificationRoutes);
      return unsubscribe;
    } catch (err) {
      console.warn('Notification registration error:', err);
    }
  }, [authState]);

  // Schedule the daily check-in reminder when authenticated and settings are loaded.
  useEffect(() => {
    if (authState !== 'authenticated') return;

    // Load settings if not already loaded, then schedule reminder if enabled.
    userSettingsStore.load().then(() => {
      const user = userSettingsStore.get();
      if (user?.checkInReminders && user?.notificationsEnabled) {
        const reminderTime = user.checkInReminderTime ?? '09:00';
        scheduleDailyCheckInReminder(reminderTime).catch((err) => {
          console.warn('Failed to schedule check-in reminder:', err);
        });
      } else {
        // Cancel any existing reminder if the setting is disabled.
        cancelDailyCheckInReminder().catch(() => {
          // Ignore cancellation errors
        });
      }
    }).catch((err) => {
      console.warn('Failed to load user settings for reminder scheduling:', err);
    });
  }, [authState]);

  // Wait until both the auth check and the persisted theme have resolved so we
  // never paint with the wrong palette.
  if (authState === 'checking' || initialTheme === null) {
    return (
      <SafeAreaProvider>
        <View style={styles.loading}>
          <LoadingAnimation size={120} />
        </View>
      </SafeAreaProvider>
    );
  }

  if (authState === 'error') {
    return (
      <SafeAreaProvider>
        <ThemeProvider
          initialMode={initialTheme.mode}
          initialVariant={initialTheme.variant}
        >
          <ThemedStatusBar />
          <View style={styles.error}>
            <Text style={styles.errorTitle}>Startup Error</Text>
            <Text style={styles.errorMessage}>{error}</Text>
          </View>
        </ThemeProvider>
      </SafeAreaProvider>
    );
  }

  if (authState === 'unauthenticated') {
    return (
      <SafeAreaProvider>
        <ThemeProvider
          initialMode={initialTheme.mode}
          initialVariant={initialTheme.variant}
        >
          <ThemedStatusBar />
          <LoginScreen onLoginSuccess={handleLoginSuccess} />
          <Banner />
        </ThemeProvider>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider
        initialMode={initialTheme.mode}
        initialVariant={initialTheme.variant}
      >
        <ThemedStatusBar />
        <NavigationContainer ref={navigationRef}>
          <MainTabNavigator onLogout={handleLogout} />
        </NavigationContainer>
        {/* App-wide feedback banner, overlaying every screen. */}
        <Banner />
        {/* App-wide success/failure celebration, fired from create/save flows. */}
        <FeedbackOverlayHost />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.neutral,
    marginBottom: 10,
  },
  errorMessage: {
    fontSize: 16,
    color: colors.neutralMuted,
    textAlign: 'center',
  },
});
