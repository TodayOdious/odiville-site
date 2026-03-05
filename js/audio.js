(function () {
  'use strict';

  const AUDIO_SRC = 'audio/ambient.mp3';
  const FADE_MS   = 2500;
  const MAX_VOL   = 0.28;

  const toggle = document.getElementById('audioToggle');
  if (!toggle) return;

  let audio   = null;
  let playing = false;
  let fadeRaf = null;

  function getAudio() {
    if (!audio) {
      audio = new Audio(AUDIO_SRC);
      audio.loop = true;
      audio.volume = 0;
      audio.preload = 'none';
    }
    return audio;
  }

  function cancelFade() {
    if (fadeRaf) { cancelAnimationFrame(fadeRaf); fadeRaf = null; }
  }

  function fadeTo(target, onDone) {
    cancelFade();
    const a = getAudio();
    const start = performance.now();
    const from  = a.volume;

    function tick(now) {
      const t = Math.min((now - start) / FADE_MS, 1);
      a.volume = from + (target - from) * t;
      if (t < 1) {
        fadeRaf = requestAnimationFrame(tick);
      } else {
        fadeRaf = null;
        if (onDone) onDone();
      }
    }
    fadeRaf = requestAnimationFrame(tick);
  }

  function setPlaying(on) {
    playing = on;
    toggle.classList.toggle('playing', on);
    toggle.setAttribute('aria-label', on ? 'Mute ambient audio' : 'Play ambient audio');
  }

  toggle.addEventListener('click', () => {
    if (!playing) {
      const a = getAudio();
      setPlaying(true);
      a.play().then(() => {
        fadeTo(MAX_VOL);
      }).catch(() => {
        // File not available yet — silently revert
        setPlaying(false);
      });
    } else {
      fadeTo(0, () => {
        getAudio().pause();
        setPlaying(false);
      });
    }
  });
})();
