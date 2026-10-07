import { useEffect, useRef } from "react";

/* ── Colors via CSS variables ───────────────────────────────────────────── */
const CSS_VARS = {
  "--connect-bg": "#111111", /* dark section bg, blends with footer */
  "--lc-bg": "#111111",
  "--lc-heading": "#f4f4f2",
  "--lc-text": "rgba(244,244,242,0.78)",
  "--lc-pink": "#ff0a8a",
  "--lc-blue": "#1a1aff",
  "--lc-black": "#26282b", /* visible on dark bg */
  "--lc-white": "#f4f4f2",
  "--lc-orange": "#ff5a00",
  "--lc-amber": "#ff9f0a",
  "--lc-yellow": "#ffd60a",
} as React.CSSProperties;

const BLOBS = [
  { x: 390, y: 60,  w: 120, h: 460, rx: 60, c: "var(--lc-pink)",   eyeY: 170, arm: null },
  { x: 225, y: 165, w: 112, h: 355, rx: 56, c: "var(--lc-blue)",   eyeY: 270, arm: "right", eyes: "#f4f4f2" }, /* blue blob: off-white eyes for visibility */
  { x: 563, y: 145, w: 112, h: 375, rx: 56, c: "var(--lc-black)",  eyeY: 255, arm: null, eyes: "#7dd8f0", stroke: "rgba(255,255,255,0.25)", strokeW: 2 }, /* black blob: visible on dark */
  { x: 375, y: 255, w: 150, h: 265, rx: 70, c: "var(--lc-white)",  eyeY: 360, arm: null },
  { x: 145, y: 325, w: 122, h: 195, rx: 60, c: "var(--lc-orange)", eyeY: 410, arm: "right" },
  { x: 628, y: 335, w: 112, h: 185, rx: 56, c: "var(--lc-amber)",  eyeY: 415, arm: null },
  { x: 475, y: 405, w: 135, h: 115, rx: 57, c: "var(--lc-yellow)", eyeY: 455, arm: null },
];

