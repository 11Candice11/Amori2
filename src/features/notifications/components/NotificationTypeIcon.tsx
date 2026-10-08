/**
 * NotificationTypeIcon — picks an illustrated PNG icon for a notification
 * based on its `notificationType`. Unknown/absent types fall back to the
 * generic notifications icon so the row still reads cleanly.
 *
 * Uses the same richly rendered gold-on-botanical PNGs as the rest of the app
 * (bottom nav, dashboard cards, etc.) rather than hand-rolled SVG glyphs.
 */
import React from 'react';
import { Image, type ImageSourcePropType } from 'react-native';

type Props = {
  type: string | null;
  size?: number;
};

function iconFor(type: string): ImageSourcePropType {
  const t = type.toLowerCase();

  if (t.includes('hug'))                           return require('../../../../images/icons/hug.png');
  if (t.includes('reminder'))                      return require('../../../../images/icons/notifications.png');
  if (t.includes('emergency') || t.includes('sos')) return require('../../../../images/icons/sos.png');
  if (t.includes('partnerlink') || t.includes('link')) return require('../../../../images/icons/profile.png');
  if (t.includes('incident'))                      return require('../../../../images/icons/log_incident.png');
  if (t.includes('gift') || t.includes('vault'))   return require('../../../../images/icons/memories.png');
  if (t.includes('letschat') || t.includes('chat')) return require('../../../../images/icons/lets_chat.png');
  if (t.includes('vision'))                        return require('../../../../images/icons/together.png');
  if (t.includes('calendar') || t.includes('event')) return require('../../../../images/icons/calendar.png');
  if (t.includes('checkin') || t.includes('mood')) return require('../../../../images/icons/checkin.png');
  if (t.includes('memory') || t.includes('memories')) return require('../../../../images/icons/memories.png');
  if (t.includes('wishlist'))                      return require('../../../../images/icons/wishlist.png');
  if (t.includes('snapshot'))                      return require('../../../../images/icons/snapshot.png');
  if (t.includes('together'))                      return require('../../../../images/icons/together.png');

  return require('../../../../images/icons/notifications.png');
}

export function NotificationTypeIcon({ type, size = 26 }: Props) {
  const source = iconFor(type ?? '');
  return (
    <Image
      source={source}
      style={{ width: size, height: size, borderRadius: size * 0.24 }}
      resizeMode="contain"
      accessibilityIgnoresInvertColors
    />
  );
}
