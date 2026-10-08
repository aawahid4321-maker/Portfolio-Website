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

/* ── PART B: emoji stickers ── */
const EMOJI_LIST = ["🎨", "✏️", "✨", "🚀", "💡", "🔥", "💜", "👋", "🎯", "📐", "🖌️", "⭐", "😎", "🤩", "🥳", "😍", "🤯", "🫶", "🍕", "☕", "🎧", "📸", "🧠", "🌈"];
const EMOJI_FILL = [COLORS.purpleLight, COLORS.pink, COLORS.yellow, COLORS.orange, COLORS.softWhite] as const;

const TAG_COUNT_DESKTOP = 26;
const TAG_COUNT_MOBILE = 14;
const SHAPE_COUNT_DESKTOP = 8;   // reduced to make room for emoji
const SHAPE_COUNT_MOBILE = 4;
const EMOJI_COUNT_DESKTOP = 24;
const EMOJI_COUNT_MOBILE = 12;
const FACE_COUNT = 8;            // cartoon faces (both desktop + mobile)
const FLOOR_PADDING = 96; // floor sits 96px above section bottom (clear of CONTACT pill)

interface PTag {
  word: string;
  zilla: boolean;
  font: string;
  w: number; h: number;
  color: PillDef;
  body: Matter.Body | null;
  dx: number; dy: number; da: number;
  hoverT: number;
}
interface PShape {
  kind: "circle" | "ring" | "star" | "square" | "dome" | "triangle" | "plus" | "squiggle";
  size: number;
  color: string;
  body: Matter.Body | null;
  dx: number; dy: number; da: number;
  hoverT: number;
}
/* PART B: plain system-emoji sticker */
interface PEmoji {
  char: string;
  size: number; // 52–72px diameter
  color: string;
  baked: HTMLCanvasElement | null; // pre-rendered emoji glyph
  body: Matter.Body | null;
  dx: number; dy: number; da: number;
  hoverT: number;
  squashMs: number; // landing squash remaining
  boingMs: number;  // click boing remaining
  sparkles: Array<{ x: number; y: number; vx: number; vy: number; life: number; color: string }>;
}
/* PART C: cartoon face sticker */
type FaceMood = "happy" | "laughing" | "surprised" | "cool" | "love" | "sleepy" | "wink" | "silly";
interface PFace {
  mood: FaceMood;      // base mood (permanent)
  cur: FaceMood;       // current displayed mood (temp overrides)
  curUntil: number;     // timestamp when temp mood expires
  size: number;        // 60–84px
  color: string;
  body: Matter.Body | null;
  dx: number; dy: number; da: number;
  hoverT: number;
  blinkAt: number;     // next blink timestamp
  blinkMs: number;     // blink in progress remaining
  squashMs: number;    // landing squash remaining
  boingMs: number;     // click boing remaining
  wiggleAt: number;    // next idle wiggle timestamp
  grabbed: boolean;
  laughUntil: number;  // post-release laugh timestamp
  sparkles: Array<{ x: number; y: number; vx: number; vy: number; life: number; color: string }>;
}

