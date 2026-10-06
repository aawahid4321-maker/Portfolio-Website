import { useEffect, useRef } from "react";

/* ── Colors (CSS variables, easy to change) ────────────────────────────── */
const CSS_VARS = {
  "--lc-bg": "#ececec",
  "--lc-heading": "#111111",
  "--lc-text": "#111111",
  "--lc-pink": "#ff0a8a",
  "--lc-blue": "#1a1aff",
  "--lc-black": "#16181a",
  "--lc-white": "#f4f4f2",
  "--lc-orange": "#ff5a00",
  "--lc-amber": "#ff9f0a",
  "--lc-yellow": "#ffd60a",
} as React.CSSProperties;

/* Blob character definitions: [x, y, w, h, rx, color, eyeY, armSide] */
const BLOBS = [
  { x: 390, y: 60,  w: 120, h: 460, rx: 60, c: "var(--lc-pink)",   eyeY: 170, arm: null },    // pink, back tall
  { x: 225, y: 165, w: 112, h: 355, rx: 56, c: "var(--lc-blue)",   eyeY: 270, arm: "right" }, // blue, left
  { x: 563, y: 145, w: 112, h: 375, rx: 56, c: "var(--lc-black)",  eyeY: 255, arm: null, eyes: "#7dd8f0" }, // black, right (light blue eyes)
  { x: 375, y: 255, w: 150, h: 265, rx: 70, c: "var(--lc-white)",  eyeY: 360, arm: null },    // white, center
  { x: 145, y: 325, w: 122, h: 195, rx: 60, c: "var(--lc-orange)", eyeY: 410, arm: "right" }, // orange, front-left
  { x: 628, y: 335, w: 112, h: 185, rx: 56, c: "var(--lc-amber)",  eyeY: 415, arm: null },    // amber, front-right
  { x: 475, y: 405, w: 135, h: 115, rx: 57, c: "var(--lc-yellow)", eyeY: 455, arm: null },    // yellow, front-center small
];

