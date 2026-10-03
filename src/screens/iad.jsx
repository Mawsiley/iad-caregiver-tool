import { useEffect, useMemo, useState } from 'react';
import Body3D from '../components/Body3D.jsx';
import { CHANGE_ILLUS, CONTENT_ILLUS, Same, Changed, Clean, Dry, Protect, Eye, Speaker } from '../components/Illustrations.jsx';
import { CHANGES, evaluate, zoneById, zonesFor } from '../data/zones.js';
import { loadHistory, saveHistory, stopSpeaking } from '../storage.js';

/** IAD skin-check module (the original clinical map v1). */
export function IadFlow({ t, say, lang, initial = 'intro', onExit, onSaved }) {
  const [step, setStep] = useState(initial);
  const [session, setSession] = useState(null);
  const [history, setHistory] = useState(loadHistory);
  const [viewing, setViewing] = useState(null);

  const go = (s) => {
    stopSpeaking();
    setStep(s);
    window.scrollTo(0, 0);
  };
  const startCheck = () => {
    setSession({ id: Date.now().toString(36), at: new Date().toISOString(), contents: null, results: {} });
    go('diaper');
  };
  const finishCare = () => {
    const record = { ...session, level: evaluate(session.results), synced: false };
    const next = [record, ...loadHistory()];
    setHistory(next);
    saveHistory(next);
    setViewing(record);
    onSaved?.();
    go('summary');
  };
  const common = { t, say, lang };

  return (
    <>
      {step === 'intro' && <Home {...common} history={history} onStart={startCheck} onHistory={() => go('history')} />}
      {step === 'diaper' && (
        <DiaperScreen
          {...common}
          onChoose={(contents) => {
            setSession((s) => ({ ...s, contents, results: {} }));
            go('map');
          }}
        />
      )}
      {step === 'map' && session && (
        <MapScreen
          {...common}
          session={session}
          onResult={(id, r) => setSession((s) => ({ ...s, results: { ...s.results, [id]: r } }))}
          onBack={() => go('diaper')}
          onContinue={() => go('care')}
        />
      )}
      {step === 'care' && <CareScreen {...common} onBack={() => go('map')} onDone={finishCare} />}
      {step === 'summary' && viewing && (
        <SummaryScreen {...common} record={viewing} onDone={onExit} onNew={startCheck} />
      )}
      {step === 'history' && (
        <HistoryScreen
          {...common}
          history={history}
          onOpen={(r) => {
            setViewing(r);
            go('summary');
          }}
          onClear={() => {
            if (window.confirm(t('confirmClear'))) {
              setHistory([]);
              saveHistory([]);
            }
          }}
        />
      )}
    </>
  );
}

/* ───────────────────────── Start ───────────────────────── */
function Home({ t, history, onStart, onHistory }) {
  const last = history[0];
  return (
    <main className="home">
      <div className="home-stage">
        <Body3D mode="diaper" />
      </div>
      <section className="home-card">
        <p className="eyebrow">IAD · Incontinence‑Associated Dermatitis</p>
        <h1>{t('appSubtitle')}</h1>
        <p className="lead">{t('startHint')}</p>
        <ol className="flow">
          <li>{t('diaperQ')}</li>
          <li>{t('mapTitle')}</li>
          <li>{t('assessQ')}</li>
          <li>{t('careTitle')}</li>
        </ol>
        <button className="btn primary xl" onClick={onStart}>{t('start')}</button>
        <button className="btn ghost" onClick={onHistory}>
          {t('history')} {history.length > 0 && <span className="count">{history.length}</span>}
        </button>
        {last && <LevelBadge t={t} level={last.level} at={last.at} />}
        <p className="fine">{t('disclaimer')}</p>
      </section>
    </main>
  );
}

/* ───────────────────────── Screen 1 ───────────────────────── */
function DiaperScreen({ t, say, onChoose }) {
  useEffect(() => say('diaper'), [say]);
  const [view, setView] = useState('front');
  const [nonce, setNonce] = useState(0);
  return (
    <main className="split">
      <div className="stage">
        <Body3D mode="diaper" view={view} nonce={nonce} />
        <ViewToggle t={t} view={view} onChange={(v) => { setView(v); setNonce((n) => n + 1); }} />
      </div>
      <section className="panel">
        <StepDots n={1} />
        <p className="eyebrow">{t('diaperTitle')}</p>
        <PromptTitle text={t('diaperQ')} say={say} t={t} speakId="diaper" />
        <div className="choice-grid three">
          {['urine', 'stool', 'both'].map((c) => {
            const Ill = CONTENT_ILLUS[c];
            return (
              <button key={c} className="choice" onClick={() => onChoose(c)}>
                <Ill />
                <span className="choice-label">{t(c)}</span>
              </button>
            );
          })}
        </div>
      </section>
    </main>
  );
}

