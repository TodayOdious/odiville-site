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

      gate.addEventListener('transitionend', function cleanup() {
        gate.removeEventListener('transitionend', cleanup);
        gate.remove();
        document.body.style.overflow = '';
        sessionStorage.setItem('gate-passed', '1');
      });
    }, 1500);
  }

  function onKey(e) {
    if (e.key === 'Enter' || e.key === ' ') enter();
  }

  gate.addEventListener('click', enter);
  gate.addEventListener('keydown', onKey);
})();
