/**
 * Screen — Sanctuary Journal (flow completion).
 * "You made it through that moment." A gentle summary of the grounding
 * session with an option to save a quiet note and return to the sanctuary.
 */
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { SplittingStackParamList } from '../../../navigation/SplittingStackParamList';
import { colors, spacing, typography } from '../../../shared/theme';
import {
  SplittingHeader,
  PrimaryButton,
  SecondaryButton,
  DropIcon,
  HeartIcon,
  LeafIcon,
  AnchorIcon,
  CheckIcon,
} from '../components';
import { PARTNER_NAME, NEED_OPTIONS } from '../utils/splittingData';
import type { ClimateState, MoodType, SplittingSession } from '../types/splitting.types';
import { EMPTY_FLOW_STATE, CLIMATE_TO_MOOD } from '../types/splitting.types';
import { useSplittingSession } from '../hooks/useSplittingSession';
import { splittingService } from '../services/splittingService';

type Nav = NativeStackNavigationProp<SplittingStackParamList, 'SanctuaryJournal'>;
type Rt = RouteProp<SplittingStackParamList, 'SanctuaryJournal'>;

const CLIMATE_GROUND: Record<ClimateState, string> = {
  steadier: 'Steadier & Quieter',
  same: 'Holding Space Quietly',
  worse: 'Still Raw, Held Gently',
};

const MOOD_GROUND: Record<MoodType, string> = {
  Happy: 'Bright & Light',
  Calm: 'Steadier & Quieter',
  Anxious: 'Softening, Still Tender',
  Sad: 'Held Gently',
  Angry: 'Cooling Down',
  Overwhelmed: 'Holding Space Quietly',
  Numb: 'Slowly Thawing',
  Other: 'Quietly Present',
};

