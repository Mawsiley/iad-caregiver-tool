import { useCallback, useEffect, useMemo, useState } from 'react';
import Body3D from './components/Body3D.jsx';
import { Speaker } from './components/Illustrations.jsx';
import { makeT } from './i18n.js';
import { buildPrompts } from './prompts.js';
import { loadPrefs, savePrefs, speak, stopSpeaking } from './storage.js';
import { callApi } from './lib/api.js';
import { clearSession, loadSession, pendingCounts, saveSession, syncAll } from './lib/store.js';
import { IadFlow } from './screens/iad.jsx';
import { ExamFlow } from './screens/exam.jsx';
import { DoctorTool } from './screens/doctor.jsx';
import { RecordsScreen } from './screens/records.jsx';
import { AccountScreen, SyncStatus } from './screens/account.jsx';
import { AdminScreen } from './screens/admin.jsx';

const ROUTES = ['home', 'iad', 'iad-history', 'exam', 'exam-view', 'records', 'account', 'doctor', 'admin'];
const routeFromHash = () => {
  const r = window.location.hash.replace(/^#\/?/, '');
  return ROUTES.includes(r) && r !== 'exam-view' ? r : 'home';
};

export default function App() {
  const prefs = useMemo(loadPrefs, []);
  const [lang, setLang] = useState(prefs.lang || 'en');
  const [sound, setSound] = useState(prefs.sound ?? true);
  const [route, setRoute] = useState(routeFromHash);
  const [viewExam, setViewExam] = useState(null);
  const [session, setSession] = useState(loadSession);
  const [pending, setPending] = useState(pendingCounts);
  const [syncState, setSyncState] = useState({ status: 'idle' });

  const t = useMemo(() => makeT(lang), [lang]);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    savePrefs({ lang, sound });
  }, [lang, sound]);

  const prompts = useMemo(() => buildPrompts(lang), [lang]);
  const say = useCallback((id) => sound && speak(id, prompts[id], lang), [sound, lang, prompts]);
  useEffect(() => {
    if (!sound) stopSpeaking();
  }, [sound]);

  const go = useCallback((r) => {
    stopSpeaking();
    setRoute(r);
    const hash = r === 'home' ? '' : `#/${r}`;
    if (window.location.hash !== hash) window.history.pushState(null, '', hash || window.location.pathname);
    window.scrollTo(0, 0);
  }, []);
  useEffect(() => {
    const onPop = () => setRoute(routeFromHash());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  /* ── Auth + sync ── */
  const refreshPending = useCallback(() => setPending(pendingCounts()), []);
  const runSync = useCallback(async (s = session) => {
    if (!s) return false;
    setSyncState({ status: 'syncing' });
    try {
      await syncAll(callApi, s);
      setSyncState({ status: 'ok' });
      refreshPending();
      return true;
    } catch (e) {
      if (e.code === 'UNAUTHORIZED') {
        clearSession();
        setSession(null);
      }
      setSyncState({ status: 'error', code: e.code });
      refreshPending();
      return false;
    }
  }, [session, refreshPending]);

  const auth = useMemo(() => ({
    session,
    pending,
    syncState,
    runSync: () => runSync(),
    async login(phone, password) {
      const r = await callApi('login', { phone, password });
      const s = { token: r.token, user: r.user };
      saveSession(r.token, r.user);
      setSession(s);
      runSync(s);
    },
    async register(data) {
      const r = await callApi('register', data);
      const s = { token: r.token, user: r.user };
      saveSession(r.token, r.user);
      setSession(s);
      runSync(s);
    },
    logout() {
      clearSession();
      setSession(null);
      setSyncState({ status: 'idle' });
    },
  }), [session, pending, syncState, runSync]);

  // Background sync when signed in and coming back online.
  useEffect(() => {
    if (!session) return;
    const p = pendingCounts();
    if (p.records + p.contributions > 0) runSync();
    const onOnline = () => runSync();
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const onSaved = useCallback(() => {
    refreshPending();
    if (session && navigator.onLine) runSync();
  }, [session, refreshPending, runSync]);

  const common = { t, say, lang };
  const totalPending = pending.records + pending.contributions;

  return (
    <div className="app">
      <header className="topbar">
        <button className="brand" onClick={() => go('home')} aria-label={t('home')}>
          <span className="brand-mark" aria-hidden="true">+</span>
          <span className="brand-name">{t('appTitle')}</span>
        </button>
        <div className="top-actions">
          <button className={`chip ${session ? 'signed' : ''}`} onClick={() => go('account')} title={t('account')}>
            <span aria-hidden="true">👤</span>
            <span className="hide-sm">{session ? session.user.name.split(' ')[0] : t('signIn')}</span>
            {totalPending > 0 && <span className="badge">{totalPending}</span>}
          </button>
          <button className="chip" onClick={() => setSound((s) => !s)} aria-pressed={sound} title={sound ? t('soundOn') : t('soundOff')}>
            <Speaker off={!sound} />
          </button>
          <button className="chip" onClick={() => setLang(lang === 'en' ? 'ar' : 'en')} aria-label="Language">
            {lang === 'en' ? 'عربي' : 'EN'}
          </button>
        </div>
      </header>

      {route === 'home' && <Hub t={t} auth={auth} go={go} />}
      {route === 'iad' && <IadFlow {...common} onExit={() => go('home')} onSaved={onSaved} />}
      {route === 'iad-history' && <IadFlow {...common} initial="history" onExit={() => go('records')} onSaved={onSaved} />}
      {route === 'exam' && <ExamFlow {...common} onExit={() => go('records')} onSaved={onSaved} />}
      {route === 'exam-view' && viewExam && <ExamFlow key={viewExam.id} {...common} viewExam={viewExam} onExit={() => go('records')} />}
      {route === 'records' && (
        <RecordsScreen t={t} lang={lang} onOpenIad={() => go('iad-history')}
          onOpenExam={(e) => { setViewExam(e); go('exam-view'); }} />
      )}
      {route === 'account' && <AccountScreen t={t} auth={auth} onDone={() => go('home')} />}
      {route === 'doctor' && <DoctorTool t={t} lang={lang} auth={auth} onAccount={() => go('account')} />}
      {route === 'admin' && <AdminScreen t={t} lang={lang} />}
    </div>
  );
}

const MODULES = [
  { route: 'exam', icon: '🧍', title: 'modExamTitle', desc: 'modExamDesc', primary: true },
  { route: 'iad', icon: '💧', title: 'modIadTitle', desc: 'modIadDesc' },
  { route: 'records', icon: '📋', title: 'modRecordsTitle', desc: 'modRecordsDesc' },
  { route: 'doctor', icon: '🩺', title: 'modDoctorTitle', desc: 'modDoctorDesc' },
];

function Hub({ t, auth, go }) {
  return (
    <main className="home">
      <div className="home-stage">
        <Body3D mode="regions" />
      </div>
      <section className="home-card">
        <p className="eyebrow">{t('appTitle')}</p>
        <h1>{t('modExamDesc')}</h1>
        <div className="modules">
          {MODULES.map((m) => (
            <button key={m.route} className={`module ${m.primary ? 'primary' : ''}`} onClick={() => go(m.route)}>
              <span className="module-icon" aria-hidden="true">{m.icon}</span>
              <span className="module-text">
                <strong>{t(m.title)}</strong>
                <span>{t(m.desc)}</span>
              </span>
            </button>
          ))}
        </div>
        <div className="hub-account">
          {auth.session ? (
            <p className="muted">{t('signedInAs', { name: auth.session.user.name })}</p>
          ) : (
            <button className="btn ghost" onClick={() => go('account')}>👤 {t('signIn')}</button>
          )}
          <SyncStatus t={t} auth={auth} />
        </div>
        <p className="fine">{t('disclaimer')}</p>
        <button className="link-btn" onClick={() => go('admin')}>{t('adminTitle')}</button>
      </section>
    </main>
  );
}
