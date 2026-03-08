(function () {
  'use strict';

  var canvas, ctx;
  var particles   = [];
  var inventory   = [];
  var listings    = {};
  var tooltip     = null;
  var hoveredIdx  = -1;
  var animId      = null;
  var initialized = false;

  var LISTINGS_API_URL = 'https://odiville-site.vercel.app/api/listings';

  var centerX, centerY;

  // Physics
  var GRAVITY   = 22;     // very low = very slow, dreamlike orbits
  var ORBIT_F   = 0.0004; // tangential push scaled with gravity
  var DAMPING   = 0.995;  // gentle energy drain — keeps orbits from wandering too far
  var BH_R        = 16;   // black hole consumption threshold (small)
  var BH_VIS_R    = 10;   // visual radius of the void (small)
  var BH_DIM_ZONE = 90;   // distance at which stars begin to dim toward the black hole
  var FADE_OUT_T  = 0.4;  // seconds to dissolve into the black hole
  var HOLD_T      = 0.4;  // seconds held invisible at center
  var FADE_IN_T   = 0.7;  // seconds to materialise back in the outer ring

  /* ── Public init ─────────────────────────────────────────── */

  window.initMarket = function () {
    if (initialized) { onResize(); return; }
    initialized = true;

    canvas = document.getElementById('marketCanvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');

    tooltip = document.createElement('div');
    tooltip.className = 'market-tooltip';
    document.body.appendChild(tooltip);

    resizeCanvas();
    window.addEventListener('resize', onResize);
    canvas.addEventListener('click',     onCanvasClick);
    canvas.addEventListener('mousemove', onCanvasMove);
    canvas.addEventListener('mouseleave', onCanvasLeave);

    loadData();
  };

  /* ── Data ────────────────────────────────────────────────── */

  function loadData() {
    var inv = window.INVENTORY;
    if (inv && inv.records) inventory = inv.records;
    if (window.LISTINGS) listings = window.LISTINGS.listings || {};

    updateStats();
    buildParticles();
    startAnim();

    fetch(LISTINGS_API_URL)
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data) return;
        listings = data.listings || {};
        updateStats();
        refreshListedState();
      })
      .catch(function () {});
  }

  function listingForRec(rec) {
    var key = (rec.contract || '').toLowerCase() + ':' + rec.tokenId;
    return listings[key] || null;
  }

  function refreshListedState() {
    for (var i = 0; i < particles.length; i++) {
      var p      = particles[i];
      p.listing  = listingForRec(p.rec);
      p.isListed = !!p.listing;
    }
  }

  /* ── Stats ───────────────────────────────────────────────── */

  function updateStats() {
    var total  = inventory.length;
    var listed = 0;
    for (var i = 0; i < inventory.length; i++) {
      if (listingForRec(inventory[i])) listed++;
    }
    var pct = total > 0 ? ((listed / total) * 100).toFixed(1) : '0.0';

    var elTotal    = document.getElementById('marketTotal');
    var elListed   = document.getElementById('marketListed');
    var elSubtitle = document.getElementById('marketSubtitle');

    if (elTotal)    elTotal.textContent    = total.toLocaleString();
    if (elListed)   elListed.textContent   = listed.toLocaleString();
    if (elSubtitle) elSubtitle.textContent = pct + '% of all works remain unclaimed';
  }

  /* ── Helpers ─────────────────────────────────────────────── */

  function gaussRand() {
    var u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  /* ── Particle generation ─────────────────────────────────── */

  function buildParticles() {
    if (!canvas || !inventory.length) return;
    var w = canvas.width, h = canvas.height;
    centerX = w * 0.5;
    centerY = h * 0.5;
    var maxR = Math.min(w, h) * 0.46;

    particles = inventory.map(function (rec) {
      var listing  = listingForRec(rec);
      var isListed = !!listing;

      // Spread particles across wide rings — inner dense, outer sparse
      var homeR = Math.abs(gaussRand()) * 110 + 160;
      homeR = Math.max(BH_R * 2.5, Math.min(maxR, homeR));

      // Start near homeR at a random angle
      var angle  = Math.random() * Math.PI * 2;
      var startR = homeR + gaussRand() * 18;
      startR = Math.max(BH_R + 10, startR);

      var px = centerX + Math.cos(angle) * startR;
      var py = centerY + Math.sin(angle) * startR;

      // Initial tangential velocity for near-circular orbit
      var orbSpeed = Math.sqrt(GRAVITY / startR) * (0.82 + Math.random() * 0.28);
      var vx = -Math.sin(angle) * orbSpeed;
      var vy =  Math.cos(angle) * orbSpeed;

      // Depth for rendering variation (biased toward far)
      var depth = Math.random();
      depth = depth * depth;

      return {
        x: px, y: py,
        vx: vx, vy: vy,
        homeR:      homeR,
        phase:      Math.random() * Math.PI * 2,
        driftSpeed: 0.3 + Math.random() * 0.5,
        depth:      depth,
        isListed:   isListed,
        listing:    listing,
        rec:        rec,
        alpha:      1,
        bhState:    null,
        bhTimer:    0,
      };
    });

    // Pre-advance the simulation so orbits start randomised, not cold-synced
    var warmup = 500 + Math.floor(Math.random() * 400);
    for (var f = 0; f < warmup; f++) {
      stepPhysics(w, h);
    }
  }

  /* ── Physics ─────────────────────────────────────────────── */

  function stepPhysics(w, h, now) {
    if (now === undefined) now = 0;
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];

      var dx   = p.x - centerX;
      var dy   = p.y - centerY;
      var dist = Math.sqrt(dx * dx + dy * dy) || 0.001;

      // Outward normal and counterclockwise tangent
      var nx = dx / dist, ny = dy / dist;
      var tx = -ny,       ty =  nx;

      // 1. Gravity — inverse-square inward pull
      var g = GRAVITY / (dist * dist);
      p.vx -= nx * g;
      p.vy -= ny * g;

      // 2. Tangential orbital push — keeps stars circling
      p.vx += tx * ORBIT_F;
      p.vy += ty * ORBIT_F;

      // 3. Damping
      p.vx *= DAMPING;
      p.vy *= DAMPING;

      // 4. Move
      p.x += p.vx;
      p.y += p.vy;

      // 5. Black hole — gradual fade out, hold, fade back in
      var ex = p.x - centerX, ey = p.y - centerY;
      if (!p.bhState && Math.sqrt(ex * ex + ey * ey) < BH_R) {
        // Just crossed threshold — begin dissolve
        p.bhState = 'fadeout';
        p.bhTimer = now;
        p.vx = 0; p.vy = 0;
      } else if (p.bhState === 'fadeout') {
        var t = (now - p.bhTimer) / FADE_OUT_T;
        p.alpha = Math.max(0, 1 - t);
        p.vx = 0; p.vy = 0; // freeze while dissolving
        if (t >= 1) {
          p.bhState = 'held';
          p.bhTimer = now;
          p.x = centerX; p.y = centerY;
        }
      } else if (p.bhState === 'held') {
        p.x = centerX; p.y = centerY; p.vx = 0; p.vy = 0;
        if (now - p.bhTimer >= HOLD_T) {
          // Eject to outer ring and begin fade in
          var ejectAngle = Math.random() * Math.PI * 2;
          var ejectR     = p.homeR * (1.3 + Math.random() * 0.5);
          ejectR = Math.min(ejectR, Math.min(canvas.width, canvas.height) * 0.44);
          p.x  = centerX + Math.cos(ejectAngle) * ejectR;
          p.y  = centerY + Math.sin(ejectAngle) * ejectR;
          var ov = Math.sqrt(GRAVITY / ejectR) * (0.85 + Math.random() * 0.3);
          p.vx = -Math.sin(ejectAngle) * ov;
          p.vy =  Math.cos(ejectAngle) * ov;
          p.alpha   = 0;
          p.bhState = 'fadein';
          p.bhTimer = now;
        }
      } else if (p.bhState === 'fadein') {
        var t2 = (now - p.bhTimer) / FADE_IN_T;
        p.alpha = Math.min(1, t2);
        if (t2 >= 1) { p.bhState = null; p.alpha = 1; }
      }

    }
  }

  /* ── Rendering ───────────────────────────────────────────── */

  function drawBlackHole() {
    // Hard black void
    ctx.beginPath();
    ctx.arc(centerX, centerY, BH_VIS_R, 0, Math.PI * 2);
    ctx.fillStyle = '#000000';
    ctx.fill();

    // Atmospheric darkness fading outward
    var gr = ctx.createRadialGradient(
      centerX, centerY, BH_VIS_R * 0.6,
      centerX, centerY, BH_VIS_R * 4
    );
    gr.addColorStop(0,   'rgba(0,0,0,0.92)');
    gr.addColorStop(0.3, 'rgba(2,2,5,0.55)');
    gr.addColorStop(0.6, 'rgba(4,4,8,0.18)');
    gr.addColorStop(1,   'rgba(5,5,10,0)');
    ctx.beginPath();
    ctx.arc(centerX, centerY, BH_VIS_R * 4, 0, Math.PI * 2);
    ctx.fillStyle = gr;
    ctx.fill();
  }

  function drawDormant(p, now, hovered) {
    var x = p.x, y = p.y;
    var d = p.depth;

    var baseR  = 0.4 + d * 1.0;
    var baseOp = 0.15 + d * 0.55;
    var r = Math.round(140 + d * 50);
    var g = Math.round(145 + d * 50);
    var b = Math.round(170 + d * 55);

    var twinkle = Math.sin(now * p.driftSpeed * 1.5 + p.phase) * 0.15;
    if (Math.sin(now * 7.9 + p.phase * 17) > 0.95) twinkle += 0.3;
    var op = Math.min(1, baseOp + twinkle);

    var glowR  = 4 + d * 5;
    var glowOp = op * 0.12;
    var glow = ctx.createRadialGradient(x, y, 0, x, y, glowR);
    glow.addColorStop(0,   'rgba(' + r + ',' + g + ',' + b + ',' + glowOp + ')');
    glow.addColorStop(0.4, 'rgba(' + r + ',' + g + ',' + b + ',' + (glowOp * 0.4) + ')');
    glow.addColorStop(1,   'rgba(' + r + ',' + g + ',' + b + ',0)');
    ctx.beginPath();
    ctx.arc(x, y, glowR, 0, Math.PI * 2);
    ctx.fillStyle = glow;
    ctx.fill();

    if (hovered) {
      var hGlow = ctx.createRadialGradient(x, y, 0, x, y, 12);
      hGlow.addColorStop(0,   'rgba(200,205,220,0.25)');
      hGlow.addColorStop(0.5, 'rgba(180,185,200,0.08)');
      hGlow.addColorStop(1,   'rgba(160,165,180,0)');
      ctx.beginPath();
      ctx.arc(x, y, 12, 0, Math.PI * 2);
      ctx.fillStyle = hGlow;
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(x, y, baseR, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + op + ')';
    ctx.fill();
  }

  function drawAvailable(p, now, hovered) {
    var x = p.x, y = p.y;
    var pulse = 0.85 + Math.sin(now * 1.3 + p.phase) * 0.15;

    var outerR = 20;
    var outer  = ctx.createRadialGradient(x, y, 0, x, y, outerR);
    outer.addColorStop(0,   'rgba(255,255,255,' + (pulse * 0.25) + ')');
    outer.addColorStop(0.3, 'rgba(240,245,255,' + (pulse * 0.10) + ')');
    outer.addColorStop(0.6, 'rgba(220,230,255,' + (pulse * 0.03) + ')');
    outer.addColorStop(1,   'rgba(200,215,255,0)');
    ctx.beginPath();
    ctx.arc(x, y, outerR, 0, Math.PI * 2);
    ctx.fillStyle = outer;
    ctx.fill();

    var innerR = 8;
    var inner  = ctx.createRadialGradient(x, y, 0, x, y, innerR);
    inner.addColorStop(0,   'rgba(255,255,255,' + (pulse * 0.8) + ')');
    inner.addColorStop(0.3, 'rgba(255,252,248,' + (pulse * 0.4) + ')');
    inner.addColorStop(0.7, 'rgba(245,248,255,' + (pulse * 0.1) + ')');
    inner.addColorStop(1,   'rgba(235,240,255,0)');
    ctx.beginPath();
    ctx.arc(x, y, innerR, 0, Math.PI * 2);
    ctx.fillStyle = inner;
    ctx.fill();

    if (hovered) {
      var hGlow = ctx.createRadialGradient(x, y, 0, x, y, 28);
      hGlow.addColorStop(0,   'rgba(255,255,255,0.3)');
      hGlow.addColorStop(0.3, 'rgba(240,245,255,0.1)');
      hGlow.addColorStop(0.6, 'rgba(220,230,255,0.03)');
      hGlow.addColorStop(1,   'rgba(200,215,255,0)');
      ctx.beginPath();
      ctx.arc(x, y, 28, 0, Math.PI * 2);
      ctx.fillStyle = hGlow;
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(x, y, 1.8, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }

  /* ── Animation loop ──────────────────────────────────────── */

  function startAnim() {
    if (animId) cancelAnimationFrame(animId);
    loop();
  }

  function loop() {
    animId = requestAnimationFrame(loop);
    if (!ctx) return;

    var w   = canvas.width;
    var h   = canvas.height;
    var now = performance.now() / 1000;

    ctx.clearRect(0, 0, w, h);

    drawBlackHole();
    stepPhysics(w, h, now);

    // Dormant behind
    for (var d = 0; d < particles.length; d++) {
      var pd = particles[d];
      if (pd.isListed || pd.bhState === 'held') continue;
      var ddx = pd.x - centerX, ddy = pd.y - centerY;
      var ddist = Math.sqrt(ddx * ddx + ddy * ddy);
      var prox = ddist >= BH_DIM_ZONE ? 1 : Math.max(0, (ddist - BH_R) / (BH_DIM_ZONE - BH_R));
      ctx.globalAlpha = (pd.alpha !== undefined ? pd.alpha : 1) * prox;
      drawDormant(pd, now, d === hoveredIdx);
    }
    // Listed on top
    for (var a = 0; a < particles.length; a++) {
      var pa = particles[a];
      if (!pa.isListed || pa.bhState === 'held') continue;
      var adx = pa.x - centerX, ady = pa.y - centerY;
      var adist = Math.sqrt(adx * adx + ady * ady);
      var aprox = adist >= BH_DIM_ZONE ? 1 : Math.max(0, (adist - BH_R) / (BH_DIM_ZONE - BH_R));
      ctx.globalAlpha = (pa.alpha !== undefined ? pa.alpha : 1) * aprox;
      drawAvailable(pa, now, a === hoveredIdx);
    }
    ctx.globalAlpha = 1;
  }

  /* ── Interaction ─────────────────────────────────────────── */

  function hitTest(mx, my) {
    var best = -1, bestDist = Infinity;

    // Listed first — larger hit zone, takes priority
    for (var i = 0; i < particles.length; i++) {
      if (!particles[i].isListed) continue;
      var dx = particles[i].x - mx, dy = particles[i].y - my;
      var dd = Math.sqrt(dx * dx + dy * dy);
      if (dd < 30 && dd < bestDist) { best = i; bestDist = dd; }
    }
    if (best >= 0) return best;

    // Dormant — smaller hit zone, hover info only
    for (var j = 0; j < particles.length; j++) {
      if (particles[j].isListed) continue;
      var ex = particles[j].x - mx, ey = particles[j].y - my;
      var ee = Math.sqrt(ex * ex + ey * ey);
      if (ee < 12 && ee < bestDist) { best = j; bestDist = ee; }
    }
    return best;
  }

  function buildOpenseaUrl(rec) {
    if (rec.openseaUrl) return rec.openseaUrl.replace('opensea.io/assets/', 'opensea.io/item/');
    var contract = (rec.contract || '').toLowerCase();
    var tokenId  = rec.tokenId || '';
    if (!contract || !tokenId) return '';
    var chain = (rec.blockchain || rec.chain || 'ethereum').toLowerCase();
    return 'https://opensea.io/item/' + chain + '/' + contract + '/' + tokenId;
  }

  function onCanvasClick(e) {
    var rect = canvas.getBoundingClientRect();
    var idx  = hitTest(e.clientX - rect.left, e.clientY - rect.top);
    if (idx < 0) return;
    var p = particles[idx];
    if (!p.isListed) return;
    var url = buildOpenseaUrl(p.rec);
    if (url) window.open(url, '_blank', 'noopener noreferrer');
  }

  function onCanvasMove(e) {
    var rect = canvas.getBoundingClientRect();
    var mx   = e.clientX - rect.left;
    var my   = e.clientY - rect.top;
    var idx  = hitTest(mx, my);
    hoveredIdx = idx;

    if (idx >= 0) {
      var p     = particles[idx];
      var rec   = p.rec;
      var price = p.listing ? fmtPrice(p.listing.price, p.listing.currency) : '';
      tooltip.innerHTML =
        '<span class="mtt-title">' + esc(rec.title || 'Untitled') + '</span>' +
        (price ? '<span class="mtt-price">' + esc(price) + '</span>' : '') +
        (p.isListed ? '<span class="mtt-hint">Click to view on OpenSea</span>' : '');
      tooltip.style.display = 'block';
      tooltip.style.left    = (e.clientX + 14) + 'px';
      tooltip.style.top     = (e.clientY - 12) + 'px';
      canvas.style.cursor   = p.isListed ? 'pointer' : 'default';
    } else {
      tooltip.style.display = 'none';
      canvas.style.cursor   = 'default';
    }
  }

  function onCanvasLeave() {
    hoveredIdx            = -1;
    tooltip.style.display = 'none';
    canvas.style.cursor   = 'default';
  }

  /* ── Resize ──────────────────────────────────────────────── */

  function onResize() {
    var oldW  = canvas.width  || 1, oldH  = canvas.height || 1;
    var oldCX = centerX || oldW * 0.5, oldCY = centerY || oldH * 0.5;
    resizeCanvas();
    centerX = canvas.width  * 0.5;
    centerY = canvas.height * 0.5;
    if (particles.length) {
      var sx = canvas.width / oldW, sy = canvas.height / oldH;
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        p.x  = centerX + (p.x - oldCX) * sx;
        p.y  = centerY + (p.y - oldCY) * sy;
        p.vx *= sx;
        p.vy *= sy;
      }
    }
  }

  function resizeCanvas() {
    if (!canvas) return;
    canvas.width  = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
  }

  /* ── Format helpers ──────────────────────────────────────── */

  function fmtPrice(price, currency) {
    if (!price || price <= 0) return '';
    var p = price < 0.001 ? price.toFixed(6)
          : price < 1     ? price.toFixed(4)
          : price < 100   ? price.toFixed(2)
          : String(Math.round(price));
    if (p.indexOf('.') !== -1) p = p.replace(/0+$/, '').replace(/\.$/, '');
    return p + '\u00a0' + (currency || 'ETH');
  }

  function esc(str) {
    var d = document.createElement('div');
    d.textContent = String(str);
    return d.innerHTML;
  }

})();
