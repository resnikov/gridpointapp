// ═══════════════════════════════════════════════════════════════
// GRIDPOINT APP — Coordinate Conversion Library
// Ported from GridPoint web app (resnikov/gridpoint)
// All functions are pure JS — fully offline capable
// ═══════════════════════════════════════════════════════════════

// ── Decimal Degrees ────────────────────────────────────────────
export function toDMS(deg, isLat) {
  const abs = Math.abs(deg);
  const d = Math.floor(abs);
  const mFull = (abs - d) * 60;
  const m = Math.floor(mFull);
  const s = ((mFull - m) * 60).toFixed(2);
  const dir = isLat ? (deg >= 0 ? 'N' : 'S') : (deg >= 0 ? 'E' : 'W');
  return `${d}° ${m}' ${s}" ${dir}`;
}

export function toDM(deg, isLat) {
  const abs = Math.abs(deg);
  const d = Math.floor(abs);
  const m = ((abs - d) * 60).toFixed(4);
  const dir = isLat ? (deg >= 0 ? 'N' : 'S') : (deg >= 0 ? 'E' : 'W');
  return `${d}° ${m}' ${dir}`;
}

// ── Maidenhead Grid Locator ────────────────────────────────────
export function toMaidenhead(lat, lon, chars = 6) {
  const A = 'A'.charCodeAt(0);
  const l = lon + 180;
  const la = lat + 90;
  const f1 = String.fromCharCode(A + Math.floor(l / 20));
  const f2 = String.fromCharCode(A + Math.floor(la / 10));
  const f3 = String(Math.floor((l % 20) / 2));
  const f4 = String(Math.floor(la % 10));
  const lonSubStep = 2 / 24;
  const latSubStep = 1 / 24;
  const f5 = String.fromCharCode(A + Math.floor((l % 2) / lonSubStep));
  const f6 = String.fromCharCode(A + Math.floor((la % 1) / latSubStep));
  if (chars <= 6) return `${f1}${f2}${f3}${f4}${f5}${f6}`.toUpperCase();
  const lonExtStep = lonSubStep / 10;
  const latExtStep = latSubStep / 10;
  const e1 = Math.floor((l % lonSubStep) / lonExtStep);
  const e2 = Math.floor((la % latSubStep) / latExtStep);
  return `${f1}${f2}${f3}${f4}${f5}${f6}${e1}${e2}`.toUpperCase();
}

export function fromMaidenhead(grid) {
  grid = grid.trim().toUpperCase();
  if (grid.length < 4) throw new Error('Grid must be at least 4 characters');
  const A = 'A'.charCodeAt(0);
  const lonSubStep = 2 / 24;
  const latSubStep = 1 / 24;
  const lonExtStep = lonSubStep / 10;
  const latExtStep = latSubStep / 10;
  let lon = (grid.charCodeAt(0) - A) * 20 - 180;
  let lat = (grid.charCodeAt(1) - A) * 10 - 90;
  lon += parseInt(grid[2]) * 2;
  lat += parseInt(grid[3]) * 1;
  if (grid.length >= 6) {
    lon += (grid.charCodeAt(4) - A) * lonSubStep;
    lat += (grid.charCodeAt(5) - A) * latSubStep;
    if (grid.length >= 8) {
      const e1 = parseInt(grid[6]);
      const e2 = parseInt(grid[7]);
      if (!isNaN(e1) && !isNaN(e2)) {
        lon += e1 * lonExtStep + lonExtStep / 2;
        lat += e2 * latExtStep + latExtStep / 2;
      } else {
        lon += lonSubStep / 2;
        lat += latSubStep / 2;
      }
    } else {
      lon += lonSubStep / 2;
      lat += latSubStep / 2;
    }
  } else {
    lon += 1;
    lat += 0.5;
  }
  return { lat, lon };
}

