/**
 * ProfileScreen — user info + sign out.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle } from 'react-native-svg';

import { colors, spacing, typography, useThemeMode } from '../../../shared/theme';
import { authService } from '../../../services/auth/authService';
import { partnerLinkService } from '../services/partnerLinkService';
import { settingsService } from '../services/settingsService';
import { usePartnerLinkNotifications } from '../hooks/usePartnerLinkNotifications';
import { logout } from '../../../app/App';
import type { UserResponse, UpdateUserSettingsRequest } from '../../../services/api/types';
import { LinkPartnerScreen } from './LinkPartnerScreen';

function UserIcon() {
  return (
    <Svg width={40} height={40} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="8" r="4" stroke={colors.gold} strokeWidth={1.5} />
      <Path
        d="M4 20c0-4 3.582-7 8-7s8 3 8 7"
        stroke={colors.gold}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function LinkIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"
        stroke={colors.gold}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ChevronIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 6l6 6-6 6"
        stroke={colors.neutralMuted}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function SignOutIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"
        stroke={colors.emergency}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// onLogout is optional — falls back to the global logout() from App.tsx
type Props = {
  onLogout?: () => void;
};

export function ProfileScreen({ onLogout }: Props) {
  const { isDark, setMode } = useThemeMode();
  const [user, setUser] = useState<UserResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLinked, setIsLinked] = useState<boolean | null>(null);
  const [partnerName, setPartnerName] = useState<string | null>(null);
  const [linkModalVisible, setLinkModalVisible] = useState(false);
  const [savingSetting, setSavingSetting] = useState<keyof UpdateUserSettingsRequest | null>(null);

  useEffect(() => {
    authService.getMe()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  // Toggle a sharing preference with an optimistic update; revert on failure.
  const toggleSetting = useCallback(
    (key: keyof UpdateUserSettingsRequest, value: boolean) => {
      setUser(prev => (prev ? { ...prev, [key]: value } : prev));
      setSavingSetting(key);
      settingsService
        .update({ [key]: value })
        .then(setUser)
        .catch(() => {
          // Revert the optimistic change if the request failed.
          setUser(prev => (prev ? { ...prev, [key]: !value } : prev));
        })
        .finally(() => setSavingSetting(null));
    },
    [],
  );

  const { unreadRequestCount, refresh: refreshNotifications, markSeen } =
    usePartnerLinkNotifications();

  const refreshLinkStatus = useCallback(() => {
    partnerLinkService.getStatus()
      .then((status) => {
        setIsLinked(status.isLinked);
        setPartnerName(status.partnerName);
      })
      .catch(() => setIsLinked(null));
  }, []);

  useEffect(() => {
    refreshLinkStatus();
  }, [refreshLinkStatus]);

  const openLinkModal = useCallback(() => {
    setLinkModalVisible(true);
    // Opening the screen counts as seeing the pending requests.
    markSeen();
  }, [markSeen]);

  const handleLinked = useCallback(() => {
    refreshLinkStatus();
    refreshNotifications();
  }, [refreshLinkStatus, refreshNotifications]);

  const handleSignOut = useCallback(() => {
    authService.logout();
    // Use prop if provided (from navigator), otherwise fall back to global
    if (onLogout) {
      onLogout();
    } else {
      logout();
    }
  }, [onLogout]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.screenLabel}>PROFILE</Text>
        </View>

        {/* User card */}
        <View style={styles.userCard}>
          <View style={styles.avatarCircle}>
            <UserIcon />
          </View>
          {loading ? (
            <ActivityIndicator color={colors.gold} style={styles.loadingIndicator} />
          ) : (
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{user?.name ?? '—'}</Text>
              <Text style={styles.userEmail}>{user?.email ?? '—'}</Text>
            </View>
          )}
        </View>

        {/* Partner link entry — show once we know the status */}
        {isLinked === false && (
          <Pressable
            style={({ pressed }) => [
              styles.linkRow,
              pressed && styles.linkRowPressed,
            ]}
            onPress={openLinkModal}
            android_ripple={{ color: 'rgba(197,163,101,0.12)' }}
            accessibilityRole="button"
            accessibilityLabel={
              unreadRequestCount > 0
                ? `Link to partner, ${unreadRequestCount} pending request${unreadRequestCount > 1 ? 's' : ''}`
                : 'Link to partner'
            }
          >
            <View style={styles.linkIconCircle}>
              <LinkIcon />
              {unreadRequestCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {unreadRequestCount > 9 ? '9+' : String(unreadRequestCount)}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.linkTextWrap}>
              <Text style={styles.linkTitle}>Link to partner</Text>
              <Text style={styles.linkSubtitle}>
                {unreadRequestCount > 0
                  ? `${unreadRequestCount} partner request${unreadRequestCount > 1 ? 's' : ''} waiting`
                  : 'Connect your accounts to share check-ins'}
              </Text>
            </View>
            <ChevronIcon />
          </Pressable>
        )}

        {isLinked === true && (
          <Pressable
            style={({ pressed }) => [
              styles.linkedRow,
              pressed && styles.linkRowPressed,
            ]}
            onPress={openLinkModal}
            android_ripple={{ color: 'rgba(197,163,101,0.12)' }}
            accessibilityRole="button"
            accessibilityLabel="Manage partner link"
          >
            <View style={styles.linkIconCircle}>
              <LinkIcon />
            </View>
            <View style={styles.linkTextWrap}>
              <Text style={styles.linkTitle}>Linked</Text>
              <Text style={styles.linkSubtitle}>
                {partnerName ? `Connected with ${partnerName}` : 'Connected with your partner'}
              </Text>
            </View>
            <ChevronIcon />
          </Pressable>
        )}

        {/* Appearance — light / dark theme */}
        <Text style={styles.sectionLabel}>APPEARANCE</Text>
        <View style={styles.settingsCard}>
          <View style={styles.settingRow}>
            <View style={styles.settingTextWrap}>
              <Text style={styles.settingTitle}>Light mode</Text>
              <Text style={styles.settingSubtitle}>
                {isDark
                  ? 'Using the dark botanical theme. Turn on for a light theme.'
                  : 'Using the light theme. Turn off for the dark botanical theme.'}
              </Text>
            </View>
            <Switch
              value={!isDark}
              onValueChange={(toLight) => setMode(toLight ? 'light' : 'dark')}
              trackColor={{ false: 'rgba(253,252,240,0.16)', true: colors.gold }}
              thumbColor={colors.neutral}
              ios_backgroundColor="rgba(253,252,240,0.16)"
              accessibilityLabel="Light mode"
            />
          </View>
        </View>

        {/* Privacy / sharing settings */}
        <Text style={styles.sectionLabel}>SHARING</Text>
        <View style={styles.settingsCard}>
          <View style={styles.settingRow}>
            <View style={styles.settingTextWrap}>
              <Text style={styles.settingTitle}>Share mood</Text>
              <Text style={styles.settingSubtitle}>
                Let your partner see how you're feeling from your check-ins.
              </Text>
            </View>
            <Switch
              value={user?.shareMood ?? false}
              onValueChange={(v) => toggleSetting('shareMood', v)}
              disabled={loading || !user || savingSetting === 'shareMood'}
              trackColor={{ false: 'rgba(253,252,240,0.16)', true: colors.gold }}
              thumbColor={colors.neutral}
              ios_backgroundColor="rgba(253,252,240,0.16)"
              accessibilityLabel="Share mood"
            />
          </View>

          <View style={styles.settingDivider} />

          <View style={styles.settingRow}>
            <View style={styles.settingTextWrap}>
              <Text style={styles.settingTitle}>Share activity</Text>
              <Text style={styles.settingSubtitle}>
                Show your partner when you're online and active in the app.
              </Text>
            </View>
            <Switch
              value={user?.shareActivity ?? false}
              onValueChange={(v) => toggleSetting('shareActivity', v)}
              disabled={loading || !user || savingSetting === 'shareActivity'}
              trackColor={{ false: 'rgba(253,252,240,0.16)', true: colors.gold }}
              thumbColor={colors.neutral}
              ios_backgroundColor="rgba(253,252,240,0.16)"
              accessibilityLabel="Share activity"
            />
          </View>
        </View>

        <View style={styles.spacer} />

        {/* Sign Out */}
        <Pressable
          style={({ pressed }) => [
            styles.signOutButton,
            pressed && styles.signOutButtonPressed,
          ]}
          onPress={handleSignOut}
          android_ripple={{ color: 'rgba(179,64,64,0.15)' }}
          accessibilityRole="button"
          accessibilityLabel="Sign out"
        >
          <SignOutIcon />
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>
      </ScrollView>

      <LinkPartnerScreen
        visible={linkModalVisible}
        onClose={() => setLinkModalVisible(false)}
        onLinked={handleLinked}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  header: {
    marginBottom: spacing.lg,
  },
  screenLabel: {
    ...typography.label,
    color: colors.neutralMuted,
    fontSize: 10,
  },
  userCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(197,163,101,0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(197,163,101,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  loadingIndicator: {
    flex: 1,
  },
  userInfo: {
    flex: 1,
    gap: 4,
  },
  userName: {
    ...typography.headlineSm,
    color: colors.neutral,
  },
  userEmail: {
    ...typography.body,
    color: colors.neutralMuted,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  linkRowPressed: {
    opacity: 0.75,
  },
  linkedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  linkIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(197,163,101,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(197,163,101,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.emergency,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.surfaceCard,
  },
  badgeText: {
    ...typography.label,
    color: colors.neutral,
    fontSize: 10,
    letterSpacing: 0,
  },
  linkTextWrap: {
    flex: 1,
    gap: 2,
  },
  linkTitle: {
    ...typography.bodySemiBold,
    color: colors.neutral,
    fontSize: 15,
  },
  linkSubtitle: {
    ...typography.body,
    color: colors.neutralMuted,
    fontSize: 13,
  },
  sectionLabel: {
    ...typography.label,
    color: colors.neutralMuted,
    fontSize: 10,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  settingsCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  settingTextWrap: {
    flex: 1,
    gap: 2,
  },
  settingTitle: {
    ...typography.bodySemiBold,
    color: colors.neutral,
    fontSize: 15,
  },
  settingSubtitle: {
    ...typography.body,
    color: colors.neutralMuted,
    fontSize: 13,
  },
  settingDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  spacer: {
    flex: 1,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.emergencyBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(179,64,64,0.25)',
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
  },
  signOutButtonPressed: {
    opacity: 0.75,
  },
  signOutText: {
    ...typography.bodySemiBold,
    color: colors.emergency,
    fontSize: 15,
  },
});
