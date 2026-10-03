// IAD / Body-care API — auth + proxy to Google Apps Script (Google Sheets as the database).
// Architecture (see react-netlify-gas methodology):
//   • User passwords: PBKDF2 here; GAS only stores hash + salt.
//   • Settings admin: verified here only, from env — never stored in Sheets / sent to GAS.
//   • GAS calls use text/plain (no CORS preflight) and carry GAS_API_KEY.
import crypto from 'node:crypto';

const SECRET = process.env.SETTINGS_SESSION_SECRET || '';
const ALLOWED = process.env.ALLOWED_ORIGIN || '';
const GAS_KEY = process.env.GAS_API_KEY || '';
const USER_PEPPER = process.env.USER_PEPPER || '';
const PBKDF2_ITER = 120000;
let GAS_URL = (process.env.APPS_SCRIPT_URL || '').trim();

/* ───────── helpers ───────── */
const json = (status, body) => ({ statusCode: status, body: JSON.stringify(body) });
const ok = (body = {}) => json(200, { ok: true, ...body });
const fail = (code, message = '', status = 400) => json(status, { ok: false, code, message });

function b64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function signJwt(payload, hours = 12) {
  const now = Math.floor(Date.now() / 1000);
  const h = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const b = b64url(JSON.stringify({ ...payload, iat: now, exp: now + hours * 3600 }));
  const s = b64url(crypto.createHmac('sha256', SECRET).update(`${h}.${b}`).digest());
  return `${h}.${b}.${s}`;
}
function verifyJwt(token) {
  try {
    if (!SECRET || !token) return null;
    const [h, b, s] = token.split('.');
    const expected = b64url(crypto.createHmac('sha256', SECRET).update(`${h}.${b}`).digest());
    if (!s || s.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(s), Buffer.from(expected))) return null;
    const payload = JSON.parse(Buffer.from(b.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString());
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}
const pbkdf2 = (password, salt, pepper) =>
  new Promise((res, rej) =>
    crypto.pbkdf2(pepper + password, salt, PBKDF2_ITER, 64, 'sha512', (e, d) => (e ? rej(e) : res(d.toString('hex'))))
  );
function safeEqualHex(a, b) {
  const x = Buffer.from(a || '', 'hex'), y = Buffer.from(b || '', 'hex');
  return x.length === y.length && x.length > 0 && crypto.timingSafeEqual(x, y);
}
const clean = (v, max = 200) => String(v ?? '').trim().slice(0, max);
const normPhone = (p) => clean(p, 30).replace(/[^\d+]/g, '');

/* ───────── Google Apps Script ───────── */
async function callGas(action, data = {}) {
  if (!GAS_URL) throw Object.assign(new Error('GAS_URL_NOT_SET'), { code: 503 });
  const r = await fetch(GAS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, data, key: GAS_KEY }),
    redirect: 'follow',
    signal: AbortSignal.timeout(25000),
  });
  if (r.status === 404) throw Object.assign(new Error('GAS_DEPLOYMENT_NOT_FOUND'), { code: 502 });
  if (!r.ok) throw Object.assign(new Error(`GAS_HTTP_${r.status}`), { code: 502 });
  const out = await r.json().catch(() => null);
  if (!out) throw Object.assign(new Error('GAS_BAD_RESPONSE'), { code: 502 });
  return out;
}

/* ───────── auth guards ───────── */
function bearer(event) {
  const h = event.headers.authorization || event.headers.Authorization || '';
  return h.startsWith('Bearer ') ? h.slice(7) : '';
}
const isAdmin = (u) => u && u.role === 'settings_admin';

/* ───────── actions ───────── */
const ROLES = ['assistant', 'doctor'];

async function register(d) {
  const phone = normPhone(d.phone);
  const password = String(d.password || '');
  const name = clean(d.name, 80);
  const role = ROLES.includes(d.role) ? d.role : 'assistant';
  if (!phone || phone.length < 6 || !name) return fail('MISSING_FIELDS', 'phone and name required');
  if (password.length < 6) return fail('WEAK_PASSWORD', 'password must be at least 6 characters');
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = await pbkdf2(password, salt, USER_PEPPER);
  const userId = crypto.randomUUID();
  // Doctors start "pending" until the settings admin verifies them.
  const status = role === 'doctor' ? 'pending' : 'active';
  const res = await callGas('createUser', {
    userId, phone, name, role, status, hash, salt,
    specialty: clean(d.specialty, 80), org: clean(d.org, 120),
  });
  if (!res.ok) return fail(res.message || 'REGISTER_FAILED', '', res.message === 'PHONE_EXISTS' ? 409 : 400);
  const user = { userId, name, role, status };
  return ok({ token: signJwt({ sub: userId, name, role, status }), user });
}

