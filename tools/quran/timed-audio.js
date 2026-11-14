import {TIMING_COVERAGE} from './timing-coverage.js?v=0.2.1';
import {pilotSourceFor} from './local-timing-pilot.js?v=rum60-1';
import {timingTexts,validateTiming,WORD_SOURCES} from './word-timing.js?v=0.2.1';
import {arabic} from './core.js?v=0.2.0';
import {readRecitation} from './recitation-fetch.js?v=0.2.0';

export const TIMED_AUDIO_CACHE='maqbali-quran-matched-v021';
const SHARDS=new URL('assets/timing-v021/',import.meta.url);
const chapters=new Map();
const MAX_CLIP=6*1024*1024;
const HEX=/^[a-f0-9]{64}$/;
const GIT=/^g[a-f0-9]{40}$/;
const chapterError=()=>Error('بيانات توقيت هذه السورة غير صالحة. أعد تحميل الصفحة.');
const soundError=()=>Error('الصوت من المصدر لا يطابق التسجيل المرتبط بالتوقيت. جرّب آية أخرى أو قارئًا آخر.');
const pad=n=>String(n).padStart(3,'0');
const integer=(n,min,max)=>Number.isSafeInteger(n)&&n>=min&&n<=max;

export function timedSourceFor(reader,surah,mode){
 const source=Object.hasOwn(TIMING_COVERAGE,reader)?TIMING_COVERAGE[reader]:null;
 return source&&(mode==='word'||source.both)?{reader,...source}:null;
}

function available(chapter,num){
 if(chapter===true)return true;
 if(typeof chapter!=='string')return false;
 const bits=atob(chapter),n=num-1;
 return Boolean(bits.charCodeAt(n>>3)&(1<<(n&7)));
}
export function timedSelectionProblem(reader,surah,verses,mode){
 if(!verses.length||pilotSourceFor(reader,surah,verses,mode))return '';
 const source=timedSourceFor(reader,surah,mode);
 if(!source&&mode!=='word')return '';
 const mask=source?.chapters[surah];
 const missing=verses.find(v=>!available(mask,v.numberInSurah));
 if(!missing)return '';
 const verse=arabic(missing.numberInSurah);
 if(mode==='ayah')return `تلاوة الآية ${verse} غير متوفرة لهذا القارئ. اختر نطاقًا آخر أو قارئًا آخر.`;
 const alternate=source?.both?'اختر نطاقًا آخر أو قارئًا آخر.':'اختر «الآية كاملة» أو غيّر نطاق الآيات أو القارئ.';
 return `توقيت الكلمات للآية ${verse} غير متوفر لهذا القارئ. ${alternate}`;
}
export async function loadTimedChapter(source,surah,signal){
 if(!integer(surah,1,114)||!source.chapters[surah])throw chapterError();
 const key=source.reader+'/'+pad(surah);
 const found=chapters.get(key);
 if(found){chapters.delete(key);chapters.set(key,found);return found;}
 const data=await readRecitation(new URL(key+'.json',SHARDS),{signal},'timing',r=>r.json());
 const ranged=source.kind==='range';
 if(data?.v!==1||data.reader!==source.reader||data.surah!==surah||data.kind!==source.kind||
    !Array.isArray(data.rows)||data.rows.length===0||data.rows.length>286||
    (ranged&&!integer(data.total,300,256*1024*1024)))throw chapterError();
 const rows=new Map();
 for(const row of data.rows){
  if(!Array.isArray(row)||row.length!==(ranged?8:6))throw chapterError();
  const [n,ms,variant,cues,hash,first,last,trim]=row;
  if(!integer(n,1,286)||rows.has(n)||!available(source.chapters[surah],n)||
     !Number.isFinite(ms)||ms<=0||ms>180000||!integer(variant,0,3)||
     !Array.isArray(cues)||!cues.length||cues.length>5000||
     typeof hash!=='string'||!(HEX.test(hash)||(source.kind==='opus'&&GIT.test(hash))))throw chapterError();
  if(ranged){
   if(!integer(first,0,data.total-1)||!integer(last,first+299,data.total-1)||last-first+1>MAX_CLIP||
      !Number.isFinite(trim)||trim<0||trim>2)throw chapterError();
  }else if(!integer(first,300,MAX_CLIP))throw chapterError();
  rows.set(n,row);
 }
 const chapter={source,surah,rows,total:data.total};
 chapters.set(key,chapter);
 if(chapters.size>12)chapters.delete(chapters.keys().next().value);
 return chapter;
}

