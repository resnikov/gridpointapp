import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, StatusBar, ActivityIndicator, KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { convertAll } from '../utils/conversions';
import { colors, spacing, radii } from '../utils/theme';
import ResultCard from '../components/ResultCard';
import { useSettings, FORMAT_DEFINITIONS } from '../utils/SettingsContext';

const ALL_FORMATS = FORMAT_DEFINITIONS.map(f => f.key);

// ── Place name search via Nominatim (OSM, no key needed) ──────
async function searchPlaceName(query) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5`;
  const res = await fetch(url, {
    headers: { 'Accept-Language': 'en', 'User-Agent': 'GridPoint/1.0 (m0lzn.com)' },
  });
  if (!res.ok) throw new Error('Search failed');
  return res.json();
}

export default function ConvertScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { visibleFormats, target, setTarget } = useSettings();
  const [input, setInput] = useState('');
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [locating, setLocating] = useState(false);
  const [searching, setSearching] = useState(false);
  const [placeResults, setPlaceResults] = useState(null);
  const [expandedCard, setExpandedCard] = useState(null);

  React.useEffect(() => {
    if (route?.params?.target) setTarget(route.params.target);
  }, [route?.params?.target]);

  const handleSearch = useCallback(async (text) => {
    const val = (text ?? input).trim();
    if (!val) { setResults(null); setPlaceResults(null); setError(null); return; }

    setExpandedCard(null);

    // Try coordinate formats first
    const res = convertAll(val);
    if (res) {
      setError(null);
      setPlaceResults(null);
      setResults(res);
      return;
    }

    // Fall through to place name search
    setResults(null);
    setSearching(true);
    setError(null);
    try {
      const places = await searchPlaceName(val);
      if (!places.length) {
        setError('No results found. Try a coordinate format or a different place name.');
        setPlaceResults(null);
      } else {
        setPlaceResults(places);
      }
    } catch (e) {
      setError('Place search failed. Check your connection.');
    } finally {
      setSearching(false);
    }
  }, [input]);

  const handleSelectPlace = (place) => {
    const lat = parseFloat(place.lat);
    const lon = parseFloat(place.lon);
    const text = `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
    setInput(text);
    setPlaceResults(null);
    const res = convertAll(text);
    if (res) { setResults(res); setError(null); }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleMyLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setError('Location permission denied.'); return; }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude, longitude } = loc.coords;
      const text = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
      setInput(text);
      handleSearch(text);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {
      setError('Could not get location.');
    } finally {
      setLocating(false);
    }
  };

  const handleSetTarget = (latlon) => {
    setTarget(latlon);
    setExpandedCard(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />

      {/* ── Sticky header — never scrolls ── */}
      <View style={[styles.stickyHeader, { paddingTop: insets.top + 12 }]}>
        <View style={styles.logoRow}>
          <Text style={styles.logoText}>GRID</Text>
          <Text style={styles.logoAccent}>POINT</Text>
          <Text style={styles.logoSub}> · M0LZN</Text>
          {target && (
            <TouchableOpacity
              style={styles.arBadge}
              onPress={() => navigation.navigate('AR', { target })}
            >
              <Text style={styles.arBadgeText}>⌖ AR</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={(t) => {
              setInput(t);
              if (!t) { setResults(null); setPlaceResults(null); setError(null); }
            }}
            onSubmitEditing={() => handleSearch()}
            placeholder="Coordinates or place name…"
            placeholderTextColor={colors.textDim}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
          <TouchableOpacity
            style={[styles.searchBtn, (searching || locating) && styles.searchBtnBusy]}
            onPress={() => handleSearch()}
            activeOpacity={0.8}
            disabled={searching || locating}
          >
            {searching
              ? <ActivityIndicator size="small" color={colors.bg} />
              : <Text style={styles.searchBtnText}>GO</Text>}
          </TouchableOpacity>
        </View>

        <View style={styles.strip}>
          <TouchableOpacity style={styles.stripBtn} onPress={handleMyLocation} disabled={locating}>
            {locating
              ? <ActivityIndicator size="small" color={colors.accent} />
              : <Text style={styles.stripBtnText}>⊕ MY LOCATION</Text>}
          </TouchableOpacity>

          {target && (
            <View style={styles.targetChip}>
              <Text style={styles.targetChipLabel}>TARGET </Text>
              <Text style={styles.targetChipValue} numberOfLines={1}>
                {target.lat.toFixed(4)}, {target.lon.toFixed(4)}
              </Text>
              <TouchableOpacity
                onPress={() => setTarget(null)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.targetChipClear}>✕</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* ── Scrollable content ── */}
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        keyboardShouldPersistTaps="handled"
      >
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Place name results list */}
        {placeResults && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>PLACE RESULTS</Text>
            {placeResults.map((place, i) => (
              <TouchableOpacity
                key={i}
                style={styles.placeRow}
                onPress={() => handleSelectPlace(place)}
                activeOpacity={0.7}
              >
                <View style={styles.placeRowInner}>
                  <Text style={styles.placeName} numberOfLines={2}>{place.display_name}</Text>
                  <Text style={styles.placeCoords}>
                    {parseFloat(place.lat).toFixed(5)}, {parseFloat(place.lon).toFixed(5)}
                  </Text>
                </View>
                <Text style={styles.placeArrow}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Idle hint pills */}
        {!results && !placeResults && !error && (
          <View style={styles.hints}>
            <Text style={styles.hintLabel}>TRY AN EXAMPLE</Text>
            {[
              'Sherburn in Elmet',
              'IO93HM',
              '53.788, -1.233',
              'SE 490 330',
              'SE49',
              '9C6WXGRQ+XX',
            ].map((ex) => (
              <TouchableOpacity
                key={ex}
                style={styles.pill}
                onPress={() => { setInput(ex); handleSearch(ex); }}
              >
                <Text style={styles.pillText}>{ex}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Coordinate conversion results */}
        {results && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>DETECTED: {results.detected.toUpperCase()}</Text>
            {ALL_FORMATS.filter(key => visibleFormats[key]).map((key) => (
              <ResultCard
                key={key}
                formatKey={key}
                value={results[key]}
                isSource={
                  results.detected === key ||
                  (results.detected === 'latlon' && key === 'decimal')
                }
                expanded={expandedCard === key}
                onPress={() => setExpandedCard(expandedCard === key ? null : key)}
                onSetTarget={() => handleSetTarget(results.latlon)}
                hasTarget={!!target}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  stickyHeader: {
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  logoText: {
    fontSize: 24,
    color: colors.text,
    fontFamily: 'Courier',
    fontWeight: '700',
    letterSpacing: 4,
  },
  logoAccent: {
    fontSize: 24,
    color: colors.accent,
    fontFamily: 'Courier',
    fontWeight: '700',
    letterSpacing: 4,
  },
  logoSub: {
    fontSize: 11,
    color: colors.textDim,
    fontFamily: 'Courier',
    letterSpacing: 2,
    flex: 1,
    marginLeft: 2,
  },
  arBadge: {
    backgroundColor: colors.amberGlow,
    borderWidth: 1,
    borderColor: colors.amber,
    borderRadius: radii.sm,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  arBadgeText: {
    color: colors.amber,
    fontFamily: 'Courier',
    fontSize: 10,
    letterSpacing: 1.5,
  },
  inputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 11,
    color: colors.text,
    fontFamily: 'Courier',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  searchBtn: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    minWidth: 52,
    alignItems: 'center',
  },
  searchBtnBusy: { backgroundColor: colors.accentDim },
  searchBtnText: {
    color: colors.bg,
    fontFamily: 'Courier',
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 2,
  },
  strip: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  stripBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: 12,
    paddingVertical: 7,
    justifyContent: 'center',
    minHeight: 34,
  },
  stripBtnText: {
    fontSize: 10,
    color: colors.textMid,
    fontFamily: 'Courier',
    letterSpacing: 1.5,
  },
  targetChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.amberGlow,
    borderWidth: 1,
    borderColor: colors.amber,
    borderRadius: radii.sm,
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 4,
  },
  targetChipLabel: {
    fontSize: 8,
    color: colors.amber,
    fontFamily: 'Courier',
    letterSpacing: 1.5,
  },
  targetChipValue: {
    flex: 1,
    fontSize: 10,
    color: colors.amberDim,
    fontFamily: 'Courier',
  },
  targetChipClear: {
    color: colors.amber,
    fontSize: 12,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  errorBox: {
    backgroundColor: 'rgba(255,23,68,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.3)',
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: {
    color: colors.red,
    fontFamily: 'Courier',
    fontSize: 12,
    lineHeight: 18,
  },
  section: { marginBottom: spacing.md },
  sectionLabel: {
    fontSize: 9,
    color: colors.textDim,
    fontFamily: 'Courier',
    letterSpacing: 2,
    marginBottom: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  placeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    marginBottom: 6,
    gap: spacing.sm,
  },
  placeRowInner: { flex: 1 },
  placeName: {
    color: colors.text,
    fontFamily: 'Courier',
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 3,
  },
  placeCoords: {
    color: colors.textDim,
    fontFamily: 'Courier',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  placeArrow: {
    color: colors.accent,
    fontSize: 20,
  },
  hints: { gap: 8, marginTop: spacing.sm },
  hintLabel: {
    fontSize: 9,
    color: colors.textDim,
    fontFamily: 'Courier',
    letterSpacing: 2,
    marginBottom: 4,
  },
  pill: {
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.bgCard,
    alignSelf: 'flex-start',
  },
  pillText: {
    color: colors.textDim,
    fontFamily: 'Courier',
    fontSize: 11,
    letterSpacing: 0.5,
  },
});