// ── OS National Grid ───────────────────────────────────────────
// OSGB36 <-> WGS84 Helmert approximation, accurate to ~5m
function wgs84ToOSGB36(lat, lon) {
  const φ = lat * Math.PI / 180;
  const λ = lon * Math.PI / 180;
  const a = 6378137.000, b = 6356752.3141;
  const e2 = 1 - (b * b) / (a * a);
  const ν = a / Math.sqrt(1 - e2 * Math.sin(φ) ** 2);
  const x = ν * Math.cos(φ) * Math.cos(λ);
  const y = ν * Math.cos(φ) * Math.sin(λ);
  const z = ν * (1 - e2) * Math.sin(φ);
  const tx = -446.448, ty = 125.157, tz = -542.060;
  const rx = -0.1502 / 206265, ry = -0.2470 / 206265, rz = -0.8421 / 206265;
  const s = 20.4894e-6;
  const x2 = tx + x * (1 + s) + (-rz) * y + ry * z;
  const y2 = ty + rz * x + y * (1 + s) + (-rx) * z;
  const z2 = tz + (-ry) * x + rx * y + z * (1 + s);
  const a2 = 6377563.396, b2 = 6356256.910;
  const e2_2 = 1 - (b2 * b2) / (a2 * a2);
  const p = Math.sqrt(x2 * x2 + y2 * y2);
  let φ2 = Math.atan2(z2, p * (1 - e2_2));
  for (let i = 0; i < 10; i++) {
    const ν2 = a2 / Math.sqrt(1 - e2_2 * Math.sin(φ2) ** 2);
    φ2 = Math.atan2(z2 + e2_2 * ν2 * Math.sin(φ2), p);
  }
  const λ2 = Math.atan2(y2, x2);
  return { lat: φ2 * 180 / Math.PI, lon: λ2 * 180 / Math.PI };
}

export function latLonToOSEN(lat, lon) {
  const osgb = wgs84ToOSGB36(lat, lon);
  const φ = osgb.lat * Math.PI / 180;
  const λ = osgb.lon * Math.PI / 180;
  const a = 6377563.396, b = 6356256.910;
  const F0 = 0.9996012717;
  const φ0 = 49 * Math.PI / 180, λ0 = -2 * Math.PI / 180;
  const N0 = -100000, E0 = 400000;
  const e2 = 1 - (b / a) ** 2;
  const n = (a - b) / (a + b);
  const ν = a * F0 / Math.sqrt(1 - e2 * Math.sin(φ) ** 2);
  const ρ = a * F0 * (1 - e2) / Math.pow(1 - e2 * Math.sin(φ) ** 2, 1.5);
  const η2 = ν / ρ - 1;
  const M = b * F0 * (
    (1 + n + 5 / 4 * n * n + 5 / 4 * n ** 3) * (φ - φ0)
    - (3 * n + 3 * n * n + 21 / 8 * n ** 3) * Math.sin(φ - φ0) * Math.cos(φ + φ0)
    + (15 / 8 * n * n + 15 / 8 * n ** 3) * Math.sin(2 * (φ - φ0)) * Math.cos(2 * (φ + φ0))
    - 35 / 24 * n ** 3 * Math.sin(3 * (φ - φ0)) * Math.cos(3 * (φ + φ0))
  );
  const I = M + N0;
  const II = ν / 2 * Math.sin(φ) * Math.cos(φ);
  const III = ν / 24 * Math.sin(φ) * Math.cos(φ) ** 3 * (5 - Math.tan(φ) ** 2 + 9 * η2);
  const IIIA = ν / 720 * Math.sin(φ) * Math.cos(φ) ** 5 * (61 - 58 * Math.tan(φ) ** 2 + Math.tan(φ) ** 4);
  const IV = ν * Math.cos(φ);
  const V = ν / 6 * Math.cos(φ) ** 3 * (ν / ρ - Math.tan(φ) ** 2);
  const VI = ν / 120 * Math.cos(φ) ** 5 * (5 - 18 * Math.tan(φ) ** 2 + Math.tan(φ) ** 4 + 14 * η2 - 58 * Math.tan(φ) ** 2 * η2);
  const Δλ = λ - λ0;
  const N = I + II * Δλ ** 2 + III * Δλ ** 4 + IIIA * Δλ ** 6;
  const E = E0 + IV * Δλ + V * Δλ ** 3 + VI * Δλ ** 5;
  return { E: Math.round(E), N: Math.round(N) };
}

