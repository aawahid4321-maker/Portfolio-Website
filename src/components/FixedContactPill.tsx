import { useEffect, useRef } from "react";

/* ── Sticker button colors: purple theme ────────────────────────────────── */
const CSS_VARS = {
  "--pill-bg": "#A58CF4",        /* purple light fill */
  "--pill-bg-hover": "#ff0a8a",  /* pink on hover */
  "--pill-bg-alt": "#433075",    /* purple dark on light sections */
  "--pill-ink": "#0D0D0D",
  "--pill-paper": "#FAFAFA",
  "--pill-face": "#ffd60a",      /* yellow face */
  "--pill-shadow": "#433075",    /* purple dark hard shadow */
  "--pill-blue": "#1a1aff",      /* focus ring */
} as React.CSSProperties;

/* Fun cartoon "sticker" CONTACT pill — bottom-right, fixed. */
export default function FixedContactPill() {
  const pillRef = useRef<HTMLAnchorElement>(null);
  const eyesRef = useRef<SVGGElement>(null);

  useEffect(() => {
    const pill = pillRef.current;
    if (!pill) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isTouch = window.matchMedia("(pointer: coarse)").matches;

    /* ── entrance: pop in after 600ms ── */
    let entranceTimer = 0;
    if (!reduceMotion) {
      pill.classList.add("is-hidden");
      entranceTimer = window.setTimeout(() => pill.classList.remove("is-hidden"), 600);
    }

    /* ── face blink every ~5s ── */
    let blinkTimer = 0;
    const scheduleBlink = () => {
      blinkTimer = window.setTimeout(() => {
        if (document.hidden) { scheduleBlink(); return; }
        pill.classList.add("is-blinking");
        window.setTimeout(() => pill.classList.remove("is-blinking"), 180);
        scheduleBlink();
      }, 4500 + Math.random() * 1500);
    };
    if (!reduceMotion) scheduleBlink();

    /* ── eyes follow cursor (up to 2px), skip on touch ── */
    const onMouseMove = (e: MouseEvent) => {
      if (isTouch || reduceMotion || !eyesRef.current) return;
      const r = pill.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const dx = e.clientX - cx, dy = e.clientY - cy;
      const len = Math.max(Math.hypot(dx, dy), 1);
      const s = Math.min(2, len / 120);
      eyesRef.current.style.transform = `translate(${(dx / len) * s}px, ${(dy / len) * s}px)`;
    };
    if (!isTouch) window.addEventListener("mousemove", onMouseMove);

    /* ── theme: pink on light sections, yellow on dark ── */
    const themed = document.querySelectorAll<HTMLElement>("[data-theme]");
    const themeIO = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const theme = (entry.target as HTMLElement).dataset.theme;
          // dark sections → yellow pill; light sections → pink pill
          pill.classList.toggle("is-on-light", theme === "light");
        });
      },
      { threshold: 0.35 }
    );
    themed.forEach((el) => themeIO.observe(el));

    /* ── tiny wiggle on release ── */
    const onUp = () => {
      if (reduceMotion) return;
      pill.classList.remove("is-wiggle");
      void pill.offsetWidth;
      pill.classList.add("is-wiggle");
    };
    pill.addEventListener("mouseup", onUp);
    pill.addEventListener("touchend", onUp);

    return () => {
      window.clearTimeout(entranceTimer);
      window.clearTimeout(blinkTimer);
      window.removeEventListener("mousemove", onMouseMove);
      themeIO.disconnect();
      pill.removeEventListener("mouseup", onUp);
      pill.removeEventListener("touchend", onUp);
    };
  }, []);

  return (
    <>
      <style>{`
        .fixed-contact-pill {
          --bg: var(--pill-bg);
          position: fixed;
          right: 24px;
          bottom: calc(24px + env(safe-area-inset-bottom, 0px));
          z-index: 50;
          display: inline-flex;
          align-items: center;
          gap: 12px;
          background: var(--bg);
          color: var(--pill-ink);
          font-family: "Zilla Slab", serif;
          font-weight: 700;
          font-size: 17px;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          padding: 14px 22px 14px 18px;
          border-radius: 999px;
          border: 3px solid var(--pill-ink);           /* chunky cartoon outline */
          box-shadow: 0 0 0 2px var(--pill-paper),     /* outer ring: visible on dark bg */
                      4px 4px 0 2px var(--pill-shadow); /* hard offset sticker shadow */
          text-decoration: none;
          cursor: pointer;
          min-height: 48px;                            /* tap target */
          transition: background 0.3s ease, color 0.3s ease,
                      transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1),
                      box-shadow 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        /* entrance: squash-and-stretch pop */
        .fixed-contact-pill.is-hidden {
          transform: translate(40px, 40px) scale(0);
          opacity: 0;
        }
        .fixed-contact-pill:not(.is-hidden) {
          animation: pill-pop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1),
                     pill-bob 3s ease-in-out 0.6s infinite;
        }
        @keyframes pill-pop {
          0% { transform: translate(40px, 40px) scale(0); }
          60% { transform: translate(0, 0) scale(1.15); }
          100% { transform: translate(0, 0) scale(1); }
        }
        @keyframes pill-bob {
          0%, 100% { translate: 0 0; }
          50% { translate: 0 -4px; }
        }
        /* theme: purple dark w/ purple light text on light sections */
        .fixed-contact-pill.is-on-light {
          --bg: var(--pill-bg-alt);
          color: #A58CF4;
        }
        /* hover: pink fill, white text, bigger shadow */
        .fixed-contact-pill:hover {
          --bg: var(--pill-bg-hover);
          color: var(--pill-paper);
          transform: rotate(-4deg) scale(1.06);
          box-shadow: 0 0 0 2px var(--pill-paper),
                      6px 6px 0 2px var(--pill-shadow);
          animation-play-state: paused;
        }
        .fixed-contact-pill:active {
          transform: translate(3px, 3px) scale(1.02);
          box-shadow: 0 0 0 2px var(--pill-paper),
                      1px 1px 0 2px var(--pill-shadow);
        }
        .fixed-contact-pill.is-wiggle { animation: pill-wiggle 0.4s ease; }
        @keyframes pill-wiggle {
          0%, 100% { rotate: 0deg; }
          30% { rotate: 3deg; }
          60% { rotate: -3deg; }
        }
        /* face icon */
        .fixed-contact-pill .pill-face { flex: none; display: block; }
        .fixed-contact-pill .pill-face .eyes { transition: transform 0.15s ease-out; }
        .fixed-contact-pill .pill-face .dots { transition: transform 0.12s ease; transform-box: fill-box; transform-origin: center; }
        .fixed-contact-pill.is-blinking .pill-face .dots { transform: scaleY(0.1); }
        .fixed-contact-pill .pill-face .happy { opacity: 0; transition: opacity 0.15s ease; }
        .fixed-contact-pill:hover .pill-face .happy { opacity: 1; }
        .fixed-contact-pill:hover .pill-face .dots { opacity: 0; }
        /* arrow circle */
        .fixed-contact-pill .pill-arrow {
          flex: none;
          width: 28px; height: 28px;
          border-radius: 50%;
          background: var(--pill-ink);
          color: var(--pill-paper);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 15px;
          transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .fixed-contact-pill:hover .pill-arrow { transform: rotate(45deg); }
        .fixed-contact-pill.is-on-light .pill-arrow { background: #A58CF4; color: var(--pill-bg-alt); }
        /* focus */
        .fixed-contact-pill:focus-visible {
          outline: 3px solid var(--pill-blue);
          outline-offset: 3px;
        }
        /* mobile: icon-only round button */
        @media (max-width: 639px) {
          .fixed-contact-pill {
            padding: 12px;
            border-radius: 50%;
            width: 56px; height: 56px;
            justify-content: center;
            gap: 0;
            right: 16px;
            bottom: calc(16px + env(safe-area-inset-bottom, 0px));
          }
          .fixed-contact-pill .pill-label { display: none; }
        }
        @media (prefers-reduced-motion: reduce) {
          .fixed-contact-pill:not(.is-hidden) { animation: none; }
          .fixed-contact-pill.is-blinking .pill-face .dots { transform: none; }
          .fixed-contact-pill.is-wiggle { animation: none; }
        }
      `}</style>
      <a
        ref={pillRef}
        href="https://wa.me/923295460848"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed-contact-pill"
        style={CSS_VARS}
        aria-label="Contact me"
      >
        {/* pink blob face */}
        <svg className="pill-face" width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
          <circle cx="14" cy="14" r="13" fill="var(--pill-face)" stroke="var(--pill-ink)" strokeWidth="2" />
          <g ref={eyesRef} className="eyes">
            <g className="dots" fill="var(--pill-ink)">
              <circle cx="10" cy="14" r="2.2" />
              <circle cx="18" cy="14" r="2.2" />
            </g>
            <g className="happy" stroke="var(--pill-ink)" strokeWidth="2" strokeLinecap="round" fill="none">
              <path d="M 6.5 15.5 Q 10 11.5 13.5 15.5" />
              <path d="M 14.5 15.5 Q 18 11.5 21.5 15.5" />
            </g>
          </g>
        </svg>
        <span className="pill-label">CONTACT</span>
        <span className="pill-arrow" aria-hidden="true">↗</span>
      </a>
    </>
  );
}
