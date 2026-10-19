// Read only the required CBR MP3 frames. Never estimate timing from file size:
// use the source's ayah timings, verify frame alignment/rate, and decode with
// preroll before trimming locally. Unsupported/changed files fail closed.
const API='https://www.mp3quran.net/api/v3/ayat_timing';
const AUDIO='https://cdn.mp3quran.net/audio/abdullah-mousa/r1/';
const failure=()=>new Error('تعذر تجهيز تلاوة عبدالله الموسى. حاول مجددًا أو اختر قارئًا آخر.');
export const mousaTimingURL=surah=>`${API}?surah=${surah}&read=243`;
export function validateMousaTimings(rows,ayahCount){
  if(!Array.isArray(rows))throw failure();
  const timings=new Map();
  for(const row of rows){
    if(row.ayah===0)continue;
    if(!Number.isInteger(row.ayah)||row.ayah<1||row.ayah>ayahCount||timings.has(row.ayah)||
      !Number.isFinite(row.start_time)||!Number.isFinite(row.end_time)||row.start_time<0||row.end_time<=row.start_time)throw failure();
    timings.set(row.ayah,{start:row.start_time/1000,end:row.end_time/1000});
  }
  if(timings.size!==ayahCount)throw failure();
  let end=0;
  for(let n=1;n<=ayahCount;n++){
    const t=timings.get(n);
    if(t.start<end-.001)throw failure();
    end=t.end;
  }
  return timings;
}
export function mp3Frame(bytes,offset){
  if(offset<0||offset+4>bytes.length)return null;
  const h=((bytes[offset]<<24)|(bytes[offset+1]<<16)|(bytes[offset+2]<<8)|bytes[offset+3])>>>0;
  const version=(h>>>19)&3,layer=(h>>>17)&3,rate=(h>>>12)&15,sample=(h>>>10)&3;
  if((h>>>21)!==2047||version===1||layer!==1||rate===0||rate===15||sample===3)return null;
  const bitrate=(version===3?[0,32,40,48,56,64,80,96,112,128,160,192,224,256,320]
    :[0,8,16,24,32,40,48,56,64,80,96,112,128,144,160])[rate]*1000;
  const sampleRate=[44100,48000,32000][sample]/(version===3?1:version===2?2:4);
  const samples=version===3?1152:576,average=(version===3?144:72)*bitrate/sampleRate;
  return {bitrate,sampleRate,average,length:Math.floor(average)+((h>>>9)&1),seconds:samples/sampleRate};
}
export function inspectMousaMP3(bytes,total){
  let offset=0;
  if(bytes[0]===73&&bytes[1]===68&&bytes[2]===51){
    if(bytes.length<10||[...bytes.slice(6,10)].some(b=>b>127))throw failure();
    offset=10+bytes.slice(6,10).reduce((n,b)=>n*128+b,0)+((bytes[5]&16)?10:0);
  }
  const frame=mp3Frame(bytes,offset);
  if(!frame||total<=offset)throw failure();
  // VBR is not approximated. For a CBR Info tag, remove the metadata frame
  // and restore FFmpeg's gapless encoder/decoder delay on partial decoding.
  const marker=new TextDecoder('latin1').decode(bytes.slice(offset,offset+frame.length));
  if(/Xing|VBRI/.test(marker))throw failure();
  let skip=0;
  if(marker.includes('Info')){
    const at=offset+marker.indexOf('Info'),view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
    const flags=view.getUint32(at+4),tag=at+8+((flags&1)?4:0)+((flags&2)?4:0)+((flags&4)?100:0)+((flags&8)?4:0);
    if(tag+24>offset+frame.length||!/^LAME|^Lavc|^Lavf/.test(new TextDecoder().decode(bytes.slice(tag,tag+9))))throw failure();
    const delay=(bytes[tag+21]<<4)|(bytes[tag+22]>>>4);
    skip=(delay+529)/frame.sampleRate;
    offset+=frame.length;
  }
  let pos=offset,count=0;
  while(pos+frame.length<=bytes.length){
    const f=mp3Frame(bytes,pos);
    if(!f||f.bitrate!==frame.bitrate||f.sampleRate!==frame.sampleRate)throw failure();
    pos+=f.length;count++;
  }
  if(count<8)throw failure();
  return {...frame,offset,total,skip};
}
async function range(url,start,end,signal){
  const r=await fetch(url,{headers:{Range:`bytes=${start}-${end}`},credentials:'omit',signal});
  if(r.status!==206){await r.body?.cancel();throw failure();}
  const match=/^bytes (\d+)-(\d+)\/(\d+)$/.exec(r.headers.get('Content-Range')||'');
  if(!match||+match[1]!==start||+match[2]>end||+match[2]<start)throw failure();
  const bytes=new Uint8Array(await r.arrayBuffer());
  if(bytes.length!==+match[2]-start+1)throw failure();
  return {bytes,total:+match[3]};
}
export async function prepareMousaSource(surah,ayahCount,signal){
  if(!Number.isInteger(surah)||surah<1||surah>114)throw failure();
  const url=`${AUDIO}${String(surah).padStart(3,'0')}.mp3`;
  const responses=await Promise.all([
    fetch(mousaTimingURL(surah),{signal,credentials:'omit'}).then(async r=>{if(!r.ok)throw failure();return r.json();}),
    range(url,0,131071,signal)
  ]);
  return {url,timings:validateMousaTimings(responses[0],ayahCount),...inspectMousaMP3(responses[1].bytes,responses[1].total)};
}
export function sliceMousaFrames(source,ayah,bytes,rangeStart){
  const timing=source.timings.get(ayah);
  if(!timing)throw failure();
  const startTime=timing.start+source.skip;
  const index=Math.max(0,Math.floor(startTime/source.seconds)-48);
  const expected=source.offset+Math.floor(index*source.average)-rangeStart;
  let first=-1;
  for(let pos=Math.max(0,expected-2);pos<=expected+2;pos++){
    const f=mp3Frame(bytes,pos),next=f&&mp3Frame(bytes,pos+f.length);
    if(f&&next&&f.bitrate===source.bitrate&&next.bitrate===source.bitrate&&f.sampleRate===source.sampleRate&&next.sampleRate===source.sampleRate){first=pos;break;}
  }
  if(first<0)throw failure();
  let pos=first,count=0;
  const required=Math.ceil((timing.end+source.skip)/source.seconds)-index;
  while(count<required){
    const f=mp3Frame(bytes,pos);
    if(!f||f.bitrate!==source.bitrate||f.sampleRate!==source.sampleRate||pos+f.length>bytes.length)throw failure();
    pos+=f.length;count++;
  }
  return {bytes:bytes.slice(first,pos),offset:startTime-index*source.seconds,duration:timing.end-timing.start};
}
export async function fetchMousaPart(source,ayah,signal){
  const timing=source.timings.get(ayah);
  if(!timing)throw failure();
  const index=Math.max(0,Math.floor((timing.start+source.skip)/source.seconds)-48);
  const start=Math.max(source.offset,source.offset+Math.floor(index*source.average)-2);
  const end=Math.min(source.total-1,source.offset+Math.ceil((Math.ceil((timing.end+source.skip)/source.seconds)+2)*source.average)+2);
  if(end-start>24*1024*1024||end<start)throw failure();
  const result=await range(source.url,start,end,signal);
  if(result.total!==source.total)throw failure();
  return sliceMousaFrames(source,ayah,result.bytes,start);
}
