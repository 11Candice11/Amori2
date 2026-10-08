/**
 * MoodGiftScreen — reached from the mood check-in confirmation when the user
 * lands in a "High Pleasant" state. Shows the daily gift (memory or vision) so a
 * bright moment gets to bloom a little more.
 * 
 * If the gift was already opened on the dashboard, it shows again here but
 * with the "Save to Vault" button disabled if already saved.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, typography, useThemeMode } from '../../../shared/theme';
import { showSuccessOverlay } from '../../../shared/state/successOverlayStore';
import { showErrorOverlay } from '../../../shared/state/errorOverlayStore';
import { AppHeader } from '../../../shared/components/header';
import type { MoodStackParamList } from '../../../navigation/MoodStackParamList';
import { ArtifactRevealModal } from '../../home/components/ArtifactRevealModal';
import { dailyGiftService, type DailyGift } from '../../home/services/dailyGiftService';
import { vaultService } from '../../vault/services/vaultService';

type Nav = NativeStackNavigationProp<MoodStackParamList, 'MoodGift'>;
type Rt = RouteProp<MoodStackParamList, 'MoodGift'>;

export function MoodGiftScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const { setVariant } = useThemeMode();
  const [dailyGift, setDailyGift] = useState<DailyGift | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(true);
  const [alreadySaved, setAlreadySaved] = useState(false);
  // The modal's close animation and the header back button can both request an
  // exit; guard so we only navigate away once.
  const exitingRef = useRef(false);

  // Load today's daily gift and check if it's already in the vault
  useEffect(() => {
    let active = true;
    
    Promise.all([
      dailyGiftService.getTodaysGift(),
      vaultService.getAll(),
    ]).then(([gift, savedGifts]) => {
      if (!active) return;
      
      setDailyGift(gift);
      
      // Check if this item is already saved in the vault
      const isAlreadySaved = gift
        ? savedGifts.some((savedGift) => 
            gift.type === 'memory' 
              ? savedGift.memoryId === gift.memory?.id
              : savedGift.visionId === gift.vision?.id
          )
        : false;
      setAlreadySaved(isAlreadySaved);
      setLoading(false);
    }).catch((error) => {
      console.error('Failed to load daily gift:', error);
      if (active) setLoading(false);
    });
    
    return () => {
      active = false;
    };
  }, []);

  const handleSaveToVault = useCallback(async () => {
    if (!dailyGift || alreadySaved) return;

    try {
      const payload =
        dailyGift.type === 'memory'
          ? { memoryId: dailyGift.memory!.id, cardNumber: dailyGift.cardNumber }
          : { visionId: dailyGift.vision!.id, cardNumber: dailyGift.cardNumber };

      await vaultService.save(payload);
      setAlreadySaved(true);
      showSuccessOverlay('Saved to your vault');
    } catch (error) {
      console.error('Failed to save gift to vault:', error);
      showErrorOverlay("Couldn't save to your vault");
    }
  }, [dailyGift, alreadySaved]);

  // Leave the gift for the Sanctuary (Home tab). Both the modal's close (X) and
  // the header back button route here so closing the gift always lands on the
  // sanctuary rather than popping back into the check-in flow.
  const goToSanctuary = useCallback(() => {
    if (exitingRef.current) return;
    exitingRef.current = true;
    setModalVisible(false);
    // Navigate home after a brief delay so the modal closes smoothly. The mood
    // theme is applied here, on exit, rather than before opening the gift —
    // switching it earlier remounts the navigator and would drop the user on
    // the dashboard instead of the gift.
    const applyTheme = route.params?.applyTheme;
    setTimeout(() => {
      if (applyTheme) setVariant(applyTheme);
      // Reset the Mood stack to its root so the Check-in tab isn't left sitting
      // on the gift screen next time it's focused.
      navigation.popToTop();
      navigation.getParent()?.navigate('Home' as never);
    }, 300);
  }, [navigation, route.params?.applyTheme, setVariant]);

  const handleClose = goToSanctuary;

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.loading}>
          <ActivityIndicator color={colors.gold} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!dailyGift) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <AppHeader title="Daily Gift" onBack={goToSanctuary} />
        <View style={styles.body}>
          <Text style={styles.title}>No gift available</Text>
          <Text style={styles.subtitle}>
            Your daily gift will appear here tomorrow.
          </Text>
          <Pressable
            style={styles.primaryBtn}
            onPress={handleClose}
            accessibilityRole="button"
            accessibilityLabel="Go home"
            android_ripple={{ color: 'rgba(10,20,15,0.2)' }}
          >
            <Text style={styles.primaryBtnText}>Go Home</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <AppHeader title="Daily Gift" onBack={goToSanctuary} />

      <ArtifactRevealModal
        visible={modalVisible}
        onClose={handleClose}
        onSaveToVault={handleSaveToVault}
        badge="HIGH PLEASANT · YOUR GIFT"
        title={dailyGift.title}
        body={dailyGift.body}
        cardNumber={dailyGift.cardNumber}
        alreadySaved={alreadySaved}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backBtn: { paddingVertical: 6, paddingRight: 12 },
  backText: { ...typography.body, color: colors.neutralMuted },
  eyebrow: { ...typography.label, color: colors.gold },
  loading: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  body: { 
    flex: 1, 
    paddingHorizontal: spacing.xl, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  title: { 
    ...typography.headline, 
    color: colors.neutral, 
    textAlign: 'center', 
    marginBottom: spacing.sm 
  },
  subtitle: {
    ...typography.body,
    color: colors.neutralMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  primaryBtn: {
    backgroundColor: colors.ctaBackground,
    borderRadius: 50,
    paddingHorizontal: spacing.xl,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnText: { ...typography.bodySemiBold, color: colors.ctaText },
});
