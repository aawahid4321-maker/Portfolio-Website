import { useEffect, useRef } from "react";
import Matter from "matter-js";

/* ── Palette: purple-light reduced, orange added ────────────────────────────
   Split: Purple Light 24% / Orange 20% / Pink 17% / Yellow 17% / White 14% / Black 8% */
const COLORS = {
  bg: "#0D0D0D",
  purpleLight: "#A58CF4",
  orange: "#ff5a00",
  pink: "#ff0a8a",
  yellow: "#ffd60a",
  softWhite: "#FAFAFA",
  jetBlack: "#0D0D0D",
} as const;

type PillDef = { bg: string; fg: string; outline?: string };
const PILL_DEFS = {
  purple: { bg: COLORS.purpleLight, fg: "#0D0D0D" },
  orange: { bg: COLORS.orange, fg: "#0D0D0D" },
  pink: { bg: COLORS.pink, fg: "#FAFAFA" },
  yellow: { bg: COLORS.yellow, fg: "#0D0D0D" },
  white: { bg: COLORS.softWhite, fg: "#0D0D0D" },
  black: { bg: COLORS.jetBlack, fg: "#FAFAFA", outline: "rgba(250,250,250,0.7)" },
} as const;

/* Build exact-count color list (round-robin), then shuffle for even spread */
const buildPalette = (count: number): PillDef[] => {
  const parts: Array<[PillDef, number]> = [
    [PILL_DEFS.purple, 0.24],
    [PILL_DEFS.orange, 0.20],
    [PILL_DEFS.pink, 0.17],
    [PILL_DEFS.yellow, 0.17],
    [PILL_DEFS.white, 0.14],
    [PILL_DEFS.black, 0.08],
  ];
  const list: PillDef[] = [];
  let assigned = 0;
  parts.forEach(([def, frac], idx) => {
    // last part takes the remainder to hit exact count
    const n = idx === parts.length - 1
      ? count - assigned
      : Math.round(count * frac);
    for (let i = 0; i < n; i++) list.push({ ...def });
    assigned += n;
  });
  // shuffle
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  // fix-up: never two adjacent same color; keep orange away from pink/yellow
  const isWarm = (bg: string) => bg === COLORS.orange || bg === COLORS.pink || bg === COLORS.yellow;
  for (let i = 1; i < list.length; i++) {
    const prev = list[i - 1].bg, cur = list[i].bg;
    const clash = cur === prev || (cur === COLORS.orange && isWarm(prev) && prev !== COLORS.orange);
    if (clash) {
      for (let k = i + 1; k < list.length; k++) {
        const cand = list[k].bg;
        const candClash = cand === prev || (cand === COLORS.orange && isWarm(prev) && prev !== COLORS.orange);
        if (!candClash) { [list[i], list[k]] = [list[k], list[i]]; break; }
      }
    }
  }
  return list;
};

/* Words: Geist = uppercase words; Zilla = uppercase singles + normal-case phrases */
const GEIST_WORDS = ["LOGO", "BRANDING", "IDENTITY", "PACKAGING", "PRINT", "DESIGN", "TYPOGRAPHY", "SOCIAL MEDIA", "GUIDELINES", "STRATEGY"];
const ZILLA_WORDS = ["LOGO", "IDEAS", "hello!", "cool stuff", "made with love", "brand story", "let's talk", "say hi"];

const TAG_COUNT_DESKTOP = 26;
const TAG_COUNT_MOBILE = 14;
const SHAPE_COUNT_DESKTOP = 16;
const SHAPE_COUNT_MOBILE = 8;
const FLOOR_PADDING = 96; // floor sits 96px above section bottom (clear of CONTACT pill)
/* (push radius is defined inline in the loop as PUSH_R = 150) */

