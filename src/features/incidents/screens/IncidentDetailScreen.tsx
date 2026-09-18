import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import type { IncidentStackParamList } from '../../../navigation/IncidentStackParamList';
import { colors, spacing, typography } from '../../../shared/theme';
import { IncidentScreenHeader } from '../components/IncidentScreenHeader';
import { StatusBadge, PriorityBadge, CategoryBadge } from '../components/IncidentBadges';
import { SlaCard } from '../components/SlaCard';
import { EmptyState } from '../components/EmptyState';
import { useIncidentDetail } from '../hooks/useIncidentDetail';
import { useIncidentSla } from '../hooks/useIncidentSla';
import { useIncidentConversation } from '../hooks/useIncidentConversation';
import { useIncidentHistory } from '../hooks/useIncidentHistory';
import { incidentService } from '../services/incidentService';
import { authService } from '../../../services/auth/authService';
import { friendlyError, formatDateTime, formatRelativeDate } from '../utils/errorMessages';
import type { IncidentStatus } from '../types/incident.types';

type Nav = NativeStackNavigationProp<IncidentStackParamList, 'IncidentDetail'>;
type Route = NativeStackScreenProps<IncidentStackParamList, 'IncidentDetail'>['route'];
type TabKey = 'overview' | 'conversation' | 'details' | 'history' | 'resolution';

const STATUS_STEPS: IncidentStatus[] = ['Open', 'Assigned', 'Investigating', 'AwaitingResponse', 'Resolved', 'Closed'];

function StatusStepper({ current }: { current: IncidentStatus }) {
  const idx = STATUS_STEPS.indexOf(current === 'Reopened' ? 'Investigating' : current);
  return (
    <View style={stepStyles.root}>
      {STATUS_STEPS.map((s, i) => (
        <React.Fragment key={s}>
          <View style={[stepStyles.node, i <= idx && stepStyles.nodeActive]}>
            <Text style={stepStyles.nodeText}>{i + 1}</Text>
          </View>
          {i < STATUS_STEPS.length - 1 && (
            <View style={[stepStyles.line, i < idx && stepStyles.lineActive]} />
          )}
        </React.Fragment>
      ))}
    </View>
  );
}

const stepStyles = StyleSheet.create({
  root: { flexDirection: 'row', alignItems: 'center', marginVertical: spacing.md },
  node: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1.5, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  nodeActive: { borderColor: colors.gold, backgroundColor: 'rgba(197,163,101,0.15)' },
  nodeText: { ...typography.label, color: colors.neutralMuted, fontSize: 8 },
  line: { flex: 1, height: 1.5, backgroundColor: colors.border },
  lineActive: { backgroundColor: colors.gold },
});

