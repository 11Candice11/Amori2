/**
 * Screen — Partner Compassion Bridge.
 * "You're not alone in this." Your love's handwritten sanctuary note,
 * shared history, and options to send a hug or continue to the check-in.
 */
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { SplittingStackParamList } from '../../../navigation/SplittingStackParamList';
import { colors, spacing, typography } from '../../../shared/theme';
import { showSuccess, showError } from '../../../shared/state/bannerStore';
import {
  SplittingHeader,
  PrimaryButton,
  SecondaryButton,
  TextButton,
  HeartIcon,
  SparkleIcon,
  InfinityIcon,
  CheckIcon,
} from '../components';
import { REASSURANCE_NOTES, PARTNER_NAME } from '../utils/splittingData';
import { EMPTY_FLOW_STATE } from '../types/splitting.types';
import { useLeaveSplittingFlow, useSaveGroundingOnLeave } from '../hooks/useLeaveSplittingFlow';
import { hugService } from '../../hugs/services/hugService';
import { ArtifactRevealModal } from '../../home/components/ArtifactRevealModal';
import { dailyGiftService, type DailyGift } from '../../home/services/dailyGiftService';
import { vaultService } from '../../vault/services/vaultService';

type Nav = NativeStackNavigationProp<SplittingStackParamList, 'CompassionBridge'>;
type Rt = RouteProp<SplittingStackParamList, 'CompassionBridge'>;

// Reassurance lines the partner "left" — shuffled through on tap so the
// message surface feels alive rather than static.
const REASSURANCE_SETS: string[][] = [
  REASSURANCE_NOTES,
  ['I choose you, every day.', 'Your feelings make sense.', 'Rest. I\u2019ve got us.', 'Nothing about this changes us.'],
  ['Breathe. I\u2019m right here.', 'You are safe with me.', 'We\u2019ve made it through before.', 'Take all the time you need.'],
];

