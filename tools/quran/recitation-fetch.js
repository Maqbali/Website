const labels={timing:'بيانات التوقيت',audio:'صوت التلاوة',source:'بيانات مصدر التلاوة'};
function failure(stage,status,cause){
 const label=labels[stage];
 return Object.assign(Error(status===429
  ? 'مصدر '+label+' مشغول حاليًا. أعد المحاولة بعد قليل.'
  : 'تعذّر تحميل '+label+'. أعد المحاولة.',{cause}),{stage,status});
}
function retryDelay(signal){
 return new Promise((resolve,reject)=>{
  signal?.throwIfAborted();
  const stop=()=>{clearTimeout(timer);reject(signal.reason);};
  const timer=setTimeout(()=>{signal?.removeEventListener('abort',stop);resolve();},350);
  signal?.addEventListener('abort',stop,{once:true});
 });
}
// Retry only the failed request; validated metadata and saved audio stay reusable.
export async function readRecitation(url,options,stage,read){
 const {signal}=options;
 for(let attempt=0;;attempt++){
  signal?.throwIfAborted();
  try{
   const response=await fetch(url,{credentials:'omit',...options,...attempt?{cache:'no-store'}:{}});
   if(!response.ok){
    response.body?.cancel().catch(()=>{});
    throw failure(stage,response.status);
   }
   const result=await read(response);
   signal?.throwIfAborted();
   return result;
  }catch(e){
   signal?.throwIfAborted();
   if(e.name==='AbortError')throw e;
   const transient=e instanceof TypeError||e.status===408||(e.status>=500&&e.status<600);
   if(attempt||!transient)throw e.stage?e:failure(stage,null,e);
   await retryDelay(signal);
  }
 }
}
