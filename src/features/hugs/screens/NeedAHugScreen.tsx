/**
 * NeedAHugScreen — the "Need a hug?" compose screen (first screen of the Hug flow).
 *
 * The user can tap the central glyph or the "Send Me a Hug" CTA to deliver a hug
 * to their partner, optionally attaching a short "gentle whisper" note.
 * On success we navigate to the HugSent confirmation screen.
 */
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  Vibration,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, typography } from '../../../shared/theme';
import type { HugStackParamList } from '../../../navigation/HugStackParamList';
import { hugService } from '../services/hugService';
import {
  BackIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  HandHeartIcon,
  HugFiguresIcon,
  LeafIcon,
  SafeHarborIcon,
  VibrationIcon,
  WhisperIcon,
} from '../components/HugIcons';

type Nav = NativeStackNavigationProp<HugStackParamList, 'NeedAHug'>;

// Warm, cozy interior behind the "Need a hug?" hero.
const heroImage = require('../../../../images/cozy.png');

const MAX_WHISPER = 500;

export function NeedAHugScreen() {
  const navigation = useNavigation<Nav>();

  const [whisper, setWhisper] = useState('');
  const [whisperOpen, setWhisperOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendHug = useCallback(async () => {
    if (sending) return;
    setSending(true);
    setError(null);
    // A soft double pulse to mirror the "soft vibration to your partner".
    Vibration.vibrate([0, 40, 60, 40]);
    const startedAt = Date.now();
    try {
      const hug = await hugService.sendHug(whisper);
      const deliveryMs = Date.now() - startedAt;
      navigation.navigate('HugSent', { hugId: hug.id, deliveryMs });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send your hug. Try again in a moment.');
      setSending(false);
    }
  }, [navigation, sending, whisper]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* Top bar */}
      <View style={styles.topBar}>
        <Pressable
          style={styles.iconBtn}
          onPress={() => navigation.goBack()}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          android_ripple={{ color: 'rgba(197,163,101,0.15)', borderless: true }}
        >
          <BackIcon color={colors.neutral} />
        </Pressable>
        <Text style={styles.topTitle} numberOfLines={1}>Need A Hug</Text>
        <View style={styles.iconBtn} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Warm cozy hero — pill, headline, and tap-to-hold glow */}
          <ImageBackground
            source={heroImage}
            style={styles.hero}
            imageStyle={styles.heroImg}
            resizeMode="cover"
          >
            <View style={styles.heroOverlay}>
              {/* Safe harbor pill */}
              <View style={styles.pill}>
                <SafeHarborIcon color={colors.gold} />
                <Text style={styles.pillText}>Safe Harbor</Text>
              </View>

              <Text style={styles.headline}>Need a hug?</Text>
              <Text style={styles.subtitle}>
                Sometimes you don't need words. Just steady reassurance.
              </Text>

              {/* Tap-to-hold glow */}
              <View style={styles.glowWrap}>
                <View style={styles.glowOuter}>
                  <View style={styles.glowMid}>
                    <Pressable
                      style={styles.glowCore}
                      onPress={sendHug}
                      disabled={sending}
                      accessibilityRole="button"
                      accessibilityLabel="Tap to hold and send a hug"
                      android_ripple={{ color: 'rgba(197,163,101,0.2)', borderless: true }}
                    >
                      <HugFiguresIcon color={colors.gold} size={44} />
                      <Text style={styles.tapLabel}>Tap to hold</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            </View>
          </ImageBackground>

          <View style={{ flex: 1 }} />
        </ScrollView>

        {/* Bottom action zone */}
        <View style={styles.bottom}>
          <Pressable
            style={[styles.cta, sending && styles.ctaDisabled]}
            onPress={sendHug}
            disabled={sending}
            accessibilityRole="button"
            accessibilityLabel="Send me a hug"
            android_ripple={{ color: 'rgba(10,20,15,0.2)' }}
          >
            {sending ? (
              <ActivityIndicator color={colors.ctaText} />
            ) : (
              <>
                <HandHeartIcon color={colors.ctaText} />
                <Text style={styles.ctaText}>Send Me a Hug</Text>
              </>
            )}
          </Pressable>

          <View style={styles.hintRow}>
            <VibrationIcon color={colors.gold} />
            <Text style={styles.hintText}>Delivers instantly with a soft vibration to your partner</Text>
          </View>

          {/* Gentle whisper (collapsible) */}
          <View style={styles.whisperCard}>
            <Pressable
              style={styles.whisperHeader}
              onPress={() => setWhisperOpen(o => !o)}
              accessibilityRole="button"
              accessibilityLabel="Add a gentle whisper"
              android_ripple={{ color: 'rgba(197,163,101,0.08)' }}
            >
              <WhisperIcon color={colors.gold} />
              <Text style={styles.whisperTitle}>Add a gentle whisper</Text>
              <Text style={styles.whisperOptional}>Optional</Text>
              {whisperOpen
                ? <ChevronUpIcon color={colors.neutralMuted} />
                : <ChevronDownIcon color={colors.neutralMuted} />}
            </Pressable>

            {whisperOpen ? (
              <View style={styles.whisperBody}>
                <TextInput
                  style={styles.whisperInput}
                  value={whisper}
                  onChangeText={setWhisper}
                  placeholder="Say a little something, if you'd like…"
                  placeholderTextColor={colors.neutralSubtle}
                  multiline
                  maxLength={MAX_WHISPER}
                  textAlignVertical="top"
                />
                <Text style={styles.whisperCount}>{whisper.length}/{MAX_WHISPER}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.footerRow}>
            <LeafIcon color={colors.neutralSubtle} size={16} />
            <Text style={styles.footerText}>Zero pressure. Your partner will simply know you need warmth.</Text>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  iconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  topTitle: { ...typography.headlineSm, color: colors.neutral, flex: 1, textAlign: 'center', fontSize: 18 },

  content: { alignItems: 'center', flexGrow: 1 },

  hero: {
    width: '100%',
    marginBottom: spacing.md,
  },
  heroImg: {
    opacity: 0.5,
  },
  heroOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(10,20,15,0.55)',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },

  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(197,163,101,0.12)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(197,163,101,0.3)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  pillText: { ...typography.label, color: colors.gold, fontSize: 11 },

  headline: { ...typography.headlineLg, color: colors.neutral, textAlign: 'center' },
  subtitle: {
    ...typography.body,
    color: colors.neutralMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
  },

  glowWrap: { alignItems: 'center', justifyContent: 'center', marginTop: spacing.xl },
  glowOuter: {
    width: 260,
    height: 260,
    borderRadius: 130,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(197,163,101,0.04)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(197,163,101,0.10)',
  },
  glowMid: {
    width: 190,
    height: 190,
    borderRadius: 95,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(197,163,101,0.06)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(197,163,101,0.14)',
  },
  glowCore: {
    width: 130,
    height: 130,
    borderRadius: 65,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(6,78,59,0.35)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(197,163,101,0.22)',
  },
  tapLabel: { ...typography.label, color: colors.gold, fontSize: 9 },

  bottom: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.ctaBackground,
    height: 58,
    borderRadius: 30,
  },
  ctaDisabled: { opacity: 0.6 },
  ctaText: { ...typography.bodySemiBold, color: colors.ctaText, fontSize: 17 },

  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },
  hintText: { ...typography.bodySm, color: colors.neutralMuted, flexShrink: 1 },

  whisperCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  whisperHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: 16,
  },
  whisperTitle: { ...typography.bodyMedium, color: colors.neutral, flex: 1 },
  whisperOptional: { ...typography.bodySm, color: colors.neutralMuted, marginRight: 4 },
  whisperBody: { paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  whisperInput: {
    ...typography.body,
    color: colors.neutral,
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
    minHeight: 90,
  },
  whisperCount: { ...typography.bodySm, color: colors.neutralSubtle, textAlign: 'right', marginTop: 6 },

  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
  },
  footerText: { ...typography.bodySm, color: colors.neutralSubtle, flexShrink: 1, textAlign: 'center' },

  error: { ...typography.bodySm, color: colors.emergency, textAlign: 'center', marginTop: spacing.sm },
});
