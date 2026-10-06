import { useEffect, useRef } from "react";
import Matter from "matter-js";

/* ── Colors ─────────────────────────────────────────────────────────────── */
const CSS_VARS = {
  "--tags-bg": "#1a1a1a",
  "--tags-radius": "24px",
  "--c-pink": "#ff0a8a",
  "--c-blue": "#1a1aff",
  "--c-orange": "#ff5a00",
  "--c-amber": "#ff9f0a",
  "--c-yellow": "#ffd60a",
  "--c-offwhite": "#f4f4f2",
  "--c-black": "#000000",
} as React.CSSProperties;

const WORD_POOL = [
  "BRANDING", "LOGO", "IDENTITY", "SOCIAL MEDIA", "PRINT",
  "PACKAGING", "TYPOGRAPHY", "GUIDELINES", "DESIGN", "STRATEGY",
];
const PALETTE: Array<[string, string, string?]> = [
  ["var(--c-pink)", "#ffffff"],
  ["var(--c-blue)", "#ffffff"],
  ["var(--c-orange)", "#ffffff"],
  ["var(--c-amber)", "#111111"],
  ["var(--c-yellow)", "#111111"],
  ["var(--c-offwhite)", "#111111"],
  ["var(--c-black)", "#ffffff", "1.5px solid #ffffff"],
];
/* shape variety: pill | circle | rect | squircle */
const SHAPES = ["pill", "pill", "pill", "circle", "rect", "squircle"] as const;

const TAG_COUNT_DESKTOP = 32;
const TAG_COUNT_MOBILE = 16;
const FLOOR_PADDING = 96;

interface Tag {
  el: HTMLDivElement;      // outer: synced to physics via transform only
  inner: HTMLDivElement;   // inner: hover scale (never fights physics transform)
  w: number; h: number;    // cached size
  body: Matter.Body | null;
}

