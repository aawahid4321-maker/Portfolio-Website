import { useEffect, useRef } from "react";

/* ── FloatingNav: the pill nav used on home + project pages ───────────────
   3-zone grid: logo left, links center, hire right.
   Same design, sizes, highlight, animations as the project-page nav. */

interface FloatingNavProps {
  onNavigateHome: () => void;
  onNavigateWork: () => void;
  onNavigateAbout: () => void;
  activeLink?: "home" | "work" | "about";
}

export default function FloatingNav({
  onNavigateHome, onNavigateWork, onNavigateAbout, activeLink,
}: FloatingNavProps) {
  const navRef = useRef<HTMLElement>(null);
  const highlightRef = useRef<HTMLSpanElement>(null);
  const logoEyesRef = useRef<SVGGElement>(null);
  const homeLinkRef = useRef<HTMLAnchorElement>(null);
  const workLinkRef = useRef<HTMLAnchorElement>(null);
  const aboutLinkRef = useRef<HTMLAnchorElement>(null);
  const linksWrapRef = useRef<HTMLDivElement>(null);
  const menuOpen = useRef(false);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isTouch = window.matchMedia("(hover: none)").matches;

    /* ── entrance ── */
    if (!reduceMotion) {
      requestAnimationFrame(() => nav.classList.add("is-entering"));
    }

    /* ── highlight ── */
    const highlight = highlightRef.current;
    const linksWrap = linksWrapRef.current;
    const linkFor = (name: string | undefined) =>
      name === "home" ? homeLinkRef.current : name === "work" ? workLinkRef.current : name === "about" ? aboutLinkRef.current : null;
    const moveHighlight = (el: HTMLElement | null) => {
      if (!highlight || !linksWrap || reduceMotion) return;
      if (!el) { highlight.classList.remove("is-visible"); return; }
      highlight.style.width = `${el.offsetWidth}px`;
      highlight.style.transform = `translateX(${el.offsetLeft}px)`;
      highlight.classList.add("is-visible");
    };
    const activeEl = linkFor(activeLink);
    const t1 = window.setTimeout(() => moveHighlight(activeEl), 100);
    if (document.fonts?.ready) document.fonts.ready.then(() => moveHighlight(activeEl)).catch(() => {});
    const t2 = window.setTimeout(() => moveHighlight(activeEl), 900);
    const linkEls = [homeLinkRef.current, workLinkRef.current, aboutLinkRef.current].filter(Boolean) as HTMLAnchorElement[];
    const onEnter = (e: Event) => moveHighlight(e.currentTarget as HTMLElement);
    const onLeave = () => moveHighlight(activeEl);
    linkEls.forEach((el) => {
      el.addEventListener("mouseenter", onEnter);
      el.addEventListener("mouseleave", onLeave);
      el.addEventListener("focus", onEnter);
      el.addEventListener("blur", onLeave);
    });
    window.addEventListener("resize", onLeave);

    /* ── scroll: shrink, always visible ── */
    let lastY = window.scrollY, ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const y = window.scrollY;
        if (!nav || reduceMotion) { lastY = y; return; }
        nav.classList.toggle("is-scrolled", y > 120);
        nav.classList.remove("is-hidden"); // always visible
        lastY = y;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    /* ── logo eyes ── */
    const logoEyes = logoEyesRef.current;
    const logoLink = nav.querySelector(".pp-logo") as HTMLElement | null;
    const onLogoMouse = (e: MouseEvent) => {
      if (!logoEyes || !logoLink || reduceMotion || isTouch) return;
      const r = logoLink.getBoundingClientRect();
      const dx = Math.max(-2, Math.min(2, e.clientX - (r.left + r.width / 2)));
      const dy = Math.max(-2, Math.min(2, e.clientY - (r.top + r.height / 2)));
      logoEyes.style.transform = `translate(${dx}px, ${dy}px)`;
    };
    if (!isTouch) window.addEventListener("mousemove", onLogoMouse);
    let blinkTimer = 0;
    const scheduleBlink = () => {
      blinkTimer = window.setTimeout(() => {
        if (logoEyes && !reduceMotion) {
          logoEyes.classList.add("is-blinking");
          window.setTimeout(() => logoEyes.classList.remove("is-blinking"), 150);
        }
        scheduleBlink();
      }, 2500 + Math.random() * 3000);
    };
    scheduleBlink();

    /* ── mobile menu ── */
    const closeMenu = () => {
      menuOpen.current = false;
      nav.classList.remove("is-open");
      nav.querySelector(".pp-menu-btn")?.setAttribute("aria-expanded", "false");
    };
    const onDocClick = (e: MouseEvent) => {
      if (menuOpen.current && !nav.contains(e.target as Node)) closeMenu();
    };
    document.addEventListener("click", onDocClick);

    return () => {
      window.clearTimeout(t1); window.clearTimeout(t2); window.clearTimeout(blinkTimer);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("mousemove", onLogoMouse);
      window.removeEventListener("resize", onLeave);
      document.removeEventListener("click", onDocClick);
      linkEls.forEach((el) => {
        el.removeEventListener("mouseenter", onEnter);
        el.removeEventListener("mouseleave", onLeave);
        el.removeEventListener("focus", onEnter);
        el.removeEventListener("blur", onLeave);
      });
    };
  }, [activeLink]);

  return (
    <>
      <style>{`
        html { scroll-padding-top: calc(20px + 92px + 16px); }
        .ph-nav {
          --pp-purple: #A58CF4; --pp-yellow: #FFD60A; --pp-white: #FAFAFA; --pp-black: #0D0D0D;
          --nav-top: 20px; --nav-h: 92px; --nav-font: 22px; --nav-logo: 68px; --nav-pad: 12px;
          position: fixed; top: var(--nav-top); left: 50%; transform: translateX(-50%); z-index: 1000;
          display: grid; grid-template-columns: 1fr auto 1fr; align-items: center;
          width: min(1040px, calc(100% - 48px)); height: var(--nav-h); padding: var(--nav-pad);
          background: var(--pp-black); border: 2.5px solid var(--pp-black); border-radius: 999px;
          box-shadow: 0 0 0 2.5px var(--pp-white), 6px 6px 0 var(--pp-purple);
          white-space: nowrap; transition: transform 0.3s ease;
        }
        @media (min-width: 1600px) { .ph-nav { --nav-h: 100px; --nav-font: 24px; --nav-logo: 74px; } }
        @media (min-width: 768px) and (max-width: 1024px) {
          .ph-nav { --nav-h: 80px; --nav-font: 18px; --nav-logo: 58px; }
          .pp-links a { padding: 12px 18px; }
        }
        .ph-nav.is-scrolled { transform: translateX(-50%) scale(0.94); }
        .ph-nav.is-hidden { transform: translateX(-50%) translateY(-140%); }
        .ph-nav.is-entering { animation: pp-drop-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1); }
        @keyframes pp-drop-in {
          0% { transform: translateX(-50%) translateY(-50px); opacity: 0; }
          60% { transform: translateX(-50%) translateY(8px); opacity: 1; }
          100% { transform: translateX(-50%) translateY(0); opacity: 1; }
        }
        .pp-logo { justify-self: start; position: relative; z-index: 1; width: var(--nav-logo); height: var(--nav-logo);
          min-width: var(--nav-logo); min-height: var(--nav-logo); border-radius: 50%;
          background: var(--pp-purple); border: 2px solid var(--pp-black); cursor: pointer; padding: 0;
          display: flex; align-items: center; justify-content: center;
          transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1); flex-shrink: 0; }
        .pp-logo:hover { transform: translateY(-4px) rotate(-8deg); }
        .pp-logo svg { width: 72%; height: 72%; display: block; }
        .pp-logo .pp-eyes { transition: transform 0.12s ease-out; transform-box: fill-box; transform-origin: center; }
        .pp-logo .pp-eyes.is-blinking { transform: scaleY(0.1); }
        .pp-links { justify-self: center; position: relative; z-index: 1; display: flex; align-items: center; gap: 8px; }
        .pp-highlight { position: absolute; top: 0; left: 0; height: 100%; width: 0; background: var(--pp-purple);
          border-radius: 999px; z-index: 0; pointer-events: none; opacity: 0;
          transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), width 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s ease; }
        .pp-highlight.is-visible { opacity: 1; }
        .pp-links a { position: relative; z-index: 1; font-family: "Geist", system-ui, sans-serif; font-weight: 500;
          font-size: var(--nav-font); color: var(--pp-white); cursor: pointer; padding: 14px 24px; border-radius: 999px;
          white-space: nowrap; text-decoration: none; transition: color 0.2s ease; min-height: 48px;
          display: inline-flex; align-items: center; }
        .pp-links a:hover, .pp-links a:focus-visible, .pp-links a.is-active { color: var(--pp-black); }
        .pp-nav-right { display: contents; }
        .pp-nav-right .pp-hire { justify-self: end; }
        .pp-menu-btn { display: none; }
        .pp-hire { position: relative; z-index: 1; font-family: "Zilla Slab", Rockwell, Georgia, serif; font-weight: 700;
          font-size: var(--nav-font); text-transform: uppercase; letter-spacing: 0.03em;
          color: var(--pp-white); background: var(--pp-black); border: 2px solid var(--pp-black);
          border-radius: 8px; padding: 14px 26px; height: 56px; cursor: pointer; display: inline-flex;
          align-items: center; gap: 8px; white-space: nowrap; min-height: 48px; flex-shrink: 0;
          transition: background 0.2s ease, transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.15s ease; }
        .pp-hire .pp-arrow { font-size: 18px; transition: transform 0.2s ease; display: inline-block; }
        .pp-hire:hover { background: var(--pp-purple); border-color: var(--pp-purple); color: var(--pp-black); transform: scale(1.05); }
        .pp-hire:hover .pp-arrow { transform: translate(2px, -2px); }
        .pp-hire:active { transform: translateY(2px) scale(1.02); box-shadow: 2px 2px 0 var(--pp-purple); }
        @media (max-width: 768px) {
          .ph-nav { --nav-top: 12px; --nav-h: 68px; --nav-logo: 48px; --nav-font: 16px;
            top: var(--nav-top); width: calc(100% - 24px); padding: 8px; grid-template-columns: auto 1fr auto; }
          .pp-links { display: none; }
          .pp-nav-right { display: flex; gap: 8px; justify-self: end; align-items: center; }
          .pp-menu-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px;
            font-family: "Geist", system-ui, sans-serif; font-weight: 600; font-size: 14px; color: var(--pp-black);
            background: var(--pp-purple); border: none; border-radius: 999px; padding: 10px 18px; cursor: pointer;
            min-height: 48px; height: 48px; white-space: nowrap; position: relative; z-index: 1; }
          .pp-hire { padding: 12px 20px; font-size: 16px; height: 48px; min-height: 48px; }
        }
      `}</style>
      <nav ref={navRef} className="ph-nav" aria-label="Main">
        <a className="pp-logo" onClick={onNavigateHome} aria-label="Home">
          <svg viewBox="0 0 44 44" aria-hidden="true">
            <circle cx="22" cy="22" r="20" fill="#A58CF4" />
            <g ref={logoEyesRef} className="pp-eyes" fill="#0D0D0D">
              <circle cx="16" cy="19" r="3" /><circle cx="28" cy="19" r="3" />
            </g>
            <path d="M16,27 Q22,31 28,27" stroke="#0D0D0D" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          </svg>
        </a>
        <div ref={linksWrapRef} className="pp-links">
          <span ref={highlightRef} className="pp-highlight" aria-hidden="true" />
          <a ref={homeLinkRef} onClick={onNavigateHome} className={activeLink === "home" ? "is-active" : ""}>Home</a>
          <a ref={workLinkRef} onClick={onNavigateWork} className={activeLink === "work" ? "is-active" : ""}>Work</a>
          <a ref={aboutLinkRef} onClick={onNavigateAbout} className={activeLink === "about" ? "is-active" : ""}>About</a>
        </div>
        <div className="pp-nav-right">
          <button className="pp-menu-btn" aria-expanded="false" onClick={() => {
            menuOpen.current = !menuOpen.current;
            navRef.current?.classList.toggle("is-open", menuOpen.current);
          }}>
            <span className="pp-burger" aria-hidden="true" />Menu
          </button>
          <button className="pp-hire" onClick={onNavigateHome}>Hire me <span className="pp-arrow">↗</span></button>
        </div>
      </nav>
    </>
  );
}
