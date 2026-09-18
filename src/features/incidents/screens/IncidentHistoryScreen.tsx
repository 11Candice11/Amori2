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
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import type { IncidentStackParamList } from '../../../navigation/IncidentStackParamList';
import { colors, spacing, typography } from '../../../shared/theme';
import { IncidentScreenHeader } from '../components/IncidentScreenHeader';
import { EmptyState } from '../components/EmptyState';
import { useIncidentHistory } from '../hooks/useIncidentHistory';
import { formatDateTime } from '../utils/errorMessages';
import type { IncidentHistoryAction } from '../types/incident.types';

type Nav = NativeStackNavigationProp<IncidentStackParamList, 'IncidentHistory'>;
type Route = NativeStackScreenProps<IncidentStackParamList, 'IncidentHistory'>['route'];

const ACTION_LABELS: Record<IncidentHistoryAction, string> = {
  Created: 'Incident created',
  Assigned: 'Assigned to partner',
  CategoryChanged: 'Category changed',
  PriorityChanged: 'Priority changed',
  StatusChanged: 'Status changed',
  InvestigationStarted: 'Investigation started',
  NoteAdded: 'Investigation note added',
  ResponseRequested: 'Awaiting response',
  Resolved: 'Incident resolved',
  Closed: 'Incident closed',
  Reopened: 'Incident reopened',
  ReviewAdded: 'Review added',
  LessonAdded: 'Lesson recorded',
  ResponseAdded: 'Response added',
  Updated: 'Details updated',
};

const SYSTEM_ACTIONS: IncidentHistoryAction[] = ['Created', 'StatusChanged', 'Resolved', 'Closed', 'Reopened'];

function dotColor(action: IncidentHistoryAction): string {
  if (action === 'Created') return colors.gold;
  if (action === 'Resolved' || action === 'Closed') return colors.rhythmComplete;
  if (action === 'Reopened') return '#B34040';
  if (SYSTEM_ACTIONS.includes(action)) return colors.gold;
  return colors.rhythmComplete;
}

export function IncidentHistoryScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { incidentId } = route.params;
  const { entries, loading, error, refresh } = useIncidentHistory(incidentId);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <IncidentScreenHeader
        title="Timeline"
        subtitle={entries.length > 0 ? `${entries.length} events` : undefined}
        onBack={() => navigation.goBack()}
      />

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.gold} size="large" /></View>
      ) : error ? (
        <EmptyState icon="⚠" title="Couldn't load history" message={error} ctaLabel="Retry" onCta={refresh} />
      ) : entries.length === 0 ? (
        <EmptyState icon="📜" title="No history yet" message="Events will appear here as the incident progresses." />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={false} onRefresh={refresh} tintColor={colors.gold} />}
        >
          {entries.map((entry, idx) => {
            const isSystem = SYSTEM_ACTIONS.includes(entry.action);
            const dc = dotColor(entry.action);
            return (
              <View key={entry.id} style={styles.entry}>
                {/* Timeline spine */}
                <View style={styles.spineCol}>
                  <View style={[styles.dot, { backgroundColor: dc }]} />
                  {idx < entries.length - 1 && <View style={styles.line} />}
                </View>

                {/* Content */}
                <View style={styles.body}>
                  <Text style={[styles.action, isSystem && styles.actionSystem]}>
                    {ACTION_LABELS[entry.action] ?? entry.action}
                  </Text>
                  <Text style={styles.actor}>
                    {entry.actor.name} · {formatDateTime(entry.createdAt)}
                  </Text>
                  {(entry.oldValue || entry.newValue) && (
                    <View style={styles.changePill}>
                      {entry.oldValue ? (
                        <Text style={styles.changeOld}>{entry.oldValue}</Text>
                      ) : null}
                      {entry.oldValue && entry.newValue ? (
                        <Text style={styles.changeArrow}> → </Text>
                      ) : null}
                      {entry.newValue ? (
                        <Text style={styles.changeNew}>{entry.newValue}</Text>
                      ) : null}
                    </View>
                  )}
                </View>
              </View>
            );
          })}
          <View style={{ height: spacing.xl }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: spacing.md, paddingTop: spacing.md },
  entry: { flexDirection: 'row', gap: 14, minHeight: 52 },
  spineCol: { alignItems: 'center', width: 16 },
  dot: { width: 14, height: 14, borderRadius: 7, marginTop: 2 },
  line: { flex: 1, width: 1.5, backgroundColor: colors.border, marginVertical: 4 },
  body: { flex: 1, paddingBottom: spacing.md },
  action: { ...typography.bodyMedium, color: colors.neutral, marginBottom: 2 },
  actionSystem: { color: colors.gold },
  actor: { ...typography.bodySm, color: colors.neutralMuted },
  changePill: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    backgroundColor: colors.surfaceCard,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  changeOld: { ...typography.bodySm, color: colors.neutralMuted, textDecorationLine: 'line-through' },
  changeArrow: { ...typography.bodySm, color: colors.neutralMuted },
  changeNew: { ...typography.bodySm, color: colors.gold },
});
