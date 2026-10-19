(() => {
  const storageKey = 'theme';
  const defaultTheme = document.documentElement.dataset.defaultTheme === 'light' ? 'light' : 'dark';
  let theme = defaultTheme;
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved === 'light' || saved === 'dark') theme = saved;
  } catch {}

  function applyTheme(value) {
    theme = value === 'light' || value === 'dark' ? value : defaultTheme;
    document.documentElement.dataset.theme = theme;
    const light = theme === 'light';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', light ? '#f5f0e8' : '#0a0a0a');
    const button = document.getElementById('themeToggle');
    if (button) {
      button.setAttribute('aria-pressed', String(light));
      button.title = light ? 'تفعيل المظهر الداكن' : 'تفعيل المظهر الفاتح';
    }
  }

  applyTheme(theme);
  document.addEventListener('DOMContentLoaded', () => {
    applyTheme(theme);
    document.getElementById('themeToggle')?.addEventListener('click', () => {
      applyTheme(theme === 'light' ? 'dark' : 'light');
      try { localStorage.setItem(storageKey, theme); } catch {}
    });
  }, {once: true});

  window.addEventListener('storage', event => {
    if (event.key === storageKey || event.key === null) applyTheme(event.newValue);
  });
})();
