// Every spoken prompt in the app, keyed by id. The same ids name the
// pre-recorded files in public/audio/<lang>/<id>.mp3 (see scripts/gen-audio.mjs).
import { makeT } from './i18n.js';
import { ZONES } from './data/zones.js';

export function buildPrompts(lang) {
  const t = makeT(lang);
  const p = {
    diaper: t('diaperQ'),
    map: t('mapSay'),
    allChecked: t('allChecked'),
    changes: `${t('changesQ')} ${t('changesHint')}`,
    sum_ok: `${t('sumOkTitle')}. ${t('sumOk')}`,
    sum_watch: `${t('sumWatchTitle')}. ${t('sumWatch')}`,
    sum_report: `${t('sumReportTitle')}. ${t('sumReport')}`,
  };
  for (const k of ['step1', 'step2', 'step3']) p[k] = `${t(`${k}Title`)}. ${t(`${k}Desc`)}`;
  for (const z of ZONES) p[`zone_${z.id}`] = `${z.name[lang]}. ${t('assessReminder')} ${t('assessQ')}`;
  return p;
}
