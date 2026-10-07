import { useEffect, useRef } from "react";
import Matter from "matter-js";

/* ── Palette: purple-dominant, no orange/amber/blue ─────────────────────── */
const COLORS = {
  bg: "#0D0D0D",          // jet black section bg
  purpleDark: "#433075",
  purpleLight: "#A58CF4",
  pink: "#ff0a8a",
  yellow: "#ffd60a",
  softWhite: "#FAFAFA",
  jetBlack: "#0D0D0D",
} as const;

type PillDef = { bg: string; fg: string; outline?: string };
/* Weighted ~28/24/16/16/10/6 split across 18 slots */
const PALETTE: PillDef[] = [
  // Purple Light ~28% — text #0D0D0D
  { bg: COLORS.purpleLight, fg: "#0D0D0D" },
  { bg: COLORS.purpleLight, fg: "#0D0D0D" },
  { bg: COLORS.purpleLight, fg: "#0D0D0D" },
  { bg: COLORS.purpleLight, fg: "#0D0D0D" },
  { bg: COLORS.purpleLight, fg: "#0D0D0D" },
  // Purple Dark ~24% — text #A58CF4 + outline so it reads on dark bg
  { bg: COLORS.purpleDark, fg: "#A58CF4", outline: "rgba(165,140,244,0.5)" },
  { bg: COLORS.purpleDark, fg: "#A58CF4", outline: "rgba(165,140,244,0.5)" },
  { bg: COLORS.purpleDark, fg: "#A58CF4", outline: "rgba(165,140,244,0.5)" },
  { bg: COLORS.purpleDark, fg: "#A58CF4", outline: "rgba(165,140,244,0.5)" },
  // Pink ~16% — text #FAFAFA
  { bg: COLORS.pink, fg: "#FAFAFA" },
  { bg: COLORS.pink, fg: "#FAFAFA" },
  { bg: COLORS.pink, fg: "#FAFAFA" },
  // Yellow ~16% — text #0D0D0D
  { bg: COLORS.yellow, fg: "#0D0D0D" },
  { bg: COLORS.yellow, fg: "#0D0D0D" },
  { bg: COLORS.yellow, fg: "#0D0D0D" },
  // Soft White ~10% — text #0D0D0D
  { bg: COLORS.softWhite, fg: "#0D0D0D" },
  { bg: COLORS.softWhite, fg: "#0D0D0D" },
  // Jet Black ~6% — outline + text #FAFAFA
  { bg: COLORS.jetBlack, fg: "#FAFAFA", outline: "rgba(250,250,250,0.7)" },
];

const GEIST_WORDS = ["LOGO", "BRANDING", "IDENTITY", "PACKAGING", "PRINT", "DESIGN", "TYPOGRAPHY", "SOCIAL MEDIA", "GUIDELINES", "STRATEGY"];
const SCRIPT_WORDS = ["hello!", "ideas", "let's talk", "cool stuff", "made with love", "brand story", "say hi"];

const TAG_COUNT_DESKTOP = 26;
const TAG_COUNT_MOBILE = 14;
const SHAPE_COUNT_DESKTOP = 16;
const SHAPE_COUNT_MOBILE = 8;
const FLOOR_PADDING = 96;

interface PTag {
  word: string;
  script: boolean;
  w: number; h: number;
  color: PillDef;
  body: Matter.Body | null;
}
interface PShape {
  kind: "circle" | "face" | "ring" | "star" | "square" | "dome" | "triangle" | "plus" | "squiggle";
  size: number;
  color: string;
  outline?: string;
  body: Matter.Body | null;
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

