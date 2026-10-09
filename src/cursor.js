/* ═══════════════════════════════════════════════════════════════════
   Custom cursor — cartoon glove hand. Replaces the old blob cursor.
   • 6 pre-built SVG poses (point, thumbs-up, OK, open palm, fist, poke),
     swapped with opacity — never re-created.
   • One rAF loop, translate3d only, no layout reads in the loop.
   • Event delegation via pointerover + closest(); no per-element listeners.
   • pointer-events: none everywhere, so Matter.js, character clicks and
     the scroll lock keep working. Pauses when the tab hides; stops when
     everything caught up and the mouse is still.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  // Only on devices with a fine hover-capable pointer — touch creates nothing.
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var html = document.documentElement;
  var INK = '#0D0D0D', PAPER = '#FAFAFA';
  var S = 'fill="' + PAPER + '" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"';
  var DET = 'class="detail" fill="none" stroke="' + INK + '" stroke-width="2.5" stroke-linecap="round"';
  var CUFF = '<rect x="22" y="58" width="24" height="17" rx="6" class="cuff" stroke="' + INK + '" stroke-width="3"/>';

  /* ── the 6 poses (viewBox 0 0 64 80, 52px tall) ────────────────── */
  var POSES = {
    point:
      CUFF +
      '<rect x="16" y="36" width="34" height="26" rx="11" ' + S + '/>' +
      '<circle cx="26" cy="34" r="6" ' + S + '/><circle cx="36" cy="33" r="6.5" ' + S + '/><circle cx="46" cy="35" r="6" ' + S + '/>' +
      '<rect x="13" y="8" width="11" height="36" rx="5.5" transform="rotate(-14 18 44)" ' + S + '/>' +
      '<ellipse cx="17" cy="50" rx="5.5" ry="9" transform="rotate(-28 17 50)" ' + S + '/>' +
      '<path d="M28 48h7 M28 54h7" ' + DET + '/>',
    thumb:
      CUFF +
      '<rect x="22" y="34" width="28" height="24" rx="10" ' + S + '/>' +
      '<circle cx="30" cy="33" r="5.5" ' + S + '/><circle cx="39" cy="32" r="5.5" ' + S + '/><circle cx="47" cy="33" r="5" ' + S + '/>' +
      '<rect x="12" y="8" width="12" height="36" rx="6" ' + S + '/>' +
      '<path d="M30 47h10" ' + DET + '/>',
    ok:
      CUFF +
      '<rect x="14" y="40" width="34" height="22" rx="10" ' + S + '/>' +
      '<rect x="34" y="6" width="9" height="26" rx="4.5" ' + S + '/>' +
      '<rect x="43" y="8" width="9" height="26" rx="4.5" ' + S + '/>' +
      '<rect x="51" y="14" width="8" height="20" rx="4" ' + S + '/>' +
      '<rect x="30" y="2" width="11" height="20" rx="5.5" transform="rotate(10 35 22)" ' + S + '/>' +
      '<circle cx="28" cy="28" r="9" ' + S + '/>' +
      '<rect x="13" y="28" width="11" height="24" rx="5.5" transform="rotate(28 18 40)" ' + S + '/>' +
      '<path d="M24 50h7" ' + DET + '/>',
    palm:
      CUFF +
      '<rect x="17" y="36" width="30" height="24" rx="10" ' + S + '/>' +
      '<rect x="14" y="12" width="9" height="24" rx="4.5" transform="rotate(-16 18 36)" ' + S + '/>' +
      '<rect x="23" y="10" width="9" height="24" rx="4.5" transform="rotate(-5 27 34)" ' + S + '/>' +
      '<rect x="32" y="10" width="9" height="24" rx="4.5" transform="rotate(6 36 34)" ' + S + '/>' +
      '<rect x="41" y="12" width="9" height="24" rx="4.5" transform="rotate(17 45 36)" ' + S + '/>' +
      '<ellipse cx="49" cy="46" rx="5" ry="8" transform="rotate(35 49 46)" ' + S + '/>' +
      '<path d="M27 48h7" ' + DET + '/>',
    fist:
      CUFF +
      '<rect x="17" y="32" width="30" height="28" rx="11" ' + S + '/>' +
      '<rect x="17" y="46" width="22" height="9" rx="4.5" ' + S + '/>' +
      '<path d="M25 37v7 M32 36v7 M39 37v7" ' + DET + '/>',
    poke:
      CUFF +
      '<rect x="26" y="32" width="26" height="28" rx="11" ' + S + '/>' +
      '<rect x="24" y="2" width="12" height="42" rx="6" transform="rotate(-14 30 44)" ' + S + '/>' +
      '<ellipse cx="27" cy="48" rx="5" ry="8" transform="rotate(-25 27 48)" ' + S + '/>' +
      '<path d="M36 48h7" ' + DET + '/>'
  };

  function poseSVG(inner) {
    return '<svg class="pose-svg" viewBox="0 0 64 80" aria-hidden="true">' +
      '<g class="pose-glow">' + inner + '</g>' +
      '<g class="pose-art">' + inner + '</g></svg>';
  }
  function div(cls, parent) {
    var n = document.createElement('div');
    if (cls) n.className = cls;
    n.setAttribute('aria-hidden', 'true');
    if (parent) parent.appendChild(n);
    return n;
  }

  /* ── build the cursor tree ─────────────────────────────────────── */
  var root = div('', null);
  root.id = 'cursor-root';
  document.body.appendChild(root);

  var hand = div('cursor-hand', root);
  var wave = div('cursor-wave', hand);
  var tilt = div('cursor-tilt', wave);
  var pop = div('cursor-pop', tilt);
  var posesBox = div('cursor-poses', pop);
  var poseEls = {};
  Object.keys(POSES).forEach(function (k) {
    var p = div('pose', posesBox);
    p.setAttribute('data-pose', k);
    p.innerHTML = poseSVG(POSES[k]);
    poseEls[k] = p;
  });
  var badge = div('cursor-badge', pop);
  badge.textContent = '↗';

  // view-state buddy: cartoon character with eyes + VIEW banner (replaces the sticker)
  var YEL = '#FFD60A', PNK = '#FF0A8A';
  var BS = 'fill="' + YEL + '" stroke="' + INK + '" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"';
  var BO = 'stroke="' + INK + '" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"';
  var BUDDY_SVG =
    '<ellipse cx="52" cy="56" rx="34" ry="30" fill="' + INK + '"/>' +
    '<ellipse cx="36" cy="86" rx="10" ry="5.5" ' + BS + '/>' +
    '<ellipse cx="60" cy="86" rx="10" ry="5.5" ' + BS + '/>' +
    '<rect x="4" y="54" width="18" height="10" rx="5" transform="rotate(12 13 59)" ' + BS + '/>' +
    '<rect x="74" y="36" width="10" height="22" rx="5" transform="rotate(-16 79 47)" ' + BS + '/>' +
    '<ellipse cx="48" cy="52" rx="34" ry="30" fill="none" stroke="' + PAPER + '" stroke-width="7"/>' +
    '<ellipse cx="48" cy="52" rx="34" ry="30" fill="' + YEL + '" ' + BO + '/>' +
    '<ellipse cx="22" cy="50" rx="5" ry="3.5" fill="' + PNK + '"/>' +
    '<ellipse cx="74" cy="50" rx="5" ry="3.5" fill="' + PNK + '"/>' +
    '<path d="M27 22 l10 -3 M59 19 l10 3" fill="none" stroke="' + INK + '" stroke-width="2.5" stroke-linecap="round"/>' +
    '<circle cx="36" cy="36" r="9" fill="' + PAPER + '" ' + BO + '/>' +
    '<circle cx="60" cy="36" r="9" fill="' + PAPER + '" ' + BO + '/>' +
    '<g class="pupil"><circle cx="36" cy="36" r="4.5" fill="' + INK + '"/>' +
    '<circle cx="37.5" cy="34.5" r="1.5" fill="' + PAPER + '"/></g>' +
    '<g class="pupil"><circle cx="60" cy="36" r="4.5" fill="' + INK + '"/>' +
    '<circle cx="61.5" cy="34.5" r="1.5" fill="' + PAPER + '"/></g>' +
    '<path d="M40 58 Q48 64 56 58" fill="none" stroke="' + INK + '" stroke-width="2.5" stroke-linecap="round"/>';
  var buddy = div('view-buddy', root);
  var buddyOffset = div('view-buddy-offset', buddy);
  var buddyTilt = div('view-buddy-tilt', buddyOffset);
  buddyTilt.innerHTML = '<svg class="view-buddy-svg" viewBox="0 0 96 100" aria-hidden="true">' + BUDDY_SVG + '</svg>';
  var viewText = div('view-text', buddyOffset);
  var viewLabel = document.createElement('span');
  viewText.appendChild(viewLabel);
  var pupils = buddyTilt.querySelectorAll('.pupil');

  // trail: 3 tiny sparkles (skipped under reduced motion)
  var trail = [];
  if (!reduced) {
    var tcols = ['#FFD60A', '#FF0A8A', '#A58CF4'];
    var tsize = [8, 9, 10];
    for (var i = 0; i < 3; i++) {
      var t = div('trail-star', root);
      t.style.width = tsize[i] + 'px';
      t.style.height = tsize[i] + 'px';
      t.style.background = tcols[i];
      t.style.opacity = '0';
      trail.push({ el: t, x: 0, y: 0, o: 0 });
    }
  }
  // confetti pool (12) and boing pool (3) — skipped confetti under reduced motion
  var confetti = [], ci = 0;
  if (!reduced) {
    for (var j = 0; j < 12; j++) confetti.push(div('confetti', root));
  }
  var boings = [], bi = 0;
  for (var b = 0; b < 3; b++) boings.push(div('boing', root));

  html.classList.add('has-custom-cursor'); // native cursor hides only now

  /* ── state ─────────────────────────────────────────────────────── */
  var mx = window.innerWidth / 2, my = window.innerHeight / 2;
  var hx = mx, hy = my;                 // hand (lerped)
  var pmx = mx, pmy = my;               // previous mouse (velocity)
  var hasMoved = false;
  var state = 'default', currentPose = '';
  var isDown = false;
  var tiltA = 0;
  var bx = mx, by = my, buddyTiltA = 0;   // view buddy (lerped)
  var viewCard = null, viewRect = null;
  var idleT1 = 0, idleT2 = 0;
  var rafId = 0, running = false;

  var STATE_CLASSES = ['cst-link', 'cst-view', 'cst-drag', 'cst-poke', 'cst-text'];

  function setPose(p) {
    if (p === currentPose) return;
    currentPose = p;
    for (var k in poseEls) poseEls[k].classList.toggle('active', k === p);
    pop.classList.remove('popping');
    void pop.offsetWidth;
    pop.classList.add('popping');
  }
  function poseFor() {
    if (isDown) return 'fist';
    if (state === 'link') return 'thumb';
    if (state === 'view') return 'ok';
    if (state === 'drag') return 'palm';
    if (state === 'poke') return 'poke';
    return 'point';
  }
  function setViewLabel(card) {
    var t = (card && card.getAttribute('data-cursor-label')) || 'VIEW';
    t = String(t).toUpperCase().slice(0, 12);
    viewLabel.textContent = t;
    viewLabel.style.fontSize = t.length > 6 ? '15px' : '18px';
  }
  // pupils look toward the center of the hovered card
  function updatePupils() {
    if (!viewRect || pupils.length === 0) return;
    var cx = viewRect.left + viewRect.width / 2;
    var cy = viewRect.top + viewRect.height / 2;
    var dx = cx - mx, dy = cy - my;
    var len = Math.sqrt(dx * dx + dy * dy) || 1;
    var tr = 'translate(' + (dx / len * 2.5).toFixed(1) + ' ' + (dy / len * 2.5).toFixed(1) + ')';
    for (var i = 0; i < pupils.length; i++) pupils[i].setAttribute('transform', tr);
  }
  window.addEventListener('scroll', function () {
    if (state === 'view' && viewCard) viewRect = viewCard.getBoundingClientRect();
  }, { passive: true });

  function setState(next, card) {
    if (state === next) return;
    state = next;
    for (var i = 0; i < STATE_CLASSES.length; i++) {
      html.classList.toggle(STATE_CLASSES[i], ('cst-' + next) === STATE_CLASSES[i]);
    }
    html.classList.toggle('cursor-hidden-zone', next === 'hide');
    if (next === 'view') {
      viewCard = card || null;
      viewRect = viewCard ? viewCard.getBoundingClientRect() : null;
      setViewLabel(viewCard);
      bx = mx; by = my; buddyTiltA = 0;
      buddyTilt.style.transform = 'rotate(0deg)';
      buddyOffset.classList.remove('popping');
      void buddyOffset.offsetWidth;
      buddyOffset.classList.add('popping');
      updatePupils();
      kick();
    } else {
      viewCard = null; viewRect = null;
    }
    setPose(poseFor());
  }

  /* ── zone detection (delegation) ───────────────────────────────── */
  function detect(target) {
    if (!(target instanceof Element)) return;
    html.classList.toggle('cursor-on-dark', !!target.closest('[data-theme="dark"]'));
    var zoned = target.closest('[data-cursor]');
    if (zoned) {
      var kind = zoned.getAttribute('data-cursor');
      if (kind === 'view' || kind === 'drag' || kind === 'poke') { setState(kind, zoned); return; }
      if (kind === 'hide') { setState('hide', null); return; }
    }
    if (target.closest('input, textarea, select, [contenteditable="true"]')) { setState('hide'); return; }
    if (target.closest('a, button, [role="button"]')) { setState('link'); return; }
    if (target.closest('p, h1, h2, h3, li')) { setState('text'); return; }
    setState('default');
  }
  document.addEventListener('pointerover', function (e) { detect(e.target); });

  /* ── pointer tracking ──────────────────────────────────────────── */
  function armIdle() {
    clearTimeout(idleT1);
    clearTimeout(idleT2);
    html.classList.remove('cst-idle-tap', 'cst-idle-wave');
    if (reduced) return;
    idleT1 = setTimeout(function () { html.classList.add('cst-idle-tap'); }, 3000);
    idleT2 = setTimeout(function () {
      html.classList.remove('cst-idle-tap');
      html.classList.add('cst-idle-wave');
    }, 8000);
  }

  document.addEventListener('pointermove', function (e) {
    mx = e.clientX; my = e.clientY;
    if (!hasMoved) {
      hasMoved = true;
      hx = mx; hy = my; pmx = mx; pmy = my;
      for (var i = 0; i < trail.length; i++) { trail[i].x = mx; trail[i].y = my; }
      html.classList.add('cursor-live'); // reveal only after first move
      setPose(poseFor());
    }
    html.classList.remove('cursor-away', 'cst-bye');
    armIdle();
    kick();
  }, { passive: true });

  /* ── press / release ───────────────────────────────────────────── */
  var CCOLS = ['#FFD60A', '#FF0A8A', '#A58CF4', '#FF5A00'];
  function fireBoing(x, y) {
    var el = boings[bi];
    bi = (bi + 1) % boings.length;
    el.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)';
    el.classList.remove('go');
    void el.offsetWidth;
    el.classList.add('go');
  }
  function spawnConfetti(x, y) {
    for (var k = 0; k < 5; k++) {
      var c = confetti[ci];
      ci = (ci + 1) % confetti.length;
      var size = 8 + Math.random() * 4; // 8–12px
      var ox = (Math.random() - 0.5) * 28, oy = (Math.random() - 0.5) * 28;
      c.className = 'confetti ' + (Math.random() < 0.5 ? 'star' : 'dot');
      c.setAttribute('aria-hidden', 'true');
      c.style.width = size + 'px';
      c.style.height = size + 'px';
      c.style.background = CCOLS[(Math.random() * CCOLS.length) | 0];
      c.style.transform = 'translate3d(' + (x + ox) + 'px,' + (y + oy) + 'px,0) rotate(' + ((Math.random() * 180) | 0) + 'deg)';
      void c.offsetWidth;
      c.classList.add('go');
    }
  }

  document.addEventListener('pointerdown', function (e) {
    isDown = true;
    html.classList.add(state === 'drag' ? 'sq-grab' : 'sq-down');
    setPose('fist');
    if (state === 'poke' && !reduced) {
      posesBox.classList.add('poking');
      setTimeout(function () { posesBox.classList.remove('poking'); }, 280);
      fireBoing(e.clientX, e.clientY);
    }
    kick();
  });
  window.addEventListener('pointerup', function (e) {
    isDown = false;
    html.classList.remove('sq-grab', 'sq-down');
    setPose(poseFor());
    if (!reduced) spawnConfetti(e.clientX, e.clientY);
    kick();
  });

  /* ── leave / return ────────────────────────────────────────────── */
  document.addEventListener('mouseleave', function () {
    if (reduced) { html.classList.add('cursor-away'); return; }
    html.classList.add('cst-bye'); // wave goodbye, then fade
    setTimeout(function () {
      html.classList.add('cursor-away');
      html.classList.remove('cst-bye');
    }, 400);
  });
  document.addEventListener('mouseenter', function () {
    html.classList.remove('cursor-away', 'cst-bye');
    pop.classList.remove('popping');
    void pop.offsetWidth;
    pop.classList.add('popping'); // pop back in
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
  var TRAIL_K = [0.12, 0.08, 0.05];
  var TRAIL_O = [1, 0.7, 0.4];

  function frame() {
    // hand follows with a short lag (0.35) — snappy and precise
    hx += (mx - hx) * 0.35;
    hy += (my - hy) * 0.35;

    var vx = mx - pmx, vy = my - pmy;
    pmx = mx; pmy = my;
    var speed = Math.sqrt(vx * vx + vy * vy);

    // tilt from horizontal speed: smoothed, capped ±8°, never flips
    var target = vx * 0.12;
    if (target > 8) target = 8;
    else if (target < -8) target = -8;
    tiltA += (target - tiltA) * 0.15;
    tilt.style.transform = 'rotate(' + tiltA.toFixed(2) + 'deg)';

    hand.style.transform = 'translate3d(' + hx.toFixed(1) + 'px,' + hy.toFixed(1) + 'px,0)';

    // view buddy follows with a little more lag; tilts ±6° with horizontal speed
    var buddySettled = true;
    if (state === 'view') {
      bx += (mx - bx) * 0.3;
      by += (my - by) * 0.3;
      var bt = reduced ? 0 : vx * 0.08;
      if (bt > 6) bt = 6;
      else if (bt < -6) bt = -6;
      buddyTiltA += (bt - buddyTiltA) * 0.15;
      buddy.style.transform = 'translate3d(' + bx.toFixed(1) + 'px,' + by.toFixed(1) + 'px,0)';
      buddyTilt.style.transform = 'rotate(' + buddyTiltA.toFixed(2) + 'deg)';
      updatePupils();
      buddySettled = Math.abs(mx - bx) < 0.5 && Math.abs(my - by) < 0.5 && Math.abs(bt - buddyTiltA) < 0.1;
    }

    // trail: longer lag, fades to 40%, hidden when still (and in view state)
    var showTrail = !reduced && speed > 3 && state !== 'view';
    var settled = true;
    for (var i = 0; i < trail.length; i++) {
      var s = trail[i];
      s.x += (mx - s.x) * TRAIL_K[i];
      s.y += (my - s.y) * TRAIL_K[i];
      var to = showTrail ? TRAIL_O[i] : 0;
      s.o += (to - s.o) * 0.2;
      s.el.style.transform = 'translate3d(' + s.x.toFixed(1) + 'px,' + s.y.toFixed(1) + 'px,0) translate(-50%,-50%)';
      s.el.style.opacity = s.o.toFixed(3);
      if (Math.abs(mx - s.x) > 0.5 || s.o > 0.01) settled = false;
    }

    var caughtUp = Math.abs(mx - hx) < 0.3 && Math.abs(my - hy) < 0.3;
    var tiltSettled = Math.abs(target - tiltA) < 0.05;
    if (!document.hidden && (!caughtUp || !tiltSettled || !settled || !buddySettled)) {
      rafId = requestAnimationFrame(frame);
    } else {
      running = false;
      tiltA = 0;
      tilt.style.transform = 'rotate(0deg)';
    }
  }
})();
