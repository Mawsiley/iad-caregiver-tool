// Generates natural-sounding voice prompts as MP3 files so the app speaks
// Arabic and English on every device, even when the device has no TTS voice.
// Run after changing any prompt text:  npm run audio
import { mkdirSync, writeFileSync } from 'node:fs';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { buildPrompts } from '../src/prompts.js';

const VOICES = { ar: 'ar-SA-ZariyahNeural', en: 'en-US-JennyNeural' };

async function synth(tts, text) {
  const { audioStream } = tts.toStream(text, { rate: 0.9 });
  const chunks = [];
  for await (const c of audioStream) chunks.push(c);
  return Buffer.concat(chunks);
}

for (const [lang, voice] of Object.entries(VOICES)) {
  const dir = new URL(`../public/audio/${lang}/`, import.meta.url);
  mkdirSync(dir, { recursive: true });
  const tts = new MsEdgeTTS();
  await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
  for (const [id, text] of Object.entries(buildPrompts(lang))) {
    const buf = await synth(tts, text);
    if (buf.length < 1000) throw new Error(`Empty audio for ${lang}/${id}`);
    writeFileSync(new URL(`${id}.mp3`, dir), buf);
    console.log(`${lang}/${id}.mp3  ${(buf.length / 1024).toFixed(0)} KB`);
  }
  tts.close();
}
