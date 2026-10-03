// Skin areas exposed to urine / stool. Where each area sits on the 3D body is
// defined in src/body/zoneClassify.js.

export const ZONES = [
  // ── Front ──────────────────────────────────────────────
  { id: 'lowerAbdomen', side: 'front', name: { en: 'Lower belly', ar: 'أسفل البطن' } },
  { id: 'genital', side: 'front', name: { en: 'Genital area', ar: 'منطقة الأعضاء التناسلية' } },
  { id: 'groinL', side: 'front', name: { en: 'Left groin fold', ar: 'ثنية الفخذ اليسرى' } },
  { id: 'groinR', side: 'front', name: { en: 'Right groin fold', ar: 'ثنية الفخذ اليمنى' } },
  { id: 'innerThighL', side: 'front', name: { en: 'Left inner thigh', ar: 'باطن الفخذ الأيسر' } },
  { id: 'innerThighR', side: 'front', name: { en: 'Right inner thigh', ar: 'باطن الفخذ الأيمن' } },
  { id: 'perineum', side: 'front', name: { en: 'Between the legs (perineum)', ar: 'ما بين الساقين (العجان)' } },

  // ── Back ───────────────────────────────────────────────
  { id: 'sacrum', side: 'back', name: { en: 'Lower back (sacrum)', ar: 'أسفل الظهر (العجز)' } },
  { id: 'buttockL', side: 'back', name: { en: 'Left buttock', ar: 'الأرداف - الجهة اليسرى' } },
  { id: 'buttockR', side: 'back', name: { en: 'Right buttock', ar: 'الأرداف - الجهة اليمنى' } },
  { id: 'perianal', side: 'back', name: { en: 'Around the anus (buttock fold)', ar: 'حول فتحة الشرج (ثنية الأرداف)' } },
  { id: 'backThighL', side: 'back', name: { en: 'Back of left thigh', ar: 'خلف الفخذ الأيسر' } },
  { id: 'backThighR', side: 'back', name: { en: 'Back of right thigh', ar: 'خلف الفخذ الأيمن' } },
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
