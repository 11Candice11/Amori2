/**
 * VaultScreen — displays saved gifts/surprises from daily artifacts.
 *
 * The Hearth Vault shows all the memories that were randomly selected as daily
 * gifts and then saved by the user. Each gift card displays the memory's title,
 * description, date, and location.
 *
 * Features include:
 * - Level progress bar showing points toward next level
 * - Card collection progress (X/Y cards collected)
 * - Grid view of cards with individual point rewards
 * - Deck view for browsing cards
 * - Send gift option
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect, useRoute, type RouteProp } from '@react-navigation/native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { colors, spacing, typography } from '../../../shared/theme';
import { AppHeader } from '../../../shared/components/header';
import { vaultService } from '../services/vaultService';
import type { SavedGift } from '../types/vault.types';
import { getCardImage } from '../../../utils/cardSelector';
import { ArtifactRevealModal } from '../../home/components/ArtifactRevealModal';
import { SendGiftModal } from '../components/SendGiftModal';
import { CardDeckView } from '../components/CardDeckView';
import { CardGridView } from '../components/CardGridView';
import { LevelProgressBar } from '../components/LevelProgressBar';
import { CardCollectionInfo } from '../components/CardCollectionInfo';
import { BadgeCollection } from '../components/BadgeCollection';
import { BadgeRewardModal } from '../components/BadgeRewardModal';
import { formatRelativeDate, formatShortDate } from '../../../utils/dateUtils';
import type { MainTabParamList } from '../../../navigation/types';
// The reward listener reports catalogue badges (constants/badges), not the
// server's BadgeResponse rows — the modal only needs the catalogue id.
import type { Badge } from '../../../constants/badges';
import { pointsService } from '../../../services/api/pointsService';
import { showSuccessOverlay } from '../../../shared/state/successOverlayStore';
import { showErrorOverlay } from '../../../shared/state/errorOverlayStore';
import { useBadgeRewardListener } from '../hooks/useBadgeRewardListener';

function VaultGlyph({ size = 40 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={5} width={18} height={15} rx={3} stroke={colors.gold} strokeWidth={1.5} />
      <Path d="M3 9h18" stroke={colors.gold} strokeWidth={1.5} />
      <Path d="M12 12.5v3.5" stroke={colors.gold} strokeWidth={1.6} strokeLinecap="round" />
      <Path d="M10.5 14h3" stroke={colors.gold} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}

function CalendarGlyph() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={4.5} width={18} height={17} rx={3} stroke={colors.neutralMuted} strokeWidth={1.5} />
      <Path d="M3 9h18M8 2.5v4M16 2.5v4" stroke={colors.neutralMuted} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

/** Header action glyph for the weekly reflection (a small calendar week). */
function WeekGlyph({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={4.5} width={18} height={17} rx={3} stroke={colors.gold} strokeWidth={1.5} />
      <Path d="M3 9h18M8 2.5v4M16 2.5v4" stroke={colors.gold} strokeWidth={1.5} strokeLinecap="round" />
      <Circle cx={8} cy={14} r={1.2} fill={colors.gold} />
      <Circle cx={12} cy={14} r={1.2} fill={colors.gold} />
      <Circle cx={16} cy={14} r={1.2} fill={colors.gold} />
    </Svg>
  );
}

function LocationGlyph() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 21s-7-5.5-7-11a7 7 0 1114 0c0 5.5-7 11-7 11z"
        stroke={colors.neutralMuted}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      <Path d="M12 13a3 3 0 100-6 3 3 0 000 6z" stroke={colors.neutralMuted} strokeWidth={1.5} />
    </Svg>
  );
}

type GiftCardProps = {
  gift: SavedGift;
  onPress: (gift: SavedGift) => void;
};

