import { useEffect, useRef } from "react";

/* ── ProjectHero: reusable hero for every project page ────────────────────
   Expected project fields: title, type (service), year, client (agency),
   image (heroImage URL), alt (descriptive alt text).
   Colors via CSS variables. No dark purple (#433075) anywhere. */

interface ProjectHeroProps {
  title: string;
  type: string;
  year: string;
  client: string;
  image: string;
  alt: string;
  onNavigateHome: () => void;
  onNavigateWork: () => void;
  onNavigateAbout: () => void;
  activeLink?: "home" | "work" | "about"; // which nav link gets the highlight
}

export default function ProjectHero({
  title, type, year, client, image, alt,
  onNavigateHome, onNavigateWork, onNavigateAbout,
  activeLink,
}: ProjectHeroProps) {
  const heroRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const blobsRef = useRef<HTMLDivElement>(null);
  const decoRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const highlightRef = useRef<HTMLSpanElement>(null);
  const logoEyesRef = useRef<SVGGElement>(null);
  const workLinkRef = useRef<HTMLAnchorElement>(null);
  const aboutLinkRef = useRef<HTMLAnchorElement>(null);
  const linksWrapRef = useRef<HTMLDivElement>(null);
  const menuOpen = useRef(false);

  // close the mobile menu (used by dropdown links)
  const closeMenu = () => {
    menuOpen.current = false;
    navRef.current?.classList.remove("is-open");
    navRef.current?.querySelector(".pp-menu-btn")?.setAttribute("aria-expanded", "false");
  };

  useEffect(() => {
    const hero = heroRef.current;
    const nav = navRef.current;
    if (!hero) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isTouch = window.matchMedia("(pointer: coarse)").matches;

    /* ── card tilt + decor parallax (skip on reduced-motion/touch) ── */
    let raf = 0;
    let mx = 0, my = 0;
    let cx = 0, cy = 0;
    let ticking = false;
    const onMouse = (e: MouseEvent) => {
      const r = hero.getBoundingClientRect();
      mx = (e.clientX - r.left) / r.width - 0.5;
      my = (e.clientY - r.top) / r.height - 0.5;
      if (!ticking) { ticking = true; raf = requestAnimationFrame(tick); }
    };
    const tick = () => {
      cx += (mx - cx) * 0.1;
      cy += (my - cy) * 0.1;
      if (cardRef.current) {
        cardRef.current.style.transform =
          `perspective(1000px) rotateY(${cx * 8}deg) rotateX(${-cy * 8}deg)`;
      }
      if (decoRef.current) {
        const kids = decoRef.current.children;
        for (let i = 0; i < kids.length; i++) {
          const depth = 10 + (i % 3) * 5;
          (kids[i] as HTMLElement).style.transform =
            `translate(${cx * depth * 2}px, ${cy * depth * 2}px)`;
        }
      }
      if (Math.abs(mx - cx) > 0.001 || Math.abs(my - cy) > 0.001) {
        raf = requestAnimationFrame(tick);
      } else {
        ticking = false;
      }
    };
    if (!reduceMotion && !isTouch) {
      hero.addEventListener("mousemove", onMouse);
    }

    /* ── nav: entrance (drop in) ── */
    if (nav && !reduceMotion) {
      requestAnimationFrame(() => nav.classList.add("is-entering"));
    }

    /* ── nav: sliding highlight (offsetLeft/offsetWidth — adapts to size changes) ── */
    const highlight = highlightRef.current;
    const linksWrap = linksWrapRef.current;
    const linkFor = (name: string | undefined) =>
      name === "work" ? workLinkRef.current : name === "about" ? aboutLinkRef.current : null;
    const moveHighlight = (el: HTMLElement | null) => {
      if (!highlight || !nav || !linksWrap || reduceMotion) return;
      if (!el) {
        highlight.classList.remove("is-visible");
        return;
      }
      // offsetLeft is relative to .pp-links; add its offset for nav-relative position
      const x = linksWrap.offsetLeft + el.offsetLeft;
      highlight.style.width = `${el.offsetWidth}px`;
      highlight.style.transform = `translateX(${x}px)`;
      highlight.classList.add("is-visible");
    };
    const activeEl = linkFor(activeLink);
    const highlightInit = window.setTimeout(() => moveHighlight(activeEl), 100);
    // recompute on font load and after entrance (layout may shift)
    if (document.fonts?.ready) {
      document.fonts.ready.then(() => moveHighlight(activeEl)).catch(() => {});
    }
    const highlightAfterEnter = window.setTimeout(() => moveHighlight(activeEl), 900);
    const linkEls = [workLinkRef.current, aboutLinkRef.current].filter(Boolean) as HTMLAnchorElement[];
    const onLinkEnter = (e: Event) => moveHighlight(e.currentTarget as HTMLElement);
    const onLinkLeave = () => moveHighlight(activeEl);
    const onLinkFocus = (e: Event) => moveHighlight(e.currentTarget as HTMLElement);
    const onLinkBlur = () => moveHighlight(activeEl);
    linkEls.forEach((el) => {
      el.addEventListener("mouseenter", onLinkEnter);
      el.addEventListener("mouseleave", onLinkLeave);
      el.addEventListener("focus", onLinkFocus);
      el.addEventListener("blur", onLinkBlur);
    });
    window.addEventListener("resize", onLinkLeave);

    /* ── nav: logo face — eyes follow cursor (2px), blink, wiggle ── */
    const logoEyes = logoEyesRef.current;
    const logoLink = nav?.querySelector(".pp-logo") as HTMLElement | null;
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
      }, 4000 + Math.random() * 1000);
    };
    if (!reduceMotion) scheduleBlink();
    let wiggleTimer = 0;
    const scheduleWiggle = () => {
      wiggleTimer = window.setTimeout(() => {
        if (logoLink && !reduceMotion) {
          logoLink.style.transform = "rotate(-8deg) translateY(-4px)";
          window.setTimeout(() => { if (logoLink) logoLink.style.transform = ""; }, 400);
        }
        scheduleWiggle();
      }, 10000 + Math.random() * 2000);
    };
    if (!reduceMotion) scheduleWiggle();

    /* ── nav: scroll — shrink after 120px, hide on fast scroll down (rAF, no layout reads) ── */
    let lastY = window.scrollY;
    let scrollTicking = false;
    const onScroll = () => {
      if (scrollTicking) return;
      scrollTicking = true;
      requestAnimationFrame(() => {
        scrollTicking = false;
        const y = window.scrollY;
        if (blobsRef.current) {
          blobsRef.current.style.transform = `translateY(${y * 0.12}px)`;
        }
        if (!nav || reduceMotion) { lastY = y; return; }
        const dy = y - lastY;
        nav.classList.toggle("is-scrolled", y > 120);
        if (y < 100) {
          nav.classList.remove("is-hidden");
        } else if (dy > 8) {
          nav.classList.add("is-hidden");
        } else if (dy < -4) {
          nav.classList.remove("is-hidden");
        }
        lastY = y;
      });
    };

    /* ── nav: close mobile menu on outside tap ── */
    const onDocClick = (e: MouseEvent) => {
      if (menuOpen.current && nav && !nav.contains(e.target as Node)) {
        menuOpen.current = false;
        nav.classList.remove("is-open");
        nav.querySelector(".pp-menu-btn")?.setAttribute("aria-expanded", "false");
      }
    };
    document.addEventListener("click", onDocClick);

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      hero.removeEventListener("mousemove", onMouse);
      window.removeEventListener("mousemove", onLogoMouse);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("click", onDocClick);
      window.removeEventListener("resize", onLinkLeave);
      window.clearTimeout(highlightInit);
      window.clearTimeout(highlightAfterEnter);
      window.clearTimeout(blinkTimer);
      window.clearTimeout(wiggleTimer);
      cancelAnimationFrame(raf);
      linkEls.forEach((el) => {
        el.removeEventListener("mouseenter", onLinkEnter);
        el.removeEventListener("mouseleave", onLinkLeave);
        el.removeEventListener("focus", onLinkFocus);
        el.removeEventListener("blur", onLinkBlur);
      });
    };
  }, [activeLink]);

  // (hero title removed per user request — pills + card only)
  const tags = [
    { label: type, cls: "tag-purple" },
    { label: year, cls: "tag-yellow" },
    { label: client, cls: "tag-pink" },
  ];

  return (
    <>
      <style>{`
        html { scroll-padding-top: 112px; } /* anchors never hide under the floating pill nav */
        .ph-hero {
          --ph-purple-light: #A58CF4;
          --ph-pink: #ff0a8a;
          --ph-yellow: #ffd60a;
          --ph-soft-white: #FAFAFA;
          --ph-jet-black: #0D0D0D;
          position: relative;
          width: 100%;
          height: 1050px;
          min-height: 640px;
          background: var(--ph-jet-black);
          overflow: visible; /* card overlaps bottom edge by ~80px */
        }
        .ph-hero-bg {
          position: absolute;
          inset: 0;
          height: 1050px;
          overflow: hidden;
          background: var(--ph-jet-black);
        }
        /* gradient mesh: 3 pre-softened radial blobs */
        .ph-hero-bg::before {
          content: "";
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse 700px 480px at 18% 18%, rgba(165,140,244,0.55), transparent 70%),
            radial-gradient(ellipse 340px 280px at 82% 78%, rgba(255,10,138,0.30), transparent 70%),
            radial-gradient(ellipse 220px 170px at 86% 14%, rgba(255,214,10,0.18), transparent 70%);
          pointer-events: none;
        }
        /* grain at ~4% */
        .ph-hero-bg::after {
          content: "";
          position: absolute;
          inset: 0;
          opacity: 0.04;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)'/%3E%3C/svg%3E");
          pointer-events: none;
        }
        .ph-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px);
          background-size: 120px 120px;
          pointer-events: none;
        }
        .ph-blobs { position: absolute; inset: 0; pointer-events: none; }
        .ph-blob { position: absolute; border-radius: 50%; }
        .ph-blob-1 {
          width: 560px; height: 560px; left: -120px; top: -140px;
          background: radial-gradient(circle, rgba(165,140,244,0.5), transparent 70%);
          animation: ph-drift 18s ease-in-out infinite alternate;
        }
        .ph-blob-2 {
          width: 380px; height: 380px; right: -80px; bottom: 60px;
          background: radial-gradient(circle, rgba(255,10,138,0.28), transparent 70%);
          animation: ph-drift 14s ease-in-out infinite alternate-reverse;
        }
        .ph-blob-3 {
          width: 240px; height: 240px; right: 12%; top: 8%;
          background: radial-gradient(circle, rgba(255,214,10,0.16), transparent 70%);
          animation: ph-drift 20s ease-in-out infinite alternate;
        }
        @keyframes ph-drift {
          from { transform: translate(0, 0); }
          to { transform: translate(40px, -40px); }
        }

        /* ── nav: compact floating pill (reference style) ── */
        .ph-nav {
          --pp-purple: #A58CF4;
          --pp-yellow: #FFD60A;
          --pp-white: #FAFAFA;
          --pp-black: #0D0D0D;
          /* size variables — tweak in one place */
          --nav-h: 76px;
          --nav-font: 18px;
          --nav-logo: 56px;
          --nav-pad: 10px;
          --nav-gap: 8px;
          position: fixed;
          top: 22px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 1000;
          display: flex;
          align-items: center;
          gap: var(--nav-gap);
          width: fit-content;
          max-width: min(900px, calc(100% - 32px));
          height: var(--nav-h);
          padding: var(--nav-pad);
          background: var(--pp-black); /* solid, no transparency */
          border: 2.5px solid var(--pp-black);
          border-radius: 999px;
          box-shadow:
            0 0 0 2.5px var(--pp-white), /* outer white ring */
            6px 6px 0 var(--pp-purple); /* hard offset shadow, playful sticker */
          white-space: nowrap;
          transition: transform 0.3s ease;
        }
        /* large screens: scale up a bit more */
        @media (min-width: 1600px) {
          .ph-nav { --nav-h: 84px; --nav-font: 20px; --nav-logo: 62px; }
        }
        /* tablet: slightly smaller */
        @media (min-width: 768px) and (max-width: 1024px) {
          .ph-nav { --nav-h: 68px; --nav-font: 16px; }
          .pp-links a { padding: 12px 18px; }
        }
        /* scroll: shrink after 120px, hide on fast scroll down */
        .ph-nav.is-scrolled { transform: translateX(-50%) scale(0.94); }
        .ph-nav.is-hidden { transform: translateX(-50%) translateY(-140%); }
        /* entrance: drop in with overshoot */
        .ph-nav.is-entering { animation: pp-drop-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1); }
        @keyframes pp-drop-in {
          0% { transform: translateX(-50%) translateY(-50px); opacity: 0; }
          60% { transform: translateX(-50%) translateY(8px); opacity: 1; }
          100% { transform: translateX(-50%) translateY(0); opacity: 1; }
        }
        .ph-nav.is-entering .pp-logo,
        .ph-nav.is-entering .pp-links a,
        .ph-nav.is-entering .pp-hire {
          animation: pp-pop-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) backwards;
        }
        .ph-nav.is-entering .pp-links a:nth-child(1) { animation-delay: 0.07s; }
        .ph-nav.is-entering .pp-links a:nth-child(2) { animation-delay: 0.14s; }
        .ph-nav.is-entering .pp-hire { animation-delay: 0.21s; }
        @keyframes pp-pop-in {
          0% { transform: scale(0.8); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        /* sliding highlight behind hovered/active link */
        .pp-highlight {
          position: absolute;
          top: var(--nav-pad);
          left: 0;
          height: calc(var(--nav-h) - var(--nav-pad) * 2); /* 56px on desktop */
          width: 0;
          background: var(--pp-purple);
          border-radius: 999px;
          z-index: 0;
          pointer-events: none;
          transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1),
                      width 0.35s cubic-bezier(0.34, 1.56, 0.64, 1),
                      opacity 0.2s ease;
          opacity: 0;
        }
        .pp-highlight.is-visible { opacity: 1; }
        /* logo: round button with cartoon face */
        .pp-logo {
          position: relative;
          z-index: 1;
          width: var(--nav-logo);
          height: var(--nav-logo);
          min-width: var(--nav-logo);
          min-height: var(--nav-logo);
          border-radius: 50%;
          background: var(--pp-purple);
          border: 2px solid var(--pp-black);
          cursor: pointer;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
          flex-shrink: 0;
        }
        .pp-logo:hover { transform: translateY(-4px) rotate(-8deg); }
        .pp-logo svg { width: 72%; height: 72%; display: block; }
        .pp-logo .pp-eyes { transition: transform 0.12s ease-out; }
        .pp-logo .pp-eyes.is-blinking { transform: scaleY(0.1); }
        .pp-logo .pp-eyes { transform-box: fill-box; transform-origin: center; }
        /* links: Geist 500, normal case */
        .pp-links {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .pp-links a {
          position: relative;
          z-index: 1;
          font-family: "Geist", system-ui, sans-serif;
          font-weight: 500;
          font-size: var(--nav-font);
          color: var(--pp-white);
          cursor: pointer;
          padding: 14px 24px;
          border-radius: 999px;
          white-space: nowrap;
          text-decoration: none;
          transition: color 0.2s ease;
          min-height: 48px;
          display: inline-flex;
          align-items: center;
        }
        .pp-links a:hover, .pp-links a:focus-visible { color: var(--pp-black); }
        .pp-links a.is-active { color: var(--pp-black); }
        /* hire: white pill button */
        .pp-hire {
          position: relative;
          z-index: 1;
          font-family: "Geist", system-ui, sans-serif;
          font-weight: 600;
          font-size: var(--nav-font);
          color: var(--pp-black);
          background: var(--pp-white);
          border: none;
          border-radius: 999px;
          padding: 16px 30px;
          height: 56px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          white-space: nowrap;
          min-height: 48px;
          flex-shrink: 0;
          transition: background 0.2s ease, transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.15s ease;
        }
        .pp-hire .pp-arrow { font-size: 18px; }
        .pp-hire:hover {
          background: var(--pp-yellow);
          transform: scale(1.05);
        }
        .pp-hire:hover .pp-arrow { transform: translate(2px, -2px); }
        .pp-hire .pp-arrow { transition: transform 0.2s ease; display: inline-block; }
        .pp-hire:active {
          transform: translateY(2px) scale(1.02);
          box-shadow: 2px 2px 0 var(--pp-purple);
        }
        /* visible focus ring */
        .ph-nav a:focus-visible,
        .ph-nav button:focus-visible {
          outline: 3px solid var(--pp-yellow);
          outline-offset: 3px;
        }
        /* mobile menu button (hidden on desktop) */
        .pp-menu-btn { display: none; }
        .pp-mobile-menu { display: none; }
        .ph-menu-btn { display: none; }

        /* tag pills */
        .ph-tags {
          position: relative;
          z-index: 10;
          display: flex;
          justify-content: center;
          gap: 12px;
          margin-top: 320px; /* title removed: pills sit where the title was */
          flex-wrap: wrap;
          padding: 0 24px;
        }
        .ph-tag {
          font-family: "Zilla Slab", Rockwell, Georgia, serif;
          font-weight: 700;
          font-size: 15px;
          padding: 10px 22px;
          border-radius: 999px;
          transform: scale(0.6);
          opacity: 0;
          animation: ph-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          white-space: nowrap;
        }
        @keyframes ph-pop {
          0% { transform: scale(0.6); opacity: 0; }
          60% { transform: scale(1.08); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .tag-purple { background: var(--ph-purple-light); color: var(--ph-jet-black); }
        .tag-yellow { background: var(--ph-yellow); color: var(--ph-jet-black); }
        .tag-pink { background: var(--ph-pink); color: var(--ph-soft-white); }

        /* sticker card */
        .ph-card-wrap {
          position: relative;
          z-index: 10;
          width: min(1100px, 88vw);
          margin: 48px auto 0;
          animation: ph-card-in 0.9s cubic-bezier(0.22, 1, 0.36, 1) 0.35s backwards;
        }
        @keyframes ph-card-in {
          from { transform: translateY(60px) rotate(-3deg); opacity: 0; }
          to { transform: translateY(0) rotate(0); opacity: 1; }
        }
        .ph-card {
          position: relative;
          border-radius: 28px;
          border: 3px solid var(--ph-jet-black);
          /* white ring via box-shadow (follows border-radius cleanly, unlike outline) */
          box-shadow:
            0 0 0 2px var(--ph-soft-white),
            10px 10px 0 var(--ph-purple-light);
          overflow: hidden;
          aspect-ratio: 16 / 9;
          background: var(--ph-jet-black);
          animation: ph-float 5s ease-in-out 1.4s infinite;
          transform-style: preserve-3d;
          will-change: transform;
        }
        @keyframes ph-float {
          0%, 100% { translate: 0 0; }
          50% { translate: 0 -8px; }
        }
        .ph-card img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        /* floating decorations (behind card) */
        .ph-deco { position: absolute; inset: 0; z-index: 5; pointer-events: none; }
        .ph-deco > * { position: absolute; }
        .ph-sparkle { animation: ph-twinkle 3s ease-in-out infinite; }
        @keyframes ph-twinkle {
          0%, 100% { opacity: 0.6; transform: rotate(0deg) scale(1); }
          50% { opacity: 1; transform: rotate(20deg) scale(1.15); }
        }
        .ph-face { animation: ph-blink 4.5s ease-in-out infinite; }
        @keyframes ph-blink {
          0%, 92%, 100% { transform: scaleY(1); }
          95% { transform: scaleY(0.1); }
        }

        /* responsive */
        @media (max-width: 768px) {
          /* mobile: compact pill — logo, menu button, hire (48px tap targets) */
          .ph-nav {
            --nav-h: 64px;
            --nav-logo: 48px;
            --nav-font: 16px;
            top: 12px;
            width: calc(100% - 24px);
            padding: 8px;
            gap: 6px;
          }
          .pp-links { display: none; }
          .pp-menu-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            position: relative;
            z-index: 1;
            font-family: "Geist", system-ui, sans-serif;
            font-weight: 600;
            font-size: 14px;
            color: var(--pp-black);
            background: var(--pp-purple);
            border: none;
            border-radius: 999px;
            padding: 10px 18px;
            cursor: pointer;
            min-height: 48px;
            height: 48px;
            white-space: nowrap;
          }
          /* hamburger morphs to X */
          .pp-menu-btn .pp-burger {
            position: relative;
            width: 18px;
            height: 2px;
            background: var(--pp-black);
            border-radius: 2px;
            transition: background 0.2s ease;
          }
          .pp-menu-btn .pp-burger::before,
          .pp-menu-btn .pp-burger::after {
            content: "";
            position: absolute;
            left: 0;
            width: 18px;
            height: 2px;
            background: var(--pp-black);
            border-radius: 2px;
            transition: transform 0.25s ease;
          }
          .pp-menu-btn .pp-burger::before { top: -5px; }
          .pp-menu-btn .pp-burger::after { top: 5px; }
          .pp-menu-btn[aria-expanded="true"] .pp-burger { background: transparent; }
          .pp-menu-btn[aria-expanded="true"] .pp-burger::before { transform: translateY(5px) rotate(45deg); }
          .pp-menu-btn[aria-expanded="true"] .pp-burger::after { transform: translateY(-5px) rotate(-45deg); }
          .pp-hire { padding: 12px 20px; font-size: 16px; height: 48px; min-height: 48px; }
          /* dropdown under the pill */
          .pp-mobile-menu {
            display: block;
            position: fixed;
            top: 84px;
            left: 50%;
            transform: translateX(-50%) scale(0.95);
            transform-origin: top center;
            opacity: 0;
            pointer-events: none;
            z-index: 999;
            background: var(--pp-black);
            border-radius: 28px;
            border: 2px solid var(--pp-black);
            box-shadow:
              0 0 0 2px var(--pp-white),
              4px 4px 0 var(--pp-purple);
            padding: 12px;
            min-width: 240px;
            transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s ease;
          }
          .ph-nav.is-open .pp-mobile-menu {
            transform: translateX(-50%) scale(1);
            opacity: 1;
            pointer-events: auto;
          }
          .pp-mobile-menu a {
            display: flex;
            align-items: center;
            position: relative;
            z-index: 1;
            font-family: "Geist", system-ui, sans-serif;
            font-weight: 600;
            font-size: 24px;
            color: var(--pp-white);
            padding: 14px 20px;
            border-radius: 18px;
            cursor: pointer;
            text-decoration: none;
            min-height: 56px;
            transition: background 0.2s ease, color 0.2s ease;
          }
          .pp-mobile-menu a:hover, .pp-mobile-menu a:focus-visible {
            background: var(--pp-purple);
            color: var(--pp-black);
          }
          .ph-tags { margin-top: 140px; } /* mobile: pills higher without title */
          .ph-card-wrap { width: 92vw; }
          .ph-card {
            aspect-ratio: 4 / 3;
            box-shadow:
              0 0 0 2px var(--ph-soft-white),
              6px 6px 0 var(--ph-purple-light);
          }
          .ph-deco .ph-deco-extra { display: none; } /* 2 decorations on mobile */
        }

        /* reduced motion: final static layout */
        @media (prefers-reduced-motion: reduce) {
          .ph-nav { transition: none; animation: none; }
          .ph-nav.is-entering,
          .ph-nav.is-entering .pp-logo,
          .ph-nav.is-entering .pp-links a,
          .ph-nav.is-entering .pp-hire { animation: none; }
          .pp-highlight { transition: none; } /* instant highlight, no spring */
          .pp-logo .pp-eyes { animation: none; }
          .ph-tag { animation: none; transform: none; opacity: 1; }
          .ph-card-wrap { animation: none; }
          .ph-card { animation: none; }
          .ph-blob { animation: none; }
          .ph-sparkle, .ph-face { animation: none; }
        }
      `}</style>

      <div ref={heroRef} className="ph-hero">
        <div className="ph-hero-bg" aria-hidden="true" />
        <div className="ph-grid" aria-hidden="true" />
        <div ref={blobsRef} className="ph-blobs" aria-hidden="true">
          <div className="ph-blob ph-blob-1" />
          <div className="ph-blob ph-blob-2" />
          <div className="ph-blob ph-blob-3" />
        </div>

        {/* nav */}
        <nav ref={navRef} className="ph-nav" aria-label="Main">
          {/* sliding highlight behind the hovered/active link */}
          <span ref={highlightRef} className="pp-highlight" aria-hidden="true" />
          {/* logo: round button with cartoon face → HOME */}
          <a
            className="pp-logo"
            onClick={onNavigateHome}
            aria-label="Home"
            aria-current={activeLink === "home" ? "page" : undefined}
          >
            <svg viewBox="0 0 44 44" aria-hidden="true">
              <circle cx="22" cy="22" r="20" fill="#A58CF4" />
              <g ref={logoEyesRef} className="pp-eyes" fill="#0D0D0D">
                <circle cx="16" cy="19" r="3" />
                <circle cx="28" cy="19" r="3" />
              </g>
              <path
                d="M16,27 Q22,31 28,27"
                stroke="#0D0D0D"
                strokeWidth="2.5"
                fill="none"
                strokeLinecap="round"
              />
            </svg>
          </a>
          {/* middle links */}
          <div ref={linksWrapRef} className="pp-links">
            <a
              ref={workLinkRef}
              onClick={onNavigateWork}
              aria-current={activeLink === "work" ? "page" : undefined}
              className={activeLink === "work" ? "is-active" : ""}
            >Work</a>
            <a
              ref={aboutLinkRef}
              onClick={onNavigateAbout}
              aria-current={activeLink === "about" ? "page" : undefined}
              className={activeLink === "about" ? "is-active" : ""}
            >About</a>
          </div>
          {/* mobile menu button */}
          <button
            className="pp-menu-btn"
            aria-expanded="false"
            aria-controls="pp-mobile-menu"
            onClick={() => {
              menuOpen.current = !menuOpen.current;
              const isOpen = menuOpen.current;
              navRef.current?.classList.toggle("is-open", isOpen);
              navRef.current?.querySelector(".pp-menu-btn")?.setAttribute("aria-expanded", isOpen ? "true" : "false");
            }}
          >
            <span className="pp-burger" aria-hidden="true" />
            Menu
          </button>
          {/* hire: white pill → same link as before */}
          <button className="pp-hire" onClick={onNavigateHome}>
            Hire me <span className="pp-arrow">↗</span>
          </button>
          {/* mobile dropdown */}
          <div id="pp-mobile-menu" className="pp-mobile-menu" role="menu">
            <a onClick={() => { closeMenu(); onNavigateWork(); }} role="menuitem">Work</a>
            <a onClick={() => { closeMenu(); onNavigateAbout(); }} role="menuitem">About</a>
          </div>
        </nav>

        {/* tag pills: pop, stagger 90ms */}
        <div className="ph-tags">
          {tags.map((t, i) => (
            <span key={t.label} className={`ph-tag ${t.cls}`} style={{ animationDelay: `${400 + i * 90}ms` }}>
              {t.label}
            </span>
          ))}
        </div>

        {/* sticker card */}
        <div className="ph-card-wrap">
          <div ref={cardRef} className="ph-card">
            <img src={image} alt={alt} loading="eager" decoding="async" />
          </div>
        </div>

        {/* floating decorations */}
        <div ref={decoRef} className="ph-deco" aria-hidden="true">
          {/* yellow sparkle, top-left of card */}
          <svg className="ph-sparkle" width="44" height="44" viewBox="0 0 44 44" style={{ left: "12%", top: "42%" }}>
            <path d="M22 0 L26 18 L44 22 L26 26 L22 44 L18 26 L0 22 L18 18 Z" fill="#ffd60a" />
          </svg>
          {/* pink sparkle, right of card */}
          <svg className="ph-sparkle ph-deco-extra" width="36" height="36" viewBox="0 0 44 44" style={{ right: "10%", top: "55%", animationDelay: "1.2s" }}>
            <path d="M22 0 L26 18 L44 22 L26 26 L22 44 L18 26 L0 22 L18 18 Z" fill="#ff0a8a" />
          </svg>
          {/* cute-face circle, bottom-left */}
          <svg className="ph-face" width="48" height="48" viewBox="0 0 48 48" style={{ left: "16%", bottom: "18%" }}>
            <circle cx="24" cy="24" r="22" fill="#A58CF4" />
            <circle cx="17" cy="20" r="2.5" fill="#0D0D0D" />
            <circle cx="31" cy="20" r="2.5" fill="#0D0D0D" />
          </svg>
          {/* plus sign, top-right */}
          <svg className="ph-deco-extra" width="32" height="32" viewBox="0 0 32 32" style={{ right: "18%", top: "38%" }}>
            <rect x="13" y="4" width="6" height="24" rx="3" fill="#FAFAFA" />
            <rect x="4" y="13" width="24" height="6" rx="3" fill="#FAFAFA" />
          </svg>
        </div>
      </div>
    </>
  );
}
