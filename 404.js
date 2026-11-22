/* Maqbali 404 — external countdown script, compatible with CSP script-src 'self'. */
(() => {
  'use strict';

  const countdown = document.getElementById('countdown');
  if (!countdown) return;

  const durationMs = 10_000;
  const deadline = Date.now() + durationMs;
  let timer;

  const tick = () => {
    const seconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
    countdown.textContent = String(seconds);

    if (seconds === 0) {
      window.clearInterval(timer);
      window.location.replace('/');
    }
  };

  tick();
  timer = window.setInterval(tick, 200);
})();
