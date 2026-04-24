import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { colors, radii, spacing } from '../utils/theme';

const FORMAT_LABELS = {
  decimal:        'Decimal Degrees',
  dms:            'Deg Min Sec',
  degreesMinutes: 'Deg Min',
  maidenhead:     'Maidenhead Grid',
  osgrid:         'OS Grid Ref',
  wab:            'WAB Square',
  pluscode:       'Plus Code',
};

const FORMAT_ICONS = {
  decimal:        '◎',
  dms:            '◉',
  degreesMinutes: '◎',
  maidenhead:     '▦',
  osgrid:         '▤',
  wab:            '◰',
  pluscode:       '⊞',
};

export default function ResultCard({
  formatKey, value, isSource,
  expanded, onPress,
  onSetTarget, hasTarget,
}) {
  const [copied, setCopied] = React.useState(false);
  const isOutsideGB = value === 'Outside GB';

  const handleCopy = async () => {
    await Clipboard.setStringAsync(value);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleSetTarget = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSetTarget?.();
  };

  return (
    <TouchableOpacity
      style={[
        styles.card,
        isSource && styles.cardSource,
        expanded && styles.cardExpanded,
        isOutsideGB && styles.cardDimmed,
      ]}
      onPress={isOutsideGB ? undefined : onPress}
      activeOpacity={isOutsideGB ? 1 : 0.75}
    >
      <View style={styles.row}>
        <Text style={styles.icon}>{FORMAT_ICONS[formatKey]}</Text>
        <Text style={styles.label}>{FORMAT_LABELS[formatKey]}</Text>
        {isSource && (
          <View style={styles.sourceBadge}>
            <Text style={styles.sourceBadgeText}>INPUT</Text>
          </View>
        )}
        {!isOutsideGB && (
          <Text style={[styles.chevron, expanded && styles.chevronOpen]}>›</Text>
        )}
      </View>

      <Text
        style={[
          styles.value,
          isSource && styles.valueSource,
          isOutsideGB && styles.valueDimmed,
        ]}
        selectable
      >
        {value}
      </Text>

      {/* Actions — only shown when expanded */}
      {expanded && !isOutsideGB && (
        <View style={styles.actions}>
          <TouchableOpacity style={styles.btn} onPress={handleCopy} activeOpacity={0.7}>
            <Text style={styles.btnText}>{copied ? '✓ COPIED' : '⎘ COPY'}</Text>
          </TouchableOpacity>
          {onSetTarget && (
            <TouchableOpacity
              style={[styles.btn, styles.btnTarget, hasTarget && styles.btnTargetActive]}
              onPress={handleSetTarget}
              activeOpacity={0.7}
            >
              <Text style={[styles.btnText, styles.btnTargetText]}>
                {hasTarget ? '⌖ UPDATE TARGET' : '⌖ SET TARGET'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: 6,
  },
  cardSource: {
    borderColor: colors.accentDim,
    backgroundColor: colors.bgElevated,
  },
  cardExpanded: {
    borderColor: colors.accent,
  },
  cardDimmed: {
    opacity: 0.35,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
    gap: 5,
  },
  icon: {
    color: colors.textDim,
    fontSize: 11,
  },
  label: {
    fontSize: 9,
    fontFamily: 'Courier',
    color: colors.textMid,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    flex: 1,
  },
  sourceBadge: {
    backgroundColor: colors.accentGlow,
    borderRadius: 3,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.accentDim,
  },
  sourceBadgeText: {
    fontSize: 7,
    color: colors.accent,
    fontFamily: 'Courier',
    letterSpacing: 1,
  },
  chevron: {
    color: colors.textDim,
    fontSize: 18,
    lineHeight: 18,
    transform: [{ rotate: '0deg' }],
  },
  chevronOpen: {
    color: colors.accent,
    transform: [{ rotate: '90deg' }],
  },
  value: {
    fontSize: 15,
    color: colors.text,
    fontFamily: 'Courier',
    letterSpacing: 0.5,
    lineHeight: 21,
  },
  valueSource: {
    color: colors.accent,
    fontSize: 16,
  },
  valueDimmed: {
    color: colors.textDim,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  btn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  btnText: {
    fontSize: 9,
    color: colors.textMid,
    fontFamily: 'Courier',
    letterSpacing: 1.5,
  },
  btnTarget: {
    borderColor: colors.amber,
    backgroundColor: colors.amberGlow,
  },
  btnTargetActive: {
    borderColor: colors.amber,
  },
  btnTargetText: {
    color: colors.amber,
  },
});
