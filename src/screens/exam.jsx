import { useEffect, useMemo, useState } from 'react';
import Body3D, { URGENCY_COLORS } from '../components/Body3D.jsx';
import { Eye } from '../components/Illustrations.jsx';
import {
  FINDINGS, REGIONS, SEVERITIES, compareRecords, maxUrgency, regionById, regionUrgency,
} from '../data/knowledge.js';
import {
  addPatient, examsForPatient, loadPatients, nextPatientCode, previousRegionRecord, saveExam, uid,
} from '../lib/store.js';
import { stopSpeaking } from '../storage.js';
import { PromptTitle, ViewToggle } from './iad.jsx';

const AGE_BANDS = ['<60', '60–69', '70–79', '80–89', '90+'];
const fmt = (iso, lang) => new Date(iso).toLocaleString(lang === 'ar' ? 'ar' : 'en', { dateStyle: 'medium', timeStyle: 'short' });

/** Full-body check: patient → tap any body part → record → advice → summary. */
export function ExamFlow({ t, say, lang, onExit, onSaved, viewExam }) {
  const [step, setStep] = useState(viewExam ? 'summary' : 'patient');
  const [patient, setPatient] = useState(() =>
    viewExam ? loadPatients().find((p) => p.id === viewExam.patientId) || null : null
  );
  const [exam, setExam] = useState(viewExam || null);

  const go = (s) => {
    stopSpeaking();
    setStep(s);
    window.scrollTo(0, 0);
  };

  return (
    <>
      {step === 'patient' && (
        <PatientScreen
          t={t}
          say={say}
          lang={lang}
          onPick={(p) => {
            setPatient(p);
            setExam({ id: uid('e'), patientId: p.id, at: new Date().toISOString(), regions: {} });
            go('map');
          }}
        />
      )}
      {step === 'map' && exam && (
        <ExamMapScreen
          t={t}
          say={say}
          lang={lang}
          patient={patient}
          exam={exam}
          onRecord={(regionId, rec) => {
            const next = { ...exam, regions: { ...exam.regions, [regionId]: rec } };
            setExam(next);
            saveExam(next);
            onSaved?.();
          }}
          onBack={() => go('patient')}
          onFinish={() => go('summary')}
        />
      )}
      {step === 'summary' && exam && (
        <ExamSummary t={t} say={say} lang={lang} patient={patient} exam={exam} onDone={onExit}
          onContinue={viewExam ? null : () => go('map')} />
      )}
    </>
  );
}

