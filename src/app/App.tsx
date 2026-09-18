import React, { useCallback, useEffect, useState } from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActivityIndicator, StatusBar, View, StyleSheet } from 'react-native';

import { MainTabNavigator } from '../navigation/MainTabNavigator';
import { LoginScreen } from '../features/auth/screens/LoginScreen';
import { tokenStore } from '../services/api/client';
import { authService } from '../services/auth/authService';
import { notificationService } from '../services/notifications/notificationService';
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

type AuthState = 'checking' | 'unauthenticated' | 'authenticated';

// Expose the logout callback app-wide without prop drilling
let _globalLogout: (() => void) | null = null;
export function logout() {
  _globalLogout?.();
}

export default function App() {
  const [authState, setAuthState] = useState<AuthState>('checking');
  // The persisted theme, loaded during bootstrap. `null` until resolved so the
  // first paint of the app uses the saved palette (avoids a theme flash).
  const [initialTheme, setInitialTheme] = useState<ThemePreference | null>(null);

  const handleLogout = useCallback(() => {
    // Best-effort: remove this device so the ex-user stops getting pushes.
    notificationService.deregisterDevice().finally(() => {
      authService.logout();
      setAuthState('unauthenticated');
    });
  }, []);

  // Register global logout so any screen can call logout()
  useEffect(() => {
    _globalLogout = handleLogout;
    return () => { _globalLogout = null; };
  }, [handleLogout]);

  // On startup: load the persisted theme, then validate any existing token.
  useEffect(() => {
    async function bootstrap() {
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
        await authService.getMe();
        setAuthState('authenticated');
      } catch {
        tokenStore.clear();
        setAuthState('unauthenticated');
      }
    }
    bootstrap();
  }, []);

  const handleLoginSuccess = useCallback(() => {
    setAuthState('authenticated');
  }, []);

  // Configure how notifications render while the app is foregrounded (once).
  useEffect(() => {
    configureForegroundBehavior();
  }, []);

  // Once authenticated, register this device for push and listen for taps.
  // Safe no-op when no push token is available (simulator / provider not linked).
  useEffect(() => {
    if (authState !== 'authenticated') return;

    notificationService.registerDevice();
    const unsubscribe = registerNotificationListeners({
      onOpenHug: openHug,
      onOpenIncident: openIncident,
    });
    return unsubscribe;
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

  if (authState === 'unauthenticated') {
    return (
      <SafeAreaProvider>
        <ThemeProvider
          initialMode={initialTheme.mode}
          initialVariant={initialTheme.variant}
        >
          <ThemedStatusBar />
          <LoginScreen onLoginSuccess={handleLoginSuccess} />
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
});
