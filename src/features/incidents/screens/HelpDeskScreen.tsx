import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ImageBackground,
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
import { useMoodBackground } from '../../../shared/state/moodBackgroundStore';
import { useHelpDesk } from '../hooks/useHelpDesk';
import { isOpenIncidentStatus } from '../types/incident.types';
import { IncidentCard } from '../components/IncidentCard';
import { EmptyState } from '../../../shared/components/EmptyState';
import { AppHeader } from '../../../shared/components/header';

type Nav = NativeStackNavigationProp<IncidentStackParamList, 'HelpDesk'>;

type TabKey = 'overview' | 'open' | 'resolved' | 'overdue' | 'closed';

function TabButton({
  label,
  isActive,
  onPress,
}: {
  label: string;
  isActive: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.tabBtn, isActive && styles.tabBtnActive]}
      onPress={onPress}
      android_ripple={{ color: 'rgba(139,111,58,0.1)' }}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: isActive }}
    >
      <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{label}</Text>
    </Pressable>
  );
}

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
  const { stats, recentIncidents, overdueIncidents, closedIncidents, loading, error, refresh } = useHelpDesk();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  // Shared with Check-in and Together — driven by today's mood check-in.
  const backgroundImage = useMoodBackground();

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

  // The two list fetches overlap (an overdue ticket is usually also in the
  // recent page), so merge them by id before filtering — otherwise tickets
  // render twice and duplicate React keys.
  const allIncidents = useMemo(() => {
    const seen = new Set<string>();
    return [...overdueIncidents, ...recentIncidents].filter(i => {
      if (seen.has(i.id)) return false;
      seen.add(i.id);
      return true;
    });
  }, [overdueIncidents, recentIncidents]);

  // Overview lists overdue tickets under "Needs attention", so keep them out
  // of the "Recent" section below it.
  const recentNonOverdue = useMemo(() => {
    const overdueIds = new Set(overdueIncidents.map(i => i.id));
    return recentIncidents.filter(i => !overdueIds.has(i.id));
  }, [overdueIncidents, recentIncidents]);

  // Filter incidents based on active tab
  const displayIncidents = useMemo(() => {
    switch (activeTab) {
      case 'open':
        // Anything not yet Resolved/Closed — matches the backend's openOnly
        // filter and therefore the "Open" stat tile.
        return allIncidents.filter(i => isOpenIncidentStatus(i.status));
      case 'resolved':
        return allIncidents.filter(i => i.status === 'Resolved');
      case 'overdue':
        return overdueIncidents;
      case 'closed':
        // Closed tickets come from their own fetch since they're excluded from
        // the "recent" page — this is the view of past, closed incidents.
        return closedIncidents;
      case 'overview':
      default:
        return allIncidents;
    }
  }, [activeTab, allIncidents, overdueIncidents, closedIncidents]);

  // What actually gets rendered in the list section below. On Overview the
  // overdue tickets are already rendered above under "Needs attention", so the
  // empty state must be keyed off every known ticket, not just this slice.
  const listedIncidents = activeTab === 'overview' ? recentNonOverdue : displayIncidents;
  const showEmptyState = activeTab === 'overview'
    ? allIncidents.length === 0
    : displayIncidents.length === 0;

  return (
    <ImageBackground source={backgroundImage} style={styles.background} resizeMode="cover">
      <View style={styles.scrim} />
      <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader
        title="Care Tickets"
        subtitle="Relationship Help Desk"
        bordered={false}
        style={styles.headerTransparent}
        right={
          <Pressable
            style={styles.newBtn}
            onPress={() => navigation.navigate('LogIncident')}
            android_ripple={{ color: 'rgba(10,20,15,0.2)' }}
            accessibilityRole="button"
            accessibilityLabel="Log new incident"
          >
            <Text style={styles.newBtnText}>+ New</Text>
          </Pressable>
        }
      />

      {loading && !stats ? (
        <View style={styles.center}><ActivityIndicator color={colors.gold} size="large" /></View>
      ) : error && !stats ? (
        <EmptyState icon="⚠" title="Couldn't load" message={error} ctaLabel="Retry" onCta={refresh} />
      ) : (
        <>
          {/* Tabs */}
          <View style={styles.tabsContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabsContent}
            >
              <TabButton label="Overview" isActive={activeTab === 'overview'} onPress={() => setActiveTab('overview')} />
              <TabButton label="Open" isActive={activeTab === 'open'} onPress={() => setActiveTab('open')} />
              <TabButton label="Resolved" isActive={activeTab === 'resolved'} onPress={() => setActiveTab('resolved')} />
              <TabButton label="Overdue" isActive={activeTab === 'overdue'} onPress={() => setActiveTab('overdue')} />
              <TabButton label="Closed" isActive={activeTab === 'closed'} onPress={() => setActiveTab('closed')} />
            </ScrollView>
          </View>

          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}
          >
            {/* Stats - only show in overview tab */}
            {activeTab === 'overview' && stats ? (
              <View style={styles.statsRow}>
                <StatTile label="Open" value={stats.open} tint={colors.gold} />
                <StatTile label="Resolved" value={stats.resolved} tint={colors.rhythmComplete} />
                <StatTile label="Overdue" value={stats.overdue} tint="#B34040" />
                <StatTile label="Total" value={stats.total} />
              </View>
            ) : null}

            {/* Quick links - only show in overview */}
            {activeTab === 'overview' ? (
              <View style={styles.quickRow}>
                <Pressable style={styles.quickBtn} onPress={() => navigation.navigate('IncidentList', { filter: 'all' })} android_ripple={{ color: 'rgba(139,111,58,0.1)' }}>
                  <Text style={styles.quickText}>View all incidents →</Text>
                </Pressable>
              </View>
            ) : null}

            {/* Incidents list */}
            <View style={styles.section}>
              {activeTab === 'overview' && overdueIncidents.length > 0 ? (
                <>
                  <Text style={styles.sectionTitle}>Needs attention</Text>
                  {overdueIncidents.map(item => (
                    <IncidentCard key={item.id} incident={item} onPress={openDetail} />
                  ))}
                  {listedIncidents.length > 0 ? (
                    <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>Recent</Text>
                  ) : null}
                </>
              ) : (
                <Text style={styles.sectionTitle}>
                  {activeTab === 'open' ? 'Open Incidents' : activeTab === 'resolved' ? 'Resolved Incidents' : activeTab === 'overdue' ? 'Overdue Incidents' : activeTab === 'closed' ? 'Closed Incidents' : 'All Incidents'}
                </Text>
              )}
              
              {showEmptyState ? (
                <EmptyState
                  icon="🕊"
                  title={activeTab === 'overview' ? 'All clear' : 'No incidents'}
                  message={
                    activeTab === 'overview'
                      ? 'No incidents logged yet. When something needs working through, log it here.'
                      : `No ${activeTab} incidents at the moment.`
                  }
                  ctaLabel={activeTab === 'overview' ? 'Log an incident' : undefined}
                  onCta={activeTab === 'overview' ? () => navigation.navigate('LogIncident') : undefined}
                />
              ) : (
                listedIncidents.map(item => (
                  <IncidentCard key={item.id} incident={item} onPress={openDetail} />
                ))
              )}
            </View>

            <View style={{ height: spacing.xl }} />
          </ScrollView>
        </>
      )}
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: colors.background },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(6, 18, 10, 0.45)',
  },
  safe: { flex: 1, backgroundColor: 'transparent' },
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
  headerTransparent: { backgroundColor: 'transparent' },
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
  tabsContainer: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  tabsContent: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  tabBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabBtnActive: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },
  tabText: {
    ...typography.bodyMedium,
    color: colors.neutral,
    fontSize: 13,
  },
  tabTextActive: {
    ...typography.bodySemiBold,
    color: colors.ctaText,
  },
});
