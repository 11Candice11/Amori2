/**
 * LocationPicker — type-to-search location field with an interactive map.
 *
 * Behaviour (mirrors the CapiLift onboarding location step, cross-platform):
 *  - Type an address; after a short debounce we query OpenStreetMap Nominatim
 *    and show up to 5 suggestions.
 *  - Tap a suggestion to drop a pin, recentre the map, and save the address +
 *    coordinates.
 *  - Drag the pin (or tap the map) to fine-tune the exact spot; we reverse
 *    geocode to keep the address label in sync.
 *
 * The map uses the platform default provider (Apple Maps on iOS — no key; on
 * Android it uses Google Maps, which needs GOOGLE_MAPS_API_KEY configured).
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';

import { colors, spacing, typography } from '../../../shared/theme';
import {
  geocodingService,
  type GeocodePlace,
} from '../../../services/geocoding/geocodingService';

export interface LocationValue {
  // NOTE: coords are nullable because some callers (e.g. editing a calendar
  // event, which only persists the address string) seed a text-only value.
  // The map is shown only once real coordinates exist.
  /** Human-readable address text. */
  location: string;
  latitude: number | null;
  longitude: number | null;
}

interface LocationPickerProps {
  /** Current selection, or null when nothing is chosen yet. */
  value: LocationValue | null;
  onChange: (value: LocationValue | null) => void;
  /** Optional accessory id for the keyboard "Done" bar. */
  inputAccessoryViewID?: string;
}

/** Region span used when focusing a chosen place (roughly street level). */
const FOCUS_DELTA = 0.02;

/** Debounce for the autocomplete query (also eases Nominatim rate limits). */
const SEARCH_DEBOUNCE_MS = 400;

