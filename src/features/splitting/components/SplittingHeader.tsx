/**
 * Top bar for the splitting flow. Now a thin wrapper over the shared AppHeader
 * so the flow screens match the rest of the app: a centered title with a
 * left-aligned back button. The old `eyebrow` prop maps to the header title,
 * and an optional `subtitle` shows the flow context beneath it. The branded
 * "held with …" partner chip has been retired in favour of the standard bar.
 */
import React from 'react';
import { AppHeader } from '../../../shared/components/header';

type Props = {
  /** The flow-step name, shown as the centered title. */
  eyebrow?: string;
  /** Optional supporting line beneath the title. */
  subtitle?: string;
  onBack?: () => void;
  /** Retained for API compatibility; no longer rendered. */
  showPartnerChip?: boolean;
  partnerChipLabel?: string;
};

export function SplittingHeader({ eyebrow = 'Splitting Anchor', subtitle, onBack }: Props) {
  return <AppHeader title={eyebrow} subtitle={subtitle} onBack={onBack} />;
}
