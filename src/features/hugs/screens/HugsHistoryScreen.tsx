/**
 * HugsHistoryScreen — a gentle timeline of every hug shared in the relationship.
 * Sent hugs and received hugs are distinguished, whispers are shown inline, and
 * received hugs can be acknowledged.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, typography } from '../../../shared/theme';
import { AppHeader } from '../../../shared/components/header';
import type { HugStackParamList } from '../../../navigation/HugStackParamList';
import { authService } from '../../../services/auth/authService';
import { hugService } from '../services/hugService';
import type { HugResponse } from '../../../services/api/types';
import { HeartIcon, LeafIcon, WhisperIcon } from '../components/HugIcons';

type Nav = NativeStackNavigationProp<HugStackParamList, 'HugsHistory'>;

function formatRelative(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const diffMs = Date.now() - d.getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export function HugsHistoryScreen() {
  const navigation = useNavigation<Nav>();

  const [hugs, setHugs] = useState<HugResponse[]>([]);
  const [meId, setMeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acking, setAcking] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [me, list] = await Promise.all([
        authService.getMe().catch(() => null),
        hugService.getHugs(),
      ]);
      setMeId(me?.id ?? null);
      setHugs(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load your hugs.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const acknowledge = useCallback(async (hugId: string) => {
    setAcking(hugId);
    try {
      const updated = await hugService.acknowledge(hugId);
      setHugs(prev => prev.map(h => (h.id === updated.id ? updated : h)));
    } catch {
      /* leave state as-is; a failed ack is non-critical */
    } finally {
      setAcking(null);
    }
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      <AppHeader title="Our Hugs" onBack={() => navigation.goBack()} />

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.gold} size="large" /></View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}
        >
          <Text style={styles.intro}>Every hug you've held for each other.</Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {hugs.length === 0 && !error ? (
            <View style={styles.empty}>
              <HeartIcon color={colors.gold} size={36} />
              <Text style={styles.emptyTitle}>No hugs yet</Text>
              <Text style={styles.emptyBody}>When warmth is needed, it will gather here.</Text>
            </View>
          ) : (
            hugs.map(hug => {
              const sent = meId != null && hug.senderId === meId;
              const canAck = meId != null && hug.recipientId === meId && !hug.isAcknowledged;
              return (
                <View key={hug.id} style={styles.hugCard}>
                  <View style={styles.hugTop}>
                    <View style={[styles.dirDot, sent ? styles.dirDotSent : styles.dirDotReceived]} />
                    <Text style={styles.hugDir}>
                      {sent ? `You sent ${hug.recipientName || 'a hug'}` : `${hug.senderName || 'Partner'} sent you`} a hug
                    </Text>
                    <Text style={styles.hugTime}>{formatRelative(hug.createdAt)}</Text>
                  </View>

                  {hug.whisper ? (
                    <View style={styles.whisperRow}>
                      <WhisperIcon color={colors.gold} size={16} />
                      <Text style={styles.whisperText}>"{hug.whisper}"</Text>
                    </View>
                  ) : null}

                  <View style={styles.hugFoot}>
                    <View style={styles.hugFootStart}>
                      {hug.isAcknowledged ? (
                        <Text style={styles.ackDone}>♥ Held</Text>
                      ) : canAck ? (
                        <Pressable
                          style={styles.ackBtn}
                          onPress={() => acknowledge(hug.id)}
                          disabled={acking === hug.id}
                          android_ripple={{ color: 'rgba(197,163,101,0.15)' }}
                        >
                          {acking === hug.id
                            ? <ActivityIndicator color={colors.gold} size="small" />
                            : <Text style={styles.ackBtnText}>Hold this hug</Text>}
                        </Pressable>
                      ) : (
                        <Text style={styles.ackPending}>Waiting to be held</Text>
                      )}
                    </View>

                    {/* Lets the other partner join the same wall-clock rhythm. */}
                    <Pressable
                      style={styles.breatheLink}
                      onPress={() => navigation.navigate('BreatheTogether', {
                        hugId: hug.id,
                        anchorIso: hug.createdAt,
                        partnerName: sent ? hug.recipientName : hug.senderName,
                        isAcknowledged: hug.isAcknowledged,
                      })}
                      hitSlop={6}
                      accessibilityRole="button"
                      accessibilityLabel="Breathe together on this hug"
                      android_ripple={{ color: 'rgba(167,210,182,0.15)' }}
                    >
                      <LeafIcon color={colors.primaryLight} size={14} />
                      <Text style={styles.breatheLinkText}>Breathe together</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })
          )}

          <View style={{ height: spacing.xl }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  iconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  topTitle: { ...typography.headlineSm, color: colors.neutral, flex: 1, textAlign: 'center', fontSize: 18 },

  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  intro: { ...typography.body, color: colors.neutralMuted, marginBottom: spacing.md },
  error: { ...typography.bodySm, color: colors.emergency, marginBottom: spacing.md },

  empty: { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.sm },
  emptyTitle: { ...typography.headlineSm, color: colors.neutral },
  emptyBody: { ...typography.body, color: colors.neutralMuted, textAlign: 'center' },

  hugCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  hugTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dirDot: { width: 8, height: 8, borderRadius: 4 },
  dirDotSent: { backgroundColor: colors.gold },
  dirDotReceived: { backgroundColor: colors.primaryLight },
  hugDir: { ...typography.bodyMedium, color: colors.neutral, flex: 1, fontSize: 14 },
  hugTime: { ...typography.bodySm, color: colors.neutralSubtle, fontSize: 11 },

  whisperRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: spacing.sm },
  whisperText: { ...typography.body, color: colors.neutralMuted, fontStyle: 'italic', flex: 1, lineHeight: 22 },

  hugFoot: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  hugFootStart: { flexShrink: 1 },
  breatheLink: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
  breatheLinkText: { ...typography.bodySm, color: colors.primaryLight, fontSize: 12 },
  ackDone: { ...typography.label, color: colors.gold, fontSize: 11 },
  ackPending: { ...typography.bodySm, color: colors.neutralSubtle },
  ackBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(197,163,101,0.12)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(197,163,101,0.3)',
  },
  ackBtnText: { ...typography.bodySm, color: colors.gold },
});
