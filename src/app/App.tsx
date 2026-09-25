import React, { useCallback, useEffect, useState } from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActivityIndicator, StatusBar, View, StyleSheet, Text } from 'react-native';

import { MainTabNavigator } from '../navigation/MainTabNavigator';
import { LoginScreen } from '../features/auth/screens/LoginScreen';
import { tokenStore, ApiError } from '../services/api/client';
import { authService } from '../services/auth/authService';
import { notificationService } from '../services/notifications/notificationService';
import { userSettingsStore } from '../shared/state/userSettingsStore';
import { notificationStore } from '../shared/state/notificationStore';
import {
  configureForegroundBehavior,
  registerNotificationListeners,
} from '../services/notifications/pushHandlers';
import type { MainTabParamList } from '../navigation/types';
import {
  colors,
  ThemeProvider,
  useThemeMode,
  themeStore,
} from '../shared/theme';
import type { ThemePreference } from '../shared/theme';
import { Banner } from '../shared/components/overlays';

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

/** App-wide navigation ref so notification taps can navigate from outside screens. */
export const navigationRef = createNavigationContainerRef<MainTabParamList>();

/**
 * Navigate into the Hug flow and open a specific delivered hug.
 *
 * The Hug flow lives on the hidden "Hugs" tab (a nested stack with no
 * bottom-bar button). Tapping a hug notification opens the confirmation screen.
 */
function openHug(hugId: string) {
  if (!navigationRef.isReady()) return;
  navigationRef.navigate('Hugs', {
    screen: 'HugSent',
    params: { hugId, deliveryMs: 0 },
  } as never);
}

/**
 * Navigate to an incident's detail screen. Incident notifications (SLA breach,
 * reassignment, status change, close) carry the incident id and open the
 * ticket on the "Desk" tab's IncidentDetail screen.
 */
function openIncident(incidentId: string) {
  if (!navigationRef.isReady()) return;
  navigationRef.navigate('Desk', {
    screen: 'IncidentDetail',
    params: { incidentId },
  } as never);
}

/**
 * Open the Link Partner screen on the Profile tab. Tapping a partner
 * link-request notification lands the user where they can accept or decline.
 * The `openLink` nonce changes each time so ProfileScreen re-opens the modal
 * even when the Profile tab is already focused.
 */
function openPartnerLink() {
  if (!navigationRef.isReady()) return;
  navigationRef.navigate('Profile', { openLink: Date.now() } as never);
}

/**
 * Open the Hearth Vault. Tapping a "gift received" notification lands the
 * recipient on their vault, where the gift their partner sent now lives.
 */
function openGift() {
  if (!navigationRef.isReady()) return;
  navigationRef.navigate('Vault' as never);
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
    // Drop cached settings so the next user doesn't inherit this one's.
    userSettingsStore.reset();
    // Drop cached notifications too, for the same reason.
    notificationStore.reset();
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
          setAuthState('authenticated');
        } catch (authErr) {
          // Only sign the user out if the token is genuinely rejected (401/403).
          // A network error or backend hiccup at launch must NOT end an
          // otherwise-valid session — the user stays signed in until they
          // explicitly sign out. We keep the persisted token and let them in;
          // any later request will re-validate and, if truly expired, prompt
          // a fresh login then.
          if (authErr instanceof ApiError && authErr.isAuthError) {
            console.warn('Auth token rejected, signing out:', authErr);
            tokenStore.clear();
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
      const unsubscribe = registerNotificationListeners({
        onOpenHug: openHug,
        onOpenIncident: openIncident,
        onOpenPartnerLink: openPartnerLink,
        onOpenGift: openGift,
      });
      return unsubscribe;
    } catch (err) {
      console.warn('Notification registration error:', err);
    }
  }, [authState]);

  // Wait until both the auth check and the persisted theme have resolved so we
  // never paint with the wrong palette.
  if (authState === 'checking' || initialTheme === null) {
    return (
      <SafeAreaProvider>
        <View style={styles.loading}>
          <ActivityIndicator color={colors.gold} size="large" />
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
