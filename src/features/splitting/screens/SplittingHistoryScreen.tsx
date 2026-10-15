/**
 * Screen — Grounding History.
 * A quiet record of the moments the person worked through: what was making
 * things harder, what they needed, and where they landed. Reads the sessions
 * the splitting flow already persists to /api/splitting/sessions.
 */
import React from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { SplittingStackParamList } from '../../../navigation/SplittingStackParamList';
import { colors, spacing, typography } from '../../../shared/theme';
import {
  SplittingHeader,
  StatusPill,
  SecondaryButton,
  NoteCallout,
  LeafIcon,
  DropIcon,
  AnchorIcon,
  CheckIcon,
  MoonIcon,
  RefreshIcon,
} from '../components';
import { useSplittingHistory } from '../hooks/useSplittingHistory';
import type {
  MoodType,
  SplittingAction,
  SplittingSession,
  SplittingSessionStatus,
} from '../types/splitting.types';

type Nav = NativeStackNavigationProp<SplittingStackParamList, 'SplittingHistory'>;

/** Gentle wording for each persisted mood. */
const MOOD_LABEL: Record<MoodType, string> = {
  Happy: 'Bright & light',
  Calm: 'Steadier & quieter',
  Anxious: 'Tender, still softening',
  Sad: 'Held gently',
  Angry: 'Cooling down',
  Overwhelmed: 'Holding space quietly',
  Numb: 'Slowly thawing',
  Other: 'Quietly present',
};

/** What each recorded action meant in the flow. */
const ACTION_LABEL: Record<SplittingAction, string> = {
  Reassurance: 'Reassurance',
  Cbt: 'Reframing',
  Grounding: 'Grounding',
  VoiceNote: 'Voice note',
  Distraction: 'Distraction',
  ContactPartner: 'Reached out',
  Space: 'Space',
};

const STATUS_LABEL: Record<SplittingSessionStatus, string> = {
  InProgress: 'In progress',
  Completed: 'Worked through',
  Cancelled: 'Stepped away',
};

/** "Just now" / "3h ago" / "12 Sep 2026" — local to splitting, no cross-feature import. */
function formatWhen(iso: string | null | undefined): string {
  if (!iso) return 'Date unknown';
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) return 'Date unknown';

  const diffMs = Date.now() - parsed;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return new Date(parsed).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function SplittingHistoryScreen() {
  const navigation = useNavigation<Nav>();
  const { sessions, loading, error, refresh } = useSplittingHistory();

  const completedCount = sessions.filter(s => s.status === 'Completed').length;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <SplittingHeader eyebrow="Grounding History" subtitle="Splitting Anchor" onBack={() => navigation.goBack()} />

      {loading && sessions.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.gold} size="large" />
        </View>
      ) : error && sessions.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>⚠</Text>
          <Text style={styles.emptyTitle}>Couldn't load your history</Text>
          <Text style={styles.emptyBody}>{error}</Text>
          <View style={styles.retryWrap}>
            <SecondaryButton
              label="Try again"
              icon={<RefreshIcon color={colors.primaryLight} size={16} />}
              onPress={refresh}
            />
          </View>
        </View>
      ) : sessions.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>🌿</Text>
          <Text style={styles.emptyTitle}>No grounding history yet</Text>
          <Text style={styles.emptyBody}>
            Once you work through a moment, it'll be quietly recorded here.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={refresh} tintColor={colors.gold} />
          }
        >
          <StatusPill
            label={`${completedCount} ${completedCount === 1 ? 'moment' : 'moments'} worked through`}
          />

          <Text style={styles.title}>Every time you paused, it counted.</Text>
          <Text style={styles.subtitle}>
            This is a record, not a report card. Nothing here needs fixing.
          </Text>

          {sessions.map((session, idx) => (
            <SessionCard key={session.id} session={session} isLatest={idx === 0} />
          ))}

          <NoteCallout icon={<LeafIcon color={colors.gold} size={18} />} style={styles.note}>
            <Text style={styles.noteBody}>
              Only you see this list. It's here so you can notice your own patterns gently, in your
              own time.
            </Text>
          </NoteCallout>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ─── Session card ───────────────────────────────────────────────────────────

