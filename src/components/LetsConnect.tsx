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
        // scatter: run to a random spot near the ground (stays there until clicked again)
        const small = window.innerWidth < 640;
        const rangeX = small ? 90 : 300;
        const rangeY = small ? 40 : 100;
        const rx = Math.round((Math.random() * 2 - 1) * rangeX);
        const ry = Math.round(-Math.random() * rangeY);
        ch.style.setProperty("--scatter-x", rx + "px");
        ch.style.setProperty("--scatter-y", ry + "px");
        // happy wiggle + sparkles pop + running wobble
        ch.classList.add("is-wiggle", "is-sparkling", "is-running");
        window.setTimeout(() => ch.classList.remove("is-wiggle", "is-running"), 600);
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
          /* night landscape bg image (purple/dark, matches site) */
          background: var(--connect-bg) url("/Portfolio-Website/assets/lets-connect-bg.webp?v=2") center / cover no-repeat;
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
          width: 1800px;
          height: 1040px;
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
          /* click-to-scatter offset: the independent translate property composes with the transform animations */
          translate: var(--scatter-x, 0px) var(--scatter-y, 0px);
          transition: translate 0.6s cubic-bezier(0.34, 1.3, 0.64, 1);
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
        /* click: running wobble while scattering (animates the rotate property so it composes with the wiggle transform) */
        #connect .lc-char.is-running { animation: lc-run-wobble 0.18s ease-in-out infinite; }
        #connect .lc-char.is-wiggle.is-running { animation: lc-wiggle 0.6s ease, lc-run-wobble 0.18s ease-in-out infinite; }
        @keyframes lc-run-wobble {
          0%, 100% { rotate: -7deg; }
          50% { rotate: 7deg; }
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
          #connect .lc-char.is-running { animation: none; }
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
            <ellipse cx="175" cy="491" rx="52" ry="6" />
            <ellipse cx="305" cy="491" rx="48" ry="6" />
            <ellipse cx="435" cy="491" rx="52" ry="6" />
            <ellipse cx="570" cy="491" rx="54" ry="6" />
            <ellipse cx="695" cy="491" rx="44" ry="6" />
            <ellipse cx="805" cy="491" rx="46" ry="6" />
          </g>
          <g fill="rgba(255,255,255,0.25)">
            <circle className="lc-sparkle" cx="120" cy="120" r="4" style={{ animationDelay: "0s" }} />
            <circle className="lc-sparkle" cx="780" cy="90" r="5" style={{ animationDelay: "1.5s" }} />
            <circle className="lc-sparkle" cx="700" cy="200" r="3" style={{ animationDelay: "3s" }} />
            <circle className="lc-sparkle" cx="180" cy="260" r="3.5" style={{ animationDelay: "2s" }} />
          </g>

          {/* ══ 1. SUN (Spiky sun #ff5a00) — cheerful, waving both arms ══ */}
          <g id="char-sun" className="lc-char" data-cx="570" data-cy="388"
             style={{ "--rise-delay": "0s", "--idle-anim": "lc-breathe", "--idle-d": "3.5s", "--idle-delay": "0.8s" } as React.CSSProperties}>
            <g className="scroll-shift" data-depth="0.25">
              <g transform="translate(570, 388)">
                <g className="body">
                  <circle cx="0" cy="0" r="58" fill="#ff5a00" />
                  <g fill="#ff5a00">
                    <path d="M-13,-56 L13,-56 L0,-80 Z" transform="rotate(0)" />
                    <path d="M-13,-56 L13,-56 L0,-80 Z" transform="rotate(30)" />
                    <path d="M-13,-56 L13,-56 L0,-80 Z" transform="rotate(60)" />
                    <path d="M-13,-56 L13,-56 L0,-80 Z" transform="rotate(90)" />
                    <path d="M-13,-56 L13,-56 L0,-80 Z" transform="rotate(120)" />
                    <path d="M-13,-56 L13,-56 L0,-80 Z" transform="rotate(150)" />
                    <path d="M-13,-56 L13,-56 L0,-80 Z" transform="rotate(180)" />
                    <path d="M-13,-56 L13,-56 L0,-80 Z" transform="rotate(210)" />
                    <path d="M-13,-56 L13,-56 L0,-80 Z" transform="rotate(240)" />
                    <path d="M-13,-56 L13,-56 L0,-80 Z" transform="rotate(270)" />
                    <path d="M-13,-56 L13,-56 L0,-80 Z" transform="rotate(300)" />
                    <path d="M-13,-56 L13,-56 L0,-80 Z" transform="rotate(330)" />
                  </g>
                </g>
                <g className="face">
                  <g className="brows" />
                  <g className="lc-eyes">
                    <g className="dots" fill="#0D0D0D">
                      <circle cx="-22" cy="-14" r="3.5" />
                      <circle cx="22" cy="-14" r="3.5" />
                    </g>
                    <g className="happy" stroke="#0D0D0D" strokeWidth="3" strokeLinecap="round" fill="none">
                      <path d="M-30,-14 Q-22,-23 -14,-14" />
                      <path d="M14,-14 Q22,-23 30,-14" />
                    </g>
                  </g>
                  <g className="mouth">
                    <path className="mouth-normal" d="M-26,18 Q0,40 26,18" stroke="#0D0D0D" strokeWidth="3" fill="none" strokeLinecap="round" />
                    <path className="mouth-happy" d="M-30,16 Q0,48 30,16" stroke="#0D0D0D" strokeWidth="3.5" fill="none" strokeLinecap="round" />
                  </g>
                  <g fill="rgba(255,10,138,0.3)">
                    <ellipse cx="-40" cy="8" rx="8" ry="5" />
                    <ellipse cx="40" cy="8" rx="8" ry="5" />
                  </g>
                </g>
                <g className="arms">
                  <g className="sun-arm-l">
                    <line x1="-46" y1="-18" x2="-70" y2="-62" stroke="#ff5a00" strokeWidth="12" strokeLinecap="round" />
                    <circle cx="-70" cy="-62" r="10" fill="#ff5a00" />
                    <g stroke="#0D0D0D" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="-74" y1="-69" x2="-78" y2="-77" />
                      <line x1="-68" y1="-71" x2="-70" y2="-79" />
                      <line x1="-62" y1="-69" x2="-60" y2="-77" />
                    </g>
                  </g>
                  <g className="sun-arm-r">
                    <line x1="50" y1="-6" x2="84" y2="-22" stroke="#ff5a00" strokeWidth="12" strokeLinecap="round" />
                    <circle cx="84" cy="-22" r="10" fill="#ff5a00" />
                    <g stroke="#0D0D0D" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="88" y1="-29" x2="92" y2="-35" />
                      <line x1="82" y1="-31" x2="84" y2="-39" />
                      <line x1="76" y1="-29" x2="74" y2="-37" />
                    </g>
                  </g>
                </g>
                <g className="legs" stroke="#ff5a00" strokeWidth="12" strokeLinecap="round">
                  <line x1="-20" y1="48" x2="-20" y2="80" />
                  <line x1="20" y1="48" x2="20" y2="80" />
                </g>
                <g className="feet">
                  <g transform="translate(-22,89)">
                    <path d="M12,-9 L-6,-9 Q-16,-9 -16,0 Q-16,9 -7,9 L10,9 Q16,9 16,3 L16,-3 Q16,-9 12,-9 Z" fill="#ff5a00" />
                    <path d="M-7,-6 Q-10,0 -7,6" stroke="#0D0D0D" strokeWidth="2" fill="none" strokeLinecap="round" />
                  </g>
                  <g transform="translate(22,89)">
                    <path d="M-12,-9 L6,-9 Q16,-9 16,0 Q16,9 7,9 L-10,9 Q-16,9 -16,3 L-16,-3 Q-16,-9 -12,-9 Z" fill="#ff5a00" />
                    <path d="M7,-6 Q10,0 7,6" stroke="#0D0D0D" strokeWidth="2" fill="none" strokeLinecap="round" />
                  </g>
                </g>
                <g className="click-sparkles">
                  <path d="M0,-7 L2,-2 L7,0 L2,2 L0,7 L-2,2 L-7,0 L-2,-2 Z" fill="#ffd60a" transform="translate(-52,-52)" />
                  <path d="M0,-7 L2,-2 L7,0 L2,2 L0,7 L-2,2 L-7,0 L-2,-2 Z" fill="#ff0a8a" transform="translate(52,-58)" />
                  <path d="M0,-7 L2,-2 L7,0 L2,2 L0,7 L-2,2 L-7,0 L-2,-2 Z" fill="#ffd60a" transform="translate(56,28)" />
                  <path d="M0,-7 L2,-2 L7,0 L2,2 L0,7 L-2,2 L-7,0 L-2,-2 Z" fill="#ff0a8a" transform="translate(-56,24)" />
                </g>
              </g>
            </g>
          </g>

          {/* ══ 2. TRIANGLE (Yellow #ffd60a) — shouting with excitement ══ */}
          <g id="char-triangle" className="lc-char" data-cx="435" data-cy="378"
             style={{ "--rise-delay": "0.1s", "--idle-anim": "lc-breathe", "--idle-d": "4s", "--idle-delay": "0.9s" } as React.CSSProperties}>
            <g className="scroll-shift" data-depth="0.5">
              <g transform="translate(435, 378)">
                <g className="body">
                  <path d="M0,-70 L62,54 L-62,54 Z" fill="#ffd60a" stroke="#ffd60a" strokeWidth="12" strokeLinejoin="round" />
                </g>
                <g className="face">
                  <g className="brows" stroke="#0D0D0D" strokeWidth="2.5" strokeLinecap="round" fill="none">
                    <path d="M-32,-42 Q-24,-50 -16,-42" />
                    <path d="M16,-42 Q24,-50 32,-42" />
                  </g>
                  <g className="lc-eyes">
                    <g className="dots" fill="#0D0D0D">
                      <circle cx="-22" cy="-20" r="3.5" />
                      <circle cx="22" cy="-20" r="3.5" />
                    </g>
                    <g className="happy" stroke="#0D0D0D" strokeWidth="3" strokeLinecap="round" fill="none">
                      <path d="M-30,-20 Q-22,-28 -14,-20" />
                      <path d="M14,-20 Q22,-28 30,-20" />
                    </g>
                  </g>
                  <g className="mouth">
                    <ellipse className="mouth-normal" cx="0" cy="16" rx="10" ry="13" fill="#0D0D0D" />
                    <ellipse className="mouth-happy" cx="0" cy="16" rx="13" ry="17" fill="#0D0D0D" />
                  </g>
                  <g stroke="#0D0D0D" strokeWidth="2.5" strokeLinecap="round" fill="none">
                    <path d="M42,2 q7,5 9,12" />
                    <path d="M52,16 q5,6 6,12" />
                  </g>
                </g>
                <g className="arms">
                  <g className="tri-cup-hand">
                    <line x1="48" y1="-10" x2="30" y2="4" stroke="#ffd60a" strokeWidth="12" strokeLinecap="round" />
                    <circle cx="28" cy="6" r="10" fill="#ffd60a" />
                    <g stroke="#0D0D0D" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="24" y1="-1" x2="22" y2="-8" />
                      <line x1="30" y1="-2" x2="30" y2="-10" />
                    </g>
                  </g>
                  <line x1="-50" y1="-2" x2="-62" y2="28" stroke="#ffd60a" strokeWidth="12" strokeLinecap="round" />
                  <circle cx="-62" cy="28" r="9" fill="#ffd60a" />
                </g>
                <g className="legs" stroke="#ffd60a" strokeWidth="12" strokeLinecap="round">
                  <line x1="-20" y1="60" x2="-20" y2="90" />
                  <line x1="20" y1="60" x2="20" y2="90" />
                </g>
                <g className="feet">
                  <g transform="translate(-22,99)">
                    <path d="M12,-9 L-6,-9 Q-16,-9 -16,0 Q-16,9 -7,9 L10,9 Q16,9 16,3 L16,-3 Q16,-9 12,-9 Z" fill="#ffd60a" />
                    <path d="M-7,-6 Q-10,0 -7,6" stroke="#0D0D0D" strokeWidth="2" fill="none" strokeLinecap="round" />
                  </g>
                  <g transform="translate(22,99)">
                    <path d="M-12,-9 L6,-9 Q16,-9 16,0 Q16,9 7,9 L-10,9 Q-16,9 -16,3 L-16,-3 Q-16,-9 -12,-9 Z" fill="#ffd60a" />
                    <path d="M7,-6 Q10,0 7,6" stroke="#0D0D0D" strokeWidth="2" fill="none" strokeLinecap="round" />
                  </g>
                </g>
                <g className="click-sparkles">
                  <path d="M0,-7 L2,-2 L7,0 L2,2 L0,7 L-2,2 L-7,0 L-2,-2 Z" fill="#ffd60a" transform="translate(-52,-52)" />
                  <path d="M0,-7 L2,-2 L7,0 L2,2 L0,7 L-2,2 L-7,0 L-2,-2 Z" fill="#ff0a8a" transform="translate(52,-58)" />
                  <path d="M0,-7 L2,-2 L7,0 L2,2 L0,7 L-2,2 L-7,0 L-2,-2 Z" fill="#ffd60a" transform="translate(56,28)" />
                  <path d="M0,-7 L2,-2 L7,0 L2,2 L0,7 L-2,2 L-7,0 L-2,-2 Z" fill="#ff0a8a" transform="translate(-56,24)" />
                </g>
              </g>
            </g>
          </g>

          {/* ══ 3. CIRCLE (Purple Light #A58CF4) — happy, hand on belly ══ */}
          <g id="char-circle" className="lc-char" data-cx="175" data-cy="380"
             style={{ "--rise-delay": "0.2s", "--idle-anim": "lc-breathe", "--idle-d": "3.8s", "--idle-delay": "1s" } as React.CSSProperties}>
            <g className="scroll-shift" data-depth="0.6">
              <g transform="translate(175, 380)">
                <g className="body">
                  <circle cx="0" cy="0" r="68" fill="#A58CF4" />
                </g>
                <g className="face">
                  <g className="brows" />
                  <g className="lc-eyes">
                    <g className="dots" fill="#0D0D0D">
                      <circle cx="-24" cy="-16" r="3.5" />
                      <circle cx="24" cy="-16" r="3.5" />
                    </g>
                    <g className="happy" stroke="#0D0D0D" strokeWidth="3" strokeLinecap="round" fill="none">
                      <path d="M-32,-16 Q-24,-25 -16,-16" />
                      <path d="M16,-16 Q24,-25 32,-16" />
                    </g>
                  </g>
                  <g className="mouth">
                    <path className="mouth-normal" d="M-28,20 Q0,42 28,20" stroke="#0D0D0D" strokeWidth="3" fill="none" strokeLinecap="round" />
                    <path className="mouth-happy" d="M-32,18 Q0,50 32,18" stroke="#0D0D0D" strokeWidth="3.5" fill="none" strokeLinecap="round" />
                  </g>
                  <g fill="rgba(255,10,138,0.3)">
                    <ellipse cx="-42" cy="8" rx="8" ry="5" />
                    <ellipse cx="42" cy="8" rx="8" ry="5" />
                  </g>
                </g>
                <g className="arms">
                  <path d="M-58,6 Q-42,30 -24,34" stroke="#A58CF4" strokeWidth="12" fill="none" strokeLinecap="round" />
                  <circle cx="-22" cy="36" r="9" fill="#A58CF4" />
                  <line x1="60" y1="6" x2="68" y2="36" stroke="#A58CF4" strokeWidth="12" strokeLinecap="round" />
                  <circle cx="68" cy="40" r="9" fill="#A58CF4" />
                </g>
                <g className="legs" stroke="#A58CF4" strokeWidth="12" strokeLinecap="round">
                  <line x1="-20" y1="58" x2="-20" y2="88" />
                  <line x1="20" y1="58" x2="20" y2="88" />
                </g>
                <g className="feet">
                  <g transform="translate(-22,97)">
                    <path d="M12,-9 L-6,-9 Q-16,-9 -16,0 Q-16,9 -7,9 L10,9 Q16,9 16,3 L16,-3 Q16,-9 12,-9 Z" fill="#A58CF4" />
                    <path d="M-7,-6 Q-10,0 -7,6" stroke="#0D0D0D" strokeWidth="2" fill="none" strokeLinecap="round" />
                  </g>
                  <g transform="translate(22,97)">
                    <path d="M-12,-9 L6,-9 Q16,-9 16,0 Q16,9 7,9 L-10,9 Q-16,9 -16,3 L-16,-3 Q-16,-9 -12,-9 Z" fill="#A58CF4" />
                    <path d="M7,-6 Q10,0 7,6" stroke="#0D0D0D" strokeWidth="2" fill="none" strokeLinecap="round" />
                  </g>
                </g>
                <g className="click-sparkles">
                  <path d="M0,-7 L2,-2 L7,0 L2,2 L0,7 L-2,2 L-7,0 L-2,-2 Z" fill="#ffd60a" transform="translate(-52,-52)" />
                  <path d="M0,-7 L2,-2 L7,0 L2,2 L0,7 L-2,2 L-7,0 L-2,-2 Z" fill="#ff0a8a" transform="translate(52,-58)" />
                  <path d="M0,-7 L2,-2 L7,0 L2,2 L0,7 L-2,2 L-7,0 L-2,-2 Z" fill="#ffd60a" transform="translate(56,28)" />
                  <path d="M0,-7 L2,-2 L7,0 L2,2 L0,7 L-2,2 L-7,0 L-2,-2 Z" fill="#ff0a8a" transform="translate(-56,24)" />
                </g>
              </g>
            </g>
          </g>
          {/* ══ 4. STAR (Amber #ff9f0a) — giggling, hands on cheeks ══ */}
          <g id="char-star" className="lc-char" data-cx="805" data-cy="396"
             style={{ "--rise-delay": "0.3s", "--idle-anim": "lc-giggle", "--idle-d": "3.2s", "--idle-delay": "1.1s" } as React.CSSProperties}>
            <g className="scroll-shift" data-depth="0.65">
              <g transform="translate(805, 396)">
                <g className="body">
                  <path d="M0,-58 L14.1,-19.4 L55.2,-17.9 L22.8,7.4 L34.1,46.9 L0,24 L-34.1,46.9 L-22.8,7.4 L-55.2,-17.9 L-14.1,-19.4 Z"
                        fill="#ff9f0a" stroke="#ff9f0a" strokeWidth="10" strokeLinejoin="round" />
                </g>
                <g className="face">
                  <g className="brows" />
                  <g className="lc-eyes">
                    <g className="dots" stroke="#0D0D0D" strokeWidth="3" strokeLinecap="round" fill="none">
                      <path d="M-30,-12 Q-22,-22 -14,-12" />
                      <path d="M14,-12 Q22,-22 30,-12" />
                    </g>
                    <g className="happy" stroke="#0D0D0D" strokeWidth="3.5" strokeLinecap="round" fill="none">
                      <path d="M-32,-12 Q-22,-24 -12,-12" />
                      <path d="M12,-12 Q22,-24 32,-12" />
                    </g>
                  </g>
                  <g className="mouth">
                    <ellipse className="mouth-normal" cx="0" cy="16" rx="11" ry="14" fill="#0D0D0D" />
                    <ellipse className="mouth-happy" cx="0" cy="16" rx="14" ry="18" fill="#0D0D0D" />
                  </g>
                </g>
                <g className="arms">
                  <line x1="-36" y1="-10" x2="-28" y2="2" stroke="#ff9f0a" strokeWidth="12" strokeLinecap="round" />
                  <circle cx="-26" cy="4" r="9" fill="#ff9f0a" />
                  <g stroke="#0D0D0D" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="-30" y1="-2" x2="-33" y2="-9" />
                    <line x1="-24" y1="-3" x2="-24" y2="-11" />
                  </g>
                  <line x1="36" y1="-10" x2="28" y2="2" stroke="#ff9f0a" strokeWidth="12" strokeLinecap="round" />
                  <circle cx="26" cy="4" r="9" fill="#ff9f0a" />
                  <g stroke="#0D0D0D" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="30" y1="-2" x2="33" y2="-9" />
                    <line x1="24" y1="-3" x2="24" y2="-11" />
                  </g>
                </g>
                <g className="legs" stroke="#ff9f0a" strokeWidth="12" strokeLinecap="round">
                  <line x1="-15" y1="42" x2="-15" y2="72" />
                  <line x1="15" y1="42" x2="15" y2="72" />
                </g>
                <g className="feet">
                  <g transform="translate(-17,81)">
                    <path d="M12,-9 L-6,-9 Q-16,-9 -16,0 Q-16,9 -7,9 L10,9 Q16,9 16,3 L16,-3 Q16,-9 12,-9 Z" fill="#ff9f0a" />
                    <path d="M-7,-6 Q-10,0 -7,6" stroke="#0D0D0D" strokeWidth="2" fill="none" strokeLinecap="round" />
                  </g>
                  <g transform="translate(17,81)">
                    <path d="M-12,-9 L6,-9 Q16,-9 16,0 Q16,9 7,9 L-10,9 Q-16,9 -16,3 L-16,-3 Q-16,-9 -12,-9 Z" fill="#ff9f0a" />
                    <path d="M7,-6 Q10,0 7,6" stroke="#0D0D0D" strokeWidth="2" fill="none" strokeLinecap="round" />
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

          {/* ══ 5. SQUARE (Rounded square #ff0a8a) — shy, hands clasped ══ */}
          <g id="char-square" className="lc-char" data-cx="305" data-cy="389"
             style={{ "--rise-delay": "0.4s", "--idle-anim": "lc-shy-sway", "--idle-d": "4.5s", "--idle-delay": "1.2s" } as React.CSSProperties}>
            <g className="scroll-shift" data-depth="0.5">
              <g transform="translate(305, 389)">
                <g className="body">
                  <rect x="-59" y="-59" width="118" height="118" rx="30" fill="#ff0a8a" />
                </g>
                <g className="face">
                  <g className="brows" />
                  <g className="lc-eyes">
                    <g className="dots" fill="#0D0D0D">
                      <circle cx="-8" cy="-14" r="3.5" />
                      <circle cx="20" cy="-14" r="3.5" />
                    </g>
                    <g className="happy" stroke="#0D0D0D" strokeWidth="3" strokeLinecap="round" fill="none">
                      <path d="M-16,-14 Q-8,-22 0,-14" />
                      <path d="M12,-14 Q20,-22 28,-14" />
                    </g>
                  </g>
                  <g className="mouth">
                    <path className="mouth-normal" d="M-12,24 Q0,32 12,24" stroke="#0D0D0D" strokeWidth="3" fill="none" strokeLinecap="round" />
                    <path className="mouth-happy" d="M-14,22 Q0,36 14,22" stroke="#0D0D0D" strokeWidth="3.5" fill="none" strokeLinecap="round" />
                  </g>
                </g>
                <g className="arms">
                  <line x1="-44" y1="10" x2="-10" y2="40" stroke="#ff0a8a" strokeWidth="12" strokeLinecap="round" />
                  <line x1="44" y1="10" x2="10" y2="40" stroke="#ff0a8a" strokeWidth="12" strokeLinecap="round" />
                  <circle cx="-6" cy="42" r="9" fill="#ff0a8a" />
                  <circle cx="6" cy="42" r="9" fill="#ff0a8a" />
                  <g stroke="#0D0D0D" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="-10" y1="36" x2="-10" y2="48" />
                    <line x1="-2" y1="36" x2="-2" y2="48" />
                    <line x1="6" y1="36" x2="6" y2="48" />
                  </g>
                </g>
                <g className="legs" stroke="#ff0a8a" strokeWidth="12" strokeLinecap="round">
                  <line x1="-20" y1="49" x2="-20" y2="79" />
                  <line x1="20" y1="49" x2="20" y2="79" />
                </g>
                <g className="feet">
                  <g transform="translate(-22,88)">
                    <path d="M12,-9 L-6,-9 Q-16,-9 -16,0 Q-16,9 -7,9 L10,9 Q16,9 16,3 L16,-3 Q16,-9 12,-9 Z" fill="#ff0a8a" />
                    <path d="M-7,-6 Q-10,0 -7,6" stroke="#0D0D0D" strokeWidth="2" fill="none" strokeLinecap="round" />
                  </g>
                  <g transform="translate(22,88)">
                    <path d="M-12,-9 L6,-9 Q16,-9 16,0 Q16,9 7,9 L-10,9 Q-16,9 -16,3 L-16,-3 Q-16,-9 -12,-9 Z" fill="#ff0a8a" />
                    <path d="M7,-6 Q10,0 7,6" stroke="#0D0D0D" strokeWidth="2" fill="none" strokeLinecap="round" />
                  </g>
                </g>
                <g className="click-sparkles">
                  <path d="M0,-7 L2,-2 L7,0 L2,2 L0,7 L-2,2 L-7,0 L-2,-2 Z" fill="#ffd60a" transform="translate(-52,-52)" />
                  <path d="M0,-7 L2,-2 L7,0 L2,2 L0,7 L-2,2 L-7,0 L-2,-2 Z" fill="#ff0a8a" transform="translate(52,-58)" />
                  <path d="M0,-7 L2,-2 L7,0 L2,2 L0,7 L-2,2 L-7,0 L-2,-2 Z" fill="#ffd60a" transform="translate(56,28)" />
                  <path d="M0,-7 L2,-2 L7,0 L2,2 L0,7 L-2,2 L-7,0 L-2,-2 Z" fill="#ff0a8a" transform="translate(-56,24)" />
                </g>
              </g>
            </g>
          </g>

          {/* ══ 6. RECTANGLE (Tall rounded rect #FAFAFA) — cool, arms crossed ══ */}
          <g id="char-rect" className="lc-char" data-cx="695" data-cy="363"
             style={{ "--rise-delay": "0.5s", "--idle-anim": "lc-think", "--idle-d": "4.8s", "--idle-delay": "1.3s" } as React.CSSProperties}>
            <g className="scroll-shift" data-depth="0.25">
              <g transform="translate(695, 363)">
                <g className="body">
                  <rect x="-44" y="-85" width="88" height="170" rx="44" fill="#FAFAFA" />
                </g>
                <g className="face">
                  <g className="brows" stroke="#0D0D0D" strokeWidth="2.5" strokeLinecap="round" fill="none">
                    <path d="M-30,-44 Q-22,-48 -14,-44" />
                    <path d="M14,-52 Q22,-57 30,-52" />
                  </g>
                  <g className="lc-eyes">
                    <g className="dots" fill="#0D0D0D">
                      <circle cx="-20" cy="-28" r="3.5" />
                      <circle cx="20" cy="-28" r="3.5" />
                    </g>
                    <g className="happy" stroke="#0D0D0D" strokeWidth="3" strokeLinecap="round" fill="none">
                      <path d="M-28,-28 Q-20,-36 -12,-28" />
                      <path d="M12,-28 Q20,-36 28,-28" />
                    </g>
                  </g>
                  <g className="mouth">
                    <path className="mouth-normal" d="M-13,10 Q0,14 13,10" stroke="#0D0D0D" strokeWidth="3" fill="none" strokeLinecap="round" />
                    <path className="mouth-happy" d="M-16,8 Q0,20 16,8" stroke="#0D0D0D" strokeWidth="3.5" fill="none" strokeLinecap="round" />
                  </g>
                </g>
                <g className="arms">
                  <line x1="-36" y1="-14" x2="28" y2="20" stroke="#FAFAFA" strokeWidth="12" strokeLinecap="round" />
                  <circle cx="30" cy="22" r="9" fill="#FAFAFA" />
                  <line x1="36" y1="-14" x2="-28" y2="20" stroke="#FAFAFA" strokeWidth="12" strokeLinecap="round" />
                  <circle cx="-30" cy="22" r="9" fill="#FAFAFA" />
                  <g stroke="#0D0D0D" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="-8" y1="2" x2="-2" y2="12" />
                    <line x1="8" y1="2" x2="2" y2="12" />
                  </g>
                </g>
                <g className="legs" stroke="#FAFAFA" strokeWidth="12" strokeLinecap="round">
                  <line x1="-20" y1="75" x2="-20" y2="105" />
                  <line x1="20" y1="75" x2="20" y2="105" />
                </g>
                <g className="feet">
                  <g transform="translate(-22,114)">
                    <path d="M12,-9 L-6,-9 Q-16,-9 -16,0 Q-16,9 -7,9 L10,9 Q16,9 16,3 L16,-3 Q16,-9 12,-9 Z" fill="#FAFAFA" />
                    <path d="M-7,-6 Q-10,0 -7,6" stroke="#0D0D0D" strokeWidth="2" fill="none" strokeLinecap="round" />
                  </g>
                  <g className="rect-tap-foot" transform="translate(22,114)">
                    <path d="M-12,-9 L6,-9 Q16,-9 16,0 Q16,9 7,9 L-10,9 Q-16,9 -16,3 L-16,-3 Q-16,-9 -12,-9 Z" fill="#FAFAFA" />
                    <path d="M7,-6 Q10,0 7,6" stroke="#0D0D0D" strokeWidth="2" fill="none" strokeLinecap="round" />
                  </g>
                </g>
                <g className="click-sparkles">
                  <path d="M0,-7 L2,-2 L7,0 L2,2 L0,7 L-2,2 L-7,0 L-2,-2 Z" fill="#ffd60a" transform="translate(-52,-52)" />
                  <path d="M0,-7 L2,-2 L7,0 L2,2 L0,7 L-2,2 L-7,0 L-2,-2 Z" fill="#ff0a8a" transform="translate(52,-58)" />
                  <path d="M0,-7 L2,-2 L7,0 L2,2 L0,7 L-2,2 L-7,0 L-2,-2 Z" fill="#ffd60a" transform="translate(56,28)" />
                  <path d="M0,-7 L2,-2 L7,0 L2,2 L0,7 L-2,2 L-7,0 L-2,-2 Z" fill="#ff0a8a" transform="translate(-56,24)" />
                </g>
              </g>
            </g>
          </g>
        </svg>
      </div>
    </section>
  );
}
