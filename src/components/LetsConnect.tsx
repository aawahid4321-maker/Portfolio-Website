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

    // eyes follow cursor (dots shift up to 3px, skip on touch)
    const isTouch = window.matchMedia("(pointer: coarse)").matches;
    const onMouseMove = (e: MouseEvent) => {
      if (isTouch || reduceMotion) return;
      const r = section.getBoundingClientRect();
      const mx = e.clientX - r.left, my = e.clientY - r.top;
      const scaleX = r.width / 900, scaleY = r.height / 520;
      chars.forEach((ch) => {
        const eyes = ch.querySelector<SVGGElement>(".lc-eyes");
        if (!eyes || ch.id === "char-star") return; // star's closed eyes don't follow
        const cx = Number(ch.dataset.cx || 0) * scaleX;
        const cy = Number(ch.dataset.cy || 0) * scaleY;
        const dx = Math.max(-3, Math.min(3, (mx - cx) * 0.02));
        const dy = Math.max(-3, Math.min(3, (my - cy) * 0.02));
        (eyes as SVGGElement).style.transform = `translate(${dx}px, ${dy}px)`;
      });
    };
    if (!isTouch) window.addEventListener("mousemove", onMouseMove);

    // scroll parallax: characters drift at different depths (transform only, rAF-throttled)
    const shifts = Array.from(section.querySelectorAll<SVGGElement>(".scroll-shift"));
    let parallaxTicking = false;
    const onScrollParallax = () => {
      if (parallaxTicking || reduceMotion) return;
      parallaxTicking = true;
      requestAnimationFrame(() => {
        parallaxTicking = false;
        const r = section.getBoundingClientRect();
        // progress: positive when section is below viewport center, negative above
        const progress = (window.innerHeight / 2 - (r.top + r.height / 2)) / window.innerHeight;
        shifts.forEach((el) => {
          const depth = parseFloat(el.dataset.depth || "0.3");
          // back characters (low depth) move less, front characters move more
          el.style.transform = `translateY(${(progress * 70 * depth).toFixed(1)}px)`;
        });
      });
    };
    window.addEventListener("scroll", onScrollParallax, { passive: true });
    // run once on init so characters start at the right offset
    onScrollParallax();
    cleanups.push(() => window.removeEventListener("scroll", onScrollParallax));

    // hover: jump + bigger expression, neighbors lean away 6px
    chars.forEach((ch) => {
      const onEnter = () => {
        if (reduceMotion) return;
        ch.classList.add("is-happy");
        chars.forEach((other) => {
          if (other === ch) return;
          const ox = Number(other.dataset.cx || 0) - Number(ch.dataset.cx || 0);
          other.style.setProperty("--nudge-x", ox > 0 ? "6px" : "-6px");
          other.classList.add("is-nudged");
          window.setTimeout(() => other.classList.remove("is-nudged"), 450);
        });
      };
      const onLeave = () => ch.classList.remove("is-happy");
      const onClick = () => {
        if (reduceMotion) return;
        // happy wiggle + sparkles pop
        ch.classList.add("is-wiggle", "is-sparkling");
        window.setTimeout(() => ch.classList.remove("is-wiggle"), 600);
        window.setTimeout(() => ch.classList.remove("is-sparkling"), 750);
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
        /* characters: paper-cutout + ink line style, visible by default; hidden start only via .is-ready */
        #connect .lc-char {
          transform-box: fill-box;
          transform-origin: bottom center;
          cursor: pointer;
        }
        #connect.is-ready .lc-char { transform: scaleY(0.5); opacity: 0; }
        #connect.is-ready.is-visible .lc-char {
          animation:
            lc-rise 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards,
            var(--idle-anim, lc-breathe) var(--idle-d, 4s) ease-in-out var(--idle-delay, 0s) infinite;
          animation-delay: var(--rise-delay, 0s), calc(var(--rise-delay, 0s) + 0.8s);
        }
        #connect.is-fallback .lc-char { animation: none; transform: scaleY(1); opacity: 1; }
        /* entrance: squash-and-stretch pop from the ground */
        @keyframes lc-rise {
          0% { transform: scaleY(0.5) scaleX(1.25); opacity: 0; }
          55% { transform: scaleY(1.12) scaleX(0.92); opacity: 1; }
          75% { transform: scaleY(0.96) scaleX(1.03); opacity: 1; }
          100% { transform: scaleY(1) scaleX(1); opacity: 1; }
        }
        /* idle: each character its own rhythm (3-5s, different delays) */
        @keyframes lc-breathe { /* circle: breathe + slight bounce */
          0%, 100% { transform: scaleY(1) translateY(0); }
          50% { transform: scaleY(1.03) translateY(-4px); }
        }
        @keyframes lc-shy-sway { /* square: shy side-to-side sway */
          0%, 100% { transform: rotate(-2.5deg) translateX(-4px); }
          50% { transform: rotate(2.5deg) translateX(4px); }
        }
        @keyframes lc-giggle { /* star: giggling shake */
          0%, 100% { transform: rotate(-5deg) scale(1); }
          50% { transform: rotate(5deg) scale(1.04); }
        }
        @keyframes lc-think { /* rectangle: subtle lean, foot taps separately */
          0%, 100% { transform: rotate(-1.5deg); }
          50% { transform: rotate(1.5deg); }
        }
        /* sun: both arms wave (transform-box on the arm groups) */
        #connect .lc-char .sun-arm-l, #connect .lc-char .sun-arm-r {
          transform-box: fill-box; transform-origin: bottom center;
          animation: lc-arm-wave 3s ease-in-out infinite;
        }
        #connect .lc-char .sun-arm-r { animation-delay: 0.4s; }
        @keyframes lc-arm-wave {
          0%, 100% { transform: rotate(-12deg); }
          50% { transform: rotate(14deg); }
        }
        /* triangle: cupped hand bobs up and down */
        #connect .lc-char .tri-cup-hand {
          transform-box: fill-box; transform-origin: bottom center;
          animation: lc-cup-bob 3.5s ease-in-out infinite;
        }
        @keyframes lc-cup-bob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-7px); }
        }
        /* rectangle: one foot taps */
        #connect .lc-char .rect-tap-foot {
          transform-box: fill-box; transform-origin: top center;
          animation: lc-foot-tap 4.2s ease-in-out infinite;
        }
        @keyframes lc-foot-tap {
          0%, 88%, 100% { transform: rotate(0); }
          92% { transform: rotate(-14deg); }
          96% { transform: rotate(0); }
        }
        /* feet squash a little on landing during bounce */
        #connect .lc-char .feet {
          transform-box: fill-box; transform-origin: bottom center;
        }
        #connect.is-ready.is-visible #char-circle .feet {
          animation: lc-feet-squash 4s ease-in-out 0.8s infinite;
        }
        @keyframes lc-feet-squash {
          0%, 44%, 56%, 100% { transform: scaleY(1); }
          50% { transform: scaleY(0.9); }
        }
        #connect.is-paused .lc-char,
        #connect.is-paused .lc-char .sun-arm-l,
        #connect.is-paused .lc-char .sun-arm-r,
        #connect.is-paused .lc-char .tri-cup-hand,
        #connect.is-paused .lc-char .rect-tap-foot,
        #connect.is-paused #char-circle .feet { animation-play-state: paused; }

        /* eyes: blink (dot eyes scaleY), star's closed eyes don't blink */
        #connect .lc-eyes { transition: transform 0.15s ease-out; }
        #connect .lc-eyes .dots { transition: transform 0.12s ease; transform-box: fill-box; transform-origin: center; }
        #connect .lc-eyes.is-blinking .dots { transform: scaleY(0.1); }
        /* hover: jump 18px + squash landing, expression gets bigger */
        #connect .lc-char.is-happy { animation: lc-jump 0.55s cubic-bezier(0.34, 1.56, 0.64, 1); }
        @keyframes lc-jump {
          0% { transform: translateY(0) scaleY(1); }
          40% { transform: translateY(-18px) scaleY(1.06); }
          70% { transform: translateY(0) scaleY(0.9); } /* feet squash on landing */
          100% { transform: translateY(0) scaleY(1); }
        }
        #connect .lc-eyes .happy { opacity: 0; transition: opacity 0.15s ease; }
        #connect .lc-char.is-happy .lc-eyes .happy { opacity: 1; }
        #connect .lc-char.is-happy .lc-eyes .dots { opacity: 0; }
        #connect .lc-char.is-happy .mouth-normal { opacity: 0; }
        #connect .lc-char.is-happy .mouth-happy { opacity: 1; }
        #connect .mouth-happy { opacity: 0; transition: opacity 0.15s ease; }
        #connect .mouth-normal { transition: opacity 0.15s ease; }
        /* click: happy wiggle + sparkles */
        #connect .lc-char.is-wiggle { animation: lc-wiggle 0.6s ease; }
        @keyframes lc-wiggle {
          0%, 100% { transform: rotate(0); }
          25% { transform: rotate(-8deg); }
          50% { transform: rotate(8deg); }
          75% { transform: rotate(-4deg); }
        }
        #connect .lc-char.is-nudged { animation: lc-nudge 0.4s ease; }
        @keyframes lc-nudge {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(var(--nudge-x, 6px)); }
        }
        /* click sparkles: 4-point, yellow/pink, pop and fade in 700ms */
        #connect .click-sparkles { opacity: 0; pointer-events: none; }
        #connect .lc-char.is-sparkling .click-sparkles { animation: lc-sparkle-pop 0.7s ease-out; }
        @keyframes lc-sparkle-pop {
          0% { opacity: 0; transform: scale(0.3); }
          30% { opacity: 1; transform: scale(1.15); }
          100% { opacity: 0; transform: scale(0.9) translateY(-10px); }
        }
        #connect .click-sparkles > * { transform-box: fill-box; transform-origin: center; }
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

        /* mobile: scale group to fit; hide sun + rectangle on small screens if crowded */
        @media (max-width: 768px) {
          #connect .lc-stage { width: 100vw; height: 35vh; }
          #connect #char-sun, #connect #char-rect { display: none; }
        }

        @media (prefers-reduced-motion: reduce) {
          #connect.is-ready .lc-char, #connect .lc-char { animation: none; transform: scaleY(1); opacity: 1; }
          #connect .lc-char .sun-arm-l, #connect .lc-char .sun-arm-r,
          #connect .lc-char .tri-cup-hand, #connect .lc-char .rect-tap-foot { animation: none; }
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
      {/* CONTACT link removed per user request */}

      <div className="lc-stage">
        <svg viewBox="0 0 900 520" role="img" aria-label="A group of friendly cartoon shape characters standing together">
          {/* ground: soft band + contact shadows under each pair of feet */}
          <rect x="60" y="486" width="780" height="16" rx="8" fill="rgba(165,140,244,0.12)" />
          <g fill="rgba(165,140,244,0.18)">
            <ellipse cx="170" cy="491" rx="48" ry="6" />
            <ellipse cx="300" cy="491" rx="48" ry="6" />
            <ellipse cx="480" cy="491" rx="58" ry="6" />
            <ellipse cx="660" cy="491" rx="48" ry="6" />
            <ellipse cx="790" cy="491" rx="42" ry="6" />
          </g>
          <g fill="rgba(255,255,255,0.25)">
            <circle className="lc-sparkle" cx="120" cy="120" r="4" style={{ animationDelay: "0s" }} />
            <circle className="lc-sparkle" cx="780" cy="90" r="5" style={{ animationDelay: "1.5s" }} />
            <circle className="lc-sparkle" cx="700" cy="200" r="3" style={{ animationDelay: "3s" }} />
            <circle className="lc-sparkle" cx="180" cy="260" r="3.5" style={{ animationDelay: "2s" }} />
          </g>

          {/* ══ 1. SUN (Orange #ff5a00) — back left, cheerful waving ══ */}
                    {/* scale group: characters 15% bigger, from ground center */}
          <g transform="translate(450, 495) scale(1.4) translate(-450, -495)">
<g id="char-sun" className="lc-char" data-cx="170" data-cy="395"
             style={{ "--rise-delay": "0s", "--idle-anim": "lc-breathe", "--idle-d": "3.5s", "--idle-delay": "0.8s" } as React.CSSProperties}>
                        <g className="scroll-shift" data-depth="0.25">
<g transform="translate(170, 395)">
              <g className="body">
                <path d="M0,-62 L14,-34 L42,-48 L34,-18 L62,-14 L36,0 L62,14 L34,18 L42,48 L14,34 L0,62 L-14,34 L-42,48 L-34,18 L-62,14 L-36,0 L-62,-14 L-34,-18 L-42,-48 L-14,-34 Z"
                      fill="#ff5a00" stroke="#ff5a00" strokeWidth="10" strokeLinejoin="round" />
              </g>
              <g className="face">
                <g className="eyes">
                  <g className="dots" fill="#0D0D0D">
                    <circle cx="-16" cy="-10" r="3.5" />
                    <circle cx="16" cy="-10" r="3.5" />
                  </g>
                  <g className="happy" stroke="#0D0D0D" strokeWidth="2.5" strokeLinecap="round" fill="none">
                    <path d="M-21,-10 Q-16,-16 -11,-10" />
                    <path d="M11,-10 Q16,-16 21,-10" />
                  </g>
                </g>
                <g className="mouth">
                  <path className="mouth-normal" d="M-20,12 Q0,28 20,12" stroke="#0D0D0D" strokeWidth="3" fill="none" strokeLinecap="round" />
                  <path className="mouth-happy" d="M-24,10 Q0,34 24,10" stroke="#0D0D0D" strokeWidth="3.5" fill="none" strokeLinecap="round" />
                </g>
              </g>
              <g className="arms">
                {/* left arm raised high waving */}
                <g className="sun-arm-l">
                  <line x1="-42" y1="-18" x2="-66" y2="-62" stroke="#ff5a00" strokeWidth="11" strokeLinecap="round" />
                  <circle cx="-66" cy="-62" r="8" fill="#ff5a00" />
                  <g stroke="#0D0D0D" strokeWidth="2" strokeLinecap="round">
                    <line x1="-70" y1="-68" x2="-74" y2="-74" />
                    <line x1="-64" y1="-70" x2="-66" y2="-77" />
                  </g>
                </g>
                {/* right arm waving to the side */}
                <g className="sun-arm-r">
                  <line x1="42" y1="0" x2="72" y2="-14" stroke="#ff5a00" strokeWidth="11" strokeLinecap="round" />
                  <circle cx="72" cy="-14" r="8" fill="#ff5a00" />
                  <g stroke="#0D0D0D" strokeWidth="2" strokeLinecap="round">
                    <line x1="76" y1="-20" x2="82" y2="-24" />
                    <line x1="78" y1="-14" x2="85" y2="-16" />
                  </g>
                </g>
              </g>
              <g className="legs" stroke="#ff5a00" strokeWidth="12" strokeLinecap="round">
                <line x1="-18" y1="55" x2="-18" y2="80" />
                <line x1="18" y1="55" x2="18" y2="80" />
              </g>
              <g className="feet">
                <g transform="translate(-18, 86) rotate(-8)">
                  <path d="M-16,-14 L8,-14 Q16,-14 16,-6 L16,0 L-16,0 Z" fill="#ff5a00" />
                  <line x1="-16" y1="-5" x2="16" y2="-5" stroke="#0D0D0D" strokeWidth="2" />
                </g>
                <g transform="translate(18, 86) rotate(8)">
                  <path d="M-8,-14 L16,-14 Q16,-14 16,-6 L16,0 L-16,0 L-16,-6 Q-16,-14 -8,-14 Z" fill="#ff5a00" />
                  <line x1="-16" y1="-5" x2="16" y2="-5" stroke="#0D0D0D" strokeWidth="2" />
                </g>
              </g>
              <g className="click-sparkles">
                <path d="M0,-7 L2,-2 L7,0 L2,2 L0,7 L-2,2 L-7,0 L-2,-2 Z" fill="#ffd60a" transform="translate(-50,-50)" />
                <path d="M0,-7 L2,-2 L7,0 L2,2 L0,7 L-2,2 L-7,0 L-2,-2 Z" fill="#ff0a8a" transform="translate(50,-60)" />
                <path d="M0,-7 L2,-2 L7,0 L2,2 L0,7 L-2,2 L-7,0 L-2,-2 Z" fill="#ffd60a" transform="translate(55,25)" />
                <path d="M0,-7 L2,-2 L7,0 L2,2 L0,7 L-2,2 L-7,0 L-2,-2 Z" fill="#ff0a8a" transform="translate(-55,20)" />
              </g>
            </g>
                    </g>
</g>

          {/* ══ 2. TRIANGLE (Yellow #ffd60a) — front left, shouting with excitement ══ */}
          <g id="char-triangle" className="lc-char" data-cx="300" data-cy="415"
             style={{ "--rise-delay": "0.1s", "--idle-anim": "lc-breathe", "--idle-d": "4s", "--idle-delay": "0.9s" } as React.CSSProperties}>
                        <g className="scroll-shift" data-depth="0.5">
<g transform="translate(300, 415)">
              <g className="body">
                <path d="M0,-65 L58,45 L-58,45 Z"
                      fill="#ffd60a" stroke="#ffd60a" strokeWidth="16" strokeLinejoin="round" />
              </g>
              <g className="face">
                <g className="brows" stroke="#0D0D0D" strokeWidth="2.5" strokeLinecap="round" fill="none">
                  <path d="M-22,-30 Q-14,-34 -6,-30" />
                  <path d="M6,-30 Q14,-34 22,-30" />
                </g>
                <g className="eyes">
                  <g className="dots" fill="#0D0D0D">
                    <circle cx="-14" cy="-14" r="3.5" />
                    <circle cx="14" cy="-14" r="3.5" />
                  </g>
                  <g className="happy" stroke="#0D0D0D" strokeWidth="2.5" strokeLinecap="round" fill="none">
                    <path d="M-19,-14 Q-14,-20 -9,-14" />
                    <path d="M9,-14 Q14,-20 19,-14" />
                  </g>
                </g>
                <g className="mouth">
                  <ellipse className="mouth-normal" cx="0" cy="16" rx="9" ry="11" fill="none" stroke="#0D0D0D" strokeWidth="3" />
                  <ellipse className="mouth-happy" cx="0" cy="16" rx="13" ry="15" fill="none" stroke="#0D0D0D" strokeWidth="3.5" />
                  {/* sound lines */}
                  <g stroke="#0D0D0D" strokeWidth="2" strokeLinecap="round" opacity="0.7">
                    <line x1="28" y1="6" x2="36" y2="2" />
                    <line x1="32" y1="16" x2="41" y2="16" />
                    <line x1="28" y1="26" x2="36" y2="30" />
                  </g>
                </g>
              </g>
              <g className="arms">
                {/* right hand cupped next to mouth (calling out) */}
                <g className="tri-cup-hand">
                  <line x1="38" y1="8" x2="26" y2="-2" stroke="#ffd60a" strokeWidth="11" strokeLinecap="round" />
                  <circle cx="24" cy="-4" r="8" fill="#ffd60a" />
                  <g stroke="#0D0D0D" strokeWidth="2" strokeLinecap="round">
                    <line x1="20" y1="-10" x2="18" y2="-16" />
                    <line x1="26" y1="-11" x2="26" y2="-17" />
                  </g>
                </g>
                {/* left arm down */}
                <line x1="-38" y1="12" x2="-52" y2="32" stroke="#ffd60a" strokeWidth="11" strokeLinecap="round" />
                <circle cx="-52" cy="32" r="8" fill="#ffd60a" />
              </g>
              <g className="legs" stroke="#ffd60a" strokeWidth="12" strokeLinecap="round">
                <line x1="-20" y1="40" x2="-20" y2="62" />
                <line x1="20" y1="40" x2="20" y2="62" />
              </g>
              <g className="feet">
                <g transform="translate(-20, 68) rotate(-8)">
                  <path d="M-16,-14 L8,-14 Q16,-14 16,-6 L16,0 L-16,0 Z" fill="#ffd60a" />
                  <line x1="-16" y1="-5" x2="16" y2="-5" stroke="#0D0D0D" strokeWidth="2" />
                </g>
                <g transform="translate(20, 68) rotate(8)">
                  <path d="M-8,-14 L16,-14 Q16,-14 16,-6 L16,0 L-16,0 L-16,-6 Q-16,-14 -8,-14 Z" fill="#ffd60a" />
                  <line x1="-16" y1="-5" x2="16" y2="-5" stroke="#0D0D0D" strokeWidth="2" />
                </g>
              </g>
              <g className="click-sparkles">
                <path d="M0,-7 L2,-2 L7,0 L2,2 L0,7 L-2,2 L-7,0 L-2,-2 Z" fill="#ff0a8a" transform="translate(-50,-45)" />
                <path d="M0,-7 L2,-2 L7,0 L2,2 L0,7 L-2,2 L-7,0 L-2,-2 Z" fill="#ffd60a" transform="translate(50,-55)" />
                <path d="M0,-7 L2,-2 L7,0 L2,2 L0,7 L-2,2 L-7,0 L-2,-2 Z" fill="#ff0a8a" transform="translate(55,30)" />
                <path d="M0,-7 L2,-2 L7,0 L2,2 L0,7 L-2,2 L-7,0 L-2,-2 Z" fill="#ffd60a" transform="translate(-55,25)" />
              </g>
            </g>
                    </g>
</g>

          {/* ══ 3. CIRCLE (Purple Light #A58CF4) — center front, happy and content ══ */}
          <g id="char-circle" className="lc-char" data-cx="480" data-cy="403"
             style={{ "--rise-delay": "0.2s", "--idle-anim": "lc-breathe", "--idle-d": "3.8s", "--idle-delay": "1s" } as React.CSSProperties}>
                        <g className="scroll-shift" data-depth="0.6">
<g transform="translate(480, 403)">
              <g className="body">
                <circle cx="0" cy="0" r="68" fill="#A58CF4" />
              </g>
              <g className="face">
                <g className="eyes">
                  <g className="dots" fill="#0D0D0D">
                    <circle cx="-20" cy="-15" r="3.5" />
                    <circle cx="20" cy="-15" r="3.5" />
                  </g>
                  <g className="happy" stroke="#0D0D0D" strokeWidth="2.5" strokeLinecap="round" fill="none">
                    <path d="M-25,-15 Q-20,-21 -15,-15" />
                    <path d="M15,-15 Q20,-21 25,-15" />
                  </g>
                </g>
                <g className="mouth">
                  <path className="mouth-normal" d="M-28,12 Q0,34 28,12" stroke="#0D0D0D" strokeWidth="3" fill="none" strokeLinecap="round" />
                  <path className="mouth-happy" d="M-32,10 Q0,40 32,10" stroke="#0D0D0D" strokeWidth="3.5" fill="none" strokeLinecap="round" />
                </g>
                {/* blush */}
                <ellipse cx="-34" cy="2" rx="7" ry="5" fill="rgba(255,10,138,0.3)" />
                <ellipse cx="34" cy="2" rx="7" ry="5" fill="rgba(255,10,138,0.3)" />
              </g>
              <g className="arms">
                {/* right hand resting on belly */}
                <line x1="52" y1="12" x2="30" y2="36" stroke="#A58CF4" strokeWidth="11" strokeLinecap="round" />
                <circle cx="28" cy="38" r="8" fill="#A58CF4" />
                <g stroke="#0D0D0D" strokeWidth="2" strokeLinecap="round">
                  <line x1="24" y1="32" x2="20" y2="28" />
                  <line x1="30" y1="32" x2="28" y2="27" />
                </g>
                {/* left arm relaxed */}
                <line x1="-52" y1="8" x2="-68" y2="28" stroke="#A58CF4" strokeWidth="11" strokeLinecap="round" />
                <circle cx="-68" cy="28" r="8" fill="#A58CF4" />
              </g>
              <g className="legs" stroke="#A58CF4" strokeWidth="12" strokeLinecap="round">
                <line x1="-22" y1="60" x2="-22" y2="76" />
                <line x1="22" y1="60" x2="22" y2="76" />
              </g>
              <g className="feet">
                <g transform="translate(-22, 82) rotate(-8)">
                  <path d="M-16,-14 L8,-14 Q16,-14 16,-6 L16,0 L-16,0 Z" fill="#A58CF4" />
                  <line x1="-16" y1="-5" x2="16" y2="-5" stroke="#0D0D0D" strokeWidth="2" />
                </g>
                <g transform="translate(22, 82) rotate(8)">
                  <path d="M-8,-14 L16,-14 Q16,-14 16,-6 L16,0 L-16,0 L-16,-6 Q-16,-14 -8,-14 Z" fill="#A58CF4" />
                  <line x1="-16" y1="-5" x2="16" y2="-5" stroke="#0D0D0D" strokeWidth="2" />
                </g>
              </g>
              <g className="click-sparkles">
                <path d="M0,-7 L2,-2 L7,0 L2,2 L0,7 L-2,2 L-7,0 L-2,-2 Z" fill="#ffd60a" transform="translate(-55,-50)" />
                <path d="M0,-7 L2,-2 L7,0 L2,2 L0,7 L-2,2 L-7,0 L-2,-2 Z" fill="#ff0a8a" transform="translate(55,-55)" />
                <path d="M0,-7 L2,-2 L7,0 L2,2 L0,7 L-2,2 L-7,0 L-2,-2 Z" fill="#ffd60a" transform="translate(60,30)" />
                <path d="M0,-7 L2,-2 L7,0 L2,2 L0,7 L-2,2 L-7,0 L-2,-2 Z" fill="#ff0a8a" transform="translate(-60,25)" />
              </g>
            </g>
                    </g>
</g>

          {/* ══ 4. STAR (Amber #ff9f0a) — on circle's head, giggling ══ */}
          <g id="char-star" className="lc-char" data-cx="480" data-cy="295"
             style={{ "--rise-delay": "0.3s", "--idle-anim": "lc-giggle", "--idle-d": "3.2s", "--idle-delay": "1.1s" } as React.CSSProperties}>
                        <g className="scroll-shift" data-depth="0.65">
<g transform="translate(480, 295)">
              <g className="body">
                <path d="M0,-42 L12,-14 L40,-14 L18,4 L26,32 L0,16 L-26,32 L-18,4 L-40,-14 L-12,-14 Z"
                      fill="#ff9f0a" stroke="#ff9f0a" strokeWidth="10" strokeLinejoin="round" />
              </g>
              <g className="face">
                <g className="eyes">
                  {/* closed ^ ^ giggling eyes — no dots, doesn't blink */}
                  <g stroke="#0D0D0D" strokeWidth="2.5" strokeLinecap="round" fill="none">
                    <path d="M-20,-8 Q-14,-15 -8,-8" />
                    <path d="M8,-8 Q14,-15 20,-8" />
                  </g>
                </g>
                <g className="mouth">
                  <path className="mouth-normal" d="M-10,8 Q0,20 10,8 Q0,14 -10,8 Z" fill="none" stroke="#0D0D0D" strokeWidth="2.5" />
                  <path className="mouth-happy" d="M-14,6 Q0,24 14,6 Q0,16 -14,6 Z" fill="none" stroke="#0D0D0D" strokeWidth="3" />
                </g>
                {/* blush */}
                <ellipse cx="-26" cy="0" rx="6" ry="4" fill="rgba(255,10,138,0.3)" />
                <ellipse cx="26" cy="0" rx="6" ry="4" fill="rgba(255,10,138,0.3)" />
              </g>
              <g className="arms">
                {/* both hands on cheeks */}
                <line x1="-28" y1="8" x2="-20" y2="-2" stroke="#ff9f0a" strokeWidth="10" strokeLinecap="round" />
                <circle cx="-19" cy="-3" r="7" fill="#ff9f0a" />
                <line x1="28" y1="8" x2="20" y2="-2" stroke="#ff9f0a" strokeWidth="10" strokeLinecap="round" />
                <circle cx="19" cy="-3" r="7" fill="#ff9f0a" />
              </g>
              <g className="legs" stroke="#ff9f0a" strokeWidth="10" strokeLinecap="round">
                <line x1="-12" y1="30" x2="-12" y2="38" />
                <line x1="12" y1="30" x2="12" y2="38" />
              </g>
              <g className="feet">
                {/* feet rest on the circle's head */}
                <g transform="translate(-12, 40)">
                  <path d="M-12,-8 L6,-8 Q12,-8 12,-3 L12,0 L-12,0 Z" fill="#ff9f0a" />
                </g>
                <g transform="translate(12, 40)">
                  <path d="M-6,-8 L12,-8 Q12,-8 12,-3 L12,0 L-12,0 L-12,-3 Q-12,-8 -6,-8 Z" fill="#ff9f0a" />
                </g>
              </g>
              <g className="click-sparkles">
                <path d="M0,-7 L2,-2 L7,0 L2,2 L0,7 L-2,2 L-7,0 L-2,-2 Z" fill="#ffd60a" transform="translate(-40,-35)" />
                <path d="M0,-7 L2,-2 L7,0 L2,2 L0,7 L-2,2 L-7,0 L-2,-2 Z" fill="#ff0a8a" transform="translate(40,-40)" />
                <path d="M0,-7 L2,-2 L7,0 L2,2 L0,7 L-2,2 L-7,0 L-2,-2 Z" fill="#ffd60a" transform="translate(42,25)" />
              </g>
            </g>
                    </g>
</g>

          {/* ══ 5. SQUARE (Pink #ff0a8a) — front right, shy and sweet ══ */}
          <g id="char-square" className="lc-char" data-cx="660" data-cy="413"
             style={{ "--rise-delay": "0.4s", "--idle-anim": "lc-shy-sway", "--idle-d": "4.5s", "--idle-delay": "1.2s" } as React.CSSProperties}>
                        <g className="scroll-shift" data-depth="0.5">
<g transform="translate(660, 413)">
              <g className="body">
                <rect x="-57" y="-57" width="114" height="114" rx="28" fill="#ff0a8a" />
              </g>
              <g className="face">
                <g className="eyes">
                  {/* eyes looking sideways (shy) */}
                  <g className="dots" fill="#0D0D0D">
                    <circle cx="-16" cy="-12" r="3.5" />
                    <circle cx="24" cy="-12" r="3.5" />
                  </g>
                  <g className="happy" stroke="#0D0D0D" strokeWidth="2.5" strokeLinecap="round" fill="none">
                    <path d="M-21,-12 Q-16,-18 -11,-12" />
                    <path d="M19,-12 Q24,-18 29,-12" />
                  </g>
                </g>
                <g className="mouth">
                  <path className="mouth-normal" d="M-10,16 Q0,21 10,16" stroke="#0D0D0D" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                  <path className="mouth-happy" d="M-14,14 Q0,26 14,14" stroke="#0D0D0D" strokeWidth="3" fill="none" strokeLinecap="round" />
                </g>
              </g>
              <g className="arms">
                {/* both hands clasped in front */}
                <line x1="-44" y1="16" x2="-12" y2="36" stroke="#ff0a8a" strokeWidth="11" strokeLinecap="round" />
                <line x1="44" y1="16" x2="12" y2="36" stroke="#ff0a8a" strokeWidth="11" strokeLinecap="round" />
                <circle cx="0" cy="38" r="9" fill="#ff0a8a" />
                <g stroke="#0D0D0D" strokeWidth="2" strokeLinecap="round">
                  <line x1="-6" y1="34" x2="-6" y2="42" />
                  <line x1="0" y1="33" x2="0" y2="42" />
                  <line x1="6" y1="34" x2="6" y2="42" />
                </g>
              </g>
              <g className="legs" stroke="#ff0a8a" strokeWidth="12" strokeLinecap="round">
                <line x1="-24" y1="50" x2="-24" y2="66" />
                <line x1="24" y1="50" x2="24" y2="66" />
              </g>
              <g className="feet">
                <g transform="translate(-24, 72) rotate(-8)">
                  <path d="M-16,-14 L8,-14 Q16,-14 16,-6 L16,0 L-16,0 Z" fill="#ff0a8a" />
                  <line x1="-16" y1="-5" x2="16" y2="-5" stroke="#0D0D0D" strokeWidth="2" />
                </g>
                <g transform="translate(24, 72) rotate(8)">
                  <path d="M-8,-14 L16,-14 Q16,-14 16,-6 L16,0 L-16,0 L-16,-6 Q-16,-14 -8,-14 Z" fill="#ff0a8a" />
                  <line x1="-16" y1="-5" x2="16" y2="-5" stroke="#0D0D0D" strokeWidth="2" />
                </g>
              </g>
              <g className="click-sparkles">
                <path d="M0,-7 L2,-2 L7,0 L2,2 L0,7 L-2,2 L-7,0 L-2,-2 Z" fill="#ffd60a" transform="translate(-50,-45)" />
                <path d="M0,-7 L2,-2 L7,0 L2,2 L0,7 L-2,2 L-7,0 L-2,-2 Z" fill="#ff0a8a" transform="translate(50,-50)" />
                <path d="M0,-7 L2,-2 L7,0 L2,2 L0,7 L-2,2 L-7,0 L-2,-2 Z" fill="#ffd60a" transform="translate(55,30)" />
                <path d="M0,-7 L2,-2 L7,0 L2,2 L0,7 L-2,2 L-7,0 L-2,-2 Z" fill="#ff0a8a" transform="translate(-55,25)" />
              </g>
            </g>
                    </g>
</g>

          {/* ══ 6. RECTANGLE (Soft White #FAFAFA) — back right, cool and thinking ══ */}
          <g id="char-rect" className="lc-char" data-cx="790" data-cy="393"
             style={{ "--rise-delay": "0.5s", "--idle-anim": "lc-think", "--idle-d": "4.8s", "--idle-delay": "1.3s" } as React.CSSProperties}>
                        <g className="scroll-shift" data-depth="0.25">
<g transform="translate(790, 393)">
              <g className="body">
                <rect x="-48" y="-80" width="96" height="160" rx="48" fill="#FAFAFA" />
              </g>
              <g className="face">
                <g className="brows" stroke="#0D0D0D" strokeWidth="2.5" strokeLinecap="round" fill="none">
                  {/* one eyebrow raised */}
                  <path d="M-24,-34 Q-16,-37 -8,-34" />
                  <path d="M8,-40 Q16,-44 24,-40" />
                </g>
                <g className="eyes">
                  <g className="dots" fill="#0D0D0D">
                    <circle cx="-16" cy="-18" r="3.5" />
                    <circle cx="16" cy="-18" r="3.5" />
                  </g>
                  <g className="happy" stroke="#0D0D0D" strokeWidth="2.5" strokeLinecap="round" fill="none">
                    <path d="M-21,-18 Q-16,-24 -11,-18" />
                    <path d="M11,-18 Q16,-24 21,-18" />
                  </g>
                </g>
                <g className="mouth">
                  <path className="mouth-normal" d="M-12,12 L12,12" stroke="#0D0D0D" strokeWidth="2.5" strokeLinecap="round" />
                  <path className="mouth-happy" d="M-14,10 Q0,20 14,10" stroke="#0D0D0D" strokeWidth="3" fill="none" strokeLinecap="round" />
                </g>
              </g>
              <g className="arms">
                {/* arms crossed over body with fold lines */}
                <line x1="-38" y1="22" x2="28" y2="12" stroke="#FAFAFA" strokeWidth="11" strokeLinecap="round" />
                <line x1="38" y1="22" x2="-28" y2="12" stroke="#FAFAFA" strokeWidth="11" strokeLinecap="round" />
                <circle cx="30" cy="12" r="8" fill="#FAFAFA" />
                <circle cx="-30" cy="12" r="8" fill="#FAFAFA" />
                <g stroke="#0D0D0D" strokeWidth="2" strokeLinecap="round" opacity="0.6">
                  <line x1="-10" y1="18" x2="-4" y2="26" />
                  <line x1="10" y1="18" x2="4" y2="26" />
                </g>
              </g>
              <g className="legs" stroke="#FAFAFA" strokeWidth="12" strokeLinecap="round">
                <line x1="-20" y1="72" x2="-20" y2="86" />
                <line x1="20" y1="72" x2="20" y2="86" />
              </g>
              <g className="feet">
                <g className="rect-tap-foot" transform="translate(-20, 92) rotate(-8)">
                  <path d="M-16,-14 L8,-14 Q16,-14 16,-6 L16,0 L-16,0 Z" fill="#FAFAFA" />
                  <line x1="-16" y1="-5" x2="16" y2="-5" stroke="#0D0D0D" strokeWidth="2" />
                </g>
                <g transform="translate(20, 92) rotate(8)">
                  <path d="M-8,-14 L16,-14 Q16,-14 16,-6 L16,0 L-16,0 L-16,-6 Q-16,-14 -8,-14 Z" fill="#FAFAFA" />
                  <line x1="-16" y1="-5" x2="16" y2="-5" stroke="#0D0D0D" strokeWidth="2" />
                </g>
              </g>
              <g className="click-sparkles">
                <path d="M0,-7 L2,-2 L7,0 L2,2 L0,7 L-2,2 L-7,0 L-2,-2 Z" fill="#ffd60a" transform="translate(-45,-60)" />
                <path d="M0,-7 L2,-2 L7,0 L2,2 L0,7 L-2,2 L-7,0 L-2,-2 Z" fill="#ff0a8a" transform="translate(45,-65)" />
                <path d="M0,-7 L2,-2 L7,0 L2,2 L0,7 L-2,2 L-7,0 L-2,-2 Z" fill="#ffd60a" transform="translate(50,40)" />
                <path d="M0,-7 L2,-2 L7,0 L2,2 L0,7 L-2,2 L-7,0 L-2,-2 Z" fill="#ff0a8a" transform="translate(-50,35)" />
              </g>
            </g>
          </g>
                    </g>
</g>

        </svg>
      </div>
    </section>
  );
}
