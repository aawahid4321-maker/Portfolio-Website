import { useEffect, useRef } from "react";

/* ── Colors via CSS variables ───────────────────────────────────────────── */
const CSS_VARS = {
  "--connect-bg": "#111111", /* dark section bg, blends with footer */
  "--lc-bg": "#111111",
  "--lc-heading": "#f4f4f2",
  "--lc-text": "rgba(244,244,242,0.78)",
  "--lc-pink": "#ff0a8a",
  "--lc-purple-light": "#A58CF4",
  "--lc-soft-white": "#FAFAFA",
  "--lc-orange": "#ff5a00",
  "--lc-amber": "#ff9f0a",
  "--lc-yellow": "#ffd60a",
  "--lc-black": "#0D0D0D",
} as React.CSSProperties;

/* ── 7 characters: distinct shapes, flat colors, no outlines/gradients ──── */
/* Each: <g class="body">, <g class="face">(<g class="eyes">, <g class="mouth">), <g class="arms">, <g class="legs"> */

export default function LetsConnect() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const chars = Array.from(section.querySelectorAll<SVGGElement>(".lc-char"));
    let io: IntersectionObserver | null = null;
    let pauseIO: IntersectionObserver | null = null;
    let gridIO: IntersectionObserver | null = null;
    const blinkTimers: number[] = [];
    const safetyTimer: number[] = [];
    const cleanups: Array<() => void> = [];

    const init = () => {
      io?.disconnect();
      pauseIO?.disconnect();
      gridIO?.disconnect();
      blinkTimers.forEach((t) => window.clearTimeout(t));
      blinkTimers.length = 0;
      safetyTimer.forEach((t) => window.clearTimeout(t));
      safetyTimer.length = 0;

      section.classList.add("is-ready");

      // entrance observer: ~30% visible, play once
      let played = section.dataset.played === "1";
      io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting && e.intersectionRatio >= 0.3) {
              section.classList.add("is-visible");
              if (!played) {
                played = true;
                section.dataset.played = "1";
              }
            }
          });
        },
        { threshold: [0, 0.3, 0.6, 1] }
      );
      io.observe(section);

      // pause idle animations off-screen
      pauseIO = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            section.classList.toggle("is-paused", !e.isIntersecting);
          });
        },
        { threshold: 0 }
      );
      pauseIO.observe(section);

      // grid lines toggle
      gridIO = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            document.body.classList.toggle("connect-in-view", e.isIntersecting);
          });
        },
        { threshold: 0.1 }
      );
      gridIO.observe(section);

      // blink: random 3-6s per character, eyes return to scaleY 1
      // star has happy closed eyes — doesn't blink
      chars.forEach((ch) => {
        if (ch.id === "char-star" || reduceMotion) return;
        const eyes = ch.querySelector(".lc-eyes");
        if (!eyes) return;
        const schedule = () => {
          const t = window.setTimeout(() => {
            eyes.classList.add("is-blinking");
            window.setTimeout(() => {
              eyes.classList.remove("is-blinking"); // always returns to scaleY 1
              schedule();
            }, 180);
          }, 3000 + Math.random() * 3000);
          blinkTimers.push(t);
        };
        schedule();
      });

      // safety: if observer never fires, show everything
      safetyTimer.push(
        window.setTimeout(() => {
          if (!section.classList.contains("is-visible")) {
            section.classList.add("is-fallback", "is-visible");
          }
        }, 4000)
      );
    };

    const onPageShow = () => init();
    window.addEventListener("pageshow", onPageShow);

    // eyes follow cursor (skip on touch)
    const isTouch = window.matchMedia("(pointer: coarse)").matches;
    const onMouseMove = (e: MouseEvent) => {
      if (isTouch || reduceMotion) return;
      const r = section.getBoundingClientRect();
      const mx = e.clientX - r.left, my = e.clientY - r.top;
      const scaleX = r.width / 900, scaleY = r.height / 520;
      chars.forEach((ch) => {
        const eyes = ch.querySelector<SVGGElement>(".lc-eyes");
        if (!eyes || ch.id === "char-star") return;
        const cx = Number(ch.dataset.cx || 0) * scaleX;
        const cy = Number(ch.dataset.cy || 0) * scaleY;
        const dx = Math.max(-4, Math.min(4, (mx - cx) * 0.02));
        const dy = Math.max(-4, Math.min(4, (my - cy) * 0.02));
        (eyes as SVGGElement).style.transform = `translate(${dx}px, ${dy}px)`;
      });
    };
    if (!isTouch) window.addEventListener("mousemove", onMouseMove);

    // hover: jump + happy face, neighbors nudge away
    chars.forEach((ch) => {
      const onEnter = () => {
        if (reduceMotion) return;
        ch.classList.add("is-happy");
        chars.forEach((other) => {
          if (other === ch) return;
          const ox = Number(other.dataset.cx || 0) - Number(ch.dataset.cx || 0);
          other.style.setProperty("--nudge-x", ox > 0 ? "8px" : "-8px");
          other.classList.add("is-nudged");
          window.setTimeout(() => other.classList.remove("is-nudged"), 450);
        });
      };
      const onLeave = () => ch.classList.remove("is-happy");
      const onClick = () => {
        if (reduceMotion) return;
        ch.classList.add("is-wiggle", "is-laughing");
        window.setTimeout(() => ch.classList.remove("is-wiggle"), 550);
        window.setTimeout(() => ch.classList.remove("is-laughing"), 650);
      };
      ch.addEventListener("mouseenter", onEnter);
      ch.addEventListener("mouseleave", onLeave);
      ch.addEventListener("click", onClick);
      cleanups.push(() => {
        ch.removeEventListener("mouseenter", onEnter);
        ch.removeEventListener("mouseleave", onLeave);
        ch.removeEventListener("click", onClick);
      });
    });

    init();

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
        #connect.lc-section {
          position: relative;
          z-index: 1;
          width: 1920px; height: 763px;
          background: var(--connect-bg);
          overflow: hidden;
        }
        body.connect-in-view [class*="h-[11035px]"][class*="border-l"] {
          border-left-color: rgba(255,255,255,0.08) !important;
          border-right-color: rgba(255,255,255,0.08) !important;
          pointer-events: none;
        }
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
          color: #f4f4f2 !important;
          white-space: nowrap;
        }
        #connect .lc-heading .mask { display: block; overflow: hidden; }
        #connect .lc-heading .mask > span { display: block; }
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
          color: rgba(244,244,242,0.78) !important;
        }
        #connect.is-ready .lc-para { opacity: 0; transform: translateY(40px); }
        #connect.is-ready.is-visible .lc-para {
          opacity: 1; transform: translateY(0);
          transition: opacity 0.8s cubic-bezier(0.22,1,0.36,1) 0.25s,
                      transform 0.8s cubic-bezier(0.22,1,0.36,1) 0.25s;
        }
        #connect.is-fallback .lc-heading .mask > span,
        #connect.is-fallback .lc-para { transform: none; opacity: 1; transition: opacity 0.5s ease; }

        /* ── character stage ── */
        #connect .lc-stage {
          position: absolute;
          z-index: 1;
          left: 50%; bottom: 0;
          transform: translateX(-50%);
          width: 900px;
          height: 520px;
          display: block;
        }
        #connect .lc-stage svg {
          width: 100%; height: 100%; display: block;
          overflow: visible;
        }
        /* characters: visible by default; hidden start only via .is-ready */
        #connect .lc-char {
          transform-box: fill-box;
          transform-origin: bottom center;
          cursor: pointer;
        }
        #connect.is-ready .lc-char { transform: scaleY(0); opacity: 0; }
        #connect.is-ready.is-visible .lc-char {
          animation:
            lc-rise 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) forwards,
            var(--idle-anim, lc-breathe) var(--idle-d, 4s) ease-in-out var(--idle-delay, 0s) infinite;
          animation-delay: var(--rise-delay, 0s), calc(var(--rise-delay, 0s) + 0.7s);
        }
        #connect.is-fallback .lc-char { animation: none; transform: scaleY(1); opacity: 1; }
        @keyframes lc-rise {
          0% { transform: scaleY(0); opacity: 0; }
          60% { transform: scaleY(1.08) scaleX(0.94); opacity: 1; }
          100% { transform: scaleY(1) scaleX(1); opacity: 1; }
        }
        /* idle animations per character */
        @keyframes lc-breathe {
          0%, 100% { transform: scaleY(1); }
          50% { transform: scaleY(1.03); }
        }
        @keyframes lc-bob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes lc-sway {
          0%, 100% { transform: rotate(-3deg); }
          50% { transform: rotate(3deg); }
        }
        @keyframes lc-tilt {
          0%, 100% { transform: rotate(-2deg); }
          50% { transform: rotate(2deg); }
        }
        @keyframes lc-twinkle {
          0%, 100% { transform: rotate(-6deg) scale(1); opacity: 1; }
          50% { transform: rotate(6deg) scale(1.05); opacity: 0.85; }
        }
        @keyframes lc-shift {
          0%, 100% { transform: translateX(-6px); }
          50% { transform: translateX(6px); }
        }
        @keyframes lc-wave-arm {
          0%, 100% { transform: rotate(-15deg); }
          50% { transform: rotate(15deg); }
        }
        #connect .lc-char .arm-wave {
          transform-box: fill-box;
          transform-origin: top center;
          animation: lc-wave-arm 2.5s ease-in-out infinite;
        }
        #connect.is-paused .lc-char,
        #connect.is-paused .lc-char .arm-wave { animation-play-state: paused; }

        /* eyes: blink + follow */
        #connect .lc-eyes { transition: transform 0.15s ease-out; }
        #connect .lc-eyes .dots { transition: transform 0.12s ease; transform-box: fill-box; transform-origin: center; }
        #connect .lc-eyes.is-blinking .dots { transform: scaleY(0.1); }
        /* happy face on hover */
        #connect .lc-eyes .happy { opacity: 0; transition: opacity 0.15s ease; }
        #connect .lc-char.is-happy .lc-eyes .happy { opacity: 1; }
        #connect .lc-char.is-happy .lc-eyes .dots { opacity: 0; }
        #connect .lc-char.is-happy .mouth-normal { opacity: 0; }
        #connect .lc-char.is-happy .mouth-happy { opacity: 1; }
        #connect .mouth-happy { opacity: 0; transition: opacity 0.15s ease; }
        #connect .mouth-normal { transition: opacity 0.15s ease; }
        /* laugh on click */
        #connect .lc-char.is-laughing .mouth-normal,
        #connect .lc-char.is-laughing .mouth-happy { opacity: 0; }
        #connect .lc-char.is-laughing .mouth-laugh { opacity: 1; }
        #connect .mouth-laugh { opacity: 0; transition: opacity 0.15s ease; }
        /* hover jump */
        #connect .lc-char.is-happy { animation: lc-jump 0.5s cubic-bezier(0.34, 1.56, 0.64, 1); }
        @keyframes lc-jump {
          0% { transform: translateY(0) scaleY(1); }
          40% { transform: translateY(-16px) scaleY(1.05); }
          70% { transform: translateY(0) scaleY(0.92); }
          100% { transform: translateY(0) scaleY(1); }
        }
        #connect .lc-char.is-nudged { animation: lc-nudge 0.4s ease; }
        @keyframes lc-nudge {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(var(--nudge-x, 6px)); }
        }
        #connect .lc-char.is-wiggle { animation: lc-wiggle 0.5s ease; }
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

        /* inline CONTACT link */
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
        #connect .lc-contact:hover { color: #ffd60a !important; }
        #connect .lc-contact:hover .lc-arrow { transform: translate(4px, -4px); }
        #connect.is-ready .lc-contact { opacity: 0; transform: translateY(40px); }
        #connect.is-ready.is-visible .lc-contact {
          opacity: 1; transform: translateY(0);
          transition: opacity 0.8s cubic-bezier(0.22,1,0.36,1) 0.4s,
                      transform 0.8s cubic-bezier(0.22,1,0.36,1) 0.4s,
                      color 0.25s ease;
        }
        #connect.is-fallback .lc-contact { opacity: 1; transform: none; }

        /* mobile: hide back characters */
        @media (max-width: 768px) {
          #connect .lc-stage { width: 100vw; height: 35vh; }
          #connect #char-sun, #connect #char-rect { display: none; }
        }

        @media (prefers-reduced-motion: reduce) {
          #connect.is-ready .lc-char, #connect .lc-char { animation: none; transform: scaleY(1); opacity: 1; }
          #connect .lc-char .arm-wave { animation: none; }
          #connect.is-ready .lc-heading .mask > span { transform: none; transition: none; }
          #connect.is-ready .lc-para, #connect.is-ready .lc-contact { opacity: 1; transform: none; transition: none; }
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
        <svg viewBox="0 0 900 520" role="img" aria-label="A group of friendly cartoon shape characters">
          {/* ground shadow: soft purple ellipse */}
          <ellipse cx="450" cy="495" rx="330" ry="28" fill="rgba(165,140,244,0.25)" />
          <g fill="rgba(255,255,255,0.25)">
            <circle className="lc-sparkle" cx="120" cy="120" r="4" style={{ animationDelay: "0s" }} />
            <circle className="lc-sparkle" cx="780" cy="90" r="5" style={{ animationDelay: "1.5s" }} />
            <circle className="lc-sparkle" cx="700" cy="200" r="3" style={{ animationDelay: "3s" }} />
            <circle className="lc-sparkle" cx="180" cy="260" r="3.5" style={{ animationDelay: "2s" }} />
          </g>

          {/* 1. STAR (yellow) — back top, happy closed eyes, no blink */}
          <g id="char-star" className="lc-char" data-cx="450" data-cy="90"
             style={{ "--rise-delay": "0s", "--idle-anim": "lc-twinkle", "--idle-d": "4s", "--idle-delay": "0.7s" } as React.CSSProperties}>
            <g transform="translate(450, 95)">
              <g className="body">
                <path d="M0,-52 L15,-17 L50,-17 L23,7 L33,42 L0,21 L-33,42 L-23,7 L-50,-17 L-15,-17 Z"
                      fill="#ffd60a" stroke="#ffd60a" strokeWidth="12" strokeLinejoin="round" />
              </g>
              <g className="face">
                <g className="eyes">
                  <g className="happy" opacity="1">
                    <path d="M-20,-6 Q-14,-13 -8,-6" stroke="#0D0D0D" strokeWidth="3.5" fill="none" strokeLinecap="round" />
                    <path d="M8,-6 Q14,-13 20,-6" stroke="#0D0D0D" strokeWidth="3.5" fill="none" strokeLinecap="round" />
                  </g>
                </g>
                <g className="mouth">
                  <path className="mouth-normal" d="M-9,10 Q0,17 9,10" stroke="#0D0D0D" strokeWidth="3.5" fill="none" strokeLinecap="round" />
                </g>
              </g>
            </g>
          </g>

          {/* 6. SUN (amber) — back left, waving arm, big smile */}
          <g id="char-sun" className="lc-char" data-cx="150" data-cy="200"
             style={{ "--rise-delay": "0.09s", "--idle-anim": "lc-bob", "--idle-d": "3.5s", "--idle-delay": "0.8s" } as React.CSSProperties}>
            <g transform="translate(150, 210)">
              <g className="arms">
                <g className="arm-wave">
                  <line x1="52" y1="-10" x2="78" y2="-48" stroke="#ff9f0a" strokeWidth="9" strokeLinecap="round" />
                  <circle cx="78" cy="-48" r="7" fill="#ff9f0a" />
                </g>
                <line x1="-52" y1="10" x2="-70" y2="30" stroke="#ff9f0a" strokeWidth="9" strokeLinecap="round" />
                <circle cx="-70" cy="30" r="7" fill="#ff9f0a" />
              </g>
              <g className="body">
                {/* 12-point burst */}
                <path d="M0,-58 L12,-38 L34,-50 L32,-26 L58,-24 L44,-6 L64,8 L40,16 L44,42 L22,32 L12,56 L0,34 L-12,56 L-22,32 L-44,42 L-40,16 L-64,8 L-44,-6 L-58,-24 L-32,-26 L-34,-50 L-12,-38 Z"
                      fill="#ff9f0a" stroke="#ff9f0a" strokeWidth="10" strokeLinejoin="round" />
              </g>
              <g className="face">
                <g className="eyes">
                  <g className="dots" fill="#0D0D0D">
                    <circle cx="-16" cy="-8" r="5.5" />
                    <circle cx="16" cy="-8" r="5.5" />
                  </g>
                  <g className="happy" stroke="#0D0D0D" strokeWidth="3.5" strokeLinecap="round" fill="none">
                    <path d="M-22,-8 Q-16,-15 -10,-8" />
                    <path d="M10,-8 Q16,-15 22,-8" />
                  </g>
                </g>
                <g className="mouth">
                  <path className="mouth-normal" d="M-16,14 Q0,28 16,14 Q0,20 -16,14 Z" fill="#0D0D0D" />
                  <path className="mouth-happy" d="M-20,12 Q0,34 20,12 Q0,22 -20,12 Z" fill="#0D0D0D" />
                  <g className="mouth-laugh" opacity="0">
                    <ellipse cx="0" cy="20" rx="14" ry="12" fill="#0D0D0D" />
                    <ellipse cx="0" cy="25" rx="7" ry="5" fill="#ff0a8a" />
                  </g>
                </g>
              </g>
              <g className="legs" stroke="#0D0D0D" strokeWidth="8" strokeLinecap="round">
                <line x1="-18" y1="48" x2="-18" y2="68" />
                <line x1="18" y1="48" x2="18" y2="68" />
              </g>
            </g>
          </g>

          {/* 2. PENTAGON (pink) — tall back, surprised face */}
          <g id="char-pentagon" className="lc-char" data-cx="450" data-cy="230"
             style={{ "--rise-delay": "0.18s", "--idle-anim": "lc-bob", "--idle-d": "4.2s", "--idle-delay": "0.9s" } as React.CSSProperties}>
            <g transform="translate(450, 250)">
              <g className="body">
                <path d="M0,-85 L78,-28 L48,68 L-48,68 L-78,-28 Z"
                      fill="#ff0a8a" stroke="#ff0a8a" strokeWidth="16" strokeLinejoin="round" />
              </g>
              <g className="face">
                <g className="eyes">
                  <g className="dots">
                    <circle cx="-24" cy="-12" r="11" fill="#FAFAFA" />
                    <circle cx="-24" cy="-12" r="4.5" fill="#0D0D0D" />
                    <circle cx="24" cy="-12" r="11" fill="#FAFAFA" />
                    <circle cx="24" cy="-12" r="4.5" fill="#0D0D0D" />
                  </g>
                  <g className="happy" stroke="#FAFAFA" strokeWidth="3.5" strokeLinecap="round" fill="none">
                    <path d="M-30,-12 Q-24,-19 -18,-12" />
                    <path d="M18,-12 Q24,-19 30,-12" />
                  </g>
                </g>
                <g className="mouth">
                  <ellipse className="mouth-normal" cx="0" cy="28" rx="9" ry="11" fill="#0D0D0D" />
                  <path className="mouth-happy" d="M-18,22 Q0,44 18,22 Q0,32 -18,22 Z" fill="#0D0D0D" />
                  <g className="mouth-laugh" opacity="0">
                    <ellipse cx="0" cy="30" rx="13" ry="14" fill="#0D0D0D" />
                    <ellipse cx="0" cy="36" rx="6" ry="5" fill="#ff0a8a" />
                  </g>
                </g>
              </g>
            </g>
          </g>

          {/* 7. RECTANGLE (purple light) — back right, shy face */}
          <g id="char-rect" className="lc-char" data-cx="720" data-cy="230"
             style={{ "--rise-delay": "0.27s", "--idle-anim": "lc-shift", "--idle-d": "4.8s", "--idle-delay": "1s" } as React.CSSProperties}>
            <g transform="translate(720, 260) rotate(3)">
              <g className="arms">
                {/* hand touching cheek */}
                <line x1="48" y1="-20" x2="62" y2="-48" stroke="#A58CF4" strokeWidth="9" strokeLinecap="round" />
                <circle cx="62" cy="-48" r="7" fill="#A58CF4" />
                <line x1="-48" y1="20" x2="-60" y2="40" stroke="#A58CF4" strokeWidth="9" strokeLinecap="round" />
                <circle cx="-60" cy="40" r="7" fill="#A58CF4" />
              </g>
              <g className="body">
                <rect x="-52" y="-95" width="104" height="190" rx="52" fill="#A58CF4" />
              </g>
              <g className="face">
                <g className="eyes">
                  <g className="dots" fill="#0D0D0D">
                    <circle cx="-18" cy="-30" r="4.5" />
                    <circle cx="18" cy="-30" r="4.5" />
                  </g>
                  <g className="happy" stroke="#0D0D0D" strokeWidth="3" strokeLinecap="round" fill="none">
                    <path d="M-23,-30 Q-18,-35 -13,-30" />
                    <path d="M13,-30 Q18,-35 23,-30" />
                  </g>
                </g>
                <g className="mouth">
                  <path className="mouth-normal" d="M-7,-8 Q0,-4 7,-8" stroke="#0D0D0D" strokeWidth="3" fill="none" strokeLinecap="round" />
                  <path className="mouth-happy" d="M-12,-8 Q0,4 12,-8" stroke="#0D0D0D" strokeWidth="3" fill="none" strokeLinecap="round" />
                  <g className="mouth-laugh" opacity="0">
                    <ellipse cx="0" cy="-2" rx="10" ry="9" fill="#0D0D0D" />
                  </g>
                </g>
                {/* blush */}
                <circle cx="-30" cy="-18" r="6" fill="#ff0a8a" opacity="0.35" />
                <circle cx="30" cy="-18" r="6" fill="#ff0a8a" opacity="0.35" />
              </g>
            </g>
          </g>

          {/* 3. TRIANGLE (orange) — front left, cheeky, waving */}
          <g id="char-triangle" className="lc-char" data-cx="210" data-cy="400"
             style={{ "--rise-delay": "0.36s", "--idle-anim": "lc-sway", "--idle-d": "3.2s", "--idle-delay": "1.1s" } as React.CSSProperties}>
            <g transform="translate(210, 400) rotate(-4)">
              <g className="arms">
                <g className="arm-wave">
                  <line x1="42" y1="0" x2="68" y2="-32" stroke="#ff5a00" strokeWidth="9" strokeLinecap="round" />
                  <circle cx="68" cy="-32" r="7" fill="#ff5a00" />
                </g>
                <line x1="-42" y1="10" x2="-58" y2="28" stroke="#ff5a00" strokeWidth="9" strokeLinecap="round" />
                <circle cx="-58" cy="28" r="7" fill="#ff5a00" />
              </g>
              <g className="body">
                <path d="M0,-62 L58,44 L-58,44 Z"
                      fill="#ff5a00" stroke="#ff5a00" strokeWidth="18" strokeLinejoin="round" />
              </g>
              <g className="face">
                <g className="eyes">
                  <g className="dots" fill="#0D0D0D">
                    <circle cx="-16" cy="-6" r="5.5" />
                    <circle cx="16" cy="-6" r="5.5" />
                  </g>
                  <g className="happy" stroke="#0D0D0D" strokeWidth="3.5" strokeLinecap="round" fill="none">
                    <path d="M-22,-6 Q-16,-13 -10,-6" />
                    <path d="M10,-6 Q16,-13 22,-6" />
                  </g>
                </g>
                <g className="mouth">
                  <g className="mouth-normal">
                    <path d="M-20,16 Q0,32 20,16 L20,24 Q0,38 -20,24 Z" fill="#0D0D0D" />
                    <rect x="-9" y="19" width="7" height="7" rx="1.5" fill="#FAFAFA" />
                    <rect x="2" y="19" width="7" height="7" rx="1.5" fill="#FAFAFA" />
                  </g>
                  <path className="mouth-happy" d="M-22,14 Q0,38 22,14 Q0,26 -22,14 Z" fill="#0D0D0D" />
                  <g className="mouth-laugh" opacity="0">
                    <ellipse cx="0" cy="24" rx="14" ry="12" fill="#0D0D0D" />
                    <ellipse cx="0" cy="29" rx="7" ry="5" fill="#ff0a8a" />
                  </g>
                </g>
              </g>
              <g className="legs" stroke="#0D0D0D" strokeWidth="8" strokeLinecap="round">
                <line x1="-22" y1="44" x2="-22" y2="66" />
                <line x1="22" y1="44" x2="22" y2="66" />
                <ellipse cx="-22" cy="68" rx="10" ry="6" fill="#0D0D0D" stroke="none" />
                <ellipse cx="22" cy="68" rx="10" ry="6" fill="#0D0D0D" stroke="none" />
              </g>
            </g>
          </g>

          {/* 4. CIRCLE (purple light) — center front, big laugh */}
          <g id="char-circle" className="lc-char" data-cx="450" data-cy="410"
             style={{ "--rise-delay": "0.45s", "--idle-anim": "lc-breathe", "--idle-d": "3.8s", "--idle-delay": "1.2s" } as React.CSSProperties}>
            <g transform="translate(450, 410)">
              <g className="arms">
                <line x1="-62" y1="-6" x2="-84" y2="14" stroke="#A58CF4" strokeWidth="10" strokeLinecap="round" />
                <circle cx="-84" cy="14" r="8" fill="#A58CF4" />
                <line x1="62" y1="-6" x2="84" y2="14" stroke="#A58CF4" strokeWidth="10" strokeLinecap="round" />
                <circle cx="84" cy="14" r="8" fill="#A58CF4" />
              </g>
              <g className="body">
                <circle cx="0" cy="0" r="72" fill="#A58CF4" />
              </g>
              <g className="face">
                <g className="eyes">
                  <g className="dots" fill="#0D0D0D">
                    <circle cx="-22" cy="-18" r="7" />
                    <circle cx="22" cy="-18" r="7" />
                  </g>
                  <g className="happy" stroke="#0D0D0D" strokeWidth="4" strokeLinecap="round" fill="none">
                    <path d="M-30,-18 Q-22,-27 -14,-18" />
                    <path d="M14,-18 Q22,-27 30,-18" />
                  </g>
                </g>
                <g className="mouth">
                  <g className="mouth-normal">
                    <ellipse cx="0" cy="22" rx="20" ry="17" fill="#0D0D0D" />
                    <ellipse cx="0" cy="30" rx="10" ry="7" fill="#ff0a8a" />
                  </g>
                  <path className="mouth-happy" d="M-24,16 Q0,48 24,16 Q0,32 -24,16 Z" fill="#0D0D0D" />
                  <g className="mouth-laugh" opacity="0">
                    <ellipse cx="0" cy="24" rx="24" ry="20" fill="#0D0D0D" />
                    <ellipse cx="0" cy="33" rx="12" ry="8" fill="#ff0a8a" />
                  </g>
                </g>
              </g>
            </g>
          </g>

          {/* 5. SQUARE (soft white) — front right, calm, arms crossed */}
          <g id="char-square" className="lc-char" data-cx="680" data-cy="410"
             style={{ "--rise-delay": "0.54s", "--idle-anim": "lc-tilt", "--idle-d": "4.5s", "--idle-delay": "1.3s" } as React.CSSProperties}>
            <g transform="translate(680, 415) rotate(2)">
              <g className="body">
                <rect x="-58" y="-58" width="116" height="116" rx="28" fill="#FAFAFA" />
              </g>
              <g className="arms">
                {/* crossed arms */}
                <line x1="-46" y1="6" x2="30" y2="-8" stroke="#0D0D0D" strokeWidth="9" strokeLinecap="round" />
                <line x1="46" y1="6" x2="-30" y2="-8" stroke="#0D0D0D" strokeWidth="9" strokeLinecap="round" />
                <circle cx="32" cy="-8" r="7" fill="#0D0D0D" />
                <circle cx="-32" cy="-8" r="7" fill="#0D0D0D" />
              </g>
              <g className="face">
                <g className="eyes">
                  <g className="dots" fill="#0D0D0D">
                    <circle cx="-20" cy="-16" r="5.5" />
                    <circle cx="20" cy="-16" r="5.5" />
                  </g>
                  <g className="happy" stroke="#0D0D0D" strokeWidth="3.5" strokeLinecap="round" fill="none">
                    <path d="M-26,-16 Q-20,-23 -14,-16" />
                    <path d="M14,-16 Q20,-23 26,-16" />
                  </g>
                </g>
                <g className="mouth">
                  <path className="mouth-normal" d="M-12,16 Q0,22 12,16" stroke="#0D0D0D" strokeWidth="3.5" fill="none" strokeLinecap="round" />
                  <path className="mouth-happy" d="M-16,14 Q0,30 16,14" stroke="#0D0D0D" strokeWidth="3.5" fill="none" strokeLinecap="round" />
                  <g className="mouth-laugh" opacity="0">
                    <ellipse cx="0" cy="20" rx="12" ry="10" fill="#0D0D0D" />
                  </g>
                </g>
              </g>
              <g className="legs" stroke="#0D0D0D" strokeWidth="8" strokeLinecap="round">
                <line x1="-24" y1="58" x2="-24" y2="76" />
                <line x1="24" y1="58" x2="24" y2="76" />
              </g>
            </g>
          </g>
        </svg>
      </div>
    </section>
  );
}
