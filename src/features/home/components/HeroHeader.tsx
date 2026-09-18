/**
 * HeroHeader — top section of the Dashboard (Android).
 *
 * Structure:
 *   outer (margin only, no clip)
 *    └─ root (overflow: hidden — clips the background image to rounded corners)
 *         ├─ heroImage   (absoluteFillObject)
 *         ├─ imageDim    (absoluteFillObject dim overlay)
 *         └─ content     (all readable content, renders on top of image)
 *
 * Keeping the image inside the same overflow:hidden parent as the content
 * is the only reliable way to prevent the image bleeding onto sibling cards.
 */
import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { colors, spacing, typography } from '../../../shared/theme';

// ─── Icons ────────────────────────────────────────────────────────────────────

function HeartIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 21C12 21 3 14.5 3 8.5a4.5 4.5 0 018.5-2.12A4.5 4.5 0 0121 8.5C21 14.5 12 21 12 21z"
        stroke={colors.gold}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function OnlineDot() {
  return (
    <Svg width={10} height={10} viewBox="0 0 10 10">
      <Circle cx={5} cy={5} r={4} fill={colors.statusDot} />
    </Svg>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

type HeroHeaderProps = {
  partnerName: string;
  greeting: string;
  subtext: string;
  statusPills: string[];
  isPartnerOnline?: boolean;
};

export function HeroHeader({
  partnerName,
  greeting,
  subtext,
  statusPills,
  isPartnerOnline = true,
}: HeroHeaderProps) {
  return (
    <View style={styles.outer}>
      {/*
       * root has overflow:hidden to clip the background image.
       * The image and dim overlay are absoluteFill inside this container.
       * The content view renders on top naturally (no z-index needed).
       */}
      <View style={styles.root}>
        <Image
          source={require('../../../../images/forest.png')}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
        <View style={[StyleSheet.absoluteFill, styles.imageDim]} />

        {/* All text/interactive content stacks on top of the image */}
        <View style={styles.content}>
          {/* Top bar */}
          <View style={styles.topBar}>
            <View>
              <Text style={styles.wordmarkAlways}>Amori ★</Text>
              <Text style={styles.wordmarkSanctuary}>SANCTUARY</Text>
            </View>
            <View style={styles.topActions}>
              <HeartIcon />
              <View style={styles.avatarWrapper}>
                <View style={styles.avatarCircle} />
                {isPartnerOnline && (
                  <View style={styles.onlineDot}>
                    <OnlineDot />
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Status pills row */}
          <View style={styles.pillRow}>
            <View style={styles.bioPill}>
              <View style={styles.bioLiveDot} />
              <Text style={styles.bioPillText}>LIVE BIO-LINK</Text>
            </View>
            {statusPills.map((pill) => (
              <React.Fragment key={pill}>
                <Text style={styles.pillDot}>•</Text>
                <Text style={styles.pillText}>{pill}</Text>
              </React.Fragment>
            ))}
          </View>

          {/* Greeting */}
          <Text style={styles.greeting}>{greeting}</Text>
          <Text style={styles.subtext}>{subtext}</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  outer: {
    marginBottom: spacing.md,
  },
  root: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  imageDim: {
    backgroundColor: 'rgba(6, 18, 10, 0.68)',
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  wordmarkAlways: {
    ...typography.bodyMedium,
    color: colors.neutral,
    fontSize: 15,
  },
  wordmarkSanctuary: {
    ...typography.label,
    color: colors.neutralMuted,
    fontSize: 9,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1.5,
    borderColor: colors.gold,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: spacing.sm,
  },
  bioPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(197,163,101,0.1)',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(197,163,101,0.25)',
  },
  bioLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.gold,
  },
  bioPillText: {
    ...typography.label,
    color: colors.gold,
    fontSize: 8,
  },
  pillText: {
    ...typography.bodySm,
    color: colors.neutralMuted,
    fontSize: 11,
  },
  pillDot: {
    color: colors.gold,
    fontSize: 8,
    marginHorizontal: 2,
  },
  greeting: {
    ...typography.headlineLg,
    color: colors.neutral,
    marginBottom: spacing.xs,
  },
  subtext: {
    ...typography.body,
    color: colors.neutralMuted,
  },
});
