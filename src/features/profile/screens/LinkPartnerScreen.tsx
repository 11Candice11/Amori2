/**
 * LinkPartnerScreen — connect your account with your partner's.
 *
 * Flow:
 *   1. Enter your partner's account email and send a link request.
 *   2. Your partner sees the incoming request here and taps Accept.
 *   3. Once accepted, both accounts share one relationship, so check-ins
 *      and everything else are visible to each other.
 *
 * Rendered as a full-screen modal from ProfileScreen.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
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
import { DateTimeField, toIsoDate } from '../../../shared/components/inputs';
import { partnerLinkService } from '../services/partnerLinkService';
import { showSuccessOverlay } from '../../../shared/state/successOverlayStore';
import { showErrorOverlay } from '../../../shared/state/errorOverlayStore';
import { supportProfileStore } from '../../supportProfile/services/supportProfileStore';
import type {
  PartnerLinkRequestResponse,
  PartnerLinkStatusResponse,
} from '../../../services/api/types';

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Called after a successful link so parents can refresh their state. */
  onLinked?: () => void;
};

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function LinkPartnerScreen({ visible, onClose, onLinked }: Props) {
  const [status, setStatus] = useState<PartnerLinkStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [busyRequestId, setBusyRequestId] = useState<string | null>(null);
  const [unlinking, setUnlinking] = useState(false);
  /** Which incoming request is currently showing the start-date prompt. */
  const [pendingAcceptId, setPendingAcceptId] = useState<string | null>(null);
  /** The date the couple got together; picked, so it's always a real date. */
  const [startDate, setStartDate] = useState<Date | null>(null);
  /** A relationship can't have started in the future. */
  const today = useMemo(() => new Date(), []);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      setStatus(await partnerLinkService.getStatus());
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      setEmail('');
      setPendingAcceptId(null);
      setStartDate(null);
      loadStatus();
    }
  }, [visible, loadStatus]);

  const handleSend = useCallback(async () => {
    const trimmed = email.trim();
    if (!isValidEmail(trimmed)) {
      Alert.alert('Check the email', "Enter your partner's account email address.");
      return;
    }
    setSending(true);
    try {
      await partnerLinkService.sendRequest(trimmed);
      setEmail('');
      await loadStatus();
      showSuccessOverlay('Link request sent');
    } catch (err) {
      showErrorOverlay(messageFrom(err) || "Couldn't send link request");
    } finally {
      setSending(false);
    }
  }, [email, loadStatus]);

  // Tapping Accept reveals the start-date prompt for that request.
  const beginAccept = useCallback((request: PartnerLinkRequestResponse) => {
    setStartDate(null);
    setPendingAcceptId(request.id);
  }, []);

  const cancelAccept = useCallback(() => {
    setPendingAcceptId(null);
    setStartDate(null);
  }, []);

  const confirmAccept = useCallback(
    async (request: PartnerLinkRequestResponse) => {
      if (!startDate) {
        Alert.alert('Pick a date', 'Choose the date the two of you got together.');
        return;
      }
      const normalized = toIsoDate(startDate);
      setBusyRequestId(request.id);
      try {
        await partnerLinkService.acceptRequest(request.id, normalized);
        setPendingAcceptId(null);
        setStartDate(null);
        // The linked relationship just changed — drop any stale partner
        // Support Profile so the next view fetches the new partner's.
        supportProfileStore.invalidatePartner();
        await loadStatus();
        onLinked?.();
        Alert.alert(
          "You're linked",
          `You and ${request.otherPartyName ?? request.otherPartyEmail} are now connected.`,
        );
      } catch (err) {
        Alert.alert('Could not accept', messageFrom(err));
      } finally {
        setBusyRequestId(null);
      }
    },
    [startDate, loadStatus, onLinked],
  );

  const handleDecline = useCallback(
    async (request: PartnerLinkRequestResponse) => {
      setBusyRequestId(request.id);
      try {
        await partnerLinkService.declineRequest(request.id);
        await loadStatus();
      } catch (err) {
        Alert.alert('Could not decline', messageFrom(err));
      } finally {
        setBusyRequestId(null);
      }
    },
    [loadStatus],
  );

  const handleCancel = useCallback(
    async (request: PartnerLinkRequestResponse) => {
      setBusyRequestId(request.id);
      try {
        await partnerLinkService.cancelRequest(request.id);
        await loadStatus();
      } catch (err) {
        Alert.alert('Could not cancel', messageFrom(err));
      } finally {
        setBusyRequestId(null);
      }
    },
    [loadStatus],
  );

  const performUnlink = useCallback(async () => {
    setUnlinking(true);
    try {
      await partnerLinkService.unlink();
      // No partner anymore — clear the cached partner Support Profile so it
      // can't linger after unlinking.
      supportProfileStore.invalidatePartner();
      await loadStatus();
      onLinked?.();
      Alert.alert('Unlinked', 'You are no longer linked with your partner.');
    } catch (err) {
      Alert.alert('Could not unlink', messageFrom(err));
    } finally {
      setUnlinking(false);
    }
  }, [loadStatus, onLinked]);

  const handleUnlink = useCallback(() => {
    Alert.alert(
      'Unlink partner?',
      status?.partnerName
        ? `You'll no longer share check-ins and moments with ${status.partnerName}. Your shared history stays with them. You can link again later.`
        : "You'll no longer share check-ins and moments with your partner. You can link again later.",
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Unlink', style: 'destructive', onPress: () => { void performUnlink(); } },
      ],
    );
  }, [status?.partnerName, performUnlink]);

  const isLinked = status?.isLinked ?? false;
  const incoming = status?.incomingRequests ?? [];
  const outgoing = status?.outgoingRequests ?? [];

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaProvider>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <StatusBar barStyle="light-content" backgroundColor={colors.background} />

        <AppHeader title="Link to partner" onBack={onClose} showNotificationBell={false} />

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.gold} size="large" />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            {isLinked ? (
              <View style={styles.card}>
                <Text style={styles.linkedTitle}>You're linked</Text>
                <Text style={styles.bodyText}>
                  {status?.partnerName
                    ? `You're connected with ${status.partnerName}. Your check-ins and shared moments are visible to each other.`
                    : 'Your account is connected with your partner.'}
                </Text>
                <Pressable
                  style={({ pressed }) => [
                    styles.dangerButton,
                    pressed && styles.pressed,
                  ]}
                  onPress={handleUnlink}
                  disabled={unlinking}
                  accessibilityRole="button"
                  accessibilityLabel="Unlink from partner"
                >
                  {unlinking ? (
                    <ActivityIndicator color={colors.emergency} />
                  ) : (
                    <Text style={styles.dangerButtonText}>Unlink partner</Text>
                  )}
                </Pressable>
              </View>
            ) : (
              <>
                {/* Incoming requests take priority — accepting one links you. */}
                {incoming.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionLabel}>REQUESTS FOR YOU</Text>
                    {incoming.map((req) => (
                      <View key={req.id} style={styles.card}>
                        <Text style={styles.requestName}>
                          {req.otherPartyName ?? req.otherPartyEmail}
                        </Text>
                        {req.otherPartyName ? (
                          <Text style={styles.requestEmail}>{req.otherPartyEmail}</Text>
                        ) : null}
                        <Text style={styles.bodyText}>
                          wants to link their account with yours.
                        </Text>

                        {pendingAcceptId === req.id ? (
                          /* Ask when the relationship started so the dashboard
                             can count "days together". */
                          <View style={styles.dateBlock}>
                            <Text style={styles.helperText}>
                              When did you two get together? We'll use this to
                              count your days together.
                            </Text>
                            <DateTimeField
                              mode="date"
                              value={startDate}
                              onChange={setStartDate}
                              placeholder="Pick the date"
                              pickerTitle="When did you get together?"
                              maximumDate={today}
                              disabled={busyRequestId === req.id}
                              accessibilityLabel="Relationship start date"
                            />
                            <View style={styles.actionRow}>
                              <Pressable
                                style={({ pressed }) => [
                                  styles.primaryButton,
                                  pressed && styles.pressed,
                                ]}
                                onPress={() => confirmAccept(req)}
                                disabled={busyRequestId === req.id}
                                accessibilityRole="button"
                                accessibilityLabel="Confirm link and save start date"
                              >
                                {busyRequestId === req.id ? (
                                  <ActivityIndicator color={colors.ctaText} />
                                ) : (
                                  <Text style={styles.primaryButtonText}>
                                    Confirm
                                  </Text>
                                )}
                              </Pressable>
                              <Pressable
                                style={({ pressed }) => [
                                  styles.secondaryButton,
                                  pressed && styles.pressed,
                                ]}
                                onPress={cancelAccept}
                                disabled={busyRequestId === req.id}
                                accessibilityRole="button"
                                accessibilityLabel="Cancel"
                              >
                                <Text style={styles.secondaryButtonText}>
                                  Cancel
                                </Text>
                              </Pressable>
                            </View>
                          </View>
                        ) : (
                          <View style={styles.actionRow}>
                            <Pressable
                              style={({ pressed }) => [
                                styles.primaryButton,
                                pressed && styles.pressed,
                              ]}
                              onPress={() => beginAccept(req)}
                              disabled={busyRequestId === req.id}
                              accessibilityRole="button"
                              accessibilityLabel={`Accept link request from ${req.otherPartyName ?? req.otherPartyEmail}`}
                            >
                              <Text style={styles.primaryButtonText}>Accept</Text>
                            </Pressable>
                            <Pressable
                              style={({ pressed }) => [
                                styles.secondaryButton,
                                pressed && styles.pressed,
                              ]}
                              onPress={() => handleDecline(req)}
                              disabled={busyRequestId === req.id}
                              accessibilityRole="button"
                              accessibilityLabel={`Decline link request from ${req.otherPartyName ?? req.otherPartyEmail}`}
                            >
                              <Text style={styles.secondaryButtonText}>Decline</Text>
                            </Pressable>
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                )}

                {/* Send a new request */}
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>INVITE YOUR PARTNER</Text>
                  <Text style={styles.helperText}>
                    Enter the email your partner used to sign up. They'll get a
                    request to accept from their own device.
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="partner@email.com"
                    placeholderTextColor={colors.neutralSubtle}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    inputMode="email"
                    editable={!sending}
                    accessibilityLabel="Partner email address"
                  />
                  <Pressable
                    style={({ pressed }) => [
                      styles.primaryButton,
                      styles.fullWidth,
                      pressed && styles.pressed,
                    ]}
                    onPress={handleSend}
                    disabled={sending}
                    accessibilityRole="button"
                    accessibilityLabel="Send link request"
                  >
                    {sending ? (
                      <ActivityIndicator color={colors.ctaText} />
                    ) : (
                      <Text style={styles.primaryButtonText}>Send link request</Text>
                    )}
                  </Pressable>
                </View>

                {/* Outstanding requests you've sent */}
                {outgoing.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionLabel}>PENDING INVITES</Text>
                    {outgoing.map((req) => (
                      <View key={req.id} style={styles.card}>
                        <Text style={styles.requestName}>
                          {req.otherPartyName ?? req.otherPartyEmail}
                        </Text>
                        <Text style={styles.bodyText}>Waiting for them to accept.</Text>
                        <Pressable
                          style={({ pressed }) => [
                            styles.secondaryButton,
                            styles.fullWidth,
                            pressed && styles.pressed,
                          ]}
                          onPress={() => handleCancel(req)}
                          disabled={busyRequestId === req.id}
                          accessibilityRole="button"
                          accessibilityLabel={`Cancel invite to ${req.otherPartyEmail}`}
                        >
                          <Text style={styles.secondaryButtonText}>Cancel invite</Text>
                        </Pressable>
                      </View>
                    ))}
                  </View>
                )}
              </>
            )}
          </ScrollView>
        )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.headlineSm,
    color: colors.neutral,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: spacing.md,
    gap: spacing.lg,
  },
  section: {
    gap: spacing.sm,
  },
  sectionLabel: {
    ...typography.label,
    color: colors.neutralMuted,
    fontSize: 10,
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
    gap: spacing.sm,
  },
  linkedTitle: {
    ...typography.headlineSm,
    color: colors.gold,
  },
  requestName: {
    ...typography.bodySemiBold,
    color: colors.neutral,
    fontSize: 16,
  },
  requestEmail: {
    ...typography.body,
    color: colors.neutralMuted,
    fontSize: 13,
  },
  bodyText: {
    ...typography.body,
    color: colors.neutralMuted,
  },
  input: {
    ...typography.body,
    color: colors.neutral,
    backgroundColor: colors.surfaceCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  dateBlock: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  primaryButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.ctaBackground,
    borderRadius: 14,
    paddingVertical: spacing.md,
  },
  primaryButtonText: {
    ...typography.bodySemiBold,
    color: colors.ctaText,
    fontSize: 15,
  },
  secondaryButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
  },
  secondaryButtonText: {
    ...typography.bodySemiBold,
    color: colors.neutral,
    fontSize: 15,
  },
  fullWidth: {
    flex: 0,
    width: '100%',
  },
  dangerButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.emergencyBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(179,64,64,0.25)',
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  dangerButtonText: {
    ...typography.bodySemiBold,
    color: colors.emergency,
    fontSize: 15,
  },
  pressed: {
    opacity: 0.75,
  },
});
