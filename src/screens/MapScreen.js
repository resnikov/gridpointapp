import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Platform,
} from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';

import { useSettings } from '../utils/SettingsContext';
import { colors, spacing, radii } from '../utils/theme';
import { toMaidenhead, toOSGridRef } from '../utils/conversions';

const DEFAULT_REGION = {
  latitude: 51.9977,
  longitude: -0.7407,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const { target, setTarget, setQueuedSearch } = useSettings();
  const mapRef = useRef(null);
  const [userLocation, setUserLocation] = useState(null);
  const [pendingMarker, setPendingMarker] = useState(null);
  const centredOnUser = useRef(false);

  // Get user location once on focus
  useEffect(() => {
    if (!isFocused) return;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setUserLocation(loc.coords);
    })();
  }, [isFocused]);

  // As soon as we get a location, fly there — but only once and only if no target is set
  useEffect(() => {
    if (!userLocation || target || centredOnUser.current || !mapRef.current) return;
    centredOnUser.current = true;
    mapRef.current.animateToRegion({
      latitude: userLocation.latitude,
      longitude: userLocation.longitude,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    }, 600);
  }, [userLocation]);

  // Pan to target when it changes
  useEffect(() => {
    if (target && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: target.lat,
        longitude: target.lon,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 400);
    }
  }, [target]);

  const handleMapPress = async (e) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setPendingMarker({ lat: latitude, lon: longitude });
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const confirmTarget = async () => {
    if (!pendingMarker) return;
    const coordStr = `${pendingMarker.lat.toFixed(6)}, ${pendingMarker.lon.toFixed(6)}`;
    setTarget({ ...pendingMarker, label: coordStr });
    setQueuedSearch(coordStr);
    setPendingMarker(null);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const cancelPending = () => setPendingMarker(null);

  const goToMyLocation = async () => {
    if (userLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 400);
    }
  };

  const initialRegion = target
    ? { latitude: target.lat, longitude: target.lon, latitudeDelta: 0.01, longitudeDelta: 0.01 }
    : userLocation
    ? { latitude: userLocation.latitude, longitude: userLocation.longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 }
    : DEFAULT_REGION;

  const activeMarker = pendingMarker ?? target;

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_DEFAULT}
        initialRegion={initialRegion}
        onPress={handleMapPress}
        showsUserLocation
        showsMyLocationButton={false}
        mapType="standard"
      >
        {activeMarker && (
          <Marker
            coordinate={{ latitude: activeMarker.lat, longitude: activeMarker.lon }}
            pinColor={pendingMarker ? colors.amber : colors.accent}
          />
        )}
      </MapView>

      {/* ── Top bar ── */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>MAP</Text>
          {userLocation && (
            <TouchableOpacity style={styles.myLocBtn} onPress={goToMyLocation}>
              <Text style={styles.myLocBtnText}>⊕ ME</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.hint}>Tap anywhere to place a target</Text>
      </View>

      {/* ── Pending marker confirmation ── */}
      {pendingMarker && (
        <View style={[styles.panel, { bottom: insets.bottom + 16 }]}>
          <Text style={styles.panelLabel}>SET AS TARGET?</Text>
          <Text style={styles.panelCoords}>
            {pendingMarker.lat.toFixed(5)}, {pendingMarker.lon.toFixed(5)}
          </Text>
          <View style={styles.panelBtns}>
            <TouchableOpacity style={styles.cancelBtn} onPress={cancelPending}>
              <Text style={styles.cancelBtnText}>CANCEL</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtn} onPress={confirmTarget}>
              <Text style={styles.confirmBtnText}>⌖ SET TARGET</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Active target info ── */}
      {target && !pendingMarker && (
        <View style={[styles.panel, { bottom: insets.bottom + 16 }]}>
          <View style={styles.targetHeader}>
            <Text style={styles.panelLabel}>TARGET</Text>
            <TouchableOpacity onPress={() => setTarget(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.clearText}>✕ CLEAR</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.targetName} numberOfLines={1}>{target.label}</Text>
          <View style={styles.targetMeta}>
            <Text style={styles.metaText}>{toMaidenhead(target.lat, target.lon, 6)}</Text>
            <Text style={styles.metaDot}>·</Text>
            <Text style={styles.metaText}>{toOSGridRef(target.lat, target.lon)}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: 'rgba(10,12,14,0.82)',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  title: {
    fontFamily: 'Courier',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 4,
    color: colors.text,
  },
  myLocBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  myLocBtnText: {
    fontSize: 10,
    color: colors.accent,
    fontFamily: 'Courier',
    letterSpacing: 1.5,
  },
  hint: {
    fontSize: 9,
    color: colors.textDim,
    fontFamily: 'Courier',
    letterSpacing: 1.5,
  },
  panel: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    backgroundColor: 'rgba(17,20,22,0.95)',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  panelLabel: {
    fontSize: 8,
    color: colors.textDim,
    fontFamily: 'Courier',
    letterSpacing: 2,
    marginBottom: 4,
  },
  panelCoords: {
    fontSize: 15,
    color: colors.accent,
    fontFamily: 'Courier',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  panelBtns: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingVertical: 10,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: colors.textMid,
    fontFamily: 'Courier',
    fontSize: 11,
    letterSpacing: 1.5,
  },
  confirmBtn: {
    flex: 2,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: colors.accentGlow,
  },
  confirmBtnText: {
    color: colors.accent,
    fontFamily: 'Courier',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  targetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  clearText: {
    fontSize: 9,
    color: colors.red,
    fontFamily: 'Courier',
    letterSpacing: 1.5,
  },
  targetName: {
    fontSize: 15,
    color: colors.text,
    fontFamily: 'Courier',
    fontWeight: '700',
    marginBottom: 4,
  },
  targetMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 10,
    color: colors.textDim,
    fontFamily: 'Courier',
    letterSpacing: 0.5,
  },
  metaDot: {
    color: colors.border,
    fontSize: 10,
  },
});
