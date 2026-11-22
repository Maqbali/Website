/* DHARW landing page — website v0.1.3. Reads one central, same-origin package manifest. */
(() => {
  'use strict';
  const paths = {
    computer: {
      title: 'من الهاتف إلى الكمبيوتر',
      description: 'اختر ملفاتك من الهاتف واستقبلها على الكمبيوتر باستخدام ذَرْو داخل الشبكة المحلية.',
      counter: '01 / 02'
    },
    tv: {
      title: 'من الهاتف إلى التلفزيون عبر الكمبيوتر',
      description: 'الهاتف يرسل الملف إلى الكمبيوتر؛ ذَرْو يمرّره إلى التلفزيون، الذي يستقبل فقط. الملفات المخصصة للتلفزيون مؤقتة حتى نهاية الجلسة.',
      counter: '02 / 02'
    }
  };
  const routeButtons = document.querySelectorAll('[data-route]');
  const tvLeg = document.querySelector('[data-tv-leg]');
  const tvDevice = document.querySelector('[data-tv-device]');
  const routeTitle = document.getElementById('routeTitle');
  const routeDescription = document.getElementById('routeDescription');
  const routeCounter = document.querySelector('.dh-route-counter');
  function selectRoute(mode) {
    const route = paths[mode];
    if (!route) return;
    routeButtons.forEach(button => {
      const active = button.dataset.route === mode;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    const showTv = mode === 'tv';
    tvLeg?.classList.toggle('is-off', !showTv);
    tvDevice?.classList.toggle('is-off', !showTv);
    if (routeTitle) routeTitle.textContent = route.title;
    if (routeDescription) routeDescription.textContent = route.description;
    if (routeCounter) routeCounter.textContent = route.counter;
  }
  routeButtons.forEach(button => button.addEventListener('click', () => selectRoute(button.dataset.route)));
  selectRoute('computer');
  const dialogs = Object.fromEntries(Array.from(document.querySelectorAll('dialog.dh-dialog')).map(d => [d.id, d]));
  function openDialog(dialog) {
    if (!dialog) return;
    if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', '');
  }
  document.querySelectorAll('[data-open-dialog]').forEach(button => button.addEventListener('click', () => openDialog(dialogs[button.dataset.openDialog])));
  document.querySelectorAll('[data-close-dialog]').forEach(button => button.addEventListener('click', () => button.closest('dialog')?.close()));
  document.querySelectorAll('dialog.dh-dialog').forEach(dialog => dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  }));
  // A single, read-only central index controls all Maqbali tool packages.
  // Never list the packages directory or guess the latest version from filenames.
  const latestManifestUrl = '/tools/packages/latest.json';
  const packagesBasePath = '/tools/packages/';
  const downloadButton = document.getElementById('downloadButton');
  const downloadMessage = document.getElementById('downloadDialogMessage');
  const defaultErrorMessage = 'ملف ذَرْو غير متاح حاليًا. تأكد من وجود tools/packages/latest.json وملف البرنامج في tools/packages/.';
  function showDownloadError(message = defaultErrorMessage) {
    if (downloadMessage) downloadMessage.textContent = message;
    openDialog(dialogs.downloadDialog);
  }
  const versionPattern = /^[0-9]+\.[0-9]+\.[0-9]+$/;
  function safePackageName(filename) {
    return typeof filename === 'string' && /^DHARW_v[0-9]+(?:\.[0-9]+){2}\.exe$/i.test(filename) && filename.length < 100;
  }
  function validPackageRecord(record) {
    return record && typeof record === 'object' && safePackageName(record.filename) &&
      typeof record.display_version === 'string' && versionPattern.test(record.display_version) &&
      typeof record.package_version === 'string' && versionPattern.test(record.package_version) &&
      record.filename.toLowerCase() === `dharw_v${record.package_version}.exe`.toLowerCase();
  }
  let recordPromise;
  async function loadLatestPackage() {
    if (!recordPromise) {
      recordPromise = (async () => {
        const response = await fetch(latestManifestUrl, {cache:'no-store', credentials:'same-origin'});
        if (!response.ok) throw new Error('manifest_unavailable');
        const type = (response.headers.get('content-type') || '').toLowerCase();
        if (type && !type.includes('json')) throw new Error('manifest_wrong_mime');
        const payload = await response.json();
        const record = payload?.apps?.dharw;
        if (payload?.schema_version !== 1 || !validPackageRecord(record)) throw new Error('invalid_manifest');
        return record;
      })().catch(error => {
        recordPromise = undefined; // Allow retry after a temporary error.
        throw error;
      });
    }
    return recordPromise;
  }
  function applyPublicVersion(record) {
    document.querySelectorAll('[data-dharw-public-version]').forEach(el => {
      el.textContent = `v${record.display_version}`;
    });
  }
  function fileUrl(record) {
    // Encode the *basename* only: disallow arbitrary directories, external URLs and path traversal.
    return packagesBasePath + encodeURIComponent(record.filename);
  }
  async function packageExists(url) {
    const response = await fetch(url, {method:'HEAD', cache:'no-store',credentials:'same-origin'});
    if (!response.ok) return false;
    const mime = (response.headers.get('content-type') || '').toLowerCase();
    return !mime.includes('text/html') && !mime.includes('application/json');
  }
  // Versions shown throughout the page are loaded from the single central manifest;
  // detailed release notes are intentionally curated separately from the EXE build number.
  loadLatestPackage().then(applyPublicVersion).catch(() => { /* Initial public version remains visible offline. */ });
  downloadButton?.addEventListener('click', async () => {
    if (downloadButton.disabled) return;
    downloadButton.disabled = true;
    downloadButton.setAttribute('aria-busy', 'true');
    try {
      const record = await loadLatestPackage();
      applyPublicVersion(record);
      const url = fileUrl(record);
      if (!(await packageExists(url))) {
        showDownloadError('تم العثور على بيانات الإصدار، لكن ملف EXE غير متاح في tools/packages/. تحقق من اسم الملف والمسار.');
        return;
      }
      // Same-origin static EXE: the browser handles the actual download.
      // Keep a usable link for browsers that block scripted navigation.
      window.location.assign(url);
    } catch (_) {
      showDownloadError();
    } finally {
      downloadButton.disabled = false;
      downloadButton.removeAttribute('aria-busy');
    }
  });
})();