export function CompassionBridgeScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const flow = route.params?.flow ?? EMPTY_FLOW_STATE;

  const [hugSent, setHugSent] = useState(false);
  const [hugSending, setHugSending] = useState(false);
  const [noteSet, setNoteSet] = useState(0);
  const [giftOpen, setGiftOpen] = useState(false);
  const [dailyGift, setDailyGift] = useState<DailyGift | null>(null);
  const [giftAlreadySaved, setGiftAlreadySaved] = useState(false);
  const [loadingGift, setLoadingGift] = useState(false);

  const { saveAndLeave, saving: savingMemories } = useLeaveSplittingFlow(flow);
  // Backing out of this screen (after the Inward Check) still saves the
  // grounding as history — the reassurance path — even without a check-in.
  useSaveGroundingOnLeave(flow, { actions: ['Reassurance'] });

  const notes = REASSURANCE_SETS[noteSet % REASSURANCE_SETS.length];

  // Load today's gift and check if it's already in the vault
  useEffect(() => {
    let active = true;

    const loadGiftAndCheckVault = async () => {
      setLoadingGift(true);
      try {
        const gift = await dailyGiftService.getTodaysGift();
        if (!active) return;
        
        setDailyGift(gift);

        if (gift) {
          // Check if this item is already saved in the vault
          const savedGifts = await vaultService.getAll();
          const isAlreadySaved = savedGifts.some((savedGift) =>
            gift.type === 'memory'
              ? savedGift.memoryId === gift.memory?.id
              : savedGift.visionId === gift.vision?.id
          );
          setGiftAlreadySaved(isAlreadySaved);
        }
      } catch (error) {
        console.error('Failed to load daily gift or check vault:', error);
      } finally {
        if (active) setLoadingGift(false);
      }
    };

    loadGiftAndCheckVault();

    return () => {
      active = false;
    };
  }, []);

  const shuffleNotes = () => setNoteSet(n => n + 1);

  const sendHug = async () => {
    if (hugSending || hugSent) return;
    setHugSending(true);
    try {
      await hugService.sendHug(`Thinking of you, ${PARTNER_NAME}.`);
      setHugSent(true);
    } catch {
      // leave unsent so they can retry
    } finally {
      setHugSending(false);
    }
  };

  const goToMemories = () =>
    navigation
      .getParent()
      ?.navigate(({ name: 'Together', params: { screen: 'Memories' } } as unknown) as never);

  // Tapping "View memories" leaves the SOS flow, so this is where reassurance
  // ends for this person. Save the grounding before navigating away (recording
  // the reassurance path) so it lands in their history, then open Memories.
  const openMemories = async () => {
    await saveAndLeave({ actions: ['Reassurance'] });
    goToMemories();
  };

  const handleSaveGiftToVault = async () => {
    if (!dailyGift || giftAlreadySaved) return;

    try {
      const payload =
        dailyGift.type === 'memory'
          ? { memoryId: dailyGift.memory!.id, cardNumber: dailyGift.cardNumber }
          : { visionId: dailyGift.vision!.id, cardNumber: dailyGift.cardNumber };

      await vaultService.save(payload);
      setGiftAlreadySaved(true);
      showSuccess('Saved!');
    } catch (error) {
      console.error('Failed to save gift to vault:', error);
      showError('Sorry that failed :(');
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <SplittingHeader eyebrow="Compassion Bridge" subtitle="You're not alone in this" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <View style={styles.returnPill}>
            <Text style={styles.returnText}>Return to safe space options</Text>
          </View>
          <View style={styles.anchorPill}>
            <View style={styles.anchorDot} />
            <Text style={styles.anchorText}>Grounding anchor active</Text>
          </View>
        </View>

        <View style={styles.heartBadge}>
          <HeartIcon color={colors.primaryLight} size={22} />
        </View>
        <Text style={styles.title}>You're not alone in this.</Text>
        <Text style={styles.subtitle}>
          Warm reminders from {PARTNER_NAME} to ground you in safety.
        </Text>

        <View style={styles.noteCard}>
          <View style={styles.noteHead}>
            <View style={styles.noteAvatar}>
              <HeartIcon color={colors.emergency} size={16} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.noteAuthor}>{PARTNER_NAME}'s Sanctuary Note</Text>
              <Text style={styles.noteMeta}>HANDWRITTEN IN HEARTH</Text>
            </View>
            <View style={styles.heartCount}>
              <Text style={styles.heartCountText}>99</Text>
            </View>
          </View>

          <Text style={styles.rememberHead}>Remember:</Text>
          {notes.map(line => (
            <View key={line} style={styles.bulletRow}>
              <View style={styles.bulletDot} />
              <Text style={styles.bulletText}>{line}</Text>
            </View>
          ))}

          <Text style={styles.recordedBy}>— {PARTNER_NAME}, recorded in your Hearth Vault</Text>

          <View style={styles.divider} />

          <Pressable
            style={styles.shuffleRow}
            accessibilityRole="button"
            accessibilityLabel="Show me another message"
            onPress={shuffleNotes}
            android_ripple={{ color: 'rgba(139,111,58,0.1)' }}
          >
            <SparkleIcon color={colors.gold} size={18} />
            <Text style={styles.shuffleText}>Show me another message</Text>
            <Text style={styles.shuffleHint}>Tap to shuffle</Text>
          </Pressable>
        </View>

        <Pressable
          style={styles.linkCard}
          accessibilityRole="button"
          accessibilityLabel="Revisit shared memories"
          accessibilityState={{ busy: savingMemories }}
          disabled={savingMemories}
          onPress={openMemories}
          android_ripple={{ color: 'rgba(139,111,58,0.08)' }}
        >
          <View style={styles.infinityBadge}>
            <InfinityIcon color={colors.primaryLight} size={18} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.togetherTitle}>Revisit your memories</Text>
            <Text style={styles.togetherSub}>Open your shared memories for something warm to hold.</Text>
          </View>
          <Text style={styles.linkChevron}>→</Text>
        </Pressable>

        <Pressable
          style={styles.giftCard}
          accessibilityRole="button"
          accessibilityLabel="Open a little surprise"
          onPress={() => setGiftOpen(true)}
          android_ripple={{ color: 'rgba(139,111,58,0.08)' }}
        >
          <View style={styles.giftBadgeCircle}>
            <SparkleIcon color={colors.gold} size={18} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.togetherTitle}>A little surprise</Text>
            <Text style={styles.togetherSub}>Tap to unwrap a small gift set aside for a moment like this.</Text>
          </View>
          <Text style={styles.linkChevron}>→</Text>
        </Pressable>
      </ScrollView>

      <ArtifactRevealModal
        visible={giftOpen}
        onClose={() => setGiftOpen(false)}
        onSaveToVault={handleSaveGiftToVault}
        badge="SANCTUARY · FOR YOU"
        title={dailyGift?.title ?? "A moment of tenderness"}
        body={dailyGift?.body ?? `${PARTNER_NAME} tucked this away for you: you are deeply loved, exactly as you are right now.`}
        cardNumber={dailyGift?.cardNumber ?? 1}
        alreadySaved={giftAlreadySaved}
      />

      <View style={styles.bottomBar}>
        <PrimaryButton
          label={hugSent ? `Hug sent to ${PARTNER_NAME}` : hugSending ? 'Sending…' : `Send a hug to ${PARTNER_NAME}`}
          icon={hugSent ? <CheckIcon color={colors.ctaText} size={16} /> : <HeartIcon color={colors.ctaText} size={16} />}
          onPress={sendHug}
        />
        <SecondaryButton
          label="I feel steadier • Continue to Check-in"
          icon={<CheckIcon color={colors.primaryLight} size={16} />}
          onPress={() => navigation.navigate('SafeTransition', { flow })}
        />
        <TextButton label="Return to safe space options" onPress={() => navigation.navigate('InwardCheck', { flow })} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: spacing.sm },
  returnPill: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  returnText: { ...typography.bodySm, color: colors.neutralMuted, fontSize: 11 },
  anchorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceCard,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  anchorDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.gold },
  anchorText: { ...typography.bodySm, color: colors.neutralMuted, fontSize: 11 },

  heartBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(6,78,59,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: spacing.lg,
  },
  title: { ...typography.headline, color: colors.neutral, textAlign: 'center', marginTop: spacing.md, fontSize: 26 },
  subtitle: { ...typography.body, color: colors.neutralMuted, textAlign: 'center', marginTop: spacing.sm },

  noteCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  noteHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  noteAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(224,122,95,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteAuthor: { ...typography.bodyMedium, color: colors.gold, fontSize: 14 },
  noteMeta: { ...typography.label, color: colors.neutralSubtle, fontSize: 9, marginTop: 1 },
  heartCount: {
    backgroundColor: 'rgba(6,78,59,0.6)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  heartCountText: { ...typography.bodySm, color: colors.primaryLight, fontSize: 12 },

  rememberHead: { ...typography.headlineSm, color: colors.tertiary, fontSize: 22, marginTop: spacing.md },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 10 },
  bulletDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.gold, marginTop: 9 },
  bulletText: { ...typography.headlineSm, color: colors.neutral, fontSize: 18, flex: 1, lineHeight: 24 },
  recordedBy: { ...typography.bodySm, color: colors.neutralSubtle, fontStyle: 'italic', marginTop: spacing.md },

  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: spacing.md },

  shuffleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(139,111,58,0.1)',
    borderRadius: 12,
    padding: spacing.md,
  },
  shuffleText: { ...typography.bodyMedium, color: colors.gold, flex: 1, fontSize: 14 },
  shuffleHint: { ...typography.bodySm, color: colors.neutralSubtle, fontSize: 11 },

  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surfaceCard,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  giftCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(139,111,58,0.1)',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(139,111,58,0.3)',
    padding: spacing.md,
    marginTop: 12,
  },
  giftBadgeCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(6,78,59,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkChevron: { ...typography.headlineSm, color: colors.gold, fontSize: 18 },
  infinityBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(6,78,59,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  togetherTitle: { ...typography.bodyMedium, color: colors.neutral, fontSize: 15 },
  togetherSub: { ...typography.bodySm, color: colors.neutralMuted, marginTop: 2 },

  bottomBar: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
    gap: spacing.xs,
  },
});
