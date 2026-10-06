import { useEffect, useRef } from "react";
import Matter from "matter-js";

/* ── Easy theming ───────────────────────────────────────────────────────── */
const CSS_VARS = {
  "--tags-bg": "#1a1a1a",
  "--tags-radius": "24px",
  "--tag-border": "#ffffff",
  "--tag-border-width": "1.5px",
  "--tag-text": "#ffffff",
  "--tag-font-size": "18px",
  "--tag-font-size-mobile": "14px",
} as React.CSSProperties;

const WORDS_DESKTOP = [
  "BRANDING", "LOGO", "IDENTITY", "SOCIAL MEDIA",
  "PRINT", "PACKAGING", "TYPOGRAPHY", "GUIDELINES",
  "BRANDING", "IDENTITY", "LOGO", "DESIGN",
];
const WORDS_MOBILE = [
  "BRANDING", "LOGO", "IDENTITY", "SOCIAL MEDIA",
  "PRINT", "PACKAGING", "TYPOGRAPHY", "DESIGN",
];

/* Settled pile for prefers-reduced-motion (x%, y%, rotation°) */
const SETTLED_LAYOUT = [
  [0.18, 0.30, -18], [0.42, 0.22, 12], [0.66, 0.28, -32], [0.84, 0.38, 20],
  [0.12, 0.52, 28], [0.36, 0.48, -8], [0.58, 0.55, 38], [0.80, 0.60, -14],
  [0.24, 0.72, 8], [0.50, 0.74, -26], [0.72, 0.78, 16], [0.90, 0.74, -38],
  [0.38, 0.62, 0],
] as const;

