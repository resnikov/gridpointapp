// ─────────────────────────────────────────────────────────────
//  GridPoint Conversion Utilities
//  Supports: Lat/Lon, Maidenhead Grid, OS Grid (OSGB36),
//            WAB Square, Google Plus Codes
// ─────────────────────────────────────────────────────────────

// ── Haversine / Bearing ───────────────────────────────────────

export function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // metres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function bearingTo(lat1, lon1, lat2, lon2) {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

export function formatDistance(metres) {
  if (metres < 1000) return `${Math.round(metres)} m`;
  return `${(metres / 1000).toFixed(1)} km`;
}

export function formatBearing(deg) {
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  return `${Math.round(deg)}° ${dirs[Math.round(deg / 22.5) % 16]}`;
}

// ── Lat/Lon helpers ───────────────────────────────────────────

export function parseDMS(str) {
  // Accepts: 51.5074, -0.1278  |  51°30'26.6"N 0°07'40.1"W  |  51 30 26.6 N 0 7 40 1 W
  str = str.trim();

  // Decimal degrees (simple)
  const dd = str.match(/^(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)$/);
  if (dd) return { lat: parseFloat(dd[1]), lon: parseFloat(dd[2]) };

  // DMS with symbols
  const dms = str.match(
    /(\d+)[°\s]+(\d+)['\s]+(\d+\.?\d*)["″\s]*([NS])[,\s]+(\d+)[°\s]+(\d+)['\s]+(\d+\.?\d*)["″\s]*([EW])/i
  );
  if (dms) {
    let lat = parseInt(dms[1]) + parseInt(dms[2]) / 60 + parseFloat(dms[3]) / 3600;
    let lon = parseInt(dms[5]) + parseInt(dms[6]) / 60 + parseFloat(dms[7]) / 3600;
    if (dms[4].toUpperCase() === 'S') lat = -lat;
    if (dms[8].toUpperCase() === 'W') lon = -lon;
    return { lat, lon };
  }

  return null;
}

export function latLonToDegreesMinutes(lat, lon) {
  const fmt = (val, pos, neg) => {
    const d = Math.abs(val);
    const deg = Math.floor(d);
    const min = ((d - deg) * 60).toFixed(4);
    return `${deg}° ${min}' ${val >= 0 ? pos : neg}`;
  };
  return `${fmt(lat, 'N', 'S')}  ${fmt(lon, 'E', 'W')}`;
}

export function latLonToDMS(lat, lon) {
  const fmt = (val, pos, neg) => {
    const d = Math.abs(val);
    const deg = Math.floor(d);
    const m = Math.floor((d - deg) * 60);
    const s = (((d - deg) * 60 - m) * 60).toFixed(2);
    return `${deg}° ${m}' ${s}" ${val >= 0 ? pos : neg}`;
  };
  return `${fmt(lat, 'N', 'S')}  ${fmt(lon, 'E', 'W')}`;
}

// ── Maidenhead Grid ───────────────────────────────────────────

export function latLonToMaidenhead(lat, lon, precision = 6) {
  lon = ((lon + 180) % 360);
  lat = lat + 90;

  let grid = '';
  grid += String.fromCharCode(65 + Math.floor(lon / 20));
  grid += String.fromCharCode(65 + Math.floor(lat / 10));
  grid += String(Math.floor((lon % 20) / 2));
  grid += String(Math.floor(lat % 10));

  if (precision >= 6) {
    grid += String.fromCharCode(65 + Math.floor((lon % 2) / (2 / 24)));
    grid += String.fromCharCode(65 + Math.floor((lat % 1) / (1 / 24)));
  }

  return grid.toUpperCase();
}

export function maidenheadToLatLon(grid) {
  grid = grid.toUpperCase().trim();
  if (!/^[A-R]{2}[0-9]{2}([A-X]{2})?$/.test(grid)) return null;

  let lon = (grid.charCodeAt(0) - 65) * 20 - 180;
  let lat = (grid.charCodeAt(1) - 65) * 10 - 90;
  lon += parseInt(grid[2]) * 2;
  lat += parseInt(grid[3]);

  if (grid.length >= 6) {
    lon += ((grid.charCodeAt(4) - 65) * 2) / 24;
    lat += (grid.charCodeAt(5) - 65) / 24;
    // Centre of subsquare
    lon += 1 / 24;
    lat += 0.5 / 24;
  } else {
    lon += 1;
    lat += 0.5;
  }

  return { lat, lon };
}

export function isMaidenhead(str) {
  return /^[A-R]{2}[0-9]{2}([A-X]{2})?$/i.test(str.trim());
}

// ── OS Grid (OSGB36) ──────────────────────────────────────────
// Using Helmert transform WGS84 <-> OSGB36

const a = 6378137.0;
const b = 6356752.3142;
const F0 = 0.9996012717;
const lat0 = (49 * Math.PI) / 180;
const lon0 = (-2 * Math.PI) / 180;
const N0 = -100000;
const E0 = 400000;
const e2 = 1 - (b * b) / (a * a);
const n = (a - b) / (a + b);

function latLonToOSGB(latDeg, lonDeg) {
  // Helmert: WGS84 -> OSGB36
  const sinLat = Math.sin((latDeg * Math.PI) / 180);
  const cosLat = Math.cos((latDeg * Math.PI) / 180);
  const sinLon = Math.sin((lonDeg * Math.PI) / 180);
  const cosLon = Math.cos((lonDeg * Math.PI) / 180);

  // Approximate Helmert transform
  const H = 0;
  const x = (a / Math.sqrt(1 - e2 * sinLat ** 2) + H) * cosLat * cosLon;
  const y = (a / Math.sqrt(1 - e2 * sinLat ** 2) + H) * cosLat * sinLon;
  const z = ((a * (1 - e2)) / Math.sqrt(1 - e2 * sinLat ** 2) + H) * sinLat;

  // Helmert transform params WGS84 -> OSGB36
  const tx = -446.448, ty = 125.157, tz = -542.06;
  const rx = (-0.1502 / 3600 * Math.PI) / 180;
  const ry = (-0.247 / 3600 * Math.PI) / 180;
  const rz = (-0.8421 / 3600 * Math.PI) / 180;
  const s = 20.4894e-6;

  const x2 = tx + x * (1 + s) - y * rz + z * ry;
  const y2 = ty + x * rz + y * (1 + s) - z * rx;
  const z2 = tz - x * ry + y * rx + z * (1 + s);

  // Airy 1830 ellipsoid
  const aA = 6377563.396, bA = 6356256.909;
  const e2A = 1 - (bA * bA) / (aA * aA);

  const p = Math.sqrt(x2 ** 2 + y2 ** 2);
  let latR = Math.atan2(z2, p * (1 - e2A));
  for (let i = 0; i < 10; i++) {
    const v = aA / Math.sqrt(1 - e2A * Math.sin(latR) ** 2);
    latR = Math.atan2(z2 + e2A * v * Math.sin(latR), p);
  }
  const lonR = Math.atan2(y2, x2);

  // Project to National Grid
  const sinLatR = Math.sin(latR);
  const cosLatR = Math.cos(latR);
  const v2 = aA * F0 / Math.sqrt(1 - e2A * sinLatR ** 2);
  const rho = aA * F0 * (1 - e2A) / Math.pow(1 - e2A * sinLatR ** 2, 1.5);
  const eta2 = v2 / rho - 1;

  const M = calcM(latR, aA, bA);

  const I = M + N0;
  const II = (v2 / 2) * sinLatR * cosLatR;
  const III = (v2 / 24) * sinLatR * cosLatR ** 3 * (5 - Math.tan(latR) ** 2 + 9 * eta2);
  const IIIA = (v2 / 720) * sinLatR * cosLatR ** 5 * (61 - 58 * Math.tan(latR) ** 2 + Math.tan(latR) ** 4);
  const IV = v2 * cosLatR;
  const V = (v2 / 6) * cosLatR ** 3 * (v2 / rho - Math.tan(latR) ** 2);
  const VI = (v2 / 120) * cosLatR ** 5 * (5 - 18 * Math.tan(latR) ** 2 + Math.tan(latR) ** 4 + 14 * eta2 - 58 * Math.tan(latR) ** 2 * eta2);

  const dLon = lonR - lon0;
  const N = I + II * dLon ** 2 + III * dLon ** 4 + IIIA * dLon ** 6;
  const E = E0 + IV * dLon + V * dLon ** 3 + VI * dLon ** 5;

  return { E: Math.round(E), N: Math.round(N) };
}

function calcM(lat, aA, bA) {
  const n1 = (aA - bA) / (aA + bA);
  const n2 = n1 ** 2;
  const n3 = n1 ** 3;
  const dLat = lat - lat0;
  const sLat = lat + lat0;
  return bA * F0 * (
    (1 + n1 + 1.25 * n2 + 1.25 * n3) * dLat -
    (3 * n1 + 3 * n2 + 2.625 * n3) * Math.sin(dLat) * Math.cos(sLat) +
    (1.875 * n2 + 1.875 * n3) * Math.sin(2 * dLat) * Math.cos(2 * sLat) -
    (35 / 24) * n3 * Math.sin(3 * dLat) * Math.cos(3 * sLat)
  );
}

export function latLonToOSGridRef(lat, lon) {
  const { E, N } = latLonToOSGB(lat, lon);

  // The OS letter grid origin is at E=-1000000, N=-500000
  // relative to the OSGB projection false origin
  const gridSquares = ['VWXYZ', 'QRSTU', 'LMNOP', 'FGHJK', 'ABCDE'];
  const adjE = E + 1000000;
  const adjN = N + 500000;

  const major_e = Math.floor(adjE / 500000);
  const major_n = Math.floor(adjN / 500000);
  const letter500 = gridSquares[major_n]?.[major_e];
  if (!letter500) return null;

  const sub_e = Math.floor((adjE % 500000) / 100000);
  const sub_n = Math.floor((adjN % 500000) / 100000);
  const letter100 = gridSquares[sub_n]?.[sub_e];
  if (!letter100) return null;

  const eRem = String(E % 100000).padStart(5, '0');
  const nRem = String(N % 100000).padStart(5, '0');

  return `${letter500}${letter100} ${eRem.slice(0, 3)} ${nRem.slice(0, 3)}`;
}

export function osGridRefToLatLon(ref) {
  ref = ref.toUpperCase().replace(/\s+/g, '');
  const match = ref.match(/^([A-Z]{2})(\d{6}|\d{8}|\d{10})$/);
  if (!match) return null;

  const letters = match[1];
  const digits = match[2];
  const half = digits.length / 2;
  let E = parseInt(digits.slice(0, half));
  let N = parseInt(digits.slice(half));

  // Pad to 5 digits
  const factor = Math.pow(10, 5 - half);
  E *= factor;
  N *= factor;

  const gridSquares = [
    'VWXYZ', 'QRSTU', 'LMNOP', 'FGHJK', 'ABCDE'
  ];
  let major_e = -1, major_n = -1, sub_e = -1, sub_n = -1;

  for (let row = 0; row < 5; row++) {
    const c1 = gridSquares[row].indexOf(letters[0]);
    if (c1 >= 0) { major_n = row; major_e = c1; break; }
  }
  for (let row = 0; row < 5; row++) {
    const c2 = gridSquares[row].indexOf(letters[1]);
    if (c2 >= 0) { sub_n = row; sub_e = c2; break; }
  }
  if (major_e < 0 || sub_e < 0) return null;

  // Apply the origin offset: letter grid origin is at E=-1000000, N=-500000
  const totalE = major_e * 500000 + sub_e * 100000 + E - 1000000;
  const totalN = major_n * 500000 + sub_n * 100000 + N - 500000;

  return osgbToLatLon(totalE, totalN);
}

function osgbToLatLon(E, N) {
  const aA = 6377563.396, bA = 6356256.909;
  const e2A = 1 - (bA * bA) / (aA * aA);

  let lat = lat0;
  let M = 0;
  do {
    lat = (N - N0 - M) / (aA * F0) + lat;
    M = calcM(lat, aA, bA);
  } while (Math.abs(N - N0 - M) >= 0.001);

  const sinLat = Math.sin(lat);
  const cosLat = Math.cos(lat);
  const tanLat = Math.tan(lat);

  const v2 = aA * F0 / Math.sqrt(1 - e2A * sinLat ** 2);
  const rho = aA * F0 * (1 - e2A) / Math.pow(1 - e2A * sinLat ** 2, 1.5);
  const eta2 = v2 / rho - 1;

  const VII = tanLat / (2 * rho * v2);
  const VIII = tanLat / (24 * rho * v2 ** 3) * (5 + 3 * tanLat ** 2 + eta2 - 9 * tanLat ** 2 * eta2);
  const IX = tanLat / (720 * rho * v2 ** 5) * (61 + 90 * tanLat ** 2 + 45 * tanLat ** 4);
  const X = 1 / (v2 * cosLat);
  const XI = 1 / (6 * v2 ** 3 * cosLat) * (v2 / rho + 2 * tanLat ** 2);
  const XII = 1 / (120 * v2 ** 5 * cosLat) * (5 + 28 * tanLat ** 2 + 24 * tanLat ** 4);
  const XIIA = 1 / (5040 * v2 ** 7 * cosLat) * (61 + 662 * tanLat ** 2 + 1320 * tanLat ** 4 + 720 * tanLat ** 6);

  const dE = E - E0;

  const latOSGB = lat - VII * dE ** 2 + VIII * dE ** 4 - IX * dE ** 6;
  const lonOSGB = lon0 + X * dE - XI * dE ** 3 + XII * dE ** 5 - XIIA * dE ** 7;

  // Helmert: OSGB36 -> WGS84
  const sinLatO = Math.sin(latOSGB);
  const cosLatO = Math.cos(latOSGB);
  const vO = aA / Math.sqrt(1 - e2A * sinLatO ** 2);

  const H = 0;
  const x = (vO + H) * cosLatO * Math.cos(lonOSGB);
  const y = (vO + H) * cosLatO * Math.sin(lonOSGB);
  const z = (vO * (1 - e2A) + H) * sinLatO;

  const tx = 446.448, ty = -125.157, tz = 542.06;
  const rx = (0.1502 / 3600 * Math.PI) / 180;
  const ry = (0.247 / 3600 * Math.PI) / 180;
  const rz = (0.8421 / 3600 * Math.PI) / 180;
  const s = -20.4894e-6;

  const x2 = tx + x * (1 + s) - y * rz + z * ry;
  const y2 = ty + x * rz + y * (1 + s) - z * rx;
  const z2 = tz - x * ry + y * rx + z * (1 + s);

  const e2W = 1 - (b * b) / (a * a);
  const p = Math.sqrt(x2 ** 2 + y2 ** 2);
  let latW = Math.atan2(z2, p * (1 - e2W));
  for (let i = 0; i < 10; i++) {
    const vW = a / Math.sqrt(1 - e2W * Math.sin(latW) ** 2);
    latW = Math.atan2(z2 + e2W * vW * Math.sin(latW), p);
  }
  const lonW = Math.atan2(y2, x2);

  return { lat: (latW * 180) / Math.PI, lon: (lonW * 180) / Math.PI };
}

export function isOSGridRef(str) {
  return /^[A-Z]{2}\s?\d{6}(\d{2})?$/i.test(str.trim().replace(/\s+/g, ' '));
}

// ── WAB Square ────────────────────────────────────────────────

export function latLonToWAB(lat, lon) {
  const { E, N } = latLonToOSGB(lat, lon);

  // Same origin offset as OS grid lettering
  const gridSquares = ['VWXYZ', 'QRSTU', 'LMNOP', 'FGHJK', 'ABCDE'];
  const adjE = E + 1000000;
  const adjN = N + 500000;

  const major_e = Math.floor(adjE / 500000);
  const major_n = Math.floor(adjN / 500000);
  const letter500 = gridSquares[major_n]?.[major_e];
  if (!letter500) return null;

  const sub_e = Math.floor((adjE % 500000) / 100000);
  const sub_n = Math.floor((adjN % 500000) / 100000);
  const letter100 = gridSquares[sub_n]?.[sub_e];
  if (!letter100) return null;

  // WAB 10km square digits within the 100km square
  const eKm = Math.floor((E % 100000) / 10000);
  const nKm = Math.floor((N % 100000) / 10000);

  return `${letter500}${letter100}${eKm}${nKm}`;
}

export function isWAB(str) {
  return /^[A-Z]{2}\d{2}$/i.test(str.trim());
}

// ── Plus Codes (Open Location Code) ──────────────────────────
// Ported from Google's OLC reference implementation

const CODE_ALPHABET = '23456789CFGHJMPQRVWX';
const ENCODING_BASE = 20;
const PAIR_CODE_LENGTH = 10;
const CODE_PRECISION_NORMAL = 10;
const GRID_ROWS = 5;
const GRID_COLS = 4;
const MIN_DIGIT_COUNT = 2;
const MAX_DIGIT_COUNT = 15;
const PADDING_CHARACTER = '0';
const SEPARATOR = '+';
const SEPARATOR_POSITION = 8;
const LAT_MAX = 90;
const LON_MAX = 180;

function isValidOLC(code) {
  if (!code) return false;
  code = code.toUpperCase();
  const sep = code.indexOf(SEPARATOR);
  if (sep < 0 || sep !== code.lastIndexOf(SEPARATOR)) return false;
  if (sep % 2 !== 0 || sep > SEPARATOR_POSITION) return false;

  const padStart = code.indexOf(PADDING_CHARACTER);
  if (padStart >= 0) {
    if (padStart === 0) return false;
    const padMatch = code.match(new RegExp(`[${PADDING_CHARACTER}]+`));
    if (!padMatch || padMatch[0].length % 2 !== 0) return false;
    if (code.slice(code.indexOf(PADDING_CHARACTER) + padMatch[0].length) !== SEPARATOR) return false;
  }

  for (const c of code.replace(SEPARATOR, '').replace(new RegExp(`\\${PADDING_CHARACTER}`, 'g'), '')) {
    if (CODE_ALPHABET.indexOf(c) < 0) return false;
  }
  return true;
}

export function isPlusCode(str) {
  str = str.trim().toUpperCase();
  if (isValidOLC(str)) return true;
  // Short code with reference
  return /^[23456789CFGHJMPQRVWX]{2,8}\+[23456789CFGHJMPQRVWX]{0,6}$/i.test(str);
}

export function latLonToPlusCode(lat, lon, codeLength = 10) {
  lat = clipValue(lat, -LAT_MAX, LAT_MAX);
  lon = normalizeLon(lon);

  let latVal = (lat + LAT_MAX) * Math.pow(ENCODING_BASE, 3);
  let lonVal = (lon + LON_MAX) * Math.pow(ENCODING_BASE, 3);

  let code = '';
  let digits = 0;

  while (digits < codeLength) {
    if (digits === SEPARATOR_POSITION) code += SEPARATOR;

    if (digits < PAIR_CODE_LENGTH) {
      const latDigit = Math.floor(latVal / Math.pow(ENCODING_BASE, 2));
      const lonDigit = Math.floor(lonVal / Math.pow(ENCODING_BASE, 2));
      code += CODE_ALPHABET[latDigit];
      code += CODE_ALPHABET[lonDigit];
      latVal = (latVal % Math.pow(ENCODING_BASE, 2)) * ENCODING_BASE;
      lonVal = (lonVal % Math.pow(ENCODING_BASE, 2)) * ENCODING_BASE;
      digits += 2;
    } else {
      const gridCode =
        Math.floor(latVal / 1) * GRID_COLS + Math.floor(lonVal / 1);
      code += CODE_ALPHABET[gridCode];
      latVal = (latVal % 1) * GRID_ROWS;
      lonVal = (lonVal % 1) * GRID_COLS;
      digits++;
    }
  }

  while (code.length < SEPARATOR_POSITION) code += PADDING_CHARACTER;
  if (code.length === SEPARATOR_POSITION) code += SEPARATOR;

  return code;
}

export function plusCodeToLatLon(code) {
  code = code.toUpperCase().trim();
  if (!isValidOLC(code)) return null;

  code = code.replace(new RegExp(`\\${PADDING_CHARACTER}+${SEPARATOR}?`), SEPARATOR);
  if (code.indexOf(SEPARATOR) < SEPARATOR_POSITION) {
    return null; // Short code needs reference location
  }

  const stripped = code.replace(SEPARATOR, '');
  let latLow = -LAT_MAX;
  let lonLow = -LON_MAX;
  let latHigh = LAT_MAX;
  let lonHigh = LON_MAX;

  let latRes = Math.pow(ENCODING_BASE, 2);
  let lonRes = Math.pow(ENCODING_BASE, 2);

  let i = 0;
  while (i < Math.min(stripped.length, PAIR_CODE_LENGTH)) {
    latRes /= ENCODING_BASE;
    lonRes /= ENCODING_BASE;
    latLow += CODE_ALPHABET.indexOf(stripped[i]) * latRes;
    lonLow += CODE_ALPHABET.indexOf(stripped[i + 1]) * lonRes;
    i += 2;
  }

  let gridRowRes = latRes / GRID_ROWS;
  let gridColRes = lonRes / GRID_COLS;

  while (i < stripped.length) {
    const ndx = CODE_ALPHABET.indexOf(stripped[i]);
    const row = Math.floor(ndx / GRID_COLS);
    const col = ndx % GRID_COLS;
    latLow += row * gridRowRes;
    lonLow += col * gridColRes;
    gridRowRes /= GRID_ROWS;
    gridColRes /= GRID_COLS;
    i++;
  }

  return {
    lat: latLow + (latRes / 2),
    lon: lonLow + (lonRes / 2),
  };
}

function clipValue(val, min, max) {
  return Math.min(max, Math.max(min, val));
}

function normalizeLon(lon) {
  while (lon < -LON_MAX) lon += 360;
  while (lon >= LON_MAX) lon -= 360;
  return lon;
}

// ── Master detect + convert ───────────────────────────────────

export function detectFormat(input) {
  input = input.trim();
  if (isMaidenhead(input)) return 'maidenhead';
  if (isOSGridRef(input)) return 'osgrid';
  if (isWAB(input)) return 'wab';
  if (isPlusCode(input)) return 'pluscode';
  if (parseDMS(input)) return 'latlon';
  return null;
}

export function convertAll(input) {
  input = input.trim();
  const format = detectFormat(input);
  let latlon = null;

  switch (format) {
    case 'latlon':
      latlon = parseDMS(input);
      break;
    case 'maidenhead':
      latlon = maidenheadToLatLon(input);
      break;
    case 'osgrid':
      latlon = osGridRefToLatLon(input);
      break;
    case 'pluscode':
      latlon = plusCodeToLatLon(input);
      break;
    case 'wab': {
      const upper = input.toUpperCase();
      const gridSquares = [
        'VWXYZ', 'QRSTU', 'LMNOP', 'FGHJK', 'ABCDE'
      ];
      let major_e = -1, major_n = -1, sub_e = -1, sub_n = -1;
      for (let row = 0; row < 5; row++) {
        const c = gridSquares[row].indexOf(upper[0]);
        if (c >= 0) { major_n = row; major_e = c; break; }
      }
      for (let row = 0; row < 5; row++) {
        const c = gridSquares[row].indexOf(upper[1]);
        if (c >= 0) { sub_n = row; sub_e = c; break; }
      }
      if (major_e >= 0 && sub_e >= 0) {
        const eKm = parseInt(upper[2]) * 10000 + 5000;
        const nKm = parseInt(upper[3]) * 10000 + 5000;
        const totalE = major_e * 500000 + sub_e * 100000 + eKm - 1000000;
        const totalN = major_n * 500000 + sub_n * 100000 + nKm - 500000;
        latlon = osgbToLatLon(totalE, totalN);
      }
      break;
    }
    default:
      return null;
  }

  if (!latlon) return null;
  const { lat, lon } = latlon;

  return {
    detected: format,
    latlon: { lat, lon },
    decimal: `${lat.toFixed(6)}, ${lon.toFixed(6)}`,
    dms: latLonToDMS(lat, lon),
    degreesMinutes: latLonToDegreesMinutes(lat, lon),
    maidenhead: latLonToMaidenhead(lat, lon),
    osgrid: latLonToOSGridRef(lat, lon) ?? 'Outside GB',
    wab: latLonToWAB(lat, lon) ?? 'Outside GB',
    pluscode: latLonToPlusCode(lat, lon),
  };
}
