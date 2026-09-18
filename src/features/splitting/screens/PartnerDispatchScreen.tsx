/**
 * Screen — Partner Sanctuary Dispatch (the partner's view).
 * How the partner experiences the moment: what's being asked for, the anchor
 * guidance, and quiet, non-demanding ways to send grounding.
 *
 * Names and the requested care preference are wired to real data — the current
 * (grounding) user's display name and their partner's name come from the
 * backend via useSanctuaryIdentity, and the "requested" line + space message
 * are derived from the selections the person actually made in this flow.
 */
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { SplittingStackParamList } from '../../../navigation/SplittingStackParamList';
import { colors, spacing, typography } from '../../../shared/theme';
import {
  SplittingHeader,
  PrimaryButton,
  ShieldIcon,
  HeartIcon,
  MoonIcon,
  LeafIcon,
  CheckIcon,
} from '../components';
import { PARTNER_NAME, NEED_OPTIONS, PREWRITTEN_SPACE_MESSAGE } from '../utils/splittingData';
import { EMPTY_FLOW_STATE } from '../types/splitting.types';
import type { SpaceDuration, SupportNeed } from '../types/splitting.types';
import { useSanctuaryIdentity } from '../hooks/useSanctuaryIdentity';
import { useCountdown } from '../hooks/useCountdown';
import { useSpaceWindow } from '../hooks/useSpaceWindow';
import { hugService } from '../../hugs/services/hugService';

type Nav = NativeStackNavigationProp<SplittingStackParamList, 'PartnerDispatch'>;
type Rt = RouteProp<SplittingStackParamList, 'PartnerDispatch'>;

/** Human-readable window for a chosen space duration. */
const SPACE_DURATION_LABEL: Record<SpaceDuration, string> = {
  '15m': '15 minutes',
  '30m': '30 minutes',
  '1h': '1 hour',
  later: 'Open-ended',
};

/** Short care-preference summary shown as the "requested" line. */
const NEED_REQUEST_LABEL: Record<SupportNeed, string> = {
  space: 'Space & Quiet Reassurance',
  reassurance: 'Gentle Reassurance',
  distraction: 'A Gentle Distraction',
  support: 'Quiet Presence & Support',
};

