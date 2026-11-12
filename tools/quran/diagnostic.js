const report=document.querySelector('#report'),status=document.querySelector('#status'),button=document.querySelector('#run');
const log=s=>{report.value+=s+'\n';report.scrollTop=report.scrollHeight;};
const originalFetch=window.fetch.bind(window);
window.fetch=async(input,options={})=>{
 const url=new URL(typeof input==='string'||input instanceof URL?input:input.url,location.href);
 const range=new Headers(options.headers).get('Range');
 try{
  const r=await originalFetch(input,options);
  log('HTTP '+r.status+' '+url.hostname+url.pathname+(range?' | '+range+' | Content-Range: '+r.headers.get('Content-Range'):''));
  return r;
 }catch(e){log('FETCH '+e.name+': '+e.message+' | '+url.hostname+url.pathname);throw e;}
};
async function step(code,fn){
 status.textContent=code;log('START '+code);
 let timer;
 try{
  const value=await Promise.race([fn(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('TIMEOUT '+code)),90000);})]);
  log('OK '+code);return value;
 }catch(e){
  log('FAIL '+code);
  for(let i=0;e&&i<5;i++,e=e.cause)log(JSON.stringify({name:e.name,message:e.message,stage:e.stage,status:e.status,code:e.code}));
  throw e;
 }finally{clearTimeout(timer);}
}
button.onclick=async()=>{
 button.disabled=true;report.value='Quran diagnostic 1\n';
 log('Browser: '+navigator.userAgent);
 log('Secure: '+isSecureContext+' | crypto.subtle: '+Boolean(crypto.subtle)+' | WebAssembly: '+typeof WebAssembly);
 let ac,ff,controller;
 try{
  ac=new(window.AudioContext||window.webkitAudioContext)({sampleRate:48000});
  await ac.resume();
  const modules=await step('01 modules',()=>Promise.all([
   import('./local-timing-pilot.js?v=2'),import('./mousa-audio.js?v=0.2.0-pilot2'),import('./word-timing.js?v=0.2.0')]));
  const [pilot,mp3,words]=modules;
  const q=await step('02 Quran text',async()=>{const r=await fetch('assets/quran.json');if(!r.ok)throw Error('HTTP '+r.status);return r.json();});
  const ayah=q.surahs[29].ayahs[1];
  for(const reader of ['Muhammad_Ayyoub_128kbps','Haitham_Dukhain_QUA']){
   log('\nREADER '+reader+' | 30:2');
   controller=new AbortController();
   try{
    const source=pilot.pilotSourceFor(reader,30,[ayah],'word');
    const timings=await step('03 timing',()=>pilot.loadPilotTimings(source,30,controller.signal));
    await step('04 word validation',()=>words.validateTiming(timings.records.get(2),reader,30,ayah));
    const prepared=await step('05 audio header and hash',()=>pilot.preparePilotAudio(source,timings.spans,controller.signal));
    const part=await step('06 audio range and hash',()=>mp3.fetchMousaPart(prepared,2,controller.signal));
    const {FFmpeg}=await step('07 engine module',()=>import('./assets/ffmpeg/esm/index.js'));
    ff=new FFmpeg();
    ff.on('log',({message})=>{if(/error|failed|invalid|memory/i.test(message))log('FFMPEG '+message.slice(0,400));});
    const chunks=await step('08 engine files',async()=>{
     const r=await fetch('assets/ffmpeg/wasm.json');if(!r.ok)throw Error('HTTP '+r.status);
     const manifest=await r.json(),out=[];
     for(const name of manifest.parts){
      const r=await fetch('assets/ffmpeg/'+name,{signal:controller.signal});if(!r.ok)throw Error(name+' HTTP '+r.status);out.push(await r.arrayBuffer());
     }return out;
    });
    const wasmURL=URL.createObjectURL(new Blob(chunks,{type:'application/wasm'}));
    try{
     await step('09 engine startup',()=>ff.load({coreURL:new URL('assets/ffmpeg/ffmpeg-core.js',location.href).href,wasmURL,classWorkerURL:new URL('assets/ffmpeg/esm/worker.js',location.href).href}));
    }finally{URL.revokeObjectURL(wasmURL);}
    const bytes=await step('10 trim audio',async()=>{
     await ff.writeFile('reader-part.mp3',part.bytes);
     const code=await ff.exec(['-i','reader-part.mp3','-ss',part.offset.toFixed(6),'-t',part.duration.toFixed(6),'-ar','48000','-ac','1','-c:a','pcm_s16le','reader-part.wav']);
     if(code!==0)throw Error('FFmpeg exit '+code);
     const data=await ff.readFile('reader-part.wav');return data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength);
    });
    const buffer=await step('11 decode WAV',()=>ac.decodeAudioData(bytes));
    await step('12 final timing validation',()=>words.validateTiming(timings.records.get(2),reader,30,ayah,buffer.duration));
    log('PASS duration='+buffer.duration);
   }catch{log('READER FAILED — see FAIL above');}
   finally{controller.abort();try{ff?.terminate();}catch{}ff=null;}
  }
 }catch{log('فشل إعداد الفحص — راجع FAIL أعلاه');}
 finally{controller?.abort();try{ff?.terminate();}catch{}try{await ac?.close();}catch{}button.disabled=false;status.textContent='انتهى الفحص. انسخ النتيجة وأرسلها.';}
};