export default function PhysicsTags() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    const section = sectionRef.current;
    const canvas = canvasRef.current;
    if (!section || !canvas || startedRef.current) return;
    startedRef.current = true;

    const ctx = canvas.getContext("2d")!;
    const isMobile = window.innerWidth < 768;
    const tagCount = isMobile ? TAG_COUNT_MOBILE : TAG_COUNT_DESKTOP;
    const shapeCount = isMobile ? SHAPE_COUNT_MOBILE : SHAPE_COUNT_DESKTOP;
    const emojiCount = isMobile ? EMOJI_COUNT_MOBILE : EMOJI_COUNT_DESKTOP;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const DPR = Math.min(window.devicePixelRatio || 1, 2);

    let W = 0, H = 0;
    const resizeCanvas = () => {
      W = section.clientWidth;
      H = section.clientHeight;
      canvas.width = Math.round(W * DPR);
      canvas.height = Math.round(H * DPR);
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    };
    resizeCanvas();

    /* ── Tags ── */
    const palette = buildPalette(tagCount);
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
      const word = zilla ? ZILLA_WORDS[i % ZILLA_WORDS.length] : GEIST_WORDS[i % GEIST_WORDS.length];
      const font = zilla ? `700 22px "Zilla Slab", Rockwell, Georgia, serif` : `600 20px "Geist", system-ui, sans-serif`;
      tags.push({ word, zilla, font, w: 0, h: 0, color: palette[i], body: null, dx: 0, dy: 0, da: 0, hoverT: 0 });
    }

    /* ── Plain shapes (reduced counts) ── */
    const SHAPE_KINDS: PShape["kind"][] = ["circle", "circle", "ring", "star", "square", "dome", "triangle", "plus"];
    const shapePalette = buildPalette(shapeCount);
    const STAR_COLORS = [COLORS.yellow, COLORS.orange, COLORS.pink];
    const shapes: PShape[] = [];
    for (let i = 0; i < shapeCount; i++) {
      const kind = SHAPE_KINDS[i % SHAPE_KINDS.length];
      const size = 28 + Math.random() * 28;
      let color = kind === "star" ? STAR_COLORS[i % STAR_COLORS.length] : shapePalette[i].bg;
      if (color === COLORS.jetBlack) color = COLORS.purpleLight;
      shapes.push({ kind, size, color, body: null, dx: 0, dy: 0, da: 0, hoverT: 0 });
    }

    /* ── PART B: emoji stickers ── */
    const emojis: PEmoji[] = [];
    {
      const fills = [...EMOJI_FILL];
      // shuffle emoji order
      const order = EMOJI_LIST.map((_, i) => i);
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
      }
      let lastFill = "";
      for (let i = 0; i < emojiCount; i++) {
        const char = EMOJI_LIST[order[i % order.length]];
        const size = 52 + Math.random() * 20; // 52–72px
        // never two same fills touching in spawn order
        let fill = fills[i % fills.length];
        if (fill === lastFill) fill = fills[(i + 2) % fills.length];
        lastFill = fill;
        emojis.push({ char, size, color: fill, baked: null, body: null, dx: 0, dy: 0, da: 0, hoverT: 0, squashMs: 0, boingMs: 0, sparkles: [] });
      }
    }
    /* pre-render each emoji glyph once (after fonts ready) */
    const EMOJI_FONT = `"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
    const bakeEmojis = () => {
      emojis.forEach((e) => {
        if (e.baked) return;
        const px = Math.round(e.size * 0.55); // glyph ~55% of diameter
        const c = document.createElement("canvas");
        c.width = Math.ceil(px * DPR * 1.4);
        c.height = Math.ceil(px * DPR * 1.4);
        const g = c.getContext("2d")!;
        g.scale(DPR, DPR);
        g.font = `${px}px ${EMOJI_FONT}`;
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.fillText(e.char, c.width / DPR / 2, c.height / DPR / 2 + px * 0.05);
        e.baked = c;
      });
    };

    /* ── PART C: cartoon faces ── */
    const FACE_MOODS: FaceMood[] = ["happy", "laughing", "surprised", "cool", "love", "sleepy", "wink", "silly"];
    const faces: PFace[] = [];
    {
      const fills = [COLORS.yellow, COLORS.pink, COLORS.orange, COLORS.purpleLight, COLORS.softWhite, COLORS.yellow, COLORS.pink, COLORS.orange];
      for (let i = 0; i < FACE_COUNT; i++) {
        const size = 60 + Math.random() * 24; // 60–84px
        faces.push({
          mood: FACE_MOODS[i], cur: FACE_MOODS[i], curUntil: 0,
          size, color: fills[i],
          body: null, dx: 0, dy: 0, da: 0, hoverT: 0,
          blinkAt: performance.now() + 3000 + Math.random() * 3000,
          blinkMs: 0, squashMs: 0, boingMs: 0,
          wiggleAt: performance.now() + 4000 + Math.random() * 4000,
          grabbed: false, laughUntil: 0, sparkles: [],
        });
      }
    }

    const floorY = () => H - FLOOR_PADDING;

    /* ── Engine ── */
    const engine = Matter.Engine.create({ enableSleeping: false });
    engine.gravity.y = 1.2;
    engine.positionIterations = 6;
    engine.velocityIterations = 4;

    const wallOpts: Matter.IBodyDefinition = { isStatic: true, restitution: 0.5, friction: 0.2, render: { visible: false } };
    const THICK = 200;
    let walls: Matter.Body[] = [];
    const buildWalls = () => {
      walls = [
        Matter.Bodies.rectangle(W / 2, floorY() + THICK / 2, W + THICK * 2, THICK, wallOpts),
        Matter.Bodies.rectangle(W / 2, -THICK * 3, W + THICK * 2, THICK, wallOpts),
        Matter.Bodies.rectangle(-THICK / 2, H / 2, THICK, H * 5, wallOpts),
        Matter.Bodies.rectangle(W + THICK / 2, H / 2, THICK, H * 5, wallOpts),
      ];
      Matter.Composite.add(engine.world, walls);
    };

    const GEIST_FONT = `600 20px "Geist", system-ui, sans-serif`;
    const ZILLA_FONT = `700 22px "Zilla Slab", Rockwell, Georgia, serif`;
    let ready = false;
    let hasDropped = false;

    const measureAndBuild = () => {
      if (ready) return;
      tags.forEach((t) => {
        ctx.font = t.zilla ? ZILLA_FONT : GEIST_FONT;
        const raw = ctx.measureText(t.word).width;
        t.h = 56;
        t.w = raw + 56 + (t.zilla ? 0 : t.word.length * 0.4);
      });
      buildWalls();
      ready = true;
    };

    const timeouts: number[] = [];
    const DROP_OPTS = { restitution: 0.5, friction: 0.2, frictionAir: 0.012, density: 0.0009 };

    const spawnBody = (x: number, y: number, w: number, h: number, circleR: number | null) => {
      const body = circleR !== null
        ? Matter.Bodies.circle(x, y, circleR, DROP_OPTS)
        : Matter.Bodies.rectangle(x, y, w, h, { chamfer: { radius: h / 2 }, ...DROP_OPTS });
      Matter.Body.setAngle(body, (Math.random() - 0.5) * 0.6);
      Matter.Body.setVelocity(body, { x: (Math.random() - 0.5) * 3, y: 8 + Math.random() * 6 });
      Matter.Sleeping.set(body, false);
      Matter.Composite.add(engine.world, body);
      return body;
    };

    const spawnTag = (i: number, x: number, y: number) => {
      const t = tags[i];
      const body = spawnBody(x, y, t.w, t.h, null);
      t.body = body; t.dx = x; t.dy = y; t.da = body.angle;
    };
    const spawnShape = (i: number, x: number, y: number) => {
      const s = shapes[i];
      const r = s.size / 2;
      let body: Matter.Body;
      const o = { ...DROP_OPTS };
      switch (s.kind) {
        case "circle": case "ring": case "dome":
          body = Matter.Bodies.circle(x, y, r, o); break;
        case "star":
          body = Matter.Bodies.polygon(x, y, 4, r, o); break;
        case "triangle":
          body = Matter.Bodies.polygon(x, y, 3, r, o); break;
        case "square":
          body = Matter.Bodies.rectangle(x, y, s.size, s.size, { ...o, chamfer: { radius: 10 } }); break;
        case "plus":
          body = Matter.Bodies.rectangle(x, y, s.size, s.size * 0.36, o); break;
        default:
          body = Matter.Bodies.rectangle(x, y, s.size * 1.6, 14, { ...o, chamfer: { radius: 7 } }); break;
      }
      Matter.Body.setAngle(body, Math.random() * Math.PI);
      Matter.Body.setVelocity(body, { x: (Math.random() - 0.5) * 3, y: 8 + Math.random() * 6 });
      Matter.Sleeping.set(body, false);
      s.body = body; s.dx = x; s.dy = y; s.da = body.angle;
      Matter.Composite.add(engine.world, body);
    };
    /* PART B: emoji sticker spawn (circle collider) */
    const spawnEmoji = (i: number, x: number, y: number) => {
      const e = emojis[i];
      const body = spawnBody(x, y, 0, 0, e.size / 2);
      e.body = body; e.dx = x; e.dy = y; e.da = body.angle;
    };
    /* PART C: cartoon face spawn (circle collider) */
    const spawnFace = (i: number, x: number, y: number) => {
      const f = faces[i];
      const body = spawnBody(x, y, 0, 0, f.size / 2);
      f.body = body; f.dx = x; f.dy = y; f.da = body.angle;
    };

    /* ── Drop state ── */
    let dropStart = 0;
    const TOTAL_BODIES = tagCount + shapeCount + emojiCount + FACE_COUNT;

    /* wave release: from CENTER outward over ~0.6s */
    const buildSpawnList = () => {
      const list: Array<{ kind: "tag" | "shape" | "emoji" | "face"; i: number }> = [];
      const maxLen = Math.max(tags.length, shapes.length, emojis.length, faces.length);
      for (let k = 0; k < maxLen; k++) {
        if (k < tags.length) list.push({ kind: "tag", i: k });
        if (k < shapes.length) list.push({ kind: "shape", i: k });
        if (k < emojis.length) list.push({ kind: "emoji", i: k });
        if (k < faces.length) list.push({ kind: "face", i: k });
      }
      const rows = 3;
      const cols = Math.ceil(list.length / rows);
      return list.map((item, idx) => {
        const row = Math.floor(idx / cols);
        const col = idx % cols;
        const x = W * 0.06 + (W * 0.88 * (col + 0.15 + Math.random() * 0.7)) / cols;
        const y = -50 - row * 130 - Math.random() * 100;
        return { ...item, x, y };
      });
    };

    /* one fixed physics step, 2 sub-steps */
    const STEP = 1000 / 60;
    const stepPhysics = (dt: number) => {
      Matter.Engine.update(engine, dt / 2);
      Matter.Engine.update(engine, dt / 2);
    };

    const allItems = () => [...tags, ...shapes, ...emojis, ...faces];

    const syncDrawState = () => {
      allItems().forEach((it) => {
        const b = (it as { body: Matter.Body | null }).body;
        if (!b) return;
        (it as { dx: number }).dx = b.position.x;
        (it as { dy: number }).dy = b.position.y;
        (it as { da: number }).da = b.angle;
      });
    };

    /* wave release from CENTER outward over ~0.6s */
    const triggerDrop = () => {
      if (!ready || hasDropped) return;
      hasDropped = true;
      dropStart = performance.now();
      console.log("bodies", TOTAL_BODIES); // DEBUG (temporary)
      startLoop();
      const spawns = buildSpawnList();
      spawns.forEach(({ kind, i, x, y }) => {
        // wave from center outward: delay by |x - W/2|
        const delay = (Math.abs(x - W / 2) / Math.max(W / 2, 1)) * 550 + Math.random() * 50;
        timeouts.push(window.setTimeout(() => {
          if (kind === "tag") spawnTag(i, x, y);
          else if (kind === "shape") spawnShape(i, x, y);
          else if (kind === "emoji") spawnEmoji(i, x, y);
          else spawnFace(i, x, y);
        }, delay));
      });
    };

    const start = () => {
      const loads = [
        document.fonts.load('600 20px "Geist"'),
        document.fonts.load('700 22px "Zilla Slab"'),
      ];
      // PART B: wait for fonts before baking emoji glyphs
      document.fonts.ready.then(() => bakeEmojis()).catch(() => {});
      Promise.all(loads).catch(() => {}).finally(() => {
        if (reduceMotion) { drawSettled(); return; }
        measureAndBuild();
        bakeEmojis();
      });
      window.setTimeout(() => { if (!ready && !reduceMotion) { measureAndBuild(); bakeEmojis(); } }, 2500);
    };

    /* ── Mouse: drag/throw via MouseConstraint, cursor push manual ── */
    const mouse = Matter.Mouse.create(section);
    const syncMouse = (r?: DOMRect) => {
      const rect = r ?? section.getBoundingClientRect();
      Matter.Mouse.setOffset(mouse, { x: -rect.left, y: -rect.top });
      Matter.Mouse.setScale(mouse, { x: 1, y: 1 });
      mouse.pixelRatio = DPR;
    };
    const mouseConstraint = Matter.MouseConstraint.create({
      mouse, constraint: { stiffness: 0.2, render: { visible: false } },
    });
    const mEl = mouse.element as HTMLElement & { mousewheel?: EventListener };
    const stripWheel = () => {
      if (mEl.mousewheel) {
        mouse.element.removeEventListener("mousewheel", mEl.mousewheel);
        mouse.element.removeEventListener("DOMMouseScroll", mEl.mousewheel);
      }
    };

    const cursor = { x: -9999, y: -9999, vx: 0, vy: 0, tx: -9999, ty: -9999, px: -9999, py: -9999, active: false };
    let lastMove = 0, rectCache = section.getBoundingClientRect();
    const onMove = (e: PointerEvent) => {
      const now = performance.now();
      if (now - lastMove < 16) return;
      lastMove = now;
      // Viewport px → section local px: the whole canvas is CSS-zoomed, so
      // scale by clientWidth/rect.width (Matter's own Mouse does the same).
      const r = section.getBoundingClientRect();
      const sx = section.clientWidth / r.width;
      const sy = section.clientHeight / r.height;
      cursor.tx = (e.clientX - r.left) * sx;
      cursor.ty = (e.clientY - r.top) * sy;
      cursor.active = true;
    };
    const onLeave = () => { cursor.active = false; cursor.x = -9999; cursor.y = -9999; };
    const onDown = (e: PointerEvent) => {
      const r = section.getBoundingClientRect();
      const sx = section.clientWidth / r.width;
      const sy = section.clientHeight / r.height;
      const cx = (e.clientX - r.left) * sx, cy = (e.clientY - r.top) * sy;
      const bodies = allItems().map((it) => (it as { body: Matter.Body | null }).body).filter(Boolean) as Matter.Body[];
      const found = Matter.Query.point(bodies, { x: cx, y: cy })[0];
      if (found) {
        Matter.Body.applyForce(found, found.position, { x: 0, y: -0.004 });
        // PART C: face click → boing + sparkles; emoji → boing
        const fi = faces.findIndex((f) => f.body === found);
        if (fi >= 0) { faces[fi].boingMs = 600; spawnSparkles(faces[fi]); }
        const ei = emojis.findIndex((em) => em.body === found);
        if (ei >= 0) { emojis[ei].boingMs = 600; spawnSparkles(emojis[ei]); }
      } else {
        bodies.forEach((b) => {
          const dx = b.position.x - cx, dy = b.position.y - cy;
          const dist = Math.max(Math.hypot(dx, dy), 1);
          const SHOCK_R = 220;
          if (dist > SHOCK_R) return;
          const f = Math.min(0.005 * b.mass * (1 - dist / SHOCK_R), 0.02 * b.mass);
          Matter.Body.applyForce(b, b.position, { x: (dx / dist) * f, y: (dy / dist) * f - f * 0.35 });
        });
      }
    };
    /* click sparkles for faces + emoji */
    const spawnSparkles = (it: PFace | PEmoji) => {
      const b = it.body!;
      for (let k = 0; k < 3; k++) {
        it.sparkles.push({
          x: b.position.x + (Math.random() - 0.5) * 20,
          y: b.position.y - 20 - Math.random() * 20,
          vx: (Math.random() - 0.5) * 2, vy: -1 - Math.random() * 2,
          life: 600, color: Math.random() < 0.5 ? COLORS.yellow : COLORS.pink,
        });
      }
    };

    /* ── Draw helpers ── */
    const drawPill = (t: PTag) => {
      const b = t.body!;
      ctx.save();
      ctx.translate(t.dx, t.dy);
      ctx.rotate(t.da);
      if (t.hoverT > 0.01) { const s = 1 + 0.06 * t.hoverT; ctx.scale(s, s); }
      const hw = t.w / 2, hh = t.h / 2;
      ctx.beginPath();
      ctx.roundRect(-hw, -hh, t.w, t.h, t.h / 2);
      ctx.fillStyle = t.color.bg;
      ctx.fill();
      if (t.color.outline) {
        ctx.strokeStyle = t.color.outline;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      ctx.font = t.font;
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
        case "ring":
          ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
          ctx.strokeStyle = s.color; ctx.lineWidth = 5; ctx.stroke(); break;
        case "star": {
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
        default:
          ctx.strokeStyle = s.color; ctx.lineWidth = 13; ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(-r * 1.2, 0);
          ctx.quadraticCurveTo(-r * 0.6, -r * 0.7, 0, 0);
          ctx.quadraticCurveTo(r * 0.6, r * 0.7, r * 1.2, 0);
          ctx.stroke(); break;
      }
      ctx.restore();
    };

    /* PART B: draw emoji sticker (baked glyph on round sticker) */
    const drawEmoji = (e: PEmoji) => {
      const b = e.body!;
      ctx.save();
      ctx.translate(e.dx, e.dy);
      ctx.rotate(e.da);
      // squash + boing scale (draw-time only, collider unchanged)
      let sx = 1, sy = 1;
      if (e.squashMs > 0) { sx = 1.15; sy = 0.85; }
      if (e.boingMs > 0) { const k = e.boingMs / 600; const s = 1 + 0.2 * Math.sin(k * Math.PI); sx *= s; sy *= s; }
      ctx.scale(sx, sy);
      if (e.hoverT > 0.01) { const s = 1 + 0.06 * e.hoverT; ctx.scale(s, s); }
      const r = e.size / 2;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fillStyle = e.color; ctx.fill();
      if (e.baked) {
        const bw = e.baked.width / DPR, bh = e.baked.height / DPR;
        ctx.drawImage(e.baked, -bw / 2, -bh / 2, bw, bh);
      }
      ctx.restore();
      drawSparkles(e);
    };

    /* PART C: draw cartoon face — ink-line style, spins with body */
    const drawFace = (f: PFace, now: number) => {
      const b = f.body!;
      ctx.save();
      ctx.translate(f.dx, f.dy);
      ctx.rotate(f.da);
      let sx = 1, sy = 1;
      if (f.squashMs > 0) { sx = 1.15; sy = 0.85; }
      if (f.boingMs > 0) { const k = f.boingMs / 600; const s = 1 + 0.2 * Math.sin(k * Math.PI); sx *= s; sy *= s; }
      ctx.scale(sx, sy);
      if (f.hoverT > 0.01) { const s = 1 + 0.06 * f.hoverT; ctx.scale(s, s); }
      const r = f.size / 2;
      // body
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fillStyle = f.color; ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = "#0D0D0D"; ctx.stroke();

      const mood = f.cur;
      const laughing = f.laughUntil > now;
      const eyeY = -r * 0.12, ex = r * 0.30;
      const blinking = f.blinkMs > 0;
      const INK = "#0D0D0D";
      ctx.fillStyle = INK; ctx.strokeStyle = INK;
      ctx.lineWidth = 2.5; ctx.lineCap = "round";

      // cursor look offset (≤3px)
      let lx = 0, ly = 0;
      if (cursor.active) {
        const dx = cursor.x - f.dx, dy = cursor.y - f.dy;
        const d = Math.hypot(dx, dy);
        if (d < 220 && d > 1) { lx = (dx / d) * 3; ly = (dy / d) * 3; }
      }

      const dotEye = (x: number, y: number, rr: number) => {
        if (blinking) { ctx.beginPath(); ctx.moveTo(x - rr, y); ctx.lineTo(x + rr, y); ctx.stroke(); }
        else { ctx.beginPath(); ctx.arc(x + lx * 0.5, y + ly * 0.5, rr, 0, Math.PI * 2); ctx.fill(); }
      };
      const arcEye = (x: number, y: number, rr: number) => { // ^ ^ happy arc
        ctx.beginPath(); ctx.arc(x, y + rr * 0.4, rr, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
      };
      const smile = (w: number, h: number, y: number) => {
        ctx.beginPath(); ctx.arc(0, y - h * 0.6, w, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
      };

      if (laughing) {
        arcEye(-ex, eyeY, r * 0.16); arcEye(ex, eyeY, r * 0.16);
        ctx.beginPath(); ctx.ellipse(0, r * 0.32, r * 0.20, r * 0.26, 0, 0, Math.PI * 2);
        ctx.fillStyle = INK; ctx.fill();
      } else switch (mood) {
        case "happy":
          dotEye(-ex, eyeY, r * 0.10); dotEye(ex, eyeY, r * 0.10);
          smile(r * 0.42, r * 0.30, r * 0.42); break;
        case "laughing":
          arcEye(-ex, eyeY, r * 0.16); arcEye(ex, eyeY, r * 0.16);
          ctx.beginPath(); ctx.ellipse(0, r * 0.30, r * 0.20, r * 0.26, 0, 0, Math.PI * 2);
          ctx.fillStyle = INK; ctx.fill(); break;
        case "surprised":
          ctx.beginPath(); ctx.arc(-ex + lx * 0.5, eyeY + ly * 0.5, r * 0.14, 0, Math.PI * 2); ctx.stroke();
          ctx.beginPath(); ctx.arc(ex + lx * 0.5, eyeY + ly * 0.5, r * 0.14, 0, Math.PI * 2); ctx.stroke();
          ctx.beginPath(); ctx.arc(0, r * 0.34, r * 0.13, 0, Math.PI * 2); ctx.stroke(); break;
        case "cool":
          ctx.fillStyle = INK;
          ctx.beginPath(); ctx.roundRect(-ex - r * 0.16, eyeY - r * 0.13, r * 0.32, r * 0.24, r * 0.06); ctx.fill();
          ctx.beginPath(); ctx.roundRect(ex - r * 0.16, eyeY - r * 0.13, r * 0.32, r * 0.24, r * 0.06); ctx.fill();
          ctx.fillRect(-r * 0.08, eyeY - r * 0.03, r * 0.16, r * 0.05); // bridge
          ctx.beginPath(); ctx.arc(r * 0.10, r * 0.36, r * 0.22, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); // smirk
          break;
        case "love":
          drawHeart(-ex, eyeY, r * 0.16, COLORS.pink);
          drawHeart(ex, eyeY, r * 0.16, COLORS.pink);
          smile(r * 0.36, r * 0.26, r * 0.42); break;
        case "sleepy":
          ctx.beginPath(); ctx.moveTo(-ex - r * 0.12, eyeY); ctx.lineTo(-ex + r * 0.12, eyeY); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(ex - r * 0.12, eyeY); ctx.lineTo(ex + r * 0.12, eyeY); ctx.stroke();
          ctx.font = `${Math.round(r * 0.34)}px "Geist", sans-serif`;
          ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
          ctx.fillStyle = INK; ctx.fillText("z", r * 0.42, -r * 0.34);
          ctx.beginPath(); ctx.arc(0, r * 0.38, r * 0.10, 0, Math.PI); ctx.stroke(); break;
        case "wink":
          dotEye(-ex, eyeY, r * 0.10);
          ctx.beginPath(); ctx.arc(ex, eyeY + r * 0.06, r * 0.12, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
          ctx.fillStyle = COLORS.pink;
          ctx.beginPath(); ctx.roundRect(-r * 0.07, r * 0.30, r * 0.14, r * 0.20, r * 0.07); ctx.fill(); // tongue
          break;
        case "silly":
          ctx.beginPath();
          ctx.moveTo(-ex - r * 0.08, eyeY - r * 0.08); ctx.lineTo(-ex + r * 0.08, eyeY + r * 0.08);
          ctx.moveTo(-ex + r * 0.08, eyeY - r * 0.08); ctx.lineTo(-ex - r * 0.08, eyeY + r * 0.08);
          ctx.moveTo(ex - r * 0.08, eyeY - r * 0.08); ctx.lineTo(ex + r * 0.08, eyeY + r * 0.08);
          ctx.moveTo(ex + r * 0.08, eyeY - r * 0.08); ctx.lineTo(ex - r * 0.08, eyeY + r * 0.08);
          ctx.stroke();
          ctx.fillStyle = COLORS.pink;
          ctx.beginPath(); ctx.roundRect(r * 0.02, r * 0.28, r * 0.16, r * 0.24, r * 0.08); ctx.fill(); // tongue out
          break;
      }
      ctx.restore();
      drawSparkles(f);
    };
    const drawHeart = (x: number, y: number, s: number, color: string) => {
      ctx.save();
      ctx.translate(x, y); ctx.scale(s / 10, s / 10);
      ctx.beginPath();
      ctx.moveTo(0, 4);
      ctx.bezierCurveTo(-8, -4, -4, -10, 0, -4);
      ctx.bezierCurveTo(4, -10, 8, -4, 0, 4);
      ctx.fillStyle = color; ctx.fill();
      ctx.restore();
    };
    const drawSparkles = (it: PFace | PEmoji) => {
      it.sparkles.forEach((p) => {
        const a = Math.max(p.life / 600, 0);
        ctx.save();
        ctx.globalAlpha = a;
        ctx.translate(p.x, p.y);
        const s = 5 * a + 3;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.moveTo(0, -s); ctx.quadraticCurveTo(0, 0, s, 0); ctx.quadraticCurveTo(0, 0, 0, s);
        ctx.quadraticCurveTo(0, 0, -s, 0); ctx.quadraticCurveTo(0, 0, 0, -s);
        ctx.fill();
        ctx.restore();
      });
    };

    /* reduced motion: static settled layout */
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
      bakeEmojis();
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
      emojis.forEach((e) => {
        const p = place(e.size, e.size);
        e.dx = p.x; e.dy = p.y; e.da = p.r;
        e.body = { position: { x: p.x, y: p.y }, angle: p.r } as Matter.Body;
        drawEmoji(e); e.body = null;
      });
      faces.forEach((f) => {
        const p = place(f.size, f.size);
        f.dx = p.x; f.dy = p.y; f.da = p.r;
        f.body = { position: { x: p.x, y: p.y }, angle: p.r } as Matter.Body;
        drawFace(f, performance.now()); f.body = null;
      });
    };

    /* ── THE single rAF loop ── */
    let raf = 0, loopOn = false, lastT = 0;
    let hoverBody: Matter.Body | null = null;
    let frameTimes: number[] = [];
    let degraded = false;
    let accumulator = 0;
    let fastForwardSteps = 0;

    const loop = (now: number) => {
      if (!loopOn) return;
      raf = requestAnimationFrame(loop);
      let delta = now - lastT;
      lastT = now;
      // Refresh pointer geometry once per frame here instead of on scroll
      // events — a scroll listener forced 2 synchronous layouts per scroll
      // tick, which janked scrolling through this section.
      rectCache = section.getBoundingClientRect();
      syncMouse(rectCache);
      delta = Math.min(delta, 1000 / 30);
      accumulator += delta;
      let steps = 0;
      while (accumulator >= STEP && steps < 3) {
        stepPhysics(STEP);
        accumulator -= STEP;
        steps++;
      }
      if (steps === 3) accumulator = 0;

      if (fastForwardSteps > 0) {
        const extra = Math.min(30, fastForwardSteps);
        for (let i = 0; i < extra; i++) stepPhysics(STEP);
        fastForwardSteps -= extra;
        syncDrawState();
      }

      frameTimes.push(delta);
      if (!degraded && frameTimes.length === 60) {
        const avg = frameTimes.reduce((a, b) => a + b, 0) / 60;
        if (avg > 24) {
          degraded = true;
          // lower pixel ratio instead of deleting bodies
          engine.positionIterations = 4;
          engine.velocityIterations = 3;
        }
        frameTimes = [];
      }

      /* PART C: per-frame face + emoji animation state (no allocations) */
      for (const f of faces) {
        if (!f.body) continue;
        // blink
        if (f.blinkMs > 0) f.blinkMs -= delta;
        else if (now >= f.blinkAt && (f.mood === "happy" || f.mood === "surprised")) {
          f.blinkMs = 120; f.blinkAt = now + 3000 + Math.random() * 3000;
        }
        // temp mood expiry
        if (f.curUntil && now > f.curUntil) { f.cur = f.mood; f.curUntil = 0; }
        // squash / boing decay
        if (f.squashMs > 0) f.squashMs -= delta;
        if (f.boingMs > 0) f.boingMs -= delta;
        // idle wiggle: tiny angular impulse + blink-smile
        if (now >= f.wiggleAt) {
          f.wiggleAt = now + 4000 + Math.random() * 4000;
          Matter.Body.setAngularVelocity(f.body, f.body.angularVelocity + (Math.random() - 0.5) * 0.15);
          if (f.mood === "happy") f.blinkMs = 120;
        }
        // landing squash: hard floor/body hit
        if (f.body.speed > 6 && f.squashMs <= 0) f.squashMs = 140;
        // sparkles
        for (let i = f.sparkles.length - 1; i >= 0; i--) {
          const p = f.sparkles[i];
          p.life -= delta;
          p.x += p.vx; p.y += p.vy; p.vy += 0.05;
          if (p.life <= 0) f.sparkles.splice(i, 1);
        }
      }
      for (const e of emojis) {
        if (e.squashMs > 0) e.squashMs -= delta;
        if (e.boingMs > 0) e.boingMs -= delta;
        if (e.body && e.body.speed > 6 && e.squashMs <= 0) e.squashMs = 140;
        for (let i = e.sparkles.length - 1; i >= 0; i--) {
          const p = e.sparkles[i];
          p.life -= delta;
          p.x += p.vx; p.y += p.vy; p.vy += 0.05;
          if (p.life <= 0) e.sparkles.splice(i, 1);
        }
      }

      // smooth visuals: lerp drawn state toward physics state
      const items = allItems() as Array<{ body: Matter.Body | null; dx: number; dy: number; da: number; hoverT: number }>;
      items.forEach((it) => {
        if (!it.body) return;
        it.dx += (it.body.position.x - it.dx) * 0.5;
        it.dy += (it.body.position.y - it.dy) * 0.5;
        let diff = it.body.angle - it.da;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        it.da += diff * 0.5;
      });

      // cursor hover-push
      if (cursor.active) {
        if (cursor.x < -9000) { cursor.x = cursor.tx; cursor.y = cursor.ty; }
        cursor.px = cursor.x; cursor.py = cursor.y;
        cursor.x += (cursor.tx - cursor.x) * 0.25;
        cursor.y += (cursor.ty - cursor.y) * 0.25;
        cursor.vx = cursor.x - cursor.px;
        cursor.vy = cursor.y - cursor.py;
        const speed = Math.hypot(cursor.vx, cursor.vy);
        const PUSH_R = 150;
        const speedFactor = 0.25 + (Math.min(speed, 28) / 28) * 0.75;
        items.forEach((it) => {
          const b = it.body; if (!b) return;
          const dx = b.position.x - cursor.x, dy = b.position.y - cursor.y;
          const dist = Math.hypot(dx, dy);
          if (dist > PUSH_R || dist < 1) return;
          if (b.isSleeping) Matter.Sleeping.set(b, false);
          const falloff = 1 - dist / PUSH_R;
          const f = Math.min(0.004 * b.mass * falloff * speedFactor, 0.004 * b.mass);
          Matter.Body.applyForce(b, b.position, {
            x: (dx / dist) * f + (cursor.vx / Math.max(speed, 1)) * f * 0.7,
            y: (dy / dist) * f + (cursor.vy / Math.max(speed, 1)) * f * 0.7 - f * 0.2,
          });
          b.torque += (Math.random() - 0.5) * 0.0004 * falloff;
          // PART C: face near cursor → surprised mouth 400ms
          if (dist < 140) {
            const fi = faces.findIndex((fc) => fc.body === b);
            if (fi >= 0 && faces[fi].cur === faces[fi].mood) {
              faces[fi].cur = "surprised"; faces[fi].curUntil = now + 400;
            }
          }
        });
      }

      // hover detection
      if (cursor.active) {
        const all = items.map((it) => it.body).filter(Boolean) as Matter.Body[];
        const found = Matter.Query.point(all, { x: cursor.x, y: cursor.y })[0] || null;
        hoverBody = found;
        const dragging = (mouseConstraint as unknown as { constraint: { bodyB: Matter.Body | null } }).constraint.bodyB;
        // PART C: grab state
        faces.forEach((f) => { f.grabbed = dragging === f.body; });
        section.style.cursor = dragging ? "grabbing" : found ? "grab" : "";
        if (dragging) {
          const fi = faces.findIndex((f) => f.body === dragging);
          if (fi >= 0 && !faces[fi].grabbed) { /* grabbed set above */ }
        }
      } else {
        hoverBody = null;
        section.style.cursor = "";
        faces.forEach((f) => {
          if (f.grabbed) { f.grabbed = false; f.laughUntil = now + 600; } // release → laugh
        });
      }
      items.forEach((it) => {
        const target = it.body === hoverBody ? 1 : 0;
        it.hoverT += (target - it.hoverT) * 0.25;
      });

      // angular damping + upright settle
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

      // draw: shapes, emoji, faces, then pills
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = COLORS.bg;
      ctx.fillRect(0, 0, W, H);
      shapes.forEach((s) => { if (s.body) drawShape(s); });
      emojis.forEach((e) => { if (e.body) drawEmoji(e); });
      faces.forEach((f) => { if (f.body) drawFace(f, now); });
      tags.forEach((t) => { if (t.body) drawPill(t); });

      // PART C: grab → wide mouth + wide eyes handled in drawFace via f.grabbed
      // (grabbed faces draw with open mouth — applied below via temp mood)
      for (const f of faces) {
        if (f.grabbed && f.cur === f.mood) { f.cur = "laughing"; f.curUntil = now + 200; }
      }
    };

    const startLoop = () => {
      if (loopOn || !ready) return;
      loopOn = true;
      lastT = performance.now();
      raf = requestAnimationFrame(loop);
    };
    const stopLoop = () => { loopOn = false; cancelAnimationFrame(raf); };

    /* idle life: tiny nudge every 3s */
    const idleTimer = window.setInterval(() => {
      if (document.hidden || !loopOn) return;
      const all = allItems().map((it) => (it as { body: Matter.Body | null }).body).filter(Boolean) as Matter.Body[];
      if (!all.length) return;
      const b = all[Math.floor(Math.random() * all.length)];
      Matter.Body.applyForce(b, b.position, { x: (Math.random() - 0.5) * 0.0006, y: -Math.random() * 0.0007 });
    }, 3000);

    const is20Visible = () => {
      const r = section.getBoundingClientRect();
      const vh = window.innerHeight;
      const visibleH = Math.min(r.bottom, vh) - Math.max(r.top, 0);
      return visibleH >= r.height * 0.2;
    };

    /* simple drop trigger: 20% visible → drop once, no lock, no scroll-into-place */
    const dropObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasDropped && ready) {
            dropObserver.disconnect();
            triggerDrop();
          }
        });
      },
      { threshold: 0.2 }
    );

    const loopObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) startLoop();
          else stopLoop();
        });
      },
      { threshold: 0 }
    );

    let isVisible = false;
    const visibleObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const was = isVisible;
          isVisible = entry.isIntersecting;
          if (isVisible) {
            syncMouse();
            rectCache = section.getBoundingClientRect();
            if (!was && hasDropped && fastForwardSteps === 0 && performance.now() - dropStart < 4000) {
              fastForwardSteps = 90;
            }
          }
        });
      },
      { threshold: 0 }
    );

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
        allItems().forEach((it) => {
          const b = (it as { body: Matter.Body | null }).body; if (!b) return;
          const x = Math.min(Math.max(b.position.x, 20), W - 20);
          const y = Math.min(b.position.y, floorY() - 10);
          if (x !== b.position.x || y !== b.position.y) {
            Matter.Body.setPosition(b, { x, y });
            (it as { dx: number }).dx = x; (it as { dy: number }).dy = y;
          }
        });
        syncMouse();
        rectCache = section.getBoundingClientRect();
      }, 200);
    };
    const onVis = () => {
      if (document.hidden) { stopLoop(); }
      else startLoop();
    };
    const onPageShow = () => startLoop();

    const boot = () => {
      Matter.Composite.add(engine.world, mouseConstraint);
      stripWheel();
      syncMouse();
      section.addEventListener("pointermove", onMove);
      section.addEventListener("pointerleave", onLeave);
      section.addEventListener("pointerdown", onDown);
      window.addEventListener("resize", onResize);
      document.addEventListener("visibilitychange", onVis);
      window.addEventListener("pageshow", onPageShow);
      // already in view on load: drop immediately
      if (is20Visible()) {
        triggerDrop();
      } else {
        dropObserver.observe(section);
      }
      loopObserver.observe(section);
      visibleObserver.observe(section);
    };
    const bootCheck = window.setInterval(() => {
      if (ready) { window.clearInterval(bootCheck); boot(); }
    }, 100);

    start();

    return () => {
      window.clearInterval(bootCheck);
      window.clearInterval(idleTimer);
      window.clearTimeout(resizeT);
      dropObserver.disconnect();
      loopObserver.disconnect();
      visibleObserver.disconnect();
      section.removeEventListener("pointermove", onMove);
      section.removeEventListener("pointerleave", onLeave);
      section.removeEventListener("pointerdown", onDown);
      window.removeEventListener("resize", onResize);
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
          touch-action: pan-y;
          contain: layout paint;
        }
        .physics-tags-section canvas {
          position: absolute;
          inset: 0;
          display: block;
        }
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