export function PartnerDispatchScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const flow = route.params?.flow ?? EMPTY_FLOW_STATE;

  const { userName, partnerName } = useSanctuaryIdentity();

  // Live self-regulation window (only when a fixed space duration was set).
  // Hydrates from the backend session so it survives restart.
  const spaceEndsAt = useSpaceWindow(flow);
  const window = useCountdown(spaceEndsAt);

  // Quiet-send state: each action fires a real hug (optionally with a whisper)
  // via the hug service, so these buttons actually reach the partner.
  const [hugSent, setHugSent] = useState(false);
  const [whisperSent, setWhisperSent] = useState(false);
  const [vaultSent, setVaultSent] = useState(false);
  const [sending, setSending] = useState<null | 'hug' | 'whisper' | 'vault'>(null);

  const sendQuiet = async (
    kind: 'hug' | 'whisper' | 'vault',
    whisper: string | null,
    markSent: (v: boolean) => void,
  ) => {
    if (sending) return;
    setSending(kind);
    try {
      await hugService.sendHug(whisper);
      markSent(true);
    } catch {
      // Keep the flow calm — surface nothing intrusive, just leave it unsent
      // so the user can try again.
    } finally {
      setSending(null);
    }
  };

  // Fall back gently while names load / if a call failed, so the screen never
  // shows an empty name or breaks mid-grounding.
  const self = userName || 'Your partner';
  const partner = partnerName || PARTNER_NAME;

  // Care preference + space message derived from the person's real selections.
  const requestedCare = flow.need
    ? NEED_REQUEST_LABEL[flow.need]
    : 'Quiet Presence & Support';

  const needTitle = flow.need
    ? NEED_OPTIONS.find(n => n.id === flow.need)?.title ?? 'Support'
    : 'Support';

  const spaceLabel = flow.spaceDuration
    ? SPACE_DURATION_LABEL[flow.spaceDuration]
    : null;

  const spaceMessage = useMemo(() => {
    if (spaceLabel && flow.spaceDuration !== 'later') {
      return `${self} is taking a little space right now (${spaceLabel}). They'll reach out when they're ready. You're okay.`;
    }
    return PREWRITTEN_SPACE_MESSAGE;
  }, [self, spaceLabel, flow.spaceDuration]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <SplittingHeader
        eyebrow="Connection Bridge"
        onBack={() => navigation.goBack()}
        partnerChipLabel={partner}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.dispatchHead}>
          <Text style={styles.dispatchEyebrow}>Partner Sanctuary Dispatch</Text>
          <View style={styles.livePill}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>Live Sync</Text>
          </View>
        </View>

        <Text style={styles.title}>{self} is taking care of themselves.</Text>
        <Text style={styles.subtitle}>Their anchor is holding. You are their safe harbor.</Text>

        <View style={styles.protocolCard}>
          <View style={styles.protocolHead}>
            <ShieldIcon color={colors.gold} size={16} />
            <Text style={styles.protocolLabel}>Safe space protocol active</Text>
          </View>
          <Text style={styles.protocolRequest}>{self} requested: {requestedCare}</Text>
          {window.active ? (
            <View style={styles.windowRow}>
              <MoonIcon color={colors.primaryLight} size={14} />
              <Text style={styles.windowText}>Self-Regulation Window</Text>
              <Text style={styles.windowTime}>
                {window.finished ? 'Complete' : `${window.label} remaining`}
              </Text>
            </View>
          ) : spaceLabel ? (
            <View style={styles.windowRow}>
              <MoonIcon color={colors.primaryLight} size={14} />
              <Text style={styles.windowText}>Self-Regulation Window</Text>
              <Text style={styles.windowTime}>{spaceLabel}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.privacyRow}>
          <ShieldIcon color={colors.neutralMuted} size={14} />
          <Text style={styles.privacyText}>
            Privacy Safeguard: {self}'s triggers and reflections remain strictly confidential. Only their selected care preference is shared with you.
          </Text>
        </View>

        <View style={styles.signalsHead}>
          <Text style={styles.signalsLabel}>What's being shared</Text>
        </View>

        <View style={styles.signalCard}>
          <View style={styles.signalTop}>
            <MoonIcon color={colors.gold} size={16} />
            <Text style={styles.signalTitle}>{needTitle} Requested</Text>
            {spaceLabel ? <Text style={styles.signalMeta}>{spaceLabel}</Text> : null}
          </View>
          <Text style={styles.signalQuote}>"{spaceMessage}"</Text>
        </View>

        <View style={styles.signalCard}>
          <View style={styles.signalTop}>
            <HeartIcon color={colors.emergency} size={16} />
            <Text style={styles.signalTitle}>Tethering Signal</Text>
            <View style={styles.quietPill}>
              <Text style={styles.quietPillText}>Quiet Hug</Text>
            </View>
          </View>
          <Text style={styles.signalQuote}>
            "I don't need you to fix anything. I just need you to stay with me."
          </Text>
          <View style={styles.signalFoot}>
            <Text style={styles.signalFootText}>No reply urgency needed</Text>
          </View>
        </View>

        <View style={styles.guidanceCard}>
          <View style={styles.guidanceHead}>
            <LeafIcon color={colors.gold} size={16} />
            <Text style={styles.guidanceTitle}>Anchor Guidance for {partner}</Text>
          </View>
          <Text style={styles.guidanceBody}>
            What {self} needs most right now: patient silence, steady ground, and zero interrogation. Your calm stability is their strongest beacon.
          </Text>
        </View>

        <Text style={styles.sendLabel}>Quietly send grounding</Text>
        <PrimaryButton
          label={hugSent ? 'Warm hug sent' : sending === 'hug' ? 'Sending…' : 'Send Warm Hug'}
          icon={hugSent ? <CheckIcon color={colors.ctaText} size={16} /> : <HeartIcon color={colors.ctaText} size={16} />}
          onPress={() => sendQuiet('hug', null, setHugSent)}
        />

        <View style={styles.quietGrid}>
          <Pressable
            style={[styles.quietTile, whisperSent && styles.quietTileSent]}
            accessibilityRole="button"
            accessibilityLabel="Send a quiet whisper"
            accessibilityState={{ disabled: whisperSent || sending === 'whisper' }}
            disabled={whisperSent || sending === 'whisper'}
            onPress={() => sendQuiet('whisper', 'I’m here with you.', setWhisperSent)}
          >
            <Text style={styles.quietTileTitle}>
              {whisperSent ? 'Whisper sent' : sending === 'whisper' ? 'Sending…' : 'Whisper…'}
            </Text>
            <Text style={styles.quietTileSub}>{whisperSent ? '“I’m here with you.”' : 'Non-demanding'}</Text>
          </Pressable>
          <Pressable
            style={[styles.quietTile, vaultSent && styles.quietTileSent]}
            accessibilityRole="button"
            accessibilityLabel="Send a vault note"
            accessibilityState={{ disabled: vaultSent || sending === 'vault' }}
            disabled={vaultSent || sending === 'vault'}
            onPress={() => sendQuiet('vault', 'I love you, deeply.', setVaultSent)}
          >
            <Text style={styles.quietTileTitle}>
              {vaultSent ? 'Note sent' : sending === 'vault' ? 'Sending…' : 'Vault Note'}
            </Text>
            <Text style={styles.quietTileSub}>“I love you, deeply.”</Text>
          </Pressable>
        </View>

        <View style={styles.presenceCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.presenceTitle}>I'm Here (Quiet Presence)</Text>
            <Text style={styles.presenceSub}>Keeps a soft green pulse glowing on {self}'s screen</Text>
          </View>
          <View style={styles.transmitPill}>
            <Text style={styles.transmitText}>Transmitting</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <PrimaryButton label="Continue" withArrow onPress={() => navigation.navigate('SanctuaryJournal', { flow })} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  dispatchHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm },
  dispatchEyebrow: { ...typography.label, color: colors.gold, fontSize: 10 },
  livePill: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.rhythmComplete },
  liveText: { ...typography.bodySm, color: colors.neutralMuted, fontSize: 11 },

  title: { ...typography.headline, color: colors.neutral, marginTop: spacing.sm, fontSize: 26 },
  subtitle: { ...typography.body, color: colors.neutralMuted, marginTop: spacing.sm },

  protocolCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  protocolHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  protocolLabel: { ...typography.label, color: colors.gold, fontSize: 10, flex: 1 },
  protocolRequest: { ...typography.bodyMedium, color: colors.neutral, marginTop: spacing.sm, fontSize: 15 },
  windowRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: spacing.md },
  windowText: { ...typography.bodySm, color: colors.neutralMuted, flex: 1 },
  windowTime: { ...typography.bodySm, color: colors.gold, fontSize: 12 },

  privacyRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginTop: spacing.md },
  privacyText: { ...typography.bodySm, color: colors.neutralSubtle, flex: 1, fontSize: 11, lineHeight: 16 },

  signalsHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.lg, marginBottom: spacing.sm },
  signalsLabel: { ...typography.label, color: colors.neutralMuted },

  signalCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: 12,
  },
  signalTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  signalTitle: { ...typography.bodyMedium, color: colors.neutral, fontSize: 14, flex: 1 },
  signalMeta: { ...typography.bodySm, color: colors.neutralMuted, fontSize: 11 },
  signalQuote: { ...typography.headlineSm, color: colors.neutral, fontSize: 16, lineHeight: 23, marginTop: spacing.sm, fontStyle: 'italic' },
  signalFoot: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.md },
  signalFootText: { ...typography.bodySm, color: colors.neutralMuted, flex: 1, fontSize: 12 },
  quietPill: { backgroundColor: 'rgba(224,122,95,0.16)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  quietPillText: { ...typography.label, color: colors.emergency, fontSize: 9 },

  guidanceCard: {
    backgroundColor: 'rgba(197,163,101,0.08)',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(197,163,101,0.2)',
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  guidanceHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  guidanceTitle: { ...typography.label, color: colors.gold, fontSize: 11 },
  guidanceBody: { ...typography.bodySm, color: colors.neutralMuted, marginTop: spacing.sm, lineHeight: 19 },

  sendLabel: { ...typography.label, color: colors.neutralMuted, marginTop: spacing.lg, marginBottom: spacing.sm },
  quietGrid: { flexDirection: 'row', gap: 12, marginTop: 12 },
  quietTile: {
    flex: 1,
    backgroundColor: colors.surfaceCard,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
  },
  quietTileSent: { borderColor: colors.gold, backgroundColor: 'rgba(197,163,101,0.1)' },
  quietTileTitle: { ...typography.bodyMedium, color: colors.neutral, fontSize: 14 },
  quietTileSub: { ...typography.bodySm, color: colors.neutralMuted, marginTop: 3 },

  presenceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(6,78,59,0.3)',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: 12,
  },
  presenceTitle: { ...typography.bodyMedium, color: colors.neutral, fontSize: 14 },
  presenceSub: { ...typography.bodySm, color: colors.neutralMuted, marginTop: 2 },
  transmitPill: { backgroundColor: 'rgba(167,210,182,0.16)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  transmitText: { ...typography.bodySm, color: colors.rhythmComplete, fontSize: 11 },

  bottomBar: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
});
