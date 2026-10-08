'use strict';
// Body-care / IAD API — Netlify Function over Firestore (apps/<APP_NAMESPACE>/...).
//   • Storage: netlify/lib/db.js (google-dev template). Schema: docs/db-schema.md
//   • Users: PBKDF2 + JWT helpers from netlify/lib/auth.js; roles assistant | doctor.
//   • Settings admin: verified from env only (react-netlify-gas) — never stored in Firestore.
const crypto = require('crypto');
const db = require('../lib/db');
const A = require('../lib/auth');

const SECRET = process.env.SETTINGS_SESSION_SECRET || '';
const ALLOWED = process.env.ALLOWED_ORIGIN || '';
const TOKEN_HOURS = 12;
const ROLES = ['assistant', 'doctor'];

/* ───────── helpers ───────── */
const json = (status, body) => ({ statusCode: status, body: JSON.stringify(body) });
const ok = (body = {}) => json(200, { ok: true, ...body });
const fail = (code, status = 400) => json(status, { ok: false, code });
const clean = (v, max = 200) => String(v ?? '').trim().slice(0, max);
const dbReady = () => !!(process.env.FIRESTORE_PROJECT_ID && process.env.FIRESTORE_PRIVATE_KEY && process.env.APP_NAMESPACE);
const isAdmin = (u) => u && u.role === 'settings_admin';
const publicUser = (u) => ({ userId: u.id, name: u.name, role: u.role, status: u.status, specialty: u.specialty || '' });
const tokenFor = (u) => A.signJwt({ sub: u.id, name: u.name, role: u.role, status: u.status }, TOKEN_HOURS);

/* ───────── users (docId = normalized phone) ───────── */
async function register(d) {
  const phone = A.normPhone(d.phone);
  const password = String(d.password || '');
  const name = clean(d.name, 80);
  const role = ROLES.includes(d.role) ? d.role : 'assistant';
  if (!phone || phone.length < 6 || !name) return fail('MISSING_FIELDS');
  if (password.length < 6) return fail('WEAK_PASSWORD');
  const salt = crypto.randomBytes(16).toString('hex');
  try {
    const u = await db.create('users', {
      phone, name, role,
      status: role === 'doctor' ? 'pending' : 'active', // doctors wait for admin verification
      specialty: clean(d.specialty, 80), org: clean(d.org, 120),
      salt, passwordHash: await A.hash(password, salt),
    }, phone);
    return ok({ token: tokenFor(u), user: publicUser(u) });
  } catch (e) {
    if (e.code === 6) return fail('PHONE_EXISTS', 409);
    throw e;
  }
}

async function login(d) {
  const phone = A.normPhone(d.phone);
  const password = String(d.password || '');
  if (!phone || !password) return fail('MISSING_FIELDS');
  const u = await db.get('users', phone);
  if (!u || u.deleted) {
    await A.hash(password, 'timing-pad'); // same cost for unknown phones
    return fail('INVALID_LOGIN', 401);
  }
  if (!A.safeEq(await A.hash(password, u.salt), u.passwordHash)) return fail('INVALID_LOGIN', 401);
  if (u.status === 'disabled') return fail('ACCOUNT_DISABLED', 403);
  await db.update('users', u.id, { lastLoginAt: db.now() });
  return ok({ token: tokenFor(u), user: publicUser(u) });
}