    /* ── Build tag defs: 70% Geist / 30% script, colors spread evenly ────── */
    const colorIdx: number[] = [];
    for (let i = 0; i < tagCount; i++) colorIdx.push(i % PALETTE.length);
    for (let i = colorIdx.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [colorIdx[i], colorIdx[j]] = [colorIdx[j], colorIdx[i]];
    }
    /* fix-up: no two adjacent pills share a color; keep purple shades apart */
    for (let i = 1; i < colorIdx.length; i++) {
      const prev = PALETTE[colorIdx[i - 1]].bg, cur = PALETTE[colorIdx[i]].bg;
      const bothPurple =
        (prev === COLORS.purpleLight || prev === COLORS.purpleDark) &&
        (cur === COLORS.purpleLight || cur === COLORS.purpleDark);
      if (cur === prev || bothPurple) {
        // swap with a later non-conflicting slot
        for (let k = i + 1; k < colorIdx.length; k++) {
          const cand = PALETTE[colorIdx[k]].bg;
          const candPurple =
            (cand === COLORS.purpleLight || cand === COLORS.purpleDark);
          if (cand !== prev && !(bothPurple && candPurple)) {
            [colorIdx[i], colorIdx[k]] = [colorIdx[k], colorIdx[i]];
            break;
          }
        }
      }
    }
    const scriptCount = Math.round(tagCount * 0.3);
    const scriptAt = new Set<number>();
    const sStep = tagCount / scriptCount;
    for (let k = 0; k < scriptCount; k++) {
      let idx = Math.floor(k * sStep + sStep / 2);
      if (scriptAt.has(idx - 1) || scriptAt.has(idx + 1)) idx = Math.min(tagCount - 1, idx + 2);
      scriptAt.add(Math.max(0, Math.min(tagCount - 1, idx)));
    }

    const tags: PTag[] = [];
    for (let i = 0; i < tagCount; i++) {
      const script = scriptAt.has(i);
      tags.push({
        word: script ? SCRIPT_WORDS[i % SCRIPT_WORDS.length] : GEIST_WORDS[i % GEIST_WORDS.length],
        script,
        w: 0, h: 0,
        color: PALETTE[colorIdx[i]],
        body: null,
      });
    }

    /* ── Shapes: NO text, ever ──────────────────────────────────────────── */
    const SHAPE_KINDS: PShape["kind"][] = [
      "circle", "circle", "circle",
      "face", "face",
      "ring",
      "star", "star", "star",
      "square", "square",
      "dome", "dome",
      "triangle",
      "plus",
      "squiggle",
    ];
    const shapes: PShape[] = [];
    /* shape palette: no plain black; stars in yellow/purple-light/pink */
    const SHAPE_PALETTE = PALETTE.filter((p) => p.bg !== COLORS.jetBlack);
    const STAR_COLORS = [COLORS.yellow, COLORS.purpleLight, COLORS.pink];
    for (let i = 0; i < shapeCount; i++) {
      const kind = SHAPE_KINDS[i % SHAPE_KINDS.length];
      const size = 28 + Math.random() * 28; // 28–56px (max 64)
      let pal: PillDef;
      if (kind === "star") {
        const c = STAR_COLORS[i % STAR_COLORS.length];
        pal = { bg: c, fg: "#0D0D0D" };
      } else {
        pal = SHAPE_PALETTE[Math.floor(Math.random() * SHAPE_PALETTE.length)];
      }
      shapes.push({ kind, size: Math.min(size, 64), color: pal.bg, outline: pal.outline, body: null });
    }

    const floorY = () => H - FLOOR_PADDING;

    /* ── Engine ─────────────────────────────────────────────────────────── */
    const engine = Matter.Engine.create({ enableSleeping: false });
    engine.gravity.y = 1;
    engine.positionIterations = 6;
    engine.velocityIterations = 4;

    const wallOpts: Matter.IBodyDefinition = {
      isStatic: true, restitution: 0.55, friction: 0.15, render: { visible: false },
    };
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

    /* Measure text AFTER fonts load, then create bodies */
    const GEIST_FONT = '600 20px "Geist:SemiBold", "Geist", sans-serif';
    const SCRIPT_FONT = '600 26px "Zilla Slab", serif';
    let ready = false;

