import {RECITERS,DEFAULTS,arabic,normalize,plainArabic,dimensions,validateRange,drawOverlay,drawBackground,cropGeometry,verseAt,concatSlides,exportArgs,encodeWav} from './core.js?v=0.1.6';
import {resolveBadrAudioURL,resolveAhmedAudioURL,ahmedSurahAvailable,resolveIslamAudioURL,islamSurahAvailable} from './audio-sources.js?v=0.1.5-r2';
import {prepareMousaSource,fetchMousaPart} from './mousa-audio.js?v=0.1.5';
const $=id=>document.getElementById(id),canvas=$('preview'),ctx=canvas.getContext('2d');
const PRESET_BACKGROUNDS=new Map([...document.querySelectorAll('[data-background]')].map(button=>[button.dataset.background,button.querySelector('img').getAttribute('src')]));
let settings={...DEFAULTS},quran,surah,verses=[],segments=[],audioCtx,sourceNodes=[],audioLoad=null,audioAbort=null,selectionVersion=0,playing=false,position=0,startedAt=0,bgImage=null,customFile=null,customURL=null,bgVersion=0,renderQueued=false,exporting=false,cancelled=false,engine=null,outputURL=null,raf=0,wakeLock=null;
const bgVideo=$('backgroundVideo');const overlay=document.createElement('canvas');let imageCache=new Map();
try{const saved=JSON.parse(localStorage.getItem('maqbali-quran-settings-v1')||'null');if(saved){for(const key of Object.keys(DEFAULTS)){if(typeof saved[key]===typeof DEFAULTS[key])settings[key]=saved[key];}if(!RECITERS.some(r=>r.id===settings.reciter))settings.reciter=DEFAULTS.reciter;if(!PRESET_BACKGROUNDS.has(settings.background))settings.background='mountains';if(!['portrait','landscape','square'].includes(settings.ratio))settings.ratio='portrait';if(![720,1080].includes(settings.quality))settings.quality=720;if(!/^#[0-9a-f]{6}$/i.test(settings.color))settings.color='#ffffff';for(const [key,min,max] of [['fontSize',32,100],['dim',0,85],['zoom',100,200],['bgX',0,100],['bgY',0,100],['lineHeight',1.5,2.4],['margin',5,18]])settings[key]=Math.max(min,Math.min(max,settings[key]));}}catch{}
const totalDuration=()=>segments.reduce((n,s)=>n+s.duration,0);const getReciter=()=>RECITERS.find(r=>r.id===settings.reciter);const formatTime=s=>`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;
function message(text='',error=false){$('message').textContent=text;$('message').className=error?'error':'success';}
function saveSettings(){try{localStorage.setItem('maqbali-quran-settings-v1',JSON.stringify({...settings,background:customFile?'mountains':settings.background}));}catch{}}
function syncControls(){$('roundedCorners').checked=settings.roundedCorners;$('cornerOption').hidden=settings.ratio!=='landscape';for(const id of ['fontSize','position','dim','zoom','bgX','bgY','lineHeight','margin','color','quality'])$(id).value=settings[id];$('hex').value=settings.color.toUpperCase();$('fromAyah').value=settings.from;$('toAyah').value=settings.to;$('fontValue').textContent=settings.fontSize;$('dimValue').textContent=settings.dim+'٪';$('zoomValue').textContent=settings.zoom+'٪';$('lineValue').textContent=settings.lineHeight;$('marginValue').textContent=settings.margin+'٪';document.querySelectorAll('[data-ratio]').forEach(b=>{const on=b.dataset.ratio===settings.ratio;b.classList.toggle('selected',on);b.setAttribute('aria-pressed',on);});const [w,h]=dimensions(settings.ratio,settings.quality);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}canvas.className=settings.ratio+'-canvas';$('previewResolution').textContent=`${w} × ${h}`;requestRender();}
function renderSurahs(query=''){const selected=settings.surah;$('surah').replaceChildren();quran.surahs.filter(s=>normalize(s.name+' '+s.englishName).includes(normalize(query))).forEach(s=>{$('surah').add(new Option(`${arabic(s.number)}. ${s.name} — ${arabic(s.ayahs.length)} آية`,s.number));});$('surah').value=selected;if(!$('surah').value)$('surah').selectedIndex=-1;}
function renderReciters(query=''){$('reciter').replaceChildren();RECITERS.filter(r=>normalize(r.name).includes(normalize(query))).forEach(r=>$('reciter').add(new Option(r.name,r.id)));$('reciter').value=settings.reciter;if(!$('reciter').value)$('reciter').selectedIndex=-1;}
function updateReader(){$('reciterName').textContent=getReciter().name;$('previewReader').textContent=getReciter().short;$('readerAvailability').hidden=settings.reciter!=='Ahmed_Talib_QUA';$('islamAvailability').hidden=settings.reciter!=='Islam_Sobhi_QUA';}
function stopSources(){for(const s of sourceNodes)try{s.stop();}catch{}sourceNodes=[];}
function pause(){if(playing)position=Math.min(totalDuration(),audioCtx.currentTime-startedAt);playing=false;stopSources();bgVideo.pause();$('play').textContent='▷';$('listen').textContent='▷';$('play').setAttribute('aria-label','تشغيل المعاينة');cancelAnimationFrame(raf);requestRender();}
function invalidateAudio(){pause();position=0;segments=[];selectionVersion++;audioAbort?.abort();audioLoad=null;$('seek').value=0;$('seek').max=1;$('duration').textContent='--:--';$('currentTime').textContent='0:00';}
function selectionChanged(){if(!quran)return;invalidateAudio();message();try{surah=quran.surahs[settings.surah-1];$('fromAyah').max=surah.ayahs.length;$('toAyah').max=surah.ayahs.length;$('rangeNote').textContent=`${surah.name} · ${arabic(surah.ayahs.length)} آية`;if(settings.reciter==='Ahmed_Talib_QUA'&&!ahmedSurahAvailable(settings.surah))throw Error('هذه السورة غير متوفرة حاليًا بصوت أحمد طالب. اختر سورة أخرى أو قارئًا آخر.');verses=validateRange(surah,settings.from,settings.to);$('versesText').textContent=verses.map(v=>v.text+' \u06DD'+arabic(v.numberInSurah)).join('\n');$('verseCount').textContent=verses.length===1?'آية واحدة':arabic(verses.length)+' آيات';$('previewSurah').textContent=surah.name+' · '+(verses.length===1?'الآية '+arabic(settings.from):'الآيات '+arabic(settings.from)+'–'+arabic(settings.to));$('export').disabled=false;$('play').disabled=false;$('listen').disabled=false;saveSettings();}catch(e){verses=[];$('versesText').textContent='';message(e.message,true);$('export').disabled=true;$('play').disabled=true;$('listen').disabled=true;}requestRender();}
function requestRender(){if(renderQueued)return;renderQueued=true;requestAnimationFrame(()=>{renderQueued=false;render();});}
function render(){const {width:w,height:h}=canvas;ctx.fillStyle='#151917';ctx.fillRect(0,0,w,h);const media=(customFile?.type.startsWith('video/')||settings.background==='motion')&&bgVideo.readyState>=2?bgVideo:bgImage;if(media)drawBackground(ctx,media,w,h,settings);overlay.width=w;overlay.height=h;drawOverlay(overlay.getContext('2d'),verses[verseAt(position,segments)],w,h,settings);ctx.drawImage(overlay,0,0);}
function image(src){if(imageCache.has(src))return imageCache.get(src);const p=new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(Error('تعذر فتح صورة الخلفية. اختر صورة أخرى.'));i.src=src;});imageCache.set(src,p);return p;}
async function setBackground(name,file=null){pause();const version=++bgVersion;const oldURL=customURL;customFile=file;settings.background=file?'custom':name;bgImage=null;bgVideo.removeAttribute('src');bgVideo.load();if(file){customURL=URL.createObjectURL(file);$('uploadName').textContent=file.name;}else{customURL=null;$('uploadName').textContent='';}if(oldURL)URL.revokeObjectURL(oldURL);document.querySelectorAll('[data-background]').forEach(b=>{const on=!file&&b.dataset.background===name;b.classList.toggle('selected',on);b.setAttribute('aria-pressed',on);});try{if(file?.type.startsWith('video/')||name==='motion'){bgVideo.src=file?customURL:'assets/night-motion.mp4';await new Promise((resolve,reject)=>{const done=()=>{clean();resolve();};const fail=()=>{clean();reject(Error('تعذر تشغيل الفيديو. جرّب MP4 بترميز H.264 أو اختر صورة.'));};const clean=()=>{bgVideo.removeEventListener('loadeddata',done);bgVideo.removeEventListener('error',fail);};bgVideo.addEventListener('loadeddata',done);bgVideo.addEventListener('error',fail);bgVideo.load();});}else{const loaded=await image(file?customURL:PRESET_BACKGROUNDS.get(name));if(version!==bgVersion)return;bgImage=loaded;}if(version!==bgVersion)return;saveSettings();requestRender();}catch(e){if(version===bgVersion){message(e.message,true);requestRender();}}}
async function context(){if(!audioCtx)audioCtx=new(window.AudioContext||window.webkitAudioContext)({sampleRate:48000});if(audioCtx.state!=='running')await audioCtx.resume();return audioCtx;}
async function fetchAudio(url,signal,resolveURL=null,createBytes=null){let cache;try{cache=await caches.open('maqbali-quran-audio-v1');const match=await cache.match(url);if(match)return await match.arrayBuffer();}catch{}let bytes;if(createBytes){bytes=await createBytes();}else{const sourceURL=resolveURL?await resolveURL():url;const r=await fetch(sourceURL,{signal,credentials:'omit'});if(!r.ok)throw Error('تعذر تنزيل التلاوة. تأكد من اتصالك أو اختر قارئًا آخر.');bytes=await r.arrayBuffer();}signal?.throwIfAborted();if(bytes.byteLength<300)throw Error('ملف التلاوة غير مكتمل. جرّب مجددًا.');if(cache)try{await cache.put(url,new Response(bytes,{headers:{'Content-Type':createBytes?'audio/wav':'audio/mpeg'}}));}catch{}return bytes;}
async function decodeMousaPart(part,signal){
  signal.throwIfAborted();
  if(!exporting)cancelled=false;
  const ff=engine?.loaded?engine:await loadEngine();
  signal.throwIfAborted();
  const abort=()=>{ff.terminate();if(engine===ff)engine=null;};
  signal.addEventListener('abort',abort,{once:true});
  try{
    await ff.writeFile('reader-part.mp3',part.bytes);
    const code=await ff.exec(['-i','reader-part.mp3','-ss',part.offset.toFixed(6),'-t',part.duration.toFixed(6),'-ar','48000','-ac','1','-c:a','pcm_s16le','reader-part.wav']);
    signal.throwIfAborted();
    if(code!==0)throw Error('تعذر تجهيز تلاوة عبدالله الموسى. اختر قارئًا آخر أو حاول مجددًا.');
    const data=await ff.readFile('reader-part.wav');
    return data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength);
  }finally{
    signal.removeEventListener('abort',abort);
    if(ff.loaded)for(const name of ['reader-part.mp3','reader-part.wav'])try{await ff.deleteFile(name);}catch{}
  }
}
async function loadAudio(onProgress=()=>{}){
  if(!verses.length)throw Error('اختر نطاق آيات صحيحًا.');
  if(settings.reciter==='Islam_Sobhi_QUA'&&!islamSurahAvailable(settings.surah))throw Error('هذه السورة غير متوفرة حاليًا بصوت إسلام صبحي. اختر سورة أخرى أو قارئًا آخر.');
  if(segments.length===verses.length)return segments;
  if(audioLoad)return audioLoad;
  const ver=selectionVersion;
  const selected=[...verses],reader=settings.reciter,surahNumber=settings.surah;
  audioAbort=new AbortController();
  const signal=audioAbort.signal;
  audioLoad=(async()=>{
    const ac=await context(),loaded=[];
    let mousaSource;
    for(let i=0;i<selected.length;i++){
      const ayah=selected[i],num=ayah.numberInSurah;
      const isBadr=reader==='Badr_AlTurki_QUA';
      const isAhmed=reader==='Ahmed_Talib_QUA',isMousa=reader==='Abdullah_AlMousa_MP3Quran';
      const isIslam=reader==='Islam_Sobhi_QUA';
      const url=isIslam
        ?new URL(`assets/audio-cache/qua-islam-sobhi-v1/${surahNumber}/${num}.mp3`,location.href).href
        :isMousa
        ?new URL(`assets/audio-cache/mp3quran-mousa-v1/${surahNumber}/${num}.wav`,location.href).href
        :isAhmed
        ?new URL(`assets/audio-cache/qua-ahmed-talib-v1/${surahNumber}/${num}.mp3`,location.href).href
        :isBadr
        ?new URL(`assets/audio-cache/qua-badr-v1/${surahNumber}/${num}.mp3`,location.href).href
        :surahNumber===2&&num===3&&reader==='Husary_128kbps'
          ?new URL('assets/demo-husary-002003.mp3',location.href).href
          :`https://everyayah.com/data/${reader}/${String(surahNumber).padStart(3,'0')}${String(num).padStart(3,'0')}.mp3`;
      onProgress(i,selected.length);
      const bytes=await fetchAudio(url,signal,isBadr
        ?()=>resolveBadrAudioURL(surahNumber,num,ayah.number,signal)
        :isAhmed?()=>resolveAhmedAudioURL(surahNumber,num,ayah.number,signal)
        :isIslam?()=>resolveIslamAudioURL(surahNumber,num,ayah.number,signal):null,
        isMousa?async()=>{
          mousaSource??=await prepareMousaSource(surahNumber,quran.surahs[surahNumber-1].ayahs.length,signal);
          const part=await fetchMousaPart(mousaSource,num,signal);
          return decodeMousaPart(part,signal);
        }:null);
      if(ver!==selectionVersion)throw new DOMException('Selection changed','AbortError');
      let buffer;
      try{buffer=await ac.decodeAudioData(bytes.slice(0));}
      catch{throw Error('تعذر قراءة ملف التلاوة. جرّب قارئًا آخر.');}
      loaded.push({buffer,duration:buffer.duration,ayah});
    }
    if(ver!==selectionVersion)throw new DOMException('Selection changed','AbortError');
    segments=loaded;
    $('duration').textContent=formatTime(totalDuration());
    $('seek').max=totalDuration();
    $('cacheNote').textContent='التلاوة جاهزة · المدة '+formatTime(totalDuration());
    return segments;
  })();
  try{return await audioLoad;}finally{if(ver===selectionVersion){audioLoad=null;if(reader==='Abdullah_AlMousa_MP3Quran'&&!exporting){try{engine?.terminate();}catch{}engine=null;}}}
}
async function play(){if(exporting)return;if(playing){pause();return;}message();try{$('play').disabled=true;$('listen').disabled=true;const ac=await context();await loadAudio((i,n)=>message(`تجهيز التلاوة ${arabic(i+1)} من ${arabic(n)}…`));if(position>=totalDuration()-.05)position=0;startedAt=ac.currentTime+.06-position;let time=0;for(const s of segments){if(time+s.duration>position){const source=ac.createBufferSource();source.buffer=s.buffer;source.connect(ac.destination);const offset=Math.max(0,position-time);source.start(Math.max(ac.currentTime,startedAt+time+offset),offset);sourceNodes.push(source);}time+=s.duration;}playing=true;$('play').textContent='Ⅱ';$('listen').textContent='Ⅱ';$('play').setAttribute('aria-label','إيقاف المعاينة مؤقتًا');if(bgVideo.readyState>=2){try{bgVideo.currentTime=position%bgVideo.duration;await bgVideo.play();}catch{}}message();tick();}catch(e){if(e.name!=='AbortError')message(e.message,true);}finally{$('play').disabled=!verses.length;$('listen').disabled=!verses.length;}}
function tick(){if(!playing)return;position=Math.max(0,Math.min(totalDuration(),audioCtx.currentTime-startedAt));$('seek').value=position;$('currentTime').textContent=formatTime(position);render();if(position>=totalDuration()){pause();return;}raf=requestAnimationFrame(tick);}
function setBusy(on){exporting=on;document.querySelectorAll('.editor button,.editor input,.editor select,.preview-section button,.preview-section input').forEach(el=>{if(el.id!=='cancel')el.disabled=on;});$('cancel').disabled=false;$('progressArea').hidden=!on;}
function progress(value,label){value=Math.max(0,Math.min(100,value));$('progress').value=value;$('progressPercent').textContent=arabic(Math.round(value))+'٪';$('progressLabel').textContent=label;}
const blobPng=c=>new Promise((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(Error('تعذر تجهيز صورة الآية.')),'image/png'));
let engineLoad=null;
async function loadEngine(){
  if(engine?.loaded)return engine;
  if(engineLoad)return engineLoad;
  engineLoad=(async()=>{
    const {FFmpeg}=await import('./assets/ffmpeg/esm/index.js');
    if(cancelled)throw new DOMException('Cancelled','AbortError');
    const ff=new FFmpeg();engine=ff;
    try{
      const base=new URL('./assets/ffmpeg/',location.href);
      const manifest=await fetch(new URL('wasm.json',base)).then(r=>{if(!r.ok)throw Error('تعذر تحميل محرك التصدير.');return r.json();});
      const chunks=[];
      for(let i=0;i<manifest.parts.length;i++){
        if(cancelled)throw new DOMException('Cancelled','AbortError');
        const r=await fetch(new URL(manifest.parts[i],base));
        if(!r.ok)throw Error('تعذر تحميل محرك التصدير. حاول مرة أخرى.');
        chunks.push(await r.arrayBuffer());
        progress(12+10*(i+1)/manifest.parts.length,'تحميل محرك الفيديو لأول استخدام…');
      }
      if(cancelled)throw new DOMException('Cancelled','AbortError');
      const wasmURL=URL.createObjectURL(new Blob(chunks,{type:'application/wasm'}));
      try{await ff.load({coreURL:new URL('ffmpeg-core.js',base).href,wasmURL,classWorkerURL:new URL('esm/worker.js',base).href});}
      finally{URL.revokeObjectURL(wasmURL);}
      return ff;
    }catch(e){ff.terminate();if(engine===ff)engine=null;throw e;}
  })();
  try{return await engineLoad;}finally{engineLoad=null;}
}
async function exportVideo(){if(exporting||!verses.length)return;pause();message();setBusy(true);cancelled=false;let ff;const files=[];try{try{wakeLock=await navigator.wakeLock?.request('screen');}catch{}progress(1,'تجهيز التلاوة…');await context();await loadAudio((i,n)=>progress(2+10*i/n,`تنزيل تلاوة الآية ${arabic(i+1)} من ${arabic(n)}…`));if(cancelled)throw new DOMException('Cancelled','AbortError');await document.fonts.load(`${settings.fontSize}px Quran`);ff=await loadEngine();if(cancelled)throw new DOMException('Cancelled','AbortError');const [w,h]=dimensions(settings.ratio,settings.quality),total=totalDuration();const write=async(name,bytes)=>{if(cancelled)throw new DOMException('Cancelled','AbortError');await ff.writeFile(name,bytes);files.push(name);};progress(23,'تجهيز الصوت والآيات…');await write('audio.wav',encodeWav(segments,audioCtx.sampleRate));await write('slides.txt',new TextEncoder().encode(concatSlides(segments)));const temp=document.createElement('canvas');temp.width=w;temp.height=h;const tc=temp.getContext('2d');for(let i=0;i<verses.length;i++){drawOverlay(tc,verses[i],w,h,settings);await write(`verse-${i}.png`,new Uint8Array(await(await blobPng(temp)).arrayBuffer()));progress(24+10*(i+1)/verses.length,'تنسيق الآيات بالرسم العثماني…');}const video=customFile?.type.startsWith('video/')||settings.background==='motion';let geometry;if(video){if(bgVideo.readyState<2)throw Error('انتظر تحميل خلفية الفيديو أو اختر خلفية أخرى.');const bytes=customFile?await customFile.arrayBuffer():await fetch('assets/night-motion.mp4').then(r=>{if(!r.ok)throw Error('تعذر تحميل الخلفية.');return r.arrayBuffer();});await write('background.media',new Uint8Array(bytes));geometry=cropGeometry(bgVideo.videoWidth,bgVideo.videoHeight,w,h,settings);}else{if(!bgImage)throw Error('انتظر تحميل الخلفية أو اختر صورة أخرى.');tc.clearRect(0,0,w,h);drawBackground(tc,bgImage,w,h,settings);await write('background.png',new Uint8Array(await(await blobPng(temp)).arrayBuffer()));}ff.on('progress',({time})=>{if(!cancelled)progress(35+Math.min(63,Math.max(0,time/1e6/total*63)),'إنشاء الفيديو على جهازك…');});progress(35,'إنشاء الفيديو على جهازك…');const code=await ff.exec(exportArgs({video,geometry,width:w,height:h,duration:total}));if(cancelled)throw new DOMException('Cancelled','AbortError');if(code!==0)throw Error('لم يكتمل التصدير. جرّب جودة 720p أو مقطعًا أقصر أو خلفية صورة.');const result=await ff.readFile('output.mp4');if(outputURL)URL.revokeObjectURL(outputURL);const blob=new Blob([result],{type:'video/mp4'});outputURL=URL.createObjectURL(blob);const name=($('filename').value.trim()||`تلاوة-${surah.name}`).replace(/[\\/:*?"<>|\x00-\x1f]/g,'-')+'.mp4';$('download').href=outputURL;$('download').download=name;$('resultVideo').src=outputURL;$('resultVideo').hidden=true;$('result').hidden=false;const file=new File([blob],name,{type:'video/mp4'});$('share').hidden=!(navigator.canShare?.({files:[file]}));$('share').onclick=async()=>{try{await navigator.share({files:[file],title:'فيديو التلاوة'});}catch(e){if(e.name!=='AbortError')message('تعذرت المشاركة. استخدم زر التنزيل.',true);}};progress(100,'فيديو التلاوة جاهز');message('اكتمل الفيديو. اضغط «تنزيل MP4» لحفظه.');$('download').click();}catch(e){if(cancelled||e.name==='AbortError')message('أُلغي التصدير.');else message(e.message||'تعذر التصدير. جرّب مقطعًا أقصر.',true);}finally{if(ff?.loaded){for(const f of [...files,'output.mp4'])try{await ff.deleteFile(f);}catch{}}try{engine?.terminate();}catch{}engine=null;try{await wakeLock?.release();}catch{}setBusy(false);if(!verses.length)selectionChanged();}}
function showTab(name,focus=false){document.querySelectorAll('[data-tab]').forEach(b=>{const on=b.dataset.tab===name;b.classList.toggle('active',on);b.setAttribute('aria-selected',on);b.tabIndex=on?0:-1;if(on&&focus)b.focus();});document.querySelectorAll('[role=tabpanel]').forEach(p=>p.hidden=p.id!==name+'-panel');}
document.querySelectorAll('[data-tab]').forEach(b=>{b.onclick=()=>showTab(b.dataset.tab);b.onkeydown=e=>{const tabs=[...document.querySelectorAll('[data-tab]')],i=tabs.indexOf(b);if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const n=e.key==='Home'?0:e.key==='End'?2:(i+(e.key==='ArrowLeft'?1:2))%3;showTab(tabs[n].dataset.tab,true);}};});
$('surahSearch').oninput=e=>renderSurahs(e.target.value);$('surah').onchange=e=>{if(!e.target.value)return;settings.surah=+e.target.value;settings.from=1;settings.to=1;syncControls();selectionChanged();};for(const [id,key]of[['fromAyah','from'],['toAyah','to']])$(id).onchange=e=>{settings[key]=+e.target.value;selectionChanged();};
$('reciterSearch').oninput=e=>renderReciters(e.target.value);$('reciter').onchange=e=>{if(!e.target.value)return;settings.reciter=e.target.value;updateReader();selectionChanged();};
for(const id of ['fontSize','position','dim','zoom','bgX','bgY','lineHeight','margin','quality'])$(id).oninput=e=>{settings[id]=id==='position'?e.target.value:+e.target.value;syncControls();saveSettings();};
function color(value){if(!/^#[0-9a-f]{6}$/i.test(value))return;settings.color=value;syncControls();saveSettings();}$('color').oninput=e=>color(e.target.value);$('hex').onchange=e=>{if(!/^#[0-9a-f]{6}$/i.test(e.target.value)){e.target.value=settings.color.toUpperCase();message('اكتب كود لون صحيحًا مثل #FFFFFF.',true);}else color(e.target.value);};document.querySelectorAll('[data-color]').forEach(b=>b.onclick=()=>color(b.dataset.color));
document.querySelectorAll('[data-ratio]').forEach(b=>b.onclick=()=>{settings.ratio=b.dataset.ratio;syncControls();saveSettings();});
$('roundedCorners').onchange=e=>{settings.roundedCorners=e.target.checked;saveSettings();requestRender();};
document.querySelectorAll('[data-background]').forEach(b=>b.onclick=()=>setBackground(b.dataset.background));$('upload').onchange=e=>{const f=e.target.files[0];if(!f)return;if(!f.type.startsWith('image/')&&!f.type.startsWith('video/')){message('اختر ملف صورة أو فيديو.',true);return;}if(f.size>250*1024*1024){message('حجم الخلفية كبير. اختر ملفًا أصغر من 250 ميجابايت.',true);return;}setBackground('custom',f);};
$('play').onclick=play;$('listen').onclick=play;$('seek').oninput=e=>{const was=playing;pause();position=+e.target.value;$('currentTime').textContent=formatTime(position);if(bgVideo.readyState>=2)bgVideo.currentTime=position%bgVideo.duration;requestRender();if(was)play();};$('restart').onclick=()=>{const was=playing;pause();position=0;$('seek').value=0;$('currentTime').textContent='0:00';if(bgVideo.readyState>=2)bgVideo.currentTime=0;requestRender();if(was)play();};
$('export').onclick=exportVideo;$('cancel').onclick=()=>{cancelled=true;audioAbort?.abort();try{engine?.terminate();}catch{}progress(0,'إلغاء التصدير…');};$('watch').onclick=()=>{$('resultVideo').hidden=false;$('resultVideo').play().catch(()=>{});};
$('reset').onclick=()=>{invalidateAudio();settings={...DEFAULTS};$('surahSearch').value='';$('reciterSearch').value='';renderSurahs();renderReciters();updateReader();syncControls();selectionChanged();setBackground(settings.background);message('أُعيدت الإعدادات الافتراضية.');};
$('clearCache').onclick=async()=>{try{await caches.delete('maqbali-quran-audio-v1');message('مُسحت التلاوات المحفوظة في المتصفح.');}catch{message('تعذر مسح التخزين في هذا المتصفح.',true);}};
function openInfoDialog(id){
 const dialog=$(id);
 dialog.showModal();
 dialog.querySelector('.dialog-body').scrollTop=0;
 document.documentElement.classList.add('dialog-open');
}
$('privacy').onclick=()=>openInfoDialog('privacyDialog');
$('version').onclick=()=>openInfoDialog('versionsDialog');
document.querySelectorAll('.info-dialog').forEach(dialog=>{
 dialog.querySelector('.dialog-close').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('close',()=>{
  if(!document.querySelector('.info-dialog[open]'))document.documentElement.classList.remove('dialog-open');
 });
});
bgVideo.addEventListener('seeked',requestRender);document.addEventListener('visibilitychange',()=>{if(document.hidden&&playing)pause();});window.addEventListener('beforeunload',e=>{if(exporting){e.preventDefault();e.returnValue='';}});
async function init(){
  try{
    $('export').disabled=true;$('play').disabled=true;renderReciters();updateReader();syncControls();
    const r=await fetch('assets/quran.json');
    if(!r.ok)throw Error('تعذر تحميل نص المصحف. أعد تحميل الصفحة.');
    quran=await r.json();
    if(quran.surahs.length!==114||quran.surahs.reduce((n,s)=>n+s.ayahs.length,0)!==6236)throw Error('ملف المصحف غير مكتمل.');
    // Only UI chapter names are simplified. Ayah objects/text stay untouched.
    quran={...quran,surahs:quran.surahs.map(s=>({...s,name:plainArabic(s.name)}))};
    if(!quran.surahs[settings.surah-1])settings.surah=2;
    surah=quran.surahs[settings.surah-1];
    if(settings.from<1||settings.to>surah.ayahs.length||settings.to<settings.from){settings.from=settings.to=1;}
    renderSurahs();syncControls();selectionChanged();
    await Promise.all([document.fonts.load('60px Quran'),document.fonts.load('14px Cairo'),setBackground(settings.background)]);
    $('loading').hidden=true;requestRender();
  }catch(e){$('loading').textContent='تعذر تحميل الصفحة';message(e.message,true);}
}
init();