function directURL(source,surah,ayah){
 const s=pad(surah),a=pad(ayah);
 if(source.kind==='opus')return `https://cdn.mualim.app/${source.slug}/${s}/${s}${a}.opus`;
 if(source.kind==='mp3')return `https://everyayah.com/data/${source.slug}/${s}${a}.mp3`;
 if(source.kind==='range')return `https://cdn.mp3quran.net/audio/${source.slug}/r1/${s}.mp3`;
 throw chapterError();
}
async function readBounded(response,length){
 const contentLength=response.headers.get('Content-Length');
 if(contentLength!==null&&+contentLength!==length){
  await response.body?.cancel();throw soundError();
 }
 // Providers may omit Content-Length. Cap reads before decoding.
 if(!response.body){
  const bytes=new Uint8Array(await response.arrayBuffer());
  if(bytes.length!==length)throw soundError();
  return bytes;
 }
 const reader=response.body.getReader(),bytes=new Uint8Array(length);
 let offset=0;
 try{
  while(true){
   const {done,value}=await reader.read();
   if(done)break;
   if(offset+value.length>length){await reader.cancel();throw soundError();}
   bytes.set(value,offset);offset+=value.length;
  }
 }finally{reader.releaseLock();}
 if(offset!==length)throw soundError();
 return bytes;
}
async function matches(bytes,expected){
 const git=expected.startsWith('g');
 let input=bytes;
 if(git){
  const prefix=new TextEncoder().encode('blob '+bytes.byteLength+'\0');
  input=new Uint8Array(prefix.length+bytes.byteLength);input.set(prefix);input.set(bytes,prefix.length);
 }
 const hash=new Uint8Array(await crypto.subtle.digest(git?'SHA-1':'SHA-256',input));
 return (git?'g':'')+Array.from(hash,b=>b.toString(16).padStart(2,'0')).join('')===expected;
}
export async function loadVerifiedClip(chapter,ayah,ac,convert,signal){
 const {source,surah,total}=chapter,n=ayah.numberInSurah;
 const row=chapter.rows.get(n);
 if(!row)throw chapterError();
 const [,durationMs,variant,times,hash,first,last,offset]=row;
 const text=timingTexts(ayah,surah)[variant];
 const record={schema:1,config:WORD_SOURCES[source.reader],surah,ayah:n,durationMs,text,times};
 validateTiming(record,source.reader,surah,ayah);
 const ranged=source.kind==='range',length=ranged?last-first+1:first;
 const key=new URL(`assets/matched-cache/v021/${source.reader}/${surah}/${n}/${hash}`,import.meta.url);
 let cache,bytes,stored=false;
 try{
  cache=await caches.open(TIMED_AUDIO_CACHE);
  const hit=await cache.match(key);
  if(hit){
   const data=await readBounded(hit,length);
   if(await matches(data,hash)){bytes=data;stored=true;}
   else await cache.delete(key);
  }
 }catch{signal.throwIfAborted();try{await cache?.delete(key);}catch{}}
 if(!bytes){
  try{
   bytes=await readRecitation(directURL(source,surah,n),{signal,...(ranged?{headers:{Range:`bytes=${first}-${last}`}}:{})},'audio',async r=>{
    if(ranged&&(r.status!==206||r.headers.get('Content-Range')!==`bytes ${first}-${last}/${total}`)){
     await r.body?.cancel();throw soundError();
    }
    const data=await readBounded(r,length);
    if(!await matches(data,hash))throw soundError();
    return data;
   });
  }catch(e){
   if(e.cause?.message===soundError().message)throw e.cause;
   throw e;
  }
 }
 signal.throwIfAborted();
 let buffer;
 try{
  if(ranged)buffer=await ac.decodeAudioData(await convert({bytes,offset,duration:durationMs/1000},signal));
  else{
   try{buffer=await ac.decodeAudioData(bytes.slice().buffer);}
   catch(e){
    signal.throwIfAborted();
    if(source.kind!=='opus')throw e;
    buffer=await ac.decodeAudioData(await convert({format:'opus',bytes},signal));
   }
  }
  signal.throwIfAborted();
  if(ranged&&Math.abs(buffer.duration*1000-durationMs)>50)throw soundError();
  validateTiming(record,source.reader,surah,ayah,buffer.duration);
 }catch(e){
  if(e.name==='AbortError')throw e;
  if(stored)try{await cache.delete(key);}catch{}
  if(e.name==='EncodingError')throw Error('تعذّر فك ترميز صوت التلاوة المطابق.',{cause:e});
  throw e;
 }
 if(cache&&!stored)try{await cache.put(key,new Response(bytes,{headers:{'Content-Type':source.kind==='opus'?'audio/ogg':'audio/mpeg'}}));}catch{}
 signal.throwIfAborted();
 return {record,buffer};
}