/* ───────── exam records (anonymous patient codes) ───────── */
async function syncRecords(user, d) {
  const rows = (Array.isArray(d.rows) ? d.rows.slice(0, 400) : [])
    .map((r) => ({
      recordId: clean(r.recordId, 80).replace(/\//g, '_'), examId: clean(r.examId, 60), type: clean(r.type, 20),
      patientCode: clean(r.patientCode, 40), ageBand: clean(r.ageBand, 20), sex: clean(r.sex, 10),
      regionId: clean(r.regionId, 40), findings: clean(r.findings, 500), redFlags: clean(r.redFlags, 1000),
      pain: clean(r.pain, 4), urgency: clean(r.urgency, 12), change: clean(r.change, 12),
      notes: clean(r.notes, 1000), examAt: clean(r.examAt, 40),
    }))
    .filter((r) => r.recordId);
  if (!rows.length) return ok({ saved: 0, skipped: 0 });

  // Skip records already stored (sync is retried safely).
  const fs = db.getDb();
  const refs = rows.map((r) => db.col('records').doc(r.recordId));
  const existing = new Set((await fs.getAll(...refs)).filter((s) => s.exists).map((s) => s.id));
  const fresh = rows.filter((r) => !existing.has(r.recordId));

  // Write records + anonymous per-region counters (used by the doctor tool).
  const batch = fs.batch();
  const counters = {};
  for (const r of fresh) {
    batch.set(db.col('records').doc(r.recordId), {
      ...r, assistantId: user.sub, assistantName: user.name,
      createdAt: db.now(), updatedAt: db.now(), deleted: false,
    });
    if (!r.regionId || r.regionId.startsWith('iad:')) continue;
    const c = (counters[r.regionId] ||= { records: 0, findings: {}, urgency: {} });
    c.records++;
    c.urgency[r.urgency] = (c.urgency[r.urgency] || 0) + 1;
    for (const f of r.findings.split('|')) {
      const id = f.split(':')[0];
      if (id && id !== 'normal') c.findings[id] = (c.findings[id] || 0) + 1;
    }
  }
  for (const [regionId, c] of Object.entries(counters)) {
    const data = { records: db.FieldValue.increment(c.records), updatedAt: db.now() };
    for (const [k, n] of Object.entries(c.findings)) data[`findings.${k}`] = db.FieldValue.increment(n);
    for (const [k, n] of Object.entries(c.urgency)) data[`urgency.${k}`] = db.FieldValue.increment(n);
    // update() with dotted paths needs the doc to exist, so seed it first with merge.
    batch.set(db.col('insights').doc(regionId), { regionId }, { merge: true });
    batch.update(db.col('insights').doc(regionId), data);
  }
  if (fresh.length) await batch.commit();
  return ok({ saved: fresh.length, skipped: rows.length - fresh.length });
}

async function insights() {
  const snap = await db.col('insights').get();
  const out = {};
  snap.forEach((d) => {
    const v = d.data();
    out[d.id] = { records: v.records || 0, findings: v.findings || {}, urgency: v.urgency || {} };
  });
  return ok({ insights: out });
}

/* ───────── doctor contributions (input for the next version) ───────── */
async function submitContributions(user, d) {
  if (user.role !== 'doctor') return fail('FORBIDDEN', 403);
  const items = (Array.isArray(d.items) ? d.items.slice(0, 100) : [])
    .map((c) => ({
      id: clean(c.id, 60).replace(/\//g, '_'), type: clean(c.type, 20), regionId: clean(c.regionId, 40),
      findingId: clean(c.findingId, 60), lang: clean(c.lang, 5),
      fields: sanitizeFields(c.fields), comment: clean(c.comment, 2000),
      reference: clean(c.reference, 500), urgency: clean(c.urgency, 12), submittedAt: clean(c.createdAt, 40),
    }))
    .filter((c) => c.id && ['approve', 'edit', 'new', 'comment'].includes(c.type));
  if (!items.length) return ok({ saved: 0 });
  const fs = db.getDb();
  const refs = items.map((c) => db.col('contributions').doc(c.id));
  const existing = new Set((await fs.getAll(...refs)).filter((s) => s.exists).map((s) => s.id));
  const batch = fs.batch();
  let saved = 0;
  for (const c of items) {
    if (existing.has(c.id)) continue;
    const { id, ...rest } = c;
    batch.set(db.col('contributions').doc(id), {
      ...rest, doctorId: user.sub, doctorName: user.name, doctorStatus: user.status,
      status: 'new', adminNote: '', createdAt: db.now(), updatedAt: db.now(), deleted: false,
    });
    saved++;
  }
  if (saved) await batch.commit();
  return ok({ saved });
}

function sanitizeFields(f) {
  if (!f || typeof f !== 'object') return {};
  const list = (v) => (Array.isArray(v) ? v.slice(0, 20).map((x) => clean(x, 400)).filter(Boolean) : []);
  return {
    name: clean(f.name, 120), lookFor: clean(f.lookFor, 600),
    earlyCare: list(f.earlyCare), treatment: list(f.treatment), redFlags: list(f.redFlags),
  };
}

async function listContributions(doctorId) {
  // Equality filters only (no composite index needed); newest first in memory.
  let q = db.col('contributions').where('deleted', '==', false);
  if (doctorId) q = q.where('doctorId', '==', doctorId);
  const snap = await q.limit(1000).get();
  const items = snap.docs.map((s) => ({ id: s.id, ...s.data() }));
  items.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  return items;
}

/* ───────── settings admin (env only) ───────── */
async function adminLogin(d) {
  const hash = process.env.SETTINGS_ADMIN_PASSWORD_HASH || '';
  const salt = process.env.SETTINGS_ADMIN_PASSWORD_SALT || '';
  const pepper = process.env.SETTINGS_ADMIN_PEPPER || '';
  if (!hash || !salt || !SECRET) return fail('ADMIN_NOT_CONFIGURED', 500);
  const input = await A.hash(pepper + String(d.password || ''), salt);
  if (!A.safeEq(input, hash)) return fail('INVALID_PASSWORD', 401);
  return ok({ token: A.signJwt({ role: 'settings_admin', sub: 'admin', name: 'Admin' }, 4) });
}

async function adminStatus() {
  let database = { ok: false };
  if (dbReady()) {
    try {
      const [users, records, contributions] = await Promise.all(['users', 'records', 'contributions'].map((c) => db.count(c)));
      database = { ok: true, stats: { users, records, contributions } };
    } catch (e) {
      database = { ok: false, message: e.code ? `FIRESTORE_${e.code}` : 'FIRESTORE_ERROR' };
    }
  }
  return ok({
    database,
    env: {
      SETTINGS_SESSION_SECRET: !!SECRET,
      SETTINGS_ADMIN_PASSWORD_HASH: !!process.env.SETTINGS_ADMIN_PASSWORD_HASH,
      FIRESTORE: dbReady(),
      APP_NAMESPACE: process.env.APP_NAMESPACE || '',
    },
  });
}

async function adminUsers() {
  const snap = await db.col('users').where('deleted', '==', false).limit(1000).get();
  const users = snap.docs.map((s) => {
    const u = s.data();
    return { userId: s.id, phone: u.phone, name: u.name, role: u.role, specialty: u.specialty, org: u.org, status: u.status, createdAt: u.createdAt };
  });
  users.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  return ok({ users });
}

/* ───────── handler ───────── */
exports.handler = async (event) => {
  const origin = event.headers.origin || event.headers.Origin || '';
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    ...(ALLOWED && origin === ALLOWED
      ? { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
      : {}),
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return { ...fail('METHOD_NOT_ALLOWED', 405), headers };

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { ...fail('INVALID_JSON'), headers };
  }
  const { action, data = {} } = body;
  const user = A.auth(event);
  const member = user && !isAdmin(user) ? user : null;
  const needsDb = !['health', 'adminLogin'].includes(action);

  let result;
  try {
    if (needsDb && (!SECRET || !dbReady())) {
      result = fail('NOT_CONFIGURED', 503);
    } else {
      switch (action) {
        case 'health':
          result = ok({ configured: !!SECRET && dbReady() });
          break;
        case 'register':
          result = await register(data);
          break;
        case 'login':
          result = await login(data);
          break;
        case 'me':
          result = member ? ok({ user: { userId: member.sub, name: member.name, role: member.role, status: member.status } }) : fail('UNAUTHORIZED', 401);
          break;
        case 'syncRecords':
          result = member ? await syncRecords(member, data) : fail('UNAUTHORIZED', 401);
          break;
        case 'submitContributions':
          result = member ? await submitContributions(member, data) : fail('UNAUTHORIZED', 401);
          break;
        case 'myContributions':
          result = member?.role === 'doctor' ? ok({ items: await listContributions(member.sub) }) : fail('FORBIDDEN', 403);
          break;
        case 'insights':
          result = member?.role === 'doctor' || isAdmin(user) ? await insights() : fail('FORBIDDEN', 403);
          break;
        case 'adminLogin':
          result = await adminLogin(data);
          break;
        case 'adminStatus':
          result = isAdmin(user) ? await adminStatus() : fail('FORBIDDEN', 403);
          break;
        case 'adminUsers':
          result = isAdmin(user) ? await adminUsers() : fail('FORBIDDEN', 403);
          break;
        case 'adminSetUserStatus': {
          if (!isAdmin(user)) { result = fail('FORBIDDEN', 403); break; }
          if (!['active', 'pending', 'disabled'].includes(data.status)) { result = fail('BAD_STATUS'); break; }
          await db.update('users', clean(data.userId, 40), { status: data.status });
          result = ok();
          break;
        }
        case 'adminContributions':
          result = isAdmin(user) ? ok({ items: await listContributions(null) }) : fail('FORBIDDEN', 403);
          break;
        case 'adminSetContributionStatus': {
          if (!isAdmin(user)) { result = fail('FORBIDDEN', 403); break; }
          if (!['new', 'accepted', 'rejected'].includes(data.status)) { result = fail('BAD_STATUS'); break; }
          await db.update('contributions', clean(data.id, 60), { status: data.status, adminNote: clean(data.note, 500) });
          result = ok();
          break;
        }
        default:
          result = fail('UNKNOWN_ACTION');
      }
    }
  } catch (e) {
    console.error('API_ERROR', action, e.code, e.message); // never log data or secrets
    result = e.code === 5 ? fail('NOT_FOUND', 404) : fail('SERVER_ERROR', 500);
  }
  return { ...result, headers };
};
