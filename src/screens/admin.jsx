import { useCallback, useEffect, useState } from 'react';
import { FINDINGS, regionById } from '../data/knowledge.js';
import { callApi } from '../lib/api.js';
import { download } from '../lib/store.js';
import { errText } from './account.jsx';

const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

/** Settings admin (password checked only in the Netlify Function). Token is kept in memory only. */
export function AdminScreen({ t, lang }) {
  const [token, setToken] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [status, setStatus] = useState(null);
  const [users, setUsers] = useState([]);
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('new');

  const load = useCallback(async (tk) => {
    setErr('');
    try {
      setStatus(await callApi('adminStatus', {}, tk));
    } catch (e) {
      setErr(errText(t, e.code));
    }
    try {
      setUsers((await callApi('adminUsers', {}, tk)).users);
      setItems((await callApi('adminContributions', {}, tk)).items);
    } catch {
      /* database not configured yet — status card explains */
    }
  }, [t]);

  useEffect(() => {
    if (token) load(token);
  }, [token, load]);

  if (!token) {
    return (
      <main className="page narrow">
        <h1>{t('adminTitle')}</h1>
        <form className="form-card" onSubmit={async (e) => {
          e.preventDefault();
          setErr('');
          try {
            const r = await callApi('adminLogin', { password: pw });
            setPw('');
            setToken(r.token);
          } catch (ex) {
            setErr(errText(t, ex.code));
          }
        }}>
          <label className="field">
            <span>{t('adminPassword')}</span>
            <input type="password" required value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" dir="ltr" />
          </label>
          {err && <p className="error" role="alert">{err}</p>}
          <button className="btn primary" type="submit">{t('adminEnter')}</button>
        </form>
      </main>
    );
  }

  const setUserStatus = async (userId, s) => {
    await callApi('adminSetUserStatus', { userId, status: s }, token).catch((e) => setErr(errText(t, e.code)));
    load(token);
  };
  const setItemStatus = async (id, s) => {
    await callApi('adminSetContributionStatus', { id, status: s }, token).catch((e) => setErr(errText(t, e.code)));
    load(token);
  };
  const shown = items.filter((c) => filter === 'all' || c.status === filter);

  const exportCsv = () => {
    const head = ['id', 'status', 'type', 'region', 'finding', 'lang', 'name', 'lookFor', 'earlyCare', 'treatment', 'redFlags', 'urgency', 'reference', 'comment', 'doctor', 'doctorStatus', 'createdAt'];
    const rows = items.map((c) => [c.id, c.status, c.type, c.regionId, c.findingId, c.lang, c.fields?.name, c.fields?.lookFor,
      (c.fields?.earlyCare || []).join(' / '), (c.fields?.treatment || []).join(' / '), (c.fields?.redFlags || []).join(' / '),
      c.urgency, c.reference, c.comment, c.doctorName, c.doctorStatus, c.createdAt]);
    download('doctor-contributions.csv', '﻿' + [head, ...rows].map((r) => r.map(csvCell).join(',')).join('\n'), 'text/csv');
  };

  return (
    <main className="page">
      <div className="region-head">
        <h1>{t('adminTitle')}</h1>
        <button className="btn ghost small" onClick={() => load(token)}>⟳ {t('refresh')}</button>
      </div>
      {err && <p className="error" role="alert">{err}</p>}

      <section className="form-card">
        <h2>{t('systemStatus')}</h2>
        {status && (
          <ul className="status-list">
            {Object.entries(status.env).map(([k, v]) => (
              <li key={k}><span className={`dot ${v ? 'same' : 'changed'}`} /> {k}</li>
            ))}
            <li>
              <span className={`dot ${status.database.ok ? 'same' : 'changed'}`} /> Firestore:{' '}
              {status.database.ok
                ? `${status.database.stats.users} ${t('users')} · ${status.database.stats.records} records · ${status.database.stats.contributions} ${t('contributions')}`
                : status.database.message || '—'}
            </li>
          </ul>
        )}
      </section>

      <section className="form-card">
        <h2>{t('users')} ({users.length})</h2>
        <div className="table-wrap">
          <table className="table">
            <tbody>
              {users.map((u) => (
                <tr key={u.userId}>
                  <td><strong>{u.name}</strong><br /><span className="muted" dir="ltr">{u.phone}</span></td>
                  <td>{t(u.role === 'doctor' ? 'roleDoctor' : 'roleAssistant')}{u.specialty ? ` · ${u.specialty}` : ''}<br /><span className="muted">{u.org}</span></td>
                  <td><span className={`tag st-${u.status}`}>{t(`status_${u.status}`)}</span></td>
                  <td className="row-actions">
                    {u.status === 'pending' && <button className="btn ghost small" onClick={() => setUserStatus(u.userId, 'active')}>{t('verify')}</button>}
                    {u.status !== 'disabled'
                      ? <button className="btn ghost small" onClick={() => setUserStatus(u.userId, 'disabled')}>{t('disable')}</button>
                      : <button className="btn ghost small" onClick={() => setUserStatus(u.userId, 'active')}>{t('enable')}</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="form-card">
        <div className="region-head">
          <h2>{t('contributions')} ({items.length})</h2>
          <div className="seg small">
            {['new', 'accepted', 'rejected', 'all'].map((s) => (
              <button key={s} className={filter === s ? 'on' : ''} onClick={() => setFilter(s)}>{s === 'all' ? '∗' : t(`status_${s}`)}</button>
            ))}
          </div>
        </div>
        <div className="actions">
          <button className="btn ghost small" onClick={() => download('doctor-contributions.json', JSON.stringify(items, null, 2))}>⬇ {t('exportJson')}</button>
          <button className="btn ghost small" onClick={exportCsv}>⬇ {t('exportCsv')}</button>
        </div>
        <ul className="contrib-admin">
          {shown.map((c) => (
            <li key={c.id}>
              <p>
                <span className={`tag st-${c.status}`}>{t(`status_${c.status}`)}</span>{' '}
                <strong>{c.type}</strong> · {regionById(c.regionId)?.name[lang] || c.regionId}
                {c.findingId && ` · ${FINDINGS[c.findingId]?.label[lang] || c.findingId}`}
                {c.fields?.name && ` · ${c.fields.name}`}
              </p>
              <p className="muted">{c.doctorName} ({t(`status_${c.doctorStatus || 'pending'}`)}) · {c.createdAt?.slice(0, 16).replace('T', ' ')} · {c.lang}</p>
              {c.fields?.lookFor && <p><b>{t('lookFor')}:</b> {c.fields.lookFor}</p>}
              {['earlyCare', 'treatment', 'redFlags'].map((k) => c.fields?.[k]?.length ? (
                <p key={k}><b>{t(k === 'earlyCare' ? 'earlyCare' : k === 'treatment' ? 'simpleTreatment' : 'whenRefer')}:</b> {c.fields[k].join(' · ')}</p>
              ) : null)}
              {c.urgency && <p><b>{t('docUrgency')}:</b> {t(`urg_${c.urgency}`)}</p>}
              {c.comment && <p>💬 {c.comment}</p>}
              {c.reference && <p className="muted">📚 {c.reference}</p>}
              <div className="row-actions">
                <button className="btn ghost small" onClick={() => setItemStatus(c.id, 'accepted')}>✓ {t('accept')}</button>
                <button className="btn ghost small" onClick={() => setItemStatus(c.id, 'rejected')}>✕ {t('reject')}</button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