export function latLonToOSEN_approx(lat, lon) {
  try {
    return latLonToOSEN(lat, lon);
  } catch (e) {
    return null;
  }
}

function osENToGridRef(E, N) {
  const sq100 = [
    ['V', 'W', 'X', 'Y', 'Z'],
    ['Q', 'R', 'S', 'T', 'U'],
    ['L', 'M', 'N', 'O', 'P'],
    ['F', 'G', 'H', 'J', 'K'],
    ['A', 'B', 'C', 'D', 'E'],
  ];
  const L500t = [['S', 'T'], ['N', 'O'], ['H', 'I']];
  const e500 = Math.floor(E / 500000);
  const n500 = Math.floor(N / 500000);
  const e100 = Math.floor((E % 500000) / 100000);
  const n100 = Math.floor((N % 500000) / 100000);
  const L500 = L500t[n500]?.[e500] || '?';
  const L100 = sq100[n100]?.[e100] || '?';
  const eR = String(E % 100000).padStart(5, '0');
  const nR = String(N % 100000).padStart(5, '0');
  return `${L500}${L100} ${eR} ${nR}`;
}

export function toOSGridRef(lat, lon) {
  const { E, N } = latLonToOSEN(lat, lon);
  if (E < 0 || E > 700000 || N < 0 || N > 1300000) return 'Outside GB';
  return osENToGridRef(E, N);
}

function osGridRefToEN(gridRef) {
  gridRef = gridRef.replace(/\s+/g, '').toUpperCase();
  const letters = gridRef.match(/^([A-Z]{2})/);
  if (!letters) throw new Error('Invalid OS Grid Reference');
  const L500 = letters[1][0];
  const L100 = letters[1][1];
  const nums = gridRef.slice(2);
  if (nums.length < 4 || nums.length % 2 !== 0) throw new Error('Invalid OS Grid Reference digits');
  const half = nums.length / 2;
  const eStr = nums.slice(0, half).padEnd(5, '0').slice(0, 5);
  const nStr = nums.slice(half).padEnd(5, '0').slice(0, 5);
  const e100 = parseInt(eStr);
  const n100 = parseInt(nStr);
  const bases500 = { S: { e: 0, n: 0 }, T: { e: 1, n: 0 }, N: { e: 0, n: 1 }, O: { e: 1, n: 1 }, H: { e: 0, n: 2 } };
  const base = bases500[L500];
  if (!base) throw new Error('Unrecognised 500km square: ' + L500);
  const sq100 = {
    V: { e: 0, n: 0 }, W: { e: 1, n: 0 }, X: { e: 2, n: 0 }, Y: { e: 3, n: 0 }, Z: { e: 4, n: 0 },
    Q: { e: 0, n: 1 }, R: { e: 1, n: 1 }, S: { e: 2, n: 1 }, T: { e: 3, n: 1 }, U: { e: 4, n: 1 },
    L: { e: 0, n: 2 }, M: { e: 1, n: 2 }, N: { e: 2, n: 2 }, O: { e: 3, n: 2 }, P: { e: 4, n: 2 },
    F: { e: 0, n: 3 }, G: { e: 1, n: 3 }, H: { e: 2, n: 3 }, J: { e: 3, n: 3 }, K: { e: 4, n: 3 },
    A: { e: 0, n: 4 }, B: { e: 1, n: 4 }, C: { e: 2, n: 4 }, D: { e: 3, n: 4 }, E: { e: 4, n: 4 },
  };
  const b100 = sq100[L100];
  if (!b100) throw new Error('Unrecognised 100km square: ' + L100);
  const E = base.e * 500000 + b100.e * 100000 + e100;
  const N = base.n * 500000 + b100.n * 100000 + n100;
  return { E, N };
}

