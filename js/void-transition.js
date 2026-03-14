(function () {
  'use strict';

  /* ================================================================
     VOID TRANSITION — Cinematic theme-switch animation
     A magical wavefront sweeps across the screen with layered
     depth, curl-noise fluid motion, additive glow, and organic
     nebula wisps. Reality folds and re-emerges.
     ================================================================ */

  var DURATION = 2800;
  var TAU = Math.PI * 2;

  var canvas, ctx, animating = false;
  var W, H, cx, cy, diag;

  /* ── Perlin-style noise ───────────────────────────────────────── */
  var perm = [];
  (function () {
    for (var i = 0; i < 256; i++) perm[i] = i;
    for (var i = 255; i > 0; i--) {
      var j = (Math.random() * (i + 1)) | 0;
      var t = perm[i]; perm[i] = perm[j]; perm[j] = t;
    }
    for (var i = 0; i < 256; i++) perm[256 + i] = perm[i];
  })();

  function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function grad2(hash, x, y) {
    var h = hash & 3;
    return (h === 0 ? x + y : h === 1 ? -x + y : h === 2 ? x - y : -x - y);
  }
  function noise(x, y) {
    var X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
    x -= Math.floor(x); y -= Math.floor(y);
    var u = fade(x), v = fade(y);
    var a = perm[X] + Y, b = perm[X + 1] + Y;
    return lerp(
      lerp(grad2(perm[a], x, y), grad2(perm[b], x - 1, y), u),
      lerp(grad2(perm[a + 1], x, y - 1), grad2(perm[b + 1], x - 1, y - 1), u),
      v
    );
  }

  /* Fractal Brownian Motion — layered noise for organic shapes */
  function fbm(x, y, octaves) {
    var val = 0, amp = 0.5, freq = 1;
    for (var i = 0; i < octaves; i++) {
      val += amp * noise(x * freq, y * freq);
      amp *= 0.5;
      freq *= 2.1;
    }
    return val;
  }

  /* Curl noise — gives fluid-like divergence-free motion */
  function curl(x, y) {
    var eps = 0.01;
    var dx = (fbm(x, y + eps, 3) - fbm(x, y - eps, 3)) / (2 * eps);
    var dy = (fbm(x + eps, y, 3) - fbm(x - eps, y, 3)) / (2 * eps);
    return { x: dx, y: -dy };
  }

  /* ── Easing ───────────────────────────────────────────────────── */
  function easeInOut(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  function easeIn(t) { return t * t * t; }

  /* ── Canvas ───────────────────────────────────────────────────── */
  function ensure() {
    if (canvas) return;
    canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:fixed;inset:0;z-index:8000;pointer-events:none;';
    document.body.appendChild(canvas);
    ctx = canvas.getContext('2d');
    measure();
    window.addEventListener('resize', measure);
  }

  function measure() {
    if (!canvas) return;
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
    cx = W / 2; cy = H / 2;
    diag = Math.sqrt(cx * cx + cy * cy);
  }

  /* ── Particle layers ──────────────────────────────────────────── */
  /*
     Three depth layers create parallax / 3D feel:
       back  — large, blurry, slow, low-alpha nebula blobs
       mid   — medium particles with curl-noise fluid motion
       front — small bright sparks with trails
  */
  var layers = { back: [], mid: [], front: [] };

  function hsl(h, s, l, a) {
    return 'hsla(' + h + ',' + s + '%,' + l + '%,' + a + ')';
  }

  function spawnParticles(toDark) {
    layers.back = [];
    layers.mid = [];
    layers.front = [];

    for (var i = 0; i < 30; i++) {
      var angle = Math.random() * TAU;
      var r = 40 + Math.random() * diag * 0.9;
      layers.back.push({
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r,
        ox: cx + Math.cos(angle) * r,
        oy: cy + Math.sin(angle) * r,
        vx: 0, vy: 0,
        size: 30 + Math.random() * 60,
        hue: toDark ? 200 + Math.random() * 40 : 30 + Math.random() * 25,
        sat: toDark ? 15 + Math.random() * 20 : 20 + Math.random() * 30,
        lit: toDark ? 8 + Math.random() * 15 : 75 + Math.random() * 15,
        alpha: 0,
        maxAlpha: 0.08 + Math.random() * 0.1,
        seed: Math.random() * 999,
        speed: 0.3 + Math.random() * 0.4
      });
    }

    for (var i = 0; i < 120; i++) {
      var angle = Math.random() * TAU;
      var r = 20 + Math.random() * diag;
      layers.mid.push({
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r,
        ox: cx + Math.cos(angle) * r,
        oy: cy + Math.sin(angle) * r,
        vx: 0, vy: 0,
        size: 1.5 + Math.random() * 4,
        hue: toDark ? 180 + Math.random() * 60 : 25 + Math.random() * 35,
        sat: toDark ? 20 + Math.random() * 30 : 30 + Math.random() * 40,
        lit: toDark ? 30 + Math.random() * 40 : 70 + Math.random() * 20,
        alpha: 0,
        maxAlpha: 0.15 + Math.random() * 0.45,
        seed: Math.random() * 999,
        speed: 0.6 + Math.random() * 0.8
      });
    }

    for (var i = 0; i < 60; i++) {
      var angle = Math.random() * TAU;
      var r = 30 + Math.random() * diag * 0.8;
      layers.front.push({
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r,
        ox: cx + Math.cos(angle) * r,
        oy: cy + Math.sin(angle) * r,
        vx: 0, vy: 0,
        size: 0.8 + Math.random() * 1.8,
        hue: toDark ? 190 + Math.random() * 30 : 35 + Math.random() * 20,
        sat: toDark ? 10 + Math.random() * 20 : 50 + Math.random() * 30,
        lit: toDark ? 60 + Math.random() * 30 : 90 + Math.random() * 10,
        alpha: 0,
        maxAlpha: 0.5 + Math.random() * 0.5,
        seed: Math.random() * 999,
        speed: 1 + Math.random() * 1.5,
        sparkle: Math.random() < 0.3
      });
    }
  }

  /* ── Wisps — organic flowing tendrils using bezier curves ────── */
  var wisps = [];

  function spawnWisps(toDark) {
    wisps = [];
    for (var i = 0; i < 16; i++) {
      var angle = (i / 16) * TAU + (Math.random() - 0.5) * 0.4;
      wisps.push({
        angle: angle,
        seed: Math.random() * 999,
        width: 1 + Math.random() * 2,
        points: 12 + ((Math.random() * 6) | 0),
        hue: toDark ? 195 + Math.random() * 35 : 30 + Math.random() * 20,
        sat: toDark ? 20 + Math.random() * 15 : 25 + Math.random() * 20,
        lit: toDark ? 15 + Math.random() * 20 : 80 + Math.random() * 15,
        offset: Math.random() * 0.3
      });
    }
  }

  /* ── Wavefront — noise-distorted expanding/contracting circle ── */
  function drawWavefront(t, toDark) {
    /*
      The wavefront is a noise-distorted circle.
      toDark (light→dark): collapses from outside in.
      toLight (dark→light): expands from center out.
    */
    var progress = easeInOut(Math.min(t * 1.3, 1));
    var maxR = diag * 1.5;
    var baseR = toDark
      ? maxR * (1 - progress)   // shrinks inward
      : maxR * progress;        // expands outward

    if (baseR < 1) return;

    // Build the distorted wavefront path
    var steps = 120;
    ctx.beginPath();
    for (var i = 0; i <= steps; i++) {
      var a = (i / steps) * TAU;
      // Layered noise distortion on the edge
      var n1 = fbm(Math.cos(a) * 2 + t * 1.5, Math.sin(a) * 2 + t * 1.5, 4);
      var n2 = fbm(Math.cos(a) * 5 + t * 3, Math.sin(a) * 5 + 10, 3);
      var distort = n1 * 0.25 + n2 * 0.12;
      var r = baseR * (1 + distort);

      var px = cx + Math.cos(a) * r;
      var py = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();

    // Fill with target theme color — fades in then gently dissolves
    var washFade = Math.min(progress * 2, 1);
    if (t > 0.55) washFade *= 1 - easeOut((t - 0.55) / 0.45);

    if (toDark) {
      // Inward collapse: fill the OUTSIDE of the shrinking circle
      ctx.save();
      ctx.clip();                               // clip to the wavefront shape
      ctx.fillStyle = 'rgba(3,3,4,0)';          // clear inside (noop)
      ctx.restore();
      // Draw full-screen wash, then cut out the wavefront interior
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, W, H);
      // Re-trace the wavefront path (counter-clockwise) for even-odd cutout
      for (var j = steps; j >= 0; j--) {
        var a2 = (j / steps) * TAU;
        var nn1 = fbm(Math.cos(a2) * 2 + t * 1.5, Math.sin(a2) * 2 + t * 1.5, 4);
        var nn2 = fbm(Math.cos(a2) * 5 + t * 3, Math.sin(a2) * 5 + 10, 3);
        var d2 = nn1 * 0.25 + nn2 * 0.12;
        var r2 = baseR * (1 + d2);
        var px2 = cx + Math.cos(a2) * r2;
        var py2 = cy + Math.sin(a2) * r2;
        if (j === steps) ctx.moveTo(px2, py2);
        else ctx.lineTo(px2, py2);
      }
      ctx.closePath();
      ctx.fillStyle = 'rgba(3,3,4,' + (0.35 * washFade) + ')';
      ctx.fill('evenodd');
      ctx.restore();
    } else {
      ctx.fillStyle = 'rgba(250,246,238,' + (0.3 * washFade) + ')';
      ctx.fill();
    }

    // Luminous edge glow along the wavefront
    if (progress > 0.05 && progress < 0.9) {
      var edgeAlpha = (1 - Math.abs(progress - 0.4) / 0.5) * 0.4;
      if (edgeAlpha > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        // Draw the edge with a radial gradient stroke effect
        for (var i = 0; i < steps; i++) {
          var a = (i / steps) * TAU;
          var n1 = fbm(Math.cos(a) * 2 + t * 1.5, Math.sin(a) * 2 + t * 1.5, 4);
          var n2 = fbm(Math.cos(a) * 5 + t * 3, Math.sin(a) * 5 + 10, 3);
          var distort = n1 * 0.25 + n2 * 0.12;
          var r = baseR * (1 + distort);

          var px = cx + Math.cos(a) * r;
          var py = cy + Math.sin(a) * r;

          var glowSize = 15 + Math.abs(n1) * 30;
          var gl = ctx.createRadialGradient(px, py, 0, px, py, glowSize);
          if (toDark) {
            gl.addColorStop(0, 'hsla(200,25%,30%,' + (edgeAlpha * 0.6) + ')');
            gl.addColorStop(0.4, 'hsla(210,20%,15%,' + (edgeAlpha * 0.2) + ')');
            gl.addColorStop(1, 'hsla(220,15%,10%,0)');
          } else {
            gl.addColorStop(0, 'hsla(38,50%,85%,' + (edgeAlpha * 0.7) + ')');
            gl.addColorStop(0.4, 'hsla(35,40%,75%,' + (edgeAlpha * 0.25) + ')');
            gl.addColorStop(1, 'hsla(30,30%,70%,0)');
          }
          ctx.beginPath();
          ctx.arc(px, py, glowSize, 0, TAU);
          ctx.fillStyle = gl;
          ctx.fill();
        }
        ctx.restore();
      }
    }
  }

  /* ── Draw wisps ───────────────────────────────────────────────── */
  function drawWisps(t, toDark) {
    var progress = easeInOut(Math.min(t * 1.4, 1));
    // Wisps fade in, linger, then fade out gently
    // For inward collapse, delay appearance until wavefront is moving
    var fadeStart = toDark ? 0.12 : 0;
    var wispAlpha;
    if (t < fadeStart) {
      wispAlpha = 0;
    } else if (t < 0.3) {
      wispAlpha = easeIn((t - fadeStart) / (0.3 - fadeStart)) * 0.18;
    } else if (t < 0.55) {
      wispAlpha = 0.18;
    } else {
      wispAlpha = (1 - easeOut((t - 0.55) / 0.45)) * 0.18;
    }

    if (wispAlpha < 0.005) return;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    for (var w = 0; w < wisps.length; w++) {
      var ws = wisps[w];
      var reach = progress * diag * (0.8 + ws.offset);

      // Build bezier curve points
      var pts = [];
      for (var p = 0; p < ws.points; p++) {
        var frac = p / (ws.points - 1);
        var along = reach * frac;

        // Base position — inward from edge (toDark) or outward from center (toLight)
        var edgeDist = diag * (0.8 + ws.offset);
        var bx, by;
        if (toDark) {
          bx = cx + Math.cos(ws.angle) * (edgeDist - along);
          by = cy + Math.sin(ws.angle) * (edgeDist - along);
        } else {
          bx = cx + Math.cos(ws.angle) * along;
          by = cy + Math.sin(ws.angle) * along;
        }

        // Two layers of displacement:
        // 1. Large slow drift — tightens over time so wisps don't scatter
        // 2. Small fast wiggle — persists throughout for organic life
        var driftScale = t > 0.4 ? 0.25 + 0.75 * (1 - easeOut((t - 0.4) / 0.6)) : 1;
        var driftAmp = (25 + frac * 70) * driftScale;
        var nx = fbm(ws.seed + frac * 3, t * 2 + w * 0.5, 3);
        var ny = fbm(ws.seed + 50 + frac * 3, t * 2 + w * 0.5 + 30, 3);

        // Fast wiggle — higher frequency noise, smaller amplitude, always alive
        var wiggleAmp = 12 + frac * 25;
        var wx = noise(ws.seed + frac * 8 + t * 6, w * 2.3) * wiggleAmp;
        var wy = noise(ws.seed + 80 + frac * 8 + t * 6, w * 2.3 + 50) * wiggleAmp;

        bx += nx * driftAmp + wx;
        by += ny * driftAmp + wy;

        // Gently pull points toward center as animation ends (converge)
        if (!toDark && t > 0.5) {
          var pullStrength = easeOut((t - 0.5) / 0.5) * 0.5;
          bx = bx + (cx - bx) * pullStrength * frac;
          by = by + (cy - by) * pullStrength * frac;
        }

        pts.push({ x: bx, y: by });
      }

      // Draw as segments with alpha fading near center
      if (pts.length < 2) continue;

      // Multiple passes at different widths for glow depth
      for (var pass = 0; pass < 3; pass++) {
        var passWidth = pass === 0 ? ws.width * 12 : pass === 1 ? ws.width * 4 : ws.width;
        var basePassAlpha = pass === 0 ? wispAlpha * 0.15 : pass === 1 ? wispAlpha * 0.4 : wispAlpha;

        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = passWidth;

        for (var p = 0; p < pts.length - 1; p++) {
          var segFrac = p / (pts.length - 1);
          // Fade based on distance to center — tips near center go transparent
          var dx = pts[p].x - cx, dy = pts[p].y - cy;
          var distFromCenter = Math.sqrt(dx * dx + dy * dy);
          var fadeZone = diag * 0.15;
          var centerFade = Math.min(distFromCenter / fadeZone, 1);
          var segAlpha = basePassAlpha * centerFade;
          if (segAlpha < 0.003) continue;

          ctx.beginPath();
          ctx.moveTo(pts[p].x, pts[p].y);
          if (p < pts.length - 2) {
            var midX = (pts[p + 1].x + pts[p + 2].x) / 2;
            var midY = (pts[p + 1].y + pts[p + 2].y) / 2;
            ctx.quadraticCurveTo(pts[p + 1].x, pts[p + 1].y, midX, midY);
          } else {
            ctx.lineTo(pts[p + 1].x, pts[p + 1].y);
          }
          ctx.strokeStyle = hsl(ws.hue, ws.sat, ws.lit, segAlpha);
          ctx.stroke();
        }
      }
    }

    ctx.restore();
  }

  /* ── Draw particles ───────────────────────────────────────────── */
  function drawParticles(t, toDark) {
    var time = t * 4; // speed up noise evolution

    // All layers share the wavefront-driven reveal timing
    var waveR = easeInOut(Math.min(t * 1.3, 1)) * diag * 1.5;

    function processLayer(arr, depthScale, useCurl, useTrails, useGlow) {
      for (var i = 0; i < arr.length; i++) {
        var p = arr[i];

        // Distance from center
        var dx = p.x - cx, dy = p.y - cy;
        var dist = Math.sqrt(dx * dx + dy * dy) || 1;

        // Particle becomes active as wavefront passes over it
        var origDist = Math.sqrt((p.ox - cx) * (p.ox - cx) + (p.oy - cy) * (p.oy - cy));
        var waveProx;
        if (toDark) {
          // Inward: activate from edges, but delay until collapse is underway (t>0.1)
          // and use a wider ramp (200px) for a gentler fade-in
          var delayFade = t < 0.15 ? easeIn(t / 0.15) : 1;
          waveProx = ((origDist - waveR) / 200) * delayFade;
        } else {
          waveProx = (waveR - origDist) / 120;
        }
        waveProx = Math.max(0, Math.min(1, waveProx));

        // Gentle fade out over the final 45% of the animation
        var endFade = t > 0.55 ? 1 - easeOut((t - 0.55) / 0.45) : 1;

        // Target alpha
        p.alpha = p.maxAlpha * waveProx * endFade;
        if (p.alpha < 0.01) continue;

        // Physics — curl noise for fluid organic motion
        if (useCurl) {
          var c = curl(p.x * 0.003 + time * 0.2, p.y * 0.003 + time * 0.15);
          p.vx += c.x * p.speed * depthScale * 1.5;
          p.vy += c.y * p.speed * depthScale * 1.5;
        }

        // Gentle radial force — direction depends on collapse vs expand
        var centerForce;
        if (toDark) {
          // Inward collapse: pull toward center
          centerForce = t < 0.45
            ? -0.08 * easeIn(t / 0.45)
            : 0.15 * easeOut((t - 0.45) / 0.55);
        } else {
          // Outward expand: pull toward center first, then push out
          centerForce = t < 0.45
            ? 0.15 * easeIn(t / 0.45)
            : -0.08 * easeOut((t - 0.45) / 0.55);
        }
        p.vx += (cx - p.x) / dist * centerForce * depthScale;
        p.vy += (cy - p.y) / dist * centerForce * depthScale;

        // Damping
        p.vx *= 0.94;
        p.vy *= 0.94;
        p.x += p.vx;
        p.y += p.vy;

        var a = p.alpha;

        // Sparkle effect on front layer
        if (p.sparkle) {
          var sparkleT = noise(p.seed + time * 3, p.seed * 0.3) * 0.5 + 0.5;
          a *= 0.4 + sparkleT * 0.6;
          // Occasional bright flash
          if (sparkleT > 0.85) {
            a = Math.min(1, a * 2.5);
          }
        }

        if (useGlow && p.size > 2) {
          // Nebula blobs — large soft radial gradients
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          var gl = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
          gl.addColorStop(0, hsl(p.hue, p.sat, p.lit, a));
          gl.addColorStop(0.3, hsl(p.hue, p.sat * 0.8, p.lit * 0.9, a * 0.5));
          gl.addColorStop(1, hsl(p.hue, p.sat * 0.5, p.lit * 0.7, 0));
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, TAU);
          ctx.fillStyle = gl;
          ctx.fill();
          ctx.restore();
        } else {
          // Core dot
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, TAU);
          ctx.fillStyle = hsl(p.hue, p.sat, p.lit, a);
          ctx.fill();

          // Glow halo (additive)
          if (a > 0.1) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            var glowR = p.size * (useTrails ? 8 : 5);
            var gl = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowR);
            gl.addColorStop(0, hsl(p.hue, p.sat, p.lit, a * 0.4));
            gl.addColorStop(0.5, hsl(p.hue, p.sat, p.lit, a * 0.1));
            gl.addColorStop(1, hsl(p.hue, p.sat, p.lit, 0));
            ctx.beginPath();
            ctx.arc(p.x, p.y, glowR, 0, TAU);
            ctx.fillStyle = gl;
            ctx.fill();
            ctx.restore();
          }

          // Motion trail
          if (useTrails) {
            var speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
            if (speed > 0.3 && a > 0.08) {
              var tailLen = Math.min(speed * 6, 30);
              var nx = -p.vx / speed, ny = -p.vy / speed;
              ctx.save();
              ctx.globalCompositeOperation = 'lighter';
              var tg = ctx.createLinearGradient(
                p.x, p.y, p.x + nx * tailLen, p.y + ny * tailLen
              );
              tg.addColorStop(0, hsl(p.hue, p.sat, p.lit, a * 0.6));
              tg.addColorStop(1, hsl(p.hue, p.sat, p.lit, 0));
              ctx.beginPath();
              ctx.moveTo(p.x, p.y);
              ctx.lineTo(p.x + nx * tailLen, p.y + ny * tailLen);
              ctx.strokeStyle = tg;
              ctx.lineWidth = p.size * 1.5;
              ctx.lineCap = 'round';
              ctx.stroke();
              ctx.restore();
            }
          }
        }
      }
    }

    // Back layer: large nebula blobs, slow, no trails
    processLayer(layers.back, 0.3, true, false, true);
    // Mid layer: medium particles, curl motion, no trails
    processLayer(layers.mid, 0.7, true, false, false);
    // Front layer: small bright sparks, fast, with trails
    processLayer(layers.front, 1.0, true, true, false);
  }

  /* ── Central energy burst ─────────────────────────────────────── */
  function drawCentralBurst(t, toDark) {
    // Builds from 0.15→0.75, then fades gently
    if (t < 0.15 || t > 0.8) return;

    var burstT = (t - 0.15) / 0.65;
    var intensity = burstT < 0.35
      ? easeIn(burstT / 0.35)
      : (1 - easeOut((burstT - 0.35) / 0.65));

    if (intensity < 0.01) return;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // Core glow
    var coreR = 20 + intensity * 60;
    var cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR);
    if (toDark) {
      cg.addColorStop(0, 'hsla(200,30%,25%,' + (intensity * 0.5) + ')');
      cg.addColorStop(0.3, 'hsla(210,25%,15%,' + (intensity * 0.25) + ')');
      cg.addColorStop(0.7, 'hsla(220,20%,8%,' + (intensity * 0.08) + ')');
      cg.addColorStop(1, 'hsla(220,15%,5%,0)');
    } else {
      cg.addColorStop(0, 'hsla(38,60%,90%,' + (intensity * 0.6) + ')');
      cg.addColorStop(0.3, 'hsla(35,50%,80%,' + (intensity * 0.3) + ')');
      cg.addColorStop(0.7, 'hsla(32,40%,70%,' + (intensity * 0.1) + ')');
      cg.addColorStop(1, 'hsla(30,30%,60%,0)');
    }
    ctx.beginPath();
    ctx.arc(cx, cy, coreR, 0, TAU);
    ctx.fillStyle = cg;
    ctx.fill();

    // Outer aura — much larger, very soft
    var auraR = 60 + intensity * 200;
    var ag = ctx.createRadialGradient(cx, cy, coreR * 0.5, cx, cy, auraR);
    if (toDark) {
      ag.addColorStop(0, 'hsla(205,25%,18%,' + (intensity * 0.15) + ')');
      ag.addColorStop(1, 'hsla(215,20%,8%,0)');
    } else {
      ag.addColorStop(0, 'hsla(36,45%,82%,' + (intensity * 0.2) + ')');
      ag.addColorStop(1, 'hsla(32,35%,70%,0)');
    }
    ctx.beginPath();
    ctx.arc(cx, cy, auraR, 0, TAU);
    ctx.fillStyle = ag;
    ctx.fill();

    // Pulse rings — expanding outward
    for (var ring = 0; ring < 3; ring++) {
      var ringT = burstT - ring * 0.12;
      if (ringT < 0 || ringT > 0.8) continue;
      var ringP = ringT / 0.8;
      var ringR = easeOut(ringP) * (150 + ring * 80);
      var ringA = (1 - ringP) * intensity * (0.25 - ring * 0.06);
      if (ringA < 0.01) continue;

      ctx.beginPath();
      ctx.arc(cx, cy, ringR, 0, TAU);
      ctx.strokeStyle = toDark
        ? 'hsla(200,25%,35%,' + ringA + ')'
        : 'hsla(38,50%,85%,' + ringA + ')';
      ctx.lineWidth = 1.5 - ring * 0.3;
      ctx.stroke();
    }

    ctx.restore();
  }

  /* ── Full-screen flash to mask the theme flip ────────────────── */
  function drawFlash(t, toDark) {
    // Ramp up 0.28→0.42 (peak), ramp down 0.42→0.58
    if (t < 0.28 || t > 0.58) return;
    var alpha;
    if (t < 0.42) {
      alpha = easeIn((t - 0.28) / 0.14);
    } else {
      alpha = 1 - easeOut((t - 0.42) / 0.16);
    }
    if (alpha < 0.01) return;
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = toDark
      ? 'rgba(3,3,4,' + alpha + ')'
      : 'rgba(250,246,238,' + alpha + ')';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  /* ── Screen vignette overlay ──────────────────────────────────── */
  function drawVignette(t, toDark) {
    var vigAlpha;
    if (t < 0.25) {
      vigAlpha = easeIn(t / 0.25) * 0.25;
    } else if (t < 0.5) {
      vigAlpha = 0.25;
    } else {
      vigAlpha = (1 - easeOut((t - 0.5) / 0.5)) * 0.25;
    }

    if (vigAlpha < 0.005) return;

    var vg = ctx.createRadialGradient(cx, cy, diag * 0.15, cx, cy, diag);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    if (toDark) {
      vg.addColorStop(1, 'rgba(3,3,4,' + vigAlpha + ')');
    } else {
      vg.addColorStop(1, 'rgba(200,190,170,' + vigAlpha + ')');
    }
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
  }

  /* ── Main animation loop ──────────────────────────────────────── */
  function run(startTime, toDark, onFlip) {
    var flipped = false;

    function frame() {
      var elapsed = performance.now() - startTime;
      var t = Math.min(elapsed / DURATION, 1);

      ctx.clearRect(0, 0, W, H);

      // Theme flip at ~42% — during the central burst peak
      if (!flipped && t >= 0.42) {
        flipped = true;
        if (onFlip) onFlip();
      }

      // Layer order: flash → vignette → wavefront → back particles → wisps → mid → burst → front
      drawFlash(t, toDark);
      drawVignette(t, toDark);
      drawWavefront(t, toDark);
      drawParticles(t, toDark);
      drawWisps(t, toDark);
      drawCentralBurst(t, toDark);

      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        ctx.clearRect(0, 0, W, H);
        animating = false;
      }
    }

    requestAnimationFrame(frame);
  }

  /* ── Reduced motion ───────────────────────────────────────────── */
  function prefersReduced() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /* ── Public API ───────────────────────────────────────────────── */
  window.voidTransition = function (targetTheme, onFlip) {
    if (prefersReduced()) {
      if (onFlip) onFlip();
      return;
    }

    if (animating) {
      return;
    }

    animating = true;
    var toDark = targetTheme === 'dark';

    ensure();
    measure();
    spawnParticles(toDark);
    spawnWisps(toDark);

    run(performance.now(), toDark, onFlip);
  };
})();
