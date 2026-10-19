// QUA supplies individual ayah clips. Resolve temporary audio links on demand;
// cache the audio under a stable verse key, rather than retaining signed links.
const DATASET = 'QUD-Technologies/quranic-universal-ayahs';
const CONFIG = 'badr_al_turki_yt';
const HOST = 'https://datasets-server.huggingface.co';

export function badrMetadataURL(globalAyahNumber) {
  if (!Number.isInteger(globalAyahNumber) || globalAyahNumber < 1 || globalAyahNumber > 6236) {
    throw new Error('رقم الآية غير صالح.');
  }
  const params = new URLSearchParams({
    dataset: DATASET, config: CONFIG, split: 'train',
    offset: String(globalAyahNumber - 1), length: '1'
  });
  return `${HOST}/rows?${params}`;
}

export function validateBadrRow(payload, surah, ayah, globalAyahNumber) {
  const item = payload?.rows?.[0];
  const row = item?.row;
  if (payload?.rows?.length !== 1 || item?.row_idx !== globalAyahNumber - 1 ||
      row?.surah !== surah || row?.ayah !== ayah ||
      !Number.isFinite(row?.duration_ms) || row.duration_ms <= 0 ||
      !Array.isArray(item.truncated_cells) || item.truncated_cells.length) {
    throw new Error('تعذر مطابقة تلاوة بدر التركي مع الآية المحددة. لم يُستخدم الصوت.');
  }
  const candidate = row.audio?.find?.(a => a.type === 'audio/mpeg')?.src;
  let url;
  try { url = new URL(candidate); } catch {}
  if (!url || url.origin !== HOST || !url.pathname.startsWith(`/cached-assets/${DATASET}/`)) {
    throw new Error('رابط تلاوة بدر التركي غير صالح.');
  }
  return url.href;
}

export async function resolveBadrAudioURL(surah, ayah, globalAyahNumber, signal) {
  const response = await fetch(badrMetadataURL(globalAyahNumber), {
    signal, cache: 'no-store', credentials: 'omit'
  });
  if (!response.ok) {
    throw new Error(response.status === 429
      ? 'مصدر تلاوة بدر التركي مشغول حاليًا. حاول بعد قليل.'
      : 'تعذر الوصول إلى مصدر تلاوة بدر التركي. حاول مجددًا أو اختر قارئًا آخر.');
  }
  return validateBadrRow(await response.json(), surah, ayah, globalAyahNumber);
}
