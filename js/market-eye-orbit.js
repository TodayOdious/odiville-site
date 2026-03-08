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

  /* ── Eye geometry (set on resize) ────────────────────────── */

  var centerX, centerY;
  var eyes = [];
  var BOUNDS = 300; // max particle distance from center

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
    buildOrbits();
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

  /* ── Orbit generation ────────────────────────────────────── */

  function gaussRand() {
    var u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  function updateLayout() {
    if (!canvas) return;
    var w = canvas.width;
    var h = canvas.height;
    centerX = w * 0.5;
    centerY = h * 0.5;
    BOUNDS  = Math.min(w, h) * 0.45;

    // Two egg ovals matching the Odiville logo mark exactly
    // Measured from the 5000x5000 logo PNG — both are portrait (taller than wide)
    var s = Math.min(w, h) * 0.28;
    eyes = [
      // Left eye — larger, tilted slightly counterclockwise
      { cx: centerX - s * 0.72, cy: centerY, a: s * 0.64, b: s * 1.0, angle: -0.15 },
      // Right eye — smaller, tilted slightly clockwise, same vertical center
      { cx: centerX + s * 0.72, cy: centerY, a: s * 0.55, b: s * 0.91, angle: 0.15 },
    ];
  }

  /* ── Eye distance helpers ──────────────────────────────────── */

  // Returns point on eye boundary at parameter t (0..2π)
  function pointOnEye(eye, t) {
    var lx = eye.a * Math.cos(t);
    var ly = eye.b * Math.sin(t);
    var c = Math.cos(eye.angle), s = Math.sin(eye.angle);
    return {
      x: eye.cx + lx * c - ly * s,
      y: eye.cy + lx * s + ly * c
    };
  }

  // Returns { dist, nx, ny, tx, ty } for a specific eye
  // dist: normalized (1 = on boundary, <1 = inside)
  // nx,ny: outward normal; tx,ty: tangent (counterclockwise)
  function eyeInfo(eye, px, py) {
    var dx = px - eye.cx, dy = py - eye.cy;
    var c = Math.cos(-eye.angle), s = Math.sin(-eye.angle);
    var lx = dx * c - dy * s;
    var ly = dx * s + dy * c;
    var d = Math.sqrt((lx / eye.a) * (lx / eye.a) + (ly / eye.b) * (ly / eye.b));
    // Gradient of ellipse distance (outward direction)
    var glx = lx / (eye.a * eye.a);
    var gly = ly / (eye.b * eye.b);
    var rc = Math.cos(eye.angle), rs = Math.sin(eye.angle);
    var nx = glx * rc - gly * rs;
    var ny = glx * rs + gly * rc;
    var len = Math.sqrt(nx * nx + ny * ny) || 1;
    nx /= len; ny /= len;
    return { dist: d, nx: nx, ny: ny, tx: -ny, ty: nx };
  }

  /* ── Particle generation ───────────────────────────────────── */

  function buildOrbits() {
    if (!canvas || !inventory.length) return;
    updateLayout();

    particles = inventory.map(function (rec) {
      var listing  = listingForRec(rec);
      var isListed = !!listing;

      // Assign particle to a specific eye (split roughly proportional to eye area)
      var eyeIdx = Math.random() < 0.55 ? 0 : 1; // left eye slightly larger
      var eye = eyes[eyeIdx];
      var t   = Math.random() * Math.PI * 2;
      var bp  = pointOnEye(eye, t);

      // Scatter near the boundary (tight halo)
      var offset = 1.0 + gaussRand() * 0.15;
      var px = eye.cx + (bp.x - eye.cx) * offset;
      var py = eye.cy + (bp.y - eye.cy) * offset;

      // Initial tangential velocity (gentle orbit along the edge)
      var info  = eyeInfo(eye, px, py);
      var speed = 0.08 + Math.random() * 0.12;

      var depth = Math.random();
      depth = depth * depth;

      return {
        x: px, y: py,
        vx: info.tx * speed,
        vy: info.ty * speed,
        eyeIdx:     eyeIdx,
        phase:      Math.random() * Math.PI * 2,
        driftSpeed: 0.3 + Math.random() * 0.5,
        depth:      depth,
        isListed:   isListed,
        listing:    listing,
        rec:        rec,
      };
    });

    // Pre-simulate 200 frames so particles start already settled on the edges
    for (var frame = 0; frame < 200; frame++) {
      for (var i = 0; i < particles.length; i++) {
        var p    = particles[i];
        var info = eyeInfo(eyes[p.eyeIdx], p.x, p.y);
        var d    = info.dist;
        var target = 1.03;
        var err = target - d;
        p.vx += info.nx * err * 0.05;
        p.vy += info.ny * err * 0.05;
        p.vx += info.tx * 0.004;
        p.vy += info.ty * 0.004;
        p.vx *= 0.97;
        p.vy *= 0.97;
        p.x += p.vx;
        p.y += p.vy;
      }
    }
  }


  /* ── Dormant particle — depth-varied starfield ─────────── */

  function drawDormant(p, now, hovered) {
    var x = p.x, y = p.y;
    var d = p.depth; // 0=far, 1=near

    // Tiny dot: 0.4px (far) to 1.4px (near)
    var baseR = 0.4 + d * 1.0;
    // Opacity: 0.15 (far) to 0.7 (near)
    var baseOp = 0.15 + d * 0.55;
    // Color: cold blue-grey
    var r = Math.round(140 + d * 50);
    var g = Math.round(145 + d * 50);
    var b = Math.round(170 + d * 55);

    // Twinkle
    var twinkle = Math.sin(now * p.driftSpeed * 1.5 + p.phase) * 0.15;
    if (Math.sin(now * 7.9 + p.phase * 17) > 0.95) twinkle += 0.3;
    var op = baseOp + twinkle;

    // Atmospheric glow — like starlight diffusing through atmosphere
    var glowR = 4 + d * 5;
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
      // Brighter glow on hover
      var hGlow = ctx.createRadialGradient(x, y, 0, x, y, 12);
      hGlow.addColorStop(0,   'rgba(200,205,220,0.25)');
      hGlow.addColorStop(0.5, 'rgba(180,185,200,0.08)');
      hGlow.addColorStop(1,   'rgba(160,165,180,0)');
      ctx.beginPath();
      ctx.arc(x, y, 12, 0, Math.PI * 2);
      ctx.fillStyle = hGlow;
      ctx.fill();
    }

    // Pin-point core
    ctx.beginPath();
    ctx.arc(x, y, baseR, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + op + ')';
    ctx.fill();
  }

  /* ── Available (listed) particle — bright star ─────────────── */

  function drawAvailable(p, now, hovered) {
    var x = p.x, y = p.y;

    var pulse = 0.85 + Math.sin(now * 1.3 + p.phase) * 0.15;

    // Wide outer glow — makes it unmissable
    var outerR = 20;
    var outer = ctx.createRadialGradient(x, y, 0, x, y, outerR);
    outer.addColorStop(0,   'rgba(255,255,255,' + (pulse * 0.25) + ')');
    outer.addColorStop(0.3, 'rgba(240,245,255,' + (pulse * 0.10) + ')');
    outer.addColorStop(0.6, 'rgba(220,230,255,' + (pulse * 0.03) + ')');
    outer.addColorStop(1,   'rgba(200,215,255,0)');
    ctx.beginPath();
    ctx.arc(x, y, outerR, 0, Math.PI * 2);
    ctx.fillStyle = outer;
    ctx.fill();

    // Intense inner glow
    var innerR = 8;
    var inner = ctx.createRadialGradient(x, y, 0, x, y, innerR);
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

    // Hard bright core
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

  function drawEyeVoid(eye) {
    ctx.save();
    ctx.translate(eye.cx, eye.cy);
    ctx.rotate(eye.angle);
    ctx.scale(1, eye.b / eye.a);

    var r = eye.a * 1.4;
    var g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    g.addColorStop(0,    'rgba(0,0,0,1)');
    g.addColorStop(0.55, 'rgba(0,0,0,0.95)');
    g.addColorStop(0.75, 'rgba(2,2,4,0.3)');
    g.addColorStop(1,    'rgba(5,5,8,0)');

    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.restore();
  }

  function loop() {
    animId = requestAnimationFrame(loop);
    if (!ctx) return;

    var w   = canvas.width;
    var h   = canvas.height;
    var now = performance.now() / 1000;

    ctx.clearRect(0, 0, w, h);

    // Draw eye voids
    for (var e = 0; e < eyes.length; e++) {
      drawEyeVoid(eyes[e]);
    }

    // Update particles — each orbits its own assigned eye
    for (var i = 0; i < particles.length; i++) {
      var p    = particles[i];
      var info = eyeInfo(eyes[p.eyeIdx], p.x, p.y);
      var d    = info.dist;

      // 1. Strong spring toward boundary (d=1.03) — keeps particles on the edge
      var target = 1.03;
      var err = target - d;
      var springForce = err * 0.05;
      p.vx += info.nx * springForce;
      p.vy += info.ny * springForce;

      // 2. Gentle tangential drift — slide along the edge
      var orbitForce = 0.004;
      p.vx += info.tx * orbitForce;
      p.vy += info.ty * orbitForce;

      // 3. Heavy damping — keeps them settled
      p.vx *= 0.97;
      p.vy *= 0.97;

      // Update position
      p.x += p.vx;
      p.y += p.vy;

      // Keep on screen
      if (p.x < 10)     { p.x = 10;     p.vx = Math.abs(p.vx) * 0.3; }
      if (p.x > w - 10) { p.x = w - 10; p.vx = -Math.abs(p.vx) * 0.3; }
      if (p.y < 10)     { p.y = 10;     p.vy = Math.abs(p.vy) * 0.3; }
      if (p.y > h - 10) { p.y = h - 10; p.vy = -Math.abs(p.vy) * 0.3; }
    }

    // Draw dormant first (behind)
    for (var dd = 0; dd < particles.length; dd++) {
      if (!particles[dd].isListed) {
        drawDormant(particles[dd], now, dd === hoveredIdx);
      }
    }

    // Draw available on top
    for (var a = 0; a < particles.length; a++) {
      if (particles[a].isListed) {
        drawAvailable(particles[a], now, a === hoveredIdx);
      }
    }
  }

  /* ── Interaction ─────────────────────────────────────────── */

  function hitTest(mx, my) {
    var best = -1, bestDist = Infinity;

    // Listed first — larger hit zone
    for (var i = 0; i < particles.length; i++) {
      if (!particles[i].isListed) continue;
      var dx = particles[i].x - mx, dy = particles[i].y - my;
      var d  = Math.sqrt(dx * dx + dy * dy);
      if (d < 30 && d < bestDist) { best = i; bestDist = d; }
    }
    if (best >= 0) return best;

    // Then any particle
    bestDist = Infinity;
    for (var j = 0; j < particles.length; j++) {
      var ex = particles[j].x - mx, ey = particles[j].y - my;
      var e  = Math.sqrt(ex * ex + ey * ey);
      if (e < 12 && e < bestDist) { best = j; bestDist = e; }
    }
    return best;
  }

  function buildOpenseaUrl(rec) {
    if (rec.openseaUrl) return rec.openseaUrl;
    // Construct from contract + tokenId + chain
    var contract = (rec.contract || '').toLowerCase();
    var tokenId  = rec.tokenId || '';
    if (!contract || !tokenId) return '';
    var chain = (rec.chain || 'ethereum').toLowerCase();
    return 'https://opensea.io/assets/' + chain + '/' + contract + '/' + tokenId;
  }

  function onCanvasClick(e) {
    var rect = canvas.getBoundingClientRect();
    var idx  = hitTest(e.clientX - rect.left, e.clientY - rect.top);
    if (idx < 0) return;
    var p   = particles[idx];
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
        (price ? '<span class="mtt-price">' + esc(price) + '</span>' : '');
      tooltip.style.display = 'block';
      tooltip.style.left    = (e.clientX + 14) + 'px';
      tooltip.style.top     = (e.clientY - 12) + 'px';
      canvas.style.cursor   = 'pointer';
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
    var oldW = canvas.width || 1, oldH = canvas.height || 1;
    var oldCX = centerX || oldW * 0.5, oldCY = centerY || oldH * 0.5;
    resizeCanvas();
    updateLayout();
    // Rescale particle positions relative to new center
    if (particles.length) {
      var sx = canvas.width / oldW, sy = canvas.height / oldH;
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        p.x = centerX + (p.x - oldCX) * sx;
        p.y = centerY + (p.y - oldCY) * sy;
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

  /* ── Helpers ─────────────────────────────────────────────── */

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
