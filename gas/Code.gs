// ══════════════════════════════════════════════════════════════
//  IAD / Body-care tool — Google Apps Script backend (Google Sheets DB)
//  Called ONLY by the Netlify Function (netlify/functions/api.js).
//  Setup: see gas/README.md
// ══════════════════════════════════════════════════════════════

const SHEETS = {
  Users: ['UserID', 'Phone', 'Name', 'Role', 'Specialty', 'Org', 'Hash', 'Salt', 'Status', 'CreatedAt'],
  Records: ['RecordID', 'ExamID', 'Type', 'PatientCode', 'AgeBand', 'Sex', 'RegionID', 'Findings', 'RedFlags',
            'Pain', 'Urgency', 'Change', 'Notes', 'ExamAt', 'AssistantID', 'AssistantName', 'SyncedAt'],
  Contributions: ['ContributionID', 'Type', 'RegionID', 'FindingID', 'Lang', 'Fields', 'Comment', 'Reference',
                  'Urgency', 'DoctorID', 'DoctorName', 'DoctorStatus', 'CreatedAt', 'ReceivedAt', 'Status', 'AdminNote'],
};

/** Run ONCE from the editor: creates the sheets and an API key (shown in the log). */
function setup() {
  ensureSheets_();
  const props = PropertiesService.getScriptProperties();
  let key = props.getProperty('API_KEY');
  if (!key) {
    key = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
    props.setProperty('API_KEY', key);
  }
  Logger.log('GAS_API_KEY for Netlify = ' + key);
}

// ── Entry points ─────────────────────────────────────────────
function doGet(e) {
  const param = (e && e.parameter) ? e.parameter : {};
  return respond_({ ok: true, msg: 'Body-care API ready', ping: !!param.ping });
}

function doPost(e) {
  let body = {};
  try { body = JSON.parse((e && e.postData) ? e.postData.contents : '{}'); }
  catch (_) { return respond_({ ok: false, message: 'INVALID_JSON' }); }

  const key = PropertiesService.getScriptProperties().getProperty('API_KEY');
  if (!key || body.key !== key) return respond_({ ok: false, message: 'BAD_API_KEY' });

  const action = body.action;
  const data = body.data || {};
  try {
    ensureSheets_();
    switch (action) {
      case 'createUser':            return respond_(createUser_(data));
      case 'getUserAuth':           return respond_(getUserAuth_(data));
      case 'listUsers':             return respond_(listUsers_());
      case 'setUserStatus':         return respond_(setUserStatus_(data));
      case 'saveRecords':           return respond_(saveRecords_(data));
      case 'saveContributions':     return respond_(saveContributions_(data));
      case 'listContributions':     return respond_(listContributions_(data));
      case 'setContributionStatus': return respond_(setContributionStatus_(data));
      case 'getInsights':           return respond_(getInsights_());
      case 'getStats':              return respond_(getStats_());
      default:                      return respond_({ ok: false, message: 'UNKNOWN_ACTION' });
    }
  } catch (err) {
    return respond_({ ok: false, message: String(err && err.message || err) });
  }
}

function respond_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ── Sheet helpers ────────────────────────────────────────────
function ensureSheets_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(SHEETS).forEach(function (name) {
    let sh = ss.getSheetByName(name);
    if (!sh) {
      sh = ss.insertSheet(name);
      sh.appendRow(SHEETS[name]);
      sh.setFrozenRows(1);
      sh.getRange(1, 1, 1, SHEETS[name].length).setFontWeight('bold');
    }
  });
}
const sheet_ = (name) => SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);

function rows_(name) {
  const values = sheet_(name).getDataRange().getValues();
  const head = values.shift();
  return values.map(function (r, i) {
    const o = { _row: i + 2 };
    head.forEach(function (h, j) { o[h] = r[j]; });
    return o;
  });
}

