import { useState } from 'react';
import { URGENCY_COLORS } from '../components/Body3D.jsx';
import { maxUrgency } from '../data/knowledge.js';
import { examsForPatient, loadIad, loadPatients } from '../lib/store.js';

const fmt = (iso, lang) => new Date(iso).toLocaleString(lang === 'ar' ? 'ar' : 'en', { dateStyle: 'medium', timeStyle: 'short' });

/** Patients and their body checks over time, plus IAD checks. */
export function RecordsScreen({ t, lang, onOpenExam, onOpenIad }) {
  const [patients] = useState(loadPatients);
  const [open, setOpen] = useState(patients[0]?.id || null);
  const iadCount = loadIad().length;

  return (
    <main className="page narrow">
      <h1>{t('modRecordsTitle')}</h1>
      <h2 className="section-title">{t('patients')}</h2>
      {patients.length === 0 && <p className="muted">{t('noPatients')}</p>}
      <ul className="card-list">
        {patients.map((p) => {
          const exams = examsForPatient(p.id);
          return (
            <li key={p.id} className="patient-block">
              <button className="list-card" aria-expanded={open === p.id} onClick={() => setOpen(open === p.id ? null : p.id)}>
                <span className="avatar" aria-hidden="true">{p.code.slice(-2)}</span>
                <span className="lc-main">
                  <strong>{p.code}</strong>
                  <span className="muted">{[p.ageBand, p.sex && t(p.sex)].filter(Boolean).join(' · ')} · {exams.length} {t('exams')}</span>
                </span>
                <span className="chev" aria-hidden="true">{open === p.id ? '⌄' : '›'}</span>
              </button>
              {open === p.id && (
                <ul className="timeline">
                  {exams.length === 0 && <li className="muted">{t('noExams')}</li>}
                  {exams.map((e) => {
                    const regs = Object.values(e.regions || {});
                    const u = maxUrgency(regs.map((r) => r.urgency));
                    const worse = regs.filter((r) => r.change === 'worse').length;
                    return (
                      <li key={e.id}>
                        <button className="timeline-item" onClick={() => onOpenExam(e)}>
                          <span className="dot" style={{ background: URGENCY_COLORS[u] }} />
                          <span>{fmt(e.at, lang)}</span>
                          <span className="muted">{t('partsChecked', { n: regs.length })}</span>
                          {worse > 0 && <span className="tag change worse">{t('change_worse')} · {worse}</span>}
                          {!e.synced && <span className="tag">⟳</span>}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>

      <h2 className="section-title">{t('iadChecks')}</h2>
      <button className="list-card" onClick={onOpenIad}>
        <span className="avatar" aria-hidden="true">IAD</span>
        <span className="lc-main"><strong>{t('history')}</strong><span className="muted">{iadCount}</span></span>
        <span className="chev" aria-hidden="true">›</span>
      </button>
    </main>
  );
}