interface PTag {
  word: string;
  zilla: boolean; // true = Zilla Slab, false = Geist
  font: string;   // cached canvas font string
  w: number; h: number;
  color: PillDef;
  body: Matter.Body | null;
  // interpolated draw state (smooth on 120Hz screens)
  dx: number; dy: number; da: number;
  hoverT: number; // 0..1 hover scale lerp
}
interface PShape {
  kind: "circle" | "face" | "ring" | "star" | "square" | "dome" | "triangle" | "plus" | "squiggle";
  size: number;
  color: string;
  body: Matter.Body | null;
  dx: number; dy: number; da: number;
  hoverT: number;
}

export default function PhysicsTags() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    const section = sectionRef.current;
    const canvas = canvasRef.current;
    if (!section || !canvas || startedRef.current) return;
    startedRef.current = true; // init once; guards Strict Mode double-mount

    const ctx = canvas.getContext("2d")!;
    const isMobile = window.innerWidth < 768;
    const tagCount = isMobile ? TAG_COUNT_MOBILE : TAG_COUNT_DESKTOP;
    const shapeCount = isMobile ? SHAPE_COUNT_MOBILE : SHAPE_COUNT_DESKTOP;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const DPR = Math.min(window.devicePixelRatio || 1, 2); // cap DPR at 2

    let W = 0, H = 0;
    const resizeCanvas = () => {
      W = section.clientWidth;
      H = section.clientHeight;
      canvas.width = Math.round(W * DPR);
      canvas.height = Math.round(H * DPR);
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0); // draw in CSS px
    };
    resizeCanvas();

    /* ── Tag defs: ~65% Geist / ~35% Zilla, exact color split via shuffled list ── */
    const palette = buildPalette(tagCount); // 24/20/17/17/14/8, no adjacent dupes
    // ~35% Zilla spread evenly through the list
    const zillaCount = Math.round(tagCount * 0.35);
    const zillaAt = new Set<number>();
    const zStep = tagCount / zillaCount;
    for (let k = 0; k < zillaCount; k++) {
      let idx = Math.floor(k * zStep + zStep / 2);
      if (zillaAt.has(idx - 1) || zillaAt.has(idx + 1)) idx = Math.min(tagCount - 1, idx + 2);
      zillaAt.add(Math.max(0, Math.min(tagCount - 1, idx)));
    }

    const tags: PTag[] = [];
    for (let i = 0; i < tagCount; i++) {
      const zilla = zillaAt.has(i);
      const word = zilla
        ? ZILLA_WORDS[i % ZILLA_WORDS.length]
        : GEIST_WORDS[i % GEIST_WORDS.length];
      // Geist 600 20px uppercase + 0.02em spacing; Zilla Slab 700 22px
      const font = zilla
        ? `700 22px "Zilla Slab", Rockwell, Georgia, serif`
        : `600 20px "Geist", system-ui, sans-serif`;
      tags.push({
        word, zilla, font, w: 0, h: 0,
        color: palette[i],
        body: null, dx: 0, dy: 0, da: 0, hoverT: 0,
      });
    }

    /* ── Shapes: no text, same palette (no plain black shapes) ──────────── */
    const SHAPE_KINDS: PShape["kind"][] = [
      "circle", "circle", "circle", "face", "face", "ring",
      "star", "star", "star", "square", "square", "dome", "dome",
      "triangle", "plus", "squiggle",
    ];
    /* shapes: same palette as pills; 3-4 orange shapes; stars in yellow/orange/pink */
    const shapePalette = buildPalette(shapeCount);
    const STAR_COLORS = [COLORS.yellow, COLORS.orange, COLORS.pink];
    const shapes: PShape[] = [];
    let orangeShapes = 0;
    for (let i = 0; i < shapeCount; i++) {
      const kind = SHAPE_KINDS[i % SHAPE_KINDS.length];
      const size = Math.min(28 + Math.random() * 28, 64); // 28–56px
      let color: string;
      if (kind === "star") {
        color = STAR_COLORS[i % STAR_COLORS.length];
      } else if (orangeShapes < 4 && shapePalette[i].bg !== COLORS.orange && i % 4 === 1) {
        color = COLORS.orange; orangeShapes++; // ensure 3-4 orange shapes
      } else {
        color = shapePalette[i].bg;
        if (color === COLORS.jetBlack) color = COLORS.purpleLight; // no plain black shapes
      }
      shapes.push({ kind, size, color, body: null, dx: 0, dy: 0, da: 0, hoverT: 0 });
    }

    const floorY = () => H - FLOOR_PADDING;

    /* ── Engine: physics only, fixed timestep ───────────────────────────── */
    const engine = Matter.Engine.create({ enableSleeping: false });
    engine.gravity.y = 1;
    engine.positionIterations = 6;
    engine.velocityIterations = 4;

    const wallOpts: Matter.IBodyDefinition = {
      isStatic: true, restitution: 0.5, friction: 0.15, render: { visible: false },
    };
    const THICK = 200; // thick invisible walls
    let walls: Matter.Body[] = [];
    const buildWalls = () => {
      walls = [
        Matter.Bodies.rectangle(W / 2, floorY() + THICK / 2, W + THICK * 2, THICK, wallOpts), // floor
        Matter.Bodies.rectangle(W / 2, -THICK * 3, W + THICK * 2, THICK, wallOpts),          // high ceiling
        Matter.Bodies.rectangle(-THICK / 2, H / 2, THICK, H * 5, wallOpts),                  // left
        Matter.Bodies.rectangle(W + THICK / 2, H / 2, THICK, H * 5, wallOpts),                // right
      ];
      Matter.Composite.add(engine.world, walls);
    };

    /* ── Measure text after BOTH fonts load, then build ─────────────────── */
    const GEIST_FONT = `600 20px "Geist", system-ui, sans-serif`;
    const ZILLA_FONT = `700 22px "Zilla Slab", Rockwell, Georgia, serif`;
    let ready = false;
    let hasDropped = false; // drop ONCE, never again

    const measureAndBuild = () => {
      if (ready) return;
      tags.forEach((t) => {
        ctx.font = t.zilla ? ZILLA_FONT : GEIST_FONT;
        const raw = ctx.measureText(t.word).width;
        t.h = 56; // 52–60px pill height
        // width = text + 56px; Geist gets manual ~0.02em letter-spacing
        t.w = raw + 56 + (t.zilla ? 0 : t.word.length * 0.4);
      });
      buildWalls();
      ready = true;
      // FIX: ensure loop is running now that we're ready (observer may have fired early)
      const r = section.getBoundingClientRect();
      const inView = r.top < window.innerHeight * 0.7 && r.bottom > window.innerHeight * 0.3;
      if (inView) startLoop();
      maybeDrop();
    };

    const timeouts: number[] = [];
    const spawnTag = (i: number) => {
      const t = tags[i];
      const x = W * (0.1 + Math.random() * 0.8);
      const y = -60 - Math.random() * 200; // spawned above, falls naturally
      const body = Matter.Bodies.rectangle(x, y, t.w, t.h, {
        chamfer: { radius: t.h / 2 }, // collider matches the full-round pill
        restitution: 0.5, friction: 0.15, frictionAir: 0.018, density: 0.0009,
      });
      Matter.Body.setAngle(body, (Math.random() - 0.5) * 0.6);
      Matter.Sleeping.set(body, false); // FIX: never let bodies sleep
      t.body = body;
      t.dx = x; t.dy = y; t.da = body.angle;
      Matter.Composite.add(engine.world, body);
    };
    const spawnShape = (i: number) => {
      const s = shapes[i];
      const x = W * (0.1 + Math.random() * 0.8);
      const y = -60 - Math.random() * 200;
      const o = { restitution: 0.5, friction: 0.15, frictionAir: 0.018, density: 0.0009 };
      const r = s.size / 2;
      let body: Matter.Body;
      switch (s.kind) {
        case "circle": case "face": case "ring": case "dome":
          body = Matter.Bodies.circle(x, y, r, o); break;
        case "star":
          body = Matter.Bodies.polygon(x, y, 4, r, o); break;
        case "triangle":
          body = Matter.Bodies.polygon(x, y, 3, r, o); break;
        case "square":
          body = Matter.Bodies.rectangle(x, y, s.size, s.size, { ...o, chamfer: { radius: 10 } }); break;
        case "plus":
          body = Matter.Bodies.rectangle(x, y, s.size, s.size * 0.36, o); break;
        default: // squiggle
          body = Matter.Bodies.rectangle(x, y, s.size * 1.6, 14, { ...o, chamfer: { radius: 7 } }); break;
      }
      Matter.Body.setAngle(body!, Math.random() * Math.PI);
      Matter.Sleeping.set(body!, false); // FIX: never let bodies sleep
      s.body = body!;
      s.dx = x; s.dy = y; s.da = body!.angle;
      Matter.Composite.add(engine.world, body!);
    };
    // staggered drop, 70–100ms apart
    const dropAll = () => {
      tags.forEach((_, i) => {
        timeouts.push(window.setTimeout(() => spawnTag(i), i * (70 + Math.random() * 30)));
      });
      shapes.forEach((_, i) => {
        timeouts.push(window.setTimeout(() => spawnShape(i), (tags.length + i) * (70 + Math.random() * 30)));
      });
    };
    const maybeDrop = () => {
      if (ready && !hasDropped) { hasDropped = true; dropAll(); }
    };

    const start = () => {
      const loads = [
        document.fonts.load('600 20px "Geist"'),
        document.fonts.load('700 22px "Zilla Slab"'),
      ];
      Promise.all(loads).catch(() => {}).finally(() => {
        if (reduceMotion) { drawSettled(); return; }
        measureAndBuild();
      });
      window.setTimeout(() => { if (!ready && !reduceMotion) measureAndBuild(); }, 2500); // safety
    };

    /* ── Mouse: drag/throw via MouseConstraint, cursor push done manually ── */
    const mouse = Matter.Mouse.create(section);
    const syncMouse = () => {
      const r = section.getBoundingClientRect();
      // FIX: negative offset per Matter.Mouse convention for section-relative coords
      Matter.Mouse.setOffset(mouse, { x: -r.left, y: -r.top });
      Matter.Mouse.setScale(mouse, { x: 1, y: 1 });
      mouse.pixelRatio = DPR;
    };
    const mouseConstraint = Matter.MouseConstraint.create({
      mouse, constraint: { stiffness: 0.2, render: { visible: false } }, // no visible line
    });
    // strip scroll listeners so page scroll keeps working
    const mEl = mouse.element as HTMLElement & { mousewheel?: EventListener };
    const stripWheel = () => {
      if (mEl.mousewheel) {
        mouse.element.removeEventListener("mousewheel", mEl.mousewheel);
        mouse.element.removeEventListener("DOMMouseScroll", mEl.mousewheel);
      }
    };

    // DEBUG (temporary): log mouse constraint creation with offset + pixelRatio
    console.log("[PhysicsTags] mouse constraint created", {
      offset: { x: -section.getBoundingClientRect().left, y: -section.getBoundingClientRect().top },
      pixelRatio: DPR,
    });

    // cursor state: pointermove stores target; loop lerps position (0.25) toward it
    // velocity = actual position delta per frame (clean signal for push force)
    const cursor = { x: -9999, y: -9999, vx: 0, vy: 0, tx: -9999, ty: -9999, px: -9999, py: -9999, active: false };
    let lastMove = 0, rectCache = section.getBoundingClientRect(), loggedPointer = false;
    const onMove = (e: PointerEvent) => {
      // DEBUG (temporary): first pointermove over section + sleeping count
      if (!loggedPointer) {
        loggedPointer = true;
        console.log("pointer over section");
        const sleeping = Matter.Composite.allBodies(engine.world).filter((b) => b.isSleeping).length;
        console.log("[PhysicsTags] sleeping bodies:", sleeping, "(should be 0)");
      }
      const now = performance.now();
      if (now - lastMove < 16) return; // throttle to ~60Hz
      lastMove = now;
      cursor.tx = e.clientX - rectCache.left;
      cursor.ty = e.clientY - rectCache.top;
      cursor.active = true;
    };
    const onLeave = () => { cursor.active = false; cursor.x = -9999; cursor.y = -9999; };
    const onDown = (e: PointerEvent) => {
      const cx = e.clientX - rectCache.left, cy = e.clientY - rectCache.top;
      const all = [...tags.map((t) => t.body), ...shapes.map((s) => s.body)].filter(Boolean) as Matter.Body[];
      const found = Matter.Query.point(all, { x: cx, y: cy })[0];
      if (found) {
        Matter.Body.applyForce(found, found.position, { x: 0, y: -0.004 }); // click tag = jump
      } else {
        // click empty space = shockwave
        all.forEach((b) => {
          const dx = b.position.x - cx, dy = b.position.y - cy;
          const dist = Math.max(Math.hypot(dx, dy), 1);
          if (dist > 280) return;
          const f = Math.min(0.005 * (1 - dist / 280), 0.004);
          Matter.Body.applyForce(b, b.position, { x: (dx / dist) * f, y: (dy / dist) * f - f * 0.35 });
        });
      }
    };

    /* ── Draw helpers (no shadows/blur/filters) ─────────────────────────── */
    const drawPill = (t: PTag) => {
      const b = t.body!;
      ctx.save();
      ctx.translate(t.dx, t.dy); // interpolated position
      ctx.rotate(t.da);          // interpolated angle
      if (t.hoverT > 0.01) { const s = 1 + 0.06 * t.hoverT; ctx.scale(s, s); }
      const hw = t.w / 2, hh = t.h / 2;
      ctx.beginPath();
      ctx.roundRect(-hw, -hh, t.w, t.h, t.h / 2); // perfect pill: radius = h/2
      ctx.fillStyle = t.color.bg;
      ctx.fill();
      if (t.color.outline) { // jet-black pills get a light outline
        ctx.strokeStyle = t.color.outline;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      ctx.font = t.font; // cached per tag
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = t.color.fg;
      ctx.fillText(t.word, 0, t.zilla ? 2 : 1);
      ctx.restore();
    };

    const drawShape = (s: PShape) => {
      ctx.save();
      ctx.translate(s.dx, s.dy);
      ctx.rotate(s.da);
      if (s.hoverT > 0.01) { const sc = 1 + 0.06 * s.hoverT; ctx.scale(sc, sc); }
      const r = s.size / 2;
      ctx.fillStyle = s.color;
      switch (s.kind) {
        case "circle":
          ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); break;
        case "face":
          ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = s.color === COLORS.pink ? "#FAFAFA" : "#0D0D0D"; // eyes
          ctx.beginPath(); ctx.arc(-r * 0.3, -r * 0.15, r * 0.12, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(r * 0.3, -r * 0.15, r * 0.12, 0, Math.PI * 2); ctx.fill();
          break;
        case "ring":
          ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
          ctx.strokeStyle = s.color; ctx.lineWidth = 5; ctx.stroke(); break;
        case "star": { // 4-point sparkle
          ctx.beginPath();
          for (let i = 0; i < 8; i++) {
            const rr = i % 2 === 0 ? r : r * 0.38;
            const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
            const px = Math.cos(a) * rr, py = Math.sin(a) * rr;
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
          }
          ctx.closePath(); ctx.fill(); break;
        }
        case "square":
          ctx.beginPath(); ctx.roundRect(-r, -r, s.size, s.size, 10); ctx.fill(); break;
        case "dome":
          ctx.beginPath(); ctx.arc(0, r * 0.4, r, Math.PI, 0); ctx.closePath(); ctx.fill();
          ctx.fillRect(-r, r * 0.4 - 2, s.size, r * 0.6); break;
        case "triangle":
          ctx.beginPath();
          ctx.moveTo(0, -r);
          ctx.quadraticCurveTo(r * 0.15, -r * 0.7, r * 0.87, r * 0.7);
          ctx.quadraticCurveTo(0, r * 0.45, -r * 0.87, r * 0.7);
          ctx.quadraticCurveTo(-r * 0.15, -r * 0.7, 0, -r);
          ctx.fill(); break;
        case "plus":
          ctx.fillRect(-r, -r * 0.18, s.size, s.size * 0.36);
          ctx.fillRect(-r * 0.18, -r, s.size * 0.36, s.size); break;
        default: // squiggle
          ctx.strokeStyle = s.color; ctx.lineWidth = 13; ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(-r * 1.2, 0);
          ctx.quadraticCurveTo(-r * 0.6, -r * 0.7, 0, 0);
          ctx.quadraticCurveTo(r * 0.6, r * 0.7, r * 1.2, 0);
          ctx.stroke(); break;
      }
      ctx.restore();
    };

    /* reduced motion: draw the final settled layout once, no loop */
    const drawSettled = () => {
      resizeCanvas();
      ctx.fillStyle = COLORS.bg;
      ctx.fillRect(0, 0, W, H);
      tags.forEach((t) => {
        ctx.font = t.zilla ? ZILLA_FONT : GEIST_FONT;
        t.h = 56;
        t.w = ctx.measureText(t.word).width + 56 + (t.zilla ? 0 : t.word.length * 0.4);
      });
      const placed: Array<{ x: number; y: number; w: number; h: number }> = [];
      const place = (w: number, h: number) => {
        let x = w / 2, y = H / 2;
        for (let tries = 0; tries < 40; tries++) {
          x = w / 2 + Math.random() * Math.max(W - w, 1);
          y = H * 0.4 + Math.random() * Math.max(floorY() - H * 0.4 - h, 1);
          if (placed.every((p) => Math.abs(p.x - x) > (p.w + w) / 2 * 0.7 || Math.abs(p.y - y) > (p.h + h) / 2 * 0.7)) break;
        }
        placed.push({ x, y, w, h });
        return { x, y, r: (Math.random() - 0.5) * 0.6 };
      };
      tags.forEach((t) => {
        const p = place(t.w, t.h);
        t.dx = p.x; t.dy = p.y; t.da = p.r;
        t.body = { position: { x: p.x, y: p.y }, angle: p.r } as Matter.Body;
        drawPill(t); t.body = null;
      });
      shapes.forEach((s) => {
        const p = place(s.size, s.size);
        s.dx = p.x; s.dy = p.y; s.da = p.r;
        s.body = { position: { x: p.x, y: p.y }, angle: p.r } as Matter.Body;
        drawShape(s); s.body = null;
      });
    };

    /* ── THE single rAF loop ────────────────────────────────────────────── */
    let raf = 0, loopOn = false, lastT = 0;
    let hoverBody: Matter.Body | null = null;
    let frameTimes: number[] = [];
    let degraded = false;

    const loop = (now: number) => {
      if (!loopOn) return;
      raf = requestAnimationFrame(loop);
      const delta = Math.min(now - lastT, 33); // clamp: no time jumps
      lastT = now;

      // quality guard: if first 60 frames avg > 24ms, shed 30% of bodies (shapes first)
      frameTimes.push(delta);
      if (!degraded && frameTimes.length === 60) {
        const avg = frameTimes.reduce((a, b) => a + b, 0) / 60;
        if (avg > 24) {
          degraded = true;
          const victims: Matter.Body[] = [];
          const shapeBodies = shapes.map((s) => s.body).filter(Boolean) as Matter.Body[];
          victims.push(...shapeBodies.slice(0, Math.floor((tags.length + shapes.length) * 0.3)));
          victims.forEach((b) => {
            Matter.Composite.remove(engine.world, b);
            const ti = tags.findIndex((t) => t.body === b); if (ti >= 0) tags[ti].body = null;
            const si = shapes.findIndex((s) => s.body === b); if (si >= 0) shapes[si].body = null;
          });
          engine.positionIterations = 4;
          engine.velocityIterations = 3;
        }
        frameTimes = [];
      }

      Matter.Engine.update(engine, 1000 / 60); // fixed timestep

      // smooth visuals: lerp drawn state toward physics state (0.5)
      const items = [...tags, ...shapes] as Array<PTag | PShape>;
      items.forEach((it) => {
        if (!it.body) return;
        it.dx += (it.body.position.x - it.dx) * 0.5;
        it.dy += (it.body.position.y - it.dy) * 0.5;
        let diff = it.body.angle - it.da;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff)); // shortest path
        it.da += diff * 0.5;
      });

      // cursor hover-push: soft invisible ball (radius 150), force ∝ speed, ∝ 1/distance
      // FIX: lerp 0.25; force scaled by body.mass; gentle minimum push even when slow; capped
      if (cursor.active) {
        if (cursor.x < -9000) { cursor.x = cursor.tx; cursor.y = cursor.ty; } // snap on first entry
        cursor.px = cursor.x; cursor.py = cursor.y;
        cursor.x += (cursor.tx - cursor.x) * 0.25;
        cursor.y += (cursor.ty - cursor.y) * 0.25;
        cursor.vx = cursor.x - cursor.px;
        cursor.vy = cursor.y - cursor.py;
        const speed = Math.hypot(cursor.vx, cursor.vy);
        const PUSH_R = 150; // cursor ball radius
        // minimum 25% push even when cursor moves slowly; scales up with speed
        const speedFactor = 0.25 + (Math.min(speed, 28) / 28) * 0.75;
        items.forEach((it) => {
          const b = it.body; if (!b) return;
          const dx = b.position.x - cursor.x, dy = b.position.y - cursor.y;
          const dist = Math.hypot(dx, dy);
          if (dist > PUSH_R || dist < 1) return;
          const falloff = 1 - dist / PUSH_R;
          // force ∝ mass so heavy and light tags move together; capped to avoid explosions
          const f = Math.min(0.00008 * b.mass * falloff * speedFactor, 0.0025);
          Matter.Body.applyForce(b, b.position, {
            x: (dx / dist) * f + (cursor.vx / Math.max(speed, 1)) * f * 0.7,
            y: (dy / dist) * f + (cursor.vy / Math.max(speed, 1)) * f * 0.7 - f * 0.2,
          });
          b.torque += (Math.random() - 0.5) * 0.0004 * falloff; // gentle spin
        });
      }

      // hover detection: scale lerp + grab cursor
      if (cursor.active) {
        const all = items.map((it) => it.body).filter(Boolean) as Matter.Body[];
        const found = Matter.Query.point(all, { x: cursor.x, y: cursor.y })[0] || null;
        hoverBody = found;
        const dragging = (mouseConstraint as unknown as { constraint: { bodyB: Matter.Body | null } }).constraint.bodyB;
        section.style.cursor = dragging ? "grabbing" : found ? "grab" : "";
      } else {
        hoverBody = null;
        section.style.cursor = "";
      }
      items.forEach((it) => {
        const target = it.body === hoverBody ? 1 : 0;
        it.hoverT += (target - it.hoverT) * 0.25; // smooth scale lerp
      });

      // angular damping + gently rotate nearly-still tags upright
      items.forEach((it) => {
        const b = it.body; if (!b) return;
        if (Math.abs(b.angularVelocity) > 0.25) {
          Matter.Body.setAngularVelocity(b, b.angularVelocity * 0.97);
        } else if (Math.abs(b.velocity.x) < 0.35 && Math.abs(b.velocity.y) < 0.35) {
          const twoPi = Math.PI * 2;
          let a = ((b.angle % twoPi) + twoPi) % twoPi;
          if (a > Math.PI) a -= twoPi;
          Matter.Body.setAngle(b, b.angle - a * 0.02);
        }
      });

      // draw: shapes first, then pills
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = COLORS.bg;
      ctx.fillRect(0, 0, W, H);
      shapes.forEach((s) => { if (s.body) drawShape(s); });
      tags.forEach((t) => { if (t.body) drawPill(t); });
    };

    const startLoop = () => {
      if (loopOn || !ready) return;
      loopOn = true;
      lastT = performance.now(); // reset timestamp: no jump on resume
      raf = requestAnimationFrame(loop);
    };
    const stopLoop = () => { loopOn = false; cancelAnimationFrame(raf); };

    /* idle life: tiny nudge every 3s, only while on-screen */
    const idleTimer = window.setInterval(() => {
      if (document.hidden || !loopOn) return;
      const all = [...tags.map((t) => t.body), ...shapes.map((s) => s.body)].filter(Boolean) as Matter.Body[];
      if (!all.length) return;
      const b = all[Math.floor(Math.random() * all.length)];
      Matter.Body.applyForce(b, b.position, { x: (Math.random() - 0.5) * 0.0006, y: -Math.random() * 0.0007 });
    }, 3000);

    /* scroll: drop ONCE at 30% visibility; pause/resume loop only after */
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.3) {
            syncMouse();
            rectCache = section.getBoundingClientRect();
            startLoop();
            maybeDrop(); // hasDropped flag: never re-drops
          } else if (!entry.isIntersecting) {
            stopLoop(); // rAF fully cancelled off-screen
          }
        });
      },
      { threshold: [0, 0.3, 0.6, 1] }
    );

    /* resize: debounced 200ms; ignore height changes < 120px (mobile bar) */
    let lastW = W, lastH = H, resizeT = 0;
    const onResize = () => {
      window.clearTimeout(resizeT);
      resizeT = window.setTimeout(() => {
        const newW = section.clientWidth, newH = section.clientHeight;
        if (newW === lastW && Math.abs(newH - lastH) < 120) return;
        lastW = newW; lastH = newH;
        resizeCanvas();
        Matter.Composite.remove(engine.world, walls);
        buildWalls();
        // clamp any body outside the new walls
        [...tags, ...shapes].forEach((it) => {
          const b = it.body; if (!b) return;
          const x = Math.min(Math.max(b.position.x, 20), W - 20);
          const y = Math.min(b.position.y, floorY() - 10);
          if (x !== b.position.x || y !== b.position.y) {
            Matter.Body.setPosition(b, { x, y });
            it.dx = x; it.dy = y;
          }
        });
        syncMouse();
        rectCache = section.getBoundingClientRect();
      }, 200);
    };
    const onScrollSync = () => { syncMouse(); rectCache = section.getBoundingClientRect(); };
    const onVis = () => { if (document.hidden) stopLoop(); else startLoop(); };
    const onPageShow = () => startLoop();

    /* wire up once fonts are measured */
    const boot = () => {
      Matter.Composite.add(engine.world, mouseConstraint);
      stripWheel();
      syncMouse();
      section.addEventListener("pointermove", onMove); // FIX: pointermove (not just mousemove)
      section.addEventListener("pointerleave", onLeave);
      section.addEventListener("pointerdown", onDown);
      window.addEventListener("resize", onResize);
      window.addEventListener("scroll", onScrollSync, { passive: true });
      document.addEventListener("visibilitychange", onVis);
      window.addEventListener("pageshow", onPageShow);
      observer.observe(section);
    };
    const bootCheck = window.setInterval(() => {
      if (ready) { window.clearInterval(bootCheck); boot(); }
    }, 100);

    start();

    return () => {
      window.clearInterval(bootCheck);
      window.clearInterval(idleTimer);
      window.clearTimeout(resizeT);
      observer.disconnect();
      section.removeEventListener("mousemove", onMove);
      section.removeEventListener("mouseleave", onLeave);
      section.removeEventListener("pointerdown", onDown);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScrollSync);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pageshow", onPageShow);
      timeouts.forEach((t) => window.clearTimeout(t));
      stopLoop();
      Matter.Engine.clear(engine);
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
          background: ${COLORS.bg};
          border-radius: 24px;
          overflow: hidden;
          touch-action: pan-y; /* vertical scroll works; drag starts on deliberate tag touch */
          contain: layout paint;
        }
        .physics-tags-section canvas {
          position: absolute;
          inset: 0;
          display: block;
        }
      `}</style>
      <div
        ref={sectionRef}
        className="physics-tags-section"
        data-theme="dark"
        role="img"
        aria-label="Decorative physics tags showing design services: logo, branding, identity, packaging, typography and more"
      >
        <canvas ref={canvasRef} />
      </div>
    </>
  );
}
