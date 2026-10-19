#!/usr/bin/env node
/**
 * Maqbali Core v1.0.0 — zero-dependency static builder / validator.
 * Run from any directory: node core/build.mjs
 * Write allowlist: /new/index.html, /new/sitemap.html, /core/BUILD-REPORT.md ONLY.
 */
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { dirname, resolve, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = async p => readFile(join(root, p), 'utf8');
const exists = async p => { try { return (await stat(join(root, p))).isFile(); } catch { return false; } };
const escapeHTML = x => String(x).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const escapeAttr = escapeHTML;
const errors = [];
const warnings = [];
const passed = [];
const reportPath = 'core/BUILD-REPORT.md';
let targets = []; // Populated from the page registry. New pages need no builder edits.

function render(source, replacements) {
  const output = source.replace(/\{\{([A-Z_]+)\}\}/g, (full, key) => {
    if (!(key in replacements)) throw new Error(`متغير غير معروف في القالب: ${full}`);
    return replacements[key];
  });
  if (/\{\{[^{}]+\}\}/.test(output)) throw new Error('بقيت متغيرات في HTML الناتج');
  return output;
}
function checkPath(url) {
  if (typeof url !== 'string' || !url.startsWith('/') || url.startsWith('//') || url.includes('..') || /[?#]/.test(url)) {
    throw new Error(`مسار غير صالح في config/pages.json: ${url}`);
  }
}
function siteFile(url) {
  const clean = decodeURI(url).replace(/^\//, '');
  return url.endsWith('/') ? join(clean, 'index.html') : clean;
}
function card(page, hasNew) {
  return `<article class="site-map-card">\n` +
    `  <div class="site-map-card__top"><h3>${escapeHTML(page.title)}</h3><span class="site-map-card__status${hasNew ? ' site-map-card__status--preview' : ''}">${hasNew ? 'نسخة تجريبية' : 'لم تُحدّث'}</span></div>\n` +
    `  <p class="site-map-card__path" dir="ltr">${escapeHTML(page.oldPath)}</p>\n` +
    `  <div class="site-map-card__actions"><a class="site-map-card__link" href="${escapeAttr(page.oldPath)}">النسخة الحالية ↗</a>${hasNew ? `<a class="site-map-card__link site-map-card__link--preview" href="${escapeAttr(page.newPath)}">النسخة الجديدة ↗</a>` : ''}</div>\n` +
    `</article>`;
}
function section(heading, pages, ready) {
  const inner = pages.map(p => card(p, ready)).join('\n');
  return `<section class="site-map-section" aria-label="${escapeAttr(heading)}"><h2 class="site-map-section__title">${escapeHTML(heading)} <span class="site-map-section__count">${pages.length}</span></h2><div class="site-map-grid">${inner}</div></section>`;
}

async function run() {
  const registry = JSON.parse(await read('config/pages.json'));
  if (registry.schemaVersion !== 1 || !Array.isArray(registry.pages)) throw new Error('صيغة pages.json غير مدعومة');
  if (registry.coreVersion !== 'v1.0.0') throw new Error(`إصدار Core غير متوقع: ${registry.coreVersion}`);
  const ids = new Set();
  const oldPaths = new Set();
  const newPaths = new Set();
  for (const p of registry.pages) {
    if (!p.id || !p.title || !p.oldPath || ids.has(p.id)) throw new Error(`صفحة مكررة أو ناقصة: ${p.id}`);
    ids.add(p.id);
    checkPath(p.oldPath);
    if (oldPaths.has(p.oldPath)) throw new Error(`رابط أصلي مكرر: ${p.oldPath}`);
    oldPaths.add(p.oldPath);
    if (p.newPath) {
      checkPath(p.newPath);
      if (!p.newPath.startsWith('/new/')) throw new Error(`المسار التجريبي خارج /new/: ${p.newPath}`);
      if (newPaths.has(p.newPath)) throw new Error(`رابط تجريبي مكرر: ${p.newPath}`);
      newPaths.add(p.newPath);
      if (!siteFile(p.newPath).startsWith('new/') || !siteFile(p.newPath).endsWith('.html')) throw new Error(`مسار إنتاج غير مسموح: ${p.newPath}`);
    }
  }
  if (!newPaths.has('/new/') || !newPaths.has('/new/sitemap.html')) throw new Error('الرئيسية أو خريطة الموقع التجريبية غير مسجلة');
  const previewPages = registry.pages.filter(p => p.newPath);
  targets = previewPages.map(p => siteFile(p.newPath));
  passed.push(`سجل الصفحات: ${registry.pages.length} صفحة، دون مسارات مكررة`);
  for (const path of ['core/v1/core.css','core/v1/core.js','core/src/header.html','core/src/footer.html']) {
    if (!await exists(path)) errors.push(`ملف Core مفقود: ${path}`);
    else passed.push(`ملف Core موجود: ${path}`);
  }
  if (errors.length) throw new Error(errors.join('\n'));

  const headerTemplate = await read('core/src/header.html');
  const footer = await read('core/src/footer.html');
  const outputMap = new Map();
  for (const data of previewPages) {
    const id = data.id;
    const target = siteFile(data.newPath);
    if (!data || !data.pageTitle || !data.metaDescription || !data.canonicalUrl || !data.homeUrl || !data.sitemapUrl)
      throw new Error(`إعدادات الصفحة ${id} غير مكتملة في config/pages.json`);
    checkPath(data.homeUrl);
    checkPath(data.sitemapUrl);
    const input = await read(`templates/${id === 'home' ? 'index' : id}.html`);
    const header = render(headerTemplate, {HOME_URL:escapeAttr(data.homeUrl),SITEMAP_URL:escapeAttr(data.sitemapUrl)});
    const dynamic = {};
    if (id === 'sitemap') {
      const upgraded = previewPages;
      const legacy = registry.pages.filter(p => !p.newPath);
      dynamic.SITE_MAP_CONTENT = section('صفحات لها نسخة تجريبية', upgraded, true) + '\n' + section('صفحات لم تُحدّث بعد', legacy, false);
    }
    const output = render(input, {
      PAGE_TITLE: escapeHTML(data.pageTitle), PAGE_DESCRIPTION: escapeAttr(data.metaDescription),
      CANONICAL_URL: escapeAttr(data.canonicalUrl), HEADER:header, FOOTER:footer, ...dynamic
    });
    outputMap.set(target, output);
  }
  for (const [file, html] of outputMap) {
    if (!/<meta name="robots" content="noindex,follow">/.test(html)) errors.push(`مفقود noindex: ${file}`);
    if (!html.includes('class="site-topbar"') || !html.includes('class="site-footer"')) errors.push(`هيدر أو فوتر مفقود: ${file}`);
    if (!html.includes('/core/v1/core.css') || !html.includes('/core/v1/core.js')) errors.push(`ملفات Core غير مرتبطة: ${file}`);
    if (/\{\{.*?\}\}/.test(html)) errors.push(`متغير قالب غير مكتمل: ${file}`);
    for (const match of html.matchAll(/(?:href|src)="(\/[^"]+)"/g)) {
      const url = match[1].split('#')[0].split('?')[0];
      if (url.startsWith('//') || url.includes('..')) { errors.push(`رابط غير آمن: ${file} → ${url}`); continue; }
      const targetPath = siteFile(url);
      if (outputMap.has(targetPath) || await exists(targetPath)) continue;
      // Files already in the existing repo are preserved and intentionally not shipped.
      if (url.startsWith('/images/') || oldPaths.has(url)) {
        warnings.push(`يتطلب التحقق بعد الدمج مع المستودع الحالي: ${url}`);
      } else {
        errors.push(`رابط محلي مفقود: ${file} → ${url}`);
      }
    }
    passed.push(`فحص HTML: ${file} — الهيدر، الفوتر، Core، منع الفهرسة، المسارات`);
  }
  if (errors.length) throw new Error(errors.join('\n'));
  await mkdir(join(root, 'new'), { recursive:true });
  for (const [file, html] of outputMap) {
    await mkdir(dirname(join(root, file)), { recursive: true });
    await writeFile(join(root, file), html, 'utf8');
  }
  passed.push(`إنشاء ${outputMap.size} صفحة تجريبية داخل /new/ فقط`);
  return registry.pages.length;
}
async function main() {
  let count = 0;
  let failure = null;
  try { count = await run(); } catch (err) { failure = err; errors.push(err.message); }
  const warnUnique = [...new Set(warnings)];
  const now = new Date().toISOString();
  const lines = [
    '# Maqbali Core — تقرير البناء والفحص',
    '',
    `- التاريخ (UTC): ${now}`,
    '- إصدار Core: `v1.0.0`',
    `- النتيجة: **${failure ? 'فشل — لم تُنشر نسخة جاهزة' : 'نجاح — فحص الملفات المحلي'}**`,
    `- صفحات السجل: **${count || 'غير مكتمل'}**`,
    `- الصفحات المنتجة: ${targets.map(p => '`/' + p + '`').join('، ')}`,
    '',
    '## الفحوص الناجحة', ...passed.map(s=>`- ✅ ${s}`),
    '',
    '## أخطاء تمنع البناء', ...(errors.length ? errors.map(s=>`- ❌ ${s}`) : ['- لا توجد']),
    '',
    '## تحذيرات / تحقق بعد الرفع', ...(warnUnique.length ? warnUnique.map(s=>`- ⚠️ ${s}`) : ['- لا توجد']),
    '',
    '## حدود هذا الفحص',
    '- فحص الملفات محليًا لا يثبت أن الروابط الخارجية متاحة الآن، ولا يختبر وظائف المتصفح أو Cloudflare مباشرة.',
    '- عند تشغيل البناء قبل دمج الحزمة مع المستودع الأصلي قد تظهر تحذيرات للصور والصفحات القديمة لأنها ليست جزءًا من ZIP.',
    '- لا يتم تعديل `index.html` أو `sitemap.html` أو أي ملف في مجلد `tools/`.',
    ''
  ];
  await writeFile(join(root, reportPath), lines.join('\n'), 'utf8');
  console.log(`${failure ? 'FAILED' : 'SUCCESS'} — ${passed.length} checks, ${errors.length} errors, ${warnUnique.length} warnings`);
  console.log(`Report: ${join(root, reportPath)}`);
  if (failure) process.exitCode = 1;
}
await main();