/* ───────────────────────── Screens 2 – 4B ───────────────────────── */
function MapScreen({ t, say, lang, session, onResult, onBack, onContinue }) {
  const zones = useMemo(() => zonesFor(session.contents), [session.contents]);
  const [view, setView] = useState('front');
  const [nonce, setNonce] = useState(0);
  const [active, setActive] = useState(null);
  const done = zones.filter((z) => session.results[z.id]).length;
  const allDone = done === zones.length;

  useEffect(() => say('map'), [say]);
  useEffect(() => {
    if (allDone) say('allChecked');
  }, [allDone, say]);

  const close = () => {
    setActive(null);
    setNonce((n) => n + 1);
  };

  return (
    <main className="split">
      <div className="stage">
        <Body3D
          mode="map"
          zones={zones}
          results={session.results}
          focusId={active}
          view={view}
          nonce={nonce}
          onZoneTap={(id) => setActive(id)}
        />
        {!active && <ViewToggle t={t} view={view} onChange={(v) => { setView(v); setNonce((n) => n + 1); }} />}
        <Legend t={t} />
      </div>

      <section className="panel">
        <StepDots n={2} />
        <PromptTitle text={t('mapTitle')} say={say} t={t} speakId="map" />
        <p className="lead">{t('mapHint')}</p>
        <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={zones.length} aria-valuenow={done}>
          <div className="progress-bar" style={{ width: `${(done / zones.length) * 100}%` }} />
        </div>
        <p className="progress-label">{t('progress', { n: done, t: zones.length })}</p>

        <p className="small-label">{t('orChoose')}</p>
        <ul className="zone-list">
          {zones.map((z) => {
            const r = session.results[z.id];
            const state = r ? r.status : 'pending';
            return (
              <li key={z.id}>
                <button
                  className={`zone-item ${state}`}
                  onClick={() => {
                    setActive(z.id);
                    setView(z.side);
                  }}
                >
                  <span className={`dot ${state}`} aria-hidden="true" />
                  <span className="zone-name">{z.name[lang]}</span>
                  <span className="zone-side">{t(z.side)}</span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="actions">
          <button className="btn ghost" onClick={onBack}>{t('backBtn')}</button>
          <button className="btn primary" disabled={!allDone} onClick={onContinue}>{t('continueCare')}</button>
        </div>
      </section>

      {active && (
        <AssessSheet
          key={active}
          t={t}
          say={say}
          lang={lang}
          zone={zoneById(active)}
          initial={session.results[active]}
          onCancel={close}
          onSave={(r) => {
            onResult(active, r);
            close();
          }}
        />
      )}
    </main>
  );
}

function AssessSheet({ t, say, lang, zone, initial, onCancel, onSave }) {
  const [stage, setStage] = useState('ask'); // ask (screen 3) → changes (screen 4B)
  const [picked, setPicked] = useState(initial?.changes || []);

  useEffect(() => {
    say(stage === 'ask' ? `zone_${zone.id}` : 'changes');
  }, [stage, say, zone]);

  const toggle = (c) => setPicked((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]));

  return (
    <div className="sheet-backdrop" onClick={onCancel}>
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" aria-hidden="true" />
        <p className="area-tag"><Eye /> {zone.name[lang]}</p>

        {stage === 'ask' ? (
          <>
            <StepDots n={3} />
            <p className="reminder">{t('assessReminder')}</p>
            <h2 id="sheet-title" className="q">{t('assessQ')}</h2>
            <div className="choice-grid two">
              <button className="choice good" onClick={() => onSave({ status: 'same', changes: [] })}>
                <Same />
                <span className="choice-label">{t('same')}</span>
                <span className="choice-sub">{t('sameSub')}</span>
              </button>
              <button className="choice bad" onClick={() => setStage('changes')}>
                <Changed />
                <span className="choice-label">{t('changed')}</span>
                <span className="choice-sub">{t('changedSub')}</span>
              </button>
            </div>
            <button className="btn ghost wide" onClick={onCancel}>{t('cancel')}</button>
          </>
        ) : (
          <>
            <StepDots n={4} />
            <h2 id="sheet-title" className="q">{t('changesQ')}</h2>
            <p className="reminder">{t('changesHint')}</p>
            <div className="choice-grid changes">
              {CHANGES.map((c) => {
                const Ill = CHANGE_ILLUS[c];
                const on = picked.includes(c);
                return (
                  <button key={c} className={`choice selectable ${on ? 'on' : ''}`} aria-pressed={on} onClick={() => toggle(c)}>
                    <span className="tick" aria-hidden="true">✓</span>
                    <Ill />
                    <span className="choice-label">{t(`ch_${c}`)}</span>
                    <span className="choice-sub">{t(`ch_${c}_sub`)}</span>
                  </button>
                );
              })}
            </div>
            <div className="actions">
              <button className="btn ghost" onClick={() => setStage('ask')}>{t('backBtn')}</button>
              <button className="btn primary" disabled={!picked.length} onClick={() => onSave({ status: 'changed', changes: picked })}>
                {t('save')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────── Screen 4A ───────────────────────── */
const STEPS = [
  { key: 'step1', Ill: Clean },
  { key: 'step2', Ill: Dry },
  { key: 'step3', Ill: Protect },
];

function CareScreen({ t, say, onBack, onDone }) {
  const [i, setI] = useState(0);
  const step = STEPS[i];
  useEffect(() => say(step.key), [step, say]);
  const Ill = step.Ill;
  return (
    <main className="care">
      <section className="care-card">
        <p className="eyebrow">{t('careTitle')} · {t('stepLabel', { n: i + 1, t: STEPS.length })}</p>
        <div className="care-steps" aria-hidden="true">
          {STEPS.map((s, k) => (
            <span key={s.key} className={k <= i ? 'on' : ''} />
          ))}
        </div>
        <div className="care-illu"><Ill /></div>
        <p className="care-caption">{t(`${step.key}Caption`)}</p>
        <PromptTitle text={t(`${step.key}Title`)} say={say} t={t} speakId={step.key} />
        <p className="lead">{t(`${step.key}Desc`)}</p>
        <div className="actions">
          <button className="btn ghost" onClick={() => (i === 0 ? onBack() : setI(i - 1))}>{t('backBtn')}</button>
          {i < STEPS.length - 1 ? (
            <button className="btn primary" onClick={() => setI(i + 1)}>{t('next')}</button>
          ) : (
            <button className="btn primary" onClick={onDone}>{t('finishCare')}</button>
          )}
        </div>
      </section>
    </main>
  );
}

/* ───────────────────────── Summary / report ───────────────────────── */
function buildReport(t, lang, record) {
  const lines = [
    `${t('reportHeader')} — ${new Date(record.at).toLocaleString(lang === 'ar' ? 'ar' : 'en')}`,
    `${t('reportDiaper')}: ${t(record.contents)}`,
    t('checkedCount', { n: Object.keys(record.results).length }),
  ];
  const changed = Object.entries(record.results).filter(([, r]) => r.status === 'changed');
  if (!changed.length) lines.push(t('reportNoChange'));
  else {
    lines.push(`${t('changedAreas')}:`);
    for (const [id, r] of changed) lines.push(`• ${zoneById(id).name[lang]}: ${r.changes.map((c) => t(`ch_${c}`)).join(', ')}`);
  }
  const level = record.level;
  lines.push('', t(level === 'ok' ? 'sumOkTitle' : level === 'watch' ? 'sumWatchTitle' : 'sumReportTitle'));
  return lines.join('\n');
}

function SummaryScreen({ t, say, lang, record, onDone, onNew }) {
  const zones = useMemo(() => zonesFor(record.contents), [record.contents]);
  const [view, setView] = useState('front');
  const [nonce, setNonce] = useState(0);
  const [toast, setToast] = useState('');
  const level = record.level;
  const title = t(level === 'ok' ? 'sumOkTitle' : level === 'watch' ? 'sumWatchTitle' : 'sumReportTitle');
  const body = t(level === 'ok' ? 'sumOk' : level === 'watch' ? 'sumWatch' : 'sumReport');
  const changed = Object.entries(record.results).filter(([, r]) => r.status === 'changed');

  useEffect(() => say(`sum_${level}`), [say, level]);

  const share = async () => {
    const text = buildReport(t, lang, record);
    try {
      if (navigator.share) {
        await navigator.share({ title: t('reportHeader'), text });
        return;
      }
      await navigator.clipboard.writeText(text);
      setToast(t('copied'));
      setTimeout(() => setToast(''), 2200);
    } catch {
      /* user cancelled share */
    }
  };

  return (
    <main className="split">
      <div className="stage">
        <Body3D mode="map" zones={zones} results={record.results} view={view} nonce={nonce} />
        <ViewToggle t={t} view={view} onChange={(v) => { setView(v); setNonce((n) => n + 1); }} />
        <Legend t={t} />
      </div>
      <section className="panel">
        <div className={`result ${level}`}>
          <h1>{title}</h1>
          <p>{body}</p>
        </div>
        <p className="meta">
          {new Date(record.at).toLocaleString(lang === 'ar' ? 'ar' : 'en')} · {t(record.contents)} · {t('checkedCount', { n: Object.keys(record.results).length })}
        </p>
        {changed.length > 0 && (
          <>
            <p className="small-label">{t('changedAreas')}</p>
            <ul className="changed-list">
              {changed.map(([id, r]) => (
                <li key={id}>
                  <strong>{zoneById(id).name[lang]}</strong>
                  <div className="tags">
                    {r.changes.map((c) => (
                      <span key={c} className="tag">{t(`ch_${c}`)}</span>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
        <div className="actions">
          <button className="btn ghost" onClick={share}>{t('share')}</button>
          <button className="btn primary" onClick={onDone}>{t('done')}</button>
        </div>
        <button className="btn ghost wide" onClick={onNew}>{t('newCheck')}</button>
        <p className="fine">{t('disclaimer')}</p>
        {toast && <div className="toast" role="status">{toast}</div>}
      </section>
    </main>
  );
}

/* ───────────────────────── History ───────────────────────── */
function HistoryScreen({ t, lang, history, onOpen, onClear }) {
  return (
    <main className="history">
      <h1>{t('history')}</h1>
      {history.length === 0 ? (
        <p className="lead">{t('noHistory')}</p>
      ) : (
        <>
          <ul className="history-list">
            {history.map((r) => {
              const n = Object.values(r.results).filter((x) => x.status === 'changed').length;
              return (
                <li key={r.id}>
                  <button className={`history-item ${r.level}`} onClick={() => onOpen(r)}>
                    <span className={`dot ${r.level === 'ok' ? 'same' : r.level === 'watch' ? 'pending' : 'changed'}`} />
                    <span className="h-date">{new Date(r.at).toLocaleString(lang === 'ar' ? 'ar' : 'en')}</span>
                    <span className="h-what">{t(r.contents)}</span>
                    <span className="h-status">{n ? t('nChanged', { n }) : t('allUsual')}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <button className="btn ghost danger" onClick={onClear}>{t('clearHistory')}</button>
        </>
      )}
    </main>
  );
}

/* ───────────────────────── Small pieces ───────────────────────── */
export function PromptTitle({ text, say, t, speakId }) {
  return (
    <div className="prompt">
      <h1>{text}</h1>
      <button className="icon-btn" onClick={() => say(speakId)} aria-label={t('replay')} title={t('replay')}>
        <Speaker />
      </button>
    </div>
  );
}

export function ViewToggle({ t, view, onChange }) {
  return (
    <div className="view-toggle" role="group">
      {['front', 'back'].map((v) => (
        <button key={v} className={view === v ? 'on' : ''} aria-pressed={view === v} onClick={() => onChange(v)}>
          {t(v)}
        </button>
      ))}
    </div>
  );
}

export function Legend({ t }) {
  return (
    <div className="legend" aria-hidden="true">
      <span><i className="dot pending" />{t('toCheck')}</span>
      <span><i className="dot same" />{t('same')}</span>
      <span><i className="dot changed" />{t('changed')}</span>
    </div>
  );
}

export function StepDots({ n }) {
  return (
    <div className="step-dots" aria-hidden="true">
      {[1, 2, 3, 4].map((k) => (
        <span key={k} className={k <= n ? 'on' : ''} />
      ))}
    </div>
  );
}

export function LevelBadge({ t, level, at }) {
  const title = t(level === 'ok' ? 'sumOkTitle' : level === 'watch' ? 'sumWatchTitle' : 'sumReportTitle');
  return (
    <p className={`last ${level}`}>
      <span className={`dot ${level === 'ok' ? 'same' : level === 'watch' ? 'pending' : 'changed'}`} />
      {title} · {new Date(at).toLocaleString()}
    </p>
  );
}