export default function PhysicsTags() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || startedRef.current) return;
    startedRef.current = true;

    const isMobile = window.innerWidth < 768;
    const tagCount = isMobile ? TAG_COUNT_MOBILE : TAG_COUNT_DESKTOP;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* ── Build tags: outer (physics) > inner (hover scale) ──────────────── */
    const colorOrder: number[] = [];
    for (let i = 0; i < tagCount; i++) colorOrder.push(i % PALETTE.length);
    for (let i = colorOrder.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [colorOrder[i], colorOrder[j]] = [colorOrder[j], colorOrder[i]];
    }

    const tags: Tag[] = [];
    for (let i = 0; i < tagCount; i++) {
      const el = document.createElement("div");
      el.className = "ptag";
      const inner = document.createElement("div");
      inner.className = "ptag-inner";
      const shape = SHAPES[i % SHAPES.length];
      if (shape !== "pill") el.classList.add(`ptag--${shape}`);
      if (i % 7 === 3) el.classList.add("ptag--lg");
      inner.textContent = shape === "circle" && i % 5 === 0 ? "" : WORD_POOL[i % WORD_POOL.length];
      if (shape === "circle" && inner.textContent === "") el.classList.add("ptag--dot");
      const [bg, fg, outline] = PALETTE[colorOrder[i]];
      inner.style.background = bg;
      inner.style.color = fg;
      if (outline) inner.style.border = outline;
      el.appendChild(inner);
      section.appendChild(el);
      // cache size after layout
      tags.push({ el, inner, w: 0, h: 0, body: null });
    }
    // measure once (not in the loop)
    tags.forEach((t) => {
      t.w = Math.max(t.el.offsetWidth, 40);
      t.h = Math.max(t.el.offsetHeight, 32);
    });

    const W = () => section.clientWidth;
    const H = () => section.clientHeight;
    const floorY = () => H() - FLOOR_PADDING;

    if (reduceMotion) {
      tags.forEach((t) => {
        const px = 0.08 + Math.random() * 0.84;
        const py = 0.35 + Math.random() * 0.5;
        const rot = (Math.random() - 0.5) * 70;
        t.el.style.transform =
          `translate3d(${px * W() - t.w / 2}px, ${Math.min(py * H(), floorY() - t.h)}px, 0) rotate(${rot}deg)`;
      });
      return;
    }

    /* ── Engine: single rAF loop, fixed timestep, no sleeping ───────────── */
    const engine = Matter.Engine.create({ enableSleeping: false });
    engine.gravity.y = 1;
    engine.positionIterations = 8;
    engine.velocityIterations = 6;

    const wallOpts: Matter.IBodyDefinition = {
      isStatic: true, restitution: 0.55, friction: 0.15, render: { visible: false },
    };
    const THICK = 200;
    let walls: Matter.Body[] = [];
    const buildWalls = () => {
      walls = [
        Matter.Bodies.rectangle(W() / 2, floorY() + THICK / 2, W() + THICK * 2, THICK, wallOpts),
        Matter.Bodies.rectangle(W() / 2, -THICK * 3, W() + THICK * 2, THICK, wallOpts),
        Matter.Bodies.rectangle(-THICK / 2, H() / 2, THICK, H() * 5, wallOpts),
        Matter.Bodies.rectangle(W() + THICK / 2, H() / 2, THICK, H() * 5, wallOpts),
      ];
      Matter.Composite.add(engine.world, walls);
    };
    buildWalls();

    const timeouts: number[] = [];
    const makeBody = (i: number) => {
      const t = tags[i];
      const isCircle = t.el.classList.contains("ptag--circle") || t.el.classList.contains("ptag--dot");
      const opts: Matter.IBodyDefinition = {
        restitution: 0.55, friction: 0.15, frictionAir: 0.015, density: 0.0009,
      };
      let body: Matter.Body;
      if (isCircle) {
        body = Matter.Bodies.circle(W() * (0.1 + Math.random() * 0.8), -60 - Math.random() * 200, Math.max(t.w, t.h) / 2, opts);
      } else if (t.el.classList.contains("ptag--rect")) {
        body = Matter.Bodies.rectangle(W() * (0.1 + Math.random() * 0.8), -60 - Math.random() * 200, t.w, t.h, opts);
      } else {
        body = Matter.Bodies.rectangle(W() * (0.1 + Math.random() * 0.8), -60 - Math.random() * 200, t.w, t.h,
          { ...opts, chamfer: { radius: t.el.classList.contains("ptag--squircle") ? 18 : t.h / 2 } });
      }
      Matter.Body.setAngle(body, (Math.random() - 0.5) * 0.6);
      Matter.Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.2);
      t.body = body;
      Matter.Composite.add(engine.world, body);
    };
    const dropAll = () => {
      timeouts.forEach((t) => window.clearTimeout(t));
      timeouts.length = 0;
      tags.forEach((t) => {
        if (t.body) Matter.Composite.remove(engine.world, t.body);
        t.body = null;
      });
      tags.forEach((_, i) => {
        timeouts.push(window.setTimeout(() => makeBody(i), i * (70 + Math.random() * 30)));
      });
    };

    /* ── Mouse (forces applied in loop, not in handler) ──────────────────── */
    const mouse = Matter.Mouse.create(section);
    const syncMouse = () => {
      const r = section.getBoundingClientRect();
      Matter.Mouse.setOffset(mouse, { x: r.left, y: r.top });
      mouse.pixelRatio = window.devicePixelRatio || 1;
    };
    syncMouse();
    const mouseConstraint = Matter.MouseConstraint.create({
      mouse, constraint: { stiffness: 0.2, render: { visible: false } },
    });
    Matter.Composite.add(engine.world, mouseConstraint);
    const mEl = mouse.element as HTMLElement & { mousewheel?: EventListener };
    if (mEl.mousewheel) {
      mouse.element.removeEventListener("mousewheel", mEl.mousewheel);
      mouse.element.removeEventListener("DOMMouseScroll", mEl.mousewheel);
    }

    /* cursor state: throttled, lerped velocity, applied in the loop */
    const cursor = { x: -9999, y: -9999, vx: 0, vy: 0, tx: -9999, ty: -9999, active: false };
    let lastMove = 0;
    section.addEventListener("mousemove", (e) => {
      const now = performance.now();
      if (now - lastMove < 16) return; // throttle to ~60fps
      lastMove = now;
      const r = cachedRect;
      cursor.tx = e.clientX - r.left;
      cursor.ty = e.clientY - r.top;
      cursor.active = true;
    });
    section.addEventListener("mouseleave", () => { cursor.active = false; cursor.x = -9999; });

    let cachedRect = section.getBoundingClientRect();
    const recacheRect = () => { cachedRect = section.getBoundingClientRect(); };

    /* click: shockwave or tag jump */
    section.addEventListener("pointerdown", (e) => {
      const r = cachedRect;
      const cx = e.clientX - r.left, cy = e.clientY - r.top;
      const target = e.target as HTMLElement;
      const tagEl = target.closest(".ptag");
      tags.forEach((t) => {
        if (!t.body || t.body.isStatic) return;
        if (tagEl === t.el) {
          Matter.Body.applyForce(t.body, t.body.position, { x: 0, y: -0.005 });
          return;
        }
        if (tagEl) return;
        const dx = t.body.position.x - cx, dy = t.body.position.y - cy;
        const dist = Math.max(Math.hypot(dx, dy), 1);
        if (dist > 280) return;
        const falloff = 1 - dist / 280;
        const f = Math.min(0.005 * falloff, 0.004);
        Matter.Body.applyForce(t.body, t.body.position, {
          x: (dx / dist) * f, y: (dy / dist) * f - f * 0.35,
        });
      });
    });

    /* idle nudge */
    const idleTimer = window.setInterval(() => {
      if (document.hidden || !loopOn) return;
      const alive = tags.filter((t) => t.body && !t.body.isStatic);
      if (!alive.length) return;
      const t = alive[Math.floor(Math.random() * alive.length)];
      Matter.Body.applyForce(t.body!, t.body!.position, {
        x: (Math.random() - 0.5) * 0.0006, y: -Math.random() * 0.0007,
      });
    }, 3000);

    /* hover: scale inner (never fights physics transform) */
    tags.forEach((t) => {
      t.el.addEventListener("mouseenter", () => t.inner.classList.add("is-hover"));
      t.el.addEventListener("mouseleave", () => t.inner.classList.remove("is-hover"));
    });

    /* ── THE single loop: fixed timestep, no Runner ──────────────────────── */
    let raf = 0;
    let loopOn = false;
    let lastTime = 0;
    const FIXED = 1000 / 60;
    const MAX_FORCE = 0.0012;

    const loop = (now: number) => {
      if (!loopOn) return;
      raf = requestAnimationFrame(loop);
      // clamp delta: slow frames never cause a big jump
      let delta = Math.min(now - lastTime, 50);
      lastTime = now;
      // fixed-ish steps
      let acc = delta;
      while (acc >= FIXED) {
        Matter.Engine.update(engine, FIXED);
        acc -= FIXED;
      }

      /* smooth cursor velocity (lerp 0.2), apply capped push forces */
      if (cursor.active) {
        const sx = cursor.tx - cursor.x, sy = cursor.ty - cursor.y;
        cursor.vx += (sx - cursor.vx) * 0.2;
        cursor.vy += (sy - cursor.vy) * 0.2;
        cursor.x += cursor.vx;
        cursor.y += cursor.vy;
        const speed = Math.hypot(cursor.vx, cursor.vy);
        if (speed > 0.5) {
          tags.forEach((t) => {
            const b = t.body;
            if (!b || b.isStatic) return;
            const dx = b.position.x - cursor.x, dy = b.position.y - cursor.y;
            const dist = Math.hypot(dx, dy);
            if (dist > 140 || dist < 1) return;
            const falloff = 1 - dist / 140;
            let f = 0.00045 * falloff * Math.min(speed, 32);
            f = Math.min(f, MAX_FORCE); // cap so tags never explode
            Matter.Body.applyForce(b, b.position, {
              x: (dx / dist) * f + (cursor.vx / Math.max(speed, 1)) * f * 0.7,
              y: (dy / dist) * f + (cursor.vy / Math.max(speed, 1)) * f * 0.7 - f * 0.2,
            });
            Matter.Body.setAngularVelocity(b, b.angularVelocity * 0.995 + (Math.random() - 0.5) * 0.008 * falloff);
          });
        }
      }

      /* sync DOM: transform only, cached sizes */
      tags.forEach((t) => {
        const b = t.body;
        if (!b) return;
        // angular damping: don't spin forever
        if (Math.abs(b.angularVelocity) > 0.25) {
          Matter.Body.setAngularVelocity(b, b.angularVelocity * 0.97);
        } else if (Math.abs(b.velocity.x) < 0.35 && Math.abs(b.velocity.y) < 0.35) {
          const twoPi = Math.PI * 2;
          let a = ((b.angle % twoPi) + twoPi) % twoPi;
          if (a > Math.PI) a -= twoPi;
          Matter.Body.setAngle(b, b.angle - a * 0.02);
        }
        t.el.style.transform =
          `translate3d(${b.position.x - t.w / 2}px, ${b.position.y - t.h / 2}px, 0)` +
          ` rotate(${(b.angle * 180) / Math.PI}deg)`;
      });
    };
    const startLoop = () => {
      if (loopOn) return;
      loopOn = true;
      lastTime = performance.now();
      raf = requestAnimationFrame(loop);
    };
    const stopLoop = () => { loopOn = false; cancelAnimationFrame(raf); };

    /* scroll: re-drop on entry, pause off-screen (no time jump on resume) */
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.3) {
            syncMouse(); recacheRect();
            startLoop();
            dropAll();
          } else if (!entry.isIntersecting) {
            stopLoop();
          }
        });
      },
      { threshold: [0, 0.3, 0.6, 1] }
    );
    observer.observe(section);

    const onResize = () => {
      Matter.Composite.remove(engine.world, walls);
      buildWalls();
      syncMouse(); recacheRect();
      tags.forEach((t) => { t.w = Math.max(t.el.offsetWidth, 40); t.h = Math.max(t.el.offsetHeight, 32); });
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", () => { syncMouse(); recacheRect(); }, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", onResize);
      window.clearInterval(idleTimer);
      timeouts.forEach((t) => window.clearTimeout(t));
      stopLoop();
      Matter.Engine.clear(engine);
      tags.forEach((t) => t.el.remove());
    };
  }, []);

  return (
    <>
      <style>{`
        .physics-tags-section {
          position: relative;
          width: 100%;
          height: 80vh;
          min-height: 520px;
          background: var(--tags-bg);
          border-radius: var(--tags-radius);
          overflow: hidden;
          touch-action: pan-y;
          contain: layout paint;
        }
        .physics-tags-section, .physics-tags-section .ptag { pointer-events: auto; }
        /* outer: physics transform ONLY — no transition, no shadow/filter */
        .ptag {
          position: absolute;
          left: 0; top: 0;
          will-change: transform;
          backface-visibility: hidden;
          cursor: grab;
          user-select: none;
          -webkit-user-select: none;
          -webkit-tap-highlight-color: transparent;
          touch-action: pan-y;
        }
        .ptag:active { cursor: grabbing; }
        /* inner: visuals + hover scale (never fights physics) */
        .ptag-inner {
          padding: 14px 28px;
          border: none;
          border-radius: 9999px;
          font-family: "Geist:SemiBold", "Geist", system-ui, sans-serif;
          font-weight: 600;
          font-size: 22px;
          text-transform: uppercase;
          letter-spacing: 0.02em;
          white-space: nowrap;
          transition: scale 0.18s ease, filter 0.18s ease;
        }
        .ptag--lg .ptag-inner { font-size: 26px; padding: 16px 34px; }
        .ptag--circle .ptag-inner, .ptag--dot .ptag-inner {
          width: 58px; height: 58px; padding: 0;
          display: flex; align-items: center; justify-content: center;
        }
        .ptag--rect .ptag-inner { border-radius: 10px; }
        .ptag--squircle .ptag-inner { border-radius: 22px; }
        .ptag-inner.is-hover { scale: 1.06; filter: brightness(1.12); }
        @media (max-width: 767px) {
          .ptag-inner { font-size: 15px; padding: 10px 20px; }
          .ptag--lg .ptag-inner { font-size: 18px; padding: 12px 24px; }
          .ptag--circle .ptag-inner, .ptag--dot .ptag-inner { width: 44px; height: 44px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .ptag-inner { transition: none; }
        }
      `}</style>
      <div ref={sectionRef} className="physics-tags-section" style={CSS_VARS} aria-label="Design services tags" />
    </>
  );
}