export function osENToLatLon(E, N) {
  const a = 6377563.396, b = 6356256.910;
  const F0 = 0.9996012717;
  const φ0 = 49 * Math.PI / 180, λ0 = -2 * Math.PI / 180;
  const N0 = -100000, E0 = 400000;
  const e2 = 1 - (b / a) ** 2;
  const n = (a - b) / (a + b);
  const Ep = E - E0;
  let φ = φ0, M = 0;
  do {
    φ = (N - N0 - M) / (a * F0) + φ;
    M = b * F0 * (
      (1 + n + 5 / 4 * n ** 2 + 5 / 4 * n ** 3) * (φ - φ0)
      - (3 * n + 3 * n ** 2 + 21 / 8 * n ** 3) * Math.sin(φ - φ0) * Math.cos(φ + φ0)
      + (15 / 8 * n ** 2 + 15 / 8 * n ** 3) * Math.sin(2 * (φ - φ0)) * Math.cos(2 * (φ + φ0))
      - 35 / 24 * n ** 3 * Math.sin(3 * (φ - φ0)) * Math.cos(3 * (φ + φ0))
    );
  } while (Math.abs(N - N0 - M) >= 0.00001);
  const ν = a * F0 / Math.sqrt(1 - e2 * Math.sin(φ) ** 2);
  const ρ = a * F0 * (1 - e2) / (1 - e2 * Math.sin(φ) ** 2) ** 1.5;
  const η2 = ν / ρ - 1;
  const T = Math.tan(φ) ** 2;
  const VII = Math.tan(φ) / (2 * ρ * ν);
  const VIII = Math.tan(φ) / (24 * ρ * ν ** 3) * (5 + 3 * T + η2 - 9 * T * η2);
  const IX = Math.tan(φ) / (720 * ρ * ν ** 5) * (61 + 90 * T + 45 * T ** 2);
  const X = 1 / (ν * Math.cos(φ));
  const XI = 1 / (6 * ν ** 3 * Math.cos(φ)) * (ν / ρ + 2 * T);
  const XII = 1 / (120 * ν ** 5 * Math.cos(φ)) * (5 + 28 * T + 24 * T ** 2);
  const XIIA = 1 / (5040 * ν ** 7 * Math.cos(φ)) * (61 + 662 * T + 1320 * T ** 2 + 720 * T ** 3);
  const lat_osgb = (φ - VII * Ep ** 2 + VIII * Ep ** 4 - IX * Ep ** 6) * 180 / Math.PI;
  const lon_osgb = (λ0 + X * Ep - XI * Ep ** 3 + XII * Ep ** 5 - XIIA * Ep ** 7) * 180 / Math.PI;
  // Inverse Helmert back to WGS84
  const φr = lat_osgb * Math.PI / 180, λr = lon_osgb * Math.PI / 180;
  const a2 = 6377563.396, b2 = 6356256.910;
  const e2_2 = 1 - (b2 / a2) ** 2;
  const νr = a2 / Math.sqrt(1 - e2_2 * Math.sin(φr) ** 2);
  const xr = νr * Math.cos(φr) * Math.cos(λr);
  const yr = νr * Math.cos(φr) * Math.sin(λr);
  const zr = νr * (1 - e2_2) * Math.sin(φr);
  const tx = 446.448, ty = -125.157, tz = 542.060;
  const rx = 0.1502 / 206265, ry = 0.2470 / 206265, rz = 0.8421 / 206265;
  const s = -20.4894e-6;
  const x2 = tx + xr * (1 + s) + (-rz) * yr + ry * zr;
  const y2 = ty + rz * xr + yr * (1 + s) + (-rx) * zr;
  const z2 = tz + (-ry) * xr + rx * yr + zr * (1 + s);
  const a3 = 6378137.0, e2_3 = 0.00669437999014;
  const p = Math.sqrt(x2 ** 2 + y2 ** 2);
  let φ3 = Math.atan2(z2, p * (1 - e2_3));
  for (let i = 0; i < 10; i++) {
    const ν3 = a3 / Math.sqrt(1 - e2_3 * Math.sin(φ3) ** 2);
    φ3 = Math.atan2(z2 + e2_3 * ν3 * Math.sin(φ3), p);
  }
  return { lat: φ3 * 180 / Math.PI, lon: Math.atan2(y2, x2) * 180 / Math.PI };
}

