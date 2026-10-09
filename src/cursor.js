/* ═══════════════════════════════════════════════════════════════════
   Custom cursor — playful sticker layer (see cursor.css).
   • One rAF loop, transform-only movement (translate3d), no layout reads.
   • Event delegation via pointerover + closest(); no per-element listeners.
   • pointer-events: none everywhere, so Matter.js + character clicks are
     unaffected. Pauses when the tab hides; stops when idle and settled.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  // Only on devices with a fine hover-capable pointer — touch does nothing.
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var html = document.documentElement;

  /* ── build the two cursor elements ─────────────────────────────── */
  function el(tag, cls) {
    var n = document.createElement(tag);
    n.className = cls;
    n.setAttribute('aria-hidden', 'true');
    return n;
  }
  var dot = el('div', 'cursor-dot');
  var dotInner = el('div', 'cursor-dot-inner');
  dot.appendChild(dotInner);

  var ring = el('div', 'cursor-ring');
  var breathe = el('div', 'cursor-breathe');
  var ringInner = el('div', 'cursor-ring-inner');
  var label = el('span', 'cursor-label');
  ringInner.appendChild(label);
  breathe.appendChild(ringInner);
  ring.appendChild(breathe);

  document.body.appendChild(dot);
  document.body.appendChild(ring);

  /* click-sparkle pool (max 6, reused) */
  var sparkles = [];
  var sparkleIdx = 0;
  if (!reducedMotion) {
    for (var i = 0; i < 6; i++) {
      var s = el('div', 'cursor-sparkle');
      document.body.appendChild(s);
      sparkles.push(s);
    }
  }

  html.classList.add('has-custom-cursor'); // native cursor hides only now

  /* ── state ─────────────────────────────────────────────────────── */
  var mx = window.innerWidth / 2, my = window.innerHeight / 2; // mouse (cached)
  var rx = mx, ry = my;                                       // ring (lerped)
  var pmx = mx, pmy = my;                                     // prev mouse (velocity)
  var hasMoved = false;
  var state = 'default';
  var grabbing = false;
  var uiScale = 1, uiTarget = 1;      // mousedown shrink, lerped for spring-back
  var stretch = 0, angle = 0;         // fast-movement stretch
  var lastMoveT = 0;
  var idleTimer = 0;
  var rafId = 0, running = false;

  var STATE_CLASSES = ['cst-link', 'cst-view', 'cst-drag', 'cst-poke', 'cst-text'];

  function refreshLabel() {
    var txt = '';
    if (state === 'link') txt = '↗';
    else if (state === 'view') txt = 'VIEW ↗';
    else if (state === 'drag') txt = grabbing ? 'WHEEE' : 'DRAG';
    else if (state === 'poke') txt = 'POKE';
    if (label.textContent !== txt) label.textContent = txt;
  }

  function setState(next, customLabel) {
    if (state === next && !customLabel) return;
    state = next;
    for (var i = 0; i < STATE_CLASSES.length; i++) {
      html.classList.toggle(STATE_CLASSES[i], ('cst-' + next) === STATE_CLASSES[i]);
    }
    html.classList.toggle('cursor-hidden-zone', next === 'hide');
    if (customLabel) {
      if (label.textContent !== customLabel) label.textContent = customLabel;
    } else {
      refreshLabel();
    }
  }

  /* ── zone detection (delegation) ───────────────────────────────── */
  function detect(target) {
    if (!(target instanceof Element)) return;
    var zoned = target.closest('[data-cursor]');
    if (zoned) {
      var kind = zoned.getAttribute('data-cursor');
      var custom = zoned.getAttribute('data-cursor-label');
      if (kind === 'view' || kind === 'drag' || kind === 'poke') { setState(kind, custom); return; }
      if (kind === 'hide') { setState('hide'); return; }
    }
    if (target.closest('input, textarea, select, [contenteditable="true"]')) { setState('hide'); return; }
    if (target.closest('a, button, [role="button"]')) { setState('link'); return; }
    if (target.closest('p, h1, h2, h3, li')) { setState('text'); return; }
    setState('default');
  }
  document.addEventListener('pointerover', function (e) { detect(e.target); });

  /* ── pointer tracking ──────────────────────────────────────────── */
  function armIdleBreathing() {
    clearTimeout(idleTimer);
    html.classList.remove('cst-breathing');
    if (!reducedMotion) {
      idleTimer = setTimeout(function () { html.classList.add('cst-breathing'); }, 3000);
    }
  }

  document.addEventListener('pointermove', function (e) {
    mx = e.clientX; my = e.clientY;
    if (!hasMoved) {
      hasMoved = true;
      rx = mx; ry = my; pmx = mx; pmy = my;
      html.classList.add('cursor-live'); // reveal only after first move
    }
    lastMoveT = performance.now();
    html.classList.remove('cursor-away');
    armIdleBreathing();
    kick();
  }, { passive: true });

  /* ── press / release ───────────────────────────────────────────── */
  function spawnSparkle(x, y) {
    if (reducedMotion || sparkles.length === 0) return;
    var s = sparkles[sparkleIdx];
    sparkleIdx = (sparkleIdx + 1) % sparkles.length;
    var size = 10 + Math.random() * 4; // 10–14px
    s.style.width = size + 'px';
    s.style.height = size + 'px';
    s.style.background = Math.random() < 0.5 ? '#FFD60A' : '#FF0A8A';
    s.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0) translate(-50%,-50%) rotate(' + (Math.random() * 90) + 'deg)';
    s.classList.remove('go');
    void s.offsetWidth; // restart the animation
    s.classList.add('go');
  }

  document.addEventListener('pointerdown', function (e) {
    uiTarget = 0.8;
    if (state === 'drag') {
      grabbing = true;
      html.classList.add('cst-grabbing');
      refreshLabel(); // DRAG → WHEEE
    }
    if (state === 'poke') {
      html.classList.add('poke-bouncing');
      setTimeout(function () { html.classList.remove('poke-bouncing'); }, 380);
    }
    spawnSparkle(e.clientX, e.clientY);
    kick();
  });
  window.addEventListener('pointerup', function () {
    uiTarget = 1;
    if (grabbing) {
      grabbing = false;
      html.classList.remove('cst-grabbing');
      refreshLabel(); // WHEEE → DRAG
    }
    kick();
  });

  /* ── leave / return ────────────────────────────────────────────── */
  document.addEventListener('mouseleave', function () { html.classList.add('cursor-away'); });
  document.addEventListener('mouseenter', function () {
    html.classList.remove('cursor-away');
    kick();
  });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      running = false;
      cancelAnimationFrame(rafId);
    } else {
      kick();
    }
  });

  /* ── the single rAF loop ───────────────────────────────────────── */
  function kick() {
    if (!running && !document.hidden && hasMoved) {
      running = true;
      rafId = requestAnimationFrame(frame);
    }
  }

  function frame() {
    // ring follows with lerp 0.18 (instant when reduced motion)
    var k = reducedMotion ? 1 : 0.18;
    rx += (mx - rx) * k;
    ry += (my - ry) * k;

    // velocity → directional stretch (capped, smoothed)
    var vx = mx - pmx, vy = my - pmy;
    pmx = mx; pmy = my;
    if (!reducedMotion) {
      var speed = Math.sqrt(vx * vx + vy * vy);
      var target = Math.min(speed / 60, 0.25); // never past 1.25x
      stretch += (target - stretch) * 0.2;
      if (speed > 3) {
        var a = Math.atan2(vy, vx) * 180 / Math.PI;
        var d = a - angle;
        while (d > 180) d -= 360;
        while (d < -180) d += 360;
        angle += d * 0.25;
      }
    }

    // mousedown shrink springs back
    uiScale += (uiTarget - uiScale) * 0.3;

    var sx = uiScale * (1 + stretch);
    var sy = uiScale * (1 - stretch * 0.6);
    ring.style.transform =
      'translate3d(' + rx + 'px,' + ry + 'px,0)' +
      ' translate(-50%,-50%)' +
      ' rotate(' + angle + 'deg)' +
      ' scale(' + sx + ',' + sy + ')';
    // dot follows instantly (same press-shrink, no stretch)
    dot.style.transform =
      'translate3d(' + mx + 'px,' + my + 'px,0)' +
      ' translate(-50%,-50%) scale(' + uiScale + ')';

    // stop when the ring caught up and everything settled
    var caughtUp = Math.abs(mx - rx) < 0.4 && Math.abs(my - ry) < 0.4;
    var settled = Math.abs(uiScale - uiTarget) < 0.003 && stretch < 0.004;
    if (!document.hidden && (!caughtUp || !settled)) {
      rafId = requestAnimationFrame(frame);
    } else {
      running = false;
    }
  }
})();
