/* Maqbali Core v1.0.0 — independent theme controller, no tool dependencies. */
(() => {
  'use strict';
  const storageKey = 'theme'; // compatible with the existing tools/theme.js key
  const root = document.documentElement;
  const media = window.matchMedia?.('(prefers-color-scheme: dark)');
  let savedTheme = null;
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved === 'light' || saved === 'dark') savedTheme = saved;
  } catch (_) { /* Browser storage can be unavailable. */ }

  function preferredTheme() {
    return savedTheme || (media?.matches ? 'dark' : 'light');
  }

  function applyTheme() {
    const theme = preferredTheme();
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'light' ? '#f5f0e8' : '#0a0a0a');
    const button = document.getElementById('themeToggle');
    if (button) {
      const label = theme === 'light' ? 'تفعيل المظهر الداكن' : 'تفعيل المظهر الفاتح';
      button.setAttribute('aria-label', label);
      button.setAttribute('aria-pressed', String(theme === 'light'));
      button.setAttribute('title', label);
    }
  }

  applyTheme();
  document.addEventListener('DOMContentLoaded', () => {
    applyTheme();
    document.getElementById('themeToggle')?.addEventListener('click', () => {
      savedTheme = preferredTheme() === 'light' ? 'dark' : 'light';
      try { localStorage.setItem(storageKey, savedTheme); } catch (_) { /* Continue without storage. */ }
      applyTheme();
    });
  }, { once: true });
  media?.addEventListener?.('change', () => { if (!savedTheme) applyTheme(); });
  window.addEventListener('storage', (event) => {
    if (event.key !== storageKey && event.key !== null) return;
    let value = event.newValue;
    if (event.key === null) {
      try { value = localStorage.getItem(storageKey); } catch (_) { value = null; }
    }
    savedTheme = value === 'light' || value === 'dark' ? value : null;
    applyTheme();
  });
})();