/* ───────── Patient picker ───────── */
function PatientScreen({ t, say, lang, onPick }) {
  const [patients, setPatients] = useState(loadPatients);
  const [adding, setAdding] = useState(patients.length === 0);
  const [form, setForm] = useState({ code: nextPatientCode(), ageBand: '70–79', sex: '' });
  useEffect(() => say('exam_patient'), [say]);

  return (
    <main className="page narrow">
      <PromptTitle text={t('patientTitle')} say={say} t={t} speakId="exam_patient" />
      <p className="lead">{t('patientHint')}</p>

      {patients.length > 0 && (
        <ul className="card-list">
          {patients.map((p) => {
            const last = examsForPatient(p.id)[0];
            return (
              <li key={p.id}>
                <button className="list-card" onClick={() => onPick(p)}>
                  <span className="avatar" aria-hidden="true">{p.code.slice(-2)}</span>
                  <span className="lc-main">
                    <strong>{p.code}</strong>
                    <span className="muted">
                      {[p.ageBand, p.sex && t(p.sex)].filter(Boolean).join(' · ')}
                      {last && ` · ${t('lastExam', { date: fmt(last.at, lang) })}`}
                    </span>
                  </span>
                  <span className="chev" aria-hidden="true">›</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {adding ? (
        <form
          className="form-card"
          onSubmit={(e) => {
            e.preventDefault();
            if (!form.code.trim()) return;
            const p = addPatient(form);
            setPatients(loadPatients());
            onPick(p);
          }}
        >
          <h2>{t('newPatient')}</h2>
          <label className="field">
            <span>{t('patientCode')}</span>
            <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required maxLength={20} />
          </label>
          <div className="field">
            <span>{t('ageBand')}</span>
            <div className="seg">
              {AGE_BANDS.map((a) => (
                <button type="button" key={a} className={form.ageBand === a ? 'on' : ''} aria-pressed={form.ageBand === a}
                  onClick={() => setForm({ ...form, ageBand: a })}>{a}</button>
              ))}
            </div>
          </div>
          <div className="field">
            <span>{t('sex')}</span>
            <div className="seg">
              {['male', 'female'].map((s) => (
                <button type="button" key={s} className={form.sex === s ? 'on' : ''} aria-pressed={form.sex === s}
                  onClick={() => setForm({ ...form, sex: form.sex === s ? '' : s })}>{t(s)}</button>
              ))}
            </div>
          </div>
          <button className="btn primary xl" type="submit">{t('startExam')}</button>
        </form>
      ) : (
        <button className="btn ghost" onClick={() => setAdding(true)}>+ {t('newPatient')}</button>
      )}
    </main>
  );
}

/* ───────── Body map ───────── */
function ExamMapScreen({ t, say, lang, patient, exam, onRecord, onBack, onFinish }) {
  const [selected, setSelected] = useState(null);
  const [view, setView] = useState('front');
  const [nonce, setNonce] = useState(0);
  useEffect(() => say('exam_map'), [say]);

  const regionStates = useMemo(
    () => Object.fromEntries(Object.entries(exam.regions).map(([id, r]) => [id, r.urgency])),
    [exam.regions]
  );
  const checked = Object.entries(exam.regions);

  return (
    <main className="split">
      <div className="stage">
        <Body3D
          mode="regions"
          regionStates={regionStates}
          selectedRegion={selected}
          onRegionTap={setSelected}
          view={view}
          nonce={nonce}
        />
        {!selected && <ViewToggle t={t} view={view} onChange={(v) => { setView(v); setNonce((n) => n + 1); }} />}
        <UrgencyLegend t={t} />
      </div>
      <section className="panel">
        <p className="patient-chip">
          <strong>{patient?.code}</strong> {[patient?.ageBand, patient?.sex && t(patient.sex)].filter(Boolean).join(' · ')}
        </p>
        <PromptTitle text={t('examTitle')} say={say} t={t} speakId="exam_map" />
        <p className="lead">{t('examHint')}</p>

        <label className="field">
          <span>{t('orPickList')}</span>
          <select value="" onChange={(e) => e.target.value && setSelected(e.target.value)}>
            <option value="">—</option>
            {REGIONS.map((r) => (
              <option key={r.id} value={r.id}>{r.name[lang]}</option>
            ))}
          </select>
        </label>

        <p className="small-label">{t('checkedParts')}</p>
        {checked.length === 0 ? (
          <p className="muted">{t('noneChecked')}</p>
        ) : (
          <ul className="zone-list">
            {checked.map(([id, r]) => (
              <li key={id}>
                <button className="zone-item" onClick={() => setSelected(id)}>
                  <span className="dot" style={{ background: URGENCY_COLORS[r.urgency] }} aria-hidden="true" />
                  <span className="zone-name">{regionById(id).name[lang]}</span>
                  <span className="zone-side">
                    {r.findings.length ? r.findings.map((f) => FINDINGS[f.id].label[lang]).join('، ') : t('looksNormal')}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="actions">
          <button className="btn ghost" onClick={onBack}>{t('backBtn')}</button>
          <button className="btn primary" disabled={!checked.length} onClick={onFinish}>{t('finishExam')}</button>
        </div>
      </section>

      {selected && (
        <RegionSheet
          key={selected}
          t={t}
          say={say}
          lang={lang}
          region={regionById(selected)}
          patient={patient}
          exam={exam}
          onSave={(rec) => onRecord(selected, rec)}
          onClose={() => {
            setSelected(null);
            setNonce((n) => n + 1);
          }}
        />
      )}
    </main>
  );
}

/* ───────── Record findings → care advice ───────── */
function RegionSheet({ t, say, lang, region, patient, exam, onSave, onClose }) {
  const existing = exam.regions[region.id];
  const prev = useMemo(() => previousRegionRecord(patient?.id, region.id, exam.at), [patient, region, exam.at]);
  const [stage, setStage] = useState(existing ? 'advice' : 'record');
  const [findings, setFindings] = useState(existing?.findings || []);
  const [pain, setPain] = useState(existing?.pain ?? 0);
  const [redFlags, setRedFlags] = useState(existing?.redFlags || []);
  const [notes, setNotes] = useState(existing?.notes || '');
  const [saved, setSaved] = useState(existing || null);

  useEffect(() => {
    if (stage === 'record') say('exam_region');
    else if (saved) say(`urg_${saved.urgency}`);
  }, [stage, saved, say]);

  const toggle = (id) =>
    setFindings((fs) => (fs.some((f) => f.id === id) ? fs.filter((f) => f.id !== id) : [...fs, { id, severity: 'mild' }]));
  const setSeverity = (id, severity) => setFindings((fs) => fs.map((f) => (f.id === id ? { ...f, severity } : f)));
  const flagOptions = findings.flatMap((f) => FINDINGS[f.id].redFlags.map((rf, i) => ({ key: `${f.id}#${i}`, text: rf[lang] })));

  const save = (normal) => {
    const rec = normal
      ? { findings: [], pain: 0, redFlags: [], notes }
      : { findings, pain, redFlags: redFlags.filter((k) => flagOptions.some((o) => o.key === k)), notes };
    rec.change = compareRecords(prev, rec);
    rec.urgency = regionUrgency(rec, rec.change);
    rec.at = new Date().toISOString();
    onSave(rec);
    setSaved(rec);
    setStage('advice');
  };

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet wide" role="dialog" aria-modal="true" aria-labelledby="rs-title" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" aria-hidden="true" />
        <p className="area-tag"><Eye /> {region.name[lang]}</p>
        {region.tip && <p className="tip">💡 {region.tip[lang]}</p>}

        {stage === 'record' ? (
          <>
            {prev && (
              <div className="prev-box">
                <strong>{t('lastTime', { date: fmt(prev.at, lang) })}</strong>
                <span>
                  {prev.findings.length
                    ? prev.findings.map((f) => `${FINDINGS[f.id].label[lang]} (${t(f.severity)})`).join('، ')
                    : t('looksNormal')}
                  {prev.pain ? ` · ${t('painScore')}: ${prev.pain}` : ''}
                </span>
              </div>
            )}
            <div className="prompt">
              <h2 id="rs-title" className="q">{t('whatSee')}</h2>
              <button className="icon-btn" onClick={() => say('exam_region')} aria-label={t('replay')}>🔊</button>
            </div>
            <p className="reminder">{t('tapFindings')}</p>

            <button className="choice good normal-btn" onClick={() => save(true)}>
              <span className="choice-label">✓ {t('looksNormal')}</span>
            </button>

            <div className="finding-grid">
              {region.findings.map((id) => {
                const f = FINDINGS[id];
                const sel = findings.find((x) => x.id === id);
                return (
                  <div key={id} className={`finding ${sel ? 'on' : ''}`}>
                    <button className="finding-main" aria-pressed={!!sel} onClick={() => toggle(id)}>
                      <span className="tick" aria-hidden="true">✓</span>
                      <span className="finding-label">{f.label[lang]}</span>
                      <span className="finding-look">{f.lookFor[lang]}</span>
                    </button>
                    {sel && (
                      <div className="seg small" role="group">
                        {SEVERITIES.map((s) => (
                          <button key={s} className={`sev-${s} ${sel.severity === s ? 'on' : ''}`} aria-pressed={sel.severity === s}
                            onClick={() => setSeverity(id, s)}>{t(s)}</button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <label className="field">
              <span>{t('painScore')}: <strong>{pain}</strong></span>
              <input type="range" min="0" max="10" value={pain} onChange={(e) => setPain(Number(e.target.value))} />
            </label>

            {flagOptions.length > 0 && (
              <fieldset className="flags">
                <legend>⚠ {t('redFlagsQ')}</legend>
                {flagOptions.map((o) => (
                  <label key={o.key} className="check">
                    <input type="checkbox" checked={redFlags.includes(o.key)}
                      onChange={(e) => setRedFlags((r) => (e.target.checked ? [...r, o.key] : r.filter((k) => k !== o.key)))} />
                    <span>{o.text}</span>
                  </label>
                ))}
              </fieldset>
            )}

            <label className="field">
              <span>{t('notes')}</span>
              <textarea rows="2" value={notes} placeholder={t('notesHint')} maxLength={1000} onChange={(e) => setNotes(e.target.value)} />
            </label>

            <div className="actions">
              <button className="btn ghost" onClick={onClose}>{t('cancel')}</button>
              <button className="btn primary" disabled={!findings.length} onClick={() => save(false)}>{t('saveAdvice')}</button>
            </div>
          </>
        ) : (
          saved && (
            <>
              <UrgencyBanner t={t} urgency={saved.urgency} say={say} />
              {saved.change && saved.change !== 'none' && (
                <p className={`change-badge ${saved.change}`}>{t(`change_${saved.change}`)}</p>
              )}
              <Advice t={t} lang={lang} findings={saved.findings} />
              <div className="actions">
                <button className="btn ghost" onClick={() => setStage('record')}>{t('backBtn')}</button>
                <button className="btn primary" onClick={onClose}>{t('done')}</button>
              </div>
            </>
          )
        )}
      </div>
    </div>
  );
}

export function UrgencyBanner({ t, urgency, say }) {
  return (
    <div className={`result urg-${urgency}`}>
      <div className="prompt">
        <h2>{t(`urg_${urgency}`)}</h2>
        {say && <button className="icon-btn" onClick={() => say(`urg_${urgency}`)} aria-label={t('replay')}>🔊</button>}
      </div>
      <p>{t(`urg_${urgency}_d`)}</p>
    </div>
  );
}

function Advice({ t, lang, findings }) {
  if (!findings.length) return <p className="lead">{t('urg_routine_d')}</p>;
  return (
    <div className="advice">
      {findings.map((sel) => {
        const f = FINDINGS[sel.id];
        return (
          <section key={sel.id} className="advice-card">
            <h3>{f.label[lang]} <span className={`sev-tag sev-${sel.severity}`}>{t(sel.severity)}</span></h3>
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
          </section>
        );
      })}
    </div>
  );
}

function UrgencyLegend({ t }) {
  return (
    <div className="legend" aria-hidden="true">
      {['routine', 'watch', 'soon', 'urgent'].map((u) => (
        <span key={u}><i className="dot" style={{ background: URGENCY_COLORS[u] }} />{t(`urg_${u}`)}</span>
      ))}
    </div>
  );
}

/* ───────── Summary ───────── */
function buildExamReport(t, lang, patient, exam) {
  const lines = [`${t('examSummary')} — ${fmt(exam.at, lang)}`, `${t('patientCode')}: ${patient?.code || '-'}`];
  for (const [id, r] of Object.entries(exam.regions)) {
    const f = r.findings.length ? r.findings.map((x) => `${FINDINGS[x.id].label[lang]} (${t(x.severity)})`).join(', ') : t('looksNormal');
    lines.push(`• ${regionById(id).name[lang]}: ${f}${r.pain ? ` · ${t('painScore')} ${r.pain}` : ''} → ${t(`urg_${r.urgency}`)}`);
    if (r.change && r.change !== 'none') lines.push(`   ${t(`change_${r.change}`)}`);
    if (r.notes) lines.push(`   ${r.notes}`);
  }
  return lines.join('\n');
}

export function ExamSummary({ t, say, lang, patient, exam, onDone, onContinue }) {
  const [view, setView] = useState('front');
  const [nonce, setNonce] = useState(0);
  const [toast, setToast] = useState('');
  const entries = Object.entries(exam.regions);
  const overall = maxUrgency(entries.map(([, r]) => r.urgency));
  const regionStates = Object.fromEntries(entries.map(([id, r]) => [id, r.urgency]));
  useEffect(() => say(`urg_${overall}`), [say, overall]);

  const share = async () => {
    const text = buildExamReport(t, lang, patient, exam);
    try {
      if (navigator.share) return await navigator.share({ title: t('examSummary'), text });
      await navigator.clipboard.writeText(text);
      setToast(t('copied'));
      setTimeout(() => setToast(''), 2200);
    } catch {
      /* cancelled */
    }
  };

  return (
    <main className="split">
      <div className="stage">
        <Body3D mode="regions" regionStates={regionStates} view={view} nonce={nonce} />
        <ViewToggle t={t} view={view} onChange={(v) => { setView(v); setNonce((n) => n + 1); }} />
        <UrgencyLegend t={t} />
      </div>
      <section className="panel">
        <UrgencyBanner t={t} urgency={overall} say={say} />
        <p className="meta">
          {patient?.code} · {fmt(exam.at, lang)} · {t('partsChecked', { n: entries.length })}
        </p>
        <ul className="changed-list">
          {entries.map(([id, r]) => (
            <li key={id} className={`urg-border-${r.urgency}`}>
              <strong>{regionById(id).name[lang]}</strong>
              <div className="tags">
                {r.findings.length
                  ? r.findings.map((f) => <span key={f.id} className={`tag sev-${f.severity}`}>{FINDINGS[f.id].label[lang]} · {t(f.severity)}</span>)
                  : <span className="tag ok">{t('looksNormal')}</span>}
                {r.pain > 0 && <span className="tag">{t('painScore')}: {r.pain}</span>}
                {r.change && r.change !== 'none' && <span className={`tag change ${r.change}`}>{t(`change_${r.change}`)}</span>}
              </div>
              {r.notes && <p className="muted">{r.notes}</p>}
            </li>
          ))}
        </ul>
        <div className="actions">
          <button className="btn ghost" onClick={share}>{t('share')}</button>
          <button className="btn primary" onClick={onDone}>{t('done')}</button>
        </div>
        {onContinue && <button className="btn ghost wide" onClick={onContinue}>{t('backBtn')}</button>}
        <p className="fine">{t('disclaimer')}</p>
        {toast && <div className="toast" role="status">{toast}</div>}
      </section>
    </main>
  );
}
