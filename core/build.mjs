#!/usr/bin/env node
/**
 * Maqbali Core v1 — static HTML builder (Node.js, no packages required).
 * Default: node core/build.mjs             -> publish registered official pages.
 * Optional: node core/build.mjs --preview   -> generate /new/ previews with noindex.
 * All output paths must be declared in config/pages.json; no Cloudflare build step.
 */
import {readFile,writeFile,stat,mkdir} from 'node:fs/promises';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const args=process.argv.slice(2);
if(args.length>1 || (args[0] && !['--production','--preview'].includes(args[0]))) {
  console.error('Usage: node core/build.mjs [--production|--preview]');process.exit(2);
}
const preview=args[0]==='--preview';
const reportPath='core/BUILD-REPORT.md';
const check=[];const errors=[];const warnings=[];
const esc=x=>String(x).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const read=p=>readFile(join(root,p),'utf8');
const exists=async p=>{try{return (await stat(join(root,p))).isFile()}catch{return false}};
const render=(text,vars)=>{
  const html=text.replace(/\{\{([A-Z_]+)\}\}/g,(full,key)=>{
    if(!(key in vars)) throw new Error(`متغير القالب غير معروف: ${full}`);
    return vars[key];
  });
  if(/\{\{[^{}]*\}\}/.test(html))throw new Error('بقيت متغيرات قالب غير مكتملة');
  return html;
};
const assertPath=url=>{
  if(typeof url!=='string'||!url.startsWith('/')||url.startsWith('//')||/[?#\\]/.test(url)||url.includes('..')||url.includes('%')||url.includes('//'))
    throw new Error(`مسار غير مسموح: ${String(url)}`);
};
const siteFile=url=>{
  assertPath(url);
  return url==='/'?'index.html':url.endsWith('/')?url.slice(1)+'index.html':url.slice(1);
};
const card=(p,previewMode=false,hasPreview=false)=>{
  const link=previewMode?'النسخة الحالية ↗':'فتح الصفحة ↗';
  const other=previewMode&&hasPreview?`<a class="site-map-card__link site-map-card__link--preview" href="${esc(p.newPath)}">النسخة التجريبية ↗</a>`:'';
  const status=previewMode?`<span class="site-map-card__status">${hasPreview?'تتوفر معاينة':'المسار الرسمي'}</span>`:'';
  return `<article class="site-map-card"><div class="site-map-card__top"><h3>${esc(p.title)}</h3>${status}</div>`+
  `<p class="site-map-card__path" dir="ltr">${esc(p.oldPath)}</p>`+
  `<div class="site-map-card__actions"><a class="site-map-card__link" href="${esc(p.oldPath)}">${link}</a>${other}</div></article>`;
};
const section=(name,list,previewMode=false)=>list.length?`<section class="site-map-section" aria-label="${esc(name)}">`+
  `<h2 class="site-map-section__title">${esc(name)} <span class="site-map-section__count">${list.length}</span></h2>`+
  `<div class="site-map-grid">${list.map(p=>card(p,previewMode,Boolean(p.newPath))).join('\n')}</div></section>`:'';
function sitemapContent(pages,mode){
  if(mode==='preview') return section('صفحات تتوفر لها نسخة تجريبية',pages.filter(p=>p.newPath),true)+'\n'+
    section('صفحات أخرى',pages.filter(p=>!p.newPath),true);
  const groups=[
    ['الصفحات الأساسية',['home','sitemap','contact','videos','sahban']],
    ['الأدوات والخدمات',['tools','quran','currency','pr','ip','speed','nfc-tools','flaticon-icons-preview']],
    ['النشرات والمتابعة',['news','cves','dji']],
    ['صفحات أخرى',['flowers']]
  ];
  const byId=new Map(pages.map(p=>[p.id,p]));
  const used=new Set();
  const parts=groups.map(([name,ids])=>section(name,ids.filter(id=>byId.has(id)).map(id=>{used.add(id);return byId.get(id)})));
  const remainder=pages.filter(p=>!used.has(p.id));
  if(remainder.length)parts.push(section('صفحات إضافية',remainder));
  return parts.join('\n');
}
async function run(){
  const config=JSON.parse(await read('config/pages.json'));
  if(config.schemaVersion!==1||config.coreVersion!=='v1.0.0'||!Array.isArray(config.pages))throw new Error('ملف pages.json غير متوافق');
  const ids=new Set(),oldPaths=new Set(),newPaths=new Set();
  for(const p of config.pages){
    if(!/^[a-z0-9-]+$/.test(p.id||'')||!p.title||!p.oldPath||ids.has(p.id))throw new Error(`صفحة غير صالحة أو مكررة: ${p.id}`);
    ids.add(p.id);assertPath(p.oldPath);
    if(oldPaths.has(p.oldPath))throw new Error(`مسار رسمي مكرر: ${p.oldPath}`);oldPaths.add(p.oldPath);
    if(p.newPath){assertPath(p.newPath);if(!p.newPath.startsWith('/new/'))throw new Error(`خارج مجلد التجربة: ${p.newPath}`);
      if(newPaths.has(p.newPath))throw new Error(`مسار تجربة مكرر: ${p.newPath}`);newPaths.add(p.newPath);}
    if(p.published!==undefined && typeof p.published!=='boolean')throw new Error(`حالة النشر غير صالحة: ${p.id}`);
  }
  const official=config.pages.filter(p=>p.published);
  if(!official.some(p=>p.id==='home')||!official.some(p=>p.id==='sitemap'))throw new Error('الرئيسية وخريطة الموقع الرسميتان يجب أن تكونا منشورتين');
  const selected=preview?config.pages.filter(p=>p.newPath):official;
  const targets=selected.map(p=>siteFile(preview?p.newPath:p.oldPath));
  const targetSet=new Set(targets);
  if(targetSet.size!==targets.length)throw new Error('تكرار اسم ملف في الناتج');
  if(selected.length===0)throw new Error('لا توجد صفحات مسجلة للبناء');
  const needs=['core/v1/core.css','core/v1/core.js','core/src/header.html','core/src/footer.html'];
  for(const file of needs){if(!await exists(file))throw new Error(`ملف Core مفقود: ${file}`);check.push(`تم العثور على ${file}`)}
  const [header,footer]=await Promise.all([read('core/src/header.html'),read('core/src/footer.html')]);
  const built=new Map();
  for(const p of selected){
    if(!p.pageTitle||!p.metaDescription||!p.canonicalUrl)throw new Error(`بيانات SEO ناقصة: ${p.id}`);
    const url=preview?p.newPath:p.oldPath;
    const file=siteFile(url);
    if(preview && !file.startsWith('new/'))throw new Error(`مسار تجربة غير مسموح: ${file}`);
    if(!preview && !(file==='index.html'||file==='sitemap.html'||file==='tools/index.html'||/^[a-z0-9-]+\.html$/.test(file)))
      throw new Error(`تعديل خارج المسارات الرسمية المسموحة: ${file}`);
    const templateFile=`templates/${p.id==='home'?'index':p.id}.html`;
    const source=await read(templateFile);
    const home=preview?(p.previewHomeUrl||'/new/'):(p.homeUrl||'/');
    const sitemap=preview?(p.previewSitemapUrl||'/new/sitemap.html'):(p.sitemapUrl||'/sitemap.html');
    assertPath(home);assertPath(sitemap);
    const html=render(source,{
      PAGE_TITLE:esc(p.pageTitle),PAGE_DESCRIPTION:esc(p.metaDescription),CANONICAL_URL:esc(p.canonicalUrl),
      ROBOTS_CONTENT:preview?'noindex,follow':'index,follow',
      HEADER:render(header,{HOME_URL:home,SITEMAP_URL:sitemap}),FOOTER:footer,
      SITE_MAP_CONTENT:p.id==='sitemap'?sitemapContent(config.pages,preview?'preview':'production'):'',
      SITEMAP_DESCRIPTION:preview?'استعرض صفحات الموقع وقارن المسارات الحالية والتجريبية.':'تصفح صفحات الموقع وأدواته وخدماته من مكان واحد.'
    });
    built.set(file,html);
  }
  for(const [file,html] of built){
    const mode=preview?'noindex,follow':'index,follow';
    if(!html.includes(`<meta name="robots" content="${mode}">`))errors.push(`وسم robots غير صحيح: ${file}`);
    if(!html.includes('class="site-topbar"')||!html.includes('class="site-footer"'))errors.push(`الغلاف المركزي مفقود: ${file}`);
    if(!html.includes('/core/v1/core.css')||!html.includes('/core/v1/core.js'))errors.push(`ملفات Core مفقودة: ${file}`);
    if(/\{\{[^{}]*\}\}/.test(html))errors.push(`قالب غير مكتمل: ${file}`);
    if(/href="\/new\//.test(html)&&!preview)errors.push(`رابط تجريبي على صفحة رسمية: ${file}`);
    if(!preview && file==='tools/index.html'){
      if((html.match(/<main(?:\s|>)/g)||[]).length!==1)errors.push('صفحة tools تحتوي عناصر main متعددة');
      if(!html.includes('href="/tools/quran/"'))errors.push('رابط أداة التلاوة مفقود');
    }
    for(const match of html.matchAll(/(?:href|src)="(\/[^"#?]+)(?:[?#][^"]*)?"/g)){
      const url=match[1];
      try{assertPath(url)}catch{errors.push(`رابط غير آمن في ${file}: ${url}`);continue}
      const asset=siteFile(url);
      if(built.has(asset)||await exists(asset))continue;
      if(oldPaths.has(url)||url.startsWith('/images/'))warnings.push(`تحقق من ملف الموقع الأصلي بعد الرفع: ${url}`);
      else errors.push(`رابط محلي مفقود: ${file} → ${url}`);
    }
    check.push(`صفحة ${file}: روابط Core والهيدر والفوتر وSEO سليمة`);
  }
  if(errors.length)throw new Error(errors.join('\n'));
  for(const [file,html] of built){const target=join(root,file);await mkdir(dirname(target),{recursive:true});await writeFile(target,html,'utf8')}
  check.push(`${built.size} صفحات ${preview?'تجريبية':'رسمية'} أُنتجت من القوالب المركزية`);
  return targets;
}
let failure=null,targets=[];
try{targets=await run()}catch(error){failure=error;errors.push(error.message)}
const lines=[
 '# تقرير Maqbali Core — التجميع',
 '',
 `- التاريخ UTC: ${new Date().toISOString()}`,
 '- الإصدار: v1.0.0',
 `- النمط: ${preview?'تجريبي /new/':'النشر الرسمي'}`,
 `- النتيجة: ${failure?'فشل':'نجاح'}`,
 `- الملفات الناتجة: ${targets.map(x=>'`'+x+'`').join('، ')}`,
 '',
 '## الفحوص',...check.map(x=>'- ✅ '+x),
 '',
 '## الأخطاء',...(errors.length?errors.map(x=>'- ❌ '+x):['- لا توجد']),
 '',
 '## التحذيرات',...([...new Set(warnings)].map(x=>'- ⚠️ '+x).length?[...new Set(warnings)].map(x=>'- ⚠️ '+x):['- لا توجد']),
 '',
 '## ملاحظات',
 '- هذا فحص ملفات محلي؛ لا يثبت استجابة خدمات API الخارجية أو نجاح نشر Cloudflare.',
 '- المسارات القديمة التي لم تُرقَّ تخدمها ملفات المستودع الحالية، ولا يُعاد توليدها.',
 '- لم يتم تعديل إعدادات Cloudflare أو مجلد أدوات التلاوة.',
 ''
];
await writeFile(join(root,reportPath),lines.join('\n'),'utf8');
console.log(`${failure?'FAILED':'SUCCESS'} — ${check.length} checks, ${errors.length} errors, ${new Set(warnings).size} warnings`);
if(failure)process.exitCode=1;
