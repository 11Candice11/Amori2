import React from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import type { IncidentStackParamList } from '../../../navigation/IncidentStackParamList';
import { colors, spacing, typography } from '../../../shared/theme';
import { AppHeader } from '../../../shared/components/header';
import { EmptyState } from '../components/EmptyState';
import { SlaCard } from '../components/SlaCard';
import { useIncidentSla } from '../hooks/useIncidentSla';
import { formatDateTime } from '../utils/errorMessages';

type Nav = NativeStackNavigationProp<IncidentStackParamList, 'IncidentSla'>;
type Route = NativeStackScreenProps<IncidentStackParamList, 'IncidentSla'>['route'];

const SLA_POLICY: Record<string, string> = {
  Low: '72 hours',
  Medium: '48 hours',
  High: '24 hours',
  Critical: '4 hours',
};

export function IncidentSlaScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { incidentId } = route.params;
  const { sla, remainingSeconds, loading, error, refresh } = useIncidentSla(incidentId);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title="SLA & Timeline" onBack={() => navigation.goBack()} />

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.gold} size="large" /></View>
      ) : error || !sla ? (
        <EmptyState icon="⚠" title="SLA unavailable" message={error ?? 'No SLA data for this incident.'} ctaLabel="Retry" onCta={refresh} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={false} onRefresh={refresh} tintColor={colors.gold} />}
        >
          <SlaCard sla={sla} remainingSeconds={remainingSeconds} />

          <View style={styles.card}>
            <Text style={styles.cardLabel}>Timeline</Text>
            {[
              { label: 'Created', value: formatDateTime(sla.createdAt) },
              { label: 'Due At', value: formatDateTime(sla.dueAt) },
              { label: 'Status', value: sla.isOverdue ? 'Overdue' : 'On Track' },
              { label: 'Priority', value: sla.priority },
            ].map(row => (
              <View key={row.label} style={styles.row}>
                <Text style={styles.rowKey}>{row.label}</Text>
                <Text style={[styles.rowVal, row.label === 'Status' && sla.isOverdue && { color: '#B34040' }]}>
                  {row.value}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardLabel}>SLA Policy</Text>
            <Text style={styles.policyIntro}>
              Response windows are set by priority level to keep your relationship flowing freely.
            </Text>
            {Object.entries(SLA_POLICY).map(([priority, window]) => (
              <View key={priority} style={styles.row}>
                <Text style={[styles.rowKey, priority === sla.priority && { color: colors.gold }]}>
                  {priority}{priority === sla.priority ? ' ←' : ''}
                </Text>
                <Text style={styles.rowVal}>{window}</Text>
              </View>
            ))}
          </View>

          <View style={{ height: spacing.xl }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.md },
  card: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardLabel: { ...typography.label, color: colors.neutralMuted, marginBottom: spacing.sm },
  policyIntro: { ...typography.bodySm, color: colors.neutralMuted, lineHeight: 18, marginBottom: spacing.sm },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowKey: { ...typography.bodySm, color: colors.neutralMuted },
  rowVal: { ...typography.bodyMedium, color: colors.neutral },
});