export default function PhysicsTags() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || startedRef.current) return;
    startedRef.current = true;

    const isMobile = window.innerWidth < 768;
    const words = isMobile ? WORDS_MOBILE : WORDS_DESKTOP;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* ── Build pill DOM elements ────────────────────────────────────────── */
    const pills: HTMLDivElement[] = [];
    words.forEach((word) => {
      const el = document.createElement("div");
      el.className = "physics-tag";
      el.textContent = word;
      section.appendChild(el);
      pills.push(el);
    });
    const circle = document.createElement("div");
    circle.className = "physics-tag physics-tag--circle";
    section.appendChild(circle);
    pills.push(circle);

    const W = () => section.clientWidth;
    const H = () => section.clientHeight;

    /* ── Reduced motion: static final pile, no physics ──────────────────── */
    if (reduceMotion) {
      pills.forEach((el, i) => {
        const [px, py, rot] = SETTLED_LAYOUT[i % SETTLED_LAYOUT.length];
        el.style.left = "0";
        el.style.top = "0";
        el.style.transform =
          `translate3d(${px * W() - el.offsetWidth / 2}px, ${py * H() - el.offsetHeight / 2}px, 0) rotate(${rot}deg)`;
      });
      return;
    }

    /* ── FIX 1: engine with sleeping DISABLED so tags stay alive forever ── */
    const engine = Matter.Engine.create({ enableSleeping: false });
    engine.gravity.y = 1;

    const wallOpts: Matter.IBodyDefinition = {
      isStatic: true,
      restitution: 0.5,
      friction: 0.2,
      render: { visible: false },
    };
    const THICK = 200;
    let walls: Matter.Body[] = [];
    const buildWalls = () => {
      walls = [
        Matter.Bodies.rectangle(W() / 2, H() + THICK / 2, W() + THICK * 2, THICK, wallOpts), // floor
        Matter.Bodies.rectangle(W() / 2, -THICK * 2, W() + THICK * 2, THICK, wallOpts),      // ceiling (above drop zone)
        Matter.Bodies.rectangle(-THICK / 2, H() / 2, THICK, H() * 4, wallOpts),              // left
        Matter.Bodies.rectangle(W() + THICK / 2, H() / 2, THICK, H() * 4, wallOpts),         // right
      ];
      Matter.Composite.add(engine.world, walls);
    };
    buildWalls();

    const bodies: (Matter.Body | null)[] = new Array(pills.length).fill(null);
    const timeouts: number[] = [];

    const makeBody = (i: number) => {
      const el = pills[i];
      const w = Math.max(el.offsetWidth, 40);
      const h = Math.max(el.offsetHeight, 30);
      const x = W() * (0.15 + Math.random() * 0.7);
      const y = -80 - Math.random() * 160;
      const opts: Matter.IBodyDefinition = {
        restitution: 0.5,
        friction: 0.2,
        frictionAir: 0.01,   // light air drag — tags feel floaty, settle softly
        density: 0.0009,     // slightly low density — tags feel light
      };
      let body: Matter.Body;
      if (el.classList.contains("physics-tag--circle")) {
        body = Matter.Bodies.circle(x, y, Math.max(w, h) / 2, opts);
      } else {
        body = Matter.Bodies.rectangle(x, y, w, h, {
          ...opts,
          chamfer: { radius: h / 2 },
        });
      }
      Matter.Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.25);
      bodies[i] = body;
      Matter.Composite.add(engine.world, body);
    };

    /* Drop (or re-drop) all tags with stagger */
    const dropAll = () => {
      timeouts.forEach((t) => window.clearTimeout(t));
      timeouts.length = 0;
      bodies.forEach((b, i) => {
        if (b) Matter.Composite.remove(engine.world, b);
        bodies[i] = null;
      });
      pills.forEach((_, i) => {
        timeouts.push(window.setTimeout(() => makeBody(i), i * (80 + Math.random() * 40)));
      });
    };

    /* ── FIX 2: Mouse + MouseConstraint on the SECTION (not body) ───────── */
    const mouse = Matter.Mouse.create(section);
    // map mouse coords to the section even when the page is scrolled/scaled
    const syncMouseOffset = () => {
      const r = section.getBoundingClientRect();
      Matter.Mouse.setOffset(mouse, { x: r.left, y: r.top });
      mouse.pixelRatio = window.devicePixelRatio || 1;
    };
    syncMouseOffset();

    const mouseConstraint = Matter.MouseConstraint.create({
      mouse,
      constraint: { stiffness: 0.2, render: { visible: false } }, // no visible line
    });
    Matter.Composite.add(engine.world, mouseConstraint);

    // FIX: let the page keep scrolling — strip Matter's wheel listeners
    const mEl = mouse.element as HTMLElement & { mousewheel?: EventListener };
    if (mEl.mousewheel) {
      mouse.element.removeEventListener("mousewheel", mEl.mousewheel);
      mouse.element.removeEventListener("DOMMouseScroll", mEl.mousewheel);
    }

    /* ── NEW: cursor push — tags near the cursor get gently pushed away ──── */
    let lastCX = -9999, lastCY = -9999;
    const PUSH_RADIUS = 120;
    section.addEventListener("mousemove", (e) => {
      const r = section.getBoundingClientRect();
      const cx = e.clientX - r.left;
      const cy = e.clientY - r.top;
      const vx = cx - lastCX; // cursor velocity
      const vy = cy - lastCY;
      lastCX = cx; lastCY = cy;
      const speed = Math.hypot(vx, vy);
      if (speed < 0.5) return;
      bodies.forEach((body) => {
        if (!body || body.isStatic) return;
        const dx = body.position.x - cx;
        const dy = body.position.y - cy;
        const dist = Math.hypot(dx, dy);
        if (dist > PUSH_RADIUS || dist < 1) return;
        const falloff = 1 - dist / PUSH_RADIUS;             // closer = stronger
        const force = 0.00035 * falloff * Math.min(speed, 30);
        Matter.Body.applyForce(body, body.position, {
          x: (dx / dist) * force + (vx / Math.max(speed, 1)) * force * 0.6,
          y: (dy / dist) * force + (vy / Math.max(speed, 1)) * force * 0.6 - force * 0.25,
        });
        // a little spin for natural tumble
        Matter.Body.setAngularVelocity(body, body.angularVelocity + (Math.random() - 0.5) * 0.02 * falloff);
      });
    });
    section.addEventListener("mouseleave", () => { lastCX = -9999; lastCY = -9999; });

    /* ── NEW: click/tap on empty space → shockwave pushes tags outward ──── */
    section.addEventListener("pointerdown", (e) => {
      if ((e.target as HTMLElement).closest(".physics-tag")) return; // tag handles its own drag
      const r = section.getBoundingClientRect();
      const cx = e.clientX - r.left;
      const cy = e.clientY - r.top;
      bodies.forEach((body) => {
        if (!body || body.isStatic) return;
        const dx = body.position.x - cx;
        const dy = body.position.y - cy;
        const dist = Math.max(Math.hypot(dx, dy), 1);
        if (dist > 260) return;
        const falloff = 1 - dist / 260;
        const force = 0.004 * falloff;
        Matter.Body.applyForce(body, body.position, {
          x: (dx / dist) * force,
          y: (dy / dist) * force - force * 0.4,
        });
      });
    });

    /* ── NEW: idle life — tiny nudge to a random tag every 3–4s ──────────── */
    const idleTimer = window.setInterval(() => {
      if (document.hidden) return;
      const alive = bodies.filter((b): b is Matter.Body => !!b && !b.isStatic);
      if (!alive.length) return;
      const body = alive[Math.floor(Math.random() * alive.length)];
      Matter.Body.applyForce(body, body.position, {
        x: (Math.random() - 0.5) * 0.0006,
        y: -Math.random() * 0.0008,
      });
    }, 3200 + Math.random() * 800);

    /* ── Hover: scale up the tag under the cursor ────────────────────────── */
    pills.forEach((el) => {
      el.addEventListener("mouseenter", () => el.classList.add("is-hover"));
      el.addEventListener("mouseleave", () => el.classList.remove("is-hover"));
    });

    /* ── Sync DOM with translate3d + rotate every frame ──────────────────── */
    let raf = 0;
    const tick = () => {
      bodies.forEach((body, i) => {
        if (!body) return;
        const el = pills[i];
        const w = el.offsetWidth;
        const h = el.offsetHeight;
        // gentle readability: damp extreme spin so text rarely ends fully upside-down
        if (Math.abs(body.angularVelocity) > 0.35) {
          Matter.Body.setAngularVelocity(body, body.angularVelocity * 0.96);
        }
        el.style.transform =
          `translate3d(${body.position.x - w / 2}px, ${body.position.y - h / 2}px, 0)` +
          ` rotate(${(body.angle * 180) / Math.PI}deg)`;
      });
      raf = requestAnimationFrame(tick);
    };

    const runner = Matter.Runner.create();
    let runnerOn = false;
    const startRunner = () => { if (!runnerOn) { Matter.Runner.run(runner, engine); runnerOn = true; } };
    const stopRunner = () => { if (runnerOn) { Matter.Runner.stop(runner); runnerOn = false; } };
    startRunner();
    tick();

    /* ── Scroll: re-trigger drop on every entry, pause when out of view ─── */
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.3) {
            syncMouseOffset();
            startRunner();
            dropAll(); // lift & drop again on every re-entry
          } else if (!entry.isIntersecting) {
            stopRunner(); // save performance off-screen
          }
        });
      },
      { threshold: [0, 0.3, 0.6, 1] }
    );
    observer.observe(section);

    /* ── Resize: rebuild walls, re-sync mouse mapping ───────────────────── */
    const onResize = () => {
      Matter.Composite.remove(engine.world, walls);
      buildWalls();
      syncMouseOffset();
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", syncMouseOffset, { passive: true });

    /* ── Cleanup ────────────────────────────────────────────────────────── */
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", syncMouseOffset);
      window.clearInterval(idleTimer);
      timeouts.forEach((t) => window.clearTimeout(t));
      cancelAnimationFrame(raf);
      stopRunner();
      Matter.Engine.clear(engine);
      pills.forEach((el) => el.remove());
    };
  }, []);

  return (
    <>
      <style>{`
        .physics-tags-section {
          position: relative;
          width: 100%;
          height: 100%;
          background: var(--tags-bg);
          border-radius: var(--tags-radius);
          overflow: hidden;
          touch-action: pan-y; /* vertical scroll works; horizontal drags grab tags */
        }
        /* FIX 3: container receives pointer events; nothing above the tags */
        .physics-tags-section, .physics-tags-section .physics-tag { pointer-events: auto; }
        .physics-tag {
          position: absolute;
          left: 0;
          top: 0;
          padding: 12px 26px;
          border: var(--tag-border-width) solid var(--tag-border);
          border-radius: 9999px;
          background: transparent;
          color: var(--tag-text);
          font-family: inherit;
          font-weight: 700;
          font-size: var(--tag-font-size);
          text-transform: uppercase;
          letter-spacing: 0.02em;
          white-space: nowrap;
          cursor: grab; /* FIX 3: grab cursor */
          user-select: none;
          -webkit-user-select: none;
          -webkit-tap-highlight-color: transparent;
          touch-action: pan-y; /* FIX 4: deliberate touch on tag drags; scroll still works */
          will-change: transform;
          transition: scale 0.18s ease;
        }
        .physics-tag:active { cursor: grabbing; } /* FIX 3: grabbing while held */
        .physics-tag.is-hover { scale: 1.05; }     /* hover scale-up */
        .physics-tag--circle { width: 54px; height: 54px; padding: 0; }
        @media (max-width: 767px) {
          .physics-tag { font-size: var(--tag-font-size-mobile); padding: 10px 20px; }
          .physics-tag--circle { width: 44px; height: 44px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .physics-tag { transition: none; }
        }
      `}</style>
      <div
        ref={sectionRef}
        className="physics-tags-section"
        style={CSS_VARS}
        aria-label="Design services tags"
      />
    </>
  );
}
