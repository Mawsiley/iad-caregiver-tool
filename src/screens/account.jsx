import { useState } from 'react';

export const errText = (t, code) => {
  const key = `err_${code}`;
  const s = t(key);
  return s === key ? t('err_generic', { code }) : s;
};

/** Sign in / create account (health assistant or doctor) and sync status. */
export function AccountScreen({ t, auth, onDone }) {
  const [mode, setMode] = useState('login');
  const [f, setF] = useState({ phone: '', password: '', name: '', role: 'assistant', specialty: '', org: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const user = auth.session?.user;

  if (user) {
    return (
      <main className="page narrow">
        <h1>{t('account')}</h1>
        <div className="form-card">
          <p><strong>{t('signedInAs', { name: user.name })}</strong></p>
          <p className="muted">{t(user.role === 'doctor' ? 'roleDoctor' : 'roleAssistant')} · {t(`status_${user.status}`)}</p>
          {user.role === 'doctor' && user.status === 'pending' && <p className="notice">{t('doctorPending')}</p>}
          <SyncStatus t={t} auth={auth} />
          <button className="btn ghost" onClick={auth.logout}>{t('signOut')}</button>
        </div>
      </main>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      if (mode === 'login') await auth.login(f.phone, f.password);
      else await auth.register(f);
      onDone?.();
    } catch (ex) {
      setErr(errText(t, ex.code || 'API_ERROR'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="page narrow">
      <h1>{mode === 'login' ? t('signIn') : t('register')}</h1>
      <p className="lead">{t('offlineMode')}</p>
      <form className="form-card" onSubmit={submit}>
        {mode === 'register' && (
          <>
            <div className="field">
              <span>{t('role')}</span>
              <div className="seg">
                {['assistant', 'doctor'].map((r) => (
                  <button type="button" key={r} className={f.role === r ? 'on' : ''} aria-pressed={f.role === r}
                    onClick={() => setF({ ...f, role: r })}>{t(r === 'doctor' ? 'roleDoctor' : 'roleAssistant')}</button>
                ))}
              </div>
            </div>
            <label className="field"><span>{t('fullName')}</span><input required value={f.name} onChange={set('name')} autoComplete="name" maxLength={80} /></label>
            {f.role === 'doctor' && (
              <label className="field"><span>{t('specialty')}</span><input value={f.specialty} onChange={set('specialty')} maxLength={80} /></label>
            )}
            <label className="field"><span>{t('org')}</span><input value={f.org} onChange={set('org')} maxLength={120} /></label>
          </>
        )}
        <label className="field"><span>{t('phone')}</span><input required type="tel" inputMode="tel" value={f.phone} onChange={set('phone')} autoComplete="tel" dir="ltr" /></label>
        <label className="field">
          <span>{t('password')}</span>
          <input required type="password" minLength={6} value={f.password} onChange={set('password')}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'} dir="ltr" />
        </label>
        {err && <p className="error" role="alert">{err}</p>}
        <button className="btn primary xl" type="submit" disabled={busy}>{mode === 'login' ? t('signIn') : t('register')}</button>
        <button type="button" className="btn ghost" onClick={() => { setErr(''); setMode(mode === 'login' ? 'register' : 'login'); }}>
          {mode === 'login' ? t('noAccount') : t('haveAccount')}
        </button>
      </form>
    </main>
  );
}

export function SyncStatus({ t, auth }) {
  const { pending, syncState } = auth;
  const total = pending.records + pending.contributions;
  return (
    <div className="sync-row">
      <span className={`dot ${syncState.status === 'error' ? 'changed' : total ? 'pending' : 'same'}`} />
      <span>
        {syncState.status === 'syncing'
          ? t('syncing')
          : syncState.status === 'error'
            ? t('syncFailed', { code: syncState.code })
            : total ? t('pendingSync', { n: total }) : t('synced')}
      </span>
      {auth.session && total > 0 && syncState.status !== 'syncing' && (
        <button className="btn ghost small" onClick={auth.runSync}>{t('syncNow')}</button>
      )}
    </div>
  );
}