function GiftCard({ gift, onPress }: GiftCardProps) {
  const memoryDate = formatShortDate(gift.memoryDateTime);
  const savedTimeAgo = formatRelativeDate(gift.savedAt);
  const cardImage = getCardImage(gift.cardNumber);
  
  return (
    <Pressable
      style={({ pressed }) => [styles.giftCard, pressed && styles.pressed]}
      onPress={() => onPress(gift)}
      android_ripple={{ color: colors.goldTint12 }}
      accessibilityRole="button"
      accessibilityLabel={`Saved gift: ${gift.title}`}
    >
      {/* Card image preview */}
      <View style={styles.cardImageContainer}>
        <Image source={cardImage} style={styles.cardImage} resizeMode="cover" />
      </View>
      
      <View style={styles.giftContent}>
        <View style={styles.giftHeader}>
          <View style={styles.giftIconCircle}>
            <VaultGlyph size={20} />
          </View>
          <Text style={styles.giftSavedLabel}>Saved {savedTimeAgo}</Text>
        </View>
        
        <Text style={styles.giftTitle} numberOfLines={2}>
          {gift.title}
        </Text>
        
        {gift.description ? (
          <Text style={styles.giftDescription} numberOfLines={3}>
            {gift.description}
          </Text>
        ) : null}
        
        <View style={styles.giftMeta}>
          {memoryDate ? (
            <View style={styles.giftMetaItem}>
              <CalendarGlyph />
              <Text style={styles.giftMetaText}>{memoryDate}</Text>
            </View>
          ) : null}
          
          {gift.location ? (
            <View style={styles.giftMetaItem}>
              <LocationGlyph />
              <Text style={styles.giftMetaText} numberOfLines={1}>
                {gift.location}
              </Text>
            </View>
          ) : null}
        </View>
        
        {gift.createdByName ? (
          <Text style={styles.giftCreator}>by {gift.createdByName}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

export function VaultScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<MainTabParamList, 'Vault'>>();
  const [gifts, setGifts] = useState<SavedGift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedGift, setSelectedGift] = useState<SavedGift | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [sendVisible, setSendVisible] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'deck'>('deck');
  const [rewardedBadge, setRewardedBadge] = useState<Badge | null>(null);
  const [showBadgeModal, setShowBadgeModal] = useState(false);

  // A card counts as collected once, even if several gifts share its art.
  const uniqueCardCount = useMemo(
    () => new Set(gifts.map((g) => g.cardNumber)).size,
    [gifts],
  );

  const loadGifts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await vaultService.getAll();
      setGifts(data);
    } catch (err) {
      // Surface the real reason (e.g. "HTTP 401", a session/network message) so
      // the failure is actionable rather than a dead-end generic string.
      const reason = err instanceof Error ? err.message : null;
      setError(
        reason
          ? `Could not load your saved gifts: ${reason}`
          : 'Could not load your saved gifts',
      );
      console.error('Failed to load vault gifts:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load on mount
  useEffect(() => {
    loadGifts();
  }, [loadGifts]);

  // When navigated from a notification with a giftId, open that gift automatically
  useEffect(() => {
    const giftId = route.params?.giftId;
    if (!giftId || gifts.length === 0) return;

    const gift = gifts.find(g => g.id === giftId);
    if (gift) {
      setSelectedGift(gift);
      setModalVisible(true);
    }
  }, [route.params?.giftId, gifts]);

  // Refresh when screen comes into focus (e.g., after saving a new gift)
  useFocusEffect(
    useCallback(() => {
      loadGifts();
    }, [loadGifts])
  );

  const handleGiftPress = useCallback((gift: SavedGift) => {
    setSelectedGift(gift);
    setModalVisible(true);
  }, []);

  // Tapping an unlocked card in the grid opens its detail reveal.
  const handleDeckGiftPress = useCallback((giftId: string) => {
    const gift = gifts.find(g => g.id === giftId);
    if (!gift) return;
    setSelectedGift(gift);
    setModalVisible(true);
  }, [gifts]);

  const handleRandomCard = useCallback(() => {
    if (gifts.length === 0) return;
    const randomIndex = Math.floor(Math.random() * gifts.length);
    setSelectedGift(gifts[randomIndex]);
  }, [gifts]);

  const openWeeklyReflection = useCallback(() => {
    // From the Vault, jump to the browsable list of saved reflections.
    (navigation as { navigate: (name: string) => void }).navigate('WeeklyReflectionArchive');
  }, [navigation]);

  const handleCloseModal = useCallback(() => {
    setModalVisible(false);
  }, []);

  const openSendGift = useCallback(() => setSendVisible(true), []);
  const closeSendGift = useCallback(() => setSendVisible(false), []);
  const handleGiftSent = useCallback(() => {
    // A sent gift lands in the PARTNER's vault, not the sender's, so there's
    // nothing new to show here — but refresh anyway in case the list is stale.
    loadGifts();
  }, [loadGifts]);

  const handleSaveBadgeToVault = useCallback(
    async (badgeId: string) => {
      try {
        // badgeId is the catalogue slug (e.g. "first_embrace"); the server
        // checks it's really unlocked before saving it.
        await pointsService.archiveBadge(badgeId);
        showSuccessOverlay('Badge saved to your vault');
        setShowBadgeModal(false);
        setRewardedBadge(null);
      } catch (err) {
        console.error('Failed to save badge:', err);
        showErrorOverlay("Couldn't save the badge");
        // Rethrow so the modal stays open and the user can try again.
        throw err;
      }
    },
    []
  );

  // Listen for badge rewards
  useBadgeRewardListener((badge) => {
    setRewardedBadge(badge);
    setShowBadgeModal(true);
  });

  const renderGift = useCallback(
    ({ item }: { item: SavedGift }) => <GiftCard gift={item} onPress={handleGiftPress} />,
    [handleGiftPress]
  );

  const keyExtractor = useCallback((item: SavedGift) => item.id, []);

  const renderEmptyState = useCallback(() => {
    if (loading) return null;

    return (
      <View style={styles.emptyState}>
        <View style={styles.glyphCircle}>
          <VaultGlyph />
        </View>
        <Text style={styles.emptyTitle}>Your Vault is empty</Text>
        <Text style={styles.emptyBody}>
          When you open your daily gift and tap "Save to Vault", it will appear here for you to
          revisit anytime.
        </Text>
        <Pressable
          style={({ pressed }) => [styles.sendGiftBtn, pressed && styles.pressed]}
          onPress={openSendGift}
          accessibilityRole="button"
          accessibilityLabel="Send a gift to your partner"
        >
          <Text style={styles.sendGiftBtnText}>Send a gift</Text>
        </Pressable>
      </View>
    );
  }, [loading, openSendGift]);

  const renderListHeader = useCallback(() => {
    if (gifts.length === 0) return null;
    
    return (
      <View style={styles.listHeader}>
        <Text style={styles.listHeaderText}>
          {gifts.length} {gifts.length === 1 ? 'saved gift' : 'saved gifts'}
        </Text>
        <Pressable
          style={({ pressed }) => [styles.sendGiftBtnSmall, pressed && styles.pressed]}
          onPress={openSendGift}
          accessibilityRole="button"
          accessibilityLabel="Send a gift to your partner"
        >
          <Text style={styles.sendGiftBtnText}>Send gift</Text>
        </Pressable>
      </View>
    );
  }, [gifts.length, openSendGift]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader
        title="Hearth Vault"
        onBack={() => navigation.goBack()}
        right={
          <Pressable
            onPress={openWeeklyReflection}
            style={({ pressed }) => [styles.headerAction, pressed && styles.pressed]}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Open weekly reflection"
            android_ripple={{ color: colors.goldTint15, borderless: true }}
          >
            <WeekGlyph />
          </Pressable>
        }
      />

      {loading && gifts.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.gold} size="large" />
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={loadGifts}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </Pressable>
        </View>
      ) : gifts.length === 0 ? (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.emptyState}>
            <View style={styles.glyphCircle}>
              <VaultGlyph />
            </View>
            <Text style={styles.emptyTitle}>Your Vault is empty</Text>
            <Text style={styles.emptyBody}>
              When you open your daily gift and tap "Save to Vault", it will appear here for you to
              revisit anytime.
            </Text>
            <Pressable
              style={({ pressed }) => [styles.sendGiftBtn, pressed && styles.pressed]}
              onPress={openSendGift}
              accessibilityRole="button"
              accessibilityLabel="Send a gift to your partner"
            >
              <Text style={styles.sendGiftBtnText}>Send a gift</Text>
            </Pressable>
          </View>
        </ScrollView>
      ) : viewMode === 'deck' ? (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Gamification sections */}
          <View style={styles.gamificationSection}>
            <LevelProgressBar />
            <CardCollectionInfo collectedCount={uniqueCardCount} />
          </View>

          {/* Send gift button */}
          <View style={styles.sendGiftSection}>
            <Pressable
              style={({ pressed }) => [styles.sendGiftBtnSmall, pressed && styles.pressed]}
              onPress={openSendGift}
              accessibilityRole="button"
              accessibilityLabel="Send a gift to your partner"
            >
              <Text style={styles.sendGiftBtnText}>Send a gift</Text>
            </Pressable>
          </View>

          {/* Deck view */}
          <View style={styles.deckViewContainer}>
            <CardDeckView
              gifts={gifts}
              selectedGiftId={selectedGift?.id || null}
              onSelectGift={handleDeckGiftPress}
              loading={loading}
            />
          </View>

          {/* All badges, earned and locked, so there's always something to aim for */}
          <BadgeCollection />
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Gamification sections */}
          <View style={styles.gamificationSection}>
            <LevelProgressBar />
            <CardCollectionInfo collectedCount={uniqueCardCount} />
          </View>

          {/* Send gift button */}
          <View style={styles.sendGiftSection}>
            <Pressable
              style={({ pressed }) => [styles.sendGiftBtnSmall, pressed && styles.pressed]}
              onPress={openSendGift}
              accessibilityRole="button"
              accessibilityLabel="Send a gift to your partner"
            >
              <Text style={styles.sendGiftBtnText}>Send a gift</Text>
            </Pressable>
          </View>

          {/* Grid view of cards */}
          <CardGridView
            gifts={gifts}
            onSelectGift={handleGiftPress}
            loading={loading}
          />

          <BadgeCollection />
        </ScrollView>
      )}

      {/* Gift detail modal with twirling animation */}
      {selectedGift && modalVisible && (
        <ArtifactRevealModal
          visible={modalVisible}
          onClose={handleCloseModal}
          badge={`SAVED · ${formatRelativeDate(selectedGift.savedAt).toUpperCase()}`}
          title={selectedGift.title}
          body={selectedGift.description || undefined}
          cardNumber={selectedGift.cardNumber}
          alreadySaved={true}
          media={selectedGift.media}
          latitude={selectedGift.latitude}
          longitude={selectedGift.longitude}
          location={selectedGift.location}
        />
      )}

      {/* Send a gift to your partner — spin-to-reveal composer. */}
      <SendGiftModal visible={sendVisible} onClose={closeSendGift} onSent={handleGiftSent} />

      {/* Badge reward modal — shows when user levels up */}
      <BadgeRewardModal
        visible={showBadgeModal}
        badgeId={rewardedBadge?.id || null}
        onDismiss={() => {
          setShowBadgeModal(false);
          setRewardedBadge(null);
        }}
        onSaveToVault={handleSaveBadgeToVault}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },
  headerAction: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { ...typography.bodySemiBold, color: colors.neutral, fontSize: 16 },
  headerSpacer: { width: 32 },
  
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  errorText: {
    ...typography.body,
    color: colors.neutralMuted,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    backgroundColor: colors.ctaBackground,
  },
  retryButtonText: {
    ...typography.bodySemiBold,
    color: colors.ctaText,
  },
  
  listContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  
  listHeader: {
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  listHeaderText: {
    ...typography.label,
    color: colors.neutralMuted,
    fontSize: 11,
    letterSpacing: 0.5,
  },
  sendGiftBtn: {
    marginTop: spacing.md,
    backgroundColor: colors.ctaBackground,
    borderRadius: 14,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendGiftBtnSmall: {
    backgroundColor: colors.ctaBackground,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  sendGiftBtnText: {
    ...typography.bodySemiBold,
    color: colors.ctaText,
    fontSize: 14,
  },
  
  separator: {
    height: spacing.md,
  },
  
  giftCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  cardImageContainer: {
    // Match the dashboard's portrait card proportions (160x224 ≈ 0.714)
    // so the full card art shows without cropping the top and bottom.
    alignSelf: 'center',
    width: 200,
    aspectRatio: 524 / 664,
    marginTop: spacing.md,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.background,
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  giftContent: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  giftHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  giftIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.gold,
  },
  giftSavedLabel: {
    ...typography.label,
    color: colors.neutralMuted,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  giftTitle: {
    ...typography.headlineSm,
    color: colors.neutral,
    fontSize: 18,
  },
  giftDescription: {
    ...typography.body,
    color: colors.neutralMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  giftMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  giftMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  giftMetaText: {
    ...typography.bodySm,
    color: colors.neutralMuted,
    fontSize: 12,
  },
  giftCreator: {
    ...typography.bodySm,
    color: colors.neutralSubtle,
    fontSize: 11,
    fontStyle: 'italic',
  },
  
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  glyphCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.gold,
    backgroundColor: colors.surfaceCard,
  },
  emptyTitle: {
    ...typography.headlineSm,
    color: colors.neutral,
    fontSize: 20,
    textAlign: 'center',
  },
  emptyBody: {
    ...typography.body,
    color: colors.neutralMuted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: spacing.md,
  },

  scrollContent: {
    paddingBottom: spacing.xl,
  },

  gamificationSection: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    gap: spacing.md,
  },

  sendGiftSection: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },

  deckViewContainer: {
    marginTop: spacing.lg,
    minHeight: 600,
  },
});
