/**
 * ProfileScreen — user info + sign out.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import Svg, { Path } from 'react-native-svg';

import { colors, spacing, typography } from '../../../shared/theme';
import { AppHeader } from '../../../shared/components/header';
import { getSettingsBackground } from '../../../utils/backgroundImages';
import { authService } from '../../../services/auth/authService';
import { partnerLinkService } from '../services/partnerLinkService';
import { settingsService } from '../services/settingsService';
import { userSettingsStore } from '../../../shared/state/userSettingsStore';
import { notificationStore } from '../../../shared/state/notificationStore';
import { supportProfileStore } from '../../supportProfile/services/supportProfileStore';
import { usePartnerLinkNotifications } from '../hooks/usePartnerLinkNotifications';
import { logout } from '../../../app/App';
import type { UserResponse, UpdateUserSettingsRequest } from '../../../services/api/types';
import type { MainTabParamList } from '../../../navigation/types';
import { LinkPartnerScreen } from './LinkPartnerScreen';
import { ChangePasswordScreen } from './ChangePasswordScreen';

function UserIcon() {
  return (
    <Image
      source={require('../../../../images/icons/profile.png')}
      style={styles.avatarImage}
      resizeMode="contain"
      accessibilityIgnoresInvertColors
    />
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

function LockIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 10V8a6 6 0 0 1 12 0v2M5 10h14a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1Z"
        stroke={colors.gold}
        strokeWidth={1.6}
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
  const route = useRoute<RouteProp<MainTabParamList, 'Profile'>>();
  const navigation = useNavigation<NavigationProp<MainTabParamList>>();
  const [user, setUser] = useState<UserResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLinked, setIsLinked] = useState<boolean | null>(null);
  const [partnerName, setPartnerName] = useState<string | null>(null);
  const [linkModalVisible, setLinkModalVisible] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [savingSetting, setSavingSetting] = useState<keyof UpdateUserSettingsRequest | null>(null);
  // Picked once per mount so toggling a setting doesn't swap the image mid-scroll.
  const [backgroundImage] = useState(() => getSettingsBackground());

  useEffect(() => {
    authService.getMe()
      .then(fresh => {
        setUser(fresh);
        // Share the settings with the rest of the app (e.g. haptics).
        userSettingsStore.set(fresh);
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  // Toggle a sharing preference with an optimistic update; revert on failure.
  // The shared store is kept in step at each stage so other screens honour the
  // preference as soon as it's flipped, not just after the next fetch.
  const toggleSetting = useCallback(
    (key: keyof UpdateUserSettingsRequest, value: boolean) => {
      setUser(prev => (prev ? { ...prev, [key]: value } : prev));
      userSettingsStore.merge({ [key]: value });
      setSavingSetting(key);
      settingsService
        .update({ [key]: value })
        .then(fresh => {
          setUser(fresh);
          userSettingsStore.set(fresh);
        })
        .catch(() => {
          // Revert the optimistic change if the request failed.
          setUser(prev => (prev ? { ...prev, [key]: !value } : prev));
          userSettingsStore.merge({ [key]: !value });
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

  // Open the Link Partner modal when navigated here from a partner link-request
  // notification. `openLink` is a nonce that changes on each tap, so re-tapping
  // re-opens the modal even when the Profile tab is already focused.
  const openLinkNonce = route.params?.openLink;
  useEffect(() => {
    if (openLinkNonce != null) {
      openLinkModal();
    }
  }, [openLinkNonce, openLinkModal]);

  const handleLinked = useCallback(() => {
    refreshLinkStatus();
    refreshNotifications();
  }, [refreshLinkStatus, refreshNotifications]);

  const handleSignOut = useCallback(() => {
    void authService.logout();
    // Drop the cached settings so the next user doesn't inherit them.
    userSettingsStore.reset();
    notificationStore.reset();
    // Drop cached Support Preferences (own + partner) so nothing leaks to the
    // next account on this device.
    supportProfileStore.reset();
    // Use prop if provided (from navigator), otherwise fall back to global
    if (onLogout) {
      onLogout();
    } else {
      logout();
    }
  }, [onLogout]);

  return (
    <ImageBackground source={backgroundImage} style={styles.background} resizeMode="cover">
      <View style={styles.scrim} />
      <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      <AppHeader title="Settings" bordered={false} style={styles.headerTransparent} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
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

        {/* How to Know Me — the user's own Support Preferences handbook */}
        <Text style={styles.sectionLabel}>SUPPORT PREFERENCES</Text>
        <Pressable
          style={({ pressed }) => [styles.linkRow, pressed && styles.linkRowPressed]}
          onPress={() => navigation.navigate('SupportProfile', { screen: 'SupportProfileHome' })}
          android_ripple={{ color: 'rgba(197,163,101,0.12)' }}
          accessibilityRole="button"
          accessibilityLabel="How to Know Me"
        >
          <View style={styles.linkIconCircle}>
            <UserIcon />
          </View>
          <View style={styles.linkTextWrap}>
            <Text style={styles.linkTitle}>How to Know Me</Text>
            <Text style={styles.linkSubtitle}>
              Share what helps, what to avoid, and the little things you love.
            </Text>
          </View>
          <ChevronIcon />
        </Pressable>

        {/* Account */}
        <Text style={styles.sectionLabel}>ACCOUNT</Text>
        <Pressable
          style={({ pressed }) => [
            styles.linkRow,
            styles.accountRow,
            pressed && styles.linkRowPressed,
          ]}
          onPress={() => setPasswordModalVisible(true)}
          android_ripple={{ color: 'rgba(197,163,101,0.12)' }}
          accessibilityRole="button"
          accessibilityLabel="Change password"
        >
          <View style={styles.linkIconCircle}>
            <LockIcon />
          </View>
          <View style={styles.linkTextWrap}>
            <Text style={styles.linkTitle}>Change password</Text>
            <Text style={styles.linkSubtitle}>
              Update the password you use to sign in.
            </Text>
          </View>
          <ChevronIcon />
        </Pressable>

        {/* Privacy / sharing settings */}
        <Text style={styles.sectionLabel}>PRIVACY & SHARING</Text>
        <View style={styles.settingsCard}>
          <View style={styles.settingRow}>
            <View style={styles.settingTextWrap}>
              <Text style={styles.settingTitle}>Share mood</Text>
              <Text style={styles.settingSubtitle}>
                Let your partner see how you're feeling from your check-ins.
              </Text>
            </View>
            <Switch
              value={user?.shareMood ?? true}
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
              value={user?.shareActivity ?? true}
              onValueChange={(v) => toggleSetting('shareActivity', v)}
              disabled={loading || !user || savingSetting === 'shareActivity'}
              trackColor={{ false: 'rgba(253,252,240,0.16)', true: colors.gold }}
              thumbColor={colors.neutral}
              ios_backgroundColor="rgba(253,252,240,0.16)"
              accessibilityLabel="Share activity"
            />
          </View>

          <View style={styles.settingDivider} />

          <View style={styles.settingRow}>
            <View style={styles.settingTextWrap}>
              <Text style={styles.settingTitle}>Share check-ins</Text>
              <Text style={styles.settingSubtitle}>
                Let your partner see detailed notes from your daily check-ins.
              </Text>
            </View>
            <Switch
              value={user?.shareCheckIns ?? true}
              onValueChange={(v) => toggleSetting('shareCheckIns', v)}
              disabled={loading || !user || savingSetting === 'shareCheckIns'}
              trackColor={{ false: 'rgba(253,252,240,0.16)', true: colors.gold }}
              thumbColor={colors.neutral}
              ios_backgroundColor="rgba(253,252,240,0.16)"
              accessibilityLabel="Share check-ins"
            />
          </View>

          <View style={styles.settingDivider} />

          <View style={styles.settingRow}>
            <View style={styles.settingTextWrap}>
              <Text style={styles.settingTitle}>Share location</Text>
              <Text style={styles.settingSubtitle}>
                Include your location when sending emergency alerts to your partner.
              </Text>
            </View>
            <Switch
              value={user?.shareLocation ?? true}
              onValueChange={(v) => toggleSetting('shareLocation', v)}
              disabled={loading || !user || savingSetting === 'shareLocation'}
              trackColor={{ false: 'rgba(253,252,240,0.16)', true: colors.gold }}
              thumbColor={colors.neutral}
              ios_backgroundColor="rgba(253,252,240,0.16)"
              accessibilityLabel="Share location"
            />
          </View>

          <View style={styles.settingDivider} />

          <View style={styles.settingRow}>
            <View style={styles.settingTextWrap}>
              <Text style={styles.settingTitle}>Share timeline</Text>
              <Text style={styles.settingSubtitle}>
                Let your partner view and contribute to your shared timeline.
              </Text>
            </View>
            <Switch
              value={user?.shareTimeline ?? true}
              onValueChange={(v) => toggleSetting('shareTimeline', v)}
              disabled={loading || !user || savingSetting === 'shareTimeline'}
              trackColor={{ false: 'rgba(253,252,240,0.16)', true: colors.gold }}
              thumbColor={colors.neutral}
              ios_backgroundColor="rgba(253,252,240,0.16)"
              accessibilityLabel="Share timeline"
            />
          </View>
        </View>

        {/* Permissions settings */}
        <Text style={styles.sectionLabel}>PERMISSIONS</Text>
        <View style={styles.settingsCard}>
          <View style={styles.settingRow}>
            <View style={styles.settingTextWrap}>
              <Text style={styles.settingTitle}>Allow hugs</Text>
              <Text style={styles.settingSubtitle}>
                Let your partner send you virtual hugs for comfort and support.
              </Text>
            </View>
            <Switch
              value={user?.allowHugs ?? true}
              onValueChange={(v) => toggleSetting('allowHugs', v)}
              disabled={loading || !user || savingSetting === 'allowHugs'}
              trackColor={{ false: 'rgba(253,252,240,0.16)', true: colors.gold }}
              thumbColor={colors.neutral}
              ios_backgroundColor="rgba(253,252,240,0.16)"
              accessibilityLabel="Allow hugs"
            />
          </View>

          <View style={styles.settingDivider} />

          <View style={styles.settingRow}>
            <View style={styles.settingTextWrap}>
              <Text style={styles.settingTitle}>Allow emergency alerts</Text>
              <Text style={styles.settingSubtitle}>
                Let your partner send you emergency alerts when they need immediate support.
              </Text>
            </View>
            <Switch
              value={user?.allowEmergencyAlerts ?? true}
              onValueChange={(v) => toggleSetting('allowEmergencyAlerts', v)}
              disabled={loading || !user || savingSetting === 'allowEmergencyAlerts'}
              trackColor={{ false: 'rgba(253,252,240,0.16)', true: colors.gold }}
              thumbColor={colors.neutral}
              ios_backgroundColor="rgba(253,252,240,0.16)"
              accessibilityLabel="Allow emergency alerts"
            />
          </View>

          <View style={styles.settingDivider} />

          <View style={styles.settingRow}>
            <View style={styles.settingTextWrap}>
              <Text style={styles.settingTitle}>Allow partner reminders</Text>
              <Text style={styles.settingSubtitle}>
                Let your partner create reminders for you (medication, water, etc.).
              </Text>
            </View>
            <Switch
              value={user?.allowPartnerReminders ?? true}
              onValueChange={(v) => toggleSetting('allowPartnerReminders', v)}
              disabled={loading || !user || savingSetting === 'allowPartnerReminders'}
              trackColor={{ false: 'rgba(253,252,240,0.16)', true: colors.gold }}
              thumbColor={colors.neutral}
              ios_backgroundColor="rgba(253,252,240,0.16)"
              accessibilityLabel="Allow partner reminders"
            />
          </View>
        </View>

        {/* Notification settings */}
        <Text style={styles.sectionLabel}>NOTIFICATIONS</Text>
        <View style={styles.settingsCard}>
          <View style={styles.settingRow}>
            <View style={styles.settingTextWrap}>
              <Text style={styles.settingTitle}>Enable notifications</Text>
              <Text style={styles.settingSubtitle}>
                Master switch for all app notifications. Disabling will silence everything.
              </Text>
            </View>
            <Switch
              value={user?.notificationsEnabled ?? true}
              onValueChange={(v) => toggleSetting('notificationsEnabled', v)}
              disabled={loading || !user || savingSetting === 'notificationsEnabled'}
              trackColor={{ false: 'rgba(253,252,240,0.16)', true: colors.gold }}
              thumbColor={colors.neutral}
              ios_backgroundColor="rgba(253,252,240,0.16)"
              accessibilityLabel="Enable notifications"
            />
          </View>

          <View style={styles.settingDivider} />

          <View style={styles.settingRow}>
            <View style={styles.settingTextWrap}>
              <Text style={styles.settingTitle}>Hug notifications</Text>
              <Text style={styles.settingSubtitle}>
                Get notified when your partner sends you a hug.
              </Text>
            </View>
            <Switch
              value={user?.hugNotifications ?? true}
              onValueChange={(v) => toggleSetting('hugNotifications', v)}
              disabled={loading || !user || savingSetting === 'hugNotifications' || !user?.notificationsEnabled}
              trackColor={{ false: 'rgba(253,252,240,0.16)', true: colors.gold }}
              thumbColor={colors.neutral}
              ios_backgroundColor="rgba(253,252,240,0.16)"
              accessibilityLabel="Hug notifications"
            />
          </View>

          <View style={styles.settingDivider} />

          <View style={styles.settingRow}>
            <View style={styles.settingTextWrap}>
              <Text style={styles.settingTitle}>Emergency notifications</Text>
              <Text style={styles.settingSubtitle}>
                Receive urgent notifications when your partner needs immediate support.
              </Text>
            </View>
            <Switch
              value={user?.emergencyNotifications ?? true}
              onValueChange={(v) => toggleSetting('emergencyNotifications', v)}
              disabled={loading || !user || savingSetting === 'emergencyNotifications' || !user?.notificationsEnabled}
              trackColor={{ false: 'rgba(253,252,240,0.16)', true: colors.gold }}
              thumbColor={colors.neutral}
              ios_backgroundColor="rgba(253,252,240,0.16)"
              accessibilityLabel="Emergency notifications"
            />
          </View>

          <View style={styles.settingDivider} />

          <View style={styles.settingRow}>
            <View style={styles.settingTextWrap}>
              <Text style={styles.settingTitle}>Check-in reminders</Text>
              <Text style={styles.settingSubtitle}>
                Get gentle reminders to complete your daily mood check-ins.
              </Text>
            </View>
            <Switch
              value={user?.checkInReminders ?? true}
              onValueChange={(v) => toggleSetting('checkInReminders', v)}
              disabled={loading || !user || savingSetting === 'checkInReminders' || !user?.notificationsEnabled}
              trackColor={{ false: 'rgba(253,252,240,0.16)', true: colors.gold }}
              thumbColor={colors.neutral}
              ios_backgroundColor="rgba(253,252,240,0.16)"
              accessibilityLabel="Check-in reminders"
            />
          </View>

          <View style={styles.settingDivider} />

          <View style={styles.settingRow}>
            <View style={styles.settingTextWrap}>
              <Text style={styles.settingTitle}>Partner activity</Text>
              <Text style={styles.settingSubtitle}>
                Get notified when your partner comes online or completes activities.
              </Text>
            </View>
            <Switch
              value={user?.partnerActivityNotifications ?? true}
              onValueChange={(v) => toggleSetting('partnerActivityNotifications', v)}
              disabled={loading || !user || savingSetting === 'partnerActivityNotifications' || !user?.notificationsEnabled}
              trackColor={{ false: 'rgba(253,252,240,0.16)', true: colors.gold }}
              thumbColor={colors.neutral}
              ios_backgroundColor="rgba(253,252,240,0.16)"
              accessibilityLabel="Partner activity"
            />
          </View>

          <View style={styles.settingDivider} />

          <View style={styles.settingRow}>
            <View style={styles.settingTextWrap}>
              <Text style={styles.settingTitle}>Daily digest</Text>
              <Text style={styles.settingSubtitle}>
                Receive a daily summary of shared activities and milestones.
              </Text>
            </View>
            <Switch
              value={user?.dailyDigest ?? true}
              onValueChange={(v) => toggleSetting('dailyDigest', v)}
              disabled={loading || !user || savingSetting === 'dailyDigest' || !user?.notificationsEnabled}
              trackColor={{ false: 'rgba(253,252,240,0.16)', true: colors.gold }}
              thumbColor={colors.neutral}
              ios_backgroundColor="rgba(253,252,240,0.16)"
              accessibilityLabel="Daily digest"
            />
          </View>
        </View>

        {/* App settings */}
        <Text style={styles.sectionLabel}>APP PREFERENCES</Text>
        <View style={styles.settingsCard}>
          <View style={styles.settingRow}>
            <View style={styles.settingTextWrap}>
              <Text style={styles.settingTitle}>Sound effects</Text>
              <Text style={styles.settingSubtitle}>
                Play sounds for interactions like sending hugs and completing check-ins.
              </Text>
            </View>
            <Switch
              value={user?.soundEnabled ?? true}
              onValueChange={(v) => toggleSetting('soundEnabled', v)}
              disabled={loading || !user || savingSetting === 'soundEnabled'}
              trackColor={{ false: 'rgba(253,252,240,0.16)', true: colors.gold }}
              thumbColor={colors.neutral}
              ios_backgroundColor="rgba(253,252,240,0.16)"
              accessibilityLabel="Sound effects"
            />
          </View>

          <View style={styles.settingDivider} />

          <View style={styles.settingRow}>
            <View style={styles.settingTextWrap}>
              <Text style={styles.settingTitle}>Vibration</Text>
              <Text style={styles.settingSubtitle}>
                Enable haptic feedback for button presses and notifications.
              </Text>
            </View>
            <Switch
              value={user?.vibrationEnabled ?? true}
              onValueChange={(v) => toggleSetting('vibrationEnabled', v)}
              disabled={loading || !user || savingSetting === 'vibrationEnabled'}
              trackColor={{ false: 'rgba(253,252,240,0.16)', true: colors.gold }}
              thumbColor={colors.neutral}
              ios_backgroundColor="rgba(253,252,240,0.16)"
              accessibilityLabel="Vibration"
            />
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <LinkPartnerScreen
        visible={linkModalVisible}
        onClose={() => setLinkModalVisible(false)}
        onLinked={handleLinked}
      />

      <ChangePasswordScreen
        visible={passwordModalVisible}
        onClose={() => setPasswordModalVisible(false)}
      />
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(6, 18, 10, 0.45)',
  },
  safe: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  headerTransparent: { backgroundColor: 'transparent' },
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
    overflow: 'hidden',
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
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
  accountRow: {
    // Section label already provides the spacing above this row.
    marginTop: 0,
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
  bottomSpacer: {
    height: spacing.lg,
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
    marginTop: spacing.md,
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
