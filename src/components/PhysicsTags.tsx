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
    engine.gravity.y = 1.2;
    engine.positionIterations = 6;
    engine.velocityIterations = 4;

    const wallOpts: Matter.IBodyDefinition = {
      isStatic: true, restitution: 0.5, friction: 0.2, render: { visible: false },
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
      // drop + loop are driven by the observers (fired on observe);
      // nothing to do here — boot() wires them up once ready
    };

    const timeouts: number[] = [];
    /* drop body options: matches the specified drop feel */
    const DROP_OPTS = { restitution: 0.5, friction: 0.2, frictionAir: 0.012, density: 0.0009 };
    const spawnTag = (i: number, x: number, y: number) => {
      const t = tags[i];
      const body = Matter.Bodies.rectangle(x, y, t.w, t.h, {
        chamfer: { radius: t.h / 2 }, // collider matches the full-round pill
        ...DROP_OPTS,
      });
      Matter.Body.setAngle(body, (Math.random() - 0.5) * 0.6);
      // start already moving downward so the drop reads as instant
      Matter.Body.setVelocity(body, { x: (Math.random() - 0.5) * 3, y: 8 + Math.random() * 6 });
      Matter.Sleeping.set(body, false); // FIX: never let bodies sleep
      t.body = body;
      t.dx = x; t.dy = y; t.da = body.angle;
      Matter.Composite.add(engine.world, body);
    };
    const spawnShape = (i: number, x: number, y: number) => {
      const s = shapes[i];
      const o = { ...DROP_OPTS };
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
      Matter.Body.setVelocity(body!, { x: (Math.random() - 0.5) * 3, y: 8 + Math.random() * 6 });
      Matter.Sleeping.set(body!, false); // FIX: never let bodies sleep
      s.body = body!;
      s.dx = x; s.dy = y; s.da = body!.angle;
      Matter.Composite.add(engine.world, body!);
    };

    /* ── Drop state ───────────────────────────────────────────────────── */
    let hasSettled = false; // pile fully calm (used to gate fast-forward)
    const TOTAL_BODIES = tagCount + shapeCount;

    /* loose grid across full width, 40–400px above section top, 3 rows */
    const buildSpawnList = () => {
      const list: Array<{ isTag: boolean; i: number }> = [];
      const maxLen = Math.max(tags.length, shapes.length);
      for (let k = 0; k < maxLen; k++) {
        if (k < tags.length) list.push({ isTag: true, i: k });
        if (k < shapes.length) list.push({ isTag: false, i: k });
      }
      const rows = 3;
      const cols = Math.ceil(list.length / rows);
      return list.map((item, idx) => {
        const row = Math.floor(idx / cols);
        const col = idx % cols;
        const x = W * 0.06 + (W * 0.88 * (col + 0.15 + Math.random() * 0.7)) / cols;
        const y = -50 - row * 130 - Math.random() * 100; // rows ≈ 50–150 / 180–280 / 310–410
        return { ...item, x, y };
      });
    };

    /* one fixed physics step, split into 2 sub-steps for stability */
    const STEP = 1000 / 60;
    const stepPhysics = (dt: number) => {
      Matter.Engine.update(engine, dt / 2);
      Matter.Engine.update(engine, dt / 2);
      checkUnlock();
    };

    /* unlock when the pile is calm: avg speed < 0.5 AND every body is inside
       the section (none still falling in from above), sustained for 400ms */
    let calmSince = 0;
    const checkUnlock = () => {
      if (!locked || !hasDropped) return;
      let count = 0, speedSum = 0, aboveTop = false;
      for (const t of tags) if (t.body) { count++; speedSum += t.body.speed; if (t.body.position.y < 0) aboveTop = true; }
      for (const s of shapes) if (s.body) { count++; speedSum += s.body.speed; if (s.body.position.y < 0) aboveTop = true; }
      if (count < TOTAL_BODIES) { calmSince = 0; return; } // not all spawned yet
      const now = performance.now();
      if (speedSum / count < 0.5 && !aboveTop) {
        if (!calmSince) calmSince = now;
        if (now - calmSince >= 400) {
          hasSettled = true;
          unlockScroll("settled");
        }
      } else {
        calmSince = 0;
      }
    };

    /* snap interpolated draw state to physics state (after fast-forward) */
    const syncDrawState = () => {
      [...tags, ...shapes].forEach((it) => {
        if (!it.body) return;
        it.dx = it.body.position.x;
        it.dy = it.body.position.y;
        it.da = it.body.angle;
      });
    };

    /* wave release: bodies drop in a left-to-right wave over ~0.6s */
    const triggerDrop = () => {
      if (!ready || hasDropped) return; // drop ONCE, never re-drop
      try {
        hasDropped = true;
        startLoop(); // draw from the first frame
        buildSpawnList().forEach(({ isTag, i, x, y }) => {
          const delay = (x / Math.max(W, 1)) * 550 + Math.random() * 50; // wave: 0 → ~0.6s
          timeouts.push(window.setTimeout(() => {
            if (isTag) spawnTag(i, x, y); else spawnShape(i, x, y);
          }, delay));
        });
      } catch (err) {
        unlockScroll("error"); // never leave the page locked
      }
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
        console.log("pointer works"); // temporary: confirms mouse reaches the section
        const sleeping = Matter.Composite.allBodies(engine.world).filter((b) => b.isSleeping).length;
        console.log("[PhysicsTags] sleeping bodies:", sleeping, "(should be 0)");
      }
      const now = performance.now();
      if (now - lastMove < 16) return; // throttle to ~60Hz
      lastMove = now;
      // FIX: scale cursor to canvas internal pixels (bodies live in DPR-scaled coords)
      cursor.tx = (e.clientX - rectCache.left) * DPR;
      cursor.ty = (e.clientY - rectCache.top) * DPR;
      cursor.active = true;
    };
    const onLeave = () => { cursor.active = false; cursor.x = -9999; cursor.y = -9999; };
    const onDown = (e: PointerEvent) => {
      // FIX: scale to canvas internal pixels (bodies live in DPR-scaled coords)
      const cx = (e.clientX - rectCache.left) * DPR, cy = (e.clientY - rectCache.top) * DPR;
      const all = [...tags.map((t) => t.body), ...shapes.map((s) => s.body)].filter(Boolean) as Matter.Body[];
      const found = Matter.Query.point(all, { x: cx, y: cy })[0];
      if (found) {
        Matter.Body.applyForce(found, found.position, { x: 0, y: -0.004 }); // click tag = jump
      } else {
        // click empty space = shockwave
        all.forEach((b) => {
          const dx = b.position.x - cx, dy = b.position.y - cy;
          const dist = Math.max(Math.hypot(dx, dy), 1);
          const SHOCK_R = 220 * DPR; // 220px in CSS pixels
          if (dist > SHOCK_R) return;
          const f = Math.min(0.005 * (1 - dist / SHOCK_R), 0.004);
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
    let accumulator = 0;
    let fastForwardSteps = 0; // set when user jumps straight to the section mid-drop

    const loop = (now: number) => {
      if (!loopOn) return;
      raf = requestAnimationFrame(loop);
      // real frame delta, clamped to 1000/30 max: slow frames never cause slow motion
      let delta = now - lastT;
      lastT = now;
      delta = Math.min(delta, 1000 / 30);
      // fixed-timestep accumulator: up to 3 steps/frame keeps speed consistent
      accumulator += delta;
      let steps = 0;
      while (accumulator >= STEP && steps < 3) {
        stepPhysics(STEP);
        accumulator -= STEP;
        steps++;
      }
      if (steps === 3) accumulator = 0; // shed excess: no spiral of death

      // fast-forward: user jumped here before the drop settled — up to 90 extra
      // steps split across 3 frames so the pile is settled right away
      if (fastForwardSteps > 0) {
        const extra = Math.min(30, fastForwardSteps);
        for (let i = 0; i < extra; i++) stepPhysics(STEP);
        fastForwardSteps -= extra;
        syncDrawState();
      }

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
      // FIX: stronger force (60% of gravity) so tags visibly move; capped to avoid explosions
      if (cursor.active) {
        if (cursor.x < -9000) { cursor.x = cursor.tx; cursor.y = cursor.ty; } // snap on first entry
        cursor.px = cursor.x; cursor.py = cursor.y;
        cursor.x += (cursor.tx - cursor.x) * 0.25;
        cursor.y += (cursor.ty - cursor.y) * 0.25;
        cursor.vx = cursor.x - cursor.px;
        cursor.vy = cursor.y - cursor.py;
        const speed = Math.hypot(cursor.vx, cursor.vy);
        const PUSH_R = 150 * DPR; // 150px cursor ball in CSS pixels
        // minimum 25% push even when cursor moves slowly; scales up with speed
        const speedFactor = 0.25 + (Math.min(speed, 28) / 28) * 0.75;
        items.forEach((it) => {
          const b = it.body; if (!b) return;
          const dx = b.position.x - cursor.x, dy = b.position.y - cursor.y;
          const dist = Math.hypot(dx, dy);
          if (dist > PUSH_R || dist < 1) return;
          // wake the body (in case it fell asleep despite enableSleeping: false)
          if (b.isSleeping) Matter.Sleeping.set(b, false);
          const falloff = 1 - dist / PUSH_R;
          // force ∝ mass (60% of gravity at full strength); capped
          const f = Math.min(0.0006 * b.mass * falloff * speedFactor, 0.012);
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

    /* ── Scroll lock: the page stays put while the tags fall (once only) ──
       Lock: html.is-locked (overflow hidden) + body padding-right = scrollbar
       width (no layout jump) + preventDefault on wheel/touchmove/scroll-keys.
       Clicks, hover, tag dragging and the nav keep working. */
    let locked = false;
    let lockStart = 0;
    let lockTimeout = 0;
    const SCROLL_KEYS = new Set([" ", "Spacebar", "PageDown", "PageUp", "ArrowDown", "ArrowUp", "End", "Home"]);
    const blockScrollEvent = (e: Event) => e.preventDefault();
    const blockScrollKeys = (e: KeyboardEvent) => { if (SCROLL_KEYS.has(e.key)) e.preventDefault(); };

    const lockScroll = () => {
      if (locked || reduceMotion) return;
      locked = true;
      lockStart = performance.now();
      const html = document.documentElement;
      const scrollbarW = window.innerWidth - html.clientWidth;
      html.classList.add("is-locked");
      if (scrollbarW > 0) document.body.style.paddingRight = `${scrollbarW}px`;
      window.addEventListener("wheel", blockScrollEvent, { passive: false });
      window.addEventListener("touchmove", blockScrollEvent, { passive: false });
      window.addEventListener("keydown", blockScrollKeys, { passive: false });
      console.log("locked"); // DEBUG (temporary)
      lockTimeout = window.setTimeout(() => unlockScroll("timeout"), 3500); // failsafe: never stuck
    };
    const unlockScroll = (reason: "settled" | "timeout" | "hidden" | "error") => {
      if (!locked) return;
      locked = false;
      window.clearTimeout(lockTimeout);
      document.documentElement.classList.remove("is-locked");
      document.body.style.paddingRight = "";
      window.removeEventListener("wheel", blockScrollEvent);
      window.removeEventListener("touchmove", blockScrollEvent);
      window.removeEventListener("keydown", blockScrollKeys);
      console.log("unlocked after", Math.round(performance.now() - lockStart), "ms", "reason:", reason); // DEBUG (temporary)
    };

    /* 500ms ease-out scroll that brings the section to fill the screen, then runs fn */
    const NAV_OFFSET = 108; // 92px floating nav + 16px margin
    const smoothScrollTo = (targetY: number, done: () => void) => {
      const startY = window.scrollY;
      const dist = targetY - startY;
      if (Math.abs(dist) < 2) { done(); return; }
      const t0 = performance.now();
      const tick = (now: number) => {
        const t = Math.min((now - t0) / 500, 1);
        const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
        window.scrollTo(0, startY + dist * eased);
        if (t < 1) requestAnimationFrame(tick);
        else done();
      };
      requestAnimationFrame(tick);
    };
    const scrollIntoPlace = (done: () => void) => {
      const r = section.getBoundingClientRect();
      const vh = window.innerHeight;
      const target = r.height >= vh
        ? window.scrollY + r.top - NAV_OFFSET // taller than screen: top just below nav
        : window.scrollY + r.top - (vh - r.height) / 2; // shorter: vertically centered
      smoothScrollTo(target, done);
    };

    /* the once-only sequence: at 35% visibility → scroll into place → lock → drop */
    const isSection35Visible = () => {
      const r = section.getBoundingClientRect();
      const vh = window.innerHeight;
      const visibleH = Math.min(r.bottom, vh) - Math.max(r.top, 0);
      return visibleH >= r.height * 0.35;
    };
    const maybeStartDropSequence = () => {
      if (hasDropped || !ready || reduceMotion) return;
      if (!isSection35Visible()) return;
      hasDropped = true; // set now so the observer can never re-trigger
      sequenceObserver.disconnect(); // never lock again, even on re-entry
      try {
        scrollIntoPlace(() => {
          lockScroll();
          triggerDrop();
        });
      } catch (err) {
        unlockScroll("error");
      }
    };

    /* sequence trigger: 35% visibility → scroll-into-place → lock → drop (once) */
    const sequenceObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) maybeStartDropSequence();
        });
      },
      { threshold: 0.35 }
    );

    /* loop perf: pause the rAF loop when the section is well off-screen */
    const loopObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) startLoop();
          else stopLoop(); // rAF fully cancelled off-screen (timestamp reset on resume)
        });
      },
      { rootMargin: "0px 0px 60% 0px", threshold: 0 }
    );

    /* actual on-screen visibility: mouse sync + fast-forward when the user
       jumps straight to the section (fast scroll / anchor) mid-drop */
    let isVisible = false;
    const visibleObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const was = isVisible;
          isVisible = entry.isIntersecting;
          if (isVisible) {
            syncMouse();
            rectCache = section.getBoundingClientRect();
            if (!was && hasDropped && !hasSettled && fastForwardSteps === 0) {
              fastForwardSteps = 90; // settle the pile right away
            }
          }
        });
      },
      { threshold: 0 }
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
    const onVis = () => {
      if (document.hidden) { stopLoop(); unlockScroll("hidden"); } // guaranteed unlock
      else startLoop();
    };
    const onPageHideUnlock = () => unlockScroll("hidden");
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
      window.addEventListener("pagehide", onPageHideUnlock);
      window.addEventListener("pageshow", onPageShow);
      // already in view on load (reload at position / anchor link): drop now,
      // no scroll-into-place and no lock — the user is already looking at it
      if (isSection35Visible()) {
        triggerDrop();
      } else {
        sequenceObserver.observe(section);
      }
      loopObserver.observe(section);
      visibleObserver.observe(section);
    };
    const bootCheck = window.setInterval(() => {
      if (ready) { window.clearInterval(bootCheck); boot(); }
    }, 100);

    start();

    return () => {
      unlockScroll("hidden"); // never leave the page locked on unmount
      window.clearInterval(bootCheck);
      window.clearInterval(idleTimer);
      window.clearTimeout(resizeT);
      sequenceObserver.disconnect();
      loopObserver.disconnect();
      visibleObserver.disconnect();
      section.removeEventListener("mousemove", onMove);
      section.removeEventListener("mouseleave", onLeave);
      section.removeEventListener("pointerdown", onDown);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScrollSync);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pagehide", onPageHideUnlock);
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
        /* scroll lock: no layout jump, no iOS rubber-banding while locked */
        html.is-locked { overflow: hidden; overscroll-behavior: none; }
        html.is-locked body { overscroll-behavior: none; }
        @media (max-width: 768px) {
          .physics-tags-section { height: 70vh; }
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
