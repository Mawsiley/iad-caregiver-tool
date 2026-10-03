// Skin areas exposed to urine / stool, mapped onto the procedural 3D body.
// Figure faces +Z. The figure's LEFT side is +X.
// Pelvis zones are patches of an ellipsoid (three.js sphere phi/theta ranges):
//   x = -cos(phi)·sin(theta), y = cos(theta), z = sin(phi)·sin(theta)
// Thigh zones are patches of a cylinder in the leg's local space (top = hip, y down):
//   x = sin(theta), z = cos(theta)

const PI = Math.PI;
const F = PI / 2; // front-facing phi
const B = (3 * PI) / 2; // back-facing phi

export const PELVIS = { center: [0, 0.86, 0], radii: [0.185, 0.17, 0.13] };
export const LEG = { x: 0.1, hipY: 0.8, splay: 0.05, thighLen: 0.36, rTop: 0.092, rBot: 0.062 };

export const ZONES = [
  // ── Front ──────────────────────────────────────────────
  { id: 'lowerAbdomen', side: 'front', on: 'pelvis', phi: [F - 1.05, F + 1.05], theta: [0.28 * PI, 0.5 * PI],
    name: { en: 'Lower belly', ar: 'أسفل البطن' } },
  { id: 'genital', side: 'front', on: 'pelvis', phi: [F - 0.38, F + 0.38], theta: [0.5 * PI, 0.86 * PI],
    name: { en: 'Genital area', ar: 'منطقة الأعضاء التناسلية' } },
  { id: 'groinL', side: 'front', on: 'pelvis', phi: [F + 0.38, F + 1.15], theta: [0.5 * PI, 0.8 * PI],
    name: { en: 'Left groin fold', ar: 'ثنية الفخذ اليسرى' } },
  { id: 'groinR', side: 'front', on: 'pelvis', phi: [F - 1.15, F - 0.38], theta: [0.5 * PI, 0.8 * PI],
    name: { en: 'Right groin fold', ar: 'ثنية الفخذ اليمنى' } },
  { id: 'innerThighL', side: 'front', on: 'thighL', theta: [B - 0.6, B + 1.0], y: [-0.24, -0.06],
    name: { en: 'Left inner thigh', ar: 'باطن الفخذ الأيسر' } },
  { id: 'innerThighR', side: 'front', on: 'thighR', theta: [F - 1.0, F + 0.6], y: [-0.24, -0.06],
    name: { en: 'Right inner thigh', ar: 'باطن الفخذ الأيمن' } },
  { id: 'perineum', side: 'front', on: 'pelvis', phi: [0, 2 * PI], theta: [0.86 * PI, PI],
    name: { en: 'Between the legs (perineum)', ar: 'ما بين الساقين (العجان)' } },

  // ── Back ───────────────────────────────────────────────
  { id: 'sacrum', side: 'back', on: 'pelvis', phi: [B - 0.7, B + 0.7], theta: [0.24 * PI, 0.42 * PI],
    name: { en: 'Lower back (sacrum)', ar: 'أسفل الظهر (العجز)' } },
  { id: 'buttockL', side: 'back', on: 'pelvis', phi: [B - 1.2, B - 0.18], theta: [0.42 * PI, 0.86 * PI],
    name: { en: 'Left buttock', ar: 'الأرداف - الجهة اليسرى' } },
  { id: 'buttockR', side: 'back', on: 'pelvis', phi: [B + 0.18, B + 1.2], theta: [0.42 * PI, 0.86 * PI],
    name: { en: 'Right buttock', ar: 'الأرداف - الجهة اليمنى' } },
  { id: 'perianal', side: 'back', on: 'pelvis', phi: [B - 0.18, B + 0.18], theta: [0.42 * PI, 0.86 * PI],
    name: { en: 'Around the anus (buttock fold)', ar: 'حول فتحة الشرج (ثنية الأرداف)' } },
  { id: 'backThighL', side: 'back', on: 'thighL', theta: [PI - 0.75, PI + 0.75], y: [-0.2, -0.07],
    name: { en: 'Back of left thigh', ar: 'خلف الفخذ الأيسر' } },
  { id: 'backThighR', side: 'back', on: 'thighR', theta: [PI - 0.75, PI + 0.75], y: [-0.2, -0.07],
    name: { en: 'Back of right thigh', ar: 'خلف الفخذ الأيمن' } },
];

const SETS = {
  urine: ['lowerAbdomen', 'genital', 'groinL', 'groinR', 'innerThighL', 'innerThighR', 'perineum', 'buttockL', 'buttockR'],
  stool: ['perineum', 'perianal', 'buttockL', 'buttockR', 'sacrum', 'backThighL', 'backThighR'],
};
SETS.both = [...new Set([...SETS.urine, ...SETS.stool])];

export function zonesFor(contents) {
  const ids = SETS[contents] || [];
  return ZONES.filter((z) => ids.includes(z.id));
}

export const zoneById = (id) => ZONES.find((z) => z.id === id);

export const CHANGES = ['color', 'wet', 'broken', 'rash', 'pain'];
export const URGENT_CHANGES = ['broken', 'rash', 'pain'];

export function evaluate(results = {}) {
  const changed = Object.entries(results).filter(([, r]) => r.status === 'changed');
  if (changed.length === 0) return 'ok';
  return changed.some(([, r]) => r.changes.some((c) => URGENT_CHANGES.includes(c))) ? 'report' : 'watch';
}
