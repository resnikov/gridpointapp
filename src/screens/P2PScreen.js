import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, StatusBar, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { convertAll, haversineDistance, bearingTo, formatDistance, formatBearing } from '../utils/conversions';
import { useSettings } from '../utils/SettingsContext';
import { colors, spacing, radii } from '../utils/theme';

async function searchPlaceName(query) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5`;
  const res = await fetch(url, {
    headers: { 'Accept-Language': 'en', 'User-Agent': 'GridPoint/1.0 (m0lzn.com)' },
  });
  if (!res.ok) throw new Error('Search failed');
  return res.json();
}

function useLocationSlot() {
  const [input, setInput]           = useState('');
  const [location, setLocation]     = useState(null); // { lat, lon, label }
  const [placeResults, setPlaceResults] = useState(null);
  const [searching, setSearching]   = useState(false);
  const [error, setError]           = useState(null);

  const resolve = useCallback(async (text) => {
    const val = (text ?? input).trim();
    if (!val) { setLocation(null); setPlaceResults(null); setError(null); return; }

    const res = convertAll(val);
    if (res) {
      setLocation({ ...res.latlon, label: val });
      setPlaceResults(null);
      setError(null);
      return;
    }

    setSearching(true);
    setError(null);
    setLocation(null);
    try {
      const places = await searchPlaceName(val);
      if (!places.length) {
        setError('No results found.');
        setPlaceResults(null);
      } else {
        setPlaceResults(places);
      }
    } catch {
      setError('Search failed. Check your connection.');
    } finally {
      setSearching(false);
    }
  }, [input]);

  const selectPlace = (place) => {
    const lat = parseFloat(place.lat);
    const lon = parseFloat(place.lon);
    const res = convertAll(`${lat.toFixed(6)}, ${lon.toFixed(6)}`);
    if (res) setLocation({ ...res.latlon, label: input.trim() });
    setPlaceResults(null);
    setError(null);
  };

  const clear = () => { setInput(''); setLocation(null); setPlaceResults(null); setError(null); };

  return { input, setInput, location, placeResults, selectPlace, searching, error, resolve, clear };
}

function LocationSlot({ label: slotLabel, slot }) {
  return (
    <View style={styles.slot}>
      <Text style={styles.slotLabel}>{slotLabel}</Text>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={slot.input}
          onChangeText={(t) => {
            slot.setInput(t);
            if (!t) slot.clear();
          }}
          onSubmitEditing={() => slot.resolve()}
          placeholder="Coordinates, grid ref or place…"
          placeholderTextColor={colors.textDim}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          selectTextOnFocus
        />
        <TouchableOpacity
          style={[styles.goBtn, slot.searching && styles.goBtnBusy]}
          onPress={() => slot.resolve()}
          disabled={slot.searching}
          activeOpacity={0.8}
        >
          {slot.searching
            ? <ActivityIndicator size="small" color={colors.bg} />
            : <Text style={styles.goBtnText}>GO</Text>}
        </TouchableOpacity>
      </View>

      {slot.error && <Text style={styles.slotError}>{slot.error}</Text>}

      {slot.location && (
        <View style={styles.resolvedRow}>
          <Text style={styles.resolvedIcon}>◉</Text>
          <Text style={styles.resolvedLabel} numberOfLines={1}>{slot.location.label}</Text>
          <Text style={styles.resolvedCoords}>
            {slot.location.lat.toFixed(4)}, {slot.location.lon.toFixed(4)}
          </Text>
        </View>
      )}

      {slot.placeResults && (
        <View style={styles.placeList}>
          {slot.placeResults.map((place, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.placeRow, i === slot.placeResults.length - 1 && styles.placeRowLast]}
              onPress={() => slot.selectPlace(place)}
              activeOpacity={0.7}
            >
              <Text style={styles.placeName} numberOfLines={1}>{place.display_name}</Text>
              <Text style={styles.placeCoords}>
                {parseFloat(place.lat).toFixed(4)}, {parseFloat(place.lon).toFixed(4)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

export default function P2PScreen() {
  const insets = useSafeAreaInsets();
  const { distanceUnit } = useSettings();
  const from = useLocationSlot();
  const to   = useLocationSlot();

  const canCompute = from.location && to.location;

  const dist = canCompute
    ? haversineDistance(from.location.lat, from.location.lon, to.location.lat, to.location.lon)
    : null;
  const fwdBearing = canCompute
    ? bearingTo(from.location.lat, from.location.lon, to.location.lat, to.location.lon)
    : null;
  const revBearing = canCompute
    ? bearingTo(to.location.lat, to.location.lon, from.location.lat, from.location.lon)
    : null;

  const swap = async () => {
    const fromInput = from.input, fromLoc = from.location;
    const toInput   = to.input,   toLoc   = to.location;
    from.setInput(toInput);
    from.location && to.setInput(fromInput);
    to.setInput(fromInput);
    if (toLoc)   { from.setInput(toInput);   }
    if (fromLoc) { to.setInput(fromInput);   }
    // Rebuild location state via resolve
    if (toInput)   from.resolve(toInput);
    if (fromInput) to.resolve(fromInput);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />

      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View>
          <Text style={styles.title}>POINT TO POINT</Text>
          <Text style={styles.subtitle}>GRIDPOINT · M0LZN</Text>
        </View>
        {(from.input || to.input) && (
          <TouchableOpacity
            style={styles.clearBtn}
            onPress={() => { from.clear(); to.clear(); }}
            activeOpacity={0.7}
          >
            <Text style={styles.clearBtnText}>✕ CLEAR</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* FROM slot */}
        <LocationSlot label="FROM" slot={from} />

        {/* Swap button */}
        <View style={styles.swapRow}>
          <View style={styles.swapLine} />
          <TouchableOpacity style={styles.swapBtn} onPress={swap} activeOpacity={0.7}>
            <Text style={styles.swapBtnText}>⇅</Text>
          </TouchableOpacity>
          <View style={styles.swapLine} />
        </View>

        {/* TO slot */}
        <LocationSlot label="TO" slot={to} />

        {/* ── Results ── */}
        {canCompute && (
          <View style={styles.results}>
            <Text style={styles.sectionLabel}>RESULTS</Text>

            <View style={styles.resultsCard}>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>DISTANCE</Text>
                <Text style={styles.resultValue}>{formatDistance(dist, distanceUnit)}</Text>
              </View>
              <View style={[styles.resultRow, styles.resultRowBorder]}>
                <Text style={styles.resultLabel}>BEARING</Text>
                <Text style={styles.resultValue}>{formatBearing(fwdBearing)}</Text>
              </View>
              <View style={[styles.resultRow, styles.resultRowBorder]}>
                <Text style={styles.resultLabel}>RETURN BEARING</Text>
                <Text style={styles.resultValue}>{formatBearing(revBearing)}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Empty hint */}
        {!canCompute && (
          <View style={styles.hint}>
            <Text style={styles.hintText}>
              Enter two locations in any format —{'\n'}
              coordinates, grid reference, or place name
            </Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.bg,
  },
  clearBtn: {
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.35)',
    borderRadius: radii.sm,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: 'rgba(255,23,68,0.07)',
  },
  clearBtnText: {
    fontFamily: 'Courier',
    fontSize: 9,
    letterSpacing: 1.5,
    color: colors.red,
  },
  title: {
    fontFamily: 'Courier',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 4,
    color: colors.text,
  },
  subtitle: {
    fontFamily: 'Courier',
    fontSize: 9,
    letterSpacing: 2,
    color: colors.textDim,
    marginTop: 2,
  },

  scroll: {
    padding: spacing.md,
  },

  // Location slot
  slot: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: 0,
  },
  slotLabel: {
    fontFamily: 'Courier',
    fontSize: 8,
    letterSpacing: 3,
    color: colors.textDim,
    marginBottom: spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    color: colors.text,
    fontFamily: 'Courier',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  goBtn: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    minWidth: 48,
    alignItems: 'center',
  },
  goBtnBusy: { backgroundColor: colors.accentDim },
  goBtnText: {
    color: colors.bg,
    fontFamily: 'Courier',
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 2,
  },
  slotError: {
    fontFamily: 'Courier',
    fontSize: 10,
    color: colors.red,
    marginTop: spacing.sm,
    letterSpacing: 0.5,
  },
  resolvedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: 6,
  },
  resolvedIcon: {
    fontSize: 10,
    color: colors.accent,
  },
  resolvedLabel: {
    fontFamily: 'Courier',
    fontSize: 12,
    color: colors.text,
    flex: 1,
  },
  resolvedCoords: {
    fontFamily: 'Courier',
    fontSize: 10,
    color: colors.textDim,
    letterSpacing: 0.5,
  },
  placeList: {
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  placeRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  placeRowLast: { borderBottomWidth: 0 },
  placeName: {
    fontFamily: 'Courier',
    fontSize: 11,
    color: colors.text,
    marginBottom: 2,
  },
  placeCoords: {
    fontFamily: 'Courier',
    fontSize: 9,
    color: colors.textDim,
    letterSpacing: 0.5,
  },

  // Swap
  swapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.sm,
  },
  swapLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.borderSubtle,
  },
  swapBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.sm,
  },
  swapBtnText: {
    color: colors.textMid,
    fontSize: 16,
  },

  // Results
  results: {
    marginTop: spacing.md,
  },
  sectionLabel: {
    fontFamily: 'Courier',
    fontSize: 9,
    letterSpacing: 3,
    color: colors.textDim,
    marginBottom: spacing.sm,
  },
  resultsCard: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  resultRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  resultRowBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  resultLabel: {
    fontFamily: 'Courier',
    fontSize: 8,
    letterSpacing: 3,
    color: colors.textDim,
    marginBottom: 4,
  },
  resultValue: {
    fontFamily: 'Courier',
    fontSize: 22,
    fontWeight: '700',
    color: colors.accent,
    letterSpacing: 1,
  },

  // Hint
  hint: {
    marginTop: spacing.xl,
    alignItems: 'center',
  },
  hintText: {
    fontFamily: 'Courier',
    fontSize: 11,
    color: colors.textDim,
    letterSpacing: 1,
    lineHeight: 18,
    textAlign: 'center',
  },
});
