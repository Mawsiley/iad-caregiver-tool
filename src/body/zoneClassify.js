// Decides which skin zone a point on the body surface belongs to.
// The SAME rules exist twice: in JS (for taps) and GLSL (for drawing) — keep them in sync.
// Figure faces +Z, figure's left is +X. Index = position in ZONES + 1 (0 = no zone).
import { ZONES } from '../data/zones.js';

export const ZONE_INDEX = Object.fromEntries(ZONES.map((z, i) => [z.id, i + 1]));
const I = ZONE_INDEX;

// Thigh axis x at height y (matches the leg cone in sculpt.js).
const legX = (y) => 0.088 + ((0.86 - y) / 0.39) * 0.034;

export function zoneIndexAt(x, y, z) {
  const ax = Math.abs(x);
  const L = x >= 0;
  if (ax > 0.2 || y < 0.58 || y > 0.98) return 0;
  if (y < 0.8 && ax < 0.06 && Math.abs(z) <= 0.045) return I.perineum;
  if (z < -0.045 && ax < 0.022 && y >= 0.74 && y < 0.93) return I.perianal;
  if (z < -0.02) {
    if (y >= 0.93) return ax < 0.1 ? I.sacrum : 0;
    if (y >= 0.745) return ax < 0.185 ? (L ? I.buttockL : I.buttockR) : 0;
    if (y >= 0.6) return L ? I.backThighL : I.backThighR;
    return 0;
  }
  // Lower-belly boundary curves down toward the middle, like the groin creases.
  if (y >= 0.845 + ax * 0.22) return z > 0.02 && ax < 0.14 && y < 0.98 - ax * 0.2 ? I.lowerAbdomen : 0;
  if (y >= 0.75) {
    if (z > 0.045 && ax < 0.055) return I.genital;
    if (ax >= 0.055 && ax < 0.15 && z > 0) return L ? I.groinL : I.groinR;
    return 0;
  }
  if (ax < legX(y) - 0.01) return L ? I.innerThighL : I.innerThighR;
  return 0;
}

export const ZONE_COUNT = ZONES.length + 1;

export const ZONE_GLSL = /* glsl */ `
int zoneIndexAt(vec3 p) {
  float ax = abs(p.x);
  bool L = p.x >= 0.0;
  if (ax > 0.2 || p.y < 0.58 || p.y > 0.98) return 0;
  if (p.y < 0.8 && ax < 0.06 && abs(p.z) <= 0.045) return ${I.perineum};
  if (p.z < -0.045 && ax < 0.022 && p.y >= 0.74 && p.y < 0.93) return ${I.perianal};
  if (p.z < -0.02) {
    if (p.y >= 0.93) return ax < 0.1 ? ${I.sacrum} : 0;
    if (p.y >= 0.745) return ax < 0.185 ? (L ? ${I.buttockL} : ${I.buttockR}) : 0;
    if (p.y >= 0.6) return L ? ${I.backThighL} : ${I.backThighR};
    return 0;
  }
  if (p.y >= 0.845 + ax * 0.22) return (p.z > 0.02 && ax < 0.14 && p.y < 0.98 - ax * 0.2) ? ${I.lowerAbdomen} : 0;
  if (p.y >= 0.75) {
    if (p.z > 0.045 && ax < 0.055) return ${I.genital};
    if (ax >= 0.055 && ax < 0.15 && p.z > 0.0) return L ? ${I.groinL} : ${I.groinR};
    return 0;
  }
  float legX = 0.088 + ((0.86 - p.y) / 0.39) * 0.034;
  if (ax < legX - 0.01) return L ? ${I.innerThighL} : ${I.innerThighR};
  return 0;
}
`;
