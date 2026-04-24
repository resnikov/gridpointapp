import React from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, Switch, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSettings, FORMAT_DEFINITIONS } from '../utils/SettingsContext';
import { colors, spacing, radii } from '../utils/theme';

// Group format definitions by their group label
function groupFormats(defs) {
  const groups = {};
  for (const def of defs) {
    if (!groups[def.group]) groups[def.group] = [];
    groups[def.group].push(def);
  }
  return groups;
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { visibleFormats, toggleFormat, setAll, distanceUnit, setDistanceUnit } = useSettings();

  const groups = groupFormats(FORMAT_DEFINITIONS);
  const allOn = Object.values(visibleFormats).every(Boolean);
  const visibleCount = Object.values(visibleFormats).filter(Boolean).length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View>
          <Text style={styles.title}>CONFIG</Text>
          <Text style={styles.subtitle}>GRIDPOINT · M0LZN</Text>
        </View>
      </View>

    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[
        styles.container,
        { paddingBottom: insets.bottom + 40 },
      ]}
    >

      {/* Section: Navigation */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>NAVIGATION</Text>
        <View style={styles.group}>
          <Text style={styles.groupLabel}>DISTANCE UNITS</Text>
          <View style={styles.row}>
            <View style={styles.unitToggle}>
              {['km', 'mi'].map((unit) => (
                <TouchableOpacity
                  key={unit}
                  style={[styles.unitBtn, distanceUnit === unit && styles.unitBtnActive]}
                  onPress={() => setDistanceUnit(unit)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.unitBtnText, distanceUnit === unit && styles.unitBtnTextActive]}>
                    {unit === 'km' ? 'KM' : 'MILES'}
                  </Text>
                  {unit === 'km' && (
                    <Text style={[styles.unitBtnSub, distanceUnit === unit && styles.unitBtnSubActive]}>
                      m / km
                    </Text>
                  )}
                  {unit === 'mi' && (
                    <Text style={[styles.unitBtnSub, distanceUnit === unit && styles.unitBtnSubActive]}>
                      ft / mi
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </View>

      {/* Section: Visible formats */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>VISIBLE FORMATS</Text>
          <TouchableOpacity onPress={() => setAll(!allOn)}>
            <Text style={styles.toggleAll}>{allOn ? 'HIDE ALL' : 'SHOW ALL'}</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.sectionDesc}>
          Choose which coordinate formats appear in results. {visibleCount} of {FORMAT_DEFINITIONS.length} shown.
        </Text>

        {Object.entries(groups).map(([group, formats]) => (
          <View key={group} style={styles.group}>
            <Text style={styles.groupLabel}>{group.toUpperCase()}</Text>
            {formats.map((fmt, i) => {
              const isLast = i === formats.length - 1;
              const isOn = visibleFormats[fmt.key];
              // Prevent toggling off if it's the only one left
              const isLastVisible = isOn && visibleCount === 1;

              return (
                <View
                  key={fmt.key}
                  style={[styles.row, !isLast && styles.rowBorder]}
                >
                  <View style={styles.rowText}>
                    <Text style={[styles.rowLabel, !isOn && styles.rowLabelOff]}>
                      {fmt.label}
                    </Text>
                    <Text style={[styles.rowExample, !isOn && styles.rowExampleOff]}>
                      {fmt.example}
                    </Text>
                  </View>
                  <Switch
                    value={isOn}
                    onValueChange={() => !isLastVisible && toggleFormat(fmt.key)}
                    disabled={isLastVisible}
                    trackColor={{ false: colors.bgElevated, true: colors.accentDim }}
                    thumbColor={isOn ? colors.accent : colors.textDim}
                    ios_backgroundColor={colors.bgElevated}
                  />
                </View>
              );
            })}
          </View>
        ))}
      </View>

      {/* Section: About */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ABOUT</Text>
        <View style={styles.aboutCard}>
          <Row label="App" value="GridPoint" />
          <Row label="Callsign" value="M0LZN" />
          <Row label="OS Grid" value="Helmert transform" />
          <Row label="Place search" value="OpenStreetMap Nominatim" />
          <Row label="Plus Codes" value="Google OLC" />
          <LinkRow label="Website" url="https://m0lzn.com" display="m0lzn.com" />
          <LinkRow label="GitHub" url="https://github.com/resnikov" display="github.com/resnikov" last />
        </View>
      </View>
    </ScrollView>
    </View>
  );
}

function Row({ label, value }) {
  return (
    <View style={styles.aboutRow}>
      <Text style={styles.aboutLabel}>{label}</Text>
      <Text style={styles.aboutValue}>{value}</Text>
    </View>
  );
}

function LinkRow({ label, url, display, last }) {
  return (
    <TouchableOpacity
      style={[styles.aboutRow, last && styles.aboutRowLast]}
      onPress={() => Linking.openURL(url)}
      activeOpacity={0.7}
    >
      <Text style={styles.aboutLabel}>{label}</Text>
      <Text style={styles.aboutLink}>{display} ›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
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
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 9,
    color: colors.textDim,
    fontFamily: 'Courier',
    letterSpacing: 2,
  },
  toggleAll: {
    fontSize: 9,
    color: colors.accent,
    fontFamily: 'Courier',
    letterSpacing: 1.5,
  },
  sectionDesc: {
    fontSize: 11,
    color: colors.textMid,
    fontFamily: 'Courier',
    lineHeight: 16,
    marginBottom: spacing.md,
  },
  group: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  groupLabel: {
    fontSize: 8,
    color: colors.textDim,
    fontFamily: 'Courier',
    letterSpacing: 2,
    paddingHorizontal: spacing.md,
    paddingTop: 10,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    gap: spacing.md,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowLabel: {
    fontSize: 13,
    color: colors.text,
    fontFamily: 'Courier',
  },
  rowLabelOff: {
    color: colors.textDim,
  },
  rowExample: {
    fontSize: 10,
    color: colors.textMid,
    fontFamily: 'Courier',
    letterSpacing: 0.5,
  },
  rowExampleOff: {
    color: colors.textDim,
  },
  aboutCard: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    overflow: 'hidden',
    marginTop: spacing.sm,
  },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  aboutLabel: {
    fontSize: 11,
    color: colors.textMid,
    fontFamily: 'Courier',
  },
  aboutValue: {
    fontSize: 11,
    color: colors.text,
    fontFamily: 'Courier',
  },
  aboutRowLast: {
    borderBottomWidth: 0,
  },
  aboutLink: {
    fontSize: 11,
    color: colors.accent,
    fontFamily: 'Courier',
  },
  unitToggle: {
    flexDirection: 'row',
    flex: 1,
    gap: 6,
  },
  unitBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.bgElevated,
  },
  unitBtnActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentGlow,
  },
  unitBtnText: {
    fontFamily: 'Courier',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 2,
    color: colors.textDim,
  },
  unitBtnTextActive: {
    color: colors.accent,
  },
  unitBtnSub: {
    fontFamily: 'Courier',
    fontSize: 9,
    letterSpacing: 1,
    color: colors.textDim,
    marginTop: 2,
  },
  unitBtnSubActive: {
    color: colors.accentDim,
  },
});
