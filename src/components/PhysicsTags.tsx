import { useEffect, useRef } from "react";
import Matter from "matter-js";

/* ── Easy theming: change colors/sizes here ─────────────────────────────── */
const CSS_VARS = {
  "--tags-bg": "#1a1a1a",          // dark canvas background
  "--tags-radius": "24px",         // canvas corner radius
  "--tag-border": "#ffffff",       // pill outline color
  "--tag-border-width": "1.5px",   // pill outline thickness
  "--tag-text": "#ffffff",         // pill text color
  "--tag-font-size": "18px",       // desktop pill font size
  "--tag-font-size-mobile": "14px",// mobile pill font size
} as React.CSSProperties;

/* Words shown on the pills — edit freely. One extra empty circle is added. */
const WORDS_DESKTOP = [
  "BRANDING", "LOGO", "IDENTITY", "SOCIAL MEDIA",
  "PRINT", "PACKAGING", "TYPOGRAPHY", "GUIDELINES",
  "BRANDING", "IDENTITY", "LOGO", "DESIGN",
];
const WORDS_MOBILE = [
  "BRANDING", "LOGO", "IDENTITY", "SOCIAL MEDIA",
  "PRINT", "PACKAGING", "TYPOGRAPHY", "DESIGN",
];

/* A hand-tuned "settled" pile used when the user prefers reduced motion. */
const SETTLED_LAYOUT = [
  // [x%, y%, rotationDeg]
  [0.18, 0.30, -18], [0.42, 0.22, 12], [0.66, 0.28, -32], [0.84, 0.38, 20],
  [0.12, 0.52, 28], [0.36, 0.48, -8], [0.58, 0.55, 38], [0.80, 0.60, -14],
  [0.24, 0.72, 8], [0.50, 0.74, -26], [0.72, 0.78, 16], [0.90, 0.74, -38],
  [0.38, 0.62, 0], // empty circle
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

    /* ── Build the pill DOM elements ────────────────────────────────────── */
    const pills: HTMLDivElement[] = [];
    words.forEach((word) => {
      const el = document.createElement("div");
      el.className = "physics-tag";
      el.textContent = word;
      section.appendChild(el);
      pills.push(el);
    });
    // one empty circle outline
    const circle = document.createElement("div");
    circle.className = "physics-tag physics-tag--circle";
    section.appendChild(circle);
    pills.push(circle);

    const W = () => section.clientWidth;
    const H = () => section.clientHeight;

    /* ── Reduced motion: show the final pile, no physics ────────────────── */
    if (reduceMotion) {
      pills.forEach((el, i) => {
        const [px, py, rot] = SETTLED_LAYOUT[i % SETTLED_LAYOUT.length];
        el.style.left = `${px * W() - el.offsetWidth / 2}px`;
        el.style.top = `${py * H() - el.offsetHeight / 2}px`;
        el.style.transform = `rotate(${rot}deg)`;
      });
      return;
    }

    /* ── Matter.js world ────────────────────────────────────────────────── */
    const engine = Matter.Engine.create({ enableSleeping: true });
    engine.gravity.y = 1;

    const wallOpts: Matter.IBodyDefinition = {
      isStatic: true,
      restitution: 0.4,
      friction: 0.3,
      render: { visible: false },
    };
    const thick = 200;
    let walls = [
      Matter.Bodies.rectangle(W() / 2, H() + thick / 2, W() + thick * 2, thick, wallOpts), // floor
      Matter.Bodies.rectangle(-thick / 2, H() / 2, thick, H() * 3, wallOpts),               // left
      Matter.Bodies.rectangle(W() + thick / 2, H() / 2, thick, H() * 3, wallOpts),          // right
    ];
    Matter.Composite.add(engine.world, walls);

    /* Tag bodies are created lazily (measured after fonts load) so the
       physics shape matches the real pill size. */
    const bodies: (Matter.Body | null)[] = new Array(pills.length).fill(null);
    let dropped = 0;

    const makeBody = (i: number) => {
      const el = pills[i];
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      const x = W() * (0.15 + Math.random() * 0.7);
      const y = -80 - Math.random() * 120; // start above the section
      let body: Matter.Body;
      if (el.classList.contains("physics-tag--circle")) {
        const r = Math.max(w, h) / 2;
        body = Matter.Bodies.circle(x, y, r, {
          restitution: 0.4,
          friction: 0.3,
          density: 0.0012,
        });
      } else {
        body = Matter.Bodies.rectangle(x, y, w, h, {
          chamfer: { radius: h / 2 }, // pill-shaped collisions
          restitution: 0.4,
          friction: 0.3,
          density: 0.0012,
        });
      }
      Matter.Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.2);
      bodies[i] = body;
      Matter.Composite.add(engine.world, body);
      dropped++;
    };

    /* ── Drop tags one by one once the section is ~30% visible ──────────── */
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.3) {
            observer.disconnect();
            // stagger drops 80–120ms apart
            pills.forEach((_, i) => {
              const delay = i * (80 + Math.random() * 40);
              window.setTimeout(() => makeBody(i), delay);
            });
          }
        });
      },
      { threshold: [0, 0.3, 0.6, 1] }
    );
    observer.observe(section);

    /* ── Sync DOM to physics every frame ────────────────────────────────── */
    let raf = 0;
    const tick = () => {
      bodies.forEach((body, i) => {
        if (!body) return;
        const el = pills[i];
        const w = el.offsetWidth;
        const h = el.offsetHeight;
        el.style.left = `${body.position.x - w / 2}px`;
        el.style.top = `${body.position.y - h / 2}px`;
        el.style.transform = `rotate(${(body.angle * 180) / Math.PI}deg)`;
      });
      raf = requestAnimationFrame(tick);
    };
    // run the engine on its own runner so tab throttling stays sane
    const runner = Matter.Runner.create();
    Matter.Runner.run(runner, engine);
    tick();

    /* ── Draggable tags (mouse + touch), without hijacking page scroll ──── */
    const mouse = Matter.Mouse.create(section);
    const mouseConstraint = Matter.MouseConstraint.create({
      mouse,
      constraint: { stiffness: 0.2, render: { visible: false } },
    });
    Matter.Composite.add(engine.world, mouseConstraint);

    // Let vertical page scroll pass through: only capture horizontal drags.
    // touch-action: pan-y (in CSS) already allows vertical scroll; this keeps
    // the mouse constraint from fighting it on touch devices.
    const mc = mouseConstraint as unknown as { mouse: { element: HTMLElement } };
    mc.mouse.element.removeEventListener("touchmove", (mc.mouse as unknown as { touchmove: EventListener }).touchmove);

    // subtle scale-up on hover
    pills.forEach((el) => {
      el.addEventListener("mouseenter", () => el.classList.add("is-hover"));
      el.addEventListener("mouseleave", () => el.classList.remove("is-hover"));
    });

    /* ── Resize: rebuild the invisible walls ────────────────────────────── */
    const onResize = () => {
      Matter.Composite.remove(engine.world, walls);
      walls = [
        Matter.Bodies.rectangle(W() / 2, H() + thick / 2, W() + thick * 2, thick, wallOpts),
        Matter.Bodies.rectangle(-thick / 2, H() / 2, thick, H() * 3, wallOpts),
        Matter.Bodies.rectangle(W() + thick / 2, H() / 2, thick, H() * 3, wallOpts),
      ];
      Matter.Composite.add(engine.world, walls);
    };
    window.addEventListener("resize", onResize);

    /* ── Cleanup ────────────────────────────────────────────────────────── */
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(raf);
      Matter.Runner.stop(runner);
      Matter.Engine.clear(engine);
      mouseConstraint.mouse.element.removeEventListener("mousedown", () => {});
      pills.forEach((el) => el.remove());
      circle.remove();
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
          /* vertical page scroll always works; horizontal drags grab tags */
          touch-action: pan-y;
        }
        .physics-tag {
          position: absolute;
          left: -9999px; /* parked offscreen until physics places it */
          top: -9999px;
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
          cursor: grab;
          user-select: none;
          -webkit-user-select: none;
          transition: scale 0.18s ease;
          will-change: left, top, transform;
        }
        .physics-tag:active { cursor: grabbing; }
        .physics-tag.is-hover { scale: 1.07; }
        .physics-tag--circle {
          width: 54px;
          height: 54px;
          padding: 0;
        }
        @media (max-width: 767px) {
          .physics-tag { font-size: var(--tag-font-size-mobile); padding: 10px 20px; }
          .physics-tag--circle { width: 44px; height: 44px; }
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
