import { useEffect, useRef } from "react";
import Matter from "matter-js";

/* ── Colors via CSS variables ───────────────────────────────────────────── */
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
  "--tag-font-size": "22px",
  "--tag-font-size-mobile": "15px",
} as React.CSSProperties;

/* word pool — repeated to reach ~30 tags */
const WORD_POOL = [
  "BRANDING", "LOGO", "IDENTITY", "SOCIAL MEDIA", "PRINT",
  "PACKAGING", "TYPOGRAPHY", "GUIDELINES", "DESIGN", "STRATEGY",
];
/* filled pill styles: [bg var, text color, outline?] */
const PALETTE: Array<[string, string, string?]> = [
  ["var(--c-pink)", "#ffffff"],
  ["var(--c-blue)", "#ffffff"],
  ["var(--c-orange)", "#ffffff"],
  ["var(--c-amber)", "#111111"],
  ["var(--c-yellow)", "#111111"],
  ["var(--c-offwhite)", "#111111"],
  ["var(--c-black)", "#ffffff", "1.5px solid #ffffff"],
];

const TAG_COUNT_DESKTOP = 30;
const TAG_COUNT_MOBILE = 16;
/* bottom padding so the CONTACT pill never overlaps tags */
const FLOOR_PADDING = 96;

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

    /* ── Build pills: words cycled, colors shuffled evenly ──────────────── */
    // shuffle palette so identical colors rarely touch
    const colorOrder: number[] = [];
    for (let i = 0; i < tagCount; i++) colorOrder.push(i % PALETTE.length);
    for (let i = colorOrder.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [colorOrder[i], colorOrder[j]] = [colorOrder[j], colorOrder[i]];
    }

    const pills: HTMLDivElement[] = [];
    for (let i = 0; i < tagCount; i++) {
      const el = document.createElement("div");
      el.className = "physics-tag";
      // a few tags larger for variety
      if (i % 7 === 3) el.classList.add("physics-tag--lg");
      el.textContent = WORD_POOL[i % WORD_POOL.length];
      const [bg, fg, outline] = PALETTE[colorOrder[i]];
      el.style.background = bg;
      el.style.color = fg;
      if (outline) el.style.border = outline;
      section.appendChild(el);
      pills.push(el);
    }
    // solid yellow circle instead of outline
    const circle = document.createElement("div");
    circle.className = "physics-tag physics-tag--circle";
    circle.style.background = "var(--c-yellow)";
    section.appendChild(circle);
    pills.push(circle);

    const W = () => section.clientWidth;
    const H = () => section.clientHeight;
    const floorY = () => H() - FLOOR_PADDING; // physics floor sits above the padding

    if (reduceMotion) {
      // static scattered pile, no physics
      pills.forEach((el, i) => {
        const px = 0.08 + Math.random() * 0.84;
        const py = 0.35 + Math.random() * 0.5;
        const rot = (Math.random() - 0.5) * 70;
        el.style.transform =
          `translate3d(${px * W() - el.offsetWidth / 2}px, ${Math.min(py * H(), floorY() - el.offsetHeight)}px, 0) rotate(${rot}deg)`;
      });
      return;
    }

    /* ── Engine: NEVER sleep ────────────────────────────────────────────── */
    const engine = Matter.Engine.create({ enableSleeping: false });
    engine.gravity.y = 1;

    const wallOpts: Matter.IBodyDefinition = {
      isStatic: true, restitution: 0.55, friction: 0.15, render: { visible: false },
    };
    const THICK = 200;
    let walls: Matter.Body[] = [];
    const buildWalls = () => {
      walls = [
        Matter.Bodies.rectangle(W() / 2, floorY() + THICK / 2, W() + THICK * 2, THICK, wallOpts),
        Matter.Bodies.rectangle(W() / 2, -THICK * 3, W() + THICK * 2, THICK, wallOpts), // high ceiling
        Matter.Bodies.rectangle(-THICK / 2, H() / 2, THICK, H() * 5, wallOpts),
        Matter.Bodies.rectangle(W() + THICK / 2, H() / 2, THICK, H() * 5, wallOpts),
      ];
      Matter.Composite.add(engine.world, walls);
    };
    buildWalls();

    const bodies: (Matter.Body | null)[] = new Array(pills.length).fill(null);
    const timeouts: number[] = [];

    const makeBody = (i: number) => {
      const el = pills[i];
      const w = Math.max(el.offsetWidth, 44);
      const h = Math.max(el.offsetHeight, 32);
      const x = W() * (0.1 + Math.random() * 0.8);
      const y = -60 - Math.random() * 200;
      const opts: Matter.IBodyDefinition = {
        restitution: 0.55, friction: 0.15, frictionAir: 0.01, density: 0.0009,
      };
      const body = el.classList.contains("physics-tag--circle")
        ? Matter.Bodies.circle(x, y, Math.max(w, h) / 2, opts)
        : Matter.Bodies.rectangle(x, y, w, h, { ...opts, chamfer: { radius: h / 2 } });
      Matter.Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.3);
      bodies[i] = body;
      Matter.Composite.add(engine.world, body);
    };

    const dropAll = () => {
      timeouts.forEach((t) => window.clearTimeout(t));
      timeouts.length = 0;
      bodies.forEach((b, i) => {
        if (b) Matter.Composite.remove(engine.world, b);
        bodies[i] = null;
      });
      pills.forEach((_, i) => {
        timeouts.push(window.setTimeout(() => makeBody(i), i * (70 + Math.random() * 30)));
      });
    };

    /* ── Mouse + MouseConstraint on the section ─────────────────────────── */
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
    // keep page scroll working
    const mEl = mouse.element as HTMLElement & { mousewheel?: EventListener };
    if (mEl.mousewheel) {
      mouse.element.removeEventListener("mousewheel", mEl.mousewheel);
      mouse.element.removeEventListener("DOMMouseScroll", mEl.mousewheel);
    }

    /* ── HOVER PUSH: tags within ~140px get pushed away ─────────────────── */
    let lastCX = -9999, lastCY = -9999;
    section.addEventListener("mousemove", (e) => {
      const r = section.getBoundingClientRect();
      const cx = e.clientX - r.left, cy = e.clientY - r.top;
      const vx = cx - lastCX, vy = cy - lastCY;
      lastCX = cx; lastCY = cy;
      const speed = Math.hypot(vx, vy);
      if (speed < 0.5) return;
      bodies.forEach((body) => {
        if (!body || body.isStatic) return;
        const dx = body.position.x - cx, dy = body.position.y - cy;
        const dist = Math.hypot(dx, dy);
        if (dist > 140 || dist < 1) return;
        const falloff = 1 - dist / 140;
        const f = 0.00045 * falloff * Math.min(speed, 32);
        Matter.Body.applyForce(body, body.position, {
          x: (dx / dist) * f + (vx / Math.max(speed, 1)) * f * 0.7,
          y: (dy / dist) * f + (vy / Math.max(speed, 1)) * f * 0.7 - f * 0.2,
        });
        Matter.Body.setAngularVelocity(body, body.angularVelocity + (Math.random() - 0.5) * 0.03 * falloff);
      });
    });
    section.addEventListener("mouseleave", () => { lastCX = -9999; lastCY = -9999; });

    /* ── CLICK: empty space = shockwave; tag = jump ─────────────────────── */
    section.addEventListener("pointerdown", (e) => {
      const r = section.getBoundingClientRect();
      const cx = e.clientX - r.left, cy = e.clientY - r.top;
      const onTag = (e.target as HTMLElement).closest(".physics-tag");
      bodies.forEach((body, i) => {
        if (!body || body.isStatic) return;
        if (onTag === pills[i]) {
          // jump impulse on the clicked tag
          Matter.Body.applyForce(body, body.position, { x: 0, y: -0.006 });
          Matter.Body.setAngularVelocity(body, body.angularVelocity + (Math.random() - 0.5) * 0.2);
          return;
        }
        if (onTag) return; // clicked a different tag — only it jumps
        const dx = body.position.x - cx, dy = body.position.y - cy;
        const dist = Math.max(Math.hypot(dx, dy), 1);
        if (dist > 280) return;
        const falloff = 1 - dist / 280;
        const f = 0.005 * falloff;
        Matter.Body.applyForce(body, body.position, {
          x: (dx / dist) * f, y: (dy / dist) * f - f * 0.35,
        });
      });
    });

    /* ── IDLE LIFE: tiny nudge every 3s ─────────────────────────────────── */
    const idleTimer = window.setInterval(() => {
      if (document.hidden) return;
      const alive = bodies.filter((b): b is Matter.Body => !!b && !b.isStatic);
      if (!alive.length) return;
      const body = alive[Math.floor(Math.random() * alive.length)];
      Matter.Body.applyForce(body, body.position, {
        x: (Math.random() - 0.5) * 0.0007, y: -Math.random() * 0.0009,
      });
    }, 3000);

    /* ── Hover brighten + scale ─────────────────────────────────────────── */
    pills.forEach((el) => {
      el.addEventListener("mouseenter", () => el.classList.add("is-hover"));
      el.addEventListener("mouseleave", () => el.classList.remove("is-hover"));
    });

    /* ── Frame sync with readability damping ────────────────────────────── */
    let raf = 0;
    const tick = () => {
      bodies.forEach((body, i) => {
        if (!body) return;
        const el = pills[i];
        const w = el.offsetWidth, h = el.offsetHeight;
        // readability: damp wild spin, gently ease angle toward nearest upright
        if (Math.abs(body.angularVelocity) > 0.3) {
          Matter.Body.setAngularVelocity(body, body.angularVelocity * 0.95);
        } else if (Math.abs(body.velocity.x) < 0.4 && Math.abs(body.velocity.y) < 0.4) {
          const twoPi = Math.PI * 2;
          let a = ((body.angle % twoPi) + twoPi) % twoPi;
          if (a > Math.PI) a -= twoPi;
          Matter.Body.setAngle(body, body.angle - a * 0.02);
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

    /* ── Scroll: re-drop on every entry, pause off-screen ────────────────── */
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.3) {
            syncMouse();
            startRunner();
            dropAll();
          } else if (!entry.isIntersecting) {
            stopRunner();
          }
        });
      },
      { threshold: [0, 0.3, 0.6, 1] }
    );
    observer.observe(section);

    const onResize = () => {
      Matter.Composite.remove(engine.world, walls);
      buildWalls();
      syncMouse();
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", syncMouse, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", syncMouse);
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
          height: 80vh;
          min-height: 520px;
          background: var(--tags-bg);
          border-radius: var(--tags-radius);
          overflow: hidden;
          touch-action: pan-y;
        }
        .physics-tags-section, .physics-tags-section .physics-tag { pointer-events: auto; }
        .physics-tag {
          position: absolute;
          left: 0; top: 0;
          padding: 14px 28px;
          border: none;
          border-radius: 9999px;
          font-family: inherit;
          font-weight: 800;
          font-size: var(--tag-font-size);
          text-transform: uppercase;
          letter-spacing: 0.02em;
          white-space: nowrap;
          cursor: grab;
          user-select: none;
          -webkit-user-select: none;
          -webkit-tap-highlight-color: transparent;
          touch-action: pan-y;
          will-change: transform;
          transition: scale 0.18s ease, filter 0.18s ease;
        }
        .physics-tag--lg { font-size: 26px; padding: 16px 34px; }
        .physics-tag:active { cursor: grabbing; }
        .physics-tag.is-hover { scale: 1.06; filter: brightness(1.12); }
        .physics-tag--circle { width: 58px; height: 58px; padding: 0; }
        @media (max-width: 767px) {
          .physics-tag { font-size: var(--tag-font-size-mobile); padding: 10px 20px; }
          .physics-tag--lg { font-size: 18px; padding: 12px 24px; }
          .physics-tag--circle { width: 44px; height: 44px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .physics-tag { transition: none; }
        }
      `}</style>
      <div ref={sectionRef} className="physics-tags-section" style={CSS_VARS} aria-label="Design services tags" />
    </>
  );
}
