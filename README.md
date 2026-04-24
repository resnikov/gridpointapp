# GridPoint Mobile

A React Native / Expo port of GridPoint — location format explorer with AR compass.

## Features

- Convert between **all** coordinate formats:
  - Decimal degrees (`51.5074, -0.1278`)
  - Degrees Minutes Seconds
  - Degrees Minutes
  - **Maidenhead Grid** (`IO91wm`) — ham radio locator
  - **OS Grid Reference** (`TQ 380 805`) — OSGB36
  - **WAB Square** (`TQ38`) — for WAB award chasers
  - **Plus Codes** (`9C3XGV84+HM`) — Google Open Location Code
- Auto-detects input format
- **AR Compass** — point your phone at a target location and see bearing + distance overlaid on the camera feed
- Use your GPS location as input
- Copy any result to clipboard
- Set any result as a navigation target

---

## Quick Start (Expo Go — no build needed)

### 1. Install prerequisites

```bash
# Node.js 18+ required
npm install -g expo-cli
```

### 2. Install dependencies

```bash
cd GridPointApp
npm install
```

### 3. Start the dev server

```bash
npx expo start
```

### 4. Run on your phone

- Install **Expo Go** from the App Store / Play Store
- Scan the QR code that appears in the terminal
- The app loads instantly over your local network

---

## Building a proper installable app (EAS Build)

When you're ready to install without Expo Go:

### 1. Install EAS CLI

```bash
npm install -g eas-cli
eas login
```

### 2. Configure the build

```bash
eas build:configure
```

### 3. Build for Android (APK — no Play Store account needed)

```bash
eas build -p android --profile preview
```

This produces an `.apk` you can sideload directly onto your phone.

### 4. Build for iOS (requires Apple Developer account £79/yr)

```bash
eas build -p ios
```

---

## Project Structure

```
GridPointApp/
├── App.js                          # Navigation root
├── app.json                        # Expo config, permissions
├── src/
│   ├── screens/
│   │   ├── ConvertScreen.js        # Main search/convert UI
│   │   ├── ARScreen.js             # Camera + AR bearing overlay
│   │   └── MapScreen.js            # Target location map
│   ├── components/
│   │   └── ResultCard.js           # Individual format result card
│   └── utils/
│       ├── conversions.js          # All format conversion logic
│       └── theme.js                # Design tokens / colours
└── assets/                         # Icons (add your own)
```

---

## AR Compass — How It Works

1. Search any location and tap **SET TARGET** on any result card
2. Tap **VIEW IN AR** (or the AR tab)
3. Point your camera — a cyan crosshair appears when the target is in the camera's field of view
4. When the target is off-screen, an amber arrow points you in the right direction
5. Bearing and distance are always shown in the HUD at the bottom

The AR overlay uses:
- **expo-location** — your GPS position (updates every 2m)
- **Magnetometer** — compass heading with low-pass smoothing
- **DeviceMotion** — device pitch for vertical crosshair adjustment

---

## Permissions Required

| Permission | Reason |
|---|---|
| Camera | AR compass view |
| Location (when in use) | Distance/bearing calculation, "My Location" button |

---

## Notes for iOS

- Compass accuracy varies by device and magnetic interference
- Hold the phone reasonably level for best AR results
- The first time you open the AR screen, iOS will prompt for camera + location permissions

## Notes for Android

- On some devices you may need to calibrate the magnetometer (figure-8 motion)
- Location accuracy depends on GPS signal strength

---

## Callsign

Built by **M0LZN** — 73 de James
