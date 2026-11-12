import {prepareChapterSource} from './mousa-audio.js?v=0.2.0-pilot2';
import {readRecitation} from './recitation-fetch.js?v=0.2.0';
const sources={
 Muhammad_Ayyoub_128kbps:{
  config:'mohammed_ayyub_drive',lastAyah:2,wordOnly:true,sourceOffsetMs:1598,
  url:'https://cdn.mp3quran.net/audio/muhammad-ayyub/r1/030.mp3',
  pin:{total:14958064,sha256:{
   '0-131071':'665c0745e393881ca6bfaacb121fd07970d6f86cc5c30a15951d5b9fbadd152e',
   '92716-219990':'ba5209a1c40239d3f33bc250a03bcc7792ec5517939ef27af49364b69b7b43b2',
   '209013-275787':'a8c6053f43d374f436ee968031e375d62d5d35da06b852b839a13e317fda8c38'
  }}
 },
 Haitham_Dukhain_QUA:{
  config:'haitham_al_dukhain_mp3quran',lastAyah:2,
  url:'https://cdn.mp3quran.net/audio/haitham-dukhain/r1/030.mp3',
  pin:{total:18375248,sha256:{
   '0-131071':'12121ff0b6393a4f463fd3f692a151c69e8f72aa2bae1dea65b6854a4d928ef9',
   '57767-217015':'94388dd3093b61c110e6226428c530a1836ba02e0953a39bc669da31ed6556b4',
   '198619-276783':'4832ac857ec1e6d586bff753fa78a4934f3262311bc5b3fb80fe98a55de2f5ec'
  }}
 }
};
export function pilotSourceFor(reader,surah,verses,mode){
 const source=Object.hasOwn(sources,reader)?sources[reader]:null;
 if(surah!==30||!source||!verses.length||source.wordOnly&&mode!=='word')return null;
 return verses.every(({numberInSurah:n})=>n>=1&&n<=source.lastAyah)?source:null;
}
const invalid=()=>Error('ملف التوقيت المرفق بحزمة الاختبار غير صالح.');
export async function loadPilotTimings(source,surah,signal){
 const url=new URL(`assets/timing-pilot/qud-v4/${source.config}/030.json?v=2`,import.meta.url);
 const data=await readRecitation(url,{signal},'timing',r=>r.json());
 if(data?.release!=='QUD v4.0.0'||data.config!==source.config||data.surah!==surah||
    !Array.isArray(data.rows)||data.rows.length!==source.lastAyah)throw invalid();
 const records=new Map(),spans=new Map();
 let previousEnd=0;
 for(const [num,start,end,text,words] of data.rows){
  if(num!==records.size+1||!Number.isInteger(start)||!Number.isInteger(end)||start<previousEnd||end<=start||
     typeof text!=='string'||!Array.isArray(words))throw invalid();
  previousEnd=end;
  // Align the verified mirror. Word times stay relative to the verse.
  const shift=source.sourceOffsetMs??0;
  spans.set(num,{start:(start+shift)/1000,end:(end+shift)/1000});
  const times=words.map(([index,wordStart,wordEnd])=>[index,wordStart-start,wordEnd-start]);
  records.set(num,{schema:1,config:source.config,surah,ayah:num,durationMs:end-start,text,times});
 }
 return {records,spans};
}
export const preparePilotAudio=(source,spans,signal)=>prepareChapterSource(source.url,spans,signal,source.pin);
