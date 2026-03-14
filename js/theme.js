(function () {
  'use strict';

  var KEY = 'odiville-theme';

  /* ── Apply saved theme immediately (called from inline <head> script too) ── */
  var saved = localStorage.getItem(KEY);
  if (saved === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
  }

  /* ── Wait for DOM ─────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', function () {
    var btn = document.getElementById('theme-toggle');
    if (!btn) return;

    function current() {
      return document.documentElement.getAttribute('data-theme') || 'dark';
    }

    function flipTheme(theme, instant) {
      if (!instant) document.documentElement.classList.add('theme-transition');
      if (theme === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
      } else {
        document.documentElement.removeAttribute('data-theme');
      }
      localStorage.setItem(KEY, theme);
      btn.setAttribute('aria-label', theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode');
      if (!instant) {
        setTimeout(function () {
          document.documentElement.classList.remove('theme-transition');
        }, 500);
      }
      // Re-init torch cards so they hide/show based on theme
      if (typeof initTorchCards === 'function') initTorchCards();
    }

    function apply(theme) {
      if (typeof window.voidTransition === 'function') {
        window.voidTransition(theme, function () { flipTheme(theme, true); });
      } else {
        flipTheme(theme, false);
      }
    }

    btn.addEventListener('click', function () {
      apply(current() === 'light' ? 'dark' : 'light');
    });

    /* Set initial aria-label */
    btn.setAttribute('aria-label', current() === 'light' ? 'Switch to dark mode' : 'Switch to light mode');
  });
})();