    const measureAndBuild = () => {
      tags.forEach((t) => {
        ctx.font = t.script ? SCRIPT_FONT : GEIST_FONT;
        // letter-spacing isn't supported on canvas in all browsers; add manually
        const raw = ctx.measureText(t.word).width;
        t.h = 56; // 52–60px pill height
        t.w = raw + 56 + (t.script ? 0 : t.word.length * 0.4); // ~0.02em spacing
      });
      buildWalls();
      ready = true;
      dropAll();
    };

    const timeouts: number[] = [];
    const spawnTag = (i: number) => {
      const t = tags[i];
      const x = W * (0.1 + Math.random() * 0.8);
      const y = -60 - Math.random() * 200;
      // FIX 1: perfect full-round pill collider matches visual
      const body = Matter.Bodies.rectangle(x, y, t.w, t.h, {
        chamfer: { radius: t.h / 2 },
        restitution: 0.55, friction: 0.15, frictionAir: 0.015, density: 0.0009,
      });
      Matter.Body.setAngle(body, (Math.random() - 0.5) * 0.6);
      t.body = body;
      Matter.Composite.add(engine.world, body);
    };
    const spawnShape = (i: number) => {
      const s = shapes[i];
      const x = W * (0.1 + Math.random() * 0.8);
      const y = -60 - Math.random() * 200;
      const o = { restitution: 0.55, friction: 0.15, frictionAir: 0.015, density: 0.0009 };
      let body: Matter.Body;
      const r = s.size / 2;
      switch (s.kind) {
        case "circle": case "face": case "ring":
          body = Matter.Bodies.circle(x, y, r, o); break;
        case "star":
          body = Matter.Bodies.polygon(x, y, 4, r, o); break;
        case "triangle":
          body = Matter.Bodies.polygon(x, y, 3, r, o); break;
        case "square":
          body = Matter.Bodies.rectangle(x, y, s.size, s.size, { ...o, chamfer: { radius: 10 } }); break;
        case "dome":
          body = Matter.Bodies.circle(x, y, r, o); break; // approx
        case "plus":
          body = Matter.Bodies.rectangle(x, y, s.size, s.size * 0.36, o); break;
        case "squiggle":
          body = Matter.Bodies.rectangle(x, y, s.size * 1.6, 14, { ...o, chamfer: { radius: 7 } }); break;
      }
      Matter.Body.setAngle(body!, Math.random() * Math.PI);
      s.body = body!;
      Matter.Composite.add(engine.world, body!);
    };
    const dropAll = () => {
      timeouts.forEach((t) => window.clearTimeout(t));
      timeouts.length = 0;
      // reposition existing bodies above (no re-creation, no teleport pop)
      tags.forEach((t, i) => {
        if (t.body) {
          Matter.Body.setPosition(t.body, { x: W * (0.1 + Math.random() * 0.8), y: -60 - Math.random() * 200 });
          Matter.Body.setVelocity(t.body, { x: 0, y: 0 });
          Matter.Body.setAngle(t.body, (Math.random() - 0.5) * 0.6);
        } else {
          // FIX: capture i per-iteration (forEach scope), not a shared counter
          timeouts.push(window.setTimeout(() => spawnTag(i), i * (70 + Math.random() * 30)));
        }
      });
      shapes.forEach((s, i) => {
        if (s.body) {
          Matter.Body.setPosition(s.body, { x: W * (0.1 + Math.random() * 0.8), y: -60 - Math.random() * 200 });
          Matter.Body.setVelocity(s.body, { x: 0, y: 0 });
        } else {
          timeouts.push(window.setTimeout(() => spawnShape(i), (tags.length + i) * (70 + Math.random() * 30)));
        }
      });
    };

    /* Wait for both fonts, then measure + build */
    const start = () => {
      const loads = [
        document.fonts.load('600 20px "Geist:SemiBold"'),
        document.fonts.load('600 26px "Zilla Slab"'),
      ];
      Promise.all(loads).catch(() => {}).finally(() => {
        if (reduceMotion) { drawSettled(); return; }
        measureAndBuild();
      });
      // safety: don't wait forever
      window.setTimeout(() => { if (!ready && !reduceMotion) measureAndBuild(); }, 2500);
    };