export function SanctuaryJournalScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const flow = route.params?.flow ?? EMPTY_FLOW_STATE;

  const { session, complete, update, pending, error } = useSplittingSession();
  const [completed, setCompleted] = useState(false);
  // Set when the session turned out to be already finished — not a real failure,
  // so we don't show the person an error for a record that is safely saved.
  const [alreadySaved, setAlreadySaved] = useState<SplittingSession | null>(null);
  const completeStarted = useRef(false);

  // Quiet-note composer: tapping the row expands an inline text box the person
  // can type a private reflection into and save onto their grounding session.
  const [noteExpanded, setNoteExpanded] = useState(false);
  const [note, setNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);

  const sessionId = flow.sessionId;
  const climate = flow.climate;

  // Close out the persisted session once, when the journal opens. This is the
  // point the flow becomes history, so we make sure the final mood is on the
  // record even if the person reached the journal without a transition check.
  useEffect(() => {
    if (completeStarted.current || !sessionId) return;
    completeStarted.current = true;

    // Only finalMood is sent: actionsTaken was already merged by earlier steps
    // and completing with a fresh array would replace (not extend) it.
    complete(sessionId, climate ? { finalMood: CLIMATE_TO_MOOD[climate] } : {}).then(result => {
      if (result) {
        setCompleted(true);
        return;
      }
      // The backend rejects completing a session that isn't in progress. If it
      // was already completed (e.g. this screen was revisited), the record is
      // fine — reflect that instead of surfacing a scary error.
      splittingService
        .getSession(sessionId)
        .then(existing => {
          if (existing.status !== 'InProgress') {
            setAlreadySaved(existing);
            setCompleted(true);
          }
        })
        .catch(() => {
          /* leave the original error visible */
        });
    });
  }, [sessionId, climate, complete]);

  const summary = deriveSummary(flow, session ?? alreadySaved);
  const showError = Boolean(error) && !completed;

  const handleSaveNote = async () => {
    const trimmed = note.trim();
    if (!sessionId || !trimmed || savingNote) return;
    setSavingNote(true);
    const result = await update(sessionId, { description: trimmed });
    setSavingNote(false);
    if (result) {
      setNoteSaved(true);
      setNoteExpanded(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <SplittingHeader eyebrow="Sanctuary Journal" subtitle="Splitting Anchor" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.badge}>
          <DropIcon color={colors.tertiary} size={22} />
        </View>

        <Text style={styles.title}>You made it through that moment.</Text>
        <Text style={styles.subtitle}>
          You don't need to have everything figured out. Taking care of yourself was enough today.
        </Text>

        <View style={styles.sentCard}>
          <View style={styles.sentHead}>
            <View style={styles.sentAvatar}>
              <HeartIcon color={colors.emergency} size={14} />
            </View>
            <Text style={styles.sentLabel}>Quiet update sent</Text>
            <Text style={styles.sentTime}>· Just now</Text>
          </View>
          <Text style={styles.sentBody}>
            {PARTNER_NAME} was notified with gentle warmth. They know you took time for yourself and love you unconditionally.
          </Text>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryHead}>
            <LeafIcon color={colors.gold} size={18} />
            <Text style={styles.summaryTitle}>Grounding Summary</Text>
            <View style={styles.summaryPill}>
              {pending && !completed ? (
                <ActivityIndicator color={colors.primaryLight} size="small" />
              ) : (
                <Text style={styles.summaryPillText}>{completed ? 'Session saved' : 'Intentional care'}</Text>
              )}
            </View>
          </View>

          <SummaryRow
            label="Starting state"
            value={summary.startingState}
            icon={<DropIcon color={colors.neutralMuted} size={14} />}
          />
          <SummaryRow
            label="Path chosen"
            value={summary.pathChosen}
            icon={<CheckIcon color={colors.rhythmComplete} size={14} />}
          />
          <SummaryRow
            label="Current ground"
            value={summary.currentGround}
            icon={<AnchorIcon color={colors.gold} size={14} />}
          />

          {showError ? <Text style={styles.summaryError}>{error}</Text> : null}

          <Text style={styles.summaryQuote}>
            "Honor the space you made between the feeling and the reaction."
          </Text>
        </View>

        <View style={styles.saveNoteCard}>
          <Pressable
            style={styles.saveNoteRow}
            accessibilityRole="button"
            accessibilityLabel="Save a quiet note to Hearth Journal"
            accessibilityState={{ expanded: noteExpanded }}
            onPress={() => setNoteExpanded(prev => !prev)}
            android_ripple={{ color: 'rgba(139,111,58,0.1)' }}
          >
            <LeafIcon color={colors.gold} size={16} />
            <Text style={styles.saveNoteText}>
              {noteSaved ? 'Quiet Note Saved to Hearth Journal' : 'Save a Quiet Note to Hearth Journal'}
            </Text>
            <Text style={[styles.chev, noteExpanded && styles.chevOpen]}>⌄</Text>
          </Pressable>

          {noteExpanded ? (
            <View style={styles.noteBody}>
              <TextInput
                style={styles.noteInput}
                value={note}
                onChangeText={text => {
                  setNote(text);
                  if (noteSaved) setNoteSaved(false);
                }}
                placeholder="Write a quiet note to yourself…"
                placeholderTextColor={colors.neutralSubtle}
                multiline
                textAlignVertical="top"
                accessibilityLabel="Quiet note"
              />
              <Pressable
                style={[
                  styles.noteSaveBtn,
                  (!note.trim() || savingNote) && styles.noteSaveBtnDisabled,
                ]}
                onPress={handleSaveNote}
                disabled={!note.trim() || savingNote}
                accessibilityRole="button"
                accessibilityLabel="Save note"
                android_ripple={{ color: 'rgba(10,20,15,0.2)' }}
              >
                {savingNote ? (
                  <ActivityIndicator color={colors.ctaText} size="small" />
                ) : (
                  <Text style={styles.noteSaveBtnText}>Save Note</Text>
                )}
              </Pressable>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <SecondaryButton
          label="View Grounding History"
          icon={<LeafIcon color={colors.primaryLight} size={16} />}
          onPress={() => navigation.navigate('SplittingHistory')}
        />
        <PrimaryButton
          label="Back to Amori Sanctuary"
          icon={<AnchorIcon color={colors.ctaText} size={16} />}
          onPress={() => navigation.popToTop()}
        />
        <Text style={styles.footerNote}>Safe space history saved securely to your shared sanctuary</Text>
      </View>
    </SafeAreaView>
  );
}

/**
 * Build the summary rows, preferring the persisted session (source of truth)
 * and falling back to the in-flight flow selections while it's still loading.
 */
function deriveSummary(
  flow: typeof EMPTY_FLOW_STATE & { need?: string; climate?: ClimateState; spaceDuration?: unknown },
  session: SplittingSession | null,
) {
  const feelings = session?.feelingsSelected ?? [];
  const startingState = feelings.length
    ? feelings.slice(0, 2).join(' & ')
    : flow.triggers.length
    ? `${flow.triggers.length} ${flow.triggers.length === 1 ? 'trigger' : 'triggers'} noted`
    : 'Overwhelmed & Spiked tension';

  const needTitle = flow.need ? NEED_OPTIONS.find(n => n.id === flow.need)?.title : undefined;
  const pathChosen =
    session?.whatINeed ??
    (needTitle === 'Space' || flow.spaceDuration
      ? '5-Minute Box Breathing & Sanctuary'
      : needTitle
      ? `${needTitle} & Sanctuary`
      : 'Grounding & Sanctuary');

  const currentGround = session?.finalMood
    ? MOOD_GROUND[session.finalMood]
    : flow.climate
    ? CLIMATE_GROUND[flow.climate]
    : 'Steadier & Quieter';

  return { startingState, pathChosen, currentGround };
}

function SummaryRow({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <View style={styles.summaryRow}>
      <View style={styles.summaryRowIcon}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={styles.summaryRowLabel}>{label.toUpperCase()}</Text>
        <Text style={styles.summaryRowValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl, alignItems: 'stretch' },
  badge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(6,78,59,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(139,111,58,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: spacing.lg,
  },
  title: { ...typography.headline, color: colors.tertiary, textAlign: 'center', marginTop: spacing.md, fontSize: 26 },
  subtitle: { ...typography.body, color: colors.neutralMuted, textAlign: 'center', marginTop: spacing.sm },

  sentCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  sentHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sentAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(224,122,95,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sentLabel: { ...typography.label, color: colors.gold, fontSize: 10 },
  sentTime: { ...typography.bodySm, color: colors.neutralSubtle, fontSize: 11 },
  sentBody: { ...typography.bodySm, color: colors.neutralMuted, marginTop: spacing.sm, lineHeight: 19 },

  summaryCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  summaryHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.md },
  summaryTitle: { ...typography.headlineSm, color: colors.neutral, fontSize: 18, flex: 1 },
  summaryPill: { backgroundColor: 'rgba(6,78,59,0.6)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  summaryPillText: { ...typography.bodySm, color: colors.primaryLight, fontSize: 10 },

  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(6,78,59,0.28)',
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: 8,
  },
  summaryRowIcon: { width: 20, alignItems: 'center' },
  summaryRowLabel: { ...typography.label, color: colors.neutralMuted, fontSize: 9 },
  summaryRowValue: { ...typography.bodyMedium, color: colors.neutral, fontSize: 14, marginTop: 2 },
  summaryQuote: { ...typography.bodySm, color: colors.neutralMuted, fontStyle: 'italic', textAlign: 'center', marginTop: spacing.sm, lineHeight: 18 },
  summaryError: { ...typography.bodySm, color: colors.emergency, textAlign: 'center', marginTop: spacing.sm },

  saveNoteCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    marginTop: spacing.md,
    overflow: 'hidden',
  },
  saveNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: spacing.md,
  },
  saveNoteText: { ...typography.bodyMedium, color: colors.neutral, flex: 1, fontSize: 14 },
  chev: { ...typography.body, color: colors.neutralMuted },
  chevOpen: { transform: [{ rotate: '180deg' }] },

  noteBody: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  noteInput: {
    ...typography.body,
    color: colors.neutral,
    minHeight: 96,
    backgroundColor: 'rgba(6,78,59,0.28)',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
    lineHeight: 22,
  },
  noteSaveBtn: {
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.ctaBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteSaveBtnDisabled: { opacity: 0.5 },
  noteSaveBtnText: { ...typography.bodySemiBold, color: colors.ctaText, fontSize: 15 },

  bottomBar: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  footerNote: { ...typography.bodySm, color: colors.neutralSubtle, textAlign: 'center', fontSize: 11 },
});