export function IncidentDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { incidentId } = route.params;
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const { incident, loading, error, refresh } = useIncidentDetail(incidentId);
  const { sla, remainingSeconds } = useIncidentSla(incidentId);
  const { items: convItems, refresh: refreshConv } = useIncidentConversation(incidentId);
  const { entries: histEntries, refresh: refreshHist } = useIncidentHistory(incidentId);

  // Re-fetch conversation + history whenever the screen regains focus, e.g. after
  // returning from the Add Note / Add Response screens, so new items show up.
  useFocusEffect(
    useCallback(() => {
      refreshConv();
      refreshHist();
    }, [refreshConv, refreshHist]),
  );

  const doAction = useCallback(async (fn: () => Promise<unknown>) => {
    setActionLoading(true);
    setActionError(null);
    try {
      await fn();
      refresh();
      refreshHist();
    } catch (err) {
      setActionError(friendlyError(err));
    } finally {
      setActionLoading(false);
    }
  }, [refresh, refreshHist]);

  if (loading && !incident) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <IncidentScreenHeader title="Incident" onBack={() => navigation.goBack()} />
        <View style={styles.center}><ActivityIndicator color={colors.gold} size="large" /></View>
      </SafeAreaView>
    );
  }

  if (error && !incident) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <IncidentScreenHeader title="Incident" onBack={() => navigation.goBack()} />
        <EmptyState icon="⚠" title="Couldn't load incident" message={friendlyError(error)} ctaLabel="Retry" onCta={refresh} />
      </SafeAreaView>
    );
  }

  if (!incident) return null;

  const incNum = `#${incident.id.slice(0, 8).toUpperCase()}`;
  const tabs: Array<{ key: TabKey; label: string }> = [
    { key: 'overview', label: 'Overview' },
    { key: 'conversation', label: `Conversation${convItems.length > 0 ? ` ${convItems.length}` : ''}` },
    { key: 'details', label: 'Details' },
    { key: 'history', label: 'History' },
    ...(incident.status === 'Resolved' || incident.status === 'Closed'
      ? [{ key: 'resolution' as TabKey, label: 'Resolution' }]
      : []),
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <IncidentScreenHeader
        title="Ticket Detail"
        subtitle={`${incNum} · ${incident.status}`}
        onBack={() => navigation.goBack()}
      />

      {/* Top badges */}
      <View style={styles.topBadges}>
        <Text style={styles.incNum}>{incNum}</Text>
        <StatusBadge status={incident.status} />
        <PriorityBadge priority={incident.priority} />
      </View>

      {/* Title */}
      <View style={styles.titleRow}>
        <Text style={styles.incTitle}>{incident.title}</Text>
      </View>

      {/* Assigned / Due row */}
      <View style={styles.metaRow}>
        <Text style={styles.metaText}>
          {incident.assignedTo ? `Assigned: ${incident.assignedTo.name}` : 'Unassigned'}
        </Text>
        {incident.dueAt ? (
          <Text style={styles.metaText}>Due: {formatDateTime(incident.dueAt)}</Text>
        ) : null}
      </View>

      {/* Tab bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBar}>
        {tabs.map(t => (
          <Pressable
            key={t.key}
            style={[styles.tabBtn, activeTab === t.key && styles.tabBtnActive]}
            onPress={() => setActiveTab(t.key)}
            android_ripple={{ color: 'rgba(197,163,101,0.1)' }}
          >
            <Text style={[styles.tabBtnText, activeTab === t.key && styles.tabBtnTextActive]}>{t.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.tabContent} showsVerticalScrollIndicator={false}>

        {/* ── Overview tab ── */}
        {activeTab === 'overview' && (
          <View>
            {/* Description */}
            {incident.description ? (
              <View style={styles.card}>
                <Text style={styles.cardLabel}>Discrepancy Narrative</Text>
                <Text style={styles.cardBody}>{incident.description}</Text>
              </View>
            ) : null}

            {/* SLA */}
            {sla ? <SlaCard sla={sla} remainingSeconds={remainingSeconds} /> : null}

            {/* Incident matrix */}
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Incident Matrix</Text>
              <View style={styles.matrixGrid}>
                <View style={styles.matrixCell}>
                  <Text style={styles.matrixKey}>Reported By</Text>
                  <Text style={styles.matrixVal}>{incident.reportedBy.name}</Text>
                </View>
                <View style={styles.matrixCell}>
                  <Text style={styles.matrixKey}>Assigned To</Text>
                  <Text style={styles.matrixVal}>{incident.assignedTo?.name ?? '—'}</Text>
                </View>
                <View style={styles.matrixCell}>
                  <Text style={styles.matrixKey}>Impact</Text>
                  <Text style={[styles.matrixVal, { color: colors.gold }]}>{incident.impact}</Text>
                </View>
                <View style={styles.matrixCell}>
                  <Text style={styles.matrixKey}>Urgency</Text>
                  <Text style={[styles.matrixVal, { color: colors.gold }]}>{incident.urgency}</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: spacing.sm }}>
                <CategoryBadge category={incident.category} />
                {incident.subCategory ? <CategoryBadge category={'Other'} /> : null}
              </View>
            </View>

            {/* Status stepper */}
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Relationship Lifecycle State</Text>
              <StatusStepper current={incident.status} />
            </View>

            {/* Action error */}
            {actionError ? <Text style={styles.errorText}>{actionError}</Text> : null}

            {/* Action buttons */}
            <ActionButtons
              status={incident.status}
              incidentId={incidentId}
              loading={actionLoading}
              onDoAction={doAction}
              navigation={navigation}
              refresh={refresh}
            />
          </View>
        )}

        {/* ── Conversation tab ── */}
        {activeTab === 'conversation' && (
          <View>
            {convItems.length === 0 ? (
              <EmptyState icon="💬" title="No conversation yet" message="Add a response or investigation note to start the thread." />
            ) : (
              convItems.map(item => (
                <View
                  key={item.data.id}
                  style={[styles.bubble, item.type === 'note' && styles.bubbleNote]}
                >
                  <View style={styles.bubbleHeader}>
                    <Text style={styles.bubbleAuthor}>{item.data.author.name}</Text>
                    <Text style={styles.bubbleType}>{item.type === 'note' ? '📝 Note' : '💬 Response'}</Text>
                    <Text style={styles.bubbleTime}>{formatRelativeDate(item.data.createdAt)}</Text>
                  </View>
                  <Text style={styles.bubbleText}>
                    {item.type === 'response' ? item.data.message : item.data.content}
                  </Text>
                </View>
              ))
            )}
            <View style={styles.addBtnRow}>
              <Pressable style={styles.addBtn} onPress={() => navigation.navigate('AddResponse', { incidentId })} android_ripple={{ color: 'rgba(197,163,101,0.1)' }}>
                <Text style={styles.addBtnText} numberOfLines={1}>+ Add Response</Text>
              </Pressable>
              <Pressable style={[styles.addBtn, styles.addBtnSecondary]} onPress={() => navigation.navigate('AddNote', { incidentId })} android_ripple={{ color: 'rgba(197,163,101,0.1)' }}>
                <Text style={styles.addBtnSecondaryText} numberOfLines={1}>+ Add Note</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* ── Details tab ── */}
        {activeTab === 'details' && (
          <View style={styles.card}>
            {[
              { label: 'ID', value: incident.id },
              { label: 'Category', value: `${incident.category}${incident.subCategory ? ` · ${incident.subCategory}` : ''}` },
              { label: 'Priority', value: incident.priority },
              { label: 'Impact', value: incident.impact },
              { label: 'Urgency', value: incident.urgency },
              { label: 'Reported By', value: incident.reportedBy.name },
              { label: 'Assigned To', value: incident.assignedTo?.name ?? '—' },
              { label: 'Created', value: formatDateTime(incident.createdAt) },
              { label: 'Updated', value: incident.updatedAt ? formatDateTime(incident.updatedAt) : '—' },
              { label: 'Assigned At', value: incident.assignedAt ? formatDateTime(incident.assignedAt) : '—' },
              { label: 'Investigation Started', value: incident.investigatedAt ? formatDateTime(incident.investigatedAt) : '—' },
              { label: 'Resolved At', value: incident.resolvedAt ? formatDateTime(incident.resolvedAt) : '—' },
              { label: 'Closed At', value: incident.closedAt ? formatDateTime(incident.closedAt) : '—' },
              { label: 'Due At', value: incident.dueAt ? formatDateTime(incident.dueAt) : '—' },
            ].map(row => (
              <View key={row.label} style={styles.detailRow}>
                <Text style={styles.detailKey}>{row.label}</Text>
                <Text style={styles.detailVal}>{row.value}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── History tab ── */}
        {activeTab === 'history' && (
          <View>
            {histEntries.length === 0 ? (
              <EmptyState icon="📜" title="No history yet" />
            ) : (
              histEntries.map((entry, idx) => (
                <View key={entry.id} style={styles.historyEntry}>
                  <View style={styles.historyLeft}>
                    <View style={[styles.historyDot, { backgroundColor: idx === 0 ? colors.gold : colors.rhythmComplete }]} />
                    {idx < histEntries.length - 1 && <View style={styles.historyLine} />}
                  </View>
                  <View style={styles.historyBody}>
                    <Text style={styles.historyAction}>{entry.action}</Text>
                    <Text style={styles.historyActor}>{entry.actor.name} · {formatRelativeDate(entry.createdAt)}</Text>
                    {entry.oldValue || entry.newValue ? (
                      <Text style={styles.historyChange}>
                        {entry.oldValue ? `${entry.oldValue} → ` : ''}{entry.newValue ?? ''}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* ── Resolution tab ── */}
        {activeTab === 'resolution' && (
          <View>
            {incident.resolution ? (
              <View style={styles.card}>
                <Text style={styles.cardLabel}>Resolution Agreement</Text>
                <Text style={styles.cardBody}>{incident.resolution}</Text>
                {incident.resolutionNotes ? (
                  <>
                    <Text style={[styles.cardLabel, { marginTop: spacing.md }]}>Notes</Text>
                    <Text style={styles.cardBody}>{incident.resolutionNotes}</Text>
                  </>
                ) : null}
              </View>
            ) : (
              <EmptyState icon="✅" title="Not yet resolved" />
            )}
            <View style={styles.addBtnRow}>
              <Pressable style={styles.addBtn} onPress={() => navigation.navigate('IncidentReview', { incidentId })} android_ripple={{ color: 'rgba(197,163,101,0.1)' }}>
                <Text style={styles.addBtnText} numberOfLines={1}>Write Review</Text>
              </Pressable>
              <Pressable style={[styles.addBtn, styles.addBtnSecondary]} onPress={() => navigation.navigate('IncidentLessons', { incidentId })} android_ripple={{ color: 'rgba(197,163,101,0.1)' }}>
                <Text style={styles.addBtnSecondaryText} numberOfLines={1}>Lessons Learned</Text>
              </Pressable>
            </View>
          </View>
        )}

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Action Buttons ───────────────────────────────────────────────────────────

function ActionButtons({
  status,
  incidentId,
  loading,
  onDoAction,
  navigation,
  refresh,
}: {
  status: IncidentStatus;
  incidentId: string;
  loading: boolean;
  onDoAction: (fn: () => Promise<unknown>) => Promise<void>;
  navigation: Nav;
  refresh: () => void;
}) {
  const handleAssignSelf = useCallback(async () => {
    try {
      const me = await authService.getMe();
      await onDoAction(() => incidentService.assignIncident(incidentId, me.id));
    } catch {
      Alert.alert('Error', 'Could not assign incident.');
    }
  }, [incidentId, onDoAction]);

  const handleReassignToPartner = useCallback(() => {
    Alert.alert(
      'Reassign to partner?',
      'This hands the ticket over to your partner and lets them know.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reassign',
          onPress: () => onDoAction(() => incidentService.reassignIncident(incidentId)),
        },
      ],
    );
  }, [incidentId, onDoAction]);

  const buttons: Array<{ label: string; style?: 'primary' | 'secondary' | 'danger'; onPress: () => void }> = [];

  if (status === 'Open') {
    buttons.push({ label: 'Assign to Me', onPress: handleAssignSelf });
    buttons.push({ label: 'Assign to Partner', style: 'secondary', onPress: handleReassignToPartner });
  }
  if (status === 'Assigned') {
    buttons.push({ label: 'Start Investigation', onPress: () => onDoAction(() => incidentService.investigateIncident(incidentId)) });
    buttons.push({ label: 'Reassign to Partner', style: 'secondary', onPress: handleReassignToPartner });
  }
  if (status === 'Investigating' || status === 'Reopened') {
    buttons.push({ label: 'Add Response', style: 'secondary', onPress: () => navigation.navigate('AddResponse', { incidentId }) });
    buttons.push({ label: 'Add Investigation Note', style: 'secondary', onPress: () => navigation.navigate('AddNote', { incidentId }) });
    buttons.push({ label: 'Mark Awaiting Response', style: 'secondary', onPress: () => onDoAction(() => incidentService.awaitResponse(incidentId)) });
    buttons.push({ label: 'Reassign to Partner', style: 'secondary', onPress: handleReassignToPartner });
    buttons.push({ label: 'Resolve Incident', onPress: () => navigation.navigate('ResolveIncident', { incidentId }) });
  }
  if (status === 'AwaitingResponse') {
    buttons.push({ label: 'Add Response', onPress: () => navigation.navigate('AddResponse', { incidentId }) });
    buttons.push({ label: 'Resume Investigation', style: 'secondary', onPress: () => onDoAction(() => incidentService.investigateIncident(incidentId)) });
    buttons.push({ label: 'Reassign to Partner', style: 'secondary', onPress: handleReassignToPartner });
  }
  if (status === 'Resolved') {
    buttons.push({ label: 'Close Incident', onPress: () => navigation.navigate('CloseIncident', { incidentId }) });
    buttons.push({ label: 'Write Review', style: 'secondary', onPress: () => navigation.navigate('IncidentReview', { incidentId }) });
    buttons.push({ label: 'Reopen', style: 'danger', onPress: () => navigation.navigate('ReopenIncident', { incidentId }) });
  }
  if (status === 'Closed') {
    buttons.push({ label: 'View Lessons Learned', style: 'secondary', onPress: () => navigation.navigate('IncidentLessons', { incidentId }) });
    buttons.push({ label: 'Write Review', style: 'secondary', onPress: () => navigation.navigate('IncidentReview', { incidentId }) });
    buttons.push({ label: 'Reopen', style: 'danger', onPress: () => navigation.navigate('ReopenIncident', { incidentId }) });
  }

  if (buttons.length === 0) return null;

  return (
    <View style={actionStyles.root}>
      {loading && <ActivityIndicator color={colors.gold} style={{ marginBottom: spacing.sm }} />}
      {buttons.map(btn => (
        <Pressable
          key={btn.label}
          style={[
            actionStyles.btn,
            btn.style === 'secondary' && actionStyles.btnSecondary,
            btn.style === 'danger' && actionStyles.btnDanger,
            (!btn.style || btn.style === 'primary') && actionStyles.btnPrimary,
          ]}
          onPress={loading ? undefined : btn.onPress}
          android_ripple={{ color: 'rgba(10,20,15,0.2)' }}
          disabled={loading}
        >
          <Text
            numberOfLines={1}
            style={[
              actionStyles.btnText,
              btn.style === 'secondary' && actionStyles.btnTextSecondary,
              btn.style === 'danger' && actionStyles.btnTextDanger,
            ]}
          >
            {btn.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const actionStyles = StyleSheet.create({
  // Two-column wrapping grid so a long list of actions stays compact instead
  // of stacking into a tall column that dominates the screen.
  root: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: spacing.md },
  btn: {
    // Roughly half-width (accounting for the 8px gap) so buttons pair up in rows.
    flexBasis: '48%',
    flexGrow: 1,
    height: 40,
    borderRadius: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimary: { backgroundColor: colors.ctaBackground },
  btnSecondary: { backgroundColor: colors.surfaceCard, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  btnDanger: { backgroundColor: 'rgba(179,64,64,0.12)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(179,64,64,0.3)' },
  btnText: { ...typography.bodySemiBold, fontSize: 14, color: colors.ctaText },
  btnTextSecondary: { color: colors.neutral },
  btnTextDanger: { color: '#B34040' },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  tabContent: { padding: spacing.md, paddingBottom: spacing.xl },

  topBadges: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  incNum: { ...typography.label, color: colors.gold, fontSize: 10 },
  titleRow: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.xs },
  incTitle: { ...typography.headline, color: colors.neutral, fontSize: 20 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  metaText: { ...typography.bodySm, color: colors.neutralMuted },

  tabBar: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: 6 },
  tabBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, borderColor: 'transparent' },
  tabBtnActive: { borderColor: colors.gold, backgroundColor: 'rgba(197,163,101,0.1)' },
  tabBtnText: { ...typography.bodySm, color: colors.neutralMuted },
  tabBtnTextActive: { color: colors.gold },

  card: { backgroundColor: colors.surfaceCard, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.md },
  cardLabel: { ...typography.label, color: colors.neutralMuted, marginBottom: 8 },
  cardBody: { ...typography.body, color: colors.neutral, lineHeight: 22 },

  matrixGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  matrixCell: { width: '45%' },
  matrixKey: { ...typography.bodySm, color: colors.neutralMuted, marginBottom: 2 },
  matrixVal: { ...typography.bodyMedium, color: colors.neutral },

  errorText: { ...typography.bodySm, color: '#B34040', textAlign: 'center', marginBottom: spacing.sm },

  bubble: { backgroundColor: colors.surfaceCard, borderRadius: 12, padding: spacing.md, marginBottom: 10, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  bubbleNote: { backgroundColor: 'rgba(197,163,101,0.06)', borderColor: 'rgba(197,163,101,0.2)' },
  bubbleHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 6 },
  bubbleAuthor: { ...typography.bodySemiBold, color: colors.neutral, fontSize: 12, flex: 1 },
  bubbleType: { ...typography.bodySm, color: colors.neutralMuted, fontSize: 10 },
  bubbleTime: { ...typography.bodySm, color: colors.neutralMuted, fontSize: 10 },
  bubbleText: { ...typography.body, color: colors.neutral, lineHeight: 20 },

  addBtnRow: { flexDirection: 'row', gap: 8, marginTop: spacing.sm },
  addBtn: { flex: 1, backgroundColor: colors.ctaBackground, height: 40, borderRadius: 12, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { ...typography.bodySemiBold, fontSize: 14, color: colors.ctaText },
  addBtnSecondary: { backgroundColor: colors.surfaceCard, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  addBtnSecondaryText: { ...typography.bodyMedium, fontSize: 14, color: colors.neutral },

  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  detailKey: { ...typography.bodySm, color: colors.neutralMuted, flex: 0.45 },
  detailVal: { ...typography.bodyMedium, color: colors.neutral, flex: 0.55, textAlign: 'right' },

  historyEntry: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  historyLeft: { alignItems: 'center', width: 20 },
  historyDot: { width: 12, height: 12, borderRadius: 6 },
  historyLine: { flex: 1, width: 1.5, backgroundColor: colors.border, marginTop: 4 },
  historyBody: { flex: 1 },
  historyAction: { ...typography.bodyMedium, color: colors.neutral, marginBottom: 2 },
  historyActor: { ...typography.bodySm, color: colors.neutralMuted },
  historyChange: { ...typography.bodySm, color: colors.gold, marginTop: 2 },
});
