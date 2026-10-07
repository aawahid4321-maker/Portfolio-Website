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
  const homeLinkRef = useRef<HTMLAnchorElement>(null);
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
      // card tilts max 3deg toward the mouse (perspective 1200px on parent)
      // applied to .ph-card-wrap only — .ph-card corners stay perfect
      if (cardRef.current) {
        cardRef.current.style.transform =
          `rotateY(${cx * 6}deg) rotateX(${-cy * 6}deg)`;
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

    /* ── card: start floating after entrance ── */
    if (cardRef.current && !reduceMotion && !isTouch) {
      const cardWrap = cardRef.current;
      window.setTimeout(() => cardWrap.classList.add("is-floating"), 1400);
    }

    /* ── card: cursor parallax (2D only, max 8px + 1.5deg), emoji at depths ── */
    const heroEl = document.querySelector(".ph-hero") as HTMLElement | null;
    const cardWrapEl = cardRef.current;
    let px = 0, py = 0, tx = 0, ty = 0, rafPar = 0;
    const onHeroMouse = (e: MouseEvent) => {
      if (!heroEl || !cardWrapEl || reduceMotion || isTouch) return;
      const r = heroEl.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width - 0.5) * 16; // ±8px
      ty = ((e.clientY - r.top) / r.height - 0.5) * 16;
    };
    const parTick = () => {
      px += (tx - px) * 0.1; py += (ty - py) * 0.1; // lerp 0.1
      if (cardWrapEl && !cardWrapEl.classList.contains("is-floating")) {
        // only apply when not floating (avoid transform conflict)
        cardWrapEl.style.translate = `${px}px ${py}px`;
        cardWrapEl.style.rotate = `${px * 0.09}deg`; // up to ~1.5deg
      }
      // emoji shift at different depths (12-24px)
      document.querySelectorAll(".ph-emoji").forEach((el, i) => {
        const depth = 12 + (i % 3) * 6;
        (el as HTMLElement).style.translate = `${px * depth / 16}px ${py * depth / 16}px`;
      });
      rafPar = requestAnimationFrame(parTick);
    };
    if (heroEl && !reduceMotion && !isTouch) {
      heroEl.addEventListener("mousemove", onHeroMouse);
      rafPar = requestAnimationFrame(parTick);
    }

    /* ── card: click confetti (6 pieces, 700ms) ── */
    const onCardClick = (e: MouseEvent) => {
      if (!cardWrapEl || reduceMotion) return;
      // squish: 0.97 → 1.03 → 1
      cardWrapEl.animate(
        [{ transform: "scale(0.97)" }, { transform: "scale(1.03)" }, { transform: "scale(1)" }],
        { duration: 300, easing: "ease-out" }
      );
      const colors = ["#A58CF4", "#FF0A8A", "#FFD60A", "#FF5A00"];
      const shapes = ["✦", "●", "✦", "●", "✦", "●"];
      for (let i = 0; i < 6; i++) {
        const s = document.createElement("span");
        s.textContent = shapes[i];
        s.style.cssText = `position:fixed;left:${e.clientX}px;top:${e.clientY}px;color:${colors[i % 4]};font-size:20px;pointer-events:none;z-index:9999;`;
        document.body.appendChild(s);
        const ang = (i / 6) * Math.PI * 2;
        s.animate(
          [
            { transform: "translate(0,0) scale(1)", opacity: 1 },
            { transform: `translate(${Math.cos(ang) * 80}px,${Math.sin(ang) * 80 - 30}px) scale(0.5)`, opacity: 0 },
          ],
          { duration: 700, easing: "cubic-bezier(0.22,1,0.36,1)" }
        ).onfinish = () => s.remove();
      }
    };
    cardWrapEl?.addEventListener("click", onCardClick as EventListener);

    /* ── card: scroll parallax (scale 1→0.96, move up 30px) ── */
    let scrollRaf = 0;
    const onCardScroll = () => {
      if (scrollRaf) return;
      scrollRaf = requestAnimationFrame(() => {
        scrollRaf = 0;
        if (!cardWrapEl || reduceMotion) return;
        const y = window.scrollY;
        const p = Math.min(y / 600, 1); // 0→1 over 600px
        cardWrapEl.style.scale = `${1 - p * 0.04}`;
      });
    };
    window.addEventListener("scroll", onCardScroll, { passive: true });

    /* ── pause idle animations when hero off-screen ── */
    const heroObs = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        document.querySelectorAll(".ph-emoji, .ph-card-wrap.is-floating").forEach((el) => {
          (el as HTMLElement).style.animationPlayState = en.isIntersecting ? "running" : "paused";
        });
      });
    }, { threshold: 0.1 });
    if (heroEl) heroObs.observe(heroEl);

    /* ── nav: sliding highlight (offsetLeft/offsetWidth relative to .pp-links) ── */
    const highlight = highlightRef.current;
    const linksWrap = linksWrapRef.current;
    const linkFor = (name: string | undefined) =>
      name === "home" ? homeLinkRef.current : name === "work" ? workLinkRef.current : name === "about" ? aboutLinkRef.current : null;
    const moveHighlight = (el: HTMLElement | null) => {
      if (!highlight || !linksWrap || reduceMotion) return;
      if (!el) {
        highlight.classList.remove("is-visible");
        return;
      }
      // highlight is inside .pp-links: offsetLeft is relative to it
      highlight.style.width = `${el.offsetWidth}px`;
      highlight.style.transform = `translateX(${el.offsetLeft}px)`;
      highlight.classList.add("is-visible");
    };
    const activeEl = linkFor(activeLink);
    const highlightInit = window.setTimeout(() => moveHighlight(activeEl), 100);
    // recompute on font load and after entrance (layout may shift)
    if (document.fonts?.ready) {
      document.fonts.ready.then(() => moveHighlight(activeEl)).catch(() => {});
    }
    const highlightAfterEnter = window.setTimeout(() => moveHighlight(activeEl), 900);
    const linkEls = [homeLinkRef.current, workLinkRef.current, aboutLinkRef.current].filter(Boolean) as HTMLAnchorElement[];
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
        // nav always stays visible while scrolling (no hide on scroll down)
        nav.classList.remove("is-hidden");
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
      window.removeEventListener("scroll", onCardScroll);
      heroEl?.removeEventListener("mousemove", onHeroMouse);
      cardWrapEl?.removeEventListener("click", onCardClick as EventListener);
      cancelAnimationFrame(rafPar);
      cancelAnimationFrame(scrollRaf);
      heroObs.disconnect();
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

  // (hero title restored per user request)
  // emoji per tag: type, year, client
  const tagEmojis = ["🎨", "📅", "💜"];
  const tags = [
    { label: type, cls: "tag-purple", emoji: tagEmojis[0] },
    { label: year, cls: "tag-yellow", emoji: tagEmojis[1] },
    { label: client, cls: "tag-pink", emoji: tagEmojis[2] },
  ];

  // 8 floating emoji stickers: pick by project type
  const lowerType = (type || "").toLowerCase();
  const lowerTitle = (title || "").toLowerCase();
  let emojiChars = ["🎨", "✨", "🚀", "💡", "🔥", "💜", "👋", "🎯"]; // default
  if (lowerTitle.includes("coffee") || lowerTitle.includes("noir")) {
    emojiChars = ["☕", "🫘", "✨", "💜", "🔥", "🎨", "💡", "👋"];
  } else if (lowerType.includes("print") || lowerTitle.includes("brochure")) {
    emojiChars = ["🖨️", "📐", "✏️", "🎨", "✨", "💡", "🔥", "👋"];
  } else if (lowerType.includes("brand") || lowerType.includes("logo") || lowerType.includes("identity")) {
    emojiChars = ["🎨", "✨", "🎯", "💡", "🔥", "💜", "🚀", "👋"];
  }
  const emojiBgs = ["#A58CF4", "#FF0A8A", "#FFD60A", "#FF5A00", "#FAFAFA", "#A58CF4", "#FF0A8A", "#FFD60A"];
  const emojiStickers = emojiChars.map((char, i) => {
    const isLeft = i % 2 === 0;
    const offset = 16 + ((i * 11) % 44); // 16-60px outside card edge
    return {
      char,
      bg: emojiBgs[i],
      size: `${56 + (i % 3) * 8}px`, // 56-72px
      // position outside card: card half-width = min(450px, 42vw)
      left: isLeft ? `calc(50% - min(450px, 42vw) - ${offset}px - 64px)` : undefined,
      right: !isLeft ? `calc(50% - min(450px, 42vw) - ${offset}px - 64px)` : undefined,
      top: `${20 + ((i * 17) % 60)}%`, // spread vertically, never under nav
      rot: -14 + ((i * 7) % 28), // -14 to 14deg
      popDelay: `${0.6 + i * 0.08}s`, // stagger 80ms
      delay: `${(i * 0.4) % 3}s`,
      dur: `${3 + (i % 4)}s`, // 3-6s
    };
  });

  return (
    <>
      <style>{`
        html { scroll-padding-top: calc(20px + 92px + 16px); } /* anchors clear the floating nav */
        .ph-hero {
          --ph-purple-light: #A58CF4;
          --ph-pink: #ff0a8a;
          --ph-yellow: #ffd60a;
          --ph-soft-white: #FAFAFA;
          --ph-jet-black: #0D0D0D;
          --hero-gap: 24px;
          /* clean vertical stack — content always starts BELOW the nav */
          position: relative;
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          gap: var(--hero-gap);
          /* top clears nav (20 + 92 + 40 = 152px); bottom 72px so card+shadow fit */
          padding-top: calc(var(--nav-top, 20px) + var(--nav-h, 92px) + 40px);
          padding-bottom: 72px;
          padding-inline: 24px;
          background: var(--ph-jet-black);
          overflow: visible; /* never clip the card's hard shadow */
        }
        .ph-hero-bg {
          position: absolute;
          inset: 0;
          overflow: hidden; /* clips blobs only, never the card */
          background: var(--ph-jet-black);
          border-radius: inherit;
        }
        /* gradient mesh: smaller, softer blobs behind the card area */
        .ph-hero-bg::before {
          content: "";
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse 420px 300px at 22% 30%, rgba(165,140,244,0.45), transparent 70%),
            radial-gradient(ellipse 280px 220px at 78% 72%, rgba(255,10,138,0.25), transparent 70%),
            radial-gradient(ellipse 180px 140px at 80% 20%, rgba(255,214,10,0.15), transparent 70%);
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
        .ph-blobs { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
        .ph-blob { position: absolute; border-radius: 50%; }
        .ph-blob-1 {
          width: 420px; height: 420px; left: -80px; top: -60px;
          background: radial-gradient(circle, rgba(165,140,244,0.45), transparent 70%);
          animation: ph-drift 18s ease-in-out infinite alternate;
        }
        .ph-blob-2 {
          width: 300px; height: 300px; right: -40px; bottom: -20px;
          background: radial-gradient(circle, rgba(255,10,138,0.25), transparent 70%);
          animation: ph-drift 14s ease-in-out infinite alternate-reverse;
        }
        .ph-blob-3 {
          width: 200px; height: 200px; right: 8%; top: 6%;
          background: radial-gradient(circle, rgba(255,214,10,0.15), transparent 70%);
          animation: ph-drift 20s ease-in-out infinite alternate;
        }
        @keyframes ph-drift {
          from { transform: translate(0, 0); }
          to { transform: translate(30px, -30px); }
        }

        /* ── nav: 3-zone grid (logo left / links center / hire right) ── */
        .ph-nav {
          --pp-purple: #A58CF4;
          --pp-yellow: #FFD60A;
          --pp-white: #FAFAFA;
          --pp-black: #0D0D0D;
          /* size variables — tweak in one place */
          --nav-top: 20px;
          --nav-h: 92px;
          --nav-font: 22px;
          --nav-logo: 68px;
          --nav-pad: 12px;
          position: fixed;
          top: var(--nav-top);
          left: 50%;
          transform: translateX(-50%);
          z-index: 1000;
          /* 3-column grid: 1fr auto 1fr keeps links centered, logo/hire at edges */
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          width: min(1040px, calc(100% - 48px));
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
        .pp-logo { justify-self: start; }
        .pp-links { justify-self: center; }
        /* right zone wrapper: transparent on desktop (children in grid), flex on mobile */
        .pp-nav-right { display: contents; }
        .pp-nav-right .pp-hire { justify-self: end; }
        .pp-menu-btn { display: none; } /* desktop: hidden */
        /* large screens: scale up a bit more */
        @media (min-width: 1600px) {
          .ph-nav { --nav-h: 100px; --nav-font: 24px; --nav-logo: 74px; }
        }
        /* tablet: slightly smaller */
        @media (min-width: 768px) and (max-width: 1024px) {
          .ph-nav { --nav-h: 80px; --nav-font: 18px; --nav-logo: 58px; }
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
        /* sliding highlight: inside .pp-links, behind hovered/active link */
        .pp-highlight {
          position: absolute;
          top: 0;
          left: 0;
          height: 100%;
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
          margin: 0; /* flex gap handles spacing */
          flex-wrap: wrap;
          padding: 0 24px;
        }
        .ph-tag {
          font-family: "Zilla Slab", Rockwell, Georgia, serif;
          font-weight: 700;
          font-size: 17px;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          padding: 12px 22px;
          height: 46px;
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          border: 2px solid var(--ph-jet-black);
          transform: scale(0.6);
          opacity: 0;
          animation: ph-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          white-space: nowrap;
          box-sizing: border-box;
        }
        @keyframes ph-pop {
          0% { transform: scale(0.6); opacity: 0; }
          60% { transform: scale(1.08); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .tag-purple { background: var(--ph-purple-light); color: var(--ph-jet-black); }
        .tag-yellow { background: var(--ph-yellow); color: var(--ph-jet-black); }
        .tag-pink { background: var(--ph-pink); color: var(--ph-soft-white); }

        /* big title: always below nav (nav z-index 1000) */
        .ph-title {
          position: relative;
          z-index: 2;
          font-family: "Geist", system-ui, sans-serif;
          font-weight: 700;
          text-transform: uppercase;
          font-size: clamp(40px, 7vw, 104px);
          line-height: 0.95;
          text-align: center;
          color: var(--ph-soft-white);
          margin: 0;
          letter-spacing: -0.02em;
          animation: ph-title-in 0.8s cubic-bezier(0.22, 1, 0.36, 1) 0.15s backwards;
        }
        @keyframes ph-title-in {
          from { transform: translateY(40px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        .ph-tag-emoji {
          font-family: "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif;
          margin-right: 8px;
          font-size: 1.1em;
        }

        /* ── 8 floating emoji stickers around the card ── */
        .ph-emoji-wrap {
          position: absolute;
          inset: 0;
          z-index: 5; /* below card (z-10), above bg */
          pointer-events: none;
        }
        .ph-emoji {
          position: absolute;
          border-radius: 50%;
          border: 2.5px solid #0D0D0D;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif;
          cursor: pointer;
          pointer-events: auto;
          transform: rotate(var(--rot, 0deg));
          /* entrance pop, staggered */
          animation:
            ph-emoji-pop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) backwards,
            ph-emoji-float var(--dur, 4s) ease-in-out infinite;
          animation-delay: var(--pop-delay, 0s), var(--delay, 0s);
        }
        @keyframes ph-emoji-pop {
          0% { transform: scale(0) rotate(var(--rot, 0deg)); opacity: 0; }
          60% { transform: scale(1.15) rotate(var(--rot, 0deg)); opacity: 1; }
          100% { transform: scale(1) rotate(var(--rot, 0deg)); opacity: 1; }
        }
        @keyframes ph-emoji-float {
          0%, 100% { translate: 0 0; }
          50% { translate: 0 -10px; }
        }
        .ph-emoji:hover {
          animation: ph-emoji-wiggle 0.4s ease;
          scale: 1.15;
        }
        @keyframes ph-emoji-wiggle {
          0%, 100% { transform: rotate(var(--rot, 0deg)); }
          25% { transform: rotate(calc(var(--rot, 0deg) - 10deg)); }
          75% { transform: rotate(calc(var(--rot, 0deg) + 10deg)); }
        }
        .ph-emoji:active {
          animation: ph-emoji-jump 0.5s ease;
        }
        @keyframes ph-emoji-jump {
          0% { transform: translateY(0) rotate(0); }
          50% { transform: translateY(-20px) rotate(180deg); }
          100% { transform: translateY(0) rotate(360deg); }
        }

        /* ── card: wrap > shadow (separate layer) + card > img ──
           Square-corner fix: box-shadow on the same element renders square
           corners under transforms. The purple shadow is now its own div
           with the same border-radius, so every corner stays perfectly round. */
        .ph-card-wrap {
          position: relative;
          z-index: 10;
          width: min(900px, 84vw);
          aspect-ratio: 16 / 9;
          margin-bottom: 0;
          /* room for the 10px offset shadow */
          padding-right: 14px;
          padding-bottom: 14px;
          overflow: visible;
          backface-visibility: hidden;
          will-change: transform;
        }
        /* purple hard shadow: separate layer, same radius */
        .ph-card-shadow {
          position: absolute;
          inset: 0 14px 14px 0; /* inset accounts for wrap padding */
          border-radius: 28px;
          background: #A58CF4;
          z-index: 0;
          transform: translate(0, 0); /* entrance: slides out to 10px,10px */
        }
        .ph-card {
          position: absolute;
          inset: 0 14px 14px 0;
          z-index: 1;
          border-radius: 28px;
          overflow: hidden;
          isolation: isolate;
          background: #0D0D0D;
          border: 3px solid #FAFAFA; /* white ring via border (follows radius) */
          clip-path: inset(0 round 28px); /* forces perfect corners */
        }
        .ph-card img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: inherit;
        }
        /* entrance: card rises 70px, rotate -3deg→0, scale 0.94→1 */
        .ph-card-wrap.ph-enter {
          animation: ph-card-in 0.9s cubic-bezier(0.22, 1, 0.36, 1) backwards;
        }
        @keyframes ph-card-in {
          from { transform: translateY(70px) rotate(-3deg) scale(0.94); opacity: 0; }
          to { transform: translateY(0) rotate(0) scale(1); opacity: 1; }
        }
        /* shadow pops out after the card (spring) */
        .ph-card-wrap.ph-enter .ph-card-shadow {
          animation: ph-shadow-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.35s backwards;
        }
        @keyframes ph-shadow-in {
          from { transform: translate(0, 0); }
          to { transform: translate(10px, 10px); }
        }
        .ph-card-wrap.ph-enter .ph-card-shadow { transform: translate(10px, 10px); }
        /* idle float on wrap only */
        .ph-card-wrap.is-floating {
          animation: ph-float 5s ease-in-out infinite;
        }
        @keyframes ph-float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-8px) rotate(0.6deg); }
        }
        /* hover: card scales, shadow grows */
        .ph-card-wrap:hover { transform: scale(1.02); }
        .ph-card-wrap:hover .ph-card-shadow { transform: translate(16px, 16px); }
        .ph-card-wrap, .ph-card-wrap .ph-card-shadow {
          transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        /* floating decorations (close to card, never far corners) */
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
          /* mobile: logo left, menu+hire grouped right */
          .ph-nav {
            --nav-top: 12px;
            --nav-h: 68px;
            --nav-logo: 48px;
            --nav-font: 16px;
            top: var(--nav-top);
            width: calc(100% - 24px);
            padding: 8px;
            grid-template-columns: auto 1fr auto;
          }
          .pp-logo { justify-self: start; }
          .pp-links { display: none; }
          .pp-nav-right {
            display: flex;
            gap: 8px;
            justify-self: end;
            align-items: center;
          }
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
          .ph-hero {
            padding-top: calc(12px + 68px + 28px); /* nav-top + nav-h + breathing room */
            padding-bottom: 56px;
            padding-inline: 16px;
          }
          .ph-title { font-size: clamp(34px, 11vw, 56px); }
          .ph-tags { flex-wrap: wrap; } /* tags wrap in 2 rows on mobile */
          .ph-card-wrap { width: 92vw; aspect-ratio: 4 / 3; }
          .ph-card { border-radius: 22px; clip-path: inset(0 round 22px); }
          .ph-card-shadow { border-radius: 22px; }
          /* mobile: 4 emoji only, 44-52px, at card corners */
          .ph-emoji-wrap .ph-emoji:nth-child(n+5) { display: none; }
          .ph-emoji { width: 48px !important; height: 48px !important; font-size: 26px !important; }
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
          {/* logo: round button with cartoon face → HOME (left zone) */}
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
          {/* middle links + sliding highlight (center zone) */}
          <div ref={linksWrapRef} className="pp-links">
            <span ref={highlightRef} className="pp-highlight" aria-hidden="true" />
            <a
              ref={homeLinkRef}
              onClick={onNavigateHome}
              aria-current={activeLink === "home" ? "page" : undefined}
              className={activeLink === "home" ? "is-active" : ""}
            >Home</a>
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
          {/* right zone: hire (desktop) / menu+hire grouped (mobile) */}
          <div className="pp-nav-right">
            {/* mobile menu button (hidden on desktop) */}
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
          </div>
          {/* mobile dropdown */}
          <div id="pp-mobile-menu" className="pp-mobile-menu" role="menu">
            <a onClick={() => { closeMenu(); onNavigateHome(); }} role="menuitem">Home</a>
            <a onClick={() => { closeMenu(); onNavigateWork(); }} role="menuitem">Work</a>
            <a onClick={() => { closeMenu(); onNavigateAbout(); }} role="menuitem">About</a>
          </div>
        </nav>

        {/* tag pills: pop, stagger 90ms */}
        <div className="ph-tags">
          {tags.map((t, i) => (
            <span key={t.label} className={`ph-tag ${t.cls}`} style={{ animationDelay: `${400 + i * 90}ms` }}>
              <span className="ph-tag-emoji" aria-hidden="true">{t.emoji}</span>
              {t.label}
            </span>
          ))}
        </div>

        {/* title removed per user request — pills + card only */}

        {/* sticker card: wrap > shadow + card > img (shadow is separate layer for perfect corners) */}
        <div ref={cardRef} className="ph-card-wrap ph-enter">
          <div className="ph-card-shadow" aria-hidden="true" />
          <div className="ph-card">
            <img src={image} alt={alt} loading="eager" decoding="async" />
          </div>
        </div>

        {/* 8 floating emoji stickers around the card */}
        <div className="ph-emoji-wrap" aria-hidden="true">
          {emojiStickers.map((e, i) => (
            <div
              key={i}
              className="ph-emoji"
              style={{
                background: e.bg,
                width: e.size,
                height: e.size,
                fontSize: `calc(${e.size} * 0.55)`,
                left: e.left,
                right: e.right,
                top: e.top,
                ["--rot" as string]: `${e.rot}deg`,
                ["--pop-delay" as string]: e.popDelay,
                ["--delay" as string]: e.delay,
                ["--dur" as string]: e.dur,
              }}
            >
              {e.char}
            </div>
          ))}
        </div>

        {/* floating decorations: 20-60px outside card edge, small, aria-hidden */}
        <div ref={decoRef} className="ph-deco" aria-hidden="true">
          {/* yellow sparkle, top-left of card */}
          <svg className="ph-sparkle" width="32" height="32" viewBox="0 0 44 44" style={{ left: "calc(50% - 480px)", top: "120px" }}>
            <path d="M22 0 L26 18 L44 22 L26 26 L22 44 L18 26 L0 22 L18 18 Z" fill="#ffd60a" />
          </svg>
          {/* pink sparkle, right of card */}
          <svg className="ph-sparkle ph-deco-extra" width="28" height="28" viewBox="0 0 44 44" style={{ right: "calc(50% - 480px)", top: "200px", animationDelay: "1.2s" }}>
            <path d="M22 0 L26 18 L44 22 L26 26 L22 44 L18 26 L0 22 L18 18 Z" fill="#ff0a8a" />
          </svg>
          {/* cute-face circle, bottom-left of card */}
          <svg className="ph-face" width="40" height="40" viewBox="0 0 48 48" style={{ left: "calc(50% - 470px)", bottom: "80px" }}>
            <circle cx="24" cy="24" r="22" fill="#A58CF4" />
            <circle cx="17" cy="20" r="2.5" fill="#0D0D0D" />
            <circle cx="31" cy="20" r="2.5" fill="#0D0D0D" />
          </svg>
          {/* plus sign, top-right of card */}
          <svg className="ph-deco-extra" width="28" height="28" viewBox="0 0 32 32" style={{ right: "calc(50% - 470px)", top: "140px" }}>
            <rect x="13" y="4" width="6" height="24" rx="3" fill="#FAFAFA" />
            <rect x="4" y="13" width="24" height="6" rx="3" fill="#FAFAFA" />
          </svg>
        </div>
      </div>
    </>
  );
}