export function fromOSGridRef(gridRef) {
  const { E, N } = osGridRefToEN(gridRef);
  return osENToLatLon(E, N);
}

// ── WAB Square ─────────────────────────────────────────────────
export function toWAB(lat, lon) {
  const { E, N } = latLonToOSEN(lat, lon);
  if (E < 0 || E > 700000 || N < 0 || N > 1300000) return 'Outside GB';
  const ref = osENToGridRef(E, N);
  const letters = ref.match(/^([A-Z]{2})/)[1];
  const nums = ref.replace(/[A-Z\s]/g, '');
  const half = Math.floor(nums.length / 2);
  return `${letters}${nums[0]}${nums[half]}`;
}

export function fromWAB(wab) {
  wab = wab.trim().toUpperCase();
  if (!/^[A-Z]{2}\d{2}$/.test(wab)) throw new Error('WAB format: 2 letters + 2 digits, e.g. SP45');
  const letters = wab.slice(0, 2);
  const e1 = wab[2];
  const n1 = wab[3];
  const fakeRef = `${letters} ${e1}5000 ${n1}5000`;
  return fromOSGridRef(fakeRef);
}

// ── CQ Zone ────────────────────────────────────────────────────
export function calcCQZone(lat, lon) {
  if (lon < -180) lon += 360;
  if (lon > 180) lon -= 360;
  let zone;
  if (lat >= 75) {
    zone = lon < -10 ? 1 : lon < 40 ? 18 : lon < 100 ? 23 : lon < 160 ? 26 : 31;
  } else if (lat >= 50) {
    if (lon < -100) zone = 1;
    else if (lon < -60) zone = 2;
    else if (lon < 40) zone = 14;
    else if (lon < 60) zone = 21;
    else if (lon < 100) zone = 17;
    else if (lon < 140) zone = 19;
    else zone = 25;
  } else if (lat >= 40) {
    if (lon < -130) zone = 3;
    else if (lon < -90) zone = 4;
    else if (lon < -60) zone = 5;
    else if (lon < 40) zone = 14;
    else if (lon < 60) zone = 21;
    else if (lon < 100) zone = 17;
    else if (lon < 140) zone = 24;
    else zone = 27;
  } else if (lat >= 20) {
    if (lon < -110) zone = 6;
    else if (lon < -84) zone = 7;
    else if (lon < -60) zone = 8;
    else if (lon < -10) zone = 9;
    else if (lon < 20) zone = 33;
    else if (lon < 40) zone = 34;
    else if (lon < 80) zone = 21;
    else if (lon < 140) zone = 26;
    else zone = 27;
  } else if (lat >= 0) {
    if (lon < -80) zone = 7;
    else if (lon < -60) zone = 8;
    else if (lon < -40) zone = 9;
    else if (lon < -20) zone = 11;
    else if (lon < 20) zone = 35;
    else if (lon < 40) zone = 34;
    else if (lon < 60) zone = 39;
    else if (lon < 120) zone = 26;
    else zone = 28;
  } else if (lat >= -20) {
    if (lon < -60) zone = 10;
    else if (lon < -40) zone = 11;
    else if (lon < -20) zone = 36;
    else if (lon < 20) zone = 38;
    else if (lon < 40) zone = 37;
    else if (lon < 80) zone = 39;
    else if (lon < 140) zone = 29;
    else zone = 28;
  } else if (lat >= -40) {
    if (lon < -60) zone = 13;
    else if (lon < 20) zone = 38;
    else if (lon < 60) zone = 38;
    else if (lon < 100) zone = 39;
    else zone = 29;
  } else {
    zone = lon < 0 ? 13 : 29;
  }
  return zone || '?';
}

