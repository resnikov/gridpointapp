// Quick smoke-test for conversions.js
// Run with: node src/utils/conversions.test.js

import {
  toDMS, toDM,
  toMaidenhead, fromMaidenhead,
  toOSGridRef, fromOSGridRef,
  toWAB, fromWAB,
  encodePlusCodes, decodePlusCodes,
  calcCQZone, calcITUZone,
  getAllFormats,
  parseDD, parseDMSPair, parseDMPair,
} from './conversions.js';

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (e) {
    console.log(`  ✗ ${name}: ${e.message}`);
    failed++;
  }
}

function eq(a, b, msg) {
  if (a !== b) throw new Error(`${msg || ''} — expected "${b}", got "${a}"`);
}

function near(a, b, tol = 0.001, msg) {
  if (Math.abs(a - b) > tol) throw new Error(`${msg || ''} — expected ~${b}, got ${a}`);
}

// ── Known test point: Rochdale ────────────────────────────────
const ROCHDALE = { lat: 53.6136, lon: -2.1603 };

console.log('\n── DMS / DDM ───────────────────────────────');
test('toDMS lat', () => {
  const r = toDMS(ROCHDALE.lat, true);
  if (!r.includes('N')) throw new Error('Missing N: ' + r);
});
test('toDMS lon', () => {
  const r = toDMS(ROCHDALE.lon, false);
  if (!r.includes('W')) throw new Error('Missing W: ' + r);
});
test('toDM lat', () => {
  const r = toDM(ROCHDALE.lat, true);
  if (!r.includes('N')) throw new Error('Missing N: ' + r);
});
test('parseDMSPair round-trip', () => {
  const dmsLat = toDMS(ROCHDALE.lat, true);
  const dmsLon = toDMS(ROCHDALE.lon, false);
  const { lat, lon } = parseDMSPair(dmsLat, dmsLon);
  near(lat, ROCHDALE.lat, 0.001, 'lat');
  near(lon, ROCHDALE.lon, 0.001, 'lon');
});

console.log('\n── Maidenhead ──────────────────────────────');
test('toMaidenhead 6-char', () => {
  const r = toMaidenhead(ROCHDALE.lat, ROCHDALE.lon, 6);
  eq(r.length, 6, 'length');
  // Rochdale should be in IO83
  if (!r.startsWith('IO83')) throw new Error('Expected IO83xx, got ' + r);
});
test('toMaidenhead 8-char', () => {
  const r = toMaidenhead(ROCHDALE.lat, ROCHDALE.lon, 8);
  eq(r.length, 8, 'length');
});
test('fromMaidenhead round-trip', () => {
  const grid = toMaidenhead(ROCHDALE.lat, ROCHDALE.lon, 6);
  const { lat, lon } = fromMaidenhead(grid);
  // 6-char accuracy is ~2.5km
  near(lat, ROCHDALE.lat, 0.05, 'lat');
  near(lon, ROCHDALE.lon, 0.1, 'lon');
});

console.log('\n── OS Grid Reference ───────────────────────');
test('toOSGridRef produces valid 2-letter prefix', () => {
  const r = toOSGridRef(ROCHDALE.lat, ROCHDALE.lon);
  if (!/^[A-Z]{2}/.test(r)) throw new Error('Bad OS ref: ' + r);
  console.log(`    → ${r}`);
});
test('fromOSGridRef round-trip', () => {
  const ref = toOSGridRef(ROCHDALE.lat, ROCHDALE.lon);
  if (ref === 'Outside GB') throw new Error('Got Outside GB unexpectedly');
  const { lat, lon } = fromOSGridRef(ref);
  near(lat, ROCHDALE.lat, 0.001, 'lat');
  near(lon, ROCHDALE.lon, 0.002, 'lon');
});
test('Outside GB returns correctly', () => {
  const r = toOSGridRef(48.8566, 2.3522); // Paris
  eq(r, 'Outside GB', 'Paris should be outside GB');
});

console.log('\n── WAB Square ──────────────────────────────');
test('toWAB format', () => {
  const r = toWAB(ROCHDALE.lat, ROCHDALE.lon);
  if (!/^[A-Z]{2}\d{2}$/.test(r)) throw new Error('Bad WAB: ' + r);
  console.log(`    → ${r}`);
});
test('fromWAB round-trip within 10km', () => {
  const wab = toWAB(ROCHDALE.lat, ROCHDALE.lon);
  if (wab === 'Outside GB') throw new Error('Got Outside GB');
  const { lat, lon } = fromWAB(wab);
  // WAB is a 10km square so allow ~0.1 deg
  near(lat, ROCHDALE.lat, 0.1, 'lat');
  near(lon, ROCHDALE.lon, 0.15, 'lon');
});

console.log('\n── Plus Codes ──────────────────────────────');
test('encodePlusCodes contains +', () => {
  const r = encodePlusCodes(ROCHDALE.lat, ROCHDALE.lon);
  if (!r.includes('+')) throw new Error('Missing +: ' + r);
  console.log(`    → ${r}`);
});
test('decodePlusCodes round-trip', () => {
  const code = encodePlusCodes(ROCHDALE.lat, ROCHDALE.lon);
  const { lat, lon } = decodePlusCodes(code);
  near(lat, ROCHDALE.lat, 0.001, 'lat');
  near(lon, ROCHDALE.lon, 0.001, 'lon');
});
test('decodePlusCodes throws on bad input', () => {
  let threw = false;
  try { decodePlusCodes('NOTACODE'); } catch (e) { threw = true; }
  if (!threw) throw new Error('Should have thrown');
});

console.log('\n── CQ / ITU Zones ──────────────────────────');
test('UK is CQ zone 14', () => {
  const z = calcCQZone(ROCHDALE.lat, ROCHDALE.lon);
  eq(z, 14, 'CQ zone');
});
test('UK is ITU zone 18', () => {
  const z = calcITUZone(ROCHDALE.lat, ROCHDALE.lon);
  eq(z, 18, 'ITU zone');
});

console.log('\n── getAllFormats ────────────────────────────');
test('returns 9 results', () => {
  const r = getAllFormats(ROCHDALE.lat, ROCHDALE.lon);
  if (r.length !== 9) throw new Error(`Expected 9, got ${r.length}`);
});
test('all results have label and value', () => {
  const r = getAllFormats(ROCHDALE.lat, ROCHDALE.lon);
  r.forEach(item => {
    if (!item.label) throw new Error('Missing label');
    if (!item.value) throw new Error('Missing value for: ' + item.label);
  });
});

console.log('\n── parseDD ─────────────────────────────────');
test('parseDD valid', () => {
  const { lat, lon } = parseDD('53.6136', '-2.1603');
  near(lat, 53.6136, 0.0001);
  near(lon, -2.1603, 0.0001);
});
test('parseDD throws on out-of-range lat', () => {
  let threw = false;
  try { parseDD('95', '0'); } catch (e) { threw = true; }
  if (!threw) throw new Error('Should have thrown');
});

// ── Summary ───────────────────────────────────────────────────
console.log(`\n${'─'.repeat(44)}`);
console.log(`  ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