export default function LetsConnect() {
  const sectionRef = useRef<HTMLElement>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || startedRef.current) return;
    startedRef.current = true;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const blobs = Array.from(section.querySelectorAll<SVGGElement>(".lc-blob"));
    if (reduceMotion) {
      section.classList.add("is-visible");
      return;
    }

    /* ── Entrance: trigger once at ~30% visible ─────────────────────────── */
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.3) {
            section.classList.add("is-visible");
            io.disconnect();
          }
        });
      },
      { threshold: [0, 0.3, 0.6, 1] }
    );
    io.observe(section);

    /* ── Pause idle animations off-screen ──────────────────────────────── */
    const pauseIO = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          section.classList.toggle("is-paused", !entry.isIntersecting);
        });
      },
      { threshold: 0 }
    );
    pauseIO.observe(section);

    /* ── Blinking: random 3–6s per character ────────────────────────────── */
    const blinkTimers: number[] = [];
    blobs.forEach((blob) => {
      const eyes = blob.querySelector(".lc-eyes");
      if (!eyes) return;
      const schedule = () => {
        blinkTimers.push(
          window.setTimeout(() => {
            eyes.classList.add("is-blinking");
            window.setTimeout(() => eyes.classList.remove("is-blinking"), 180);
            schedule();
          }, 3000 + Math.random() * 3000)
        );
      };
      schedule();
    });

    /* ── Eyes follow cursor (skip on touch) ────────────────────────────── */
    const isTouch = window.matchMedia("(pointer: coarse)").matches;
    const onMouseMove = (e: MouseEvent) => {
      if (isTouch) return;
      const r = section.getBoundingClientRect();
      const mx = e.clientX - r.left;
      const my = e.clientY - r.top;
      blobs.forEach((blob) => {
        const eyes = blob.querySelector<SVGGElement>(".lc-eyes");
        if (!eyes) return;
        const br = (blob as unknown as SVGGraphicsElement).getBoundingClientRect?.();
        // use blob center in section coords via its transform-free bbox
        const cx = Number(blob.dataset.cx || 0);
        const cy = Number(blob.dataset.cy || 0);
        const dx = mx - (r.left * 0 + cx * (r.width / 900));
        const dy = my - (cy * (r.height / 520));
        void br;
        const len = Math.max(Math.hypot(dx, dy), 1);
        const shift = 4; // max 4px
        eyes.style.transform = `translate(${(dx / len) * Math.min(shift, len / 40)}px, ${(dy / len) * Math.min(shift, len / 40)}px)`;
      });
    };
    if (!isTouch) window.addEventListener("mousemove", onMouseMove);

    /* ── Hover: jump + happy eyes; Click: wiggle ────────────────────────── */
    blobs.forEach((blob) => {
      blob.addEventListener("mouseenter", () => {
        blob.classList.add("is-happy");
        // neighbors nudge away slightly
        blobs.forEach((other) => {
          if (other !== blob) other.classList.add("is-nudged");
        });
        window.setTimeout(() => {
          blobs.forEach((other) => other.classList.remove("is-nudged"));
        }, 400);
      });
      blob.addEventListener("mouseleave", () => blob.classList.remove("is-happy"));
      blob.addEventListener("click", () => {
        blob.classList.remove("is-wiggle");
        void (blob as unknown as { offsetWidth: number }).offsetWidth; // restart animation
        blob.classList.add("is-wiggle");
      });
    });

    return () => {
      io.disconnect();
      pauseIO.disconnect();
      blinkTimers.forEach((t) => window.clearTimeout(t));
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, []);

  return (
    <section ref={sectionRef} className="lc-section" style={CSS_VARS} aria-label="Let's Connect">
      <style>{`
        .lc-section {
          position: relative;
          width: 1920px; height: 763px;
          background: var(--lc-bg);
          overflow: hidden;
        }
        .lc-heading {
          position: absolute;
          left: 106px; top: 78px;
          font-family: inherit;
          font-weight: 600;
          font-size: 95px;
          line-height: 1;
          letter-spacing: -3.8px;
          color: var(--lc-heading);
          white-space: nowrap;
        }
        .lc-heading .mask { display: block; overflow: hidden; }
        .lc-heading .mask > span {
          display: block;
          transform: translateY(110%);
          transition: transform 0.8s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .lc-section.is-visible .lc-heading .mask > span { transform: translateY(0); }
        .lc-para {
          position: absolute;
          right: 120px; top: 96px;
          width: 520px;
          font-size: 30px;
          line-height: 1.55;
          color: var(--lc-text);
          opacity: 0;
          transform: translateY(40px);
          transition: opacity 0.8s cubic-bezier(0.22,1,0.36,1) 0.25s,
                      transform 0.8s cubic-bezier(0.22,1,0.36,1) 0.25s;
        }
        .lc-section.is-visible .lc-para { opacity: 1; transform: translateY(0); }
        .lc-stage {
          position: absolute;
          left: 50%; bottom: 0;
          transform: translateX(-50%);
          width: 900px; height: 520px;
        }
        /* blobs: entrance squash-and-stretch, then idle breathing */
        .lc-blob {
          transform-box: fill-box;
          transform-origin: bottom center;
          transform: scaleY(0);
          cursor: pointer;
        }
        .lc-section.is-visible .lc-blob {
          animation:
            lc-rise 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) forwards,
            lc-breathe var(--breathe-d, 4s) ease-in-out var(--breathe-delay, 0s) infinite;
          animation-delay: var(--rise-delay, 0s), calc(var(--rise-delay, 0s) + 0.7s);
        }
        @keyframes lc-rise {
          0% { transform: scaleY(0); }
          60% { transform: scaleY(1.08) scaleX(0.94); }
          100% { transform: scaleY(1) scaleX(1); }
        }
        @keyframes lc-breathe {
          0%, 100% { transform: scaleY(1) rotate(0deg); }
          50% { transform: scaleY(1.03) rotate(var(--sway, 1.5deg)); }
        }
        .lc-section.is-paused .lc-blob { animation-play-state: paused; }

        /* eyes */
        .lc-eyes { transition: transform 0.15s ease-out; }
        .lc-eyes .dots { transition: transform 0.12s ease; transform-box: fill-box; transform-origin: center; }
        .lc-eyes.is-blinking .dots { transform: scaleY(0.1); }
        .lc-eyes .happy { opacity: 0; transition: opacity 0.15s ease; }
        .lc-blob.is-happy .lc-eyes .happy { opacity: 1; }
        .lc-blob.is-happy .lc-eyes .dots { opacity: 0; }

        /* hover jump */
        .lc-blob.is-happy { animation: lc-jump 0.5s cubic-bezier(0.34, 1.56, 0.64, 1); }
        @keyframes lc-jump {
          0% { transform: translateY(0) scaleY(1); }
          40% { transform: translateY(-16px) scaleY(1.05); }
          70% { transform: translateY(0) scaleY(0.92); }
          100% { transform: translateY(0) scaleY(1); }
        }
        .lc-blob.is-nudged { animation: lc-nudge 0.4s ease; }
        @keyframes lc-nudge {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(var(--nudge-x, 6px)); }
        }
        /* click wiggle */
        .lc-blob.is-wiggle { animation: lc-wiggle 0.5s ease; }
        @keyframes lc-wiggle {
          0%, 100% { transform: rotate(0) translateY(0); }
          25% { transform: rotate(-6deg) translateY(-6px); }
          50% { transform: rotate(6deg) translateY(0); }
          75% { transform: rotate(-3deg) translateY(-3px); }
        }
        /* sparkles */
        .lc-sparkle { opacity: 0.7; animation: lc-drift 6s ease-in-out infinite; }
        @keyframes lc-drift {
          0%, 100% { transform: translateY(0); opacity: 0.4; }
          50% { transform: translateY(-14px); opacity: 0.9; }
        }
        .lc-section.is-paused .lc-sparkle { animation-play-state: paused; }

        @media (prefers-reduced-motion: reduce) {
          .lc-section.is-visible .lc-blob,
          .lc-blob { animation: none; transform: scaleY(1); }
          .lc-heading .mask > span { transform: none; transition: none; }
          .lc-para { opacity: 1; transform: none; transition: none; }
        }
      `}</style>

      <h2 className="lc-heading" aria-label="Let's Connect">
        <span className="mask"><span>Let&apos;s Connect</span></span>
      </h2>
      <p className="lc-para">
        If you&apos;re looking for a partner to help you explore new ideas, refine your brand, or simply need someone to bounce ideas off of, I&apos;m here to listen and collaborate.
      </p>

      <svg className="lc-stage" viewBox="0 0 900 520" role="img" aria-label="Playful blob characters">
        {/* sparkles */}
        <g fill="var(--lc-heading)" opacity="0.35">
          <circle className="lc-sparkle" cx="120" cy="120" r="4" style={{ animationDelay: "0s" }} />
          <circle className="lc-sparkle" cx="780" cy="90" r="5" style={{ animationDelay: "1.5s" }} />
          <circle className="lc-sparkle" cx="700" cy="200" r="3" style={{ animationDelay: "3s" }} />
          <circle className="lc-sparkle" cx="180" cy="260" r="3.5" style={{ animationDelay: "2s" }} />
        </g>

        {BLOBS.map((b, i) => {
          const cx = b.x + b.w / 2;
          const eyeCX1 = cx - 18, eyeCX2 = cx + 18;
          const eyeColor = (b as { eyes?: string }).eyes || "var(--lc-black)";
          return (
            <g
              key={i}
              className="lc-blob"
              data-cx={cx}
              data-cy={b.eyeY}
              style={{
                // @ts-expect-error CSS vars
                "--rise-delay": `${i * 0.09}s`,
                "--breathe-d": `${3 + (i % 3)}s`,
                "--breathe-delay": `${(i * 0.7) % 2}s`,
                "--sway": i % 2 ? "1.5deg" : "-1.5deg",
                "--nudge-x": i % 2 ? "6px" : "-6px",
              }}
            >
              {/* body */}
              <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={b.rx} fill={b.c} />
              {/* arm bump */}
              {b.arm === "right" && (
                <ellipse cx={b.x + b.w + 14} cy={b.y + b.h * 0.55} rx="26" ry="20" fill={b.c} />
              )}
              {/* eyes */}
              <g className="lc-eyes">
                <g className="dots" fill={eyeColor}>
                  <circle cx={eyeCX1} cy={b.eyeY} r="5" />
                  <circle cx={eyeCX2} cy={b.eyeY} r="5" />
                </g>
                <g className="happy" stroke={eyeColor} strokeWidth="4" strokeLinecap="round" fill="none">
                  {/* happy ^ ^ eyes */}
                  <path d={`M ${eyeCX1 - 7} ${b.eyeY + 3} Q ${eyeCX1} ${b.eyeY - 7} ${eyeCX1 + 7} ${b.eyeY + 3}`} />
                  <path d={`M ${eyeCX2 - 7} ${b.eyeY + 3} Q ${eyeCX2} ${b.eyeY - 7} ${eyeCX2 + 7} ${b.eyeY + 3}`} />
                </g>
              </g>
            </g>
          );
        })}
      </svg>
    </section>
  );
}