// ── ITU Zone ───────────────────────────────────────────────────
export function calcITUZone(lat, lon) {
  if (lon < -180) lon += 360;
  if (lon > 180) lon -= 360;
  let zone;
  if (lat >= 75) {
    if (lon < -140) zone = 1;
    else if (lon < -100) zone = 2;
    else if (lon < -60) zone = 75;
    else if (lon < 20) zone = 18;
    else if (lon < 80) zone = 30;
    else zone = 40;
  } else if (lat >= 40) {
    if (lon < -140) zone = 1;
    else if (lon < -120) zone = 2;
    else if (lon < -100) zone = 3;
    else if (lon < -80) zone = 4;
    else if (lon < -60) zone = 5;
    else if (lon < -40) zone = 8;
    else if (lon < -20) zone = 9;
    else if (lon < 0) zone = 18;
    else if (lon < 20) zone = 28;
    else if (lon < 40) zone = 29;
    else if (lon < 60) zone = 30;
    else if (lon < 80) zone = 31;
    else if (lon < 100) zone = 32;
    else if (lon < 120) zone = 33;
    else if (lon < 140) zone = 43;
    else if (lon < 160) zone = 44;
    else zone = 45;
  } else if (lat >= 20) {
    if (lon < -100) zone = 6;
    else if (lon < -80) zone = 7;
    else if (lon < -60) zone = 10;
    else if (lon < -40) zone = 11;
    else if (lon < -20) zone = 12;
    else if (lon < 0) zone = 46;
    else if (lon < 20) zone = 47;
    else if (lon < 40) zone = 48;
    else if (lon < 60) zone = 21;
    else if (lon < 80) zone = 22;
    else if (lon < 100) zone = 41;
    else if (lon < 120) zone = 50;
    else if (lon < 140) zone = 54;
    else if (lon < 160) zone = 57;
    else zone = 62;
  } else if (lat >= 0) {
    if (lon < -80) zone = 7;
    else if (lon < -60) zone = 10;
    else if (lon < -40) zone = 13;
    else if (lon < -20) zone = 16;
    else if (lon < 0) zone = 47;
    else if (lon < 20) zone = 52;
    else if (lon < 40) zone = 53;
    else if (lon < 60) zone = 39;
    else if (lon < 80) zone = 41;
    else if (lon < 100) zone = 51;
    else if (lon < 120) zone = 54;
    else if (lon < 140) zone = 57;
    else zone = 62;
  } else if (lat >= -40) {
    if (lon < -60) zone = 14;
    else if (lon < -20) zone = 16;
    else if (lon < 20) zone = 52;
    else if (lon < 60) zone = 53;
    else if (lon < 100) zone = 39;
    else if (lon < 140) zone = 57;
    else zone = 60;
  } else {
    if (lon < -60) zone = 16;
    else if (lon < 20) zone = 38;
    else if (lon < 100) zone = 68;
    else zone = 60;
  }
  return zone || '?';
}

// ── Plus Codes (Open Location Code) ───────────────────────────
const OLC_CHARS = '23456789CFGHJMPQRVWX';

export function encodePlusCodes(latitude, longitude) {
  let lat = Math.min(90 - 1e-9, Math.max(-90, +latitude));
  let lon = +longitude;
  while (lon < -180) lon += 360;
  while (lon >= 180) lon -= 360;
  lat += 90; lon += 180;
  const latSteps = [20, 1, 0.05, 0.0025, 0.000125];
  const lonSteps = [20, 1, 0.05, 0.0025, 0.000125];
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += OLC_CHARS[Math.floor(lat / latSteps[i]) % 20];
    code += OLC_CHARS[Math.floor(lon / lonSteps[i]) % 20];
    if (i === 3) code += '+';
  }
  return code;
}

export function decodePlusCodes(code) {
  code = code.toUpperCase().replace(/\s/g, '');
  if (!code.includes('+')) throw new Error('Invalid Plus Code: missing +');
  const clean = code.replace('+', '');
  if (clean.length < 8) throw new Error('Plus Code too short (need at least 8 chars before +)');
  const latSteps = [20, 1, 0.05, 0.0025, 0.000125];
  const lonSteps = [20, 1, 0.05, 0.0025, 0.000125];
  let lat = 0, lon = 0;
  for (let i = 0; i < 5 && i * 2 + 1 < clean.length; i++) {
    const latd = OLC_CHARS.indexOf(clean[i * 2]);
    const lond = OLC_CHARS.indexOf(clean[i * 2 + 1]);
    if (latd < 0 || lond < 0) throw new Error('Invalid Plus Code character: ' + clean[i * 2] + clean[i * 2 + 1]);
    lat += latd * latSteps[i];
    lon += lond * lonSteps[i];
  }
  const precision = Math.min(5, Math.floor(clean.length / 2));
  lat += latSteps[precision - 1] / 2;
  lon += lonSteps[precision - 1] / 2;
  return { lat: lat - 90, lon: lon - 180 };
}

