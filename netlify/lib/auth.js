'use strict';
const crypto = require('crypto');
const { get, create, update } = require('./db');

const SECRET = process.env.SETTINGS_SESSION_SECRET || '';
const ITER = 120000;

const normPhone = (p) => String(p || '').replace(/[^\d+]/g, '').replace(/^00/, '+');
const b64url = (b) => Buffer.from(b).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

function hash(password, salt) {
  return new Promise((res, rej) =>
    crypto.pbkdf2(String(password), salt, ITER, 64, 'sha512', (e, k) => (e ? rej(e) : res(k.toString('hex')))));
}
function safeEq(a, b) {
  const A = Buffer.from(a, 'hex'), B = Buffer.from(b, 'hex');
  return A.length === B.length && crypto.timingSafeEqual(A, B);
}

function signJwt(payload, hours = 8) {
  const t = Math.floor(Date.now() / 1000);
  const h = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const b = b64url(JSON.stringify({ ...payload, iat: t, exp: t + hours * 3600 }));
  const s = b64url(crypto.createHmac('sha256', SECRET).update(`${h}.${b}`).digest());
  return `${h}.${b}.${s}`;
}
function verifyJwt(token) {
  try {
    const [h, b, s] = String(token || '').split('.');
    const exp = b64url(crypto.createHmac('sha256', SECRET).update(`${h}.${b}`).digest());
    if (!s || s.length !== exp.length || !crypto.timingSafeEqual(Buffer.from(s), Buffer.from(exp))) return null;
    const p = JSON.parse(Buffer.from(b.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString());
    return p.exp > Math.floor(Date.now() / 1000) ? p : null;
  } catch { return null; }
}

const publicUser = (u) => ({ id: u.id, phone: u.phone, name: u.name, role: u.role });

async function register({ phone, password, name }) {
  phone = normPhone(phone);
  if (!phone || !password || !name) return { ok: false, code: 'MISSING_FIELDS' };
  if (String(password).length < 6) return { ok: false, code: 'WEAK_PASSWORD' };
  const salt = crypto.randomBytes(16).toString('hex');
  try {
    const u = await create('users', { phone, name: String(name).trim(), role: 'user', active: true, salt, passwordHash: await hash(password, salt) }, phone);
    return { ok: true, token: signJwt({ sub: u.id, role: u.role }), user: publicUser(u) };
  } catch (e) {
    if (e.code === 6) return { ok: false, code: 'PHONE_EXISTS' };
    throw e;
  }
}

async function login({ phone, password }) {
  const u = await get('users', normPhone(phone));
  if (!u || !u.active || u.deleted) return { ok: false, code: 'INVALID_CREDENTIALS' };
  if (!safeEq(await hash(password, u.salt), u.passwordHash)) return { ok: false, code: 'INVALID_CREDENTIALS' };
  await update('users', u.id, { lastLoginAt: new Date().toISOString() });
  return { ok: true, token: signJwt({ sub: u.id, role: u.role }), user: publicUser(u) };
}

// يُرجع payload أو null — role 'settings_admin' يأتي من adminLogin (env فقط)
function auth(event, roles = null) {
  const h = event.headers.authorization || event.headers.Authorization || '';
  const p = verifyJwt(h.replace(/^Bearer\s+/i, ''));
  if (!p) return null;
  if (roles && !roles.includes(p.role)) return null;
  return p;
}

module.exports = { register, login, auth, signJwt, verifyJwt, hash, safeEq, normPhone };