    /* ── Mouse ──────────────────────────────────────────────────────────── */
    const mouse = Matter.Mouse.create(section);
    const syncMouse = () => {
      const r = section.getBoundingClientRect();
      Matter.Mouse.setOffset(mouse, { x: r.left, y: r.top });
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

    const cursor = { x: -9999, y: -9999, vx: 0, vy: 0, tx: -9999, ty: -9999, active: false };
    let lastMove = 0, rectCache = section.getBoundingClientRect();
    const onMove = (e: MouseEvent) => {
      const now = performance.now();
      if (now - lastMove < 16) return;
      lastMove = now;
      cursor.tx = e.clientX - rectCache.left;
      cursor.ty = e.clientY - rectCache.top;
      cursor.active = true;
    };
    const onLeave = () => { cursor.active = false; cursor.x = -9999; };
    const onDown = (e: PointerEvent) => {
      const cx = e.clientX - rectCache.left, cy = e.clientY - rectCache.top;
      const all = [...tags.map((t) => t.body), ...shapes.map((s) => s.body)].filter(Boolean) as Matter.Body[];
      const found = Matter.Query.point(all, { x: cx, y: cy })[0];
      if (found) {
        Matter.Body.applyForce(found, found.position, { x: 0, y: -0.004 });
      } else {
        all.forEach((b) => {
          const dx = b.position.x - cx, dy = b.position.y - cy;
          const dist = Math.max(Math.hypot(dx, dy), 1);
          if (dist > 280) return;
          const f = Math.min(0.005 * (1 - dist / 280), 0.004);
          Matter.Body.applyForce(b, b.position, { x: (dx / dist) * f, y: (dy / dist) * f - f * 0.35 });
        });
      }
    };

    /* ── Draw helpers ───────────────────────────────────────────────────── */
    const drawPill = (t: PTag) => {
      const b = t.body!;
      ctx.save();
      ctx.translate(b.position.x, b.position.y);
      ctx.rotate(b.angle);
      const hw = t.w / 2, hh = t.h / 2;
      const hov = hoverBody === b;
      if (hov) ctx.scale(1.06, 1.06);
      // FIX 1: perfect pill — radius = height/2
      ctx.beginPath();
      ctx.roundRect(-hw, -hh, t.w, t.h, t.h / 2);
      ctx.fillStyle = t.color.bg;
      ctx.fill();
      if (t.color.outline) {
        ctx.strokeStyle = t.color.outline;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      ctx.font = t.script ? SCRIPT_FONT : GEIST_FONT;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = t.color.fg;
      ctx.fillText(t.word, 0, t.script ? 2 : 1);
      ctx.restore();
    };

    const drawShape = (s: PShape) => {
      const b = s.body!;
      ctx.save();
      ctx.translate(b.position.x, b.position.y);
      ctx.rotate(b.angle);
      const r = s.size / 2;
      const hov = hoverBody === b;
      if (hov) ctx.scale(1.06, 1.06);
      ctx.fillStyle = s.color;
      ctx.strokeStyle = s.outline || "transparent";
      ctx.lineWidth = 1.5;
      switch (s.kind) {
        case "circle":
          ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
          if (s.outline) ctx.stroke();
          break;
        case "face":
          ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
          /* eyes: dark on light fills, light on dark fills */
          const isDarkFill = s.color === COLORS.purpleDark || s.color === COLORS.pink;
          ctx.fillStyle = isDarkFill ? "#FAFAFA" : "#0D0D0D";
          ctx.beginPath(); ctx.arc(-r * 0.3, -r * 0.15, r * 0.12, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(r * 0.3, -r * 0.15, r * 0.12, 0, Math.PI * 2); ctx.fill();
          break;
        case "ring":
          ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
          ctx.strokeStyle = s.color; ctx.lineWidth = 5; ctx.stroke();
          break;
        case "star": {
          // 4-point sparkle
          ctx.beginPath();
          for (let i = 0; i < 8; i++) {
            const rr = i % 2 === 0 ? r : r * 0.38;
            const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
            const px = Math.cos(a) * rr, py = Math.sin(a) * rr;
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
          }
          ctx.closePath(); ctx.fill();
          break;
        }
        case "square":
          ctx.beginPath(); ctx.roundRect(-r, -r, s.size, s.size, 10); ctx.fill();
          break;
        case "dome":
          ctx.beginPath(); ctx.arc(0, r * 0.4, r, Math.PI, 0); ctx.closePath(); ctx.fill();
          ctx.fillRect(-r, r * 0.4 - 2, s.size, r * 0.6);
          break;
        case "triangle":
          ctx.beginPath();
          ctx.moveTo(0, -r);
          ctx.quadraticCurveTo(r * 0.15, -r * 0.7, r * 0.87, r * 0.7);
          ctx.quadraticCurveTo(0, r * 0.45, -r * 0.87, r * 0.7);
          ctx.quadraticCurveTo(-r * 0.15, -r * 0.7, 0, -r);
          ctx.fill();
          break;
        case "plus":
          ctx.fillRect(-r, -r * 0.18, s.size, s.size * 0.36);
          ctx.fillRect(-r * 0.18, -r, s.size * 0.36, s.size);
          break;
        case "squiggle":
          ctx.strokeStyle = s.color; ctx.lineWidth = 13; ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(-r * 1.2, 0);
          ctx.quadraticCurveTo(-r * 0.6, -r * 0.7, 0, 0);
          ctx.quadraticCurveTo(r * 0.6, r * 0.7, r * 1.2, 0);
          ctx.stroke();
          break;
      }
      ctx.restore();
    };

    const drawSettled = () => {
      // reduced motion: single static draw
      resizeCanvas();
      ctx.fillStyle = COLORS.bg;
      ctx.fillRect(0, 0, W, H);
      measureAndBuildStatic();
    };
    const measureAndBuildStatic = () => {
      tags.forEach((t) => {
        ctx.font = t.script ? SCRIPT_FONT : GEIST_FONT;
        t.h = 56;
        t.w = ctx.measureText(t.word).width + 56;
      });
      // scatter statically
      const placed: Array<{ x: number; y: number; w: number; h: number }> = [];
      [...tags, ...shapes].forEach((item: unknown) => {
        const isT = (item as PTag).word !== undefined;
        const w = isT ? (item as PTag).w : (item as PShape).size;
        const h = isT ? (item as PTag).h : (item as PShape).size;
        let x = 0, y = 0, ok = false;
        for (let tries = 0; tries < 40 && !ok; tries++) {
          x = w / 2 + Math.random() * (W - w);
          y = H * 0.4 + Math.random() * (floorY() - H * 0.4 - h);
          ok = placed.every((p) => Math.abs(p.x - x) > (p.w + w) / 2 * 0.7 || Math.abs(p.y - y) > (p.h + h) / 2 * 0.7);
        }
        placed.push({ x, y, w, h });
        (item as { _sx?: number; _sy?: number; _sr?: number })._sx = x;
        (item as { _sx?: number; _sy?: number; _sr?: number })._sy = y;
        (item as { _sx?: number; _sy?: number; _sr?: number })._sr = (Math.random() - 0.5) * 0.6;
      });
      tags.forEach((t) => {
        const { _sx = 0, _sy = 0, _sr = 0 } = t as unknown as { _sx: number; _sy: number; _sr: number };
        ctx.save();
        ctx.translate(_sx, _sy); ctx.rotate(_sr);
        ctx.beginPath(); ctx.roundRect(-t.w / 2, -t.h / 2, t.w, t.h, t.h / 2);
        ctx.fillStyle = t.color.bg; ctx.fill();
        if (t.color.outline) { ctx.strokeStyle = t.color.outline; ctx.lineWidth = 1.5; ctx.stroke(); }
        ctx.font = t.script ? SCRIPT_FONT : GEIST_FONT;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillStyle = t.color.fg;
        ctx.fillText(t.word, 0, 1);
        ctx.restore();
      });
      shapes.forEach((s) => {
        const { _sx = 0, _sy = 0, _sr = 0 } = s as unknown as { _sx: number; _sy: number; _sr: number };
        // reuse drawShape with a fake body
        const fake = { position: { x: _sx, y: _sy }, angle: _sr } as Matter.Body;
        const real = s.body; s.body = fake;
        drawShape(s);
        s.body = real;
      });
    };

    /* ── THE single loop ────────────────────────────────────────────────── */
    let raf = 0, loopOn = false, lastT = 0;
    let hoverBody: Matter.Body | null = null;
    let frameTimes: number[] = [];
    let degraded = false;

    const loop = (now: number) => {
      if (!loopOn) return;
      raf = requestAnimationFrame(loop);
      const delta = Math.min(now - lastT, 33); // clamp: no big jumps
      lastT = now;

      // quality guard: first 60 frames
      frameTimes.push(delta);
      if (!degraded && frameTimes.length === 60) {
        const avg = frameTimes.reduce((a, b) => a + b, 0) / 60;
        if (avg > 24) {
          degraded = true;
          // remove 30% of bodies, shapes first
          const allBodies = Matter.Composite.allBodies(engine.world).filter((b) => !b.isStatic);
          const removeCount = Math.floor(allBodies.length * 0.3);
          const shapeBodies = shapes.map((s) => s.body).filter(Boolean) as Matter.Body[];
          const victims = [...shapeBodies.slice(0, removeCount)];
          if (victims.length < removeCount) {
            victims.push(...allBodies.filter((b) => !victims.includes(b)).slice(0, removeCount - victims.length));
          }
          victims.forEach((b) => {
            Matter.Composite.remove(engine.world, b);
            const ti = tags.findIndex((t) => t.body === b);
            if (ti >= 0) tags[ti].body = null;
            const si = shapes.findIndex((s) => s.body === b);
            if (si >= 0) shapes[si].body = null;
          });
          engine.positionIterations = 4;
          engine.velocityIterations = 3;
        }
        frameTimes = [];
      }

      Matter.Engine.update(engine, 1000 / 60);

      // cursor push: forces applied here, once per frame
      if (cursor.active) {
        const sx = cursor.tx - cursor.x, sy = cursor.ty - cursor.y;
        cursor.vx += (sx - cursor.vx) * 0.2;
        cursor.vy += (sy - cursor.vy) * 0.2;
        cursor.x += cursor.vx; cursor.y += cursor.vy;
        const speed = Math.hypot(cursor.vx, cursor.vy);
        if (speed > 0.5) {
          const all = [...tags.map((t) => t.body), ...shapes.map((s) => s.body)].filter(Boolean) as Matter.Body[];
          all.forEach((b) => {
            const dx = b.position.x - cursor.x, dy = b.position.y - cursor.y;
            const dist = Math.hypot(dx, dy);
            if (dist > 140 || dist < 1) return;
            const falloff = 1 - dist / 140;
            let f = 0.00045 * falloff * Math.min(speed, 32);
            f = Math.min(f, 0.0012);
            Matter.Body.applyForce(b, b.position, {
              x: (dx / dist) * f + (cursor.vx / Math.max(speed, 1)) * f * 0.7,
              y: (dy / dist) * f + (cursor.vy / Math.max(speed, 1)) * f * 0.7 - f * 0.2,
            });
            Matter.Body.setAngularVelocity(b, b.angularVelocity * 0.995 + (Math.random() - 0.5) * 0.008 * falloff);
          });
        }
      }

      // hover detection for grab cursor + scale
      if (cursor.active) {
        const all = [...tags.map((t) => t.body), ...shapes.map((s) => s.body)].filter(Boolean) as Matter.Body[];
        const found = Matter.Query.point(all, { x: cursor.x, y: cursor.y })[0] || null;
        hoverBody = found;
        const dragging = (mouseConstraint as unknown as { constraint: { bodyB: Matter.Body | null } }).constraint.bodyB;
        section.style.cursor = dragging ? "grabbing" : found ? "grab" : "";
      } else {
        hoverBody = null;
      }

      // angular damping + upright nudge
      const allB = [...tags.map((t) => t.body), ...shapes.map((s) => s.body)].filter(Boolean) as Matter.Body[];
      allB.forEach((b) => {
        if (Math.abs(b.angularVelocity) > 0.25) {
          Matter.Body.setAngularVelocity(b, b.angularVelocity * 0.97);
        } else if (Math.abs(b.velocity.x) < 0.35 && Math.abs(b.velocity.y) < 0.35) {
          const twoPi = Math.PI * 2;
          let a = ((b.angle % twoPi) + twoPi) % twoPi;
          if (a > Math.PI) a -= twoPi;
          Matter.Body.setAngle(b, b.angle - a * 0.02);
        }
      });

      // draw
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = COLORS.bg;
      ctx.fillRect(0, 0, W, H);
      shapes.forEach((s) => { if (s.body) drawShape(s); });
      tags.forEach((t) => { if (t.body) drawPill(t); });
    };

    const startLoop = () => {
      if (loopOn || !ready) return;
      loopOn = true;
      lastT = performance.now(); // reset: no time jump on resume
      raf = requestAnimationFrame(loop);
    };
    const stopLoop = () => { loopOn = false; cancelAnimationFrame(raf); };

    /* idle nudge */
    const idleTimer = window.setInterval(() => {
      if (document.hidden || !loopOn) return;
      const all = [...tags.map((t) => t.body), ...shapes.map((s) => s.body)].filter(Boolean) as Matter.Body[];
      if (!all.length) return;
      const b = all[Math.floor(Math.random() * all.length)];
      Matter.Body.applyForce(b, b.position, { x: (Math.random() - 0.5) * 0.0006, y: -Math.random() * 0.0007 });
    }, 3000);

    /* scroll */
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.3) {
            syncMouse();
            rectCache = section.getBoundingClientRect();
            startLoop();
            if (ready) dropAll();
          } else if (!entry.isIntersecting) {
            stopLoop(); // rAF cancelled completely off-screen
          }
        });
      },
      { threshold: [0, 0.3, 0.6, 1] }
    );

    const onResize = () => {
      resizeCanvas();
      Matter.Composite.remove(engine.world, walls);
      buildWalls();
      syncMouse();
      rectCache = section.getBoundingClientRect();
    };

    /* wire up after fonts */
    const boot = () => {
      Matter.Composite.add(engine.world, mouseConstraint);
      stripWheel();
      syncMouse();
      section.addEventListener("mousemove", onMove);
      section.addEventListener("mouseleave", onLeave);
      section.addEventListener("pointerdown", onDown);
      window.addEventListener("resize", onResize);
      window.addEventListener("scroll", () => { syncMouse(); rectCache = section.getBoundingClientRect(); }, { passive: true });
      observer.observe(section);
    };

    // defer boot until ready (fonts measured)
    const bootCheck = window.setInterval(() => {
      if (ready) { window.clearInterval(bootCheck); boot(); }
    }, 100);

    start();

    return () => {
      window.clearInterval(bootCheck);
      window.clearInterval(idleTimer);
      observer.disconnect();
      section.removeEventListener("mousemove", onMove);
      section.removeEventListener("mouseleave", onLeave);
      section.removeEventListener("pointerdown", onDown);
      window.removeEventListener("resize", onResize);
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
      `}</style>
      <div ref={sectionRef} className="physics-tags-section" data-theme="dark" aria-label="Design services tags">
        <canvas ref={canvasRef} />
      </div>
    </>
  );
}
