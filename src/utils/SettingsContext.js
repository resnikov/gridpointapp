import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'gridpoint_visible_formats';
const DISTANCE_KEY = 'gridpoint_distance_unit';

export const FORMAT_DEFINITIONS = [
  { key: 'decimal',        label: 'Decimal Degrees',  example: '53.7880, -1.2330',     group: 'Lat / Lon' },
  { key: 'dms',            label: 'Deg Min Sec',       example: '53° 47′ 16″ N',        group: 'Lat / Lon' },
  { key: 'degreesMinutes', label: 'Deg Min',           example: '53° 47.28′ N',          group: 'Lat / Lon' },
  { key: 'maidenhead',     label: 'Maidenhead Grid',   example: 'IO93HM',               group: 'Radio' },
  { key: 'osgrid',         label: 'OS Grid Ref',       example: 'SE 490 330',           group: 'GB' },
  { key: 'wab',            label: 'WAB Square',        example: 'SE49',                 group: 'GB' },
  { key: 'pluscode',       label: 'Plus Code',         example: '9C6WXGRQ+XX',          group: 'Other' },
];

const DEFAULT_VISIBLE = Object.fromEntries(FORMAT_DEFINITIONS.map(f => [f.key, true]));

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [visibleFormats, setVisibleFormats] = useState(DEFAULT_VISIBLE);
  const [loaded, setLoaded] = useState(false);
  const [target, setTarget] = useState(null);
  const [distanceUnit, setDistanceUnitState] = useState('km'); // 'km' | 'mi'
  const [queuedSearch, setQueuedSearch] = useState(null); // consumed by ConvertScreen on focus

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(STORAGE_KEY),
      AsyncStorage.getItem(DISTANCE_KEY),
    ]).then(([rawFormats, rawUnit]) => {
      if (rawFormats) setVisibleFormats({ ...DEFAULT_VISIBLE, ...JSON.parse(rawFormats) });
      if (rawUnit) setDistanceUnitState(rawUnit);
    }).catch(() => {}).finally(() => setLoaded(true));
  }, []);

  const setDistanceUnit = (unit) => {
    setDistanceUnitState(unit);
    AsyncStorage.setItem(DISTANCE_KEY, unit).catch(() => {});
  };

  const toggleFormat = (key) => {
    setVisibleFormats(prev => {
      const next = { ...prev, [key]: !prev[key] };
      const anyVisible = Object.values(next).some(Boolean);
      if (!anyVisible) return prev;
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  };

  const setAll = (visible) => {
    setVisibleFormats(prev => {
      const next = Object.fromEntries(Object.keys(prev).map(k => [k, visible]));
      if (!visible) next[FORMAT_DEFINITIONS[0].key] = true;
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  };

  return (
    <SettingsContext.Provider value={{ visibleFormats, toggleFormat, setAll, loaded, target, setTarget, distanceUnit, setDistanceUnit, queuedSearch, setQueuedSearch }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
