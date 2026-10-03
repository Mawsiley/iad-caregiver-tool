import { useEffect, useState } from 'react';
import Body3D from '../components/Body3D.jsx';
import { FINDINGS, URGENCY_ORDER, regionById } from '../data/knowledge.js';
import { callApi } from '../lib/api.js';
import { addContrib, download, loadContribs } from '../lib/store.js';
import { ViewToggle } from './iad.jsx';

const lines = (list, lang) => list.map((x) => x[lang]).join('\n');
const split = (s) => s.split('\n').map((x) => x.trim()).filter(Boolean);

/** Development tool: doctors review the knowledge base and send input for the next version. */
export function DoctorTool({ t, lang, auth, onAccount }) {
  const [selected, setSelected] = useState(null);
  const [view, setView] = useState('front');
  const [nonce, setNonce] = useState(0);
  const [contribs, setContribs] = useState(loadContribs);
  const [insights, setInsights] = useState(null);
  const [msg, setMsg] = useState('');
  const user = auth.session?.user;
  const isDoctor = user?.role === 'doctor';

  useEffect(() => {
    if (!isDoctor) return;
    callApi('insights', {}, auth.session.token).then((r) => setInsights(r.insights), () => {});
  }, [isDoctor, auth.session]);

  const submit = async (c) => {
    addContrib({ ...c, lang });
    setContribs(loadContribs());
    setMsg(t('docQueued'));
    if (isDoctor) {
      const ok = await auth.runSync();
      setContribs(loadContribs());
      if (ok) setMsg(t('docSent'));
    }
    setTimeout(() => setMsg(''), 3500);
  };

  const region = selected && regionById(selected);
  const reviewed = (findingId) =>
    contribs.some((c) => c.type === 'approve' && c.regionId === selected && c.findingId === findingId);
  const regionStates = Object.fromEntries(
    [...new Set(contribs.map((c) => c.regionId))].filter(Boolean).map((id) => [id, 'routine'])
  );
  const ins = insights?.[selected];

  return (
    <main className="split">
      <div className="stage">
        <Body3D mode="regions" regionStates={regionStates} selectedRegion={selected} onRegionTap={setSelected} view={view} nonce={nonce} />
        {!selected && <ViewToggle t={t} view={view} onChange={(v) => { setView(v); setNonce((n) => n + 1); }} />}
      </div>
      <section className="panel">
        <p className="eyebrow">{t('docTitle')}</p>
        {!isDoctor && (
          <div className="notice">
            <p>{t('docNeedLogin')}</p>
            <button className="btn primary" onClick={onAccount}>{t('signIn')}</button>
          </div>
        )}
        {isDoctor && user.status === 'pending' && <p className="notice">{t('doctorPending')}</p>}
        {msg && <p className="toast-inline" role="status">{msg}</p>}

        {!region ? (
          <>
            <h1>{t('docTitle')}</h1>
            <p className="lead">{t('docIntro')}</p>
            <p className="muted">👆 {t('docChoose')}</p>
            <MyContributions t={t} lang={lang} contribs={contribs} />
          </>
        ) : (
          <>
            <div className="region-head">
              <button className="btn ghost small" onClick={() => { setSelected(null); setNonce((n) => n + 1); }}>{t('backBtn')}</button>
              <h1>{region.name[lang]}</h1>
            </div>
            {region.tip && <p className="tip">💡 {region.tip[lang]}</p>}

            {ins && (
              <div className="insight">
                <strong>{t('docInsights')}</strong> · {t('docRecordsCount', { n: ins.records })}
                <div className="tags">
                  {Object.entries(ins.findings).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([id, n]) => (
                    <span key={id} className="tag">{FINDINGS[id]?.label[lang] || id} · {n}</span>
                  ))}
                </div>
              </div>
            )}

            {region.findings.map((fid) => (
              <FindingReview key={fid} t={t} lang={lang} regionId={selected} findingId={fid}
                approved={reviewed(fid)} onSubmit={submit} />
            ))}

            <details className="contrib-box">
              <summary>+ {t('docAddFinding')}</summary>
              <ContributionForm t={t} showName initial={{}} onSubmit={(fields, meta) =>
                submit({ type: 'new', regionId: selected, fields, ...meta })} />
            </details>

            <details className="contrib-box">
              <summary>💬 {t('docRegionComment')}</summary>
              <CommentForm t={t} onSubmit={(comment) => submit({ type: 'comment', regionId: selected, comment })} />
            </details>
          </>
        )}
      </section>
    </main>
  );
}

