import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Pressable,
  ActivityIndicator, Animated, StyleSheet, StatusBar,
} from 'react-native';
import * as Location from 'expo-location';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radii } from '../utils/theme';
import { getAllFormats } from '../utils/conversions';

const GPS_IDLE    = 'idle';
const GPS_WAITING = 'waiting';
const GPS_LOCKED  = 'locked';
const GPS_ERROR   = 'error';

function accuracyLabel(acc) {
  if (acc == null) return '';
  if (acc <= 5)  return `±${acc.toFixed(0)}m  ███`;
  if (acc <= 15) return `±${acc.toFixed(0)}m  ██░`;
  if (acc <= 50) return `±${acc.toFixed(0)}m  █░░`;
  return              `±${acc.toFixed(0)}m  ░░░`;
}

function ResultRow({ label, value }) {
  const [copied, setCopied] = useState(false);
  const scale = useRef(new Animated.Value(1)).current;

  const handleCopy = useCallback(async () => {
    await Clipboard.setStringAsync(value);
    setCopied(true);
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.94, duration: 80, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1,    duration: 120, useNativeDriver: true }),
    ]).start();
    setTimeout(() => setCopied(false), 1400);
  }, [value]);

  return (
    <Animated.View style={[styles.resultRow, { transform: [{ scale }] }]}>
      <View style={styles.resultLeft}>
        <Text style={styles.resultLabel}>{label.toUpperCase()}</Text>
        <Text style={styles.resultValue} selectable>{value}</Text>
      </View>
      <Pressable
        onPress={handleCopy}
        style={({ pressed }) => [styles.copyBtn, pressed && styles.copyBtnPressed]}
      >
        <Text style={[styles.copyIcon, copied && styles.copyIconDone]}>
          {copied ? '✓' : '⧉'}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

function PulseRing({ active }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale   = useRef(new Animated.Value(0.6)).current;

  React.useEffect(() => {
    if (!active) { opacity.setValue(0); scale.setValue(0.6); return; }
    const loop = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0.6, duration: 400, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0,   duration: 900, useNativeDriver: true }),
        ]),
        Animated.timing(scale, { toValue: 1.8, duration: 1300, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [active]);

  if (!active) return null;
  return (
    <Animated.View
      style={[styles.pulseRing, { opacity, transform: [{ scale }] }]}
      pointerEvents="none"
    />
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [gpsState, setGpsState] = useState(GPS_IDLE);
  const [location, setLocation] = useState(null);
  const [results,  setResults]  = useState([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [watching, setWatching] = useState(false);
  const watchSub = useRef(null);
  const resultsFade = useRef(new Animated.Value(0)).current;

  const showResults = useCallback((lat, lon, accuracy) => {
    setLocation({ lat, lon, accuracy });
    setResults(getAllFormats(lat, lon));
    setGpsState(GPS_LOCKED);
    resultsFade.setValue(0);
    Animated.timing(resultsFade, { toValue: 1, duration: 350, useNativeDriver: true }).start();
  }, []);

  const getLocation = useCallback(async () => {
    setErrorMsg('');
    setGpsState(GPS_WAITING);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setErrorMsg('Location permission denied');
      setGpsState(GPS_ERROR);
      return;
    }
    try {
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.BestForNavigation });
      showResults(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy);
    } catch {
      setErrorMsg('Could not get location. Are you outdoors?');
      setGpsState(GPS_ERROR);
    }
  }, [showResults]);

  const toggleWatch = useCallback(async () => {
    if (watching) {
      watchSub.current?.remove();
      watchSub.current = null;
      setWatching(false);
      return;
    }
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') { setErrorMsg('Location permission denied'); return; }
    setWatching(true);
    setGpsState(GPS_WAITING);
    watchSub.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 2000, distanceInterval: 2 },
      (pos) => showResults(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy)
    );
  }, [watching, showResults]);

  const isLocked  = gpsState === GPS_LOCKED;
  const isWaiting = gpsState === GPS_WAITING;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />

      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>LOCATE</Text>
          <Text style={styles.subtitle}>GRIDPOINT · M0LZN</Text>
        </View>
        <View style={[
          styles.statusDot,
          isLocked  && styles.statusDotGreen,
          isWaiting && styles.statusDotAmber,
          gpsState === GPS_ERROR && styles.statusDotRed,
        ]} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── GPS Panel ── */}
        <View style={styles.gpsPanel}>
          <View style={styles.gpsBtnWrap}>
            <PulseRing active={isWaiting} />
            <TouchableOpacity
              style={[styles.gpsBtn, isWaiting && styles.gpsBtnWaiting, isLocked && styles.gpsBtnLocked]}
              onPress={getLocation}
              disabled={isWaiting}
              activeOpacity={0.75}
            >
              {isWaiting
                ? <ActivityIndicator color={colors.amber} size="small" />
                : <Text style={[styles.gpsBtnIcon, isLocked && styles.gpsBtnIconLocked]}>
                    {isLocked ? '◉' : '◎'}
                  </Text>
              }
            </TouchableOpacity>
          </View>

          <Text style={styles.gpsBtnLabel}>
            {isWaiting ? 'ACQUIRING…'
              : isLocked ? 'FIX ACQUIRED — TAP TO REFRESH'
              : gpsState === GPS_ERROR ? 'TAP TO RETRY'
              : 'TAP TO ACQUIRE GPS FIX'}
          </Text>

          {isLocked && location?.accuracy != null && (
            <Text style={styles.accuracyText}>{accuracyLabel(location.accuracy)}</Text>
          )}

          <TouchableOpacity
            style={[styles.trackBtn, watching && styles.trackBtnActive]}
            onPress={toggleWatch}
          >
            <Text style={[styles.trackBtnText, watching && styles.trackBtnTextActive]}>
              {watching ? '■  STOP TRACKING' : '▶  LIVE TRACK'}
            </Text>
          </TouchableOpacity>

          {gpsState === GPS_ERROR && errorMsg ? (
            <Text style={styles.errorText}>{errorMsg}</Text>
          ) : null}
        </View>

        {/* ── Coordinates header ── */}
        {isLocked && location && (
          <Animated.View style={[styles.coordsCard, { opacity: resultsFade }]}>
            <Text style={styles.sectionLabel}>POSITION</Text>
            <Text style={styles.coordsValue}>
              {location.lat >= 0 ? '+' : ''}{location.lat.toFixed(6)}{'  '}
              {location.lon >= 0 ? '+' : ''}{location.lon.toFixed(6)}
            </Text>
          </Animated.View>
        )}

        {/* ── Results ── */}
        {results.length > 0 && (
          <Animated.View style={{ opacity: resultsFade }}>
            <Text style={styles.sectionLabel}>ALL FORMATS</Text>
            <View style={styles.resultsContainer}>
              {results.map((item) => (
                <ResultRow key={item.label} label={item.label} value={item.value} />
              ))}
            </View>
          </Animated.View>
        )}

        {/* ── Empty state ── */}
        {gpsState === GPS_IDLE && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyGrid}>
              {'  IO  ·  IN  ·  IM  \n  JO  ·  JN  ·  JM  \n  KO  ·  KN  ·  KM  '}
            </Text>
            <Text style={styles.emptyText}>
              Acquire a GPS fix to convert your{'\n'}position into all major grid formats
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  // Header
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
  headerLeft: {},
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
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.textDim,
  },
  statusDotGreen: { backgroundColor: colors.green },
  statusDotAmber: { backgroundColor: colors.amber },
  statusDotRed:   { backgroundColor: colors.red },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.md, paddingTop: spacing.lg },

  // GPS panel
  gpsPanel: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  gpsBtnWrap: {
    width: 88,
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  pulseRing: {
    position: 'absolute',
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 1.5,
    borderColor: colors.amber,
  },
  gpsBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gpsBtnWaiting: { borderColor: colors.amberDim },
  gpsBtnLocked:  { borderColor: colors.green, backgroundColor: colors.bgElevated },
  gpsBtnIcon: {
    fontSize: 28,
    color: colors.textDim,
  },
  gpsBtnIconLocked: { color: colors.green },
  gpsBtnLabel: {
    fontFamily: 'Courier',
    fontSize: 10,
    letterSpacing: 1.5,
    color: colors.textDim,
    marginBottom: spacing.sm,
  },
  accuracyText: {
    fontFamily: 'Courier',
    fontSize: 11,
    color: colors.amberDim,
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  trackBtn: {
    marginTop: spacing.sm,
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
  },
  trackBtnActive: {
    borderColor: colors.amber,
    backgroundColor: colors.amberGlow,
  },
  trackBtnText: {
    fontFamily: 'Courier',
    fontSize: 11,
    letterSpacing: 2,
    color: colors.textDim,
  },
  trackBtnTextActive: { color: colors.amber },
  errorText: {
    marginTop: spacing.sm,
    fontFamily: 'Courier',
    fontSize: 11,
    color: colors.red,
    letterSpacing: 0.5,
    textAlign: 'center',
  },

  // Coords card
  coordsCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: colors.bgCard,
  },
  coordsValue: {
    fontFamily: 'Courier',
    fontSize: 17,
    color: colors.accent,
    letterSpacing: 1,
    marginTop: 4,
  },

  // Section label (shared)
  sectionLabel: {
    fontFamily: 'Courier',
    fontSize: 9,
    letterSpacing: 3,
    color: colors.textDim,
    marginBottom: spacing.sm,
  },

  // Results
  resultsContainer: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    backgroundColor: colors.bgCard,
  },
  resultLeft: {
    flex: 1,
    marginRight: spacing.sm,
  },
  resultLabel: {
    fontFamily: 'Courier',
    fontSize: 9,
    letterSpacing: 2,
    color: colors.textDim,
    marginBottom: 3,
  },
  resultValue: {
    fontFamily: 'Courier',
    fontSize: 14,
    color: colors.text,
    letterSpacing: 0.5,
  },
  copyBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
  },
  copyBtnPressed: {
    borderColor: colors.accentDim,
    backgroundColor: colors.accentGlow,
  },
  copyIcon: {
    fontSize: 14,
    color: colors.textDim,
  },
  copyIconDone: { color: colors.green },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  emptyGrid: {
    fontFamily: 'Courier',
    fontSize: 13,
    color: colors.border,
    letterSpacing: 2,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  emptyText: {
    fontFamily: 'Courier',
    fontSize: 11,
    color: colors.textDim,
    letterSpacing: 1,
    lineHeight: 18,
    textAlign: 'center',
  },
});
