import { useEffect, useRef } from "react";
import Matter from "matter-js";
import "../raf.js";

declare global {
  interface Window {
    __raf: {
      add(cb: (now: number) => void): void;
      remove(cb: (now: number) => void): void;
    };
  }
}

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
  sprite: HTMLCanvasElement | null; // pre-rendered pill (invisible perf)
  br: number; // bounding radius for offscreen culling
}
interface PShape {
  kind: "circle" | "ring" | "star" | "square" | "dome" | "triangle" | "plus" | "squiggle";
  size: number;
  color: string;
  body: Matter.Body | null;
  dx: number; dy: number; da: number;
  hoverT: number;
  sprite: HTMLCanvasElement | null;
  br: number;
}
/* PART B: plain system-emoji sticker */
interface PEmoji {
  char: string;
  size: number; // 52–72px diameter
  color: string;
  sprite: HTMLCanvasElement | null; // pre-rendered sticker (disc + glyph)
  body: Matter.Body | null;
  dx: number; dy: number; da: number;
  hoverT: number;
  br: number;
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
  br: number;
  sprBase: HTMLCanvasElement | null;
  sprEyeOpen: HTMLCanvasElement | null;
  sprEyeClosed: HTMLCanvasElement | null;
  sprEyeArc: HTMLCanvasElement | null;
  sprEyeWide: HTMLCanvasElement | null;
  sprEyeHeart: HTMLCanvasElement | null;
  sprEyeX: HTMLCanvasElement | null;
  sprEyeWink: HTMLCanvasElement | null;
  sprEyeWinkBlink: HTMLCanvasElement | null;
  sprGlasses: HTMLCanvasElement | null;
  sprMouthSmile: HTMLCanvasElement | null;
  sprMouthSmileWide: HTMLCanvasElement | null;
  sprMouthOpen: HTMLCanvasElement | null;
  sprMouthO: HTMLCanvasElement | null;
  sprMouthSmirk: HTMLCanvasElement | null;
  sprMouthTongue: HTMLCanvasElement | null;
  sprMouthTongueSilly: HTMLCanvasElement | null;
  sprMouthSleepy: HTMLCanvasElement | null;
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

    const ctx = canvas.getContext("2d", { alpha: false, desynchronized: true })!;
    const isMobile = window.innerWidth < 768;
    const tagCount = isMobile ? TAG_COUNT_MOBILE : TAG_COUNT_DESKTOP;
    const shapeCount = isMobile ? SHAPE_COUNT_MOBILE : SHAPE_COUNT_DESKTOP;
    const emojiCount = isMobile ? EMOJI_COUNT_MOBILE : EMOJI_COUNT_DESKTOP;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const DPR = Math.min(window.devicePixelRatio || 1, 2);

