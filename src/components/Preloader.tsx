import { useEffect, useRef } from "react";
import portrait from "@/imports/pasted_text/preloader-portrait.webp";

// ─── Tuning knobs ────────────────────────────────────────────────────────────
const CARD_COUNT  = 10;
const RING_RADIUS = 34;   // vmin — radius of the 3D ring
const CARD_W      = 13;   // vmin
const CARD_H      = 17;   // vmin
const RING_TILT   = -12;  // deg — rotateX lean for 3D depth feel

const ENTER_MS    = 700;  // ms — fade/scale in
const SPIN_MS     = 3000; // ms — slow 3D rotation window
const BLAST_MS    = 850;  // ms — cards explode outward
const FADE_TAIL   = 120;  // ms — extra delay after blast before onDone

const SPIN_DEG    = 300;  // deg — gentle < full turn
const BLAST_DIST  = 70;   // vmin — how far cards fly on blast
// ─────────────────────────────────────────────────────────────────────────────

const clamp01      = (x: number) => Math.min(1, Math.max(0, x));
const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3);
const easeInOutSine = (x: number) => -(Math.cos(Math.PI * x) - 1) / 2;
const easeInCubic  = (x: number) => x * x * x;

export default function Preloader({ onDone }: { onDone: () => void }) {
  const rootRef  = useRef<HTMLDivElement>(null);
  const ringRef  = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const root = rootRef.current;
    const ring = ringRef.current;

    // Respect reduced-motion preference
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const t = window.setTimeout(onDone, 600);
      return () => window.clearTimeout(t);
    }

    let raf   = 0;
    let start = 0;
    let done  = false;

    // 1 vmin in px — needed for 3D translateZ (CSS 3D doesn't accept vmin)
    const vmin = () => Math.min(window.innerWidth, window.innerHeight) / 100;

    const frame = (now: number) => {
      if (!start) start = now;
      const t = now - start;
      const u = vmin();

      // ── Phase 1: enter ────────────────────────────────────────────────────
      const enter     = easeOutCubic(clamp01(t / ENTER_MS));
      const ringScale = 0.82 + 0.18 * enter;

      // ── Phase 2: slow 3D rotation ─────────────────────────────────────────
      const spinP = clamp01(t / SPIN_MS);
      const rot   = SPIN_DEG * easeInOutSine(spinP);

      // ── Phase 3: blast ────────────────────────────────────────────────────
      const bp    = clamp01((t - SPIN_MS) / BLAST_MS);
      const bEase = easeInCubic(bp);

      // Ring container: 3D tilt + Y-rotation + enter scale
      if (ring) {
        ring.style.transform =
          `translate(-50%, -50%) rotateX(${RING_TILT}deg) rotateY(${rot}deg) scale(${ringScale})`;
      }

      const baseR = RING_RADIUS * u;
      const blast = bEase * BLAST_DIST * u;

      for (let i = 0; i < CARD_COUNT; i++) {
        const node = cardRefs.current[i];
        if (!node) continue;
        const angle = (i / CARD_COUNT) * 360;
        const z     = baseR + blast;
        const s     = enter * (1 + bEase * 0.55);
        // Each card sits on the ring via rotateY + translateZ; scale adds pop on blast
        node.style.transform = `rotateY(${angle}deg) translateZ(${z}px) scale(${s})`;
        node.style.opacity   = String(enter * (1 - bp));
      }

      // Fade the whole overlay out during blast
      if (root) root.style.opacity = String(1 - clamp01(bp * 1.05));

      if (t >= SPIN_MS + BLAST_MS) {
        if (!done) {
          done = true;
          window.setTimeout(onDone, FADE_TAIL);
        }
        return;
      }
      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [onDone]);

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "#000",
        overflow: "hidden",
        // perspective on this container creates the 3D depth (front = bigger, back = smaller)
        perspective: "1100px",
        willChange: "opacity",
      }}
    >
      <div
        ref={ringRef}
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: 0,
          height: 0,
          transformStyle: "preserve-3d",
          transform: `translate(-50%, -50%) rotateX(${RING_TILT}deg) scale(0.82)`,
          willChange: "transform",
        }}
      >
        {Array.from({ length: CARD_COUNT }, (_, i) => (
          <div
            key={i}
            ref={(el) => { cardRefs.current[i] = el; }}
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: `${CARD_W}vmin`,
              height: `${CARD_H}vmin`,
              marginLeft: `${-CARD_W / 2}vmin`,
              marginTop: `${-CARD_H / 2}vmin`,
              borderRadius: "12px",
              overflow: "hidden",
              opacity: 0,
              // Initial per-card 3D placement — JS updates translateZ in px each frame
              transform: `rotateY(${(i / CARD_COUNT) * 360}deg) translateZ(0px)`,
              transformStyle: "preserve-3d",
              backfaceVisibility: "hidden",
              boxShadow:
                "0 14px 48px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(255,255,255,0.10)",
            }}
          >
            <img
              src={portrait}
              alt=""
              draggable={false}
              decoding="async"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
                userSelect: "none",
                pointerEvents: "none",
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
