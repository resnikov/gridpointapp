import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Dimensions,
  Animated, Platform,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { Magnetometer, DeviceMotion } from 'expo-sensors';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haversineDistance, bearingTo, formatDistance, formatBearing } from '../utils/conversions';
import { colors, spacing, radii } from '../utils/theme';
import { useSettings } from '../utils/SettingsContext';

const { width: W, height: H } = Dimensions.get('window');
const ARROW_SIZE = 80;

export default function ARScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { target: contextTarget } = useSettings();
  const target = route?.params?.target ?? contextTarget;

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [locationPermission, setLocationPermission] = useState(null);

  const [userLocation, setUserLocation] = useState(null);
  const [heading, setHeading] = useState(0);           // true north bearing (degrees)
  const [pitch, setPitch] = useState(0);               // device tilt forward/back

  const [distance, setDistance] = useState(null);
  const [bearing, setBearing] = useState(null);
  const [relativeAngle, setRelativeAngle] = useState(0); // angle on screen

  // Smoothing refs
  const magX = useRef(0), magY = useRef(0);
  const smoothHeading = useRef(0);
  const arrowAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation for the crosshair
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // Request location permission
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === 'granted');
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        setUserLocation(loc.coords);

        // Subscribe to location updates
        Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, distanceInterval: 2 },
          (loc) => setUserLocation(loc.coords)
        );
      }
    })();
  }, []);

  // Magnetometer for compass heading
  useEffect(() => {
    Magnetometer.setUpdateInterval(100);
    const sub = Magnetometer.addListener(({ x, y }) => {
      // Low-pass filter
      magX.current = magX.current * 0.8 + x * 0.2;
      magY.current = magY.current * 0.8 + y * 0.2;

      let angle = Math.atan2(magY.current, magX.current) * (180 / Math.PI);
      angle = (angle + 360) % 360;
      // Compensate for device orientation
      angle = (angle + 270) % 360;

      // Smooth heading
      const diff = angle - smoothHeading.current;
      const wrappedDiff = ((diff + 180) % 360) - 180;
      smoothHeading.current = (smoothHeading.current + wrappedDiff * 0.2 + 360) % 360;
      setHeading(smoothHeading.current);
    });
    return () => sub.remove();
  }, []);

  // DeviceMotion for pitch (tilt)
  useEffect(() => {
    DeviceMotion.setUpdateInterval(100);
    const sub = DeviceMotion.addListener(({ rotation }) => {
      if (rotation?.beta !== undefined) {
        // beta = forward/back tilt in radians (-π to π)
        setPitch(rotation.beta * (180 / Math.PI));
      }
    });
    return () => sub.remove();
  }, []);

  // Compute distance, bearing, screen angle whenever location or heading changes
  useEffect(() => {
    if (!userLocation || !target) return;

    const dist = haversineDistance(
      userLocation.latitude, userLocation.longitude,
      target.lat, target.lon
    );
    const bear = bearingTo(
      userLocation.latitude, userLocation.longitude,
      target.lat, target.lon
    );

    setDistance(dist);
    setBearing(bear);

    // Relative angle: how far left/right of straight ahead
    let rel = bear - heading;
    rel = ((rel + 180) % 360) - 180; // normalise to -180..+180
    setRelativeAngle(rel);

    Animated.spring(arrowAnim, {
      toValue: rel,
      useNativeDriver: true,
      tension: 60,
      friction: 8,
    }).start();
  }, [userLocation, heading, target]);

  // ── Permissions gates ────────────────────────────────────────
  if (!cameraPermission) return <PermissionScreen />;
  if (!cameraPermission.granted) {
    return (
      <PermissionScreen
        message="Camera access is needed for AR view."
        onRequest={requestCameraPermission}
        label="GRANT CAMERA ACCESS"
      />
    );
  }
  if (!locationPermission) {
    return (
      <PermissionScreen
        message="Location access is needed to calculate bearing."
      />
    );
  }

  // Whether target is roughly ahead (within ±45°) and not too tilted up/down
  const isAhead = Math.abs(relativeAngle) < 45;
  const verticalOffset = Math.max(-100, Math.min(100, pitch * -2));

  return (
    <View style={styles.container}>
      {/* Camera background */}
      <CameraView style={StyleSheet.absoluteFill} facing="back" />

      {/* Dark overlay scrim */}
      <View style={styles.scrim} />

      {/* ── Crosshair / target indicator ── */}
      {isAhead && (
        <Animated.View
          style={[
            styles.crosshairWrap,
            { transform: [{ translateY: verticalOffset }] },
          ]}
        >
          <Animated.View style={[styles.crosshair, { transform: [{ scale: pulseAnim }] }]}>
            <View style={styles.crosshairRing} />
            <View style={[styles.crosshairLine, styles.crosshairH]} />
            <View style={[styles.crosshairLine, styles.crosshairV]} />
          </Animated.View>
          {distance !== null && (
            <View style={styles.distancePill}>
              <Text style={styles.distancePillText}>{formatDistance(distance)}</Text>
            </View>
          )}
        </Animated.View>
      )}

      {/* ── Animated directional arrow ── */}
      {!isAhead && (
        <View style={styles.arrowContainer}>
          <Animated.View
            style={[
              styles.arrowWrap,
              {
                transform: [
                  {
                    rotate: arrowAnim.interpolate({
                      inputRange: [-180, 180],
                      outputRange: ['-180deg', '180deg'],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.arrow}>
              <View style={styles.arrowHead} />
              <View style={styles.arrowShaft} />
            </View>
          </Animated.View>
          <Text style={styles.arrowHint}>TURN TO FACE TARGET</Text>
        </View>
      )}

      {/* ── Info HUD top ── */}
      <View style={[styles.hud, styles.hudTop, { top: insets.top + 8 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>← BACK</Text>
        </TouchableOpacity>

        <View style={styles.hudPanel}>
          <Text style={styles.hudLabel}>COMPASS</Text>
          <Text style={styles.hudValue}>{Math.round(heading)}°</Text>
        </View>

        <View style={styles.hudPanel}>
          <Text style={styles.hudLabel}>PITCH</Text>
          <Text style={styles.hudValue}>{Math.round(pitch)}°</Text>
        </View>
      </View>

      {/* ── Info HUD bottom ── */}
      <View style={[styles.hud, styles.hudBottom, { bottom: insets.bottom + 70 }]}>
        {bearing !== null && (
          <View style={styles.hudPanelLarge}>
            <Text style={styles.hudLabel}>BEARING TO TARGET</Text>
            <Text style={styles.hudValueLarge}>{formatBearing(bearing)}</Text>
          </View>
        )}

        {distance !== null && (
          <View style={styles.hudPanelLarge}>
            <Text style={styles.hudLabel}>DISTANCE</Text>
            <Text style={styles.hudValueLarge}>{formatDistance(distance)}</Text>
          </View>
        )}

        {target && (
          <View style={styles.hudPanelLarge}>
            <Text style={styles.hudLabel}>TARGET</Text>
            <Text style={styles.hudValueSmall}>
              {target.lat.toFixed(4)}, {target.lon.toFixed(4)}
            </Text>
          </View>
        )}
      </View>

      {/* ── Horizon line ── */}
      <View style={[styles.horizon, { top: H / 2 + verticalOffset * 0.3 }]} />

      {/* ── Compass arc top edge ── */}
      <CompassArc heading={heading} />
    </View>
  );
}

// ── Compass Arc ─────────────────────────────────────────────

function CompassArc({ heading }) {
  const cardinals = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const degs = [0, 45, 90, 135, 180, 225, 270, 315];
  const FOV = 70; // degrees of field of view shown

  return (
    <View style={styles.compassArc}>
      {degs.map((deg, i) => {
        let diff = deg - heading;
        diff = ((diff + 180) % 360) - 180;
        if (Math.abs(diff) > FOV / 2 + 10) return null;

        const x = (diff / FOV) * W + W / 2;
        const isCardinal = i % 2 === 0;

        return (
          <View key={i} style={[styles.compassTick, { left: x - 1 }]}>
            <Text style={[
              styles.compassLabel,
              isCardinal && styles.compassLabelCardinal,
              cardinals[i] === 'N' && styles.compassLabelNorth,
            ]}>
              {cardinals[i]}
            </Text>
            <View style={[
              styles.tickMark,
              isCardinal && styles.tickMarkCardinal,
              cardinals[i] === 'N' && styles.tickMarkNorth,
            ]} />
          </View>
        );
      })}
      {/* Centre pointer */}
      <View style={styles.compassCentre} />
    </View>
  );
}

// ── Permission screen ────────────────────────────────────────

function PermissionScreen({ message, onRequest, label }) {
  return (
    <View style={styles.permScreen}>
      <Text style={styles.permTitle}>AR COMPASS</Text>
      <Text style={styles.permMessage}>{message ?? 'Requesting permissions…'}</Text>
      {onRequest && (
        <TouchableOpacity style={styles.permBtn} onPress={onRequest}>
          <Text style={styles.permBtnText}>{label}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },

  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },

  // Crosshair
  crosshairWrap: {
    position: 'absolute',
    left: W / 2 - 50,
    top: H / 2 - 50,
    width: 100,
    alignItems: 'center',
  },
  crosshair: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  crosshairRing: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1.5,
    borderColor: colors.accent,
  },
  crosshairLine: {
    position: 'absolute',
    backgroundColor: colors.accent,
  },
  crosshairH: { width: 20, height: 1.5, left: 5 },
  crosshairV: { width: 1.5, height: 20, top: 5 },
  distancePill: {
    marginTop: 8,
    backgroundColor: 'rgba(0,229,255,0.2)',
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  distancePillText: {
    color: colors.accent,
    fontFamily: 'Courier',
    fontSize: 13,
    letterSpacing: 1,
    fontWeight: '700',
  },

  // Directional arrow (when target not in view)
  arrowContainer: {
    position: 'absolute',
    left: W / 2 - 60,
    top: H / 2 - 80,
    width: 120,
    alignItems: 'center',
  },
  arrowWrap: {
    width: ARROW_SIZE,
    height: ARROW_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrow: {
    alignItems: 'center',
  },
  arrowHead: {
    width: 0,
    height: 0,
    borderLeftWidth: 14,
    borderRightWidth: 14,
    borderBottomWidth: 24,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: colors.amber,
  },
  arrowShaft: {
    width: 6,
    height: 28,
    backgroundColor: colors.amber,
  },
  arrowHint: {
    marginTop: 10,
    color: colors.amber,
    fontFamily: 'Courier',
    fontSize: 9,
    letterSpacing: 2,
    textAlign: 'center',
  },

  // HUD panels
  hud: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    alignItems: 'center',
  },
  hudTop: { alignItems: 'flex-start' },
  hudBottom: {
    flexWrap: 'wrap',
    backgroundColor: 'rgba(8,12,16,0.75)',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  hudPanel: {
    backgroundColor: colors.overlay,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
    minWidth: 70,
  },
  hudPanelLarge: {
    flex: 1,
    minWidth: 100,
    paddingHorizontal: spacing.sm,
  },
  hudLabel: {
    fontSize: 8,
    color: colors.textDim,
    fontFamily: 'Courier',
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  hudValue: {
    fontSize: 15,
    color: colors.accent,
    fontFamily: 'Courier',
    fontWeight: '700',
  },
  hudValueLarge: {
    fontSize: 16,
    color: colors.text,
    fontFamily: 'Courier',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  hudValueSmall: {
    fontSize: 11,
    color: colors.textMid,
    fontFamily: 'Courier',
  },

  backBtn: {
    flex: 1,
    backgroundColor: colors.overlay,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  backBtnText: {
    color: colors.textMid,
    fontFamily: 'Courier',
    fontSize: 11,
    letterSpacing: 1.5,
  },

  // Horizon line
  horizon: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(0,229,255,0.15)',
  },

  // Compass arc
  compassArc: {
    position: 'absolute',
    top: 90,
    left: 0,
    right: 0,
    height: 40,
    flexDirection: 'row',
  },
  compassTick: {
    position: 'absolute',
    alignItems: 'center',
    bottom: 0,
  },
  compassLabel: {
    color: colors.textMid,
    fontFamily: 'Courier',
    fontSize: 9,
    letterSpacing: 1,
    marginBottom: 2,
  },
  compassLabelCardinal: { color: colors.text, fontSize: 10 },
  compassLabelNorth: { color: colors.accent, fontWeight: '700' },
  tickMark: {
    width: 1,
    height: 6,
    backgroundColor: colors.textDim,
  },
  tickMarkCardinal: { height: 10, backgroundColor: colors.textMid },
  tickMarkNorth: { backgroundColor: colors.accent, width: 2 },
  compassCentre: {
    position: 'absolute',
    bottom: 0,
    left: W / 2 - 1,
    width: 2,
    height: 14,
    backgroundColor: colors.accent,
  },

  // Permission screen
  permScreen: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  permTitle: {
    fontSize: 20,
    color: colors.accent,
    fontFamily: 'Courier',
    letterSpacing: 4,
    marginBottom: spacing.md,
  },
  permMessage: {
    fontSize: 13,
    color: colors.textMid,
    fontFamily: 'Courier',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  permBtn: {
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  permBtnText: {
    color: colors.accent,
    fontFamily: 'Courier',
    fontSize: 12,
    letterSpacing: 2,
  },
});