async function login(d) {
  const phone = normPhone(d.phone);
  const password = String(d.password || '');
  if (!phone || !password) return fail('MISSING_FIELDS');
  const res = await callGas('getUserAuth', { phone });
  // Same response for unknown phone and wrong password.
  if (!res.ok || !res.user) {
    await pbkdf2(password, 'x', USER_PEPPER);
    return fail('INVALID_LOGIN', '', 401);
  }
  const u = res.user;
  const hash = await pbkdf2(password, u.salt, USER_PEPPER);
  if (!safeEqualHex(hash, u.hash)) return fail('INVALID_LOGIN', '', 401);
  if (u.status === 'disabled') return fail('ACCOUNT_DISABLED', '', 403);
  const user = { userId: u.userId, name: u.name, role: u.role, status: u.status, specialty: u.specialty };
  return ok({ token: signJwt({ sub: u.userId, name: u.name, role: u.role, status: u.status }), user });
}

async function syncRecords(user, d) {
  const rows = Array.isArray(d.rows) ? d.rows.slice(0, 500) : [];
  const safe = rows.map((r) => ({
    recordId: clean(r.recordId, 80), examId: clean(r.examId, 60), type: clean(r.type, 20),
    patientCode: clean(r.patientCode, 40), ageBand: clean(r.ageBand, 20), sex: clean(r.sex, 10),
    regionId: clean(r.regionId, 40), findings: clean(r.findings, 500), redFlags: clean(r.redFlags, 1000),
    pain: clean(r.pain, 4), urgency: clean(r.urgency, 12), change: clean(r.change, 12),
    notes: clean(r.notes, 1000), examAt: clean(r.examAt, 40),
  })).filter((r) => r.recordId);
  const res = await callGas('saveRecords', { rows: safe, assistantId: user.sub, assistantName: user.name });
  return res.ok ? ok({ saved: res.saved, skipped: res.skipped }) : fail(res.message || 'SYNC_FAILED');
}

async function submitContributions(user, d) {
  if (user.role !== 'doctor') return fail('FORBIDDEN', 'doctor account required', 403);
  const items = Array.isArray(d.items) ? d.items.slice(0, 100) : [];
  const rows = items.map((c) => ({
    contributionId: clean(c.id, 60), type: clean(c.type, 20), regionId: clean(c.regionId, 40),
    findingId: clean(c.findingId, 60), lang: clean(c.lang, 5),
    fields: clean(JSON.stringify(c.fields || {}), 8000), comment: clean(c.comment, 2000),
    reference: clean(c.reference, 500), urgency: clean(c.urgency, 12), createdAt: clean(c.createdAt, 40),
  })).filter((r) => r.contributionId && r.type);
  const res = await callGas('saveContributions', {
    rows, doctorId: user.sub, doctorName: user.name, doctorStatus: user.status,
  });
  return res.ok ? ok({ saved: res.saved }) : fail(res.message || 'SUBMIT_FAILED');
}

async function adminLogin(d) {
  const hash = process.env.SETTINGS_ADMIN_PASSWORD_HASH || '';
  const salt = process.env.SETTINGS_ADMIN_PASSWORD_SALT || '';
  const pepper = process.env.SETTINGS_ADMIN_PEPPER || '';
  if (!hash || !salt || !SECRET) return fail('ADMIN_NOT_CONFIGURED', '', 500);
  const input = await pbkdf2(String(d.password || ''), salt, pepper);
  if (!safeEqualHex(input, hash)) return fail('INVALID_PASSWORD', '', 401);
  return ok({ token: signJwt({ role: 'settings_admin', sub: 'admin', name: 'Admin' }, 4) });
}

// Saves APPS_SCRIPT_URL into the site's Netlify environment (needs NETLIFY_ACCESS_TOKEN).
// The new value is used immediately by this warm function and by every function after the next deploy.
async function updateGasUrl(d) {
  const url = clean(d.url, 300);
  if (!url.startsWith('https://script.google.com/macros/s/') || !url.endsWith('/exec')) {
    return fail('INVALID_GAS_URL', 'Must be an Apps Script /exec URL');
  }
  GAS_URL = url;
  const token = process.env.NETLIFY_ACCESS_TOKEN || '';
  const siteId = process.env.NETLIFY_SITE_ID || process.env.SITE_ID || '';
  if (!token || !siteId) return ok({ saved: 'memory_only' });
  const api = 'https://api.netlify.com/api/v1';
  const auth = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  try {
    const site = await fetch(`${api}/sites/${siteId}`, { headers: auth, signal: AbortSignal.timeout(10000) }).then((r) => r.json());
    const account = site.account_id || site.account_slug;
    let r = await fetch(`${api}/accounts/${account}/env/APPS_SCRIPT_URL?site_id=${siteId}`, {
      method: 'PATCH', headers: auth, body: JSON.stringify({ context: 'all', value: url }), signal: AbortSignal.timeout(10000),
    });
    if (r.status === 404) {
      r = await fetch(`${api}/accounts/${account}/env?site_id=${siteId}`, {
        method: 'POST', headers: auth, signal: AbortSignal.timeout(10000),
        body: JSON.stringify([{ key: 'APPS_SCRIPT_URL', scopes: ['functions'], values: [{ value: url, context: 'all' }] }]),
      });
    }
    return r.ok ? ok({ saved: 'netlify_env' }) : ok({ saved: 'memory_only', warn: `NETLIFY_API_${r.status}` });
  } catch {
    return ok({ saved: 'memory_only', warn: 'NETLIFY_API_ERROR' });
  }
}

