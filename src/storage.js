const HISTORY_KEY = 'iad.history.v1';
const PREFS_KEY = 'iad.prefs.v1';

function read(key, fallback) {
  try {
    const v = JSON.parse(localStorage.getItem(key) || 'null');
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable — app still works for this session */
  }
}

export const loadHistory = () => read(HISTORY_KEY, []);
export const saveHistory = (list) => write(HISTORY_KEY, list.slice(0, 200));
export const loadPrefs = () => read(PREFS_KEY, {});
export const savePrefs = (prefs) => write(PREFS_KEY, prefs);

export function speak(text, lang) {
  try {
    if (!('speechSynthesis' in window)) return;
    const synth = window.speechSynthesis;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang === 'ar' ? 'ar-SA' : 'en-US';
    const voice = synth.getVoices().find((v) => v.lang?.toLowerCase().startsWith(lang));
    if (voice) u.voice = voice;
    u.rate = 0.92;
    synth.speak(u);
  } catch {
    /* speech not supported */
  }
}

export function stopSpeaking() {
  try {
    window.speechSynthesis?.cancel();
  } catch {
    /* ignore */
  }
}