// ── Parsing ────────────────────────────────────────────────────
export function parseDD(lat, lon) {
  const la = parseFloat(lat), lo = parseFloat(lon);
  if (isNaN(la) || isNaN(lo)) throw new Error('Invalid decimal degrees');
  if (la < -90 || la > 90) throw new Error('Latitude must be -90 to 90');
  if (lo < -180 || lo > 180) throw new Error('Longitude must be -180 to 180');
  return { lat: la, lon: lo };
}

export function parseDMS(str) {
  const clean = str.trim().toUpperCase().replace(/[°'"]+/g, ' ').replace(/\s+/g, ' ').trim();
  const parts = clean.split(' ').filter(Boolean);
  if (parts.length < 3) throw new Error('Need degrees minutes seconds direction');
  const d = parseFloat(parts[0]);
  const m = parseFloat(parts[1]);
  const s = parseFloat(parts[2]);
  const dir = parts[3] || '';
  if (isNaN(d) || isNaN(m) || isNaN(s)) throw new Error('Invalid DMS');
  let dd = d + m / 60 + s / 3600;
  if (/[SW]/.test(dir)) dd = -dd;
  return dd;
}

export function parseDMSPair(latStr, lonStr) {
  return { lat: parseDMS(latStr), lon: parseDMS(lonStr) };
}

export function parseDM(str) {
  const clean = str.trim().toUpperCase().replace(/[°']+/g, ' ').replace(/\s+/g, ' ').trim();
  const parts = clean.split(' ').filter(Boolean);
  if (parts.length < 2) throw new Error('Need degrees decimal-minutes direction');
  const d = parseFloat(parts[0]);
  const m = parseFloat(parts[1]);
  const dir = parts[2] || '';
  if (isNaN(d) || isNaN(m)) throw new Error('Invalid DM');
  let dd = d + m / 60;
  if (/[SW]/.test(dir)) dd = -dd;
  return dd;
}

export function parseDMPair(latStr, lonStr) {
  return { lat: parseDM(latStr), lon: parseDM(lonStr) };
}

// ── Aliases used by MapScreen ──────────────────────────────────
export const latLonToMaidenhead = (lat, lon) => toMaidenhead(lat, lon, 8);
export const latLonToOSGridRef = toOSGridRef;

// ── Navigation helpers ─────────────────────────────────────────
export function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function bearingTo(lat1, lon1, lat2, lon2) {
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

export function formatDistance(meters, unit = 'km') {
  if (unit === 'mi') {
    const miles = meters / 1609.344;
    if (miles < 0.1) return `${Math.round(meters * 3.28084)}ft`;
    return `${miles.toFixed(2)}mi`;
  }
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(2)}km`;
}

export function formatBearing(deg) {
  const cardinals = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return `${Math.round(deg)}° ${cardinals[Math.round(deg / 22.5) % 16]}`;
}

// ── Main: get all formats for a lat/lon ────────────────────────
export function getAllFormats(lat, lon) {
  const latStr = lat.toFixed(6);
  const lonStr = lon.toFixed(6);
  const results = [];

  results.push({ label: 'Decimal Degrees', value: `${latStr}, ${lonStr}` });
  results.push({ label: 'DMS', value: `${toDMS(lat, true)}, ${toDMS(lon, false)}` });
  results.push({ label: 'Degrees Dec. Minutes', value: `${toDM(lat, true)}, ${toDM(lon, false)}` });
  results.push({ label: 'Maidenhead Grid', value: toMaidenhead(lat, lon, 8) });

  const osResult = toOSGridRef(lat, lon);
  results.push({ label: 'OS Grid Reference', value: osResult });
  results.push({ label: 'WAB Square', value: osResult !== 'Outside GB' ? toWAB(lat, lon) : 'Outside GB' });

  results.push({ label: 'CQ Zone', value: String(calcCQZone(lat, lon)) });
  results.push({ label: 'ITU Zone', value: String(calcITUZone(lat, lon)) });
  results.push({ label: 'Plus Code (OLC)', value: encodePlusCodes(lat, lon) });

  return results;
}

// ── convertAll — auto-detect format and return all conversions ─
// This is the main entry point for the ConvertScreen GO button.
// Returns null if the input can't be parsed.
export function convertAll(raw) {
  if (!raw) return null;
  const str = raw.trim();
  let lat, lon, detected;

  try {
    // ── Maidenhead e.g. IO93HM, IO93 ──────────────────────────
    if (/^[A-R]{2}[0-9]{2}([A-X]{2}([0-9]{2})?)?$/i.test(str.replace(/\s/g, ''))) {
      const r = fromMaidenhead(str.replace(/\s/g, ''));
      lat = r.lat; lon = r.lon; detected = 'maidenhead';

    // ── WAB e.g. SE49 ─────────────────────────────────────────
    } else if (/^[A-Z]{2}\d{2}$/i.test(str.replace(/\s/g, ''))) {
      const r = fromWAB(str.replace(/\s/g, ''));
      lat = r.lat; lon = r.lon; detected = 'wab';

    // ── OS Grid Ref e.g. SE 490 330, TQ301806 ─────────────────
    } else if (/^[HJNOST][A-HJ-Z]\s*\d{4,10}$/i.test(str.replace(/\s+/g, ' ').trim())) {
      const r = fromOSGridRef(str);
      lat = r.lat; lon = r.lon; detected = 'osgrid';

    // ── Plus Code e.g. 9C6WXGRQ+XX ───────────────────────────
    } else if (/^[23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{0,2}$/i.test(str.replace(/\s/g, ''))) {
      const r = decodePlusCodes(str.replace(/\s/g, ''));
      lat = r.lat; lon = r.lon; detected = 'pluscode';

    // ── DMS e.g. 53° 47' 16" N, 1° 14' 0" W ─────────────────
    } else if (/[°'"]\s*[NSEW]/i.test(str) && str.includes(',')) {
      const parts = str.split(',');
      if (parts.length === 2) {
        const r = parseDMSPair(parts[0].trim(), parts[1].trim());
        lat = r.lat; lon = r.lon; detected = 'dms';
      } else return null;

    // ── DDM e.g. 53° 47.28' N, 1° 14.00' W ──────────────────
    } else if (/°.*'/.test(str) && !/["″]/.test(str) && str.includes(',')) {
      const parts = str.split(',');
      if (parts.length === 2) {
        const r = parseDMPair(parts[0].trim(), parts[1].trim());
        lat = r.lat; lon = r.lon; detected = 'degreesMinutes';
      } else return null;

    // ── Decimal degrees e.g. 53.788, -1.233 ──────────────────
    } else if (/^-?\d{1,3}\.?\d*\s*,\s*-?\d{1,3}\.?\d*$/.test(str)) {
      const parts = str.split(',');
      const r = parseDD(parts[0].trim(), parts[1].trim());
      lat = r.lat; lon = r.lon; detected = 'decimal';

    } else {
      return null; // unknown format — caller will try place search
    }
  } catch (e) {
    return null;
  }

  if (lat == null || isNaN(lat) || isNaN(lon)) return null;

  const osResult = toOSGridRef(lat, lon);
  const inGB = osResult !== 'Outside GB';

  return {
    detected,
    latlon: { lat, lon },
    decimal:        `${lat.toFixed(6)}, ${lon.toFixed(6)}`,
    dms:            `${toDMS(lat, true)}, ${toDMS(lon, false)}`,
    degreesMinutes: `${toDM(lat, true)}, ${toDM(lon, false)}`,
    maidenhead:     toMaidenhead(lat, lon, 8),
    osgrid:         osResult,
    wab:            inGB ? toWAB(lat, lon) : 'Outside GB',
    pluscode:       encodePlusCodes(lat, lon),
  };
}