async function systemStatus() {
  let gas = { urlSet: !!GAS_URL, ok: false };
  if (GAS_URL) {
    try {
      const r = await callGas('getStats', {});
      gas = { urlSet: true, ok: !!r.ok, stats: r.stats || null, message: r.ok ? '' : r.message };
    } catch (e) {
      gas = { urlSet: true, ok: false, message: e.message };
    }
  }
  return ok({
    gas,
    env: {
      SETTINGS_SESSION_SECRET: !!SECRET,
      SETTINGS_ADMIN_PASSWORD_HASH: !!process.env.SETTINGS_ADMIN_PASSWORD_HASH,
      GAS_API_KEY: !!GAS_KEY,
      APPS_SCRIPT_URL: !!GAS_URL,
      NETLIFY_ACCESS_TOKEN: !!process.env.NETLIFY_ACCESS_TOKEN,
    },
  });
}

/* ───────── handler ───────── */
export const handler = async (event) => {
  const origin = event.headers.origin || event.headers.Origin || '';
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    ...(ALLOWED && origin === ALLOWED
      ? { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
      : {}),
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return { ...fail('METHOD_NOT_ALLOWED', '', 405), headers };

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { ...fail('INVALID_JSON'), headers };
  }
  const { action, data = {} } = body;
  const user = verifyJwt(bearer(event));

  let result;
  try {
    switch (action) {
      case 'health':
        result = ok({ configured: !!(SECRET && GAS_URL) });
        break;
      case 'register':
        result = SECRET ? await register(data) : fail('NOT_CONFIGURED', '', 503);
        break;
      case 'login':
        result = SECRET ? await login(data) : fail('NOT_CONFIGURED', '', 503);
        break;
      case 'me':
        result = user && !isAdmin(user) ? ok({ user: { userId: user.sub, name: user.name, role: user.role, status: user.status } }) : fail('UNAUTHORIZED', '', 401);
        break;
      case 'syncRecords':
        result = user && !isAdmin(user) ? await syncRecords(user, data) : fail('UNAUTHORIZED', '', 401);
        break;
      case 'submitContributions':
        result = user ? await submitContributions(user, data) : fail('UNAUTHORIZED', '', 401);
        break;
      case 'myContributions': {
        if (!user || user.role !== 'doctor') { result = fail('FORBIDDEN', '', 403); break; }
        const r = await callGas('listContributions', { doctorId: user.sub });
        result = r.ok ? ok({ items: r.items }) : fail(r.message);
        break;
      }
      case 'insights': {
        // Anonymous, aggregated finding counts per region — for doctors and admin.
        if (!user || !(user.role === 'doctor' || isAdmin(user))) { result = fail('FORBIDDEN', '', 403); break; }
        const r = await callGas('getInsights', {});
        result = r.ok ? ok({ insights: r.insights }) : fail(r.message);
        break;
      }
      case 'adminLogin':
        result = await adminLogin(data);
        break;
      case 'adminStatus':
        result = isAdmin(user) ? await systemStatus() : fail('FORBIDDEN', '', 403);
        break;
      case 'adminUsers': {
        if (!isAdmin(user)) { result = fail('FORBIDDEN', '', 403); break; }
        const r = await callGas('listUsers', {});
        result = r.ok ? ok({ users: r.users }) : fail(r.message);
        break;
      }
      case 'adminSetUserStatus': {
        if (!isAdmin(user)) { result = fail('FORBIDDEN', '', 403); break; }
        const status = ['active', 'pending', 'disabled'].includes(data.status) ? data.status : null;
        if (!status) { result = fail('BAD_STATUS'); break; }
        const r = await callGas('setUserStatus', { userId: clean(data.userId, 60), status });
        result = r.ok ? ok() : fail(r.message);
        break;
      }
      case 'adminContributions': {
        if (!isAdmin(user)) { result = fail('FORBIDDEN', '', 403); break; }
        const r = await callGas('listContributions', {});
        result = r.ok ? ok({ items: r.items }) : fail(r.message);
        break;
      }
      case 'adminSetContributionStatus': {
        if (!isAdmin(user)) { result = fail('FORBIDDEN', '', 403); break; }
        const status = ['new', 'accepted', 'rejected'].includes(data.status) ? data.status : null;
        if (!status) { result = fail('BAD_STATUS'); break; }
        const r = await callGas('setContributionStatus', { id: clean(data.id, 60), status, note: clean(data.note, 500) });
        result = r.ok ? ok() : fail(r.message);
        break;
      }
      case 'updateGasUrl':
        result = isAdmin(user) ? await updateGasUrl(data) : fail('FORBIDDEN', '', 403);
        break;
      default:
        result = fail('UNKNOWN_ACTION', String(action));
    }
  } catch (e) {
    // Never echo secrets; only the error code.
    result = fail(e.message || 'SERVER_ERROR', '', e.code && e.code >= 400 ? e.code : 500);
  }
  return { ...result, headers };
};
