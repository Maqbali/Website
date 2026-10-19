// QUA supplies individual ayah clips. Resolve temporary audio links on demand;
// cache the audio under a stable verse key, rather than retaining signed links.
const DATASET = 'QUD-Technologies/quranic-universal-ayahs';
const CONFIG = 'badr_al_turki_yt';
const HOST = 'https://datasets-server.huggingface.co';

// Islam Sobhi: QUD³ Technologies, same dataset and CC BY 4.0 attribution
// below, subset islam_sobhi_mp3quran. Recording rights remain with the
// reciter/upstream MP3Quran. This rolling subset also omits individual ayahs:
// inspect a small row window, then use only an exact chapter/verse match.
const ISLAM_MISSING = new Map([[4,176],[7,206],[9,129],[37,182],[39,75],[40,85],[45,37],[65,12]]);
export const islamSurahAvailable = surah => !ISLAM_MISSING.has(surah);
export function islamMetadataURL(surah, ayah, globalAyahNumber) {
  if (!Number.isInteger(surah) || surah < 1 || surah > 114 ||
      !Number.isInteger(ayah) || ayah < 1 || ayah > 286 || !Number.isInteger(globalAyahNumber) ||
      globalAyahNumber<1 || globalAyahNumber>6236) throw new Error('رقم الآية غير صالح.');
  if (!islamSurahAvailable(surah)) throw new Error('هذه السورة غير متوفرة حاليًا بصوت إسلام صبحي. اختر سورة أخرى أو قارئًا آخر.');
  const omitted=[...ISLAM_MISSING].reduce((n,[s,count])=>n+(s<surah?count:0),0);
  const params = new URLSearchParams({dataset:DATASET,config:'islam_sobhi_mp3quran',split:'train',
    offset:String(Math.max(0,globalAyahNumber-1-omitted-8)),length:'17'});
  return `${HOST}/rows?${params}`;
}
export function validateIslamRow(payload, surah, ayah) {
  if (!Array.isArray(payload?.rows) || payload.rows.length>17) throw new Error('تعذر مطابقة تلاوة إسلام صبحي مع الآية المحددة. لم يُستخدم الصوت.');
  const matches=payload.rows.filter(item=>item?.row?.surah===surah&&item?.row?.ayah===ayah);
  if (matches.length===0) {
    throw new Error('تلاوة هذه الآية غير متوفرة حاليًا بصوت إسلام صبحي. اختر نطاقًا آخر أو قارئًا آخر.');
  }
  const item=matches[0],row=item.row;
  if (matches.length!==1 || !Number.isInteger(item?.row_idx) || item.row_idx<0 ||
      row?.surah!==surah || row?.ayah!==ayah || !Number.isFinite(row?.duration_ms) || row.duration_ms<=0 ||
      !Array.isArray(item.truncated_cells) || item.truncated_cells.length) {
    throw new Error('تعذر مطابقة تلاوة إسلام صبحي مع الآية المحددة. لم يُستخدم الصوت.');
  }
  let url;
  try { url=new URL(row.audio?.find?.(a=>a.type==='audio/mpeg')?.src); } catch {}
  if (!url || url.origin!==HOST || !url.pathname.startsWith(`/cached-assets/${DATASET}/`) ||
      !url.pathname.includes('/islam_sobhi_mp3quran/train/')) throw new Error('رابط تلاوة إسلام صبحي غير صالح.');
  return url.href;
}
export async function resolveIslamAudioURL(surah, ayah, globalAyahNumber, signal) {
  const response=await fetch(islamMetadataURL(surah,ayah,globalAyahNumber),{signal,cache:'no-store',credentials:'omit'});
  if (!response.ok) throw new Error(response.status===429
    ? 'مصدر تلاوة إسلام صبحي مشغول حاليًا. حاول بعد قليل.'
    : 'تعذر الوصول إلى تلاوة إسلام صبحي. حاول مجددًا أو اختر قارئًا آخر.');
  return validateIslamRow(await response.json(),surah,ayah);
}

// Ahmed Talib clips: QUD³ Technologies, Qur'anic Universal Ayahs,
// https://huggingface.co/datasets/QUD-Technologies/quranic-universal-ayahs
// subset ahmed_talib_bin_humaid_mp3quran. Segmentation/metadata: CC BY 4.0,
// https://creativecommons.org/licenses/by/4.0/ . Recording rights remain
// with the reciter and upstream MP3Quran source; clips are used unchanged.
// The source has 107 complete surahs. Account for the seven absent surahs
// before looking up a row, then still verify the returned surah and ayah.
const AHMED_MISSING = new Map([[9,129],[14,52],[16,128],[17,111],[23,118],[24,64],[33,73]]);
export const ahmedSurahAvailable = surah => !AHMED_MISSING.has(surah);
export function ahmedMetadataURL(surah, globalAyahNumber) {
  if (!Number.isInteger(surah) || surah < 1 || surah > 114 ||
      !Number.isInteger(globalAyahNumber) || globalAyahNumber < 1 || globalAyahNumber > 6236) {
    throw new Error('رقم الآية غير صالح.');
  }
  if (!ahmedSurahAvailable(surah)) throw new Error('هذه السورة غير متوفرة حاليًا بصوت أحمد طالب. اختر سورة أخرى أو قارئًا آخر.');
  const omitted = [...AHMED_MISSING].reduce((n,[s,count]) => n + (s < surah ? count : 0), 0);
  const params = new URLSearchParams({dataset:DATASET, config:'ahmed_talib_bin_humaid_mp3quran',
    split:'train', offset:String(globalAyahNumber - 1 - omitted), length:'1'});
  return `${HOST}/rows?${params}`;
}

export function validateAhmedRow(payload, surah, ayah, globalAyahNumber) {
  const expected = Number(new URL(ahmedMetadataURL(surah,globalAyahNumber)).searchParams.get('offset'));
  const item = payload?.rows?.[0], row = item?.row;
  if (payload?.rows?.length !== 1 || item?.row_idx !== expected || row?.surah !== surah || row?.ayah !== ayah ||
      !Number.isFinite(row?.duration_ms) || row.duration_ms <= 0 ||
      !Array.isArray(item.truncated_cells) || item.truncated_cells.length) {
    throw new Error('تعذر مطابقة تلاوة أحمد طالب مع الآية المحددة. لم يُستخدم الصوت.');
  }
  let url;
  try { url = new URL(row.audio?.find?.(a=>a.type==='audio/mpeg')?.src); } catch {}
  if (!url || url.origin !== HOST || !url.pathname.startsWith(`/cached-assets/${DATASET}/`)) {
    throw new Error('رابط تلاوة أحمد طالب غير صالح.');
  }
  return url.href;
}

export async function resolveAhmedAudioURL(surah, ayah, globalAyahNumber, signal) {
  const response = await fetch(ahmedMetadataURL(surah,globalAyahNumber), {signal,cache:'no-store',credentials:'omit'});
  if (!response.ok) throw new Error(response.status===429
    ? 'مصدر تلاوة أحمد طالب مشغول حاليًا. حاول بعد قليل.'
    : 'تعذر الوصول إلى تلاوة أحمد طالب. حاول مجددًا أو اختر قارئًا آخر.');
  return validateAhmedRow(await response.json(),surah,ayah,globalAyahNumber);
}

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
