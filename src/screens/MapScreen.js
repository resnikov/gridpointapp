import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSettings } from '../utils/SettingsContext';
import { colors, spacing, radii } from '../utils/theme';
import { latLonToMaidenhead, latLonToOSGridRef } from '../utils/conversions';

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const { target, setTarget } = useSettings();

  const openInMaps = () => {
    if (!target) return;
    const url = Platform.OS === 'ios'
      ? `maps:?q=${target.lat},${target.lon}&ll=${target.lat},${target.lon}`
      : `geo:${target.lat},${target.lon}?q=${target.lat},${target.lon}`;
    Linking.openURL(url);
  };

  const openInGoogleMaps = () => {
    if (!target) return;
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${target.lat},${target.lon}`);
  };

  const openInOSMaps = () => {
    if (!target) return;
    Linking.openURL(`https://www.openstreetmap.org/?mlat=${target.lat}&mlon=${target.lon}&zoom=14`);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
      <View style={styles.header}>
        <Text style={styles.title}>MAP</Text>
        <Text style={styles.subtitle}>GRIDPOINT · M0LZN</Text>
      </View>

      {target ? (
        <>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>TARGET LOCATION</Text>

            <View style={styles.coordRow}>
              <Text style={styles.coordLabel}>LAT</Text>
              <Text style={styles.coordValue}>{target.lat.toFixed(6)}</Text>
            </View>
            <View style={[styles.coordRow, styles.coordRowBorder]}>
              <Text style={styles.coordLabel}>LON</Text>
              <Text style={styles.coordValue}>{target.lon.toFixed(6)}</Text>
            </View>
            <View style={[styles.coordRow, styles.coordRowBorder]}>
              <Text style={styles.coordLabel}>GRID</Text>
              <Text style={styles.coordValue}>{latLonToMaidenhead(target.lat, target.lon)}</Text>
            </View>
            <View style={[styles.coordRow, styles.coordRowBorder]}>
              <Text style={styles.coordLabel}>OS</Text>
              <Text style={styles.coordValue}>{latLonToOSGridRef(target.lat, target.lon) ?? '—'}</Text>
            </View>
          </View>

          <Text style={styles.sectionLabel}>OPEN IN</Text>
          <View style={styles.btnGroup}>
            <TouchableOpacity style={styles.mapBtn} onPress={openInMaps}>
              <Text style={styles.mapBtnText}>
                {Platform.OS === 'ios' ? 'APPLE MAPS' : 'MAPS'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.mapBtn} onPress={openInGoogleMaps}>
              <Text style={styles.mapBtnText}>GOOGLE MAPS</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.mapBtn} onPress={openInOSMaps}>
              <Text style={styles.mapBtnText}>OPENSTREETMAP</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.clearBtn} onPress={() => setTarget(null)}>
            <Text style={styles.clearBtnText}>✕ CLEAR TARGET</Text>
          </TouchableOpacity>
        </>
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>⌖</Text>
          <Text style={styles.emptyTitle}>NO TARGET SET</Text>
          <Text style={styles.emptyDesc}>
            Search a location on the Convert tab, tap a result card, then tap SET TARGET.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.md,
  },
  header: {
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 24,
    color: colors.text,
    fontFamily: 'Courier',
    fontWeight: '700',
    letterSpacing: 4,
  },
  subtitle: {
    fontSize: 9,
    color: colors.textDim,
    fontFamily: 'Courier',
    letterSpacing: 3,
    marginTop: 2,
  },
  card: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  cardLabel: {
    fontSize: 8,
    color: colors.textDim,
    fontFamily: 'Courier',
    letterSpacing: 2,
    paddingHorizontal: spacing.md,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  coordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  coordRowBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  coordLabel: {
    fontSize: 9,
    color: colors.textDim,
    fontFamily: 'Courier',
    letterSpacing: 2,
    width: 40,
  },
  coordValue: {
    fontSize: 16,
    color: colors.accent,
    fontFamily: 'Courier',
    letterSpacing: 0.5,
  },
  sectionLabel: {
    fontSize: 9,
    color: colors.textDim,
    fontFamily: 'Courier',
    letterSpacing: 2,
    marginBottom: spacing.sm,
  },
  btnGroup: {
    gap: 6,
    marginBottom: spacing.lg,
  },
  mapBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    backgroundColor: colors.bgCard,
  },
  mapBtnText: {
    color: colors.text,
    fontFamily: 'Courier',
    fontSize: 11,
    letterSpacing: 2,
  },
  clearBtn: {
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.3)',
    borderRadius: radii.md,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(255,23,68,0.05)',
  },
  clearBtnText: {
    color: colors.red,
    fontFamily: 'Courier',
    fontSize: 10,
    letterSpacing: 2,
  },
  emptyCard: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyIcon: {
    fontSize: 32,
    color: colors.textDim,
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 13,
    color: colors.textMid,
    fontFamily: 'Courier',
    letterSpacing: 2,
  },
  emptyDesc: {
    fontSize: 11,
    color: colors.textDim,
    fontFamily: 'Courier',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 4,
  },
});
