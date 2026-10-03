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

// Prompts play from pre-recorded files (public/audio/<lang>/<id>.mp3) so Arabic works on
// devices without an Arabic system voice. Device TTS is only a fallback.
let current = null;

export function speak(id, text, lang) {
  stopSpeaking();
  const audio = new Audio(`${import.meta.env.BASE_URL}audio/${lang}/${id}.mp3`);
  current = audio;
  audio.play().catch((err) => {
    if (current === audio && err?.name !== 'AbortError') speakWithDevice(text, lang);
  });
}

function speakWithDevice(text, lang) {
  try {
    if (!text || !('speechSynthesis' in window)) return;
    const synth = window.speechSynthesis;
    const go = () => {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang === 'ar' ? 'ar-SA' : 'en-US';
      const voice = synth.getVoices().find((v) => v.lang?.toLowerCase().startsWith(lang));
      if (voice) u.voice = voice;
      u.rate = 0.92;
      synth.speak(u);
    };
    // Voices load asynchronously in Chrome; wait for them once if the list is still empty.
    if (synth.getVoices().length) go();
    else synth.addEventListener('voiceschanged', go, { once: true });
  } catch {
    /* speech not supported */
  }
}

export function stopSpeaking() {
  try {
    if (current) {
      current.pause();
      current = null;
    }
    window.speechSynthesis?.cancel();
  } catch {
    /* ignore */
  }
}