    let W = 0, H = 0;
    // Effective DPR for the main canvas: the section is CSS-zoomed (≈0.535),
    // so a full-DPR backing store renders ~3.7x more pixels than ever displayed.
    // Scaling by the zoom factor keeps on-screen sharpness identical while
    // cutting the per-frame draw cost dramatically (this was the scroll lag).
    let effDPR = DPR;
    const resizeCanvas = () => {
      W = section.clientWidth;
      H = section.clientHeight;
      const r = section.getBoundingClientRect();
      const zoom = (r.width / Math.max(section.clientWidth, 1)) || 1;
      effDPR = Math.max(DPR * zoom, 1);
      canvas.width = Math.round(W * effDPR);
      canvas.height = Math.round(H * effDPR);
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(effDPR, 0, 0, effDPR, 0, 0);
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
      tags.push({ word, zilla, font, w: 0, h: 0, color: palette[i], body: null, dx: 0, dy: 0, da: 0, hoverT: 0, sprite: null, br: 0 });
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
      shapes.push({ kind, size, color, body: null, dx: 0, dy: 0, da: 0, hoverT: 0, sprite: null, br: size });
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
        emojis.push({ char, size, color: fill, sprite: null, body: null, dx: 0, dy: 0, da: 0, hoverT: 0, br: size / 2, squashMs: 0, boingMs: 0, sparkles: [] });
      }
    }
    /* ── SPRITE BAKING (invisible perf): every body is rendered ONCE to its
       own offscreen canvas at the main canvas DPR. The loop then draws each
       body with a single drawImage — no fillText/roundRect/stroke/path work. ── */
    const EMOJI_FONT = `"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
    const FACE_INK = "#0D0D0D";
    let SPR_DPR = effDPR;
    const makeSprite = (w: number, h: number) => {
      const c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(w * SPR_DPR));
      c.height = Math.max(1, Math.round(h * SPR_DPR));
      const g = c.getContext("2d")!;
      g.scale(SPR_DPR, SPR_DPR);
      return { c, g };
    };

    const bakePill = (t: PTag) => {
      if (t.w <= 0) return;
      const { c, g } = makeSprite(t.w, t.h);
      g.translate(t.w / 2, t.h / 2);
      const hw = t.w / 2, hh = t.h / 2;
      g.beginPath();
      g.roundRect(-hw, -hh, t.w, t.h, t.h / 2);
      g.fillStyle = t.color.bg;
      g.fill();
      if (t.color.outline) {
        g.strokeStyle = t.color.outline;
        g.lineWidth = 1.5;
        g.stroke();
      }
      g.font = t.font;
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillStyle = t.color.fg;
      g.fillText(t.word, 0, t.zilla ? 2 : 1);
      t.sprite = c;
      t.br = Math.hypot(t.w, t.h) / 2;
    };

    const bakeShape = (s: PShape) => {
      const S = s.size * 2; // generous: covers squiggle overhang
      const { c, g } = makeSprite(S, S);
      g.translate(S / 2, S / 2);
      const r = s.size / 2;
      g.fillStyle = s.color;
      switch (s.kind) {
        case "circle":
          g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.fill(); break;
        case "ring":
          g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2);
          g.strokeStyle = s.color; g.lineWidth = 5; g.stroke(); break;
        case "star": {
          g.beginPath();
          for (let i = 0; i < 8; i++) {
            const rr = i % 2 === 0 ? r : r * 0.38;
            const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
            const px = Math.cos(a) * rr, py = Math.sin(a) * rr;
            if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
          }
          g.closePath(); g.fill(); break;
        }
        case "square":
          g.beginPath(); g.roundRect(-r, -r, s.size, s.size, 10); g.fill(); break;
        case "dome":
          g.beginPath(); g.arc(0, r * 0.4, r, Math.PI, 0); g.closePath(); g.fill();
          g.fillRect(-r, r * 0.4 - 2, s.size, r * 0.6); break;
        case "triangle":
          g.beginPath();
          g.moveTo(0, -r);
          g.quadraticCurveTo(r * 0.15, -r * 0.7, r * 0.87, r * 0.7);
          g.quadraticCurveTo(0, r * 0.45, -r * 0.87, r * 0.7);
          g.quadraticCurveTo(-r * 0.15, -r * 0.7, 0, -r);
          g.fill(); break;
        case "plus":
          g.fillRect(-r, -r * 0.18, s.size, s.size * 0.36);
          g.fillRect(-r * 0.18, -r, s.size * 0.36, s.size); break;
        default:
          g.strokeStyle = s.color; g.lineWidth = 13; g.lineCap = "round";
          g.beginPath();
          g.moveTo(-r * 1.2, 0);
          g.quadraticCurveTo(-r * 0.6, -r * 0.7, 0, 0);
          g.quadraticCurveTo(r * 0.6, r * 0.7, r * 1.2, 0);
          g.stroke(); break;
      }
      s.sprite = c;
      s.br = s.kind === "squiggle" ? r * 1.2 + 7 : r + 4;
    };

    const bakeEmoji = (e: PEmoji) => {
      const S = e.size;
      const { c, g } = makeSprite(S, S);
      g.translate(S / 2, S / 2);
      const r = S / 2;
      g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2);
      g.fillStyle = e.color; g.fill();
      const px = Math.round(S * 0.55);
      g.font = `${px}px ${EMOJI_FONT}`;
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText(e.char, 0, px * 0.05);
      e.sprite = c;
    };

    const bakeFaceBase = (f: PFace) => {
      const S = f.size, r = S / 2;
      const { c, g } = makeSprite(S, S);
      g.translate(r, r);
      g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2);
      g.fillStyle = f.color; g.fill();
      g.lineWidth = 3; g.strokeStyle = FACE_INK; g.stroke();
      f.sprBase = c;
    };
    const bakeFacePart = (f: PFace, draw: (g: CanvasRenderingContext2D, r: number, ex: number, eyeY: number) => void) => {
      const S = f.size, r = S / 2;
      const { c, g } = makeSprite(S, S);
      g.translate(r, r);
      g.strokeStyle = FACE_INK; g.fillStyle = FACE_INK;
      g.lineWidth = 2.5; g.lineCap = "round"; g.lineJoin = "round";
      draw(g, r, r * 0.30, -r * 0.12);
      return c;
    };
    const bakeFaceParts = (f: PFace) => {
      const heart = (g: CanvasRenderingContext2D, x: number, y: number, s: number) => {
        g.save(); g.translate(x, y); g.scale(s / 10, s / 10);
        g.beginPath();
        g.moveTo(0, 4);
        g.bezierCurveTo(-8, -4, -4, -10, 0, -4);
        g.bezierCurveTo(4, -10, 8, -4, 0, 4);
        g.fillStyle = COLORS.pink; g.fill();
        g.restore();
      };
      f.sprEyeOpen = bakeFacePart(f, (g, r, ex, eyeY) => {
        g.beginPath(); g.arc(-ex, eyeY, r * 0.10, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.arc(ex, eyeY, r * 0.10, 0, Math.PI * 2); g.fill();
      });
      f.sprEyeClosed = bakeFacePart(f, (g, r, ex, eyeY) => {
        const rr = r * 0.10;
        g.beginPath(); g.moveTo(-ex - rr, eyeY); g.lineTo(-ex + rr, eyeY); g.stroke();
        g.beginPath(); g.moveTo(ex - rr, eyeY); g.lineTo(ex + rr, eyeY); g.stroke();
      });
      f.sprEyeArc = bakeFacePart(f, (g, r, ex, eyeY) => {
        const rr = r * 0.16;
        g.beginPath(); g.arc(-ex, eyeY + rr * 0.4, rr, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
        g.beginPath(); g.arc(ex, eyeY + rr * 0.4, rr, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
      });
      f.sprEyeWide = bakeFacePart(f, (g, r, ex, eyeY) => {
        g.beginPath(); g.arc(-ex, eyeY, r * 0.14, 0, Math.PI * 2); g.stroke();
        g.beginPath(); g.arc(ex, eyeY, r * 0.14, 0, Math.PI * 2); g.stroke();
      });
      f.sprEyeHeart = bakeFacePart(f, (g, r, ex, eyeY) => {
        heart(g, -ex, eyeY, r * 0.16); heart(g, ex, eyeY, r * 0.16);
      });
      f.sprEyeX = bakeFacePart(f, (g, r, ex, eyeY) => {
        const o = r * 0.08;
        g.beginPath();
        g.moveTo(-ex - o, eyeY - o); g.lineTo(-ex + o, eyeY + o);
        g.moveTo(-ex + o, eyeY - o); g.lineTo(-ex - o, eyeY + o);
        g.moveTo(ex - o, eyeY - o); g.lineTo(ex + o, eyeY + o);
        g.moveTo(ex + o, eyeY - o); g.lineTo(ex - o, eyeY + o);
        g.stroke();
      });
      f.sprEyeWink = bakeFacePart(f, (g, r, ex, eyeY) => {
        g.beginPath(); g.arc(-ex, eyeY, r * 0.10, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.arc(ex, eyeY + r * 0.06, r * 0.12, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
      });
      f.sprEyeWinkBlink = bakeFacePart(f, (g, r, ex, eyeY) => {
        const rr = r * 0.10;
        g.beginPath(); g.moveTo(-ex - rr, eyeY); g.lineTo(-ex + rr, eyeY); g.stroke();
        g.beginPath(); g.arc(ex, eyeY + r * 0.06, r * 0.12, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
      });
      f.sprGlasses = bakeFacePart(f, (g, r, ex, eyeY) => {
        g.fillStyle = FACE_INK;
        g.beginPath(); g.roundRect(-ex - r * 0.16, eyeY - r * 0.13, r * 0.32, r * 0.24, r * 0.06); g.fill();
        g.beginPath(); g.roundRect(ex - r * 0.16, eyeY - r * 0.13, r * 0.32, r * 0.24, r * 0.06); g.fill();
        g.fillRect(-r * 0.08, eyeY - r * 0.03, r * 0.16, r * 0.05);
      });
      f.sprMouthSmile = bakeFacePart(f, (g, r) => {
        g.beginPath(); g.arc(0, r * 0.42 - r * 0.26 * 0.6, r * 0.36, Math.PI * 0.15, Math.PI * 0.85); g.stroke();
      });
      f.sprMouthSmileWide = bakeFacePart(f, (g, r) => {
        g.beginPath(); g.arc(0, r * 0.42 - r * 0.30 * 0.6, r * 0.42, Math.PI * 0.15, Math.PI * 0.85); g.stroke();
      });
      f.sprMouthOpen = bakeFacePart(f, (g, r) => {
        g.beginPath(); g.ellipse(0, r * 0.32, r * 0.20, r * 0.26, 0, 0, Math.PI * 2);
        g.fillStyle = FACE_INK; g.fill();
      });
      f.sprMouthO = bakeFacePart(f, (g, r) => {
        g.beginPath(); g.arc(0, r * 0.34, r * 0.13, 0, Math.PI * 2); g.stroke();
      });
      f.sprMouthSmirk = bakeFacePart(f, (g, r) => {
        g.beginPath(); g.arc(r * 0.10, r * 0.36, r * 0.22, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
      });
      f.sprMouthTongue = bakeFacePart(f, (g, r) => {
        g.fillStyle = COLORS.pink;
        g.beginPath(); g.roundRect(-r * 0.07, r * 0.30, r * 0.14, r * 0.20, r * 0.07); g.fill();
      });
      f.sprMouthTongueSilly = bakeFacePart(f, (g, r) => {
        g.fillStyle = COLORS.pink;
        g.beginPath(); g.roundRect(r * 0.02, r * 0.28, r * 0.16, r * 0.24, r * 0.08); g.fill();
      });
      f.sprMouthSleepy = bakeFacePart(f, (g, r) => {
        g.font = `${Math.round(r * 0.34)}px "Geist", sans-serif`;
        g.textAlign = "left"; g.textBaseline = "alphabetic";
        g.fillStyle = FACE_INK; g.fillText("z", r * 0.42, -r * 0.34);
        g.beginPath(); g.arc(0, r * 0.38, r * 0.10, 0, Math.PI); g.stroke();
      });
    };

    let sprSparkYellow: HTMLCanvasElement | null = null;
    let sprSparkPink: HTMLCanvasElement | null = null;
    const bakeSparkle = (color: string) => {
      const { c, g } = makeSprite(16, 16);
      g.translate(8, 8);
      g.fillStyle = color;
      const s = 8;
      g.beginPath();
      g.moveTo(0, -s); g.quadraticCurveTo(0, 0, s, 0); g.quadraticCurveTo(0, 0, 0, s);
      g.quadraticCurveTo(0, 0, -s, 0); g.quadraticCurveTo(0, 0, 0, -s);
      g.fill();
      return c;
    };

    const bakeAllSprites = () => {
      SPR_DPR = effDPR;
      tags.forEach(bakePill);
      shapes.forEach(bakeShape);
      emojis.forEach(bakeEmoji);
      faces.forEach((f) => { bakeFaceBase(f); bakeFaceParts(f); });
      sprSparkYellow = bakeSparkle(COLORS.yellow);
      sprSparkPink = bakeSparkle(COLORS.pink);
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
          br: size / 2,
          sprBase: null, sprEyeOpen: null, sprEyeClosed: null, sprEyeArc: null,
          sprEyeWide: null, sprEyeHeart: null, sprEyeX: null, sprEyeWink: null,
          sprEyeWinkBlink: null, sprGlasses: null, sprMouthSmile: null,
          sprMouthSmileWide: null,
          sprMouthOpen: null, sprMouthO: null, sprMouthSmirk: null,
          sprMouthTongue: null, sprMouthTongueSilly: null, sprMouthSleepy: null,
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

    /* body registries: every dynamic body + face/emoji lookups (no per-frame alloc) */
    const physBodies: Matter.Body[] = [];
    const bodyToFace = new Map<Matter.Body, PFace>();
    const bodyToEmoji = new Map<Matter.Body, PEmoji>();

    const spawnBody = (x: number, y: number, w: number, h: number, circleR: number | null) => {
      const body = circleR !== null
        ? Matter.Bodies.circle(x, y, circleR, DROP_OPTS)
        : Matter.Bodies.rectangle(x, y, w, h, { chamfer: { radius: h / 2 }, ...DROP_OPTS });
      Matter.Body.setAngle(body, (Math.random() - 0.5) * 0.6);
      Matter.Body.setVelocity(body, { x: (Math.random() - 0.5) * 3, y: 8 + Math.random() * 6 });
      Matter.Sleeping.set(body, false);
      Matter.Composite.add(engine.world, body);
      physBodies.push(body);
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
      physBodies.push(body);
    };
    /* PART B: emoji sticker spawn (circle collider) */
    const spawnEmoji = (i: number, x: number, y: number) => {
      const e = emojis[i];
      const body = spawnBody(x, y, 0, 0, e.size / 2);
      e.body = body; e.dx = x; e.dy = y; e.da = body.angle;
      e.squashMs = 140; // spawn squash (was set when speed>6 on early frames)
      bodyToEmoji.set(body, e);
    };
    /* PART C: cartoon face spawn (circle collider) */
    const spawnFace = (i: number, x: number, y: number) => {
      const f = faces[i];
      const body = spawnBody(x, y, 0, 0, f.size / 2);
      f.body = body; f.dx = x; f.dy = y; f.da = body.angle;
      f.squashMs = 140; // spawn squash (was set when speed>6 on early frames)
      bodyToFace.set(body, f);
    };

    /* one collision listener for landing squash (was a per-frame speed check) */
    Matter.Events.on(engine, "collisionStart", (ev) => {
      const pairs = ev.pairs;
      for (let i = 0; i < pairs.length; i++) {
        const pa = pairs[i];
        const ax = pa.bodyA.velocity.x - pa.bodyB.velocity.x;
        const ay = pa.bodyA.velocity.y - pa.bodyB.velocity.y;
        if (ax * ax + ay * ay < 36) continue; // relative speed < 6
        const fa = bodyToFace.get(pa.bodyA);
        if (fa && fa.squashMs <= 0) fa.squashMs = 140;
        const fb = bodyToFace.get(pa.bodyB);
        if (fb && fb.squashMs <= 0) fb.squashMs = 140;
        const ea = bodyToEmoji.get(pa.bodyA);
        if (ea && ea.squashMs <= 0) ea.squashMs = 140;
        const eb = bodyToEmoji.get(pa.bodyB);
        if (eb && eb.squashMs <= 0) eb.squashMs = 140;
      }
    });

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
      document.fonts.ready.then(() => { if (ready) bakeAllSprites(); }).catch(() => {});
      Promise.all(loads).catch(() => {}).finally(() => {
        if (reduceMotion) { drawSettled(); return; }
        measureAndBuild();
        bakeAllSprites();
      });
      window.setTimeout(() => { if (!ready && !reduceMotion) { measureAndBuild(); bakeAllSprites(); } }, 2500);
    };

    /* ── Mouse: drag/throw via MouseConstraint, cursor push manual ── */
    const mouse = Matter.Mouse.create(section);
    const syncMouse = (r?: DOMRect) => {
      const rect = r ?? section.getBoundingClientRect();
      Matter.Mouse.setOffset(mouse, { x: -rect.left, y: -rect.top });
      Matter.Mouse.setScale(mouse, { x: 1, y: 1 });
      mouse.pixelRatio = effDPR;
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
    let lastMove = 0, lastPointerMove = 0, hoverDirty = false;
    let rectCache = section.getBoundingClientRect();
    const updateRectCache = () => { rectCache = section.getBoundingClientRect(); };
    const onMove = (e: PointerEvent) => {
      const now = performance.now();
      if (now - lastMove < 16) return;
      lastMove = now;
      lastPointerMove = now;
      // cached rect (refreshed on resize / scroll-end / enter-viewport) — no layout here
      const r = rectCache;
      const sx = section.clientWidth / r.width;
      const sy = section.clientHeight / r.height;
      cursor.tx = (e.clientX - r.left) * sx;
      cursor.ty = (e.clientY - r.top) * sy;
      cursor.active = true;
      hoverDirty = true; // hover query runs once next frame, not every frame
      if (idle) startLoop(); // wake from idle
    };
    const onLeave = () => { cursor.active = false; cursor.x = -9999; cursor.y = -9999; };
    const onDown = (e: PointerEvent) => {
      if (idle) startLoop();
      lastPointerMove = performance.now();
      hoverDirty = true;
      const r = rectCache;
      const sx = section.clientWidth / r.width;
      const sy = section.clientHeight / r.height;
      const cx = (e.clientX - r.left) * sx, cy = (e.clientY - r.top) * sy;
      const found = Matter.Query.point(physBodies, { x: cx, y: cy })[0];
      if (found) {
        Matter.Body.applyForce(found, found.position, { x: 0, y: -0.004 });
        // PART C: face click → boing + sparkles; emoji → boing
        const fc = bodyToFace.get(found);
        if (fc) { fc.boingMs = 600; spawnSparkles(fc); }
        const em = bodyToEmoji.get(found);
        if (em) { em.boingMs = 600; spawnSparkles(em); }
      } else {
        const SHOCK_R = 220, SHOCK_R2 = SHOCK_R * SHOCK_R;
        for (let i = 0; i < physBodies.length; i++) {
          const b = physBodies[i];
          const dx = b.position.x - cx, dy = b.position.y - cy;
          const d2 = dx * dx + dy * dy;
          if (d2 > SHOCK_R2) continue;
          const dist = Math.max(Math.sqrt(d2), 1);
          const f = Math.min(0.005 * b.mass * (1 - dist / SHOCK_R), 0.02 * b.mass);
          Matter.Body.applyForce(b, b.position, { x: (dx / dist) * f, y: (dy / dist) * f - f * 0.35 });
        }
      }
    };
    const onUp = () => { hoverDirty = true; if (idle) startLoop(); };
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

    /* ── Draw helpers (sprite-based: one drawImage per body, setTransform
       instead of save/translate/rotate/restore; no per-frame path work) ── */
    // device-px transform: translate(dx,dy) · rotate(da) · scale(sx,sy)
    const bodyTransform = (dx: number, dy: number, da: number, sx: number, sy: number) => {
      const cos = Math.cos(da), sin = Math.sin(da);
      ctx.setTransform(
        effDPR * cos * sx, effDPR * sin * sx,
        effDPR * -sin * sy, effDPR * cos * sy,
        effDPR * dx, effDPR * dy
      );
    };
    const offscreen = (x: number, y: number, br: number) =>
      x + br < 0 || x - br > W || y + br < 0 || y - br > H;

    const drawPill = (t: PTag) => {
      if (!t.sprite || offscreen(t.dx, t.dy, t.br)) return;
      const sc = 1 + 0.06 * t.hoverT;
      bodyTransform(t.dx, t.dy, t.da, sc, sc);
      ctx.drawImage(t.sprite, -t.w / 2, -t.h / 2, t.w, t.h);
    };

    const drawShape = (s: PShape) => {
      if (!s.sprite || offscreen(s.dx, s.dy, s.br)) return;
      const sc = 1 + 0.06 * s.hoverT;
      const S = s.sprite.width / SPR_DPR;
      bodyTransform(s.dx, s.dy, s.da, sc, sc);
      ctx.drawImage(s.sprite, -S / 2, -S / 2, S, S);
    };

    /* PART B: draw emoji sticker (baked disc + glyph sprite) */
    const drawEmoji = (e: PEmoji) => {
      if (!e.sprite || offscreen(e.dx, e.dy, e.br)) return;
      // squash + boing scale (draw-time only, collider unchanged)
      let sx = 1, sy = 1;
      if (e.squashMs > 0) { sx = 1.15; sy = 0.85; }
      if (e.boingMs > 0) { const k = e.boingMs / 600; const s = 1 + 0.2 * Math.sin(k * Math.PI); sx *= s; sy *= s; }
      if (e.hoverT > 0.01) { const s = 1 + 0.06 * e.hoverT; sx *= s; sy *= s; }
      const r = e.size / 2;
      bodyTransform(e.dx, e.dy, e.da, sx, sy);
      ctx.drawImage(e.sprite, -r, -r, e.size, e.size);
      drawSparkles(e);
    };

    /* PART C: draw cartoon face — sprite-based (base + eye/mouth parts) */
    const drawFace = (f: PFace, now: number) => {
      const r = f.size / 2;
      if (!f.sprBase || offscreen(f.dx, f.dy, f.br)) return;
      let sx = 1, sy = 1;
      if (f.squashMs > 0) { sx = 1.15; sy = 0.85; }
      if (f.boingMs > 0) { const k = f.boingMs / 600; const s = 1 + 0.2 * Math.sin(k * Math.PI); sx *= s; sy *= s; }
      if (f.hoverT > 0.01) { const s = 1 + 0.06 * f.hoverT; sx *= s; sy *= s; }

      const mood = f.cur;
      const laughing = f.laughUntil > now;
      const blinking = f.blinkMs > 0;
      let eyeSpr: HTMLCanvasElement | null, mouthSpr: HTMLCanvasElement | null;
      if (laughing) {
        eyeSpr = f.sprEyeArc; mouthSpr = f.sprMouthOpen;
      } else switch (mood) {
        case "happy":
          eyeSpr = blinking ? f.sprEyeClosed : f.sprEyeOpen;
          mouthSpr = f.sprMouthSmileWide; break;
        case "laughing":
          eyeSpr = f.sprEyeArc; mouthSpr = f.sprMouthOpen; break;
        case "surprised":
          eyeSpr = f.sprEyeWide; mouthSpr = f.sprMouthO; break;
        case "cool":
          eyeSpr = f.sprGlasses; mouthSpr = f.sprMouthSmirk; break;
        case "love":
          eyeSpr = f.sprEyeHeart; mouthSpr = f.sprMouthSmile; break;
        case "sleepy":
          eyeSpr = f.sprEyeClosed; mouthSpr = f.sprMouthSleepy; break;
        case "wink":
          eyeSpr = blinking ? f.sprEyeWinkBlink : f.sprEyeWink;
          mouthSpr = f.sprMouthTongue; break;
        default: // "silly"
          eyeSpr = f.sprEyeX; mouthSpr = f.sprMouthTongueSilly; break;
      }

      // cursor look offset (≤3px), as before — only for dot/circle eyes
      let lx = 0, ly = 0;
      if ((eyeSpr === f.sprEyeOpen || eyeSpr === f.sprEyeWide || eyeSpr === f.sprEyeWink) && cursor.active) {
        const dx = cursor.x - f.dx, dy = cursor.y - f.dy;
        const d2 = dx * dx + dy * dy;
        if (d2 < 48400 && d2 > 1) {
          const d = Math.sqrt(d2);
          lx = (dx / d) * 3; ly = (dy / d) * 3;
        }
      }

      bodyTransform(f.dx, f.dy, f.da, sx, sy);
      ctx.drawImage(f.sprBase, -r, -r, f.size, f.size);
      if (eyeSpr) ctx.drawImage(eyeSpr, -r + lx, -r + ly, f.size, f.size);
      if (mouthSpr) ctx.drawImage(mouthSpr, -r, -r, f.size, f.size);
      drawSparkles(f);
    };
    const drawSparkles = (it: PFace | PEmoji) => {
      const n = it.sparkles.length;
      if (n === 0) return;
      for (let i = 0; i < n; i++) {
        const p = it.sparkles[i];
        const a = p.life / 600;
        if (a <= 0) continue;
        const sz = 10 * a + 6;
        ctx.globalAlpha = a < 1 ? a : 1;
        ctx.setTransform(effDPR, 0, 0, effDPR, effDPR * p.x, effDPR * p.y);
        const spr = p.color === COLORS.yellow ? sprSparkYellow : sprSparkPink;
        if (spr) ctx.drawImage(spr, -sz / 2, -sz / 2, sz, sz);
      }
      ctx.globalAlpha = 1;
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
      bakeAllSprites();
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

    /* ── THE single rAF loop (registered on the shared page scheduler) ── */
    let loopOn = false, lastT = 0;
    let hoverBody: Matter.Body | null = null;
    let accumulator = 0;
    let fastForwardSteps = 0;
    let sectionInView = true;
    // idle mode: stop physics+draw when nothing moves; keep the last frame
    let idle = false;
    let idleWakeT = 0;
    let lastNudge = 0;
    let lastDebug = 0, debugFrames = 0; // DEBUG (temporary): 2s log

    // lerp helper (defined once — no closure created per frame)
    const lerpItem = (it: { body: Matter.Body | null; dx: number; dy: number; da: number }) => {
      const b = it.body;
      if (!b) return;
      it.dx += (b.position.x - it.dx) * 0.5;
      it.dy += (b.position.y - it.dy) * 0.5;
      let diff = b.angle - it.da;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      it.da += diff * 0.5;
    };
    const syncDrawState = () => {
      // snap drawn state to physics state (fast-forward catch-up)
      for (let i = 0; i < tags.length; i++) { const t = tags[i]; if (t.body) { t.dx = t.body.position.x; t.dy = t.body.position.y; t.da = t.body.angle; } }
      for (let i = 0; i < shapes.length; i++) { const x = shapes[i]; if (x.body) { x.dx = x.body.position.x; x.dy = x.body.position.y; x.da = x.body.angle; } }
      for (let i = 0; i < emojis.length; i++) { const e = emojis[i]; if (e.body) { e.dx = e.body.position.x; e.dy = e.body.position.y; e.da = e.body.angle; } }
      for (let i = 0; i < faces.length; i++) { const f = faces[i]; if (f.body) { f.dx = f.body.position.x; f.dy = f.body.position.y; f.da = f.body.angle; } }
    };

    const checkIdle = (now: number) => {
      if (!hasDropped || physBodies.length === 0) return false;
      if (now - lastPointerMove < 2000) return false; // pointer moved recently
      const mc = mouseConstraint as unknown as { constraint: { bodyB: Matter.Body | null } };
      if (mc.constraint.bodyB) return false; // dragging
      let sum = 0;
      for (let i = 0; i < physBodies.length; i++) sum += physBodies[i].speed;
      if (sum / physBodies.length >= 0.1) return false; // still moving
      for (let i = 0; i < faces.length; i++) {
        const f = faces[i];
        if (!f.body) continue;
        if (f.blinkMs > 0 || f.squashMs > 0 || f.boingMs > 0 || f.sparkles.length > 0) return false;
        if (f.curUntil > now || f.laughUntil > now) return false;
        if (f.hoverT > 0.01) return false;
      }
      for (let i = 0; i < emojis.length; i++) {
        const e = emojis[i];
        if (!e.body) continue;
        if (e.squashMs > 0 || e.boingMs > 0 || e.sparkles.length > 0) return false;
        if (e.hoverT > 0.01) return false;
      }
      for (let i = 0; i < tags.length; i++) if (tags[i].body && tags[i].hoverT > 0.01) return false;
      for (let i = 0; i < shapes.length; i++) if (shapes[i].body && shapes[i].hoverT > 0.01) return false;
      return true;
    };

    const enterIdle = (now: number) => {
      idle = true;
      stopLoop(); // unregisters from __raf; the last frame stays on the canvas
      // wake for the earliest scheduled thing: nudge (3s), blink, wiggle, mood
      let wakeIn = 3000;
      for (let i = 0; i < faces.length; i++) {
        const f = faces[i];
        if (!f.body) continue;
        if (f.blinkAt > now) wakeIn = Math.min(wakeIn, f.blinkAt - now);
        if (f.wiggleAt > now) wakeIn = Math.min(wakeIn, f.wiggleAt - now);
        if (f.curUntil > now) wakeIn = Math.min(wakeIn, f.curUntil - now);
        if (f.laughUntil > now) wakeIn = Math.min(wakeIn, f.laughUntil - now);
      }
      if (idleWakeT) window.clearTimeout(idleWakeT);
      idleWakeT = window.setTimeout(() => { idleWakeT = 0; startLoop(); }, Math.max(wakeIn, 60));
    };

    const startLoop = () => {
      if (loopOn || !ready || !sectionInView || document.hidden) return;
      loopOn = true;
      idle = false;
      if (idleWakeT) { window.clearTimeout(idleWakeT); idleWakeT = 0; }
      lastT = performance.now();
      lastNudge = lastT;
      window.__raf.add(loopCb);
    };
    const stopLoop = () => {
      loopOn = false;
      window.__raf.remove(loopCb);
    };

    const loopCb = (now: number) => {
      if (!loopOn) return;
      let delta = now - lastT;
      lastT = now;
      // During active scroll: keep full speed (no slow-motion, no freeze)
      // but lighten the physics solver so scrolling stays fluid.
      if (isScrolling) {
        engine.positionIterations = 2;
        engine.velocityIterations = 1;
      } else {
        engine.positionIterations = 6;
        engine.velocityIterations = 4;
      }
      syncMouse(rectCache); // cached rect — no getBoundingClientRect in the loop
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

      /* PART C: per-frame face + emoji animation state (no allocations) */
      for (let fi = 0; fi < faces.length; fi++) {
        const f = faces[fi];
        if (!f.body) continue;
        // blink
        if (f.blinkMs > 0) f.blinkMs -= delta;
        else if (now >= f.blinkAt && (f.mood === "happy" || f.mood === "surprised")) {
          f.blinkMs = 120; f.blinkAt = now + 3000 + Math.random() * 3000;
        }
        // temp mood expiry
        if (f.curUntil && now > f.curUntil) { f.cur = f.mood; f.curUntil = 0; }
        // squash / boing decay (landing squash now comes from collisionStart)
        if (f.squashMs > 0) f.squashMs -= delta;
        if (f.boingMs > 0) f.boingMs -= delta;
        // idle wiggle: tiny angular impulse + blink-smile
        if (now >= f.wiggleAt) {
          f.wiggleAt = now + 4000 + Math.random() * 4000;
          Matter.Body.setAngularVelocity(f.body, f.body.angularVelocity + (Math.random() - 0.5) * 0.15);
          if (f.mood === "happy") f.blinkMs = 120;
        }
        // sparkles
        for (let i = f.sparkles.length - 1; i >= 0; i--) {
          const p = f.sparkles[i];
          p.life -= delta;
          p.x += p.vx; p.y += p.vy; p.vy += 0.05;
          if (p.life <= 0) f.sparkles.splice(i, 1);
        }
      }
      for (let ei = 0; ei < emojis.length; ei++) {
        const e = emojis[ei];
        if (e.squashMs > 0) e.squashMs -= delta;
        if (e.boingMs > 0) e.boingMs -= delta;
        for (let i = e.sparkles.length - 1; i >= 0; i--) {
          const p = e.sparkles[i];
          p.life -= delta;
          p.x += p.vx; p.y += p.vy; p.vy += 0.05;
          if (p.life <= 0) e.sparkles.splice(i, 1);
        }
      }

      // smooth visuals: lerp drawn state toward physics state
      for (let i = 0; i < tags.length; i++) lerpItem(tags[i]);
      for (let i = 0; i < shapes.length; i++) lerpItem(shapes[i]);
      for (let i = 0; i < emojis.length; i++) lerpItem(emojis[i]);
      for (let i = 0; i < faces.length; i++) lerpItem(faces[i]);

      // cursor hover-push (squared distances — no sqrt for far bodies; same force)
      if (cursor.active) {
        if (cursor.x < -9000) { cursor.x = cursor.tx; cursor.y = cursor.ty; }
        cursor.px = cursor.x; cursor.py = cursor.y;
        cursor.x += (cursor.tx - cursor.x) * 0.25;
        cursor.y += (cursor.ty - cursor.y) * 0.25;
        cursor.vx = cursor.x - cursor.px;
        cursor.vy = cursor.y - cursor.py;
        const speed = Math.hypot(cursor.vx, cursor.vy);
        const PUSH_R = 150, PUSH_R2 = PUSH_R * PUSH_R;
        const speedFactor = 0.25 + (Math.min(speed, 28) / 28) * 0.75;
        const invSpeed = 1 / Math.max(speed, 1);
        for (let bi = 0; bi < physBodies.length; bi++) {
          const b = physBodies[bi];
          const dx = b.position.x - cursor.x, dy = b.position.y - cursor.y;
          const d2 = dx * dx + dy * dy;
          if (d2 > PUSH_R2 || d2 < 1) continue;
          const dist = Math.sqrt(d2);
          const falloff = 1 - dist / PUSH_R;
          const f = Math.min(0.004 * b.mass * falloff * speedFactor, 0.004 * b.mass);
          Matter.Body.applyForce(b, b.position, {
            x: (dx / dist) * f + cursor.vx * invSpeed * f * 0.7,
            y: (dy / dist) * f + cursor.vy * invSpeed * f * 0.7 - f * 0.2,
          });
          b.torque += (Math.random() - 0.5) * 0.0004 * falloff;
          // PART C: face near cursor → surprised mouth 400ms
          if (d2 < 19600) {
            const fc = bodyToFace.get(b);
            if (fc && fc.cur === fc.mood) {
              fc.cur = "surprised"; fc.curUntil = now + 400;
            }
          }
        }
      }

      // hover detection: only when the pointer moved (flag), not every frame
      if (hoverDirty) {
        hoverDirty = false;
        hoverBody = cursor.active
          ? (Matter.Query.point(physBodies, { x: cursor.x, y: cursor.y })[0] || null)
          : null;
        const dragging = (mouseConstraint as unknown as { constraint: { bodyB: Matter.Body | null } }).constraint.bodyB;
        for (let fi = 0; fi < faces.length; fi++) {
          faces[fi].grabbed = dragging !== null && dragging === faces[fi].body;
        }
        section.style.cursor = dragging ? "grabbing" : hoverBody ? "grab" : "";
      }
      if (!cursor.active) {
        hoverBody = null;
        section.style.cursor = "";
        for (let fi = 0; fi < faces.length; fi++) {
          const f = faces[fi];
          if (f.grabbed) { f.grabbed = false; f.laughUntil = now + 600; }
        }
      }
      for (let i = 0; i < tags.length; i++) {
        const t = tags[i];
        const target = t.body === hoverBody ? 1 : 0;
        t.hoverT += (target - t.hoverT) * 0.25;
      }
      for (let i = 0; i < shapes.length; i++) {
        const x = shapes[i];
        const target = x.body === hoverBody ? 1 : 0;
        x.hoverT += (target - x.hoverT) * 0.25;
      }
      for (let i = 0; i < emojis.length; i++) {
        const e = emojis[i];
        const target = e.body === hoverBody ? 1 : 0;
        e.hoverT += (target - e.hoverT) * 0.25;
      }
      for (let i = 0; i < faces.length; i++) {
        const f = faces[i];
        const target = f.body === hoverBody ? 1 : 0;
        f.hoverT += (target - f.hoverT) * 0.25;
      }

      // angular damping + upright settle
      for (let bi = 0; bi < physBodies.length; bi++) {
        const b = physBodies[bi];
        if (Math.abs(b.angularVelocity) > 0.25) {
          Matter.Body.setAngularVelocity(b, b.angularVelocity * 0.97);
        } else if (Math.abs(b.velocity.x) < 0.35 && Math.abs(b.velocity.y) < 0.35) {
          const twoPi = Math.PI * 2;
          let a = ((b.angle % twoPi) + twoPi) % twoPi;
          if (a > Math.PI) a -= twoPi;
          Matter.Body.setAngle(b, b.angle - a * 0.02);
        }
      }

      // draw: opaque bg fill (no clearRect), then one drawImage per body
      ctx.setTransform(effDPR, 0, 0, effDPR, 0, 0);
      ctx.fillStyle = COLORS.bg;
      ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < shapes.length; i++) { const x = shapes[i]; if (x.body) drawShape(x); }
      for (let i = 0; i < emojis.length; i++) { const e = emojis[i]; if (e.body) drawEmoji(e); }
      for (let i = 0; i < faces.length; i++) { const f = faces[i]; if (f.body) drawFace(f, now); }
      for (let i = 0; i < tags.length; i++) { const t = tags[i]; if (t.body) drawPill(t); }

      // PART C: grab → laughing temp mood
      for (let fi = 0; fi < faces.length; fi++) {
        const f = faces[fi];
        if (f.grabbed && f.cur === f.mood) { f.cur = "laughing"; f.curUntil = now + 200; }
      }

      // idle nudge (was a 3s setInterval — now a timestamp check in the loop)
      if (now - lastNudge > 3000 && !document.hidden && physBodies.length > 0) {
        lastNudge = now;
        const b = physBodies[(Math.random() * physBodies.length) | 0];
        Matter.Body.applyForce(b, b.position, { x: (Math.random() - 0.5) * 0.0006, y: -Math.random() * 0.0007 });
      }

      // DEBUG (temporary): every 2s — fps, body count (must not change), idle on/off
      debugFrames++;
      if (now - lastDebug > 2000) {
        const fps = Math.round((debugFrames * 1000) / Math.max(now - lastDebug, 1));
        console.log("[tags] fps", fps, "bodies", physBodies.length, "idle", idle ? "on" : "off");
        lastDebug = now;
        debugFrames = 0;
      }

      // idle: stop physics+draw when nothing moves; the last frame stays
      if (checkIdle(now)) enterIdle(now);
    };

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
          sectionInView = entry.isIntersecting;
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
            updateRectCache();
            if (!was && hasDropped && fastForwardSteps === 0 && performance.now() - dropStart < 4000) {
              fastForwardSteps = 90;
            }
          }
        });
      },
      { threshold: 0 }
    );

    let lastW = W, lastH = H, resizeT = 0;
    // During active scroll: run at half frame-rate to keep scrolling smooth.
    // Tags keep moving (no jarring freeze), just lighter on CPU.
    let scrollHoldT = 0, isScrolling = false;
    const onScrollHold = () => {
      isScrolling = true;
      window.clearTimeout(scrollHoldT);
      scrollHoldT = window.setTimeout(() => { isScrolling = false; updateRectCache(); }, 160);
    };
    const onResize = () => {
      window.clearTimeout(resizeT);
      resizeT = window.setTimeout(() => {
        const newW = section.clientWidth, newH = section.clientHeight;
        if (newW === lastW && Math.abs(newH - lastH) < 120) return;
        lastW = newW; lastH = newH;
        const oldDPR = effDPR;
        resizeCanvas();
        if (effDPR !== oldDPR) bakeAllSprites(); // re-bake at the new DPR
        updateRectCache();
        if (idle) startLoop(); // layout changed — wake
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
        updateRectCache();
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
      updateRectCache();
      section.addEventListener("pointermove", onMove);
      section.addEventListener("pointerleave", onLeave);
      section.addEventListener("pointerdown", onDown);
      section.addEventListener("pointerup", onUp);
      section.addEventListener("touchstart", onUp, { passive: true });
      window.addEventListener("resize", onResize);
      window.addEventListener("scroll", onScrollHold, { passive: true });
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
      window.clearTimeout(resizeT);
      window.clearTimeout(idleWakeT);
      dropObserver.disconnect();
      loopObserver.disconnect();
      visibleObserver.disconnect();
      section.removeEventListener("pointermove", onMove);
      section.removeEventListener("pointerleave", onLeave);
      section.removeEventListener("pointerdown", onDown);
      section.removeEventListener("pointerup", onUp);
      section.removeEventListener("touchstart", onUp);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScrollHold);
      window.clearTimeout(scrollHoldT);
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
          contain: layout paint size;
        }
        .physics-tags-section canvas {
          position: absolute;
          inset: 0;
          display: block;
          transform: translateZ(0);
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
