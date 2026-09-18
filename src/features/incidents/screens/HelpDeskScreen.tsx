import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { IncidentStackParamList } from '../../../navigation/IncidentStackParamList';
import { colors, spacing, typography } from '../../../shared/theme';
import { useHelpDesk } from '../hooks/useHelpDesk';
import { IncidentCard } from '../components/IncidentCard';
import { EmptyState } from '../components/EmptyState';

type Nav = NativeStackNavigationProp<IncidentStackParamList, 'HelpDesk'>;

function StatTile({ label, value, tint }: { label: string; value: number; tint?: string }) {
  return (
    <View style={styles.statTile}>
      <Text style={[styles.statValue, tint ? { color: tint } : null]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export function HelpDeskScreen() {
  const navigation = useNavigation<Nav>();
  const { stats, recentIncidents, overdueIncidents, loading, error, refresh } = useHelpDesk();
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    refresh();
    setRefreshing(false);
  }, [refresh]);

  const openDetail = useCallback(
    (id: string) => navigation.navigate('IncidentDetail', { incidentId: id }),
    [navigation],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>Relationship Help Desk</Text>
          <Text style={styles.title}>Care Tickets</Text>
        </View>
        <Pressable
          style={styles.newBtn}
          onPress={() => navigation.navigate('LogIncident')}
          android_ripple={{ color: 'rgba(10,20,15,0.2)' }}
          accessibilityRole="button"
          accessibilityLabel="Log new incident"
        >
          <Text style={styles.newBtnText}>+ New</Text>
        </Pressable>
      </View>

      {loading && !stats ? (
        <View style={styles.center}><ActivityIndicator color={colors.gold} size="large" /></View>
      ) : error && !stats ? (
        <EmptyState icon="⚠" title="Couldn't load" message={error} ctaLabel="Retry" onCta={refresh} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}
        >
          {/* Stats */}
          {stats ? (
            <View style={styles.statsRow}>
              <StatTile label="Open" value={stats.open} tint={colors.gold} />
              <StatTile label="Resolved" value={stats.resolved} tint={colors.rhythmComplete} />
              <StatTile label="Overdue" value={stats.overdue} tint="#B34040" />
              <StatTile label="Total" value={stats.total} />
            </View>
          ) : null}

          {/* Quick links */}
          <View style={styles.quickRow}>
            <Pressable style={styles.quickBtn} onPress={() => navigation.navigate('IncidentList', { filter: 'all' })} android_ripple={{ color: 'rgba(197,163,101,0.1)' }}>
              <Text style={styles.quickText}>View all incidents →</Text>
            </Pressable>
          </View>

          {/* Overdue */}
          {overdueIncidents.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Needs attention</Text>
              {overdueIncidents.map(item => (
                <IncidentCard key={item.id} incident={item} onPress={openDetail} />
              ))}
            </View>
          ) : null}

          {/* Recent */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent</Text>
            {recentIncidents.length === 0 ? (
              <EmptyState
                icon="🕊"
                title="All clear"
                message="No incidents logged yet. When something needs working through, log it here."
                ctaLabel="Log an incident"
                onCta={() => navigation.navigate('LogIncident')}
              />
            ) : (
              recentIncidents.map(item => (
                <IncidentCard key={item.id} incident={item} onPress={openDetail} />
              ))
            )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  eyebrow: { ...typography.label, color: colors.gold, marginBottom: 2 },
  title: { ...typography.headline, color: colors.neutral, fontSize: 26 },
  newBtn: {
    backgroundColor: colors.ctaBackground,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: 12,
  },
  newBtnText: { ...typography.bodySemiBold, color: colors.ctaText },
  content: { paddingHorizontal: spacing.md },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: spacing.md },
  statTile: {
    flex: 1,
    backgroundColor: colors.surfaceCard,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  statValue: { ...typography.headline, color: colors.neutral, fontSize: 22 },
  statLabel: { ...typography.label, color: colors.neutralMuted, fontSize: 9, marginTop: 2 },
  quickRow: { marginBottom: spacing.md },
  quickBtn: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  quickText: { ...typography.bodyMedium, color: colors.gold },
  section: { marginBottom: spacing.lg },
  sectionTitle: { ...typography.label, color: colors.neutralMuted, marginBottom: spacing.sm },
});