function FindingReview({ t, lang, regionId, findingId, approved, onSubmit }) {
  const f = FINDINGS[findingId];
  const [editing, setEditing] = useState(false);
  return (
    <article className="review-card">
      <h3>{f.label[lang]}</h3>
      <p className="muted"><strong>{t('lookFor')}:</strong> {f.lookFor[lang]}</p>
      <h4>{t('earlyCare')}</h4>
      <ul>{f.earlyCare.map((x, i) => <li key={i}>{x[lang]}</li>)}</ul>
      {f.treatment.length > 0 && (
        <>
          <h4>{t('simpleTreatment')}</h4>
          <ul>{f.treatment.map((x, i) => <li key={i}>{x[lang]}</li>)}</ul>
        </>
      )}
      <h4 className="refer">{t('whenRefer')}</h4>
      <ul className="refer-list">{f.redFlags.map((x, i) => <li key={i}>{x[lang]}</li>)}</ul>

      {editing ? (
        <ContributionForm
          t={t}
          initial={{
            lookFor: f.lookFor[lang],
            earlyCare: lines(f.earlyCare, lang),
            treatment: lines(f.treatment, lang),
            redFlags: lines(f.redFlags, lang),
          }}
          onCancel={() => setEditing(false)}
          onSubmit={(fields, meta) => {
            onSubmit({ type: 'edit', regionId, findingId, fields, ...meta });
            setEditing(false);
          }}
        />
      ) : (
        <div className="actions">
          <button className={`btn ghost ${approved ? 'done' : ''}`} disabled={approved}
            onClick={() => onSubmit({ type: 'approve', regionId, findingId })}>
            ✓ {approved ? t('docApproved') : t('docApprove')}
          </button>
          <button className="btn ghost" onClick={() => setEditing(true)}>✎ {t('docEdit')}</button>
        </div>
      )}
    </article>
  );
}

function ContributionForm({ t, initial, showName, onSubmit, onCancel }) {
  const [v, setV] = useState({ name: '', lookFor: '', earlyCare: '', treatment: '', redFlags: '', urgency: '', reference: '', comment: '', ...initial });
  const set = (k) => (e) => setV({ ...v, [k]: e.target.value });
  return (
    <form
      className="contrib-form"
      onSubmit={(e) => {
        e.preventDefault();
        const fields = {
          ...(showName ? { name: v.name.trim() } : {}),
          lookFor: v.lookFor.trim(),
          earlyCare: split(v.earlyCare),
          treatment: split(v.treatment),
          redFlags: split(v.redFlags),
        };
        onSubmit(fields, { urgency: v.urgency, reference: v.reference.trim(), comment: v.comment.trim() });
      }}
    >
      {showName && (
        <label className="field"><span>{t('docFindingName')}</span><input required value={v.name} onChange={set('name')} maxLength={120} /></label>
      )}
      <label className="field"><span>{t('docLookFor')}</span><textarea rows="2" value={v.lookFor} onChange={set('lookFor')} /></label>
      <label className="field"><span>{t('docEarly')}</span><textarea rows="3" value={v.earlyCare} onChange={set('earlyCare')} /></label>
      <label className="field"><span>{t('docTreatment')}</span><textarea rows="2" value={v.treatment} onChange={set('treatment')} /></label>
      <label className="field"><span>{t('docRedFlags')}</span><textarea rows="3" value={v.redFlags} onChange={set('redFlags')} /></label>
      <label className="field">
        <span>{t('docUrgency')}</span>
        <select value={v.urgency} onChange={set('urgency')}>
          <option value="">—</option>
          {URGENCY_ORDER.map((u) => <option key={u} value={u}>{t(`urg_${u}`)}</option>)}
        </select>
      </label>
      <label className="field"><span>{t('docReference')}</span><input value={v.reference} onChange={set('reference')} maxLength={500} /></label>
      <label className="field"><span>{t('docComment')}</span><textarea rows="2" value={v.comment} onChange={set('comment')} /></label>
      <div className="actions">
        {onCancel && <button type="button" className="btn ghost" onClick={onCancel}>{t('cancel')}</button>}
        <button className="btn primary" type="submit">{t('docSubmit')}</button>
      </div>
    </form>
  );
}

function CommentForm({ t, onSubmit }) {
  const [c, setC] = useState('');
  return (
    <form className="contrib-form" onSubmit={(e) => { e.preventDefault(); if (c.trim()) { onSubmit(c.trim()); setC(''); } }}>
      <textarea rows="3" value={c} onChange={(e) => setC(e.target.value)} aria-label={t('docComment')} />
      <button className="btn primary" type="submit">{t('docSubmit')}</button>
    </form>
  );
}

function MyContributions({ t, lang, contribs }) {
  if (!contribs.length) return null;
  return (
    <div className="my-contrib">
      <p className="small-label">{t('docMyInput')} ({contribs.length})</p>
      <ul className="mini-list">
        {contribs.slice(0, 8).map((c) => (
          <li key={c.id}>
            <span className={`dot ${c.synced ? 'same' : 'pending'}`} />
            {regionById(c.regionId)?.name[lang] || c.regionId} · {c.findingId ? FINDINGS[c.findingId]?.label[lang] : c.fields?.name || c.type}
            <span className="muted"> · {c.type}</span>
          </li>
        ))}
      </ul>
      <button className="btn ghost small" onClick={() => download('my-contributions.json', JSON.stringify(contribs, null, 2))}>
        ⬇ {t('docExport')}
      </button>
    </div>
  );
}