// Prevent spreadsheet formula injection from user-entered text.
function safe_(v) {
  const s = v === undefined || v === null ? '' : String(v);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function withLock_(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try { return fn(); } finally { lock.releaseLock(); }
}

// ── Users ────────────────────────────────────────────────────
// Phones are written with a leading apostrophe so Sheets keeps leading zeros.
const phoneOf_ = (v) => String(v === undefined || v === null ? '' : v).replace(/^'/, '').trim();

function createUser_(d) {
  return withLock_(function () {
    const phone = phoneOf_(d.phone);
    if (!phone || !d.hash || !d.salt) return { ok: false, message: 'MISSING_FIELDS' };
    if (rows_('Users').some(function (u) { return phoneOf_(u.Phone) === phone; })) {
      return { ok: false, message: 'PHONE_EXISTS' };
    }
    sheet_('Users').appendRow([d.userId, "'" + phone, safe_(d.name), d.role, safe_(d.specialty), safe_(d.org),
      d.hash, d.salt, d.status, new Date().toISOString()]);
    return { ok: true };
  });
}

function getUserAuth_(d) {
  const phone = phoneOf_(d.phone);
  const u = rows_('Users').find(function (r) { return phoneOf_(r.Phone) === phone; });
  if (!u) return { ok: true, user: null };
  return { ok: true, user: {
    userId: u.UserID, name: u.Name, role: u.Role, status: u.Status, specialty: u.Specialty,
    hash: u.Hash, salt: u.Salt,
  } };
}

function listUsers_() {
  return { ok: true, users: rows_('Users').map(function (u) {
    return { userId: u.UserID, phone: phoneOf_(u.Phone), name: u.Name, role: u.Role, specialty: u.Specialty,
             org: u.Org, status: u.Status, createdAt: u.CreatedAt };
  }) };
}

function setUserStatus_(d) {
  return withLock_(function () {
    const u = rows_('Users').find(function (r) { return r.UserID === d.userId; });
    if (!u) return { ok: false, message: 'NOT_FOUND' };
    sheet_('Users').getRange(u._row, SHEETS.Users.indexOf('Status') + 1).setValue(d.status);
    return { ok: true };
  });
}

// ── Exam records (anonymous patient codes only) ─────────────
function saveRecords_(d) {
  return withLock_(function () {
    const existing = {};
    rows_('Records').forEach(function (r) { existing[r.RecordID] = true; });
    const now = new Date().toISOString();
    const out = [];
    let skipped = 0;
    (d.rows || []).forEach(function (r) {
      if (!r.recordId || existing[r.recordId]) { skipped++; return; }
      existing[r.recordId] = true;
      out.push([r.recordId, r.examId, r.type, safe_(r.patientCode), r.ageBand, r.sex, r.regionId, safe_(r.findings),
        safe_(r.redFlags), r.pain, r.urgency, r.change, safe_(r.notes), r.examAt, d.assistantId, safe_(d.assistantName), now]);
    });
    if (out.length) {
      const sh = sheet_('Records');
      sh.getRange(sh.getLastRow() + 1, 1, out.length, out[0].length).setValues(out);
    }
    return { ok: true, saved: out.length, skipped: skipped };
  });
}

// ── Doctor contributions (knowledge for the next version) ───
function saveContributions_(d) {
  return withLock_(function () {
    const existing = {};
    rows_('Contributions').forEach(function (r) { existing[r.ContributionID] = true; });
    const now = new Date().toISOString();
    const out = [];
    (d.rows || []).forEach(function (c) {
      if (!c.contributionId || existing[c.contributionId]) return;
      existing[c.contributionId] = true;
      out.push([c.contributionId, c.type, c.regionId, c.findingId, c.lang, safe_(c.fields), safe_(c.comment),
        safe_(c.reference), c.urgency, d.doctorId, safe_(d.doctorName), d.doctorStatus, c.createdAt, now, 'new', '']);
    });
    if (out.length) {
      const sh = sheet_('Contributions');
      sh.getRange(sh.getLastRow() + 1, 1, out.length, out[0].length).setValues(out);
    }
    return { ok: true, saved: out.length };
  });
}

function listContributions_(d) {
  const items = rows_('Contributions')
    .filter(function (c) { return !d.doctorId || c.DoctorID === d.doctorId; })
    .map(function (c) {
      let fields = {};
      try { fields = JSON.parse(String(c.Fields || '{}').replace(/^'/, '')); } catch (_) {}
      return { id: c.ContributionID, type: c.Type, regionId: c.RegionID, findingId: c.FindingID, lang: c.Lang,
               fields: fields, comment: c.Comment, reference: c.Reference, urgency: c.Urgency,
               doctorName: c.DoctorName, doctorStatus: c.DoctorStatus, createdAt: c.CreatedAt,
               status: c.Status, adminNote: c.AdminNote };
    });
  return { ok: true, items: items.reverse() };
}

function setContributionStatus_(d) {
  return withLock_(function () {
    const c = rows_('Contributions').find(function (r) { return r.ContributionID === d.id; });
    if (!c) return { ok: false, message: 'NOT_FOUND' };
    const sh = sheet_('Contributions');
    sh.getRange(c._row, SHEETS.Contributions.indexOf('Status') + 1).setValue(d.status);
    sh.getRange(c._row, SHEETS.Contributions.indexOf('AdminNote') + 1).setValue(safe_(d.note || ''));
    return { ok: true };
  });
}

// ── Aggregated, anonymous insights ──────────────────────────
function getInsights_() {
  const byRegion = {};
  rows_('Records').forEach(function (r) {
    const reg = r.RegionID;
    if (!reg) return;
    const o = byRegion[reg] || (byRegion[reg] = { records: 0, findings: {}, urgency: {} });
    o.records++;
    o.urgency[r.Urgency] = (o.urgency[r.Urgency] || 0) + 1;
    String(r.Findings || '').split('|').forEach(function (f) {
      const id = f.split(':')[0];
      if (id) o.findings[id] = (o.findings[id] || 0) + 1;
    });
  });
  return { ok: true, insights: byRegion };
}

function getStats_() {
  const count = function (n) { return Math.max(0, sheet_(n).getLastRow() - 1); };
  return { ok: true, stats: {
    users: count('Users'), records: count('Records'), contributions: count('Contributions'),
    timestamp: new Date().toISOString(),
  } };
}
