/**
 * openInMaps — launch the device's native maps app at a coordinate.
 *
 * Platform-aware: Apple Maps on iOS, Google Maps (via geo: intent) on Android,
 * with a Google Maps web URL as a universal fallback. A label is passed so the
 * dropped pin is named in the maps app.
 */
import { Linking, Platform } from 'react-native';

export async function openInMaps(
  latitude: number,
  longitude: number,
  label?: string | null,
): Promise<void> {
  const latlng = `${latitude},${longitude}`;
  const name = label?.trim() ? label.trim() : 'Memory';
  const encodedName = encodeURIComponent(name);

  // Preferred native scheme per platform.
  const nativeUrl =
    Platform.OS === 'ios'
      ? `maps:0,0?q=${encodedName}@${latlng}`
      : `geo:${latlng}?q=${latlng}(${encodedName})`;

  // Universal web fallback that both platforms can always open.
  const webUrl = `https://www.google.com/maps/search/?api=1&query=${latlng}`;

  try {
    const canOpen = await Linking.canOpenURL(nativeUrl);
    await Linking.openURL(canOpen ? nativeUrl : webUrl);
  } catch {
    // Last resort: the web URL.
    await Linking.openURL(webUrl).catch(() => {
      /* nothing more we can do */
    });
  }
}
