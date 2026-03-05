(function () {
  'use strict';

  const gate = document.getElementById('gate');
  if (!gate) return;

  if (sessionStorage.getItem('gate-passed')) {
    gate.remove();
    return;
  }

  document.body.style.overflow = 'hidden';

  /* ── Enter ── */
  function enter() {
    gate.removeEventListener('click', enter);
    gate.removeEventListener('keydown', onKey);

    // Fade text out
    const content = gate.querySelector('.gate-content');
    if (content) {
      content.style.transition = 'opacity 1.4s ease';
      content.style.opacity = '0';
    }

    // After text fades, fade the black gate overlay out to reveal the page
    setTimeout(function () {
      gate.style.transition = 'opacity 2s ease';
      gate.style.opacity = '0';

      var done = false;
      function cleanup() {
        if (done) return;
        done = true;
        gate.removeEventListener('transitionend', onEnd);
        gate.remove();
        document.body.style.overflow = '';
        sessionStorage.setItem('gate-passed', '1');
      }
      function onEnd(e) {
        if (e.target === gate && e.propertyName === 'opacity') cleanup();
      }
      gate.addEventListener('transitionend', onEnd);
      // Fallback in case transitionend doesn't fire (reduced-motion, etc.)
      setTimeout(cleanup, 2200);
    }, 1500);
  }

  function onKey(e) {
    if (e.key === 'Enter' || e.key === ' ') enter();
  }

  gate.addEventListener('click', enter);
  gate.addEventListener('keydown', onKey);
})();