export function LocationPicker({
  value,
  onChange,
  inputAccessoryViewID,
}: LocationPickerProps) {
  const [query, setQuery] = useState(value?.location ?? '');
  const [suggestions, setSuggestions] = useState<GeocodePlace[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searching, setSearching] = useState(false);
  // A user-visible message when the place lookup itself fails (network, rate
  // limit, etc.), so a broken request isn't mistaken for "no matches".
  const [searchError, setSearchError] = useState<string | null>(null);
  const [region, setRegion] = useState<Region | null>(
    value && value.latitude != null && value.longitude != null
      ? {
          latitude: value.latitude,
          longitude: value.longitude,
          latitudeDelta: FOCUS_DELTA,
          longitudeDelta: FOCUS_DELTA,
        }
      : null,
  );

  const searchAbort = useRef<AbortController | null>(null);
  const reverseAbort = useRef<AbortController | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // When we set the query from a selection we don't want to re-trigger search.
  const suppressSearch = useRef(false);

  // Debounced autocomplete search.
  useEffect(() => {
    if (suppressSearch.current) {
      suppressSearch.current = false;
      return;
    }
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    const q = query.trim();
    if (q.length < 3) {
      setSuggestions([]);
      setSearching(false);
      setSearchError(null);
      return;
    }

    debounceTimer.current = setTimeout(() => {
      searchAbort.current?.abort();
      const controller = new AbortController();
      searchAbort.current = controller;
      setSearching(true);
      setSearchError(null);
      geocodingService
        .search(q, { signal: controller.signal })
        .then((results) => {
          setSuggestions(results);
          setShowSuggestions(true);
        })
        .catch((err) => {
          if ((err as Error)?.name === 'AbortError') return;
          // Surface the failure both in dev and to the user, so a broken
          // geocoding request isn't silently reduced to "no suggestions".
          if (__DEV__) console.warn('LocationPicker search failed:', (err as Error)?.message);
          setSuggestions([]);
          setSearchError("Couldn't search places. Check your connection and try again.");
        })
        .finally(() => {
          if (searchAbort.current === controller) setSearching(false);
        });
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [query]);

  // Clean up in-flight requests on unmount.
  useEffect(() => {
    return () => {
      searchAbort.current?.abort();
      reverseAbort.current?.abort();
    };
  }, []);

  const selectPlace = useCallback(
    (place: GeocodePlace) => {
      suppressSearch.current = true;
      setQuery(place.displayName);
      setShowSuggestions(false);
      setSuggestions([]);
      setSearchError(null);
      setRegion({
        latitude: place.latitude,
        longitude: place.longitude,
        latitudeDelta: FOCUS_DELTA,
        longitudeDelta: FOCUS_DELTA,
      });
      onChange({
        location: place.displayName,
        latitude: place.latitude,
        longitude: place.longitude,
      });
    },
    [onChange],
  );

  // Move the pin (drag end or map tap): reverse geocode to refresh the label.
  const movePin = useCallback(
    (latitude: number, longitude: number) => {
      setRegion((prev) => ({
        latitude,
        longitude,
        latitudeDelta: prev?.latitudeDelta ?? FOCUS_DELTA,
        longitudeDelta: prev?.longitudeDelta ?? FOCUS_DELTA,
      }));
      // Optimistically keep the current label; update it once resolved.
      onChange({
        location: value?.location ?? query.trim(),
        latitude,
        longitude,
      });

      reverseAbort.current?.abort();
      const controller = new AbortController();
      reverseAbort.current = controller;
      geocodingService
        .reverse(latitude, longitude, { signal: controller.signal })
        .then((place) => {
          if (!place) return;
          suppressSearch.current = true;
          setQuery(place.displayName);
          onChange({
            location: place.displayName,
            latitude,
            longitude,
          });
        })
        .catch(() => {
          /* keep the optimistic value on failure */
        });
    },
    [onChange, value?.location, query],
  );

  const clear = useCallback(() => {
    suppressSearch.current = true;
    setQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    setSearchError(null);
    setRegion(null);
    onChange(null);
  }, [onChange]);

  return (
    <View>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Search for a place"
          placeholderTextColor={colors.neutralSubtle}
          value={query}
          onChangeText={(text) => {
            setQuery(text);
            setShowSuggestions(true);
            // Editing the text invalidates the previously confirmed coords.
            if (value && text !== value.location) onChange(null);
          }}
          onFocus={() => {
            if (suggestions.length > 0) setShowSuggestions(true);
          }}
          autoCapitalize="words"
          autoCorrect={false}
          inputAccessoryViewID={inputAccessoryViewID}
        />
        {searching ? (
          <ActivityIndicator style={styles.inputTrailing} color={colors.neutralMuted} />
        ) : query.length > 0 ? (
          <Pressable
            style={styles.inputTrailing}
            onPress={clear}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Clear location"
          >
            <Text style={styles.clearText}>×</Text>
          </Pressable>
        ) : null}
      </View>

      {searchError ? <Text style={styles.errorText}>{searchError}</Text> : null}

      {showSuggestions && suggestions.length > 0 ? (
        <View style={styles.suggestions}>
          {suggestions.map((s, i) => (
            <Pressable
              key={s.id}
              style={[styles.suggestionRow, i > 0 && styles.suggestionDivider]}
              onPress={() => selectPlace(s)}
              accessibilityRole="button"
              accessibilityLabel={s.displayName}
            >
              <Text style={styles.pinGlyph}>📍</Text>
              <View style={styles.suggestionTextWrap}>
                <Text style={styles.suggestionTitle} numberOfLines={1}>
                  {s.title}
                </Text>
                {s.subtitle ? (
                  <Text style={styles.suggestionSubtitle} numberOfLines={1}>
                    {s.subtitle}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          ))}
        </View>
      ) : null}

      {region ? (
        <View style={styles.mapWrap}>
          <MapView
            style={styles.map}
            region={region}
            onRegionChangeComplete={setRegion}
            onPress={(e) => {
              const { latitude, longitude } = e.nativeEvent.coordinate;
              movePin(latitude, longitude);
            }}
            pointerEvents="auto"
          >
            <Marker
              coordinate={{
                latitude: region.latitude,
                longitude: region.longitude,
              }}
              draggable
              onDragEnd={(e) => {
                const { latitude, longitude } = e.nativeEvent.coordinate;
                movePin(latitude, longitude);
              }}
            />
          </MapView>
          <Text style={styles.mapHint}>Tap the map or drag the pin to adjust</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingRight: spacing.sm,
  },
  input: {
    ...typography.body,
    flex: 1,
    color: colors.neutral,
    fontSize: 15,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  inputTrailing: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearText: {
    color: colors.neutralMuted,
    fontSize: 20,
    lineHeight: 22,
  },
  errorText: {
    ...typography.bodySm,
    color: colors.emergency,
    fontSize: 12,
    marginTop: spacing.xs,
  },
  suggestions: {
    marginTop: spacing.xs,
    backgroundColor: colors.surfaceCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  suggestionDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  pinGlyph: {
    fontSize: 14,
  },
  suggestionTextWrap: {
    flex: 1,
  },
  suggestionTitle: {
    ...typography.bodySemiBold,
    color: colors.neutral,
    fontSize: 14,
  },
  suggestionSubtitle: {
    ...typography.bodySm,
    color: colors.neutralMuted,
    fontSize: 12,
    marginTop: 1,
  },
  mapWrap: {
    marginTop: spacing.sm,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  map: {
    width: '100%',
    height: 180,
  },
  mapHint: {
    ...typography.bodySm,
    color: colors.neutralMuted,
    fontSize: 11,
    textAlign: 'center',
    paddingVertical: spacing.xs,
    backgroundColor: colors.surfaceCard,
  },
});
