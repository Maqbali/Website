export const RECITERS = [
 {id:'Husary_128kbps',name:'محمود خليل الحصري',short:'الحصري'},
 {id:'Alafasy_128kbps',name:'مشاري راشد العفاسي',short:'العفاسي'},
 {id:'Abdurrahmaan_As-Sudais_192kbps',name:'عبد الرحمن السديس',short:'السديس'},
 {id:'Saood_ash-Shuraym_128kbps',name:'سعود الشريم',short:'الشريم'},
 {id:'Abdul_Basit_Murattal_192kbps',name:'عبد الباسط عبد الصمد',short:'عبد الباسط'},
 {id:'Minshawy_Murattal_128kbps',name:'محمد صديق المنشاوي',short:'المنشاوي'},
 {id:'MaherAlMuaiqly128kbps',name:'ماهر المعيقلي',short:'المعيقلي'},
 {id:'Yasser_Ad-Dussary_128kbps',name:'ياسر الدوسري',short:'الدوسري'},
 {id:'Badr_AlTurki_QUA',name:'بدر التركي',short:'بدر التركي',provider:'qua'},
 {id:'Ali_Jaber_64kbps',name:'علي جابر',short:'علي جابر'},
 {id:'Ahmed_Talib_QUA',name:'أحمد طالب بن حميد',short:'أحمد طالب',provider:'qua'},
 {id:'Abdullah_AlMousa_MP3Quran',name:'عبدالله بن حمد الموسى',short:'عبدالله الموسى',provider:'mp3quran'},
 {id:'Islam_Sobhi_QUA',name:'إسلام صبحي',short:'إسلام صبحي',provider:'qua'}
];
export const FONTS=[
 {id:'amiri',name:'أميري قرآن — الحالي',family:'Quran',weight:400},
 {id:'hafs',name:'حفص العثماني',family:'QuranHafs',weight:400},
 {id:'naskh',name:'عثمان طه نسخ',family:'QuranNaskh',weight:400},
 {id:'scheherazade',name:'شهرزاد الجديد — عريض',family:'QuranScheherazade',weight:700}
];
export function textFont(id,size){const f=FONTS.find(f=>f.id===id)||FONTS[0];return `${f.weight} ${size}px ${f.family}, Quran`;}
export const DEFAULTS={surah:2,from:3,to:3,reciter:'Husary_128kbps',displayMode:'ayah',background:'mountains',ratio:'portrait',quality:720,color:'#ffffff',fontSize:60,font:'amiri',position:'center',dim:40,zoom:100,bgX:50,bgY:50,lineHeight:1.9,margin:8,roundedCorners:false,showReciter:false,reciterFont:'amiri',reciterSize:32,reciterColor:'#ffffff',reciterPosition:'below',reciterAlign:'center',reciterGap:3,reciterEffect:'shadow',reciterEffectColor:'#000000',reciterEffectSize:3};
export function restoreSettings(saved){
 const s={...DEFAULTS};
 if(!saved||typeof saved!=='object')return s;
 for(const key of Object.keys(DEFAULTS))if(typeof saved[key]===typeof DEFAULTS[key])s[key]=saved[key];
 for(const key of ['font','reciterFont'])if(!FONTS.some(f=>f.id===s[key]))s[key]=DEFAULTS[key];
 for(const [key,values]of Object.entries({displayMode:['ayah','word'],ratio:['portrait','landscape','square'],quality:[720,1080],position:['top','center','bottom'],reciterPosition:['below','top','bottom'],reciterAlign:['left','center','right'],reciterEffect:['none','shadow','outline','both']}))if(!values.includes(s[key]))s[key]=DEFAULTS[key];
 if(!RECITERS.some(r=>r.id===s.reciter))s.reciter=DEFAULTS.reciter;
 for(const key of ['color','reciterColor','reciterEffectColor'])if(!/^#[0-9a-f]{6}$/i.test(s[key]))s[key]=DEFAULTS[key];
 for(const [key,min,max]of [['surah',1,114],['from',1,286],['to',1,286],['fontSize',32,100],['dim',0,85],['zoom',100,200],['bgX',0,100],['bgY',0,100],['lineHeight',1.5,2.4],['margin',5,18],['reciterSize',18,72],['reciterGap',0,12],['reciterEffectSize',1,8]])s[key]=Number.isFinite(s[key])?Math.max(min,Math.min(max,s[key])):DEFAULTS[key];
 for(const key of ['surah','from','to'])s[key]=Math.round(s[key]);
 return s;
}
export const arabic=n=>String(n).replace(/\d/g,d=>'٠١٢٣٤٥٦٧٨٩'[d]);
export const plainArabic=s=>s.normalize('NFC').replace(/\p{M}/gu,'').replace(/[ـ\u200B-\u200F\uFEFF]/g,'').replace(/ٱ/g,'ا');
export const normalize=s=>plainArabic(s).normalize('NFD').replace(/\p{M}/gu,'').replace(/ة/g,'ه').toLowerCase().replace(/\s+/g,' ').trim();
export function dimensions(ratio,quality){const q=Number(quality);return ratio==='landscape'?[q*16/9,q].map(Math.round):ratio==='square'?[q,q]:[q,Math.round(q*16/9)];}
export function validateRange(surah,from,to){if(!Number.isInteger(from)||!Number.isInteger(to)||from<1||to<from||to>surah.ayahs.length)throw Error('اختر نطاق آيات صحيحًا من ١ إلى '+arabic(surah.ayahs.length)+'.');return surah.ayahs.slice(from-1,to);}
export function wrapLines(ctx,text,width,measure=s=>ctx.measureText(s).width){const words=text.split(/\s+/),lines=[];if(words.length>1&&/^\u06DD[٠-٩]+$/.test(words.at(-1)))words.splice(-2,2,words.at(-2)+' '+words.at(-1));let line='';for(const word of words){const test=line?line+' '+word:word;if(line&&measure(test)>width){lines.push(line);line=word;}else line=test;}if(line)lines.push(line);return lines;}
function ink(ctx,text,size){const m=ctx.measureText(text);return {ascent:m.actualBoundingBoxAscent||size,descent:Math.max(0,m.actualBoundingBoxDescent||size*.3),width:m.width};}
function verseInk(ctx,text,size,font){
 ctx.font=textFont(font,size);
 const match=text.match(/^(.*) (\u06DD[٠-٩]+)$/);
 if(!match)return ink(ctx,text,size);
 const body=ink(ctx,match[1],size),bodyWidth=ctx.measureText(match[1]).width,space=ctx.measureText(' ').width;
 ctx.font=textFont('amiri',size);const marker=ink(ctx,match[2],size),markerWidth=ctx.measureText(match[2]).width;ctx.font=textFont(font,size);
 return {ascent:Math.max(body.ascent,marker.ascent),descent:Math.max(body.descent,marker.descent),width:body.width+space+marker.width,body:match[1],marker:match[2],bodyWidth,markerWidth,space};
}
export function layoutText(ctx,text,w,h,settings){
 const margin=w*settings.margin/100,maxW=w-2*margin,top=h*.14,bottom=h*.84;
 let reader=null;
 if(settings.showReciter){
  const name=RECITERS.find(r=>r.id===settings.reciter)?.name;
  if(name){
   let size=settings.reciterSize*w/1080;ctx.font=textFont(settings.reciterFont,size);
   const padding=settings.reciterEffect==='none'?0:settings.reciterEffectSize*w/1080*3;
   let metrics=ink(ctx,name,size);
   if(metrics.width>maxW-2*padding){size*=Math.max(1,maxW-2*padding)/metrics.width;ctx.font=textFont(settings.reciterFont,size);metrics=ink(ctx,name,size);}
   reader={name,size,...metrics,padding,height:metrics.ascent+metrics.descent+2*padding};
  }
 }
 const gap=reader?h*settings.reciterGap/100:0,reserve=reader?reader.height+gap:0;
 const verseTop=top+(reader&&settings.reciterPosition==='top'?reserve:0);
 const verseBottom=bottom-(reader&&settings.reciterPosition!=='top'?reserve:0);
 let size=settings.fontSize*w/1080,lines,metrics,step,height;
 for(let i=0;i<200;i++){
  ctx.font=textFont(settings.font,size);lines=wrapLines(ctx,text,maxW,s=>verseInk(ctx,s,size,settings.font).width);metrics=lines.map(line=>verseInk(ctx,line,size,settings.font));
  step=Math.max(size*settings.lineHeight,...metrics.map(m=>m.ascent+m.descent+size*.12));
  height=metrics[0].ascent+(lines.length-1)*step+metrics.at(-1).descent;
  if(height<=verseBottom-verseTop&&metrics.every(m=>m.width<=maxW))break;
  size*=.965;
 }
 const y=settings.position==='top'?verseTop:settings.position==='bottom'?verseBottom-height:(verseTop+verseBottom-height)/2;
 const baselines=lines.map((_,i)=>y+metrics[0].ascent+i*step);
 if(reader){
  const nameTop=settings.reciterPosition==='top'?top:settings.reciterPosition==='bottom'?bottom-reader.height:y+height+gap;
  reader.y=nameTop+reader.padding+reader.ascent;
  reader.x=settings.reciterAlign==='right'?w-margin-reader.padding:settings.reciterAlign==='left'?margin+reader.padding:w/2;
 }
 return {lines,size,step,y,height,baselines,metrics,margin,reader};
}
export function drawCornerMask(ctx,w,h,settings){
 if(!settings.roundedCorners||settings.ratio!=='landscape')return;
 const r=Math.min(w,h)*.14;
 ctx.save();ctx.fillStyle='#000';ctx.shadowBlur=0;ctx.shadowOffsetY=0;
 ctx.beginPath();ctx.rect(0,0,w,h);
 ctx.moveTo(r,0);ctx.lineTo(w-r,0);ctx.quadraticCurveTo(w,0,w,r);
 ctx.lineTo(w,h-r);ctx.quadraticCurveTo(w,h,w-r,h);
 ctx.lineTo(r,h);ctx.quadraticCurveTo(0,h,0,h-r);
 ctx.lineTo(0,r);ctx.quadraticCurveTo(0,0,r,0);ctx.closePath();
 ctx.fill('evenodd');ctx.restore();
}
export function drawOverlay(ctx,ayah,w,h,settings,displayText=null){
 ctx.clearRect(0,0,w,h);ctx.fillStyle=`rgba(0,0,0,${settings.dim/100})`;ctx.fillRect(0,0,w,h);
 let layout;
 if(ayah){
  const text=displayText??(ayah.text+' \u06DD'+arabic(ayah.numberInSurah));
  layout=layoutText(ctx,text,w,h,settings);
  ctx.font=textFont(settings.font,layout.size);ctx.textAlign='center';ctx.textBaseline='alphabetic';ctx.direction='rtl';ctx.fillStyle=settings.color;
  ctx.shadowColor='rgba(0,0,0,.6)';ctx.shadowBlur=w/270;ctx.shadowOffsetY=1;
  for(let i=0;i<layout.lines.length;i++){
   const m=layout.metrics[i],y=layout.baselines[i];
   if(m.marker){
    const right=(w+m.bodyWidth+m.space+m.markerWidth)/2;
    ctx.textAlign='right';ctx.font=textFont(settings.font,layout.size);ctx.fillText(m.body,right,y);
    ctx.font=textFont('amiri',layout.size);ctx.fillText(m.marker,right-m.bodyWidth-m.space,y);ctx.textAlign='center';ctx.font=textFont(settings.font,layout.size);
   }else ctx.fillText(layout.lines[i],w/2,y);
  }
  ctx.shadowBlur=0;ctx.shadowOffsetY=0;
  if(layout.reader){
   const r=layout.reader,effect=settings.reciterEffect,amount=settings.reciterEffectSize*w/1080;
   ctx.save();ctx.font=textFont(settings.reciterFont,r.size);ctx.textAlign=settings.reciterAlign;ctx.fillStyle=settings.reciterColor;
   if(effect==='shadow'||effect==='both'){ctx.shadowColor=settings.reciterEffectColor;ctx.shadowBlur=amount*2;ctx.shadowOffsetY=amount;}
   if(effect==='outline'||effect==='both'){ctx.strokeStyle=settings.reciterEffectColor;ctx.lineWidth=amount;ctx.lineJoin='round';ctx.strokeText(r.name,r.x,r.y);}
   ctx.fillText(r.name,r.x,r.y);ctx.restore();
  }
 }
 drawCornerMask(ctx,w,h,settings);
 return layout;
}
export function cropGeometry(sw,sh,w,h,settings){const scale=Math.max(w/sw,h/sh)*settings.zoom/100;const width=Math.ceil(sw*scale/2)*2,height=Math.ceil(sh*scale/2)*2;return {width,height,x:Math.round((width-w)*settings.bgX/100),y:Math.round((height-h)*settings.bgY/100)};}
export function drawBackground(ctx,media,w,h,settings){const sw=media.videoWidth||media.naturalWidth||media.width,sh=media.videoHeight||media.naturalHeight||media.height;const c=cropGeometry(sw,sh,w,h,settings);ctx.drawImage(media,-c.x,-c.y,c.width,c.height);}
export function verseAt(time,segments){let elapsed=0;for(let i=0;i<segments.length;i++){elapsed+=segments[i].duration;if(time<elapsed-.00001)return i;}return Math.max(0,segments.length-1);}
export function concatSlides(segments){let s='ffconcat version 1.0\n';segments.forEach((x,i)=>{s+=`file 'verse-${i}.png'\noption framerate 1000\nduration ${x.duration.toFixed(9)}\n`;});s+=`file 'verse-${segments.length-1}.png'\noption framerate 1000\n`;return s;}
export function exportArgs({video,geometry,width,height,duration}){const input=video?['-stream_loop','-1','-i','background.media']:['-loop','1','-framerate','24','-i','background.png'];const bg=video?`scale=${geometry.width}:${geometry.height},crop=${width}:${height}:${geometry.x}:${geometry.y},setsar=1`:'setsar=1';return ['-hide_banner','-y',...input,'-f','concat','-safe','0','-i','slides.txt','-i','audio.wav','-filter_complex',`[0:v]${bg}[bg];[bg][1:v]overlay=0:0:eof_action=repeat,fps=24,format=yuv420p[v]`,'-map','[v]','-map','2:a:0','-t',duration.toFixed(9),'-c:v','libx264','-preset','ultrafast','-crf','23','-c:a','aac','-b:a','160k','-ar','48000','-ac','2','-movflags','+faststart','-threads','1','output.mp4'];}
export function encodeWav(segments,sampleRate){const channels=2;const frames=segments.reduce((n,s)=>n+s.buffer.length,0);const out=new ArrayBuffer(44+frames*channels*2),view=new DataView(out);const str=(at,s)=>{for(let i=0;i<s.length;i++)view.setUint8(at+i,s.charCodeAt(i));};str(0,'RIFF');view.setUint32(4,out.byteLength-8,true);str(8,'WAVE');str(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,channels,true);view.setUint32(24,sampleRate,true);view.setUint32(28,sampleRate*channels*2,true);view.setUint16(32,channels*2,true);view.setUint16(34,16,true);str(36,'data');view.setUint32(40,out.byteLength-44,true);let p=44;for(const s of segments){const left=s.buffer.getChannelData(0),right=s.buffer.getChannelData(Math.min(1,s.buffer.numberOfChannels-1));for(let i=0;i<s.buffer.length;i++){for(const samples of [left,right]){const x=Math.max(-1,Math.min(1,samples[i]));view.setInt16(p,x<0?x*32768:x*32767,true);p+=2;}}}return new Uint8Array(out);}
