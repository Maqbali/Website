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
export const DEFAULTS={surah:2,from:3,to:3,reciter:'Husary_128kbps',background:'mountains',ratio:'portrait',quality:720,color:'#ffffff',fontSize:60,position:'center',dim:40,zoom:100,bgX:50,bgY:50,lineHeight:1.9,margin:8,roundedCorners:false};
export const arabic=n=>String(n).replace(/\d/g,d=>'٠١٢٣٤٥٦٧٨٩'[d]);
export const plainArabic=s=>s.normalize('NFC').replace(/\p{M}/gu,'').replace(/[ـ\u200B-\u200F\uFEFF]/g,'').replace(/ٱ/g,'ا');
export const normalize=s=>plainArabic(s).normalize('NFD').replace(/\p{M}/gu,'').replace(/ة/g,'ه').toLowerCase().replace(/\s+/g,' ').trim();
export function dimensions(ratio,quality){const q=Number(quality);return ratio==='landscape'?[q*16/9,q].map(Math.round):ratio==='square'?[q,q]:[q,Math.round(q*16/9)];}
export function validateRange(surah,from,to){if(!Number.isInteger(from)||!Number.isInteger(to)||from<1||to<from||to>surah.ayahs.length)throw Error('اختر نطاق آيات صحيحًا من ١ إلى '+arabic(surah.ayahs.length)+'.');return surah.ayahs.slice(from-1,to);}
export function wrapLines(ctx,text,width){const words=text.split(/\s+/),lines=[];let line='';for(const word of words){const test=line?line+' '+word:word;if(line&&ctx.measureText(test).width>width){lines.push(line);line=word;}else line=test;}if(line)lines.push(line);return lines;}
export function layoutText(ctx,text,w,h,settings){const margin=w*settings.margin/100;const maxW=w-2*margin;const top=h*.14,bottom=h*.84;let size=settings.fontSize*w/1080;let lines;for(let i=0;i<150;i++){ctx.font=`${size}px Quran`;lines=wrapLines(ctx,text,maxW);if(lines.length*size*settings.lineHeight<bottom-top&&lines.every(l=>ctx.measureText(l).width<=maxW))break;size*=.965;}const step=size*settings.lineHeight;const height=lines.length*step;const y=settings.position==='top'?top:settings.position==='bottom'?bottom-height:(top+bottom-height)/2;return {lines,size,step,y,margin};}
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
export function drawOverlay(ctx,ayah,w,h,settings){
 ctx.clearRect(0,0,w,h);ctx.fillStyle=`rgba(0,0,0,${settings.dim/100})`;ctx.fillRect(0,0,w,h);
 let layout;
 if(ayah){
  const text=ayah.text+' \u06DD'+arabic(ayah.numberInSurah);
  layout=layoutText(ctx,text,w,h,settings);
  ctx.font=`${layout.size}px Quran`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.direction='rtl';ctx.fillStyle=settings.color;
  ctx.shadowColor='rgba(0,0,0,.6)';ctx.shadowBlur=w/270;ctx.shadowOffsetY=1;
  for(let i=0;i<layout.lines.length;i++)ctx.fillText(layout.lines[i],w/2,layout.y+layout.step*(i+.5));
  ctx.shadowBlur=0;ctx.shadowOffsetY=0;
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
