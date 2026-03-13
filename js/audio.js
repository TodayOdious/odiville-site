(function () {
  'use strict';

  /* ── Track list — edit names/src freely ──────────────────── */
  var TRACKS = [
    { name: '1', src: 'audio/empty-paths.mp3'       },
    { name: '2', src: 'audio/hidden-towns.mp3'      },
    { name: '3', src: 'audio/laisse-moi-partir.mp3' },
    { name: '4', src: 'audio/barren.mp3'            },
    { name: '5', src: 'audio/beach-walking.mp3'     },
    { name: '6', src: 'audio/material-light.mp3'    },
  ];

  var FADE_MS  = 900;
  var MAX_VOL  = 0.28; // initial volume (0–1), synced with slider value=28

  /* ── State ───────────────────────────────────────────────── */
  var trackIdx = 0;
  var playing  = false;
  var audio    = null;
  var fadeRaf  = null;
  var targetVol = MAX_VOL;

  /* ── Elements ────────────────────────────────────────────── */
  var player   = document.getElementById('voidPlayer');
  var btnPlay  = document.getElementById('voidPlay');
  var btnPrev  = document.getElementById('voidPrev');
  var btnNext  = document.getElementById('voidNext');
  var numEl    = document.getElementById('voidTrackNum');
  var volSlider= document.getElementById('voidVol');

  if (!player || !btnPlay) return;

  /* ── Audio helpers ───────────────────────────────────────── */

  function createAudio(src) {
    var a = new Audio(src);
    a.loop  = false;
    a.volume = 0;
    a.preload = 'auto';
    a.addEventListener('ended', function () { nextTrack(1); });
    return a;
  }

  function cancelFade() {
    if (fadeRaf) { cancelAnimationFrame(fadeRaf); fadeRaf = null; }
  }

  function fadeTo(a, target, ms, onDone) {
    cancelFade();
    var start = performance.now();
    var from  = a.volume;
    (function tick(now) {
      var t = Math.min((now - start) / ms, 1);
      a.volume = from + (target - from) * t;
      if (t < 1) {
        fadeRaf = requestAnimationFrame(tick);
      } else {
        fadeRaf = null;
        if (onDone) onDone();
      }
    })(performance.now());
  }

  /* ── Track management ────────────────────────────────────── */

  function loadTrack(idx, autoplay) {
    cancelFade();
    if (audio) { audio.pause(); audio.src = ''; audio = null; }
    trackIdx = ((idx % TRACKS.length) + TRACKS.length) % TRACKS.length;
    audio = createAudio(TRACKS[trackIdx].src);
    updateUI();
    if (autoplay) {
      audio.play().then(function () {
        fadeTo(audio, targetVol, FADE_MS);
        setPlaying(true);
      }).catch(function () { setPlaying(false); });
    }
  }

  function nextTrack(dir) {
    loadTrack(trackIdx + (dir || 1), playing);
  }

  /* ── UI state ────────────────────────────────────────────── */

  function setPlaying(on) {
    playing = on;
    player.classList.toggle('playing', on);
    btnPlay.setAttribute('aria-label', on ? 'Pause' : 'Play');
  }

  function updateUI() {
    numEl.textContent = (trackIdx + 1) + ' / ' + TRACKS.length;
  }

  /* ── Controls ────────────────────────────────────────────── */

  btnPlay.addEventListener('click', function () {
    if (!audio) audio = createAudio(TRACKS[trackIdx].src);
    if (!playing) {
      audio.play().then(function () {
        fadeTo(audio, targetVol, FADE_MS);
        setPlaying(true);
      }).catch(function () { setPlaying(false); });
    } else {
      setPlaying(false);
      fadeTo(audio, 0, FADE_MS * 0.35, function () {
        audio.pause();
      });
    }
  });

  btnPrev.addEventListener('click', function () { nextTrack(-1); });
  btnNext.addEventListener('click', function () { nextTrack(1);  });

  volSlider.addEventListener('input', function () {
    targetVol = parseInt(this.value, 10) / 100;
    if (audio && playing) audio.volume = targetVol;
    // Update CSS custom property for track fill
    this.style.setProperty('--val', this.value + '%');
  });

  /* ── Init ────────────────────────────────────────────────── */
  updateUI();
  volSlider.style.setProperty('--val', volSlider.value + '%');

})();