function SessionCard({
  session,
  isLatest,
}: {
  session: SplittingSession;
  isLatest: boolean;
}) {
  const when = formatWhen(session.completedAt ?? session.createdAt);
  const feelings = session.feelingsSelected ?? [];
  const actions = session.actionsTaken ?? [];
  const isCancelled = session.status === 'Cancelled';

  return (
    <View style={[styles.card, isLatest && styles.cardLatest]}>
      <View style={styles.cardHead}>
        <View style={[styles.cardDot, isCancelled && styles.cardDotCancelled]} />
        <Text style={styles.cardWhen}>{when}</Text>
        <View style={[styles.cardStatus, isCancelled && styles.cardStatusCancelled]}>
          <Text style={[styles.cardStatusText, isCancelled && styles.cardStatusTextCancelled]}>
            {STATUS_LABEL[session.status]}
          </Text>
        </View>
      </View>

      {/* What was making things harder */}
      <DetailRow
        icon={<DropIcon color={colors.neutralMuted} size={14} />}
        label="What was heavy"
        value={feelings.length ? feelings.join(' · ') : 'Not named — and that was okay'}
      />

      {/* What they needed */}
      {session.whatINeed ? (
        <DetailRow
          icon={<CheckIcon color={colors.rhythmComplete} size={14} />}
          label="What they needed"
          value={session.whatINeed}
        />
      ) : null}

      {/* Mood transition */}
      {session.initialMood || session.finalMood ? (
        <DetailRow
          icon={<AnchorIcon color={colors.gold} size={14} />}
          label="Where it moved"
          value={moodJourney(session.initialMood, session.finalMood)}
        />
      ) : null}

      {/* Actions taken */}
      {actions.length ? (
        <View style={styles.actionWrap}>
          {actions.map(action => (
            <View key={action} style={styles.actionPill}>
              <Text style={styles.actionPillText}>{ACTION_LABEL[action] ?? action}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {isCancelled ? (
        <View style={styles.cancelledNote}>
          <MoonIcon color={colors.neutralSubtle} size={13} />
          <Text style={styles.cancelledText}>
            Stepped away before finishing. That's a valid choice too.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

/** "Holding space quietly → Steadier & quieter", or just one side if that's all we have. */
function moodJourney(initial: MoodType | null, final: MoodType | null): string {
  const from = initial ? MOOD_LABEL[initial] : null;
  const to = final ? MOOD_LABEL[final] : null;
  if (from && to) return `${from}  →  ${to}`;
  return to ?? from ?? '—';
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIcon}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={styles.detailLabel}>{label.toUpperCase()}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  content: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },

  title: {
    ...typography.headline,
    color: colors.neutral,
    marginTop: spacing.md,
    fontSize: 24,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    color: colors.neutralMuted,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    textAlign: 'center',
  },

  // empty / error
  emptyIcon: { fontSize: 40, marginBottom: spacing.sm },
  emptyTitle: { ...typography.headlineSm, color: colors.neutral, fontSize: 18, textAlign: 'center' },
  emptyBody: {
    ...typography.bodySm,
    color: colors.neutralMuted,
    textAlign: 'center',
    marginTop: spacing.xs,
    lineHeight: 19,
  },
  retryWrap: { marginTop: spacing.lg, alignSelf: 'stretch' },

  // card
  card: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  cardLatest: { borderColor: 'rgba(139,111,58,0.5)' },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.sm },
  cardDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.rhythmComplete },
  cardDotCancelled: { backgroundColor: colors.neutralSubtle },
  cardWhen: { ...typography.bodyMedium, color: colors.neutral, fontSize: 14, flex: 1 },
  cardStatus: {
    backgroundColor: 'rgba(6,78,59,0.6)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  cardStatusCancelled: { backgroundColor: 'rgba(255,255,255,0.06)' },
  cardStatusText: { ...typography.label, color: colors.primaryLight, fontSize: 9 },
  cardStatusTextCancelled: { color: colors.neutralSubtle },

  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(6,78,59,0.28)',
    borderRadius: 12,
    padding: spacing.sm,
    marginBottom: 8,
  },
  detailIcon: { width: 18, alignItems: 'center' },
  detailLabel: { ...typography.label, color: colors.neutralMuted, fontSize: 9 },
  detailValue: { ...typography.bodyMedium, color: colors.neutral, fontSize: 13, marginTop: 2 },

  actionWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  actionPill: {
    backgroundColor: 'rgba(139,111,58,0.14)',
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  actionPillText: { ...typography.label, color: colors.gold, fontSize: 9 },

  cancelledNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.sm,
  },
  cancelledText: { ...typography.bodySm, color: colors.neutralSubtle, fontSize: 11, flex: 1 },

  note: { marginTop: spacing.lg, backgroundColor: 'rgba(6,78,59,0.3)' },
  noteBody: { ...typography.bodySm, color: colors.neutralMuted, lineHeight: 18 },
});
