import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
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
import { useIncidentList } from '../hooks/useIncidentList';
import { IncidentCard } from '../components/IncidentCard';
import { AppHeader } from '../../../shared/components/header';
import { EmptyState } from '../../../shared/components/EmptyState';
import type { IncidentFilter, IncidentStatus } from '../types/incident.types';

type Nav = NativeStackNavigationProp<IncidentStackParamList, 'IncidentList'>;
type Route = NativeStackScreenProps<IncidentStackParamList, 'IncidentList'>['route'];

type FilterTab = { key: string; label: string; filter: IncidentFilter };

const FILTER_TABS: FilterTab[] = [
  { key: 'all',       label: 'All',             filter: {} },
  { key: 'open',      label: 'Open',            filter: { openOnly: true } },
  { key: 'mine',      label: 'Assigned to Me',  filter: { assignedToMe: true } },
  { key: 'reported',  label: 'Reported by Me',  filter: { reportedByMe: true } },
  { key: 'resolved',  label: 'Resolved',        filter: { status: 'Resolved' as IncidentStatus } },
  { key: 'closed',    label: 'Closed',          filter: { status: 'Closed' as IncidentStatus } },
  { key: 'overdue',   label: 'Overdue',         filter: { overdue: true } },
];

export function IncidentListScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const initialKey = route.params?.filter ?? 'all';
  const initialTab = FILTER_TABS.find(t => t.key === initialKey) ?? FILTER_TABS[0];
  const [activeTab, setActiveTab] = useState<FilterTab>(initialTab);
  const [refreshing, setRefreshing] = useState(false);

  const { incidents, totalCount, hasMore, loading, loadingMore, error, refresh, loadMore, applyFilter } =
    useIncidentList(initialTab.filter);

  const selectTab = useCallback(
    (tab: FilterTab) => {
      setActiveTab(tab);
      applyFilter(tab.filter);
    },
    [applyFilter],
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    refresh();
    setRefreshing(false);
  }, [refresh]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader
        title="Incidents"
        subtitle={totalCount > 0 ? `${totalCount} total` : undefined}
        onBack={() => navigation.goBack()}
      />

      {/* Filter tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabBar}
        contentContainerStyle={styles.tabList}
      >
        {FILTER_TABS.map(item => (
          <Pressable
            key={item.key}
            style={[styles.tab, activeTab.key === item.key && styles.tabActive]}
            onPress={() => selectTab(item)}
            android_ripple={{ color: 'rgba(139,111,58,0.1)' }}
          >
            <Text style={[styles.tabText, activeTab.key === item.key && styles.tabTextActive]}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {loading && incidents.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.gold} size="large" />
        </View>
      ) : error && incidents.length === 0 ? (
        <EmptyState icon="⚠" title="Couldn't load incidents" message={error} ctaLabel="Retry" onCta={refresh} />
      ) : (
        <FlatList
          data={incidents}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}
          onEndReached={hasMore ? loadMore : undefined}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={
            <EmptyState
              icon="📋"
              title="No incidents"
              message="Nothing in this category yet."
            />
          }
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator color={colors.gold} />
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <IncidentCard
              incident={item}
              onPress={id => navigation.navigate('IncidentDetail', { incidentId: id })}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabBar: { flexGrow: 0, flexShrink: 0 },
  tabList: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 8,
    alignItems: 'center',
  },
  tab: {
    alignSelf: 'center',
    height: 34,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 17,
    backgroundColor: colors.surfaceCard,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  tabActive: { backgroundColor: 'rgba(139,111,58,0.15)', borderColor: colors.gold },
  tabText: { ...typography.bodySm, color: colors.neutralMuted, fontSize: 12 },
  tabTextActive: { color: colors.gold },
  listContent: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.xl },
  footerLoader: { paddingVertical: spacing.md, alignItems: 'center' },
});
