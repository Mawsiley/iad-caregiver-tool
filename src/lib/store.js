// On-device store (local-first). Everything is saved here first and synced later.
import { FINDINGS } from '../data/knowledge.js';
import { evaluate } from '../data/zones.js';

const K = {
  session: 'iad.session.v1',
  patients: 'iad.patients.v1',
  exams: 'iad.exams.v1',
  contrib: 'iad.contrib.v1',
  iad: 'iad.history.v1',
};

function read(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback;
  } catch {
    return fallback;
  }
}
function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked */
  }
}

export const uid = (prefix) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

/* ── Session (12 h, same as the server token) ── */
export function loadSession() {
  const s = read(K.session, null);
  if (!s || Date.now() - s.savedAt > 12 * 3600 * 1000) return null;
  return s;
}
export const saveSession = (token, user) => write(K.session, { token, user, savedAt: Date.now() });
export const clearSession = () => {
  try {
    localStorage.removeItem(K.session);
  } catch {
    /* ignore */
  }
};

/* ── Patients (anonymous codes) ── */
export const loadPatients = () => read(K.patients, []);
export function addPatient({ code, ageBand, sex }) {
  const list = loadPatients();
  const p = { id: uid('p'), code: code.trim().toUpperCase(), ageBand, sex, createdAt: new Date().toISOString() };
  write(K.patients, [p, ...list]);
  return p;
}
export function nextPatientCode() {
  const n = loadPatients().length + 1;
  return `P-${String(n).padStart(4, '0')}`;
}

/* ── Body exams ── */
export const loadExams = () => read(K.exams, []);
export function saveExam(exam) {
  const list = loadExams().filter((e) => e.id !== exam.id);
  write(K.exams, [{ ...exam, synced: false }, ...list]);
}
export const examsForPatient = (patientId) =>
  loadExams().filter((e) => e.patientId === patientId).sort((a, b) => b.at.localeCompare(a.at));

// Most recent earlier record of the same body part for this patient.
export function previousRegionRecord(patientId, regionId, beforeIso) {
  for (const e of examsForPatient(patientId)) {
    if (beforeIso && e.at >= beforeIso) continue;
    if (e.regions?.[regionId]) return { ...e.regions[regionId], at: e.at };
  }
  return null;
}

/* ── IAD checks (existing history) ── */
export const loadIad = () => read(K.iad, []);

/* ── Doctor contributions queue ── */
export const loadContribs = () => read(K.contrib, []);
export function addContrib(c) {
  const item = { id: uid('c'), createdAt: new Date().toISOString(), synced: false, ...c };
  write(K.contrib, [item, ...loadContribs()]);
  return item;
}

/* ── Sync ── */
const redFlagText = (key) => {
  const [fid, i] = key.split('#');
  return FINDINGS[fid]?.redFlags?.[Number(i)]?.en || key;
};

function examRows(exam, patient) {
  return Object.entries(exam.regions || {}).map(([regionId, r]) => ({
    recordId: `${exam.id}_${regionId}`,
    examId: exam.id,
    type: 'exam',
    patientCode: patient?.code || '',
    ageBand: patient?.ageBand || '',
    sex: patient?.sex || '',
    regionId,
    findings: r.findings.map((f) => `${f.id}:${f.severity}`).join('|') || 'normal',
    redFlags: (r.redFlags || []).map(redFlagText).join(' | '),
    pain: r.pain ?? '',
    urgency: r.urgency,
    change: r.change || '',
    notes: r.notes || '',
    examAt: exam.at,
  }));
}

function iadRows(check) {
  return Object.entries(check.results || {}).map(([zoneId, r]) => ({
    recordId: `${check.id}_${zoneId}`,
    examId: check.id,
    type: `iad-${check.contents}`,
    patientCode: '',
    regionId: `iad:${zoneId}`,
    findings: r.status === 'changed' ? r.changes.join('|') : 'normal',
    urgency: check.level,
    examAt: check.at,
  }));
}

export function pendingCounts() {
  return {
    records: loadExams().filter((e) => !e.synced).length + loadIad().filter((c) => !c.synced).length,
    contributions: loadContribs().filter((c) => !c.synced).length,
  };
}

/** Pushes unsynced exams, IAD checks and contributions. Throws ApiError on failure. */
export async function syncAll(callApi, session) {
  if (!session?.token) return { records: 0, contributions: 0 };
  const patients = Object.fromEntries(loadPatients().map((p) => [p.id, p]));
  const exams = loadExams();
  const iad = loadIad();
  const rows = [
    ...exams.filter((e) => !e.synced).flatMap((e) => examRows(e, patients[e.patientId])),
    ...iad.filter((c) => !c.synced).map((c) => ({ ...c, level: c.level || evaluate(c.results) })).flatMap(iadRows),
  ];
  let records = 0;
  if (rows.length) {
    await callApi('syncRecords', { rows }, session.token);
    records = rows.length;
    write(K.exams, exams.map((e) => ({ ...e, synced: true })));
    write(K.iad, iad.map((c) => ({ ...c, synced: true })));
  }
  let contributions = 0;
  if (session.user?.role === 'doctor') {
    const list = loadContribs();
    const items = list.filter((c) => !c.synced);
    if (items.length) {
      await callApi('submitContributions', { items }, session.token);
      contributions = items.length;
      write(K.contrib, list.map((c) => ({ ...c, synced: true })));
    }
  }
  return { records, contributions };
}

export function download(filename, text, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
