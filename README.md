# GridPoint

A mobile app for ham radio operators and outdoor enthusiasts that converts GPS coordinates into every major grid format in real time.

Built with React Native / Expo. Works fully offline for all coordinate conversions.

**M0LZN · [m0lzn.com](https://m0lzn.com) · [github.com/resnikov](https://github.com/resnikov)**

---

## Features

### LOCATE
- One-tap GPS fix with accuracy indicator
- Live tracking mode that updates as you move
- Displays your position in all supported formats simultaneously
- Copy any format to clipboard with a single tap

### CONVERT
- Search by coordinates, grid reference, place name, or any supported format
- Auto-detects input format (Maidenhead, OS Grid, WAB, Plus Code, DMS, DDM, decimal degrees)
- Place name search via OpenStreetMap Nominatim — no API key needed
- Sets the result as your navigation target automatically

### MAP
- Interactive full-screen map
- Tap anywhere to drop a marker and set it as your target
- Flies to your current GPS location on open
- Populates the Convert tab when a target is set

### AR Compass
- Live camera view with compass overlay
- Bearing and distance to your set target
- Animated directional arrow when target is off-screen
- Pitch-aware crosshair when target is ahead
- Hysteresis on the ahead/away threshold to prevent flickering

### CONFIG
- Toggle which coordinate formats appear in results
- Switch distance units between kilometres and miles (persisted)
- Links to website and GitHub

---

## Supported Formats

| Format | Example |
|---|---|
| Decimal Degrees | `51.997700, -0.740700` |
| Degrees Minutes Seconds | `51° 59' 51.72" N, 0° 44' 26.52" W` |
| Degrees Decimal Minutes | `51° 59.8620' N, 0° 44.4420' W` |
| Maidenhead Grid Locator | `IO91PX` |
| OS Grid Reference | `SP 863 341` |
| WAB Square | `SP83` |
| Plus Code (OLC) | `9C3XX7X6+` |
| CQ Zone | `14` |
| ITU Zone | `18` |

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- iOS or Android device with [Expo Go](https://expo.dev/client), or a simulator

### Install

```bash
git clone https://github.com/resnikov/gridpointapp.git
cd gridpointapp
npm install
```

### Run

```bash
npx expo start
```

Scan the QR code with Expo Go on your device, or press `i` for iOS simulator / `a` for Android.

---

## Building a standalone app (EAS Build)

```bash
npm install -g eas-cli
eas login
eas build:configure
```

**Android APK (sideload, no Play Store account needed):**
```bash
eas build -p android --profile preview
```

**iOS (requires Apple Developer account):**
```bash
eas build -p ios
```

---

## Project Structure

```
gridpointapp/
├── App.js                          # Navigation root (tabs + stack)
├── src/
│   ├── screens/
│   │   ├── HomeScreen.js           # LOCATE tab — GPS fix + all formats
│   │   ├── ConvertScreen.js        # CONVERT tab — search and convert
│   │   ├── ARScreen.js             # AR tab — camera + bearing overlay
│   │   ├── MapScreen.js            # MAP tab — interactive map
│   │   └── SettingsScreen.js       # CONFIG tab — preferences
│   ├── components/
│   │   └── ResultCard.js           # Expandable format result card
│   └── utils/
│       ├── conversions.js          # All coordinate conversion logic (pure JS)
│       ├── SettingsContext.js      # Global state — target, formats, units
│       └── theme.js                # Design tokens — colours, spacing, radii
```

---

## AR Compass — How It Works

1. Search a location on the Convert tab — it is automatically set as your target
2. Switch to the AR tab
3. Point your camera — a cyan crosshair appears when the target is within ~35° of ahead
4. When the target is off-screen, an amber arrow rotates to point you toward it
5. Bearing and distance are always shown in the HUD at the bottom

The AR overlay uses:
- **expo-location** — GPS position updated every 2 m
- **Magnetometer** — compass heading with low-pass smoothing
- **DeviceMotion** — device pitch for vertical crosshair offset

---

## Permissions

| Permission | Used for |
|---|---|
| Camera | AR compass view |
| Location (when in use) | GPS fix, live tracking, map, AR bearing |

---

## Tech Stack

- [React Native](https://reactnative.dev/) + [Expo](https://expo.dev/) SDK 54
- [react-native-maps](https://github.com/react-native-maps/react-native-maps)
- [expo-location](https://docs.expo.dev/versions/latest/sdk/location/)
- [expo-camera](https://docs.expo.dev/versions/latest/sdk/camera/)
- [expo-sensors](https://docs.expo.dev/versions/latest/sdk/sensors/)
- [expo-haptics](https://docs.expo.dev/versions/latest/sdk/haptics/)
- [React Navigation](https://reactnavigation.org/)
- [OpenStreetMap Nominatim](https://nominatim.org/) — place search, no key required

OS Grid conversion uses the full OSGB36 ↔ WGS84 Helmert transformation (accurate to ~5 m). All other conversions are pure JS with no external dependencies.

---

73 de **M0LZN**