export default function LetsConnect() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const blobs = Array.from(section.querySelectorAll<SVGGElement>(".lc-blob"));
    let io: IntersectionObserver | null = null;
    let pauseIO: IntersectionObserver | null = null;
    let gridIO: IntersectionObserver | null = null;
    const blinkTimers: number[] = [];
    const safetyTimer: number[] = [];

    const init = () => {
      // disconnect old observers before creating new ones (route changes)
      io?.disconnect();
      pauseIO?.disconnect();
      gridIO?.disconnect();
      blinkTimers.forEach((t) => window.clearTimeout(t));
      blinkTimers.length = 0;
      safetyTimer.forEach((t) => window.clearTimeout(t));
      safetyTimer.length = 0;

      if (reduceMotion) {
        section.classList.add("is-visible", "is-ready");
        return;
      }

      /* Entrance: replay every time the section enters at ~30% */
      io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && entry.intersectionRatio >= 0.3) {
              // reset to start state, then trigger
              section.classList.remove("is-visible");
              void section.offsetWidth; // reflow
              section.classList.add("is-ready", "is-visible");
            } else if (!entry.isIntersecting) {
              section.classList.remove("is-visible");
            }
          });
        },
        { threshold: [0, 0.3, 0.6, 1] }
      );
      io.observe(section);

      /* Safety fallback: force visible after 2s if observer never fired */
      safetyTimer.push(
        window.setTimeout(() => {
          if (!section.classList.contains("is-visible")) {
            section.classList.add("is-ready", "is-visible", "is-fallback");
          }
        }, 2000)
      );

      /* Toggle body class for grid-line styling when section is in view */
      gridIO?.disconnect();
      gridIO = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            document.body.classList.toggle("connect-in-view", entry.isIntersecting);
          });
        },
        { threshold: 0.1 }
      );
      gridIO.observe(section);

      /* Pause idle animations off-screen */
      pauseIO = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            section.classList.toggle("is-paused", !entry.isIntersecting);
          });
        },
        { threshold: 0 }
      );
      pauseIO.observe(section);

      /* Blinking */
      blobs.forEach((blob) => {
        const eyes = blob.querySelector(".lc-eyes");
        if (!eyes) return;
        const schedule = () => {
          blinkTimers.push(
            window.setTimeout(() => {
              if (section.classList.contains("is-paused")) { schedule(); return; }
              eyes.classList.add("is-blinking");
              window.setTimeout(() => eyes.classList.remove("is-blinking"), 180);
              schedule();
            }, 3000 + Math.random() * 3000)
          );
        };
        schedule();
      });
    };

    init();

    /* Re-init on route changes / page show */
    const onPageShow = () => init();
    window.addEventListener("pageshow", onPageShow);

    /* Eyes follow cursor */
    const isTouch = window.matchMedia("(pointer: coarse)").matches;
    const onMouseMove = (e: MouseEvent) => {
      if (isTouch || section.classList.contains("is-paused")) return;
      const r = section.getBoundingClientRect();
      const mx = e.clientX - r.left, my = e.clientY - r.top;
      const scaleX = r.width / 900, scaleY = r.height / 520;
      blobs.forEach((blob) => {
        const eyes = blob.querySelector<SVGGElement>(".lc-eyes");
        if (!eyes) return;
        const cx = Number(blob.dataset.cx || 0) * scaleX;
        const cy = Number(blob.dataset.cy || 0) * scaleY;
        const dx = mx - cx, dy = my - cy;
        const len = Math.max(Math.hypot(dx, dy), 1);
        const s = Math.min(4, len / 40);
        eyes.style.transform = `translate(${(dx / len) * s}px, ${(dy / len) * s}px)`;
      });
    };
    if (!isTouch) window.addEventListener("mousemove", onMouseMove);

    /* Hover + click */
    const cleanups: Array<() => void> = [];
    blobs.forEach((blob) => {
      const onEnter = () => {
        blob.classList.add("is-happy");
        blobs.forEach((o) => { if (o !== blob) o.classList.add("is-nudged"); });
        window.setTimeout(() => blobs.forEach((o) => o.classList.remove("is-nudged")), 400);
      };
      const onLeave = () => blob.classList.remove("is-happy");
      const onClick = () => {
        blob.classList.remove("is-wiggle");
        void (blob as unknown as { offsetWidth: number }).offsetWidth;
        blob.classList.add("is-wiggle");
      };
      blob.addEventListener("mouseenter", onEnter);
      blob.addEventListener("mouseleave", onLeave);
      blob.addEventListener("click", onClick);
      cleanups.push(() => {
        blob.removeEventListener("mouseenter", onEnter);
        blob.removeEventListener("mouseleave", onLeave);
        blob.removeEventListener("click", onClick);
      });
    });

    return () => {
      io?.disconnect();
      pauseIO?.disconnect();
      gridIO?.disconnect();
      document.body.classList.remove("connect-in-view");
      blinkTimers.forEach((t) => window.clearTimeout(t));
      safetyTimer.forEach((t) => window.clearTimeout(t));
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("mousemove", onMouseMove);
      cleanups.forEach((fn) => fn());
    };
  }, []);

  return (
    <section ref={sectionRef} id="connect" className="lc-section" data-theme="dark" style={CSS_VARS} aria-label="Let's Connect">
      <style>{`
        /* ── FIX: default state is VISIBLE. Hidden start only via .is-ready ── */
        #connect.lc-section {
          position: relative;
          z-index: 1; /* above the grid lines */
          width: 1920px; height: 763px;
          background: var(--connect-bg); /* dark #111, blends with footer */
          overflow: hidden;
        }
        /* grid lines inside this section: subtle white, below text */
        /* toggled via body.connect-in-view (JS below), scoped to section visibility */
        body.connect-in-view [class*="h-[11035px]"][class*="border-l"] {
          border-left-color: rgba(255,255,255,0.08) !important;
          border-right-color: rgba(255,255,255,0.08) !important;
          pointer-events: none;
        }
        /* FIX: text above grid lines */
        #connect .lc-heading, #connect .lc-para {
          position: absolute;
          z-index: 2;
        }
        #connect .lc-heading {
          left: 106px; top: 78px;
          margin: 0;
          font-family: inherit;
          font-weight: 600;
          font-size: 95px;
          line-height: 1;
          letter-spacing: -3.8px;
          color: #f4f4f2 !important; /* off-white on dark bg */
          white-space: nowrap;
        }
        #connect .lc-heading .mask { display: block; overflow: hidden; }
        #connect .lc-heading .mask > span { display: block; }
        /* hidden start ONLY when JS is ready to animate */
        #connect.is-ready .lc-heading .mask > span { transform: translateY(110%); }
        #connect.is-ready.is-visible .lc-heading .mask > span {
          transform: translateY(0);
          transition: transform 0.8s cubic-bezier(0.22, 1, 0.36, 1);
        }
        #connect .lc-para {
          right: 120px; top: 96px;
          width: 520px; max-width: 520px;
          margin: 0;
          font-size: 30px;
          line-height: 1.55;
          color: rgba(244,244,242,0.78) !important; /* softer than heading, WCAG AA */
        }
        #connect.is-ready .lc-para { opacity: 0; transform: translateY(40px); }
        #connect.is-ready.is-visible .lc-para {
          opacity: 1; transform: translateY(0);
          transition: opacity 0.8s cubic-bezier(0.22,1,0.36,1) 0.25s,
                      transform 0.8s cubic-bezier(0.22,1,0.36,1) 0.25s;
        }
        /* fallback: simple fade if observer failed */
        #connect.is-fallback .lc-heading .mask > span,
        #connect.is-fallback .lc-para { transform: none; opacity: 1; transition: opacity 0.5s ease; }

        /* ── FIX: SVG explicit sizing, never collapses ── */
        #connect .lc-stage {
          position: absolute;
          z-index: 1;
          left: 50%; bottom: 0;
          transform: translateX(-50%);
          width: 900px;
          min-height: 45vh;
          display: block;
        }
        #connect .lc-stage svg, #connect svg.lc-stage {
          width: 100%; height: auto; display: block;
        }
        /* blobs visible by default; hidden start only via .is-ready */
        #connect .lc-blob {
          transform-box: fill-box;
          transform-origin: bottom center;
          cursor: pointer;
        }
        #connect.is-ready .lc-blob { transform: scaleY(0); }
        #connect.is-ready.is-visible .lc-blob {
          animation:
            lc-rise 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) forwards,
            lc-breathe var(--breathe-d, 4s) ease-in-out var(--breathe-delay, 0s) infinite;
          animation-delay: var(--rise-delay, 0s), calc(var(--rise-delay, 0s) + 0.7s);
        }
        #connect.is-fallback .lc-blob { animation: none; transform: scaleY(1); }
        @keyframes lc-rise {
          0% { transform: scaleY(0); }
          60% { transform: scaleY(1.08) scaleX(0.94); }
          100% { transform: scaleY(1) scaleX(1); }
        }
        @keyframes lc-breathe {
          0%, 100% { transform: scaleY(1) rotate(0deg); }
          50% { transform: scaleY(1.03) rotate(var(--sway, 1.5deg)); }
        }
        #connect.is-paused .lc-blob { animation-play-state: paused; }

        #connect .lc-eyes { transition: transform 0.15s ease-out; }
        #connect .lc-eyes .dots { transition: transform 0.12s ease; transform-box: fill-box; transform-origin: center; }
        #connect .lc-eyes.is-blinking .dots { transform: scaleY(0.1); }
        #connect .lc-eyes .happy { opacity: 0; transition: opacity 0.15s ease; }
        #connect .lc-blob.is-happy .lc-eyes .happy { opacity: 1; }
        #connect .lc-blob.is-happy .lc-eyes .dots { opacity: 0; }
        #connect .lc-blob.is-happy { animation: lc-jump 0.5s cubic-bezier(0.34, 1.56, 0.64, 1); }
        @keyframes lc-jump {
          0% { transform: translateY(0) scaleY(1); }
          40% { transform: translateY(-16px) scaleY(1.05); }
          70% { transform: translateY(0) scaleY(0.92); }
          100% { transform: translateY(0) scaleY(1); }
        }
        #connect .lc-blob.is-nudged { animation: lc-nudge 0.4s ease; }
        @keyframes lc-nudge {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(var(--nudge-x, 6px)); }
        }
        #connect .lc-blob.is-wiggle { animation: lc-wiggle 0.5s ease; }
        @keyframes lc-wiggle {
          0%, 100% { transform: rotate(0) translateY(0); }
          25% { transform: rotate(-6deg) translateY(-6px); }
          50% { transform: rotate(6deg) translateY(0); }
          75% { transform: rotate(-3deg) translateY(-3px); }
        }
        #connect .lc-sparkle { opacity: 0.7; animation: lc-drift 6s ease-in-out infinite; }
        @keyframes lc-drift {
          0%, 100% { transform: translateY(0); opacity: 0.4; }
          50% { transform: translateY(-14px); opacity: 0.9; }
        }
        #connect.is-paused .lc-sparkle { animation-play-state: paused; }

        /* ── inline CONTACT link ── */
        #connect .lc-contact {
          position: absolute;
          z-index: 2;
          right: 120px; top: 480px;
          font-family: inherit;
          font-weight: 600;
          font-size: 28px;
          letter-spacing: 0.04em;
          color: #f4f4f2 !important;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: color 0.25s ease;
        }
        #connect .lc-contact .lc-arrow {
          display: inline-block;
          transition: transform 0.25s ease;
        }
        #connect .lc-contact:hover {
          color: #ffd60a !important; /* yellow on hover */
        }
        #connect .lc-contact:hover .lc-arrow {
          transform: translate(4px, -4px); /* arrow moves diagonally */
        }
        #connect.is-ready .lc-contact { opacity: 0; transform: translateY(40px); }
        #connect.is-ready.is-visible .lc-contact {
          opacity: 1; transform: translateY(0);
          transition: opacity 0.8s cubic-bezier(0.22,1,0.36,1) 0.4s,
                      transform 0.8s cubic-bezier(0.22,1,0.36,1) 0.4s,
                      color 0.25s ease;
        }
        #connect.is-fallback .lc-contact { opacity: 1; transform: none; }

        @media (prefers-reduced-motion: reduce) {
          #connect.is-ready .lc-blob, #connect .lc-blob { animation: none; transform: scaleY(1); }
          #connect.is-ready .lc-heading .mask > span { transform: none; transition: none; }
          #connect.is-ready .lc-para { opacity: 1; transform: none; transition: none; }
        }
      `}</style>

      <h2 className="lc-heading" aria-label="Let's Connect">
        <span className="mask"><span>Let&apos;s Connect</span></span>
      </h2>
      <p className="lc-para">
        If you&apos;re looking for a partner to help you explore new ideas, refine your brand, or simply need someone to bounce ideas off of, I&apos;m here to listen and collaborate.
      </p>
      <a href="mailto:aawahid321@gmail.com" className="lc-contact" aria-label="Contact via email">
        CONTACT <span className="lc-arrow">↗</span>
      </a>

      <div className="lc-stage">
        <svg viewBox="0 0 900 520" role="img" aria-label="Playful blob characters">
          {/* soft glow behind characters (static, not animated) */}
          <ellipse cx="450" cy="470" rx="320" ry="60" fill="url(#lc-glow)" />
          <defs>
            <radialGradient id="lc-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.06)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </radialGradient>
          </defs>
          <g fill="rgba(255,255,255,0.25)"> {/* sparkles: white on dark */}
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
                <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={b.rx} fill={b.c}
                  stroke={(b as { stroke?: string }).stroke || "none"}
                  strokeWidth={(b as { strokeW?: number }).strokeW || 0} />
                {b.arm === "right" && (
                  <ellipse cx={b.x + b.w + 14} cy={b.y + b.h * 0.55} rx="26" ry="20" fill={b.c} />
                )}
                <g className="lc-eyes">
                  <g className="dots" fill={eyeColor}>
                    <circle cx={eyeCX1} cy={b.eyeY} r="5" />
                    <circle cx={eyeCX2} cy={b.eyeY} r="5" />
                  </g>
                  <g className="happy" stroke={eyeColor} strokeWidth="4" strokeLinecap="round" fill="none">
                    <path d={`M ${eyeCX1 - 7} ${b.eyeY + 3} Q ${eyeCX1} ${b.eyeY - 7} ${eyeCX1 + 7} ${b.eyeY + 3}`} />
                    <path d={`M ${eyeCX2 - 7} ${b.eyeY + 3} Q ${eyeCX2} ${b.eyeY - 7} ${eyeCX2 + 7} ${b.eyeY + 3}`} />
                  </g>
                </g>
              </g>
            );
          })}
        </svg>
      </div>
    </section>
  );
}
