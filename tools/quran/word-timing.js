// Validate timing against the unchanged local Hafs text.
export const WORD_CACHE='maqbali-quran-word-audio-v1';
export const WORD_SOURCES=Object.freeze({
 Haitham_Dukhain_QUA:'haitham_al_dukhain_mp3quran',
 Ali_Jaber_64kbps:'abdullah_ali_jabir_mp3quran',
 Abdullah_AlMousa_MP3Quran:'abdullah_al_mousa_mp3quran',
 Muhammad_Ayyoub_128kbps:'mohammed_ayyub_drive',
 Husary_128kbps:'mahmoud_khalil_al_husary_qdc_128k',
 Alafasy_128kbps:'mishary_rashid_al_afasy_2008_qdc',
 'Abdurrahmaan_As-Sudais_192kbps':'abdulrahman_al_sudais_tarteel',
 'Saood_ash-Shuraym_128kbps':'saud_al_shuraim_mp3quran',
 Abdul_Basit_Murattal_192kbps:'abdulbasit_abdulsamad_tarteel',
 Minshawy_Murattal_128kbps:'mohammed_siddiq_al_minshawi_mp3quran',
 MaherAlMuaiqly128kbps:'maher_al_muaiqly_tarteel',
 'Yasser_Ad-Dussary_128kbps':'yasser_al_dosari_tarteel',
 Badr_AlTurki_QUA:'badr_al_turki_yt',
 Ahmed_Talib_QUA:'ahmed_talib_bin_humaid_mp3quran',
 Islam_Sobhi_QUA:'islam_sobhi_mp3quran'
});
const TIMING_ERRORS={
 metadata:'بيانات توقيت هذه التلاوة غير مكتملة أو غير صالحة.',
 text:'الكلمات في مصدر التوقيت مختلفة عن كلمات الآية.',
 index:'ترقيم الكلمات في مصدر توقيت هذه التلاوة غير صالح.',
 time:'أزمنة الكلمات في مصدر هذه التلاوة غير صالحة.',
 duration:'مدة الصوت المحمّل تختلف عن المدة المرافقة لتوقيت الكلمات.',
 incomplete:'توقيت بعض كلمات هذه الآية غير مكتمل.',
 source:'رابط الصوت المرافق لتوقيت الكلمات غير صالح.'
};
const mismatch=(code='metadata')=>Object.assign(Error(TIMING_ERRORS[code]+' اختر «الآية كاملة» أو جرّب آية أخرى.'),{code:'word-'+code});
export const supportsWordMode=reader=>Object.hasOwn(WORD_SOURCES,reader);
// Keep the local, unmodified Uthmani spelling and marks in every displayed word.
// Standalone pause signs attach to the preceding word; they are not spoken words.
export function verseWords(text){
 const words=[];let prefix='';
 for(const token of text.trim().split(/\s+/u)){
  if(/[\p{L}\p{N}]/u.test(token.replace(/[\u06E5\u06E6]/g,''))){words.push(prefix+token);prefix='';}
  else if(words.length)words[words.length-1]+=' '+token;
  else prefix+=token+' ';
 }
 return words;
}
// Match equivalent script encodings without changing the displayed Quran text.
// A hamza on tatweel is a standalone hamza; NFC preserves hamza on its carrier.
// Small waw/yeh are Quran recitation marks, not extra base letters.
const wordKey=text=>text.replace(/ـ[ٕٔ]/gu,'ء').normalize('NFC').replace(/[\p{M}\u06E5\u06E6]/gu,'').replace(/ـ/g,'').replace(/[^\p{L}\p{N}]/gu,'').replace(/ٱ/g,'ا').replace(/ى/g,'ي');
const sameWords=(a,b)=>a.length===b.length&&a.every((word,i)=>word===b[i]);
const BASMALA=['بسم','الله','الرحمن','الرحيم'];
function wordCandidates(ayah,surah){
 const words=verseWords(ayah.text),candidates=[words];
 // The local text includes an unnumbered basmala at most surah openings.
 // QUA can supply the ayah body alone. Only omit this exact prefix when the
 // source text AND every timestamp match that body; never invent its timing.
 if(surah!==1&&surah!==9&&ayah.numberInSurah===1&&words.length>4&&sameWords(words.slice(0,4).map(wordKey),BASMALA))candidates.push(words.slice(4));
 // These three Hafs locations join "بعدما" in the local edition and split
 // "بعد ما" in DigitalKhatt V2. Split only the original characters at those
 // exact locations; timing indices still come entirely from the source.
 if(new Set(['2:181','8:6','13:37']).has(surah+':'+ayah.numberInSurah)){
  const index=words.findIndex(word=>wordKey(word)==='بعدما');
  if(index>=0){const at=words[index].indexOf('م');candidates.push([...words.slice(0,index),words[index].slice(0,at),words[index].slice(at),...words.slice(index+1)]);}
 }
 return candidates;
}
export const timingTexts=(ayah,surah)=>wordCandidates(ayah,surah).map(words=>words.join(" "));
function candidateKeys(words,surah,ayah){
 const keys=words.map(wordKey);
 // The local Hafs edition represents the standing alif in "يا صاحبي" with
 // an extra small-alif carrier. This is an exact, location-bound spelling
 // equivalence; keep the local glyphs for display and reject other changes.
 if(surah===12&&[39,41].includes(ayah.numberInSurah)&&keys[0]==='يصيحبي')keys[0]='يصحبي';
 return keys;
}
export function validateTiming(record,reader,surah,ayah,duration=null){
 if(!supportsWordMode(reader)||record?.schema!==1||record.config!==WORD_SOURCES[reader]||record.surah!==surah||record.ayah!==ayah.numberInSurah||!Number.isFinite(record.durationMs)||record.durationMs<=0||typeof record.text!=='string'||!Array.isArray(record.times)||!record.times.length||record.times.length>5000)throw mismatch();
 if(duration!==null&&(!Number.isFinite(duration)||Math.abs(duration*1000-record.durationMs)>250))throw mismatch('duration');
 const seen=new Set();let previous=-1;
 for(const cue of record.times){
  if(!Array.isArray(cue)||cue.length!==3)throw mismatch();
  const [index,start,end]=cue;
  if(!Number.isInteger(index)||index<1)throw mismatch('index');
  if(!Number.isFinite(start)||!Number.isFinite(end)||start<0||start<previous||end<=start||end>record.durationMs+150)throw mismatch('time');
  if(duration!==null&&(start>=duration*1000||end>duration*1000+150))throw mismatch('duration');
  previous=start;seen.add(index);
 }
 const candidates=wordCandidates(ayah,surah).filter(words=>words.length&&record.times.every(([index])=>index<=words.length));
 if(!candidates.length)throw mismatch('index');
 const sourceWords=candidateKeys(verseWords(record.text),surah,ayah);
 const words=candidates.find(words=>{
  const keys=candidateKeys(words,surah,ayah);
  // Current QUA text follows the actual recitation, including repeated phrases.
  // Its indices stay canonical (e.g. 1,2,3,2,3,4), rather than counting repeats
  // as new words. Compare this exact sequence; do not guess or renumber cues.
  return sameWords(sourceWords,keys)||sameWords(sourceWords,record.times.map(([index])=>keys[index-1]));
 });
 if(!words)throw mismatch('text');
 if(seen.size!==words.length)throw mismatch('incomplete');
 return record.times.map(([index,start,end])=>({index,text:words[index-1],start:start/1000,end:end/1000}));
}
export function wordSlides(segment){
 if(!segment.wordCues?.length)throw mismatch();
 const slides=[];
 segment.wordCues.forEach((cue,i,cues)=>{
  const start=i===0?0:cue.start,end=i+1<cues.length?cues[i+1].start:segment.duration;
  if(end>start)slides.push({ayah:segment.ayah,text:cue.text,start,duration:end-start});
 });
 return slides;
}
export function displaySlides(segments,mode){
 return mode==='word'?segments.flatMap(wordSlides):segments.map(s=>({ayah:s.ayah,text:null,duration:s.duration}));
}
export function displayFrame(time,segments,verses,mode){
 let elapsed=0,index=0;
 for(;index<segments.length-1;index++){if(time<elapsed+segments[index].duration)break;elapsed+=segments[index].duration;}
 const segment=segments[index],ayah=segment?.ayah||verses[0];
 if(mode!=='word')return {ayah,text:null};
 if(!segment)return {ayah,text:ayah?wordCandidates(ayah,ayah.number<=7?1:0).at(-1)[0]:null};
 const local=Math.max(0,time-elapsed),slides=wordSlides(segment);
 let active=slides[0];for(const slide of slides){if(slide.start>local)break;active=slide;}
 return {ayah,text:active.text};
}
